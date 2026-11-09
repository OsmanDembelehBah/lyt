"""Numpy-only core: physics baseline, feature prep, soiling monitor, battery dispatch. No torch needed."""
import numpy as np

PAST, H = 48, 24
D = (0., 50., 27., 0.)   # fallback weather tuple: ghi W/m2, cloud %, temp C, precip mm
PROFILE = np.array([.35,.30,.28,.28,.30,.40,.55,.60,.55,.50,.50,.55,.65,.60,.55,.55,.60,.75,.95,1,.95,.80,.60,.45])  # village evening peak

def phys_pv(ghi, temp, kwp):
    tc = temp + .0275 * ghi                                   # cell temperature (NOCT approx)
    return kwp * np.clip(ghi, 0, None) / 1000 * (1 - .004 * (tc - 25)) * .82

def _hf(hl): a = 2 * np.pi * hl / 24; return np.sin(a), np.cos(a)
def f_past(pv, ld, w, hl, kwp, peak):
    s, c = _hf(hl); return np.stack([pv/kwp, ld/peak, w[:,0]/1000, w[:,1]/100, w[:,2]/40, s, c], 1).astype("f4")
def f_fut(w, hl):
    s, c = _hf(hl); return np.stack([w[:,0]/1000, w[:,1]/100, w[:,2]/40, w[:,3]/5, s, c], 1).astype("f4")

def prep(cfg, tel, wx, now):
    """tel {epoch_hour:(pv_kw,load_kw)}, wx {epoch_hour:(ghi,cloud,temp,precip)}. Gaps in history are filled with physics/profile."""
    ph, fh = np.arange(now - PAST + 1, now + 1), np.arange(now + 1, now + H + 1)
    W = lambda hs: np.array([wx.get(int(h), D) for h in hs], "f4")
    wp, wf = W(ph), W(fh); lp, lf = (ph + cfg["tz"]) % 24, (fh + cfg["tz"]) % 24
    exp = phys_pv(wp[:,0], wp[:,2], cfg["kwp"])
    pv = np.array([tel[int(h)][0] if int(h) in tel else e for h, e in zip(ph, exp)], "f4")
    ld = np.array([tel[int(h)][1] if int(h) in tel else PROFILE[l] * cfg["peak_kw"] * .6 for h, l in zip(ph, lp)], "f4")
    real = sum(int(h) in tel for h in ph) / PAST
    return f_past(pv, ld, wp, lp, cfg["kwp"], cfg["peak_kw"]), f_fut(wf, lf), real, wf, lf

def soiling(tel, wx, kwp):
    """Dust loss from real telemetry vs physics: compare median daily performance ratio of last 3 days to the earlier 75th percentile."""
    days = {}
    for h, (pv, _) in tel.items():
        w = wx.get(h)
        if not w or w[0] < 500: continue
        e = float(phys_pv(np.float64(w[0]), np.float64(w[2]), kwp)); a = days.setdefault(h // 24, [0., 0.]); a[0] += pv; a[1] += e
    pr = [a[0] / a[1] for _, a in sorted(days.items()) if a[1] > 0]
    if len(pr) < 7: return None
    loss = max(0., 1 - np.median(pr[-3:]) / np.percentile(pr[:-3], 75)) * 100
    return {"loss_pct": round(float(loss), 1), "clean": bool(loss > 8)}

def _traj(p, l, s0, cap):
    out, s = [], s0
    for a, b in zip(p, l):
        d = (a - b) / cap; s = float(np.clip(s + (d * .95 if d > 0 else d / .95), 0, 1)); out.append(s)
    return out

def _blocks(idx):
    out, cur = [], []
    for i in idx:
        if cur and i != cur[-1] + 1: out.append(cur); cur = []
        cur.append(i)
    return out + ([cur] if cur else [])

def baseline(cfg, wf, lf):
    pv = phys_pv(wf[:,0], wf[:,2], cfg["kwp"]); ld = PROFILE[lf] * cfg["peak_kw"] * .6
    return np.stack([pv*.55, pv, pv*1.1], 1), np.stack([ld*.8, ld, ld*1.25], 1)

def forecast(cfg, tel, wx, model, now, soc_now):
    """model: None (physics baseline) or object with .predict(past,fut)->(H,2,3) normalised quantiles."""
    past, fut, real, wf, lf = prep(cfg, tel, wx, now)
    if model is not None:
        q = model.predict(past, fut); pvq, ldq, mode = q[:,0,:] * cfg["kwp"], q[:,1,:] * cfg["peak_kw"], "model"
    else: pvq, ldq = baseline(cfg, wf, lf); mode = "baseline"
    cap = cfg["batt_kwh"]
    lo, mid, hi = _traj(pvq[:,0], ldq[:,2], soc_now, cap), _traj(pvq[:,1], ldq[:,1], soc_now, cap), _traj(pvq[:,2], ldq[:,0], soc_now, cap)
    risk = np.clip(wf[:,3] / 5, 0, 1)
    reserve = min(.5, max(.15, cfg["critical_kw"] * 3 / cap))            # always keep ~3h of critical load
    s = soiling(tel, wx, cfg["kwp"])

    # Attempt Convex Model Predictive Control (MPC) dispatch first
    plan = None
    hours = None
    decision_mode = mode
    try:
        from mpc import solve_mpc
        mpc_res = solve_mpc(cfg, pvq, ldq, soc_now, risk, s)
        plan = mpc_res.get("plan")
        if plan:
            hours = [
                dict(
                    hour=int(lf[i]),
                    pv=[float(x) for x in pvq[i]],
                    load=[float(ldq[i, 0]), float(ldq[i, 1])],
                    risk=float(risk[i]),
                    soc=mpc_res["hours"][i]["soc"],
                    diesel_kw=mpc_res["hours"][i].get("diesel_kw", 0.0),
                    productive_kw=mpc_res["hours"][i].get("productive_kw", 0.0)
                )
                for i in range(H)
            ]
            decision_mode = f"{mode}_mpc"
    except Exception:
        pass

    if plan is None:
        # Robust rule-based fallback
        plan = []
        run = _blocks([i for i in range(H) if pvq[i,0] - ldq[i,1] > .1 * cfg["peak_kw"] and lo[i] > .6])
        if run: b = max(run, key=len); plan.append(dict(action="run", start=int(lf[b[0]]), end=int((lf[b[-1]] + 1) % 24), why="surplus even in the cautious case"))
        sh = next((i for i in range(H) if lo[i] < reserve), None)
        if sh is not None: plan.append(dict(action="shed", start=int(lf[sh]), why="battery may fall below critical reserve"))
        st = _blocks([i for i in range(H) if risk[i] > .5])
        if st: b = st[0]; plan.append(dict(action="storm", start=int(lf[b[0]]), end=int((lf[b[-1]] + 1) % 24), why="heavy rain forecast"))
        if s and s["clean"]: plan.append(dict(action="clean", start=int(lf[0]), why=f"dust is costing about {s['loss_pct']}% of output"))
        hours = [dict(hour=int(lf[i]), pv=[float(x) for x in pvq[i]], load=[float(ldq[i,0]), float(ldq[i,1])], risk=float(risk[i]), soc=[lo[i], mid[i], hi[i]]) for i in range(H)]

    # Anomaly and energy loss estimation
    anomaly_report = None
    try:
        from anomaly import detect_inverter_anomalies, estimate_energy_losses
        readings_eval = [
            {"pv_kw": tel[h][0], "ghi": wx[h][0], "temp": wx[h][2], "hour": h % 24}
            for h in sorted(tel) if h in wx
        ]
        anomaly_report = detect_inverter_anomalies(readings_eval[-24:], cfg["kwp"])
        losses_report = estimate_energy_losses(tel, wx, cfg["kwp"])
    except Exception:
        losses_report = None

    return dict(
        mode=decision_mode,
        confidence=round(real, 2),
        soiling=s,
        plan=plan,
        hours=hours,
        anomalies=anomaly_report,
        energy_losses=losses_report
    )
