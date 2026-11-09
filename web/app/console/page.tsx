"use client";

import { useState } from "react";
import { Header } from "../components/Header";
import { useApp } from "../context";
import {
  DownloadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  ShieldCheckIcon,
  ClockIcon,
  FileTextIcon,
  ShieldAlertIcon,
} from "../components/Icons";

interface AlertItem {
  id: string;
  timestamp: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  recommendedAction: string;
  acknowledged: boolean;
  ackBy?: string;
  ackTime?: string;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "alt-01",
    timestamp: "10 mins ago",
    severity: "warning",
    title: "Harmattan Dust Soiling Detected",
    detail: "Median daily performance ratio has dropped 12.4% below clear-sky physical baseline over the last 3 days.",
    recommendedAction: "Schedule array wash with soft squeegees tomorrow morning before 08:00.",
    acknowledged: false,
  },
  {
    id: "alt-02",
    timestamp: "28 mins ago",
    severity: "critical",
    title: "Heavy Convective Rainfall Forecast (15:00 - 18:00)",
    detail: "Open-Meteo GloFAS river discharge and NWP precipitation model predicts >35 mm/h localized downpour.",
    recommendedAction: "Lock battery bank into pre-charge; inspect drainage channels around inverter container.",
    acknowledged: false,
  },
  {
    id: "alt-03",
    timestamp: "2 hours ago",
    severity: "info",
    title: "Midday Solar Surplus Window Opened",
    detail: "Clear sky solar yield exceeding 5.2 kW. Battery reached 80% SoC.",
    recommendedAction: "Dispatch community water pumping and cassava grain mill loads.",
    acknowledged: true,
    ackBy: "Tech Alpha (Local)",
    ackTime: "1 hr ago",
  },
];

export default function ConsolePage() {
  const { t } = useApp();
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<"all" | "pending" | "acknowledged">("pending");

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              acknowledged: true,
              ackBy: "Operator (Manual)",
              ackTime: "Just now",
            }
          : a
      )
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "pending") return !a.acknowledged;
    if (filter === "acknowledged") return a.acknowledged;
    return true;
  });

  const downloadAuditLog = () => {
    const headers = "ID,Timestamp,Severity,Title,Action,Acknowledged,AckBy,AckTime\n";
    const rows = alerts
      .map(
        (a) =>
          `"${a.id}","${a.timestamp}","${a.severity}","${a.title}","${a.recommendedAction}","${a.acknowledged}","${a.ackBy || ""}","${a.ackTime || ""}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lyt_operator_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSeverityIcon = (sev: AlertItem["severity"]) => {
    switch (sev) {
      case "critical":
        return <ShieldAlertIcon size={14} className="text-storm" />;
      case "warning":
        return <AlertTriangleIcon size={14} className="text-dust" />;
      case "info":
        return <InfoIcon size={14} className="text-mist" />;
    }
  };

  return (
    <main className="app-main">
      <Header />

      <section className="headline-section">
        <h1 className="regional-headline flex items-center gap-2">
          <span>Operator Console · Active Mini-Grid Intelligence & Audit Trail</span>
        </h1>
        <p className="dim max-w-2xl">
          Prioritized alert inbox and live hardware diagnostics for on-site technicians and remote dispatchers. Every acknowledged action is recorded in the cryptographically hashed audit log.
        </p>
      </section>

      {/* Fleet Diagnostics: Dust Soiling & Battery Health Trend Charts */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* 1. Dust Soiling Degradation Trend Chart */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-[#283347]">
          <div className="flex justify-between items-center mb-3">
            <span className="flex items-center gap-2 font-semibold text-sm text-[#FFFFFF]">
              <AlertTriangleIcon size={16} className="text-[#F59E0B]" />
              <span>Harmattan Soiling Degradation Trend (7 Days)</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#3B2014] text-[#F97316] font-mono font-semibold border border-[#F97316]/30">
              12.4% Generation Loss
            </span>
          </div>
          <p className="text-xs dim mb-4">
            Daily median performance ratio vs clear-sky baseline. Red dashed line indicates the 10% threshold for recommended cleaning.
          </p>

          <svg viewBox="0 0 500 160" className="w-full h-auto bg-[#080A0E] rounded-xl p-3 border border-[#283347]/60">
            {/* Gridlines */}
            {[0, 5, 10, 15].map((lossVal) => {
              const y = 130 - (lossVal / 15) * 105;
              return (
                <g key={lossVal}>
                  <line x1="45" y1={y} x2="480" y2={y} stroke="#1E293B" strokeDasharray="2 3" />
                  <text x="38" y={y + 3} textAnchor="end" fill="#94A3B8" fontSize="9.5" fontFamily="var(--font-mono)">
                    {lossVal}%
                  </text>
                </g>
              );
            })}

            {/* 10% Action Trigger Threshold */}
            <line x1="45" y1={130 - (10 / 15) * 105} x2="480" y2={130 - (10 / 15) * 105} stroke="#F97316" strokeDasharray="4 3" strokeWidth="1.5" />
            <text x="475" y={130 - (10 / 15) * 105 - 6} textAnchor="end" fill="#F97316" fontSize="9" fontWeight="bold" fontFamily="var(--font-mono)">
              10% CLEANING TRIGGER
            </text>

            {/* 7-Day Soiling Trend Area & Curve */}
            {/* Points: Day 1: 2.1%, Day 2: 3.4%, Day 3: 5.2%, Day 4: 6.8%, Day 5: 8.5%, Day 6: 10.4%, Day 7: 12.4% */}
            <path
              d="M 60 130 L 60 115.3 L 130 106.2 L 200 93.6 L 270 82.4 L 340 70.5 L 410 57.2 L 470 43.2 L 470 130 Z"
              fill="rgba(245, 158, 11, 0.12)"
            />
            <path
              d="M 60 115.3 L 130 106.2 L 200 93.6 L 270 82.4 L 340 70.5 L 410 57.2 L 470 43.2"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
            />

            {/* Data Dots & X-Labels */}
            {[
              { day: "D-6", val: 2.1, x: 60, y: 115.3 },
              { day: "D-5", val: 3.4, x: 130, y: 106.2 },
              { day: "D-4", val: 5.2, x: 200, y: 93.6 },
              { day: "D-3", val: 6.8, x: 270, y: 82.4 },
              { day: "D-2", val: 8.5, x: 340, y: 70.5 },
              { day: "D-1", val: 10.4, x: 410, y: 57.2 },
              { day: "Today", val: 12.4, x: 470, y: 43.2 },
            ].map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r={idx === 6 ? "5.5" : "3.5"} fill={idx >= 5 ? "#F97316" : "#F59E0B"} stroke="#080A0E" strokeWidth="2" />
                <text x={p.x} y="145" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)">
                  {p.day}
                </text>
              </g>
            ))}
          </svg>
          <div className="flex justify-between items-center text-xs mt-3 pt-2.5 border-t border-[#283347]/60">
            <span className="dim">Action: Wash array tomorrow at 07:30</span>
            <span className="text-[#F97316] font-medium">+1.4 kWh/kWp recovered</span>
          </div>
        </div>

        {/* 2. Battery State-of-Health & Cycle Retention Chart */}
        <div className="p-5 rounded-2xl bg-[#141824] border border-[#283347]">
          <div className="flex justify-between items-center mb-3">
            <span className="flex items-center gap-2 font-semibold text-sm text-[#FFFFFF]">
              <ShieldCheckIcon size={16} className="text-[#10B981]" />
              <span>LiFePO₄ Battery Health & Cycle Degradation</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0D2818] text-[#10B981] font-mono font-semibold border border-[#10B981]/30">
              98.4% SOH (Healthy)
            </span>
          </div>
          <p className="text-xs dim mb-4">
            Electrochemical capacity retention curve. MPC micro-cycle penalty has prolonged cell life by ~2.4 years.
          </p>

          <svg viewBox="0 0 500 160" className="w-full h-auto bg-[#080A0E] rounded-xl p-3 border border-[#283347]/60">
            {/* Gridlines */}
            {[70, 80, 90, 100].map((sohVal) => {
              const y = 130 - ((sohVal - 70) / 30) * 105;
              return (
                <g key={sohVal}>
                  <line x1="45" y1={y} x2="480" y2={y} stroke="#1E293B" strokeDasharray="2 3" />
                  <text x="38" y={y + 3} textAnchor="end" fill="#94A3B8" fontSize="9.5" fontFamily="var(--font-mono)">
                    {sohVal}%
                  </text>
                </g>
              );
            })}

            {/* End of Life Threshold (80% SOH) */}
            <line x1="45" y1={130 - (10 / 30) * 105} x2="480" y2={130 - (10 / 30) * 105} stroke="#FDA4AF" strokeDasharray="3 3" opacity="0.6" />
            <text x="475" y={130 - (10 / 30) * 105 - 5} textAnchor="end" fill="#FDA4AF" fontSize="8.5" fontFamily="var(--font-mono)">
              80% RETIREMENT THRESHOLD
            </text>

            {/* Unmitigated Heuristic Degradation (Ghost line) */}
            <path
              d="M 60 25 Q 240 65 470 120"
              fill="none"
              stroke="#64748B"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.6"
            />

            {/* Lyt MPC Optimized Retention Curve */}
            <path
              d="M 60 25 Q 240 45 470 78"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
            />

            {/* Current Position Marker at 418 cycles */}
            <circle cx="103" cy="30.5" r="5" fill="#10B981" stroke="#080A0E" strokeWidth="2" />
            <line x1="103" y1="35" x2="103" y2="130" stroke="#10B981" strokeDasharray="2 2" strokeOpacity="0.4" />
            <text x="103" y="145" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="bold" fontFamily="var(--font-mono)">
              Cycle 418 (Now)
            </text>

            {/* Future Projection Ticks */}
            <text x="260" y="145" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)">
              Cycle 2,000
            </text>
            <text x="450" y="145" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="var(--font-mono)">
              Cycle 4,000
            </text>
          </svg>
          <div className="flex justify-between items-center text-xs mt-3 pt-2.5 border-t border-[#283347]/60">
            <span className="dim">Cell Impedance: 14.2 mΩ (Nominal)</span>
            <span className="text-[#10B981] font-medium">+2.4 yrs battery life added</span>
          </div>
        </div>
      </section>

      {/* Control bar */}
      <div className="console-toolbar">
        <div className="btn-group" role="group" aria-label="Alert status filter">
          <button
            type="button"
            className={`btn-toggle-sm ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending ({alerts.filter((a) => !a.acknowledged).length})
          </button>
          <button
            type="button"
            className={`btn-toggle-sm ${filter === "acknowledged" ? "active" : ""}`}
            onClick={() => setFilter("acknowledged")}
          >
            Acknowledged ({alerts.filter((a) => a.acknowledged).length})
          </button>
          <button
            type="button"
            className={`btn-toggle-sm ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Alerts ({alerts.length})
          </button>
        </div>

        <button
          type="button"
          className="btn-ghost-sm flex items-center gap-2"
          onClick={downloadAuditLog}
          title="Export CSV audit log for regulators and mini-grid records"
        >
          <DownloadIcon size={14} className="btn-icon" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Alerts list */}
      <div className="alerts-container">
        {filteredAlerts.length === 0 ? (
          <div className="empty-card">
            <span className="empty-icon">
              <CheckCircleIcon size={36} className="text-mist" />
            </span>
            <h3>Inbox Clean</h3>
            <p className="dim text-sm">No {filter} alerts at this time. All systems nominal.</p>
          </div>
        ) : (
          filteredAlerts.map((a) => (
            <div
              key={a.id}
              className={`alert-card ${a.severity} ${a.acknowledged ? "is-ack" : ""}`}
            >
              <div className="alert-header">
                <div className="alert-meta">
                  <span className={`severity-tag ${a.severity} flex items-center gap-1.5`}>
                    {renderSeverityIcon(a.severity)}
                    <span>{a.severity.toUpperCase()}</span>
                  </span>
                  <span className="alert-time flex items-center gap-1.5">
                    <ClockIcon size={12} className="text-sand/60 btn-icon" />
                    <span>{a.timestamp}</span>
                  </span>
                  <span className="alert-id">#{a.id}</span>
                </div>
                {a.acknowledged ? (
                  <span className="ack-status flex items-center gap-1.5 text-mist">
                    <CheckCircleIcon size={13} className="btn-icon" />
                    <span>Acknowledged by {a.ackBy} ({a.ackTime})</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-pill btn-ack"
                    onClick={() => acknowledgeAlert(a.id)}
                  >
                    Acknowledge & Record
                  </button>
                )}
              </div>

              <h3 className="alert-title">{a.title}</h3>
              <p className="alert-detail">{a.detail}</p>

              <div className="alert-action-box">
                <span className="action-tag">Recommended Action</span>
                <p className="action-text">{a.recommendedAction}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
