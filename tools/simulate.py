"""Live data source for demos with no hardware. Pulls REAL current + past-14-day weather for the site, simulates the plant,
backfills history, then streams live readings. --soiling 0.2 dusts the panels for the last 3 days to trigger the cleaning alert.
  python simulate.py --site demo --key $DEMO_INGEST_KEY --soiling 0.2"""
import argparse, math, random, time, httpx
a = argparse.ArgumentParser(); a.add_argument("--api", default="http://localhost:8000"); a.add_argument("--site", default="demo"); a.add_argument("--key", required=True)
a.add_argument("--lat", type=float, default=8.48); a.add_argument("--lon", type=float, default=-13.23); a.add_argument("--soiling", type=float, default=0.)
a.add_argument("--kwp", type=float, default=18.); a.add_argument("--peak", type=float, default=6.); a.add_argument("--batt", type=float, default=40.); a.add_argument("--every", type=float, default=10.)
a = a.parse_args()
PROFILE = [.35,.30,.28,.28,.30,.40,.55,.60,.55,.50,.50,.55,.65,.60,.55,.55,.60,.75,.95,1,.95,.80,.60,.45]
j = httpx.get("https://api.open-meteo.com/v1/forecast", params=dict(latitude=a.lat, longitude=a.lon, hourly="shortwave_radiation,temperature_2m", past_days=14, forecast_days=1, timezone="UTC"), timeout=30).json()["hourly"]
import datetime as dt
wx = {int(dt.datetime.fromisoformat(t).replace(tzinfo=dt.timezone.utc).timestamp() // 3600): (g or 0, tm or 27) for t, g, tm in zip(j["time"], j["shortwave_radiation"], j["temperature_2m"])}
def pv(h, now_h):
    g, t = wx.get(h, (0, 27)); f = (1 - a.soiling) if h > now_h - 72 else 1
    return max(0, a.kwp * g / 1000 * (1 - .004 * (t + .0275 * g - 25)) * .82 * f * random.uniform(.96, 1.04))
ld = lambda h: PROFILE[h % 24] * a.peak * .6 * random.uniform(.88, 1.12)
H = httpx.Client(base_url=a.api, headers={"X-Ingest-Key": a.key}, timeout=30); soc = .6; now_h = int(time.time() // 3600); batch = []
for h in range(now_h - 14 * 24, now_h):
    p, l = pv(h, now_h), ld(h); soc = min(1, max(.05, soc + (p - l) / a.batt)); batch.append(dict(ts=h * 3600 + 1800, pv_kw=p, load_kw=l, soc=soc))
for i in range(0, len(batch), 200): print("backfill", H.post(f"/v1/sites/{a.site}/ingest", json={"readings": batch[i:i + 200]}).json())
print("streaming live; Ctrl-C to stop")
while True:
    h = int(time.time() // 3600); p, l = pv(h, h), ld(h); soc = min(1, max(.05, soc + (p - l) * (a.every / 3600) / a.batt))
    r = H.post(f"/v1/sites/{a.site}/ingest", json={"readings": [dict(pv_kw=p, load_kw=l, soc=soc)]}); print(f"pv {p:.1f} kW  load {l:.1f} kW  soc {soc:.0%}  -> {r.status_code}"); time.sleep(a.every)
