"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "../components/Header";
import { DataBadge } from "../components/DataBadge";
import {
  Act,
  Hr,
  Reading,
  State,
  WhatIfParams,
  connect,
  demo,
  simulateWhatIf,
} from "../lib";
import { useApp } from "../context";
import {
  SunIcon,
  ZapIcon,
  BatteryIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
  SlidersIcon,
  ClockIcon,
  ActivityIcon,
} from "../components/Icons";

// Fluid Liquid Tide with Spring Easing and Cautious p10 Lower Watermark
function BatteryTide({
  level,
  lowWatermark,
  criticalReserve = 0.1875,
}: {
  level: number;
  lowWatermark: number;
  criticalReserve?: number;
}) {
  const pathMed = useRef<SVGPathElement>(null);
  const pathLow = useRef<SVGPathElement>(null);
  const state = useRef({
    currentMed: level,
    currentLow: lowWatermark,
    velMed: 0,
    targetMed: level,
    targetLow: lowWatermark,
  });

  state.current.targetMed = level;
  state.current.targetLow = lowWatermark;

  useEffect(() => {
    let animId = 0;
    const startT = performance.now();

    const generateWave = (
      el: SVGPathElement,
      waterLevel: number,
      amplitude: number,
      phase: number,
      time: number
    ) => {
      let d = "M0 200";
      const clampedLevel = Math.max(0.02, Math.min(0.98, waterLevel));
      const baseY = 200 - clampedLevel * 185;

      for (let x = 0; x <= 200; x += 4) {
        const y =
          baseY -
          Math.sin((x / 200) * 8.5 + phase + time * 1.8) * amplitude;
        d += ` L${x} ${y.toFixed(1)}`;
      }
      el.setAttribute("d", d + " L200 200 L0 200 Z");
    };

    const loop = (t: number) => {
      const s = state.current;
      const elapsed = (t - startT) / 1000;

      // Spring physics easing
      s.velMed = (s.velMed + (s.targetMed - s.currentMed) * 0.08) * 0.82;
      s.currentMed += s.velMed;
      s.currentLow += (s.targetLow - s.currentLow) * 0.08;

      const dynamicAmp = 2.0 + Math.min(8.0, Math.abs(s.velMed) * 380);

      if (pathMed.current && pathLow.current) {
        // Cautious p10 lower watermark wave
        generateWave(pathLow.current, s.currentLow, dynamicAmp * 0.65, 2.2, elapsed);
        // Median actual wave
        generateWave(pathMed.current, s.currentMed, dynamicAmp, 0, elapsed);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const reserveY = (200 - criticalReserve * 185).toFixed(1);

  return (
    <div className="tide-container" role="img" aria-label={`Battery storage tide at ${Math.round(level * 100)}%`}>
      <svg viewBox="0 0 200 200" className="tide-svg">
        <defs>
          <clipPath id="circleClip">
            <circle cx="100" cy="100" r="94" />
          </clipPath>
        </defs>

        {/* Circular clipping shell */}
        <g clipPath="url(#circleClip)">
          {/* Reservoir floor (Deep obsidian carbon) */}
          <rect width="200" height="200" fill="#080A0E" />

          {/* Cautious p10 lower level wave (deep amber gold) */}
          <path ref={pathLow} fill="#D97706" opacity="0.45" />

          {/* Median level wave (brilliant sun gold) */}
          <path ref={pathMed} fill="#F59E0B" opacity="0.88" />

          {/* 3-Hour Critical Health Reserve Line */}
          <line
            x1="10"
            y1={reserveY}
            x2="190"
            y2={reserveY}
            stroke="#F43F5E"
            strokeWidth="2"
            strokeDasharray="4 3"
            opacity="0.9"
          />
        </g>

        {/* Outer terminal slate bezel */}
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="#283347"
          strokeOpacity="0.8"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

export default function SiteBrainPage() {
  const { t } = useApp();
  const [baseState, setBaseState] = useState<State | null>(null);
  const [liveReading, setLiveReading] = useState<Reading | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"live" | "retry" | "demo">("retry");
  const [selectedHour, setSelectedHour] = useState<number>(0);
  const [explainAct, setExplainAct] = useState<Act | null>(null);
  const [nowSec, setNowSec] = useState<number>(Date.now());
  const [lastSeenTime, setLastSeenTime] = useState<number>(Date.now());

  // What-If Simulation State
  const [whatIfActive, setWhatIfActive] = useState(false);
  const [whatIfParams, setWhatIfParams] = useState<WhatIfParams>({
    loadShiftHours: 0,
    storageDeltaKwh: 0,
    simulateDustLoss: false,
  });

  // Connect to live WebSocket or fallback to demo
  useEffect(() => {
    const unsub = connect({
      state: (s) => {
        setBaseState(s);
        setLastSeenTime(Date.now());
      },
      reading: (r) => {
        setLiveReading(r);
        setLastSeenTime(Date.now());
      },
      status: setConnectionStatus,
    });

    const clock = setInterval(() => setNowSec(Date.now()), 1000);

    // If no backend connected after 3.5s, launch physics demo
    const timeout = setTimeout(() => {
      setBaseState((prev) => {
        if (!prev) {
          setConnectionStatus("demo");
          return demo();
        }
        return prev;
      });
    }, 3500);

    return () => {
      unsub();
      clearInterval(clock);
      clearTimeout(timeout);
    };
  }, []);

  // Compute active state (either baseline or What-If simulation)
  const activeState = useMemo(() => {
    if (!baseState) return null;
    if (whatIfActive) {
      return simulateWhatIf(baseState, whatIfParams);
    }
    return baseState;
  }, [baseState, whatIfActive, whatIfParams]);

  if (!activeState) {
    return (
      <main className="app-main">
        <Header />
        <div className="loading-state">
          <div className="spinner" />
          <p>Connecting to mini-grid Site Brain gateway...</p>
        </div>
      </main>
    );
  }

  const hours = activeState.hours;
  const currentHr = hours[selectedHour] || hours[0];
  const ageSeconds = Math.max(0, Math.round((nowSec - lastSeenTime) / 1000));
  const isLive = connectionStatus === "live";
  const currentSoc =
    selectedHour === 0 && liveReading ? liveReading.soc : currentHr.soc[1];
  const cautiousSoc = currentHr.soc[0];
  const currentPv =
    selectedHour === 0 && liveReading ? liveReading.pv_kw : currentHr.pv[1];
  const currentLoad =
    selectedHour === 0 && liveReading ? liveReading.load_kw : currentHr.load[0];

  // Professional Dual-Axis SVG Chart Dimensions
  const chartW = 920;
  const chartH = 260;
  const padL = 58; // Left axis for Power (kW)
  const padR = 64; // Right axis for Battery SoC (%)
  const padT = 24;
  const padB = 38;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const maxKw = Math.max(
    8,
    Math.ceil(
      Math.max(...hours.map((h) => Math.max(h.pv[2] || 0, h.load[0] || 0, 1))) / 2
    ) * 2
  );

  const scaleX = (idx: number) => padL + (idx * plotW) / 23;
  const scaleKwY = (kw: number) => padT + plotH - (Math.max(0, Math.min(maxKw, kw)) / maxKw) * plotH;
  const scaleSocY = (soc: number) => padT + plotH - Math.max(0, Math.min(1, soc)) * plotH;

  // Uncertainty envelope path (p10 to p90)
  const uncertaintyPath =
    hours.map((h, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleKwY(h.pv[2]).toFixed(1)}`).join(" ") +
    " " +
    [...hours]
      .reverse()
      .map((h, i) => `L ${scaleX(23 - i).toFixed(1)} ${scaleKwY(h.pv[0]).toFixed(1)}`)
      .join(" ") +
    " Z";

  const medianPvPath = hours
    .map((h, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleKwY(h.pv[1]).toFixed(1)}`)
    .join(" ");

  const demandPath = hours
    .map((h, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleKwY(h.load[0]).toFixed(1)}`)
    .join(" ");

  const socPath = hours
    .map((h, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(1)} ${scaleSocY(h.soc[1]).toFixed(1)}`)
    .join(" ");

  const statusBadge = (
    <span
      className={`pill-badge ${
        connectionStatus === "live"
          ? "live"
          : connectionStatus === "demo"
          ? "warn"
          : "retry"
      }`}
      role="status"
    >
      <i className="pulse-dot" />
      {connectionStatus === "live"
        ? `Live Ingest · ${ageSeconds}s age`
        : connectionStatus === "demo"
        ? "Demo Mode (Offline)"
        : "Reconnecting..."}
    </span>
  );

  return (
    <main className="app-main">
      <Header statusBadge={statusBadge} />

      {/* Demo / Offline Notification */}
      {connectionStatus === "demo" && (
        <div className="demo-notice-bar" role="status">
          <span className="flex items-center gap-1.5">
            <InfoIcon size={14} className="text-mist" />
            Running simulated mini-grid telemetry based on Freetown real weather.
          </span>
          <button
            type="button"
            className="btn-ghost-sm"
            onClick={() => window.location.reload()}
          >
            Connect Hardware
          </button>
        </div>
      )}

      {/* Hero Section: Sloshing Tide & 3-Question Framework */}
      <section className="site-hero-grid">
        {/* Left: Liquid Battery Tide */}
        <div className="battery-tide-card">
          <div className="tide-wrapper">
            <BatteryTide level={currentSoc} lowWatermark={cautiousSoc} />
            <div className="tide-overlay-readout">
              <span className="tide-percentage">
                {Math.round(currentSoc * 100)}%
              </span>
              <span className="tide-label">
                {selectedHour === 0 ? "Now" : `${String(currentHr.hour).padStart(2, "0")}:00`} · Battery SoC
              </span>
              <span className="tide-sub">
                p10 lower bound: {Math.round(cautiousSoc * 100)}%
              </span>
            </div>
          </div>

          <div className="battery-specs">
            <div className="spec-item">
              <span className="spec-label">Capacity</span>
              <b className="spec-val flex items-center gap-1">
                <span>{activeState.nominal_cap_kwh || 40} kWh</span>
                <DataBadge status="MODELED" size="xs" />
              </b>
            </div>
            <div className="spec-item">
              <span className="spec-label">Critical Reserve</span>
              <b className="spec-val accent-storm flex items-center gap-1">
                <span>7.5 kWh (~3h)</span>
                <DataBadge status="MODELED" size="xs" />
              </b>
            </div>
            <div className="spec-item">
              <span className="spec-label">Conformal Cov</span>
              <b className="spec-val accent-mist flex items-center gap-1">
                <span>{Math.round((activeState.confidence || 0.8) * 100)}%</span>
                <DataBadge status="MODELED" size="xs" />
              </b>
            </div>
          </div>
        </div>

        {/* Right: 3 Questions for the Mini-Grid Operator */}
        <div className="operator-intel-card">
          <div className="q-block">
            <h2 className="q-heading">1. What is happening?</h2>
            <p className="q-description">
              Mini-grid generating{" "}
              <b className="accent-sun">{currentPv.toFixed(1)} kW solar</b> against{" "}
              <b className="accent-sand">{currentLoad.toFixed(1)} kW demand</b>. Storage is at{" "}
              <b>{Math.round(currentSoc * 100)}%</b> with a pessimistic lower bound of{" "}
              <b>{Math.round(cautiousSoc * 100)}%</b>.
              {activeState.soiling && activeState.soiling.loss_pct > 8 && (
                <span className="accent-dust flex items-center gap-1.5 mt-1">
                  <AlertTriangleIcon size={14} className="text-dust" />
                  Harmattan dust soiling causing ~{activeState.soiling.loss_pct}% generation loss.
                </span>
              )}
            </p>
          </div>

          <div className="q-block">
            <h2 className="q-heading">2. Why does it matter?</h2>
            <p className="q-description">
              {cautiousSoc < 0.2
                ? "Low irradiance and heavy loads threaten the 3-hour emergency reserve for the rural clinic and vaccine refrigerator."
                : currentPv - currentLoad > 2.0
                ? "Abundant solar surplus allows productive community agro-processing without risk to evening residential lighting."
                : "Generation and load curves are balanced within standard battery cycle life tolerances."}
            </p>
          </div>

          <div className="q-block">
            <h2 className="q-heading">3. What should I do?</h2>
            <ul className="site-plan-list">
              {activeState.plan.map((p, idx) => (
                <li
                  key={idx}
                  className={`plan-item ${
                    p.action === "storm"
                      ? "risk"
                      : p.action === "shed" || p.action === "clean"
                      ? "warn"
                      : "go"
                  }`}
                >
                  <div className="plan-item-header">
                    <span className="plan-time">
                      {p.start}:00
                      {p.end !== undefined ? ` – ${p.end}:00` : ""}
                    </span>
                    <span className="plan-badge">{p.action.toUpperCase()}</span>
                  </div>
                  <div className="plan-text">
                    <b>{t.actions[p.action] || p.action}</b>
                    {p.why && <p className="plan-why">{p.why}</p>}
                  </div>
                  {p.evidence && (
                    <button
                      type="button"
                      className="btn-explain"
                      onClick={() => setExplainAct(p)}
                    >
                      <InfoIcon size={13} className="btn-icon" />
                      <span>Explain Decision</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 24-Hour Probabilistic Timeline with Uncertainty Bands */}
      <section className="timeline-section">
        <div className="timeline-header">
          <div>
            <h3 className="section-title">24-Hour Probabilistic Forecast & Uncertainty Bands</h3>
            <p className="dim text-sm">
              Solid amber = p50 median sun · Shaded envelope = p10/p90 confidence band · Dashed = village demand · Terminal emerald = battery SoC
            </p>
          </div>
          <div className="timeline-live-stat flex-wrap gap-2">
            <span className="stat-chip time-chip">
              <span className="chip-label">HOUR</span>
              <b>{String(currentHr.hour).padStart(2, "0")}:00</b>
            </span>
            <span className="stat-chip sun-chip">
              <span className="chip-label flex items-center justify-between gap-1">
                <span>SOLAR (p50)</span>
                <DataBadge status={isLive ? "LIVE" : "SIMULATED"} size="xs" />
              </span>
              <b>{currentPv.toFixed(1)} kW</b>
              <small className="dim">[{currentHr.pv[0].toFixed(1)} – {currentHr.pv[2].toFixed(1)}]</small>
            </span>
            <span className="stat-chip load-chip">
              <span className="chip-label flex items-center justify-between gap-1">
                <span>DEMAND</span>
                <DataBadge status={isLive ? "LIVE" : "SIMULATED"} size="xs" />
              </span>
              <b>{currentLoad.toFixed(1)} kW</b>
            </span>
            <span className="stat-chip soc-chip">
              <span className="chip-label flex items-center justify-between gap-1">
                <span>BATTERY</span>
                <DataBadge status={isLive ? "LIVE" : "SIMULATED"} size="xs" />
              </span>
              <b>{Math.round(currentSoc * 100)}%</b>
              <small className="dim">p10: {Math.round(cautiousSoc * 100)}%</small>
            </span>
            <span className={`stat-chip balance-chip ${currentPv >= currentLoad ? "surplus" : "deficit"}`}>
              <span className="chip-label flex items-center justify-between gap-1">
                <span>NET BALANCE</span>
                <DataBadge status="MODELED" size="xs" />
              </span>
              <b>{currentPv >= currentLoad ? `+${(currentPv - currentLoad).toFixed(1)} kW` : `-${(currentLoad - currentPv).toFixed(1)} kW`}</b>
            </span>
          </div>
        </div>

        <div className="timeline-chart-wrapper">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="timeline-svg"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clientX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, (clientX - (padL * rect.width) / chartW) / ((plotW * rect.width) / chartW)));
              const hr = Math.round(ratio * 23);
              if (hr >= 0 && hr <= 23 && hr !== selectedHour) {
                setSelectedHour(hr);
              }
            }}
          >
            <defs>
              <linearGradient id="pvUncertaintyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="needleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Night Shading: 00:00 to 06:00 */}
            <rect
              x={scaleX(0)}
              y={padT}
              width={scaleX(6) - scaleX(0)}
              height={plotH}
              fill="#06080C"
              fillOpacity="0.65"
            />
            {/* Daytime Golden Window: 06:00 to 18:00 */}
            <rect
              x={scaleX(6)}
              y={padT}
              width={scaleX(18) - scaleX(6)}
              height={plotH}
              fill="#F59E0B"
              fillOpacity="0.035"
            />
            {/* Night Shading: 18:00 to 23:00 */}
            <rect
              x={scaleX(18)}
              y={padT}
              width={scaleX(23) - scaleX(18)}
              height={plotH}
              fill="#06080C"
              fillOpacity="0.65"
            />

            {/* Horizontal Gridlines & Dual Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const y = padT + plotH - frac * plotH;
              const kwVal = (frac * maxKw).toFixed(frac === 0 || frac === 1 ? 0 : 1);
              const socVal = Math.round(frac * 100);
              return (
                <g key={idx}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={padL + plotW}
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray={frac === 0 ? "none" : "2 3"}
                  />
                  {/* Left Axis Label: kW */}
                  <text
                    x={padL - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                  >
                    {kwVal} kW
                  </text>
                  {/* Right Axis Label: Battery SoC % */}
                  <text
                    x={padL + plotW + 10}
                    y={y + 3.5}
                    textAnchor="start"
                    fill="#10B981"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {socVal}%
                  </text>
                </g>
              );
            })}

            {/* Vertical Time Ticks & X-Axis Labels */}
            {[
              { h: 0, label: "00:00" },
              { h: 3, label: "03:00" },
              { h: 6, label: "06:00 Dawn" },
              { h: 9, label: "09:00" },
              { h: 12, label: "12:00 Zenith" },
              { h: 15, label: "15:00" },
              { h: 18, label: "18:00 Dusk" },
              { h: 21, label: "21:00" },
              { h: 23, label: "23:00" },
            ].map((tick) => {
              const x = scaleX(tick.h);
              return (
                <g key={tick.h}>
                  <line
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={padT + plotH}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                    opacity="0.6"
                  />
                  <line
                    x1={x}
                    y1={padT + plotH}
                    x2={x}
                    y2={padT + plotH + 5}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padT + plotH + 18}
                    textAnchor="middle"
                    fill={tick.h === 12 ? "#F59E0B" : tick.h === 6 || tick.h === 18 ? "#E2E8F0" : "#94A3B8"}
                    fontSize="9.5"
                    fontFamily="var(--font-mono)"
                    fontWeight={tick.h === 12 ? "bold" : "normal"}
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {/* Axis Titles */}
            <text
              x={padL}
              y={padT - 9}
              textAnchor="start"
              fill="#F59E0B"
              fontSize="9"
              fontFamily="var(--font-mono)"
              letterSpacing="0.05em"
            >
              ▲ POWER (kW)
            </text>
            <text
              x={padL + plotW}
              y={padT - 9}
              textAnchor="end"
              fill="#10B981"
              fontSize="9"
              fontFamily="var(--font-mono)"
              letterSpacing="0.05em"
            >
              BATTERY SOC (%) ▲
            </text>

            {/* Risk overlays for storm/rain hours */}
            {hours.map((h, i) => {
              if (h.risk < 0.35) return null;
              const barW = Math.max(16, plotW / 24);
              return (
                <rect
                  key={i}
                  x={scaleX(i) - barW / 2}
                  y={padT}
                  width={barW}
                  height={plotH}
                  fill="#F43F5E"
                  opacity={h.risk * 0.28}
                  rx="3"
                >
                  <title>Heavy convective storm risk {Math.round(h.risk * 100)}%</title>
                </rect>
              );
            })}

            {/* Critical reserve threshold line (20% SoC / 7.5 kWh) */}
            <line
              x1={padL}
              y1={scaleSocY(0.1875)}
              x2={padL + plotW}
              y2={scaleSocY(0.1875)}
              stroke="#F43F5E"
              strokeDasharray="4 3"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />
            <rect
              x={padL + plotW - 195}
              y={scaleSocY(0.1875) - 18}
              width="190"
              height="16"
              fill="#1A0D14"
              stroke="#F43F5E"
              strokeWidth="0.8"
              rx="4"
              opacity="0.9"
            />
            <text
              x={padL + plotW - 100}
              y={scaleSocY(0.1875) - 6}
              textAnchor="middle"
              fill="#FDA4AF"
              fontSize="9"
              fontWeight="bold"
              fontFamily="var(--font-mono)"
            >
              CRITICAL 3H RESERVE (20% SoC)
            </text>

            {/* p10–p90 Solar Uncertainty Envelope */}
            <path d={uncertaintyPath} fill="url(#pvUncertaintyGrad)" />

            {/* Median (p50) Solar Line */}
            <path d={medianPvPath} fill="none" stroke="#F59E0B" strokeWidth="2.8" strokeLinecap="round" />

            {/* Village Demand Line (Dashed) */}
            <path
              d={demandPath}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.95"
            />

            {/* Battery SoC Curve (Emerald Terminal) */}
            <path
              d={socPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.95"
            />

            {/* Vertical Inspection Scrubber Needle */}
            <line
              x1={scaleX(selectedHour)}
              y1={padT - 4}
              x2={scaleX(selectedHour)}
              y2={padT + plotH + 4}
              stroke="url(#needleGrad)"
              strokeWidth="2"
            />

            {/* Interactive Data Nodes on Needle */}
            {/* 1. Solar Point */}
            <circle
              cx={scaleX(selectedHour)}
              cy={scaleKwY(currentHr.pv[1])}
              r="5"
              fill="#F59E0B"
              stroke="#0B0D13"
              strokeWidth="2"
            />
            {/* 2. Village Load Point */}
            <circle
              cx={scaleX(selectedHour)}
              cy={scaleKwY(currentHr.load[0])}
              r="4.5"
              fill="#FFFFFF"
              stroke="#0B0D13"
              strokeWidth="2"
            />
            {/* 3. Battery SoC Point */}
            <circle
              cx={scaleX(selectedHour)}
              cy={scaleSocY(currentHr.soc[1])}
              r="4.5"
              fill="#10B981"
              stroke="#0B0D13"
              strokeWidth="2"
            />
          </svg>

          {/* Interactive Range Slider aligned with chart plot area */}
          <div className="slider-container" style={{ paddingLeft: `${padL}px`, paddingRight: `${padR}px` }}>
            <input
              type="range"
              min={0}
              max={23}
              value={selectedHour}
              onChange={(e) => setSelectedHour(Number(e.target.value))}
              className="timeline-slider"
              aria-label="Scrub through 24 hour forecast"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="timeline-legend">
          <span className="leg-item">
            <i style={{ background: "#F59E0B", opacity: 0.35 }} /> p10–p90 Solar Uncertainty Envelope
          </span>
          <span className="leg-item">
            <i style={{ background: "#F59E0B", height: "3px" }} /> p50 Solar Forecast (kW)
          </span>
          <span className="leg-item">
            <i style={{ background: "#FFFFFF", height: "2px", borderTop: "2px dashed #FFFFFF" }} /> Village Demand (kW)
          </span>
          <span className="leg-item">
            <i style={{ background: "#10B981", height: "3px" }} /> Battery SoC Curve (%)
          </span>
          <span className="leg-item">
            <i style={{ background: "#F43F5E", height: "2px", borderTop: "2px dashed #F43F5E" }} /> 3-Hour Clinic Reserve
          </span>
          <span className="leg-item">
            <i style={{ background: "#F43F5E", opacity: 0.4 }} /> Storm / Rain Risk Window
          </span>
        </div>
      </section>

      {/* "What If?" Interactive Scenario Simulator */}
      <section className="what-if-section">
        <div className="what-if-header">
          <div>
            <h3 className="section-title flex items-center gap-2">
              <ZapIcon size={18} className="text-sun" />
              <span>Interactive «What-If?» Scenario Simulator</span>
            </h3>
            <p className="dim text-sm">
              Simulate load shifts, storage expansions, or dust accumulation in real time. Dispatches recalculate instantly.
            </p>
          </div>
          {whatIfActive && (
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => {
                setWhatIfActive(false);
                setWhatIfParams({
                  loadShiftHours: 0,
                  storageDeltaKwh: 0,
                  simulateDustLoss: false,
                });
              }}
            >
              Reset Simulation
            </button>
          )}
        </div>

        <div className="what-if-controls-grid">
          {/* 1. Shift Productive Loads */}
          <div className="control-card">
            <label className="control-label">
              1. Shift Agro-Processing Load: <b>{whatIfParams.loadShiftHours > 0 ? `+${whatIfParams.loadShiftHours}h (Midday)` : whatIfParams.loadShiftHours < 0 ? `${whatIfParams.loadShiftHours}h (Morning)` : "Unshifted"}</b>
            </label>
            <input
              type="range"
              min={-3}
              max={3}
              step={1}
              value={whatIfParams.loadShiftHours}
              onChange={(e) => {
                setWhatIfActive(true);
                setWhatIfParams((p) => ({ ...p, loadShiftHours: Number(e.target.value) }));
              }}
              className="slider-input"
            />
            <span className="control-caption">Move grain mill & water pump to peak sun window</span>
          </div>

          {/* 2. Battery Storage Expansion */}
          <div className="control-card">
            <label className="control-label">
              2. Add Battery Capacity: <b>+{whatIfParams.storageDeltaKwh} kWh</b>
            </label>
            <div className="btn-group">
              {[0, 5, 10, 20].map((kwh) => (
                <button
                  key={kwh}
                  type="button"
                  className={`btn-toggle-sm ${whatIfParams.storageDeltaKwh === kwh ? "active" : ""}`}
                  onClick={() => {
                    setWhatIfActive(true);
                    setWhatIfParams((p) => ({ ...p, storageDeltaKwh: kwh }));
                  }}
                >
                  +{kwh} kWh
                </button>
              ))}
            </div>
            <span className="control-caption">Evaluate resilience before procurement</span>
          </div>

          {/* 3. Panel Cleaning / Dust Derating */}
          <div className="control-card">
            <label className="control-label">
              3. Dust Soiling State: <b>{whatIfParams.simulateDustLoss ? "Dirty (-18% Loss)" : "Clean Panels"}</b>
            </label>
            <div className="btn-group">
              <button
                type="button"
                className={`btn-toggle-sm ${!whatIfParams.simulateDustLoss ? "active" : ""}`}
                onClick={() => {
                  setWhatIfActive(true);
                  setWhatIfParams((p) => ({ ...p, simulateDustLoss: false }));
                }}
              >
                Clean
              </button>
              <button
                type="button"
                className={`btn-toggle-sm ${whatIfParams.simulateDustLoss ? "active" : ""}`}
                onClick={() => {
                  setWhatIfActive(true);
                  setWhatIfParams((p) => ({ ...p, simulateDustLoss: true }));
                }}
              >
                Dust Soiled
              </button>
            </div>
            <span className="control-caption">Simulate harmattan sand accumulation</span>
          </div>
        </div>
      </section>

      {/* "Explain This Decision" Modal / Drawer */}
      {explainAct && (
        <div className="modal-backdrop" onClick={() => setExplainAct(null)}>
          <div className="modal-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Decision Explanation">
            <div className="drawer-header">
              <h3>Explain Decision: {explainAct.action.toUpperCase()}</h3>
              <button
                type="button"
                className="btn-ghost-sm"
                onClick={() => setExplainAct(null)}
                aria-label="Close explanation"
              >
                ✕
              </button>
            </div>

            <div className="drawer-body">
              <div className="explain-section">
                <h4>Recommendation Rationale</h4>
                <p className="explain-text">{explainAct.why}</p>
              </div>

              {explainAct.evidence && (
                <div className="evidence-grid">
                  <div className="evidence-item">
                    <span className="ev-label">Trigger Rule / Threshold</span>
                    <b className="ev-val">{explainAct.evidence.threshold}</b>
                  </div>
                  <div className="evidence-item">
                    <span className="ev-label">Sensor / NWP Observed Value</span>
                    <b className="ev-val">{explainAct.evidence.value}</b>
                  </div>
                  <div className="evidence-item">
                    <span className="ev-label">Conformal Coverage Guarantee</span>
                    <b className="ev-val accent-mist">{explainAct.evidence.conformalCoverage}</b>
                  </div>
                  <div className="evidence-item">
                    <span className="ev-label">Safety Override Guarantee</span>
                    <b className="ev-val accent-storm">Clinic ~3h Reserve Enforced</b>
                  </div>
                </div>
              )}

              <div className="explain-footer">
                <p className="dim text-xs">
                  Decisions are generated deterministically by the Site Brain dispatch policy and cannot override hard clinic safety reserves. Operators maintain ultimate manual override authority.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
