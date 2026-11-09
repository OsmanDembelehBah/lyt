"use client";

import React from "react";
import { Day } from "../atlas";
import { SunIcon, ZapIcon } from "./Icons";

interface TimeScrubberProps {
  days: Day[];
  selectedDayIndex: number;
  onSelectDay: (idx: number) => void;
  peakYield?: number;
}

export function TimeScrubber({
  days,
  selectedDayIndex,
  onSelectDay,
  peakYield = 5.5,
}: TimeScrubberProps) {
  const getWeekday = (dateStr: string, idx: number) => {
    if (idx === 0) return "Today";
    try {
      const d = new Date(dateStr + "T12:00:00Z");
      return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    } catch {
      return `Day +${idx}`;
    }
  };

  const getFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T12:00:00Z");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="time-scrubber-panel" role="region" aria-label="5-Day Outlook Scrubber and Sun Arc">
      {/* 5-Day Outlook Cards */}
      <div className="scrubber-days" role="group" aria-label="Forecast day selection">
        {days.map((d, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <button
              key={d.date}
              type="button"
              className={`scrubber-day-btn ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectDay(idx)}
              aria-pressed={isSelected}
            >
              <span className="day-name">{getWeekday(d.date, idx)}</span>
              <span className="day-date">{getFullDate(d.date)}</span>
              <span className="day-yield flex items-center gap-2">
                <SunIcon size={14} className="text-[#F59E0B]" />
                <b>{d.kwhkwp ? d.kwhkwp.toFixed(1) : "--"}</b>
                <small className="dim">kWh</small>
              </span>
            </button>
          );
        })}
      </div>

      {/* Celestial Sun Arc Visualizer */}
      <div className="sun-arc-card">
        <div className="sun-arc-header flex items-center justify-between mb-4 flex-wrap gap-3">
          <span className="sun-arc-title flex items-center gap-2 font-semibold text-sm text-[#FFFFFF]">
            <SunIcon size={16} className="text-[#F59E0B]" />
            <span>Celestial Sun Arc & Dispatch Windows ({getWeekday(days[selectedDayIndex]?.date || "", selectedDayIndex)})</span>
          </span>
          <span className="sun-arc-badge">
            Zenith Yield: ~{peakYield.toFixed(1)} kWh/kWp
          </span>
        </div>

        <svg viewBox="0 0 600 115" className="sun-arc-svg w-full" aria-label="Daylight solar trajectory and dispatch windows">
          {/* Horizon Line */}
          <line x1="40" y1="90" x2="560" y2="90" stroke="#283347" strokeOpacity="0.85" strokeWidth="1" />

          {/* Productive Load Window (10:00 to 15:00) */}
          <rect
            x="210"
            y="32"
            width="180"
            height="58"
            fill="#F59E0B"
            fillOpacity="0.12"
            stroke="#F59E0B"
            strokeOpacity="0.55"
            strokeWidth="1"
            strokeDasharray="3 3"
            rx="8"
          />
          <text x="300" y="52" textAnchor="middle" fill="#FBBF24" fontSize="11" fontWeight="700" letterSpacing="0.02em">
            ⚡ Midday Productive Window
          </text>
          <text x="300" y="68" textAnchor="middle" fill="#CBD5E1" fontSize="9.5" opacity="0.85">
            Surplus Dispatch: Pumps, Mills & Ice
          </text>

          {/* Sun Celestial Arc */}
          <path
            d="M 60 90 Q 300 14 540 90"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.2"
            strokeDasharray="4 4"
            opacity="0.9"
          />

          {/* Sun at Midday Zenith */}
          <circle cx="300" cy="22" r="8" fill="#FBBF24" className="sun-zenith-dot" />
          <circle cx="300" cy="22" r="15" fill="none" stroke="#FBBF24" strokeWidth="1.5" opacity="0.35" />

          {/* Sunrise marker (06:00) */}
          <circle cx="60" cy="90" r="4.5" fill="#F59E0B" />
          <text x="60" y="105" textAnchor="middle" fill="#CBD5E1" fontSize="10" opacity="0.9">
            06:00 Dawn
          </text>

          {/* Midday marker (12:00) */}
          <line x1="300" y1="76" x2="300" y2="90" stroke="#F59E0B" strokeOpacity="0.5" strokeDasharray="2 2" />
          <text x="300" y="105" textAnchor="middle" fill="#FBBF24" fontSize="10.5" fontWeight="700">
            12:00 Peak Zenith
          </text>

          {/* Sunset marker (18:00) */}
          <circle cx="540" cy="90" r="4.5" fill="#F59E0B" />
          <text x="540" y="105" textAnchor="middle" fill="#CBD5E1" fontSize="10" opacity="0.9">
            18:00 Dusk
          </text>
        </svg>
      </div>
    </div>
  );
}
