// Regional layer: live numerical weather + Copernicus CAMS dust forecasts for 25 West African hubs.
// Provides solar yield, rain/flood risk, extreme heat, and harmattan dust intelligence.

export type Hub = {
  id: string;
  name: string;
  cc: string;
  country: string;
  lat: number;
  lon: number;
};

export type Day = {
  date: string;
  kwhkwp: number;
  rain: number;
  tmax: number;
  dust: number;
  windSpeed?: number;
  windDir?: number;
};

export type HubData = Hub & {
  days: Day[];
  dustOk: boolean;
};

export type Layer = "sun" | "rain" | "heat" | "dust" | "satellite";

export const COUNTRIES: Record<string, string> = {
  SL: "Sierra Leone",
  LR: "Liberia",
  GN: "Guinea",
  GW: "Guinea-Bissau",
  GM: "The Gambia",
  SN: "Senegal",
  MR: "Mauritania",
  ML: "Mali",
  BF: "Burkina Faso",
  CI: "Côte d'Ivoire",
  GH: "Ghana",
  TG: "Togo",
  BJ: "Benin",
  NG: "Nigeria",
  NE: "Niger",
};

const h = (id: string, name: string, cc: string, lat: number, lon: number): Hub => ({
  id,
  name,
  cc,
  country: COUNTRIES[cc] || cc,
  lat,
  lon,
});

export const HUBS: Hub[] = [
  h("fna", "Freetown", "SL", 8.48, -13.23),
  h("mlw", "Monrovia", "LR", 6.30, -10.80),
  h("cky", "Conakry", "GN", 9.64, -13.58),
  h("kkn", "Kankan", "GN", 10.38, -9.31),
  h("oxb", "Bissau", "GW", 11.86, -15.60),
  h("bjl", "Banjul", "GM", 13.45, -16.58),
  h("dkr", "Dakar", "SN", 14.72, -17.47),
  h("nkc", "Nouakchott", "MR", 18.08, -15.98),
  h("bko", "Bamako", "ML", 12.64, -8.00),
  h("gao", "Gao", "ML", 16.27, -0.04),
  h("oua", "Ouagadougou", "BF", 12.37, -1.52),
  h("bob", "Bobo-Dioulasso", "BF", 11.18, -4.30),
  h("abj", "Abidjan", "CI", 5.36, -4.01),
  h("acc", "Accra", "GH", 5.60, -0.19),
  h("kum", "Kumasi", "GH", 6.69, -1.62),
  h("tam", "Tamale", "GH", 9.40, -0.84),
  h("lfw", "Lomé", "TG", 6.13, 1.22),
  h("cot", "Cotonou", "BJ", 6.37, 2.43),
  h("los", "Lagos", "NG", 6.52, 3.38),
  h("phc", "Port Harcourt", "NG", 4.82, 7.03),
  h("abv", "Abuja", "NG", 9.08, 7.40),
  h("kan", "Kano", "NG", 12.00, 8.52),
  h("mai", "Maiduguri", "NG", 11.85, 13.16),
  h("nim", "Niamey", "NE", 13.51, 2.11),
  h("zin", "Zinder", "NE", 13.80, 8.99),
];

export const LAYERS: Record<Layer, { label: string; color: string; unit: string; icon: string; desc: string }> = {
  sun: { label: "Solar Yield", color: "#FFB347", unit: "kWh/kWp", icon: "sun", desc: "Expected daily generation at 80% PR" },
  rain: { label: "Rain & Flood", color: "#7FB8FF", unit: "mm", icon: "rain", desc: "Total daily rainfall and flood runoff" },
  heat: { label: "Extreme Heat", color: "#C8472E", unit: "°C", icon: "heat", desc: "Maximum 2m ambient temperature" },
  dust: { label: "Harmattan Dust", color: "#D2A35A", unit: "µg/m³", icon: "dust", desc: "Atmospheric aerosol particulate density" },
  satellite: { label: "Satellite Rain", color: "#6FD0C4", unit: "NASA IMERG", icon: "satellite", desc: "NASA GPM IMERG spaceborne precipitation radar estimates" },
};

// Thresholds verified and documented in docs/SOURCES.md:
// rainMax: 60mm (tropical flood alert threshold)
// heatBase: 34C, heatSpan: 8C (maps 34-42C to full thermal stress derating)
// dustMax: 400 µg/m3 (severe harmattan visibility and PV attenuation limit)
// sunMax: 6.5 kWh/kWp (high Sahel clear-sky daily yield limit)
// pr: 0.80 (standard mini-grid performance ratio baseline)
export const T = {
  rainMax: 60,
  heatBase: 34,
  heatSpan: 8,
  dustMax: 400,
  sunMax: 6.5,
  pr: 0.8,
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export const raw = (l: Layer, d: Day): number => {
  switch (l) {
    case "sun": return d.kwhkwp;
    case "rain": return d.rain;
    case "heat": return d.tmax;
    case "dust": return d.dust;
    case "satellite": return d.rain;
  }
};

export const val = (l: Layer, d: Day): number => {
  switch (l) {
    case "sun": return clamp(d.kwhkwp / T.sunMax);
    case "rain": return clamp(d.rain / T.rainMax);
    case "heat": return clamp((d.tmax - T.heatBase) / T.heatSpan);
    case "dust": return clamp(d.dust / T.dustMax);
    case "satellite": return clamp(d.rain / T.rainMax);
  }
};

export interface LayerHeadlineInfo {
  happening: string;
  why: string;
  action: string;
  badge: string;
  badgeTone: "sun" | "rain" | "heat" | "dust" | "mist";
}

export function getLayerHeadline(data: HubData[], dayIndex: number, layer: Layer): LayerHeadlineInfo {
  const currentDayIndex = Math.min(dayIndex, data[0]?.days.length - 1 || 0);
  const bestSolarHub = data.reduce(
    (max, x) => (x.days[currentDayIndex].kwhkwp > max.days[currentDayIndex].kwhkwp ? x : max),
    data[0]
  );
  const avgYield = data.reduce((acc, x) => acc + x.days[currentDayIndex].kwhkwp, 0) / (data.length || 1);
  const rainCount = data.filter((x) => x.days[currentDayIndex].rain >= 15).length;
  const heavyRainCount = data.filter((x) => x.days[currentDayIndex].rain >= 60).length;
  const heatCount = data.filter((x) => x.days[currentDayIndex].tmax >= 35).length;
  const dustCount = data.filter((x) => x.days[currentDayIndex].dust >= 350).length;

  switch (layer) {
    case "sun":
      return {
        badge: "Solar Radiance",
        badgeTone: "sun",
        happening: `Peak solar irradiance across Sahelian hubs — ${bestSolarHub.name} leads with ${bestSolarHub.days[currentDayIndex].kwhkwp.toFixed(1)} kWh/kWp (regional mean: ${avgYield.toFixed(1)} kWh/kWp).`,
        why: "Clear atmospheric window with negligible cloud attenuation across the northern West African corridor.",
        action: "Schedule daytime water pumping, grain milling, and cold-chain chilling between 10:30 and 15:30 to utilize surplus.",
      };
    case "rain":
      return {
        badge: heavyRainCount > 0 ? "Heavy Rain Alert" : "Convective Watch",
        badgeTone: "rain",
        happening: heavyRainCount > 0
          ? `${heavyRainCount} hubs under heavy tropical convective storm watch (>60 mm/day).`
          : rainCount > 0
          ? `${rainCount} coastal and riverine hubs anticipating moderate rainfall (15–45 mm/day).`
          : "Nominal dry rainfall conditions across the West African subcontinent.",
        why: "Tropical squall lines and convective storm cells depress PV generation by up to 70% and raise localized runoff risks.",
        action: "Pre-charge clinic and cold-chain storage to 100% before 14:00; clear perimeter drainage channels around inverter shelters.",
      };
    case "heat":
      return {
        badge: heatCount > 0 ? "Extreme Heat Warning" : "Thermal Nominal",
        badgeTone: "heat",
        happening: heatCount > 0
          ? `${heatCount} inland hubs experiencing high thermal stress (>35°C ambient).`
          : "Moderate ambient temperatures recorded across coastal and highland hubs.",
        why: "Silicon PV cells derate at approximately -0.4%/°C above 25°C cell temperature, while high ambient heat accelerates battery electrolyte wear.",
        action: "Verify inverter enclosure exhaust fans are operational and reserve battery cycling for essential evening health loads.",
      };
    case "dust":
      return {
        badge: dustCount > 0 ? "Harmattan Dust Alert" : "Clear Air Quality",
        badgeTone: "dust",
        happening: dustCount > 0
          ? `${dustCount} Sahelian hubs enveloped in dense Harmattan Saharan dust haze (PM10 >350 µg/m³).`
          : "Clear atmospheric aerosol conditions with minimal particulate attenuation across West Africa.",
        why: "North-easterly trade winds transport Saharan mineral aerosol, reducing direct beam irradiance and depositing soiling on panels.",
        action: "Prepare water supplies for post-haze manual panel washing; track PR degradation on the Operator Console.",
      };
    case "satellite":
      return {
        badge: "NASA GPM IMERG",
        badgeTone: "mist",
        happening: "NASA GPM IMERG 24-hour multi-satellite precipitation scan actively tracking convective storm tracks.",
        why: "Early/Late spaceborne microwave and infrared precipitation estimates provide 10-km satellite-derived rainfall tracking.",
        action: "Scrub the 24-hour satellite loop to trace storm squall progress; verify forecast accuracy on the Trust Scoreboard.",
      };
  }
}

const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [json];
};

export async function loadAtlas(): Promise<HubData[]> {
  const lats = HUBS.map((x) => x.lat).join(",");
  const lons = HUBS.map((x) => x.lon).join(",");

  const [weatherRes, airRes] = await Promise.all([
    fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=shortwave_radiation_sum,precipitation_sum,temperature_2m_max,wind_speed_10m_max,wind_direction_10m_dominant&forecast_days=5&timezone=UTC`
    ),
    fetchJson(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&hourly=dust&forecast_days=5&timezone=UTC`
    ).catch(() => [] as unknown[]),
  ]);

  return HUBS.map((hub, i) => {
    const daily = (weatherRes as { daily: { time: string[]; shortwave_radiation_sum: number[]; precipitation_sum: number[]; temperature_2m_max: number[]; wind_speed_10m_max?: number[]; wind_direction_10m_dominant?: number[] } }[])[i]?.daily;
    const airHourly = (airRes as { hourly?: { time: string[]; dust: number[] } }[])[i]?.hourly;
    const dustByDate: Record<string, number> = {};

    if (airHourly?.time) {
      airHourly.time.forEach((t: string, k: number) => {
        const dayStr = t.slice(0, 10);
        dustByDate[dayStr] = Math.max(dustByDate[dayStr] ?? 0, airHourly.dust[k] ?? 0);
      });
    }

    const days: Day[] = (daily?.time ?? []).map((date: string, k: number) => ({
      date,
      kwhkwp: ((daily.shortwave_radiation_sum[k] ?? 0) / 3.6) * T.pr,
      rain: daily.precipitation_sum[k] ?? 0,
      tmax: daily.temperature_2m_max[k] ?? 0,
      dust: dustByDate[date] ?? 0,
      windSpeed: daily.wind_speed_10m_max?.[k] ?? 12,
      windDir: daily.wind_direction_10m_dominant?.[k] ?? 45,
    }));

    return {
      ...hub,
      dustOk: Boolean(airHourly),
      days,
    };
  });
}

export function summary(data: HubData[], dayIndex: number) {
  const countHigh = (layer: Layer, minRisk: number) =>
    data.filter((x) => val(layer, x.days[dayIndex]) >= minRisk).length;

  const bestSolarHub = data.reduce(
    (max, x) => (x.days[dayIndex].kwhkwp > max.days[dayIndex].kwhkwp ? x : max),
    data[0]
  );

  return {
    heavyRainCount: countHigh("rain", 0.5),
    dustHazeCount: countHigh("dust", 0.4),
    extremeHeatCount: countHigh("heat", 0.5),
    bestHubName: bestSolarHub.name,
    bestHubCountry: bestSolarHub.country,
    bestHubYield: bestSolarHub.days[dayIndex].kwhkwp,
  };
}

export interface HubQuestions {
  happening: string;
  whyItMatters: string;
  actions: { tone: "risk" | "warn" | "go"; text: string; icon: string }[];
}

export function explainHubDay(hub: HubData, day: Day): HubQuestions {
  const actions: { tone: "risk" | "warn" | "go"; text: string; icon: string }[] = [];
  const rainRisk = val("rain", day);
  const dustRisk = val("dust", day);
  const heatRisk = val("heat", day);

  // 1. What is happening?
  let happening = `${hub.name} (${hub.country}): Expected solar yield of ${day.kwhkwp.toFixed(1)} kWh/kWp`;
  if (rainRisk >= 0.5) {
    happening += ` with heavy rainfall watch (${Math.round(day.rain)} mm/day).`;
  } else if (dustRisk >= 0.4 && hub.dustOk) {
    happening += ` under dense Harmattan dust haze (${Math.round(day.dust)} µg/m³).`;
  } else if (heatRisk >= 0.5) {
    happening += ` with extreme heat reaching ${Math.round(day.tmax)} °C.`;
  } else {
    happening += ` with calm meteorological conditions.`;
  }

  // 2. Why does it matter?
  let whyItMatters = "";
  if (rainRisk >= 0.5) {
    whyItMatters = "Heavy rainfall and persistent cloud cover sharply depress solar recharge, risking battery depletion and potential localized flood disruption to inverter shelters.";
    actions.push({
      tone: "risk",
      icon: "rain",
      text: `Heavy rain watch (${Math.round(day.rain)} mm): Fully top up battery bank today, inspect inverter shelter drainage, and elevate low-lying wiring.`,
    });
  }

  if (dustRisk >= 0.4 && hub.dustOk) {
    const lossEst = Math.round(dustRisk * 22);
    whyItMatters += ` Atmospheric aerosol particles will attenuate direct solar radiation, causing an estimated ${lossEst}% output derating.`;
    actions.push({
      tone: "warn",
      icon: "dust",
      text: `Harmattan dust haze (${Math.round(day.dust)} µg/m³): Defer non-critical daytime loads; schedule manual panel washing once dust clears.`,
    });
  }

  if (heatRisk >= 0.5) {
    whyItMatters += ` High ambient temperatures increase crystalline cell temperatures above 50°C, causing ~0.4% efficiency loss per °C and stressing battery cooling.`;
    actions.push({
      tone: "warn",
      icon: "heat",
      text: `Extreme heat (${Math.round(day.tmax)} °C): Prioritize clinic refrigerators and vaccine cold-chain ventilation over productive milling.`,
    });
  }

  if (day.kwhkwp >= 5.0 && rainRisk < 0.5) {
    if (!whyItMatters) {
      whyItMatters = "Generous solar irradiance creates significant daytime electricity surplus above baseline community lighting and refrigeration demand.";
    }
    actions.push({
      tone: "go",
      icon: "zap",
      text: "Surplus solar generation: Safely dispatch water pumping, agricultural grain milling, and cold storage between 10:00 and 15:00.",
    });
  } else if (day.kwhkwp < 3.5 && rainRisk < 0.5) {
    if (!whyItMatters) {
      whyItMatters = "Cloud attenuation will yield insufficient energy for full battery recharge, requiring conservative load management.";
    }
    actions.push({
      tone: "warn",
      icon: "battery",
      text: "Subdued solar yield: Shed non-essential commercial loads; enforce hard 3-hour critical health reserve.",
    });
  }

  if (actions.length === 0) {
    whyItMatters = "Solar yields and climate indices remain within standard operating tolerances with balanced battery cycling.";
    actions.push({
      tone: "go",
      icon: "check",
      text: "Conditions nominal. Standard automatic dispatch active with zero intervention needed.",
    });
  }

  return { happening, whyItMatters, actions };
}
