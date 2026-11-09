"use client";

import React, { useState } from "react";
import {
  SIERRA_LEONE_DISTRICTS,
  SEEDED_DEMO_SCENARIOS,
  evaluateRisk,
  RiskPayload,
} from "../riskEngine";
import { CriticalRiskModal } from "./CriticalRiskModal";
import {
  AlertTriangleIcon,
  CloudRainIcon,
  ActivityIcon,
  DustIcon,
  WindIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "./Icons";

interface DemoModeBarProps {
  onCrisisTriggered?: (payload: RiskPayload) => void;
  onResetLive?: () => void;
}

export function DemoModeBar({ onCrisisTriggered, onResetLive }: DemoModeBarProps) {
  const [activeCrisis, setActiveCrisis] = useState<RiskPayload | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(false);

  const triggerScenario = (key: string) => {
    const scenario = SEEDED_DEMO_SCENARIOS[key];
    if (!scenario) return;

    let foundChiefdom = null;
    let foundDistrict = null;

    for (const d of SIERRA_LEONE_DISTRICTS) {
      const c = d.chiefdoms.find((ch) => ch.id === scenario.chiefdomId);
      if (c) {
        foundChiefdom = c;
        foundDistrict = d;
        break;
      }
    }

    if (!foundChiefdom || !foundDistrict) return;

    const payload = evaluateRisk(foundChiefdom, foundDistrict, scenario.inputs);
    setActiveCrisis(payload);
    setModalOpen(true);
    setIsDemoActive(true);

    if (onCrisisTriggered) {
      onCrisisTriggered(payload);
    }
  };

  const handleReset = () => {
    setActiveCrisis(null);
    setModalOpen(false);
    setIsDemoActive(false);
    if (onResetLive) {
      onResetLive();
    }
  };

  return (
    <>
      <div className="demo-mode-bar bg-[#031514] border-y border-[#13423F] px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] font-bold text-[#FFB347] flex items-center gap-1.5 uppercase tracking-wider">
            <SparklesIcon size={14} />
            <span>Demo Mode:</span>
          </span>
          <span className="text-[11px] text-[#94A3B8] hide-mobile">
            Trigger deterministic seeded crises for judges & officials:
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              className="px-2.5 py-1 rounded-lg bg-[#082725] border border-[#7FB8FF]/40 text-[#7FB8FF] hover:bg-[#7FB8FF]/15 font-mono text-[11px] flex items-center gap-1 transition-all"
              onClick={() => triggerScenario("flood")}
              title="Trigger 84.5mm convective flash storm in Kambia"
            >
              <CloudRainIcon size={12} />
              <span>⚡ Flood (Kambia)</span>
            </button>

            <button
              type="button"
              className="px-2.5 py-1 rounded-lg bg-[#082725] border border-[#C8472E]/40 text-[#C8472E] hover:bg-[#C8472E]/15 font-mono text-[11px] flex items-center gap-1 transition-all"
              onClick={() => triggerScenario("heat")}
              title="Trigger 39.8°C extreme heatwave in Kabala"
            >
              <ActivityIcon size={12} />
              <span>🌡️ Heat (Kabala)</span>
            </button>

            <button
              type="button"
              className="px-2.5 py-1 rounded-lg bg-[#082725] border border-[#D2A35A]/40 text-[#D2A35A] hover:bg-[#D2A35A]/15 font-mono text-[11px] flex items-center gap-1 transition-all"
              onClick={() => triggerScenario("harmattan")}
              title="Trigger 485 µg/m³ dust haze in Makeni"
            >
              <DustIcon size={12} />
              <span>🔥 Harmattan (Makeni)</span>
            </button>

            <button
              type="button"
              className="px-2.5 py-1 rounded-lg bg-[#082725] border border-[#FFB347]/40 text-[#FFB347] hover:bg-[#FFB347]/15 font-mono text-[11px] flex items-center gap-1 transition-all"
              onClick={() => triggerScenario("wind")}
              title="Trigger 68 km/h squall microburst in Bo"
            >
              <WindIcon size={12} />
              <span>💨 Wind (Bo)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDemoActive && activeCrisis && (
            <button
              type="button"
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#C8472E] text-white font-bold animate-pulse"
              onClick={() => setModalOpen(true)}
            >
              Active Crisis: {activeCrisis.placeName} ↗
            </button>
          )}

          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-[#13423F] hover:bg-[#1C5B57] text-[#EFE3CB] font-mono text-[11px] flex items-center gap-1 transition-all"
            onClick={handleReset}
            title="Reset simulation back to live numerical forecasts"
          >
            <RefreshCwIcon size={12} />
            <span>Reset to Live</span>
          </button>
        </div>
      </div>

      <CriticalRiskModal
        payload={activeCrisis}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
