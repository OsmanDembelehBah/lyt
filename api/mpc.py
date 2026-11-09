"""Convex Model Predictive Control (MPC) decision layer for mini-grid dispatch.
Solves a 24-hour constrained optimization over probabilistic scenarios (p10/p50/p90).
Hard constraint: Battery SoC >= critical_reserve at all hours under p10 irradiance.
Soft objectives: Maximize productive load, minimize diesel starts, minimize battery degradation.
Fallback: Deterministic physics rules if optimization is infeasible or scipy unavailable.
"""

from typing import Dict, Any, List, Tuple
import numpy as np

try:
    from scipy.optimize import linprog
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


def solve_mpc(
    cfg: Dict[str, Any],
    pv_quantiles: np.ndarray,      # (H, 3): [p10, p50, p90] in kW
    load_quantiles: np.ndarray,    # (H, 2): [expected, peak] in kW
    soc_now: float,                # 0..1 current battery SoC
    rain_risk: np.ndarray,         # (H,) flood/storm risk 0..1
    soiling_info: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Solves 24-hour mini-grid dispatch optimization."""
    H = len(pv_quantiles)
    cap = float(cfg.get("batt_kwh", 40.0))
    crit_kw = float(cfg.get("critical_kw", 2.5))
    peak_kw = float(cfg.get("peak_kw", 6.0))
    
    # Critical healthcare reserve (~3 hours clinic uptime, bound between 15% and 50%)
    reserve = min(0.5, max(0.15, (crit_kw * 3.0) / cap))
    
    # Cautious case: p10 solar, p90 (peak) demand
    pv_cautious = pv_quantiles[:, 0]
    ld_cautious = load_quantiles[:, 1]
    
    # Attempt Convex Optimization via SciPy linprog if available
    if SCIPY_AVAILABLE:
        try:
            return _solve_linear_mpc(
                H=H,
                cap=cap,
                reserve=reserve,
                peak_kw=peak_kw,
                pv_c=pv_cautious,
                ld_c=ld_cautious,
                soc_now=soc_now,
                rain_risk=rain_risk,
                soiling_info=soiling_info,
                pv_all=pv_quantiles,
                ld_all=load_quantiles
            )
        except Exception:
            # On any solver exception, fall back to robust physics baseline
            pass

    return _fallback_physics_dispatch(
        cfg=cfg,
        pv_quantiles=pv_quantiles,
        load_quantiles=load_quantiles,
        soc_now=soc_now,
        rain_risk=rain_risk,
        soiling_info=soiling_info,
        reserve=reserve
    )


def _solve_linear_mpc(
    H: int,
    cap: float,
    reserve: float,
    peak_kw: float,
    pv_c: np.ndarray,
    ld_c: np.ndarray,
    soc_now: float,
    rain_risk: np.ndarray,
    soiling_info: Dict[str, Any],
    pv_all: np.ndarray,
    ld_all: np.ndarray
) -> Dict[str, Any]:
    """Linear Programming formulation of the 24-hour cautious scenario dispatch."""
    # Variables per hour t:
    # 0: u_prod (0..3 kW productive daytime agro-load)
    # 1: g_diesel (0..10 kW diesel genset)
    # 2: s_shed (0..ld_c non-essential load shed)
    # 3: soc_t (reserve..1.0)
    # Total vars = 4 * H
    n_vars = 4 * H
    
    # Indices helper
    idx_prod = lambda t: 4 * t
    idx_diesel = lambda t: 4 * t + 1
    idx_shed = lambda t: 4 * t + 2
    idx_soc = lambda t: 4 * t + 3
    
    # Cost vector c:
    # Maximize u_prod (negative cost)
    # Heavily penalize diesel (cost +100/kWh)
    # Heavily penalize load shedding (cost +50/kWh)
    # Soft incentive to keep battery high (cost -0.1*soc)
    c = np.zeros(n_vars)
    for t in range(H):
        # Productive load is most valuable between 10:00 and 15:00
        val_prod = 5.0 if (10 <= t <= 15) else 1.0
        c[idx_prod(t)] = -val_prod
        c[idx_diesel(t)] = 100.0   # diesel avoidance penalty
        c[idx_shed(t)] = 50.0      # unserved load penalty
        c[idx_soc(t)] = -0.5       # storage preservation incentive
        
    # Bounds on variables
    bounds = []
    for t in range(H):
        bounds.append((0.0, 3.0))                 # u_prod: up to 3 kW
        bounds.append((0.0, 15.0))                # g_diesel: up to 15 kW
        bounds.append((0.0, float(ld_c[t])))      # s_shed: up to full demand
        bounds.append((reserve, 1.0))             # soc_t: HARD CONSTRAINT >= reserve
        
    # Equality constraints (A_eq, b_eq):
    # 1. Battery dynamics:
    # soc_t - soc_{t-1} - (1/cap) * (pv_c - ld_c - u_prod + g_diesel + s_shed) = 0
    # For t=0: soc_0 - (1/cap) * (pv_c[0] - ld_c[0] - u_prod[0] + g_diesel[0] + s_shed[0]) = soc_now
    A_eq = []
    b_eq = []
    for t in range(H):
        row = np.zeros(n_vars)
        row[idx_soc(t)] = 1.0
        if t > 0:
            row[idx_soc(t - 1)] = -1.0
        
        # Energy balance in/out of battery
        eff = 0.95
        row[idx_prod(t)] = (1.0 / (cap * eff))
        row[idx_diesel(t)] = -(eff / cap)
        row[idx_shed(t)] = -(eff / cap)
        
        A_eq.append(row)
        const_val = (pv_c[t] * eff - ld_c[t] / eff) / cap
        if t == 0:
            b_eq.append(soc_now + const_val)
        else:
            b_eq.append(const_val)
            
    res = linprog(c, A_eq=np.array(A_eq), b_eq=np.array(b_eq), bounds=bounds, method="highs")
    
    if not res.success:
        raise RuntimeError("MPC solver did not converge; falling back.")
        
    x = res.x
    prod_dispatched = np.array([x[idx_prod(t)] for t in range(H)])
    diesel_dispatched = np.array([x[idx_diesel(t)] for t in range(H)])
    shed_dispatched = np.array([x[idx_shed(t)] for t in range(H)])
    soc_cautious = np.array([x[idx_soc(t)] for t in range(H)])
    
    # Calculate optimistic and median SoC trajectories
    soc_mid = _sim_traj(pv_all[:, 1], ld_all[:, 0], soc_now, cap, prod_dispatched)
    soc_hi = _sim_traj(pv_all[:, 2], ld_all[:, 0] * 0.8, soc_now, cap, prod_dispatched)
    
    # Translate optimization variables into actionable operator plan
    plan = []
    
    # 1. Productive Load Blocks
    run_hours = [t for t in range(H) if prod_dispatched[t] > 0.5]
    if run_hours:
        for block in _group_consecutive(run_hours):
            plan.append({
                "action": "run",
                "start": int(block[0]),
                "end": int((block[-1] + 1) % 24),
                "why": f"MPC optimization allocated surplus productive agro-loads ({round(float(np.mean(prod_dispatched[block])), 1)} kW avg).",
                "evidence": {
                    "threshold": f"Hard reserve >= {round(reserve*100, 1)}% maintained",
                    "value": f"Dispatched {round(float(np.sum(prod_dispatched[block])), 1)} kWh productive load",
                    "conformalCoverage": "Convex MPC over p10 scenario"
                }
            })
            
    # 2. Shedding Warning
    shed_hours = [t for t in range(H) if shed_dispatched[t] > 0.3]
    if shed_hours:
        b0 = shed_hours[0]
        plan.append({
            "action": "shed",
            "start": int(b0),
            "why": "Constrained load shedding required to protect hard 3-hour critical healthcare reserve.",
            "evidence": {
                "threshold": f"SoC approaching critical reserve ({round(reserve*100, 1)}%)",
                "value": f"Shedding {round(float(shed_dispatched[b0]), 1)} kW non-essential demand",
                "conformalCoverage": "Pessimistic p10 lower bound guarantee"
            }
        })
        
    # 3. Storm Warning
    storm_idx = [t for t in range(H) if rain_risk[t] > 0.5]
    if storm_idx:
        st = _group_consecutive(storm_idx)[0]
        plan.append({
            "action": "storm",
            "start": int(st[0]),
            "end": int((st[-1] + 1) % 24),
            "why": "Heavy convective precipitation forecast: pre-charge battery bank and inspect shelter drainage.",
            "evidence": {
                "threshold": "Flood risk >= 0.50",
                "value": f"Peak rain risk = {round(float(np.max(rain_risk[st])), 2)}",
                "conformalCoverage": "Open-Meteo GloFAS discharge"
            }
        })
        
    # 4. Soiling alert
    if soiling_info and soiling_info.get("clean"):
        loss = soiling_info.get("loss_pct", 10.0)
        plan.append({
            "action": "clean",
            "start": 7,
            "why": f"Harmattan dust soiling is degrading array performance by ~{loss}%. Schedule cleaning.",
            "evidence": {
                "threshold": "PR degradation > 8.0%",
                "value": f"Measured soiling loss = {loss}%",
                "conformalCoverage": "Irradiance residual tracking"
            }
        })
        
    if not plan:
        plan.append({
            "action": "ok",
            "start": 0,
            "why": "Optimal balance: generation covers all loads with healthy battery reserves."
        })
        
    hours_data = []
    for t in range(H):
        hours_data.append({
            "hour": t,
            "pv": [float(x) for x in pv_all[t]],
            "load": [float(ld_all[t, 0] + prod_dispatched[t]), float(ld_all[t, 1])],
            "risk": float(rain_risk[t]),
            "soc": [float(soc_cautious[t]), float(soc_mid[t]), float(soc_hi[t])],
            "diesel_kw": float(diesel_dispatched[t]),
            "productive_kw": float(prod_dispatched[t])
        })
        
    return {
        "mode": "mpc",
        "solver": "highs_convex",
        "objective_value": float(res.fun),
        "total_diesel_kwh": round(float(np.sum(diesel_dispatched)), 2),
        "total_productive_kwh": round(float(np.sum(prod_dispatched)), 2),
        "critical_reserve": float(reserve),
        "critical_reserve_pct": round(reserve * 100, 2),
        "plan": plan,
        "hours": hours_data
    }


def _sim_traj(pv: np.ndarray, ld: np.ndarray, s0: float, cap: float, prod: np.ndarray = None) -> List[float]:
    out = []
    s = s0
    eff = 0.95
    for i in range(len(pv)):
        p = pv[i]
        l = ld[i] + (prod[i] if prod is not None else 0.0)
        d = (p - l) / cap
        s = float(np.clip(s + (d * eff if d > 0 else d / eff), 0.0, 1.0))
        out.append(s)
    return out


def _group_consecutive(idx: List[int]) -> List[List[int]]:
    if not idx:
        return []
    out, cur = [], [idx[0]]
    for i in idx[1:]:
        if i == cur[-1] + 1:
            cur.append(i)
        else:
            out.append(cur)
            cur = [i]
    if cur:
        out.append(cur)
    return out


def _fallback_physics_dispatch(
    cfg: Dict[str, Any],
    pv_quantiles: np.ndarray,
    load_quantiles: np.ndarray,
    soc_now: float,
    rain_risk: np.ndarray,
    soiling_info: Dict[str, Any],
    reserve: float
) -> Dict[str, Any]:
    """Deterministic heuristic baseline rule set used as fallback and explanation reference."""
    H = len(pv_quantiles)
    cap = float(cfg.get("batt_kwh", 40.0))
    peak_kw = float(cfg.get("peak_kw", 6.0))
    
    lo = _sim_traj(pv_quantiles[:, 0], load_quantiles[:, 1], soc_now, cap)
    mid = _sim_traj(pv_quantiles[:, 1], load_quantiles[:, 0], soc_now, cap)
    hi = _sim_traj(pv_quantiles[:, 2], load_quantiles[:, 0] * 0.8, soc_now, cap)
    
    plan = []
    surplus_hours = [i for i in range(H) if pv_quantiles[i, 0] - load_quantiles[i, 1] > 0.1 * peak_kw and lo[i] > 0.6]
    if surplus_hours:
        b = max(_group_consecutive(surplus_hours), key=len)
        plan.append({
            "action": "run",
            "start": int(b[0]),
            "end": int((b[-1] + 1) % 24),
            "why": "Surplus generation verified even under pessimistic p10 scenario.",
            "evidence": {
                "threshold": "Cautious p10 solar > demand and SoC > 60%",
                "value": f"{len(b)} hours of surplus capacity",
                "conformalCoverage": "Heuristic baseline fallback"
            }
        })
        
    sh = next((i for i in range(H) if lo[i] < reserve), None)
    if sh is not None:
        plan.append({
            "action": "shed",
            "start": int(sh),
            "why": f"Battery may fall below critical healthcare reserve ({round(reserve*100, 1)}%).",
            "evidence": {
                "threshold": f"SoC < {round(reserve*100, 1)}%",
                "value": f"Battery projected to drop to {round(lo[sh]*100, 1)}%",
                "conformalCoverage": "Critical load safety reserve"
            }
        })
        
    storm_idx = [i for i in range(H) if rain_risk[i] > 0.5]
    if storm_idx:
        b = _group_consecutive(storm_idx)[0]
        plan.append({
            "action": "storm",
            "start": int(b[0]),
            "end": int((b[-1] + 1) % 24),
            "why": "Heavy rain forecast: secure panels and precharge battery storage.",
            "evidence": {
                "threshold": "Precipitation risk > 0.50",
                "value": f"Risk index = {round(float(rain_risk[b[0]]), 2)}",
                "conformalCoverage": "GloFAS / NWP rainfall"
            }
        })
        
    if soiling_info and soiling_info.get("clean"):
        plan.append({
            "action": "clean",
            "start": 7,
            "why": f"Harmattan dust is causing ~{soiling_info['loss_pct']}% loss of solar output.",
            "evidence": {
                "threshold": "PR loss > 8.0%",
                "value": f"Measured soiling = {soiling_info['loss_pct']}%",
                "conformalCoverage": "Physics baseline"
            }
        })
        
    if not plan:
        plan.append({
            "action": "ok",
            "start": 0,
            "why": "Normal operation. Systems balanced."
        })
        
    hours_data = [
        {
            "hour": i,
            "pv": [float(x) for x in pv_quantiles[i]],
            "load": [float(load_quantiles[i, 0]), float(load_quantiles[i, 1])],
            "risk": float(rain_risk[i]),
            "soc": [lo[i], mid[i], hi[i]],
            "diesel_kw": 0.0,
            "productive_kw": 0.0
        }
        for i in range(H)
    ]
    
    return {
        "mode": "baseline",
        "solver": "physics_rules",
        "critical_reserve_pct": round(reserve * 100, 1),
        "total_diesel_kwh": 0.0,
        "total_productive_kwh": 0.0,
        "plan": plan,
        "hours": hours_data
    }
