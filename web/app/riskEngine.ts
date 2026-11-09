// Standardized Climate Risk Engine for Lyt
// Centerpiece for Sierra Leone district & chiefdom hazard evaluation
// Complies with Non-Negotiable Rules: "Advisory from Lyt, not an official warning."
// Farm advice remains marked draft (reviewed: false) until verified by agronomists.

import { DataStatus } from "./components/DataBadge";

export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type HazardType = "heavy_rain" | "extreme_heat" | "harmattan_dust" | "wind_gust";

export interface Chiefdom {
  id: string;
  name: string;
  districtId: string;
  lat: number;
  lon: number;
  primaryCrops: string[];
  gridType: "mini-grid" | "off-grid" | "solar-pump" | "clinic-backup";
}

export interface District {
  id: string;
  name: string;
  province: "Western Area" | "Northern" | "North West" | "Southern" | "Eastern";
  chiefdoms: Chiefdom[];
}

export interface FarmerAdvice {
  action: string;
  cropTarget: string;
  reviewed: boolean; // Must remain false until agronomist review
}

export interface RiskPayload {
  placeId: string;
  placeName: string;
  district: string;
  chiefdom: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  severity: SeverityLevel;
  hazardType: HazardType;
  probability: number; // 0.00 to 1.00
  probabilityInterval: [number, number]; // e.g. [0.72, 0.88]
  headline: string;
  rootCause: string;
  farmerAdvice: FarmerAdvice;
  dataStatus: DataStatus;
  disclaimer: "Advisory from Lyt, not an official warning.";
  generatedAt: string;
}

// Complete 16-District Sierra Leone Geo-Hierarchy with key mini-grid & farming chiefdoms
export const SIERRA_LEONE_DISTRICTS: District[] = [
  {
    id: "freetown_urban",
    name: "Western Area Urban",
    province: "Western Area",
    chiefdoms: [
      { id: "fna_central", name: "Freetown Central", districtId: "freetown_urban", lat: 8.48, lon: -13.23, primaryCrops: ["Urban Horticulture", "Fish Cold Storage"], gridType: "clinic-backup" },
      { id: "lumley", name: "Lumley Coastal", districtId: "freetown_urban", lat: 8.45, lon: -13.27, primaryCrops: ["Coastal Fisheries", "Cold Chain"], gridType: "clinic-backup" },
    ],
  },
  {
    id: "western_rural",
    name: "Western Area Rural",
    province: "Western Area",
    chiefdoms: [
      { id: "waterloo", name: "Waterloo", districtId: "western_rural", lat: 8.33, lon: -13.07, primaryCrops: ["Cassava", "Vegetables", "Poultry"], gridType: "mini-grid" },
      { id: "york", name: "York Peninsula", districtId: "western_rural", lat: 8.31, lon: -13.17, primaryCrops: ["Cassava", "Artisanal Fishery"], gridType: "solar-pump" },
    ],
  },
  {
    id: "kambia",
    name: "Kambia",
    province: "North West",
    chiefdoms: [
      { id: "magbema", name: "Magbema", districtId: "kambia", lat: 9.12, lon: -12.92, primaryCrops: ["Lowland Rice", "Cassava", "Vegetables"], gridType: "mini-grid" },
      { id: "tonko_limba", name: "Tonko Limba", districtId: "kambia", lat: 9.18, lon: -12.85, primaryCrops: ["Rice", "Oil Palm", "Groundnuts"], gridType: "solar-pump" },
      { id: "samu", name: "Samu Tidal", districtId: "kambia", lat: 8.98, lon: -13.05, primaryCrops: ["Mangrove Swamp Rice", "Salt Pan"], gridType: "off-grid" },
    ],
  },
  {
    id: "port_loko",
    name: "Port Loko",
    province: "North West",
    chiefdoms: [
      { id: "baku_loko", name: "Bake Loko", districtId: "port_loko", lat: 9.06, lon: -12.78, primaryCrops: ["Cassava", "Oil Palm", "Pepper"], gridType: "mini-grid" },
      { id: "maforki", name: "Maforki", districtId: "port_loko", lat: 9.01, lon: -12.72, primaryCrops: ["Rice", "Cassava Processing"], gridType: "solar-pump" },
    ],
  },
  {
    id: "karene",
    name: "Karene",
    province: "North West",
    chiefdoms: [
      { id: "kamalo", name: "Kamalo (Sanda Loko)", districtId: "karene", lat: 9.42, lon: -12.45, primaryCrops: ["Groundnut", "Sorghum", "Upland Rice"], gridType: "solar-pump" },
    ],
  },
  {
    id: "bombali",
    name: "Bombali",
    province: "Northern",
    chiefdoms: [
      { id: "makari_gbanti", name: "Makari Gbanti (Makeni)", districtId: "bombali", lat: 8.88, lon: -12.04, primaryCrops: ["Rice Milling", "Vegetables", "Livestock"], gridType: "mini-grid" },
      { id: "biriwa", name: "Biriwa (Kamabai)", districtId: "bombali", lat: 9.15, lon: -11.95, primaryCrops: ["Cattle Pasture", "Corn", "Cassava"], gridType: "solar-pump" },
    ],
  },
  {
    id: "koinadugu",
    name: "Koinadugu",
    province: "Northern",
    chiefdoms: [
      { id: "wara_wara", name: "Wara Wara Yagala (Kabala)", districtId: "koinadugu", lat: 9.58, lon: -11.55, primaryCrops: ["Highland Cabbage", "Carrot", "Potato", "Rice"], gridType: "mini-grid" },
      { id: "kasunko", name: "Kasunko", districtId: "koinadugu", lat: 9.40, lon: -11.75, primaryCrops: ["Upland Rice", "Ginger", "Livestock"], gridType: "off-grid" },
    ],
  },
  {
    id: "falaba",
    name: "Falaba",
    province: "Northern",
    chiefdoms: [
      { id: "mongo", name: "Mongo (Bendugu)", districtId: "falaba", lat: 9.82, lon: -11.32, primaryCrops: ["Pastoral Livestock", "Millet", "Peanuts"], gridType: "solar-pump" },
    ],
  },
  {
    id: "tonkolili",
    name: "Tonkolili",
    province: "Northern",
    chiefdoms: [
      { id: "kholifa_rowalla", name: "Kholifa Rowalla (Magburaka)", districtId: "tonkolili", lat: 8.72, lon: -11.95, primaryCrops: ["Inland Valley Rice", "Sweet Potato"], gridType: "mini-grid" },
    ],
  },
  {
    id: "bo",
    name: "Bo",
    province: "Southern",
    chiefdoms: [
      { id: "kakua", name: "Kakua (Bo City)", districtId: "bo", lat: 7.96, lon: -11.74, primaryCrops: ["Rice Milling", "Cassava", "Oil Palm"], gridType: "mini-grid" },
      { id: "tikonko", name: "Tikonko", districtId: "bo", lat: 7.85, lon: -11.82, primaryCrops: ["Oil Palm", "Inland Rice", "Cocoa"], gridType: "solar-pump" },
    ],
  },
  {
    id: "bonthe",
    name: "Bonthe",
    province: "Southern",
    chiefdoms: [
      { id: "mattru_jong", name: "Jong (Mattru Jong)", districtId: "bonthe", lat: 7.62, lon: -11.83, primaryCrops: ["Oil Palm", "Piassava", "Riverine Fisheries"], gridType: "clinic-backup" },
      { id: "sittia", name: "Sittia (Bonthe Island)", districtId: "bonthe", lat: 7.52, lon: -12.50, primaryCrops: ["Artisanal Fish Curing", "Coconut"], gridType: "off-grid" },
    ],
  },
  {
    id: "moyamba",
    name: "Moyamba",
    province: "Southern",
    chiefdoms: [
      { id: "kaiyamba", name: "Kaiyamba (Moyamba)", districtId: "moyamba", lat: 8.16, lon: -12.43, primaryCrops: ["Cassava", "Ginger", "Rutaceae"], gridType: "mini-grid" },
    ],
  },
  {
    id: "pujehun",
    name: "Pujehun",
    province: "Southern",
    chiefdoms: [
      { id: "kpanga_krim", name: "Kpanga (Pujehun)", districtId: "pujehun", lat: 7.35, lon: -11.72, primaryCrops: ["Oil Palm", "Cocoa", "Coffee"], gridType: "solar-pump" },
    ],
  },
  {
    id: "kenema",
    name: "Kenema",
    province: "Eastern",
    chiefdoms: [
      { id: "nongowa", name: "Nongowa (Kenema)", districtId: "kenema", lat: 7.88, lon: -11.19, primaryCrops: ["Cocoa", "Coffee", "Rice", "Cassava"], gridType: "mini-grid" },
      { id: "dama", name: "Dama (Giema)", districtId: "kenema", lat: 7.72, lon: -11.10, primaryCrops: ["Cocoa Processing", "Oil Palm"], gridType: "solar-pump" },
    ],
  },
  {
    id: "kono",
    name: "Kono",
    province: "Eastern",
    chiefdoms: [
      { id: "gbense", name: "Gbense (Koidu)", districtId: "kono", lat: 8.64, lon: -10.97, primaryCrops: ["Vegetables", "Swamp Rice", "Coffee"], gridType: "mini-grid" },
      { id: "nimikoro", name: "Nimikoro", districtId: "kono", lat: 8.52, lon: -11.05, primaryCrops: ["Rice", "Oil Palm"], gridType: "solar-pump" },
    ],
  },
  {
    id: "kailahun",
    name: "Kailahun",
    province: "Eastern",
    chiefdoms: [
      { id: "luawa", name: "Luawa (Kailahun)", districtId: "kailahun", lat: 8.28, lon: -10.57, primaryCrops: ["Export Cocoa", "Robusta Coffee", "Upland Rice"], gridType: "solar-pump" },
      { id: "jawei", name: "Jawei (Darru)", districtId: "kailahun", lat: 7.98, lon: -10.85, primaryCrops: ["Cocoa Smallholders", "Oil Palm"], gridType: "mini-grid" },
    ],
  },
];

export interface HazardInputs {
  rain24hMm: number;
  tempMaxC: number;
  dustPm10: number;
  windGustKmh: number;
  historicalRainMedian?: number;
}

export function evaluateRisk(
  chiefdom: Chiefdom,
  district: District,
  inputs: HazardInputs
): RiskPayload {
  const { rain24hMm, tempMaxC, dustPm10, windGustKmh } = inputs;

  // Determine Primary Hazard & Severity
  let severity: SeverityLevel = "low";
  let hazardType: HazardType = "heavy_rain";
  let probability = 0.25;
  let probInterval: [number, number] = [0.18, 0.32];
  let headline = "Normal climate conditions across chiefdom.";
  let rootCause = "Atmospheric and solar parameters remain within standard operational tolerances.";
  let adviceAction = "Normal farm operations. Irrigate vegetables and run processing mills during 10:30-15:00 solar peak.";

  // 1. Extreme Rain & Convective Flood Risk (>60 mm/day or heavy flash rain)
  if (rain24hMm >= 60) {
    severity = "critical";
    hazardType = "heavy_rain";
    probability = 0.88;
    probInterval = [0.82, 0.94];
    headline = `CRITICAL: Severe convective tropical storm watch (${Math.round(rain24hMm)} mm/24h) in ${chiefdom.name}.`;
    rootCause = `Intertropical Convergence Zone (ITCZ) squall line combined with Atlantic coastal monsoonal surge will deliver intense convective precipitation exceeding 60 mm/24h, triggering localized flash flood runoff and subduing solar recharge by >65%.`;
    adviceAction = `Clear field drainage trenches immediately to prevent waterlogging in young crops. Elevate stored grain and cocoa bags onto raised pallets. Pre-charge battery storage before 14:00.`;
  } else if (windGustKmh >= 55) {
    // 2. Squall Wind Gust Surge
    severity = "high";
    hazardType = "wind_gust";
    probability = 0.80;
    probInterval = [0.72, 0.88];
    headline = `HIGH: Dangerous squall wind gust surge (${Math.round(windGustKmh)} km/h) in ${chiefdom.name}.`;
    rootCause = `Severe convective downdraft microburst preceding advancing squall line; immediate structural detachment risk to zinc roofing, drying sheds, and solar tracker mounts.`;
    adviceAction = `Reinforce corrugated roof clamps and secure elevated solar panels. Harvest mature cassava and brace plantain stands against severe lodging.`;
  } else if (dustPm10 >= 380) {
    // 3. Harmattan Severe Saharan Aerosol Dust Haze
    severity = "high";
    hazardType = "harmattan_dust";
    probability = 0.82;
    probInterval = [0.75, 0.89];
    headline = `HIGH: Dense Harmattan dust haze alert (${Math.round(dustPm10)} µg/m³ PM10) in ${chiefdom.name}.`;
    rootCause = `Intense north-easterly Bodélé depression trade winds transporting mineral dust across the Sahel corridor, attenuating direct beam solar irradiance by ~24% and drastically increasing agricultural wildfire propagation danger.`;
    adviceAction = `Do not ignite agricultural brush clearing or slash-and-burn piles today. Protect open drying cassava and coffee from airborne particulates. Clean solar array panels early morning before 08:00.`;
  } else if (tempMaxC >= 38) {
    // 4. Extreme Thermal Heatwave
    severity = "high";
    hazardType = "extreme_heat";
    probability = 0.79;
    probInterval = [0.71, 0.86];
    headline = `HIGH: Severe ambient heat warning (${Math.round(tempMaxC)}°C) in ${chiefdom.name}.`;
    rootCause = `Stagnant high-pressure thermal ridge elevating ambient surface temperatures past 38°C, causing crystalline PV thermal degradation (-0.4%/°C above 25°C) and extreme livestock heat stress.`;
    adviceAction = `Provide shaded watering troughs for livestock and poultry every 2 hours. Shift field harvesting and manual labor to dawn (06:00-09:30) and dusk to prevent heat exhaustion.`;
  } else if (rain24hMm >= 35) {
    // 5. Moderate/Heavy Rain
    severity = "high";
    hazardType = "heavy_rain";
    probability = 0.74;
    probInterval = [0.66, 0.82];
    headline = `HIGH: Heavy tropical precipitation alert (${Math.round(rain24hMm)} mm) across ${chiefdom.name}.`;
    rootCause = `Elevated atmospheric precipitable water (PWAT >55mm) driving convective thunderheads. Surface runoff risk on sloping terrain.`;
    adviceAction = `Halt fertilizer and pesticide applications today to prevent surface chemical wash-off. Move poultry and small ruminants to elevated shelter.`;
  }

  const primaryCrop = chiefdom.primaryCrops[0] || "Staple Crops";

  return {
    placeId: chiefdom.id,
    placeName: chiefdom.name,
    district: district.name,
    chiefdom: chiefdom.name,
    coordinates: {
      lat: chiefdom.lat,
      lon: chiefdom.lon,
    },
    severity,
    hazardType,
    probability,
    probabilityInterval: probInterval,
    headline,
    rootCause,
    farmerAdvice: {
      action: adviceAction,
      cropTarget: primaryCrop,
      reviewed: false, // Non-negotiable rule: false until certified
    },
    dataStatus: "MODELED",
    disclaimer: "Advisory from Lyt, not an official warning.",
    generatedAt: new Date().toISOString(),
  };
}

// Seeded Crisis Scenarios for Guaranteed Demo Mode
export const SEEDED_DEMO_SCENARIOS: Record<string, { label: string; hazard: HazardType; inputs: HazardInputs; chiefdomId: string }> = {
  flood: {
    label: "Flash Flood / Heavy Convective Storm (Kambia)",
    hazard: "heavy_rain",
    chiefdomId: "magbema",
    inputs: { rain24hMm: 84.5, tempMaxC: 28.5, dustPm10: 42, windGustKmh: 48 },
  },
  heat: {
    label: "Extreme Pre-Monsoon Heatwave (Kabala)",
    hazard: "extreme_heat",
    chiefdomId: "wara_wara",
    inputs: { rain24hMm: 0.0, tempMaxC: 39.8, dustPm10: 120, windGustKmh: 18 },
  },
  harmattan: {
    label: "Harmattan Dust Surge & Wildfire Risk (Makeni)",
    hazard: "harmattan_dust",
    chiefdomId: "makari_gbanti",
    inputs: { rain24hMm: 0.0, tempMaxC: 34.0, dustPm10: 485, windGustKmh: 35 },
  },
  wind: {
    label: "Squall Line Wind Gust Microburst (Bo)",
    hazard: "wind_gust",
    chiefdomId: "kakua",
    inputs: { rain24hMm: 38.0, tempMaxC: 29.0, dustPm10: 65, windGustKmh: 68 },
  },
};
