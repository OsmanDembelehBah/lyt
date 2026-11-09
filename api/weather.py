"""Open-Meteo: free, keyless, global NWP + reanalysis + GloFAS flood & drought indicators.
Hourly tuples keyed by epoch hour (UTC).
"""
import datetime as dt
from typing import Dict, Any, Tuple
import httpx

V = "shortwave_radiation,cloud_cover,temperature_2m,precipitation"

def _parse(j: Dict[str, Any]) -> Dict[int, Tuple[float, float, float, float]]:
    h = j["hourly"]
    out = {}
    for i, t in enumerate(h["time"]):
        k = int(dt.datetime.fromisoformat(t).replace(tzinfo=dt.timezone.utc).timestamp() // 3600)
        out[k] = (
            float(h["shortwave_radiation"][i] or 0.0),
            float(h["cloud_cover"][i] or 0.0),
            float(h["temperature_2m"][i] or 27.0),
            float(h["precipitation"][i] or 0.0),
        )
    return out

async def forecast(lat: float, lon: float, client: httpx.AsyncClient) -> Dict[int, Tuple[float, float, float, float]]:
    r = await client.get(
        "https://api.open-meteo.com/v1/forecast",
        params=dict(
            latitude=lat,
            longitude=lon,
            hourly=V,
            past_days=15,
            forecast_days=2,
            timezone="UTC"
        ),
        timeout=30.0
    )
    r.raise_for_status()
    return _parse(r.json())

def archive(lat: float, lon: float, start: str, end: str) -> Dict[int, Tuple[float, float, float, float]]:
    r = httpx.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params=dict(
            latitude=lat,
            longitude=lon,
            start_date=start,
            end_date=end,
            hourly=V,
            timezone="UTC"
        ),
        timeout=90.0
    )
    r.raise_for_status()
    return _parse(r.json())

async def flood_risk(lat: float, lon: float, client: httpx.AsyncClient) -> Dict[str, Any]:
    """Queries Open-Meteo GloFAS Flood API for river discharge anomalies."""
    try:
        r = await client.get(
            "https://flood-api.open-meteo.com/v1/flood",
            params=dict(
                latitude=lat,
                longitude=lon,
                daily="river_discharge,river_discharge_median,river_discharge_max",
                forecast_days=5
            ),
            timeout=15.0
        )
        if r.status_code == 200:
            d = r.json().get("daily", {})
            discharges = d.get("river_discharge", [])
            medians = d.get("river_discharge_median", [])
            maxs = d.get("river_discharge_max", [])
            
            # Compute discharge anomaly ratio
            peak_ratio = 1.0
            if medians and discharges:
                med_val = max(0.1, float(medians[0] or 0.1))
                peak_val = float(max(discharges[0] or 0.0, maxs[0] if maxs else 0.0))
                peak_ratio = peak_val / med_val
                
            flood_index = max(0.0, min(1.0, (peak_ratio - 1.0) / 2.0))
            return {
                "flood_risk_index": round(flood_index, 2),
                "discharge_m3_s": round(float(discharges[0] if discharges else 0.0), 1),
                "discharge_ratio": round(peak_ratio, 2),
                "alert": flood_index > 0.5
            }
    except Exception:
        pass
    return {"flood_risk_index": 0.0, "discharge_m3_s": 0.0, "discharge_ratio": 1.0, "alert": False}

async def drought_risk(lat: float, lon: float, client: httpx.AsyncClient) -> Dict[str, Any]:
    """Queries soil moisture and evapotranspiration from Open-Meteo."""
    try:
        r = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params=dict(
                latitude=lat,
                longitude=lon,
                hourly="soil_moisture_0_to_7cm,et0_fao_evapotranspiration",
                forecast_days=2,
                timezone="UTC"
            ),
            timeout=15.0
        )
        if r.status_code == 200:
            h = r.json().get("hourly", {})
            sm = [x for x in h.get("soil_moisture_0_to_7cm", []) if x is not None]
            avg_sm = float(sum(sm) / len(sm)) if sm else 0.25
            
            # Drought stress index: lower soil moisture = higher drought stress
            # Tropical savanna threshold: < 0.15 m3/m3 is severe drought
            drought_index = max(0.0, min(1.0, (0.35 - avg_sm) / 0.25))
            return {
                "soil_moisture_m3_m3": round(avg_sm, 3),
                "drought_stress_index": round(drought_index, 2),
                "drought_alert": drought_index > 0.6
            }
    except Exception:
        pass
    return {"soil_moisture_m3_m3": 0.25, "drought_stress_index": 0.0, "drought_alert": False}
