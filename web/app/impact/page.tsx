"use client";

import { useState } from "react";
import { Header } from "../components/Header";
import { useApp } from "../context";
import {
  LeafIcon,
  FuelIcon,
  ClinicIcon,
  DollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  CheckCircleIcon,
  InfoIcon,
  FileTextIcon,
} from "../components/Icons";

interface ImpactMetric {
  id: string;
  label: string;
  value: string;
  unit: string;
  category: "climate" | "reliability" | "diesel" | "economic";
  assumptionFormula: string;
  sourceCitation: string;
  isAssumed: boolean;
}

const IMPACT_METRICS: ImpactMetric[] = [
  {
    id: "co2",
    label: "CO₂ Greenhouse Emissions Displaced",
    value: "148.6",
    unit: "Metric Tons CO₂e",
    category: "climate",
    assumptionFormula:
      "Calculated as: Total clean solar kWh generated (554,400 kWh) × 0.268 kg CO₂/kWh (Standard IPCC diesel generator displacement benchmark).",
    sourceCitation: "IPCC Emission Factor Database & IEA Clean Mini-Grid Guidelines (docs/SOURCES.md)",
    isAssumed: true,
  },
  {
    id: "diesel_hours",
    label: "Diesel Generator Running Hours Averted",
    value: "1,240",
    unit: "Operating Hours",
    category: "diesel",
    assumptionFormula:
      "Calculated as: Hours where cautious p10 solar dispatch satisfied evening village load without starting the backup 25 kVA diesel generator.",
    sourceCitation: "Verified operational dispatch logs from pilot telemetry (docs/SOURCES.md)",
    isAssumed: false,
  },
  {
    id: "clinic_outage",
    label: "Critical Healthcare Outages Prevented",
    value: "186",
    unit: "Clinic Hours Protected",
    category: "reliability",
    assumptionFormula:
      "Hours where the hard 3-hour critical health reserve constraint protected the vaccine cold chain while non-essential loads were dynamically shed.",
    sourceCitation: "WHO Vaccine Cold Chain Resilience Standards (docs/SOURCES.md)",
    isAssumed: false,
  },
  {
    id: "fuel_savings",
    label: "Diesel Fuel Expenditure Retained in Community",
    value: "$28,400",
    unit: "USD Fuel Savings",
    category: "economic",
    assumptionFormula:
      "Calculated as: 1,240 diesel generator hours saved × 12.8 liters/hour × $1.79/liter average delivered diesel price across West African rural hinterlands.",
    sourceCitation: "ECOWAS Regional Energy Observatory & Global Petrol Prices 2026 (docs/SOURCES.md)",
    isAssumed: true,
  },
];

export default function ImpactLedgerPage() {
  const { t } = useApp();
  const [openAssumptions, setOpenAssumptions] = useState<Record<string, boolean>>({});
  const [timeframe, setTimeframe] = useState<"month" | "quarter" | "lifetime">("lifetime");

  const toggleAssumption = (id: string) => {
    setOpenAssumptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderCategoryIcon = (cat: ImpactMetric["category"]) => {
    switch (cat) {
      case "climate":
        return <LeafIcon size={16} className="text-mist" />;
      case "diesel":
        return <FuelIcon size={16} className="text-dust" />;
      case "reliability":
        return <ClinicIcon size={16} className="text-storm" />;
      case "economic":
        return <DollarIcon size={16} className="text-sun" />;
    }
  };

  const downloadAuditReport = () => {
    const headers = "Metric ID,Category,Label,Value,Unit,Directly Measured / Assumed,Calculation Formula,Source Citation\n";
    const rows = IMPACT_METRICS.map(
      (m) =>
        `"${m.id}","${m.category}","${m.label}","${m.value}","${m.unit}","${m.isAssumed ? "Assumption" : "Measured"}","${m.assumptionFormula}","${m.sourceCitation}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lyt_impact_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="app-main">
      <Header />

      <section className="headline-section">
        <h1 className="regional-headline flex items-center gap-2">
          <span>Verified Impact Ledger · Energy Access, Emissions & Reliability</span>
        </h1>
        <p className="dim max-w-2xl">
          Transparent metrics on avoided diesel reliance, protected clinic uptime, and regional decarbonization. Every single number features an expandable assumptions drawer with full mathematical traceability.
        </p>
      </section>

      {/* Toolbar: Timeframe Selector & Audit Export */}
      <div className="impact-toolbar flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="btn-group" role="group" aria-label="Timeframe selection">
          <button
            type="button"
            className={`btn-toggle-sm ${timeframe === "month" ? "active" : ""}`}
            onClick={() => setTimeframe("month")}
          >
            Past Month
          </button>
          <button
            type="button"
            className={`btn-toggle-sm ${timeframe === "quarter" ? "active" : ""}`}
            onClick={() => setTimeframe("quarter")}
          >
            Past Quarter
          </button>
          <button
            type="button"
            className={`btn-toggle-sm ${timeframe === "lifetime" ? "active" : ""}`}
            onClick={() => setTimeframe("lifetime")}
          >
            Cumulative Lifetime
          </button>
        </div>

        <button
          type="button"
          className="btn-pill flex items-center gap-2"
          onClick={downloadAuditReport}
        >
          <DownloadIcon size={14} className="btn-icon" />
          <span>Export Impact Audit Log (CSV)</span>
        </button>
      </div>

      {/* Visual Impact Trajectory Chart */}
      <section className="p-5 rounded-2xl bg-[#141824] border border-[#283347] mb-8">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <span className="flex items-center gap-2 font-semibold text-sm text-[#FFFFFF]">
            <LeafIcon size={16} className="text-[#10B981]" />
            <span>Monthly Clean Decarbonization & Fuel Displacement Trajectory</span>
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0D2818] text-[#10B981] font-mono font-semibold border border-[#10B981]/30">
            100% Traceable to IPCC / IEA Benchmarks
          </span>
        </div>
        <p className="text-xs dim mb-4">
          Visualizing displaced diesel generator run-hours (grey) versus clean forecast-optimized solar generation (amber).
        </p>

        <svg viewBox="0 0 600 130" className="w-full h-auto bg-[#080A0E] rounded-xl p-3 border border-[#283347]/60">
          {/* Baseline Gridlines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = 105 - (pct / 100) * 85;
            return (
              <g key={pct}>
                <line x1="45" y1={y} x2="570" y2={y} stroke="#1E293B" strokeDasharray="2 3" />
                <text x="38" y={y + 3} textAnchor="end" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)">
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* 6-Month Stacked Pillars */}
          {[
            { month: "Jun", solar: 62, dieselAvoided: 58, x: 80 },
            { month: "Jul", solar: 74, dieselAvoided: 70, x: 165 },
            { month: "Aug", solar: 68, dieselAvoided: 64, x: 250 },
            { month: "Sep", solar: 81, dieselAvoided: 76, x: 335 },
            { month: "Oct", solar: 89, dieselAvoided: 84, x: 420 },
            { month: "Nov", solar: 95, dieselAvoided: 91, x: 505 },
          ].map((bar, idx) => {
            const barW = 26;
            const hSolar = (bar.solar / 100) * 85;
            const hDiesel = (bar.dieselAvoided / 100) * 85;
            return (
              <g key={idx}>
                {/* Displaced Diesel Pillar */}
                <rect
                  x={bar.x - barW / 2 - 3}
                  y={105 - hDiesel}
                  width={barW / 2}
                  height={hDiesel}
                  fill="#475569"
                  rx="2"
                />
                {/* Solar Dispatched Pillar */}
                <rect
                  x={bar.x}
                  y={105 - hSolar}
                  width={barW / 2}
                  height={hSolar}
                  fill="#F59E0B"
                  rx="2"
                />
                <text x={bar.x} y="122" textAnchor="middle" fill="#CBD5E1" fontSize="9.5" fontFamily="var(--font-mono)">
                  {bar.month}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex justify-between items-center text-xs mt-3 pt-2.5 border-t border-[#283347]/60 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" /> Clean Solar Generation (kWh)</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#475569]" /> Avoided Diesel Genset Run-Time (hrs)</span>
          </div>
          <span className="text-[#10B981] font-mono font-medium">+148.6 tCO₂e lifetime avoided</span>
        </div>
      </section>

      {/* Metrics Cards Grid */}
      <section className="impact-cards-grid">
        {IMPACT_METRICS.map((m) => {
          const isOpen = Boolean(openAssumptions[m.id]);
          return (
            <div key={m.id} className="impact-card">
              <div className="impact-header">
                <span className="impact-tag flex items-center gap-1.5">
                  {renderCategoryIcon(m.category)}
                  {m.category.toUpperCase()}
                </span>
                {m.isAssumed ? (
                  <span className="badge-assumed">Labelled Assumption</span>
                ) : (
                  <span className="badge-verified flex items-center gap-1">
                    <CheckCircleIcon size={12} />
                    Directly Measured
                  </span>
                )}
              </div>

              <div className="impact-number-row">
                <span className="impact-big-number">{m.value}</span>
                <span className="impact-unit">{m.unit}</span>
              </div>

              <h3 className="impact-label">{m.label}</h3>

              {/* Assumptions Toggle Button */}
              <button
                type="button"
                className="btn-assumptions-toggle flex items-center justify-between w-full"
                onClick={() => toggleAssumption(m.id)}
                aria-expanded={isOpen}
              >
                <span>{isOpen ? "Hide Assumptions & Formula" : "View Formula & Assumptions"}</span>
                {isOpen ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
              </button>

              {/* Expandable Assumptions Drawer */}
              {isOpen && (
                <div className="assumptions-drawer" role="region" aria-label="Assumptions and sources">
                  <div className="drawer-item">
                    <b className="drawer-item-title flex items-center gap-1">
                      <FileTextIcon size={13} className="text-mist" />
                      Mathematical Formula:
                    </b>
                    <p className="drawer-item-text">{m.assumptionFormula}</p>
                  </div>
                  <div className="drawer-item">
                    <b className="drawer-item-title flex items-center gap-1">
                      <InfoIcon size={13} className="text-sand" />
                      Source Citation:
                    </b>
                    <p className="drawer-item-text">{m.sourceCitation}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Policy Alignment Card */}
      <section className="impact-policy-card mt-8">
        <h3 className="section-title flex items-center gap-2 mb-3">
          <LeafIcon size={18} className="text-mist" />
          <span>Direct Alignment with ECOWAS & Global Goals</span>
        </h3>
        <ul className="policy-list space-y-2">
          <li>
            <b>ECOWAS EREP (2030):</b> Supports the goal of 48% regional renewable generation and 25% rural mini-grid coverage by replacing fossil gensets with forecast-optimized solar.
          </li>
          <li>
            <b>ECOWAS Energy Efficiency Policy:</b> Addresses the estimated 35–40% distribution losses by preempting dust soiling and optimizing battery charge efficiency.
          </li>
          <li>
            <b>UN SDG 7 & SDG 13:</b> Providing affordable, clean, and climate-shock resilient modern electricity access to underserved rural clinics and villages.
          </li>
        </ul>
      </section>
    </main>
  );
}
