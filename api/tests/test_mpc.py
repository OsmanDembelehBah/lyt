import numpy as np
import pytest
from mpc import solve_mpc, _sim_traj, _group_consecutive

def test_mpc_hard_critical_reserve_constraint():
    cfg = dict(kwp=18.0, peak_kw=6.0, batt_kwh=40.0, critical_kw=2.5, tz=0)
    # Severe deficit scenario: zero solar for 24 hours, heavy demand (4 kW continuous)
    pv_zeros = np.zeros((24, 3))
    ld_heavy = np.full((24, 2), 4.0)
    rain_risk = np.zeros(24)
    soc_start = 0.35
    
    res = solve_mpc(cfg, pv_zeros, ld_heavy, soc_now=soc_start, rain_risk=rain_risk)
    
    reserve = res.get("critical_reserve", res["critical_reserve_pct"] / 100.0)
    cautious_soc = [h["soc"][0] for h in res["hours"]]
    
    # Verify the hard constraint: cautious SoC never drops below reserve
    for t, s in enumerate(cautious_soc):
        assert s >= reserve - 1e-4, f"Hour {t}: SoC {s} fell below critical reserve {reserve}"
        
    # Shedding action should be in plan
    actions = [p["action"] for p in res["plan"]]
    assert "shed" in actions

def test_mpc_dispatches_productive_loads_during_surplus():
    cfg = dict(kwp=20.0, peak_kw=5.0, batt_kwh=40.0, critical_kw=2.0, tz=0)
    # Abundant solar midday scenario
    pv = np.zeros((24, 3))
    for h in range(8, 17):
        pv[h] = [6.0, 10.0, 12.0]  # high solar
    ld = np.full((24, 2), 1.5)      # modest 1.5 kW load
    rain_risk = np.zeros(24)
    soc_start = 0.70
    
    res = solve_mpc(cfg, pv, ld, soc_now=soc_start, rain_risk=rain_risk)
    
    # Should schedule productive run action
    actions = [p["action"] for p in res["plan"]]
    assert "run" in actions
    assert res["total_productive_kwh"] > 0.0

def test_mpc_storm_warning():
    cfg = dict(kwp=18.0, peak_kw=6.0, batt_kwh=40.0, critical_kw=2.5, tz=0)
    pv = np.full((24, 3), 3.0)
    ld = np.full((24, 2), 2.0)
    rain_risk = np.zeros(24)
    rain_risk[14:18] = 0.85  # heavy storm
    
    res = solve_mpc(cfg, pv, ld, soc_now=0.6, rain_risk=rain_risk)
    actions = [p["action"] for p in res["plan"]]
    assert "storm" in actions

def test_group_consecutive():
    assert _group_consecutive([]) == []
    assert _group_consecutive([3, 4, 5, 8, 9]) == [[3, 4, 5], [8, 9]]
