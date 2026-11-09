import numpy as np
import pytest
from physics import phys_pv, _hf, f_past, f_fut, prep, soiling, _traj, _blocks, baseline, forecast, PAST, H

def test_phys_pv_zero_and_scaling():
    # At 0 GHI, power should be 0
    assert phys_pv(0.0, 25.0, 18.0) == 0.0
    assert phys_pv(-10.0, 25.0, 18.0) == 0.0
    
    # Linear scaling with kWp
    p1 = phys_pv(1000.0, 25.0, 10.0)
    p2 = phys_pv(1000.0, 25.0, 20.0)
    assert np.isclose(p2, p1 * 2)

def test_phys_pv_temperature_derating():
    # Cell temp is temp + 0.0275 * GHI. At 1000 W/m2, +27.5C.
    # At temp=25C, cell temp is 52.5C (27.5C above 25C reference).
    # Power at higher ambient temp should be strictly lower due to negative temp coefficient (-0.004/C).
    p_cool = phys_pv(800.0, 20.0, 15.0)
    p_hot = phys_pv(800.0, 40.0, 15.0)
    assert p_cool > p_hot

def test_harmonic_features():
    s0, c0 = _hf(0)
    assert np.isclose(s0, 0.0) and np.isclose(c0, 1.0)
    s6, c6 = _hf(6)
    assert np.isclose(s6, 1.0, atol=1e-5) and np.isclose(c6, 0.0, atol=1e-5)
    s12, c12 = _hf(12)
    assert np.isclose(s12, 0.0, atol=1e-5) and np.isclose(c12, -1.0, atol=1e-5)

def test_prep_shapes_and_completeness():
    cfg = dict(kwp=18.0, peak_kw=6.0, batt_kwh=40.0, critical_kw=2.5, tz=0)
    now = 100
    # Empty telemetry -> should backfill with physics and profile
    tel = {}
    wx = {h: (800.0, 20.0, 30.0, 0.0) for h in range(now - PAST, now + H + 2)}
    past, fut, real, wf, lf = prep(cfg, tel, wx, now)
    
    assert past.shape == (PAST, 7)
    assert fut.shape == (H, 6)
    assert real == 0.0
    assert len(wf) == H
    assert len(lf) == H

    # Full telemetry
    tel_full = {h: (5.0, 2.0) for h in range(now - PAST + 1, now + 1)}
    past2, fut2, real2, _, _ = prep(cfg, tel_full, wx, now)
    assert real2 == 1.0
    assert np.allclose(past2[:, 0], 5.0 / 18.0)
    assert np.allclose(past2[:, 1], 2.0 / 6.0)

def test_battery_trajectory_clipping():
    p = np.array([10.0, 10.0, 10.0])
    l = np.array([2.0, 2.0, 2.0])
    traj = _traj(p, l, s0=0.5, cap=40.0)
    assert len(traj) == 3
    assert all(0.0 <= s <= 1.0 for s in traj)
    assert traj[0] > 0.5  # charging

    # Extreme discharge
    p_low = np.array([0.0, 0.0, 0.0])
    l_high = np.array([50.0, 50.0, 50.0])
    traj_drain = _traj(p_low, l_high, s0=0.2, cap=10.0)
    assert traj_drain[-1] == 0.0  # clipped at 0

def test_blocks():
    assert _blocks([]) == []
    assert _blocks([1, 2, 3]) == [[1, 2, 3]]
    assert _blocks([1, 2, 5, 6, 7, 10]) == [[1, 2], [5, 6, 7], [10]]

def test_soiling_detection():
    kwp = 20.0
    # Need at least 7 daily data points
    tel_clean = {}
    wx = {}
    for d in range(10):
        for h_of_day in range(24):
            h = d * 24 + h_of_day
            if 10 <= h_of_day <= 14:
                ghi, temp = 800.0, 30.0
                wx[h] = (ghi, 10.0, temp, 0.0)
                exp = phys_pv(ghi, temp, kwp)
                # First 7 days clean, last 3 days also clean
                tel_clean[h] = (exp * 0.98, 3.0)
            else:
                wx[h] = (0.0, 0.0, 25.0, 0.0)
                tel_clean[h] = (0.0, 2.0)
    
    res_clean = soiling(tel_clean, wx, kwp)
    assert res_clean is not None
    assert res_clean["loss_pct"] < 8.0
    assert res_clean["clean"] is False

    # Now inject 20% dust loss on the last 3 days
    tel_dusty = dict(tel_clean)
    for d in range(7, 10):
        for h_of_day in range(10, 15):
            h = d * 24 + h_of_day
            exp = phys_pv(wx[h][0], wx[h][2], kwp)
            tel_dusty[h] = (exp * 0.75, 3.0) # 25% drop
            
    res_dusty = soiling(tel_dusty, wx, kwp)
    assert res_dusty is not None
    assert res_dusty["loss_pct"] >= 15.0
    assert res_dusty["clean"] is True

def test_forecast_end_to_end():
    cfg = dict(kwp=18.0, peak_kw=6.0, batt_kwh=40.0, critical_kw=2.5, tz=0)
    now = 200
    tel = {h: (4.0, 1.5) for h in range(now - PAST + 1, now + 1)}
    # Add heavy rain in afternoon to trigger storm plan
    wx = {}
    for h in range(now - PAST, now + H + 2):
        rain = 8.0 if (h >= now + 14 and h <= now + 17) else 0.0
        wx[h] = (700.0 if 8 <= (h % 24) <= 16 else 0.0, 20.0, 28.0, rain)
        
    fc = forecast(cfg, tel, wx, model=None, now=now, soc_now=0.6)
    assert "baseline" in fc["mode"]
    assert len(fc["hours"]) == H
    assert "plan" in fc
    # Check that hours contains required keys
    for h in fc["hours"]:
        assert "hour" in h
        assert len(h["pv"]) == 3
        assert len(h["load"]) == 2
        assert "risk" in h
        assert len(h["soc"]) == 3
