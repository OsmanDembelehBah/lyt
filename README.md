# Layt: AI for clean energy, efficiency and climate risk across West Africa

**Two layers, one product**
1. **Atlas (regional, `/`)**: live weather + Copernicus dust forecasts for 25 hubs in 14 countries -> solar yield, flood-rain, heat and dust risk -> plain-language actions. Runs in the browser, no backend needed.
2. **Site brain (per mini-grid, `/site`)**: PyTorch probabilistic forecaster + conformal calibration + dust-soiling detection + battery dispatch that protects clinic and cold-chain loads, fed live over HTTP/MQTT.

Fastest demo: `cd web && npm i && npm run dev` (or `bun install && bun run dev`) -> http://localhost:3000

## Judging map
| Criterion | Where it lives |
|---|---|
| Impact in West Africa | Regional atlas across the Sahel, savanna and coast; targets mini-grids, clinics, cold chain, productive use |
| Quality and use of AI | Quantile forecaster conditioned on future weather, conformal coverage check, soiling detection from live irradiance, daily per-site fine-tuning |
| Traction and viability | Offline-tolerant, runs on free data sources, device ingest over HTTP/MQTT. **Needs one real pilot site and a letter of intent from an operator** |
| Responsible AI and inclusion | Visible thresholds, uncertainty shown, critical loads always reserved, data attribution, not a substitute for met-agency warnings; Krio toggle needs native review; next: SMS/USSD |
| Policy alignment | ECOWAS Renewable Energy Policy (48% renewables in the regional electricity mix, 25% of rural population on mini-grids/stand-alone by 2030), ECOWAS Energy Efficiency Policy (distribution losses under 10%), ECOWAS Climate Strategy, SDG 7 and 13 |

---
Field device / gateway --HTTP or MQTT--> API --> TimescaleDB
Open-Meteo (real NWP, 15d history + 2d forecast) --> API --> PyTorch forecaster --> dispatch plan --WebSocket--> dashboard

## Run
```
cp .env.example .env            # set real secrets
docker run --rm -v $PWD/mosquitto:/c eclipse-mosquitto:2 mosquitto_passwd -c -b /c/passwd layt <MQTT_PASS>
docker compose up -d --build
docker compose run --rm api python train.py --lat 8.48 --lon -13.23 --years 3 --out /models/global.pt   # then: docker compose restart api
cd tools && pip install httpx && python simulate.py --key <DEMO_INGEST_KEY> --soiling 0.2             # live demo data, real weather
cd ../web && cp .env.local.example .env.local   # fill NEXT_PUBLIC_READ_KEY
npm i && npm run dev
```
## Connect real hardware
HTTP: `POST /v1/sites/<id>/ingest` with header `X-Ingest-Key` and `{"readings":[{"pv_kw":3.2,"load_kw":1.1,"soc":0.62}]}`.
MQTT: publish to `layt/<id>/telemetry`: `{"key":"<ingest key>","pv_kw":3.2,"load_kw":1.1,"soc":0.62}`. Any inverter gateway or ESP32 works.

## What the AI does
1. Forecasts PV and demand 24h ahead (p10/p50/p90) from history + *known future weather*, with split-conformal calibration so the 80% band is checked against held-out data.
2. Dispatches using the cautious case: run productive loads only if surplus holds at p10 sun / p90 demand; always reserve ~3h of critical load (clinic, cold chain).
3. Detects dust (harmattan) soiling by comparing real output to physics from live irradiance; raises a cleaning alert.
4. Fine-tunes per site daily on its own telemetry (once ~10 clean days exist).

## Honest status
- Tested here: physics/dispatch/soiling logic (detects injected 20% dust as 18.9%, 1% when clean), API auth and validation, dashboard typecheck.
- NOT run here (sandbox had no disk for PyTorch): `model.py`, `train.py`, the Docker stack, MQTT, the live WebSocket path, Open-Meteo calls. Expect to fix small issues on first run.
- Bootstrap model learns from physics-derived PV + a generic village load profile. Accuracy claims need real meter data from a pilot site.
- Before production: TLS on the API and broker, per-site MQTT ACLs, key rotation, rate limiting, backups, monitoring, load tests.
