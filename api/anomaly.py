"""Anomaly detection and energy-efficiency loss quantification for mini-grids.
Monitors inverter, battery, and soiling residuals against expected physical clear-sky models.
Addresses ECOWAS Energy Efficiency target (reducing losses from 35-40% to <10%).
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from physics import phys_pv

def detect_inverter_anomalies(
    readings: List[Dict[str, float]],  # [{'pv_kw': float, 'ghi': float, 'temp': float, 'hour': int}]
    kwp: float
) -> Dict[str, Any]:
    """Detects inverter clipping, MPPT tracking anomalies, or sensor dropouts using robust residual tracking."""
    if len(readings) < 12:
        return {"status": "insufficient_data", "anomalies": []}

    residuals = []
    inspected = []
    
    for r in readings:
        ghi = r.get("ghi", 0.0)
        if ghi < 200.0:
            continue  # Only evaluate daytime hours
        
        expected = float(phys_pv(np.float64(ghi), np.float64(r.get("temp", 27.0)), kwp))
        metered = float(r.get("pv_kw", 0.0))
        res = metered - expected
        residuals.append(res)
        inspected.append((r, expected, metered, res))

    if len(residuals) < 6:
        return {"status": "low_sun_insufficient_samples", "anomalies": []}

    residuals_arr = np.array(residuals)
    med = float(np.median(residuals_arr))
    mad = float(np.median(np.abs(residuals_arr - med)))
    scale = 1.4826 * mad + 1e-4

    anomalies = []
    clipping_count = 0
    dropout_count = 0

    for r, exp, met, res in inspected:
        z = (res - med) / scale
        
        # Inverter clipping detection: high sun, expected > rated inverter limit, metered flat
        if exp > 0.85 * kwp and abs(met - 0.8 * kwp) < 0.05 * kwp and res < -0.1 * kwp:
            clipping_count += 1
            
        # Complete sensor or string dropout during strong sunlight
        if exp > 0.5 * kwp and met < 0.05 * kwp:
            dropout_count += 1
            anomalies.append({
                "type": "STRING_DROPOUT",
                "severity": "critical",
                "hour": r.get("hour"),
                "expected_kw": round(exp, 2),
                "metered_kw": round(met, 2),
                "z_score": round(float(z), 2),
                "detail": "Sudden near-zero generation observed during high clear-sky irradiance."
            })
        elif z < -3.2:
            anomalies.append({
                "type": "MPPT_DEVIATION",
                "severity": "warning",
                "hour": r.get("hour"),
                "expected_kw": round(exp, 2),
                "metered_kw": round(met, 2),
                "z_score": round(float(z), 2),
                "detail": "Array output significantly below clear-sky physical expectation."
            })

    if clipping_count >= 3:
        anomalies.append({
            "type": "INVERTER_CLIPPING",
            "severity": "info",
            "detail": "Inverter output saturation observed; potential inverter undersizing or thermal throttling."
        })

    return {
        "status": "evaluated",
        "sample_count": len(inspected),
        "median_residual_kw": round(med, 3),
        "mad_residual_kw": round(mad, 3),
        "anomalies": anomalies
    }


def estimate_energy_losses(
    hourly_telemetry: Dict[int, Tuple[float, float]], # epoch_hour -> (pv_kw, load_kw)
    hourly_weather: Dict[int, Tuple[float, float, float, float]], # epoch_hour -> (ghi, cloud, temp, precip)
    kwp: float
) -> Dict[str, Any]:
    """Quantifies total energy losses (kWh) from dust soiling and thermal derating vs clear-sky potential."""
    total_theoretical_kwh = 0.0
    total_metered_kwh = 0.0
    soiling_loss_kwh = 0.0

    for h, (pv, _) in hourly_telemetry.items():
        w = hourly_weather.get(h)
        if not w or w[0] < 100.0:
            continue
        
        # Theoretical clear-sky unsoiled baseline at 25C reference
        theo_pv = kwp * (w[0] / 1000.0) * 0.82
        # Real physics expectation with ambient NOCT cell temperature
        phys_exp = float(phys_pv(np.float64(w[0]), np.float64(w[2]), kwp))
        
        total_theoretical_kwh += theo_pv
        total_metered_kwh += pv
        
        if phys_exp > pv:
            soiling_loss_kwh += (phys_exp - pv)

    loss_pct = 0.0
    if total_theoretical_kwh > 0:
        loss_pct = ((total_theoretical_kwh - total_metered_kwh) / total_theoretical_kwh) * 100.0

    return {
        "theoretical_potential_kwh": round(total_theoretical_kwh, 1),
        "metered_actual_kwh": round(total_metered_kwh, 1),
        "estimated_soiling_loss_kwh": round(soiling_loss_kwh, 1),
        "total_system_loss_pct": round(max(0.0, loss_pct), 1),
        "meets_ecowas_efficiency_target": bool(loss_pct <= 10.0)
    }
