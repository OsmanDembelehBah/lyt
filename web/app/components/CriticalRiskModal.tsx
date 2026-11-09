"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { RiskPayload } from "../riskEngine";
import { DataBadge } from "./DataBadge";
import {
  AlertTriangleIcon,
  CloudRainIcon,
  ActivityIcon,
  DustIcon,
  WindIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  MessageSquareIcon,
  FileTextIcon,
} from "./Icons";

interface CriticalRiskModalProps {
  payload: RiskPayload | null;
  isOpen: boolean;
  onClose: () => void;
  onDispatchSms?: (payload: RiskPayload) => void;
}

export function CriticalRiskModal({
  payload,
  isOpen,
  onClose,
  onDispatchSms,
}: CriticalRiskModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Keyboard accessibility: Escape to dismiss, focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Autofocus dismiss button on open
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !payload) return null;

  const renderHazardIcon = (type: RiskPayload["hazardType"]) => {
    switch (type) {
      case "heavy_rain":
        return <CloudRainIcon size={24} className="text-[#7FB8FF]" />;
      case "extreme_heat":
        return <ActivityIcon size={24} className="text-[#C8472E]" />;
      case "harmattan_dust":
        return <DustIcon size={24} className="text-[#D2A35A]" />;
      case "wind_gust":
        return <WindIcon size={24} className="text-[#FFB347]" />;
    }
  };

  const severityColor =
    payload.severity === "critical"
      ? "#C8472E"
      : payload.severity === "high"
      ? "#F97316"
      : "#FFB347";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="critical-risk-title"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === modalRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-[#082725] border-2 border-[#13423F] shadow-2xl text-[#EFE3CB]">
        {/* Top Severity Banner */}
        <div
          className="p-4 flex items-center justify-between gap-3 text-white"
          style={{ background: `linear-gradient(90deg, ${severityColor}ee, ${severityColor}bb)` }}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-black/30">
              {renderHazardIcon(payload.hazardType)}
            </span>
            <div>
              <span className="font-mono text-xs uppercase tracking-widest font-black opacity-90 block">
                {payload.severity.toUpperCase()} CLIMATE ADVISORY
              </span>
              <h2 id="critical-risk-title" className="text-base md:text-lg font-bold tracking-tight">
                {payload.placeName}, {payload.district}
              </h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center text-sm font-mono font-bold transition-colors"
            onClick={onClose}
            aria-label="Close critical alert modal"
          >
            ✕
          </button>
        </div>

        {/* Mandatory Advisory Disclaimer Banner */}
        <div className="bg-[#031514] px-4 py-2 border-b border-[#13423F] flex items-center justify-between text-xs font-mono text-[#FFB347]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFB347] animate-pulse" />
            <b>{payload.disclaimer}</b>
          </span>
          <DataBadge status={payload.dataStatus} size="xs" />
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Probability & Interval Breakdown */}
          <div className="p-4 rounded-xl bg-[#0B3330] border border-[#13423F]">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[#6FD0C4]">
                Ensemble Confidence & Probability Interval
              </span>
              <span className="text-xs font-mono font-bold text-[#EFE3CB]">
                {Math.round(payload.probability * 100)}% Confidence [
                {Math.round(payload.probabilityInterval[0] * 100)}% –{" "}
                {Math.round(payload.probabilityInterval[1] * 100)}%]
              </span>
            </div>
            {/* Probability Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-[#041413] overflow-hidden border border-[#13423F]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(payload.probability * 100)}%`,
                  background: severityColor,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-[#CBD5E1] leading-relaxed">
              {payload.headline}
            </p>
          </div>

          {/* Section: Root Cause for Officials & Engineers */}
          <div className="p-4 rounded-xl bg-[#0B3330] border border-[#13423F]">
            <div className="flex items-center gap-2 mb-2 text-[#6FD0C4]">
              <FileTextIcon size={15} />
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold">
                Root Cause Analysis (For Grid Operators & Officials)
              </h3>
            </div>
            <p className="text-xs text-[#EFE3CB] leading-relaxed font-sans">
              {payload.rootCause}
            </p>
          </div>

          {/* Section: AI Direct Actionable Advice (Farmers & Operators) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#123835] to-[#0B3330] border-2 border-[#FFB347]/40 shadow-inner">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-[#FFB347]">
                <CheckCircleIcon size={16} />
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold">
                  AI Direct Actionable Advice
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3B2014] text-[#F97316] border border-[#F97316]/40">
                {payload.farmerAdvice.reviewed ? "AGRONOMIST REVIEWED" : "DRAFT ADVICE (reviewed: false)"}
              </span>
            </div>

            <div className="text-sm font-semibold text-white mb-2 leading-relaxed">
              Target Crop: <span className="text-[#FFB347] font-mono">{payload.farmerAdvice.cropTarget}</span>
            </div>

            <div className="p-3 rounded-lg bg-[#041413]/70 border border-[#13423F] text-xs text-[#EFE3CB] leading-relaxed font-sans">
              {payload.farmerAdvice.action}
            </div>
            <p className="mt-2 text-[10px] text-[#94A3B8] italic">
              *Notice: Draft farm advisories cannot be dispatched as real SMS until validated by local agricultural extension officers.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#041413] border-t border-[#13423F] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#94A3B8]">
              Target: {payload.chiefdom} Chiefdom · {payload.district}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/community?place=${payload.placeId}&hazard=${payload.hazardType}&severity=${payload.severity}`}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#FFB347] text-[#082725] hover:bg-[#FFA32B] flex items-center gap-2 shadow-lg transition-all"
              onClick={() => {
                if (onDispatchSms) onDispatchSms(payload);
                onClose();
              }}
            >
              <MessageSquareIcon size={14} />
              <span>Preview SMS Dispatch (Krio/Mende/Temne)</span>
            </Link>
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-[#13423F] text-[#EFE3CB] hover:bg-[#1C5B57] transition-colors"
              onClick={onClose}
            >
              Acknowledge & Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
