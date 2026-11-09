import pytest
from anomaly import detect_inverter_anomalies, estimate_energy_losses

def test_detect_inverter_dropout():
    kwp = 15.0
    # Simulate normal readings with one severe dropout during peak sun
    readings = []
    for h in range(24):
        ghi = 800.0 if 10 <= h <= 15 else 100.0
        # Normal generation except at h=12 where metered drops to 0.0
        pv = 0.0 if h == 12 else (8.0 if ghi > 500 else 0.5)
        readings.append({"hour": h, "ghi": ghi, "temp": 30.0, "pv_kw": pv})

    res = detect_inverter_anomalies(readings, kwp)
    assert res["status"] == "evaluated"
    types = [a["type"] for a in res["anomalies"]]
    assert "STRING_DROPOUT" in types

def test_estimate_energy_losses():
    kwp = 20.0
    tel = {}
    wx = {}
    for h in range(100):
        ghi = 750.0 if (h % 24) in range(9, 16) else 0.0
        wx[h] = (ghi, 10.0, 28.0, 0.0)
        # 15% soiling loss
        tel[h] = (8.0 if ghi > 0 else 0.0, 2.0)

    res = estimate_energy_losses(tel, wx, kwp)
    assert res["theoretical_potential_kwh"] > 0.0
    assert res["estimated_soiling_loss_kwh"] >= 0.0
    assert "total_system_loss_pct" in res
