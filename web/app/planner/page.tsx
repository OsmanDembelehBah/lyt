"use client";

import { useMemo, useState } from "react";
import { Header } from "../components/Header";
import { useApp } from "../context";
import {
  SunIcon,
  ShieldCheckIcon,
  GlobeIcon,
  ZapIcon,
  DownloadIcon,
  SlidersIcon,
  FileTextIcon,
  MapPinIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "../components/Icons";

interface CandidateSite {
  id: string;
  name: string;
  country: string;
  cc: string;
  lat: number;
  lon: number;
  solarGhi: number; // kWh/m2/day
  climateResilience: number; // 0..100 (100 = low storm/flood vulnerability)
  unservedPop: number; // estimated population without access
  gridDistanceKm: number; // distance from central transmission grid
  plannedKwp: number;
  policyTarget: string;
}

const CANDIDATE_SITES: CandidateSite[] = [
  {
    id: "site-01",
    name: "Kabala Rural Hub",
    country: "Sierra Leone",
    cc: "SL",
    lat: 9.58,
    lon: -11.55,
    solarGhi: 5.3,
    climateResilience: 78,
    unservedPop: 18500,
    gridDistanceKm: 65,
    plannedKwp: 45,
    policyTarget: "ECOWAS EREP Rural Health Hub",
  },
  {
    id: "site-02",
    name: "Kédougou Border Commune",
    country: "Senegal",
    cc: "SN",
    lat: 12.55,
    lon: -12.18,
    solarGhi: 5.8,
    climateResilience: 84,
    unservedPop: 24000,
    gridDistanceKm: 110,
    plannedKwp: 60,
    policyTarget: "Senegal ASER Off-Grid Priority",
  },
  {
    id: "site-03",
    name: "Sikasso Agricultural Basin",
    country: "Mali",
    cc: "ML",
    lat: 11.31,
    lon: -5.66,
    solarGhi: 5.9,
    climateResilience: 72,
    unservedPop: 32000,
    gridDistanceKm: 85,
    plannedKwp: 80,
    policyTarget: "SDG 7 Productive Agro-Power",
  },
  {
    id: "site-04",
    name: "Bole District Solar Oasis",
    country: "Ghana",
    cc: "GH",
    lat: 9.03,
    lon: -2.48,
    solarGhi: 5.5,
    climateResilience: 88,
    unservedPop: 16000,
    gridDistanceKm: 42,
    plannedKwp: 35,
    policyTarget: "Ghana SREP Mini-Grid Plan",
  },
  {
    id: "site-05",
    name: "Kainji Lake Outer Settlement",
    country: "Nigeria",
    cc: "NG",
    lat: 9.87,
    lon: 4.62,
    solarGhi: 5.6,
    climateResilience: 64,
    unservedPop: 41000,
    gridDistanceKm: 95,
    plannedKwp: 110,
    policyTarget: "Nigeria REA NEP Component II",
  },
  {
    id: "site-06",
    name: "Tahoua Agro-Pastoral Station",
    country: "Niger",
    cc: "NE",
    lat: 14.88,
    lon: 5.26,
    solarGhi: 6.2,
    climateResilience: 68,
    unservedPop: 29000,
    gridDistanceKm: 140,
    plannedKwp: 75,
    policyTarget: "Sahel Desert-to-Power Initiative",
  },
];

export default function PlannerPage() {
  const { t } = useApp();

  // Multi-criteria weights
  const [wSolar, setWSolar] = useState(35);
  const [wResilience, setWResilience] = useState(25);
  const [wPop, setWPop] = useState(25);
  const [wDistance, setWDistance] = useState(15);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("site-01");

  // Compute composite siting score (0..100)
  const rankedSites = useMemo(() => {
    const totalWeight = wSolar + wResilience + wPop + wDistance || 1;

    return CANDIDATE_SITES.map((site) => {
      // Normalize individual attributes to 0..100
      const sSolar = Math.min(100, (site.solarGhi / 6.5) * 100);
      const sResilience = site.climateResilience;
      const sPop = Math.min(100, (site.unservedPop / 45000) * 100);
      const sDistance = Math.min(100, (site.gridDistanceKm / 150) * 100); // further from grid = higher off-grid mini-grid priority

      const compositeScore = Math.round(
        (sSolar * wSolar +
          sResilience * wResilience +
          sPop * wPop +
          sDistance * wDistance) /
          totalWeight
      );

      return {
        ...site,
        compositeScore,
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
  }, [wSolar, wResilience, wPop, wDistance]);

  const activeSite = rankedSites.find((s) => s.id === selectedSiteId) || rankedSites[0];

  const downloadReport = () => {
    const headers =
      "Rank,Site Name,Country,Composite Score,Solar Yield (GHI),Climate Resilience,Unserved Population,Distance to Grid (km),Planned Capacity (kWp),Policy Target\n";
    const rows = rankedSites
      .map(
        (s, idx) =>
          `"${idx + 1}","${s.name}","${s.country}","${s.compositeScore}","${s.solarGhi} kWh/m2","${s.climateResilience}/100","${s.unservedPop}","${s.gridDistanceKm} km","${s.plannedKwp} kWp","${s.policyTarget}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lyt_mini_grid_siting_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <main className="app-main">
      <Header />

      <section className="headline-section">
        <h1 className="regional-headline flex items-center gap-2">
          <span>Mini-Grid Siting Planner · Multi-Criteria Climate & Access Optimization</span>
        </h1>
        <p className="dim max-w-2xl">
          Evaluate prospective mini-grid deployments across West Africa. Weigh solar irradiance against hydrological risk, unserved rural population density, and transmission grid distance.
        </p>
      </section>

      {/* Siting Candidate Visual Map & Weight Sliders */}
      <div className="planner-layout-grid">
        {/* Left: Weight Adjustment Sliders */}
        <section className="planner-weights-card">
          <div className="card-header-row mb-3">
            <h3 className="section-title flex items-center gap-2">
              <SlidersIcon size={16} className="text-mist" />
              <span>Prioritization Weights</span>
            </h3>
            <span className="badge-verified">Real-Time Convex Scoring</span>
          </div>

          <div className="weights-grid">
            <div className="weight-item">
              <div className="weight-header">
                <span className="flex items-center gap-1.5">
                  <SunIcon size={14} className="text-sun" />
                  Solar Irradiance
                </span>
                <b>{wSolar}%</b>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={wSolar}
                onChange={(e) => setWSolar(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="weight-item">
              <div className="weight-header">
                <span className="flex items-center gap-1.5">
                  <ShieldCheckIcon size={14} className="text-mist" />
                  Climate Resilience (Low Flood/Storm)
                </span>
                <b>{wResilience}%</b>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={wResilience}
                onChange={(e) => setWResilience(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="weight-item">
              <div className="weight-header">
                <span className="flex items-center gap-1.5">
                  <GlobeIcon size={14} className="text-sand" />
                  Unserved Population Density
                </span>
                <b>{wPop}%</b>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={wPop}
                onChange={(e) => setWPop(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="weight-item">
              <div className="weight-header">
                <span className="flex items-center gap-1.5">
                  <ZapIcon size={14} className="text-sun" />
                  Distance from Central Grid (Isolation)
                </span>
                <b>{wDistance}%</b>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={wDistance}
                onChange={(e) => setWDistance(Number(e.target.value))}
                className="slider-input"
              />
            </div>
          </div>

          <div className="planner-actions flex items-center gap-3 flex-wrap">
            <button
              type="button"
              className="btn-pill flex items-center gap-2"
              onClick={downloadReport}
            >
              <DownloadIcon size={14} className="btn-icon" />
              <span>Download Shortlist Report (CSV)</span>
            </button>
            <button
              type="button"
              className="btn-ghost flex items-center gap-2"
              onClick={printReport}
            >
              <FileTextIcon size={14} className="btn-icon" />
              <span>Print / Save PDF</span>
            </button>
          </div>
          <span className="dim text-xs block mt-2">
            Directly exportable for ministries of energy, rural electrification agencies (REA, ASER), and climate finance funders.
          </span>
        </section>

        {/* Right: Geographic Siting Map Preview */}
        <section className="planner-map-card">
          <div className="card-header-row mb-3 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2 font-semibold text-sm text-[#FFFFFF]">
              <MapPinIcon size={15} className="text-[#F59E0B]" />
              <span>Geographic Candidate Density Map</span>
            </span>
            <span className="text-xs dim">Click pin to inspect</span>
          </div>

          <svg viewBox="0 0 400 240" className="w-full h-auto rounded-xl bg-[#0F131D] border border-[#283347] shadow-inner">
            {/* Background West Africa Coast Outline */}
            <path
              d="M 20,40 Q 80,50 140,80 T 220,130 Q 280,140 330,170 T 380,210 L 380,230 L 20,230 Z"
              fill="#1A2234"
              opacity="0.9"
            />

            {/* Candidate Hub Pins */}
            {rankedSites.map((site) => {
              // Normalized SVG coordinates for West Africa bounding box (lon -14..6, lat 6..16)
              const nx = ((site.lon - (-14)) / (7 - (-14))) * 340 + 30;
              const ny = 220 - ((site.lat - 5) / (16 - 5)) * 190;
              const isSelected = site.id === selectedSiteId;
              const r = 4 + (site.compositeScore / 100) * 8;
              const isFarRight = nx > 260;

              return (
                <g
                  key={site.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedSiteId(site.id)}
                >
                  <circle
                    cx={nx}
                    cy={ny}
                    r={r * 1.6}
                    fill="#F59E0B"
                    fillOpacity={isSelected ? 0.45 : 0.18}
                  />
                  <circle
                    cx={nx}
                    cy={ny}
                    r={r}
                    fill={isSelected ? "#FFFFFF" : "#F59E0B"}
                    stroke={isSelected ? "#FFFFFF" : "#D97706"}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />
                  <text
                    x={isFarRight ? nx - r - 6 : nx + r + 6}
                    y={ny + 3.5}
                    textAnchor={isFarRight ? "end" : "start"}
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fontWeight={isSelected ? "bold" : "normal"}
                  >
                    {site.name.split(" ")[0]} ({site.compositeScore})
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Active Site Mini-Card */}
          <div className="active-site-preview mt-4 p-4 rounded-xl bg-[#141824] border border-[#283347]">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <b className="text-[#FFFFFF] text-sm">{activeSite.name} ({activeSite.country})</b>
              <span className="score-pill">
                <b>{activeSite.compositeScore}</b> / 100 Siting Score
              </span>
            </div>
            <p className="text-xs dim mb-3">{activeSite.policyTarget}</p>
            <div className="grid grid-cols-4 gap-3 text-xs mb-3">
              <div>
                <span className="dim block">Solar GHI</span>
                <b>{activeSite.solarGhi} kWh/m²</b>
              </div>
              <div>
                <span className="dim block">Resilience</span>
                <b>{activeSite.climateResilience}/100</b>
              </div>
              <div>
                <span className="dim block">Unserved Pop</span>
                <b>{activeSite.unservedPop.toLocaleString()}</b>
              </div>
              <div>
                <span className="dim block">Planned Cap</span>
                <b className="accent-sun">{activeSite.plannedKwp} kWp</b>
              </div>
            </div>

            {/* Siting Score Multi-Factor Breakdown */}
            <div className="score-breakdown-bar pt-2 border-t border-[#283347]">
              <span className="text-xs dim block mb-1.5 flex justify-between">
                <span>Weighted Siting Score Breakdown</span>
                <span className="font-mono text-sand">{activeSite.compositeScore} pts</span>
              </span>
              <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[#0B0D13]">
                <div
                  style={{ width: `${(wSolar / 100) * 100}%` }}
                  className="bg-[#F59E0B]"
                  title={`Solar Irradiance (${wSolar}%)`}
                />
                <div
                  style={{ width: `${(wResilience / 100) * 100}%` }}
                  className="bg-[#10B981]"
                  title={`Climate Resilience (${wResilience}%)`}
                />
                <div
                  style={{ width: `${(wPop / 100) * 100}%` }}
                  className="bg-[#38BDF8]"
                  title={`Unserved Population (${wPop}%)`}
                />
                <div
                  style={{ width: `${(wDistance / 100) * 100}%` }}
                  className="bg-[#A78BFA]"
                  title={`Grid Distance (${wDistance}%)`}
                />
              </div>
              <div className="flex justify-between text-[10px] dim mt-1.5">
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full bg-[#F59E0B]" /> Sun</span>
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full bg-[#10B981]" /> Resilience</span>
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full bg-[#38BDF8]" /> Population</span>
                <span className="flex items-center gap-1"><i className="inline-block w-2 h-2 rounded-full bg-[#A78BFA]" /> Grid Dist</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Ranked Candidate Shortlist Table */}
      <section className="siting-results-section mt-6">
        <h3 className="section-title flex items-center gap-2 mb-3">
          <SparklesIcon size={16} className="text-sun" />
          <span>Ranked Mini-Grid Feasibility Shortlist</span>
        </h3>
        <div className="table-responsive">
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate Site</th>
                <th>Country</th>
                <th>Composite Score</th>
                <th>Solar GHI</th>
                <th>Resilience</th>
                <th>Unserved Pop</th>
                <th>Grid Distance</th>
                <th>Proposed kWp</th>
                <th>Policy Alignment</th>
              </tr>
            </thead>
            <tbody>
              {rankedSites.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`${idx === 0 ? "top-rank" : ""} ${s.id === selectedSiteId ? "selected-row" : ""}`}
                  onClick={() => setSelectedSiteId(s.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="rank-cell">#{idx + 1}</td>
                  <td className="site-cell">
                    <b>{s.name}</b>
                  </td>
                  <td>{s.country}</td>
                  <td>
                    <span className="score-pill">
                      <b>{s.compositeScore}</b> / 100
                    </span>
                  </td>
                  <td>{s.solarGhi} kWh/m²</td>
                  <td>{s.climateResilience}/100</td>
                  <td>{s.unservedPop.toLocaleString()}</td>
                  <td>{s.gridDistanceKm} km</td>
                  <td className="accent-sun">{s.plannedKwp} kWp</td>
                  <td className="text-xs dim">{s.policyTarget}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
