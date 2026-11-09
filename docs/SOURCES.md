# Lyt: Sources & Assumptions Registry

Every statistic, climate threshold, physics constant, and policy target used across the Lyt codebase and user interface must be listed here with its official source citation or an explicit assumption label.

---

## 1. External Meteorological & Remote Sensing APIs

| Data Stream | Provider / Service | Citation / Documentation | Licence & Terms |
| :--- | :--- | :--- | :--- |
| **Numerical Weather Prediction (NWP)** | Open-Meteo Weather API | [Open-Meteo Docs](https://open-meteo.com/en/docs) | Non-commercial / CC-BY 4.0 attribution required in UI. Attribution placed in `/` and `/trust`. |
| **Atmospheric Dust & Air Quality** | Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo | [ECMWF CAMS](https://atmosphere.copernicus.eu/) | Copernicus Open Access Licence. Must attribute CAMS European Commission in UI. |
| **River Discharge & Hydrological Flood Risk** | GloFAS / Copernicus Emergency Management via Open-Meteo Flood API | [GloFAS Global Flood Awareness System](https://www.globalfloods.eu/) | Open access for hydrological risk planning. |
| **Solar Resource History (Reanalysis)** | ERA5 / ERA5-Land Reanalysis via Open-Meteo Archive API | [ECMWF ERA5](https://www.ecmwf.int/en/forecasts/datasets/reanalysis-datasets/era5) | CC-BY 4.0. |
| **Geographic Boundaries** | Natural Earth Data (1:50m / 1:110m cultural country boundaries) | [Natural Earth Public Domain](https://www.naturalearthdata.com/) | Public Domain. Bundled locally in web assets without third-party tile server calls. |

---

## 2. Physics Model Constants & Mathematical Formulations

| Parameter / Formula | Value | Source / Standard | Notes |
| :--- | :--- | :--- | :--- |
| **PV Temperature Derating Coefficient** | $-0.004\text{ / }^\circ\text{C}$ ($-0.4\%\text{ / }^\circ\text{C}$) | Standard crystalline silicon PV cell specification (IEC 61215) | Baseline assumption for monocrystalline / polycrystalline panels. |
| **NOCT Cell Temperature Formula** | $T_{\text{cell}} = T_{\text{ambient}} + 0.0275 \times \text{GHI}$ | Duffie & Beckman (Solar Engineering of Thermal Processes) | Standard empirical approximation for open-rack ground-mount mini-grid PV arrays. |
| **Nominal Performance Ratio (PR)** | $0.80$ ($80\%$) | NREL / IEA PVPS Benchmark for tropical mini-grids | Labelled as "assumption" in UI; adjustable per site configuration. |
| **Battery Round-Trip Coulombic Efficiency** | $0.95$ ($95\%$) | Standard lithium iron phosphate (LiFePO4) storage chemistry | Assumes modern LiFePO4 cells common in recent African mini-grid deployments. |
| **Critical Healthcare & Cold-Chain Reserve** | $3\text{ hours} \times \text{critical\_kw}$ | WHO Guideline for Vaccine Cold Chain and Rural Clinic Resilience | Hard constraint: cannot be overridden by economic or productive dispatch objectives. |

---

## 3. Climate Risk Thresholds (Operational Defaults)

| Risk Indicator | Default Threshold | Status / Calibration Note |
| :--- | :--- | :--- |
| **Heavy Rain / Flood Alert** | $> 60\text{ mm/day}$ | Baseline estimate; flagged as "coarse NWP guidance, not a substitute for national met-agency warnings". |
| **Extreme Heat Warning** | $34^\circ\text{C} - 42^\circ\text{C}$ | Panel derating and battery thermal degradation threshold. |
| **Harmattan Dust Alert** | $> 400\ \mu\text{g/m}^3$ (PM10/Dust concentration) | High particulate attenuation requiring scheduled panel cleaning post-event. |
| **Soiling Cleaning Trigger** | $> 8\%$ median PR degradation over 3 consecutive days | Derived from empirical clear-sky irradiance yield tracking (`physics.py`). |

---

## 4. Policy Alignment & Regional Standards

| Policy Directive | Body / Jurisdiction | Target / Mandate |
| :--- | :--- | :--- |
| **ECOWAS Renewable Energy Policy (EREP)** | ECOWAS / ECREEE | $48\%$ renewable energy share in regional electricity mix by 2030; $25\%$ rural population served by mini-grids & standalone systems by 2030. |
| **ECOWAS Energy Efficiency Policy (EEEP)** | ECOWAS / ECREEE | Target electricity distribution losses below $10\%$ (current regional losses estimated at $35-40\%$). |
| **ECOWAS Climate Strategy** | ECOWAS Commission | Climate resilience across critical infrastructure and agricultural power access. |
| **United Nations Sustainable Development Goals** | United Nations | **SDG 7**: Affordable and Clean Energy; **SDG 13**: Climate Action. |
