"use client";

import React, { useState } from "react";

export type DataStatus = "LIVE" | "MODELED" | "SIMULATED" | "ILLUSTRATIVE";
export type ProofBadgeType = "satellite_verified" | "station_verified" | "community_reported" | "modeled";

interface DataBadgeProps {
  status?: DataStatus;
  proof?: ProofBadgeType;
  label?: string;
  tooltip?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const DEFAULT_TOOLTIPS: Record<DataStatus, string> = {
  LIVE: "Live API ingestion: numerical weather prediction (Open-Meteo) or real station telemetry.",
  MODELED: "Downscaled CMIP6 climate model or physics forecaster output.",
  SIMULATED: "Demonstration telemetry pipeline; not connected to live physical hardware.",
  ILLUSTRATIVE: "Illustrative scenario projection, not a deterministic forecast.",
};

const PROOF_CONFIG: Record<ProofBadgeType, { label: string; tooltip: string; color: string }> = {
  satellite_verified: {
    label: "Satellite-verified",
    tooltip: "Cross-verified with NASA GPM IMERG spaceborne radar / EUMETSAT products.",
    color: "#6FD0C4",
  },
  station_verified: {
    label: "Station-verified",
    tooltip: "Calibrated against ground automated weather stations (TAHMO / SYNOP).",
    color: "#10B981",
  },
  community_reported: {
    label: "Community-reported",
    tooltip: "Verified by multi-stakeholder community and operator ground reports.",
    color: "#FFB347",
  },
  modeled: {
    label: "Modeled",
    tooltip: "Computed via downscaled CMIP6 projection and convex MPC optimization.",
    color: "#818CF8",
  },
};

export function DataBadge({
  status,
  proof,
  label,
  tooltip,
  size = "xs",
  className = "",
}: DataBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (proof) {
    const config = PROOF_CONFIG[proof];
    const tip = tooltip || config.tooltip;
    const displayText = label || config.label;

    return (
      <span
        className={`data-badge-wrap relative inline-flex items-center ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        tabIndex={0}
        role="note"
        aria-label={`${displayText}: ${tip}`}
      >
        <span
          className={`proof-badge proof-${proof.replace("_", "-")} text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1.5`}
          style={{ borderColor: `${config.color}55`, color: config.color, background: `${config.color}15` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
          <span>{displayText}</span>
        </span>
        {showTooltip && (
          <span className="data-badge-popover absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 px-2.5 py-1.5 rounded bg-[#041413] border border-[#1b3d3b] text-[#EFE3CB] text-[11px] whitespace-normal w-48 text-center shadow-xl pointer-events-none">
            {tip}
          </span>
        )}
      </span>
    );
  }

  const currentStatus = status || "MODELED";
  const tip = tooltip || DEFAULT_TOOLTIPS[currentStatus];
  const displayText = label || currentStatus;

  const styles: Record<DataStatus, { bg: string; border: string; text: string; dot: string }> = {
    LIVE: {
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.4)",
      text: "#10B981",
      dot: "#10B981",
    },
    MODELED: {
      bg: "rgba(111, 208, 196, 0.12)",
      border: "rgba(111, 208, 196, 0.4)",
      text: "#6FD0C4",
      dot: "#6FD0C4",
    },
    SIMULATED: {
      bg: "rgba(255, 179, 71, 0.12)",
      border: "rgba(255, 179, 71, 0.4)",
      text: "#FFB347",
      dot: "#FFB347",
    },
    ILLUSTRATIVE: {
      bg: "rgba(192, 132, 252, 0.12)",
      border: "rgba(192, 132, 252, 0.4)",
      text: "#C084FC",
      dot: "#C084FC",
    },
  };

  const style = styles[currentStatus];
  const sizeClasses =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5 tracking-wider"
      : size === "sm"
      ? "text-[10px] px-2 py-0.5 tracking-wider"
      : "text-xs px-2.5 py-1";

  return (
    <span
      className={`data-badge-wrap relative inline-flex items-center cursor-help ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      tabIndex={0}
      role="note"
      aria-label={`${displayText} data status: ${tip}`}
    >
      <span
        className={`font-mono font-bold uppercase rounded-full inline-flex items-center gap-1 border transition-all ${sizeClasses}`}
        style={{
          background: style.bg,
          borderColor: style.border,
          color: style.text,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ background: style.dot }}
        />
        <span>{displayText}</span>
      </span>
      {showTooltip && (
        <span className="data-badge-popover absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 px-2.5 py-1.5 rounded bg-[#041413] border border-[#1b3d3b] text-[#EFE3CB] text-[11px] whitespace-normal w-48 text-center shadow-xl pointer-events-none">
          {tip}
        </span>
      )}
    </span>
  );
}
