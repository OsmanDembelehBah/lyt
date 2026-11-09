"use client";

import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { MapAtlas } from "./components/MapAtlas";
import { TimeScrubber } from "./components/TimeScrubber";
import { HubData, Layer, LAYERS, loadAtlas, summary, getLayerHeadline } from "./atlas";
import { useApp } from "./context";
import {
  SunIcon,
  CloudRainIcon,
  ActivityIcon,
  DustIcon,
  SatelliteIcon,
  AlertTriangleIcon,
  FileTextIcon,
  CompassIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "./components/Icons";

export default function AtlasPage() {
  const { t } = useApp();
  const [data, setData] = useState<HubData[] | null>(null);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [layer, setLayer] = useState<Layer>("rain");
  const [dayIndex, setDayIndex] = useState<number>(0);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchForecasts = () => {
      loadAtlas()
        .then((hubs) => {
          if (!active) return;
          setData(hubs);
          setError(false);
          setLastUpdated(Date.now());
          setSelectedHubId((prev) => prev ?? hubs[0].id);
        })
        .catch((err) => {
          console.error("Atlas load error", err);
          if (active) setError(true);
        });
    };

    fetchForecasts();
    const interval = setInterval(fetchForecasts, 1800000); // 30 mins
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const regionalSummary = data ? summary(data, dayIndex) : null;
  const days = data?.[0]?.days ?? [];
  const layerHeadline = data ? getLayerHeadline(data, dayIndex, layer) : null;

  const statusBadge = (
    <span
      className={`pill-badge ${error ? "retry" : data ? "live" : "loading"}`}
      role="status"
    >
      <i className="pulse-dot" />
      {error
        ? "Weather Offline"
        : data
        ? `Live NWP & NASA GIBS · ${new Date(lastUpdated).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "Loading..."}
    </span>
  );

  const renderLayerChipIcon = (key: Layer) => {
    switch (key) {
      case "sun":
        return <SunIcon size={14} />;
      case "rain":
        return <CloudRainIcon size={14} />;
      case "heat":
        return <ActivityIcon size={14} />;
      case "dust":
        return <DustIcon size={14} />;
      case "satellite":
        return <SatelliteIcon size={14} />;
    }
  };

  return (
    <main className="app-main">
      <Header statusBadge={statusBadge} />

      {error && !data && (
        <div className="error-banner" role="alert">
          <p className="flex items-center gap-2">
            <AlertTriangleIcon size={16} className="text-[var(--heat)]" />
            <span>Unable to connect to numerical weather prediction services. Please check network connection.</span>
          </p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      )}

      {!data && !error && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading West Africa regional satellite & NWP forecasts...</p>
        </div>
      )}

      {data && regionalSummary && layerHeadline && (
        <>
          {/* Section 7.A: Headline following selected layer in three parts:
              1. What is happening? 2. Why does it matter? 3. What should I do? */}
          <section className="headline-section mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className={`pill-badge badge-${layerHeadline.badgeTone} font-mono text-xs font-bold`}>
                  {layerHeadline.badge}
                </span>
                <span className="text-xs text-[var(--sand-dim)] font-mono">
                  {layer === "satellite"
                    ? "NASA GPM IMERG 10km Satellite Observation"
                    : "West Africa Multi-Model Forecast (ECMWF & GFS)"}
                </span>
              </div>

              {/* Metric Layer Chips */}
              <div className="layer-chips" role="group" aria-label="Regional Map Layers">
                {(Object.keys(LAYERS) as Layer[]).map((lKey) => {
                  const l = LAYERS[lKey];
                  const isActive = layer === lKey;
                  return (
                    <button
                      key={lKey}
                      type="button"
                      className={`layer-chip ${isActive ? "active" : ""}`}
                      onClick={() => setLayer(lKey)}
                      aria-pressed={isActive}
                      style={{ ["--chip-color" as string]: l.color }}
                    >
                      <span className="chip-icon">{renderLayerChipIcon(lKey)}</span>
                      <span className="chip-label">{l.label}</span>
                      <span className="chip-unit">({l.unit})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3-Part Layer Headline Box */}
            <div className="layer-headline-card">
              <div className="headline-grid">
                {/* 1. What is happening? */}
                <div className="headline-part happening">
                  <div className="headline-part-kicker text-[var(--sun)]">
                    <SparklesIcon size={13} />
                    <span>1. What is happening?</span>
                  </div>
                  <h1 className="regional-headline">
                    {layerHeadline.happening}
                  </h1>
                </div>

                {/* 2. Why does it matter? */}
                <div className="headline-part matters">
                  <div className="headline-part-kicker text-[var(--mist)]">
                    <ActivityIcon size={13} />
                    <span>2. Why does it matter?</span>
                  </div>
                  <p className="headline-text">
                    {layerHeadline.why}
                  </p>
                </div>

                {/* 3. What to do? */}
                <div className="headline-part action">
                  <div className="headline-part-kicker text-[var(--rain)]">
                    <CheckCircleIcon size={13} />
                    <span>3. What should I do?</span>
                  </div>
                  <div className="headline-action-box">
                    {layerHeadline.action}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Map First Layout (Section 7.A: map sits in the top fold) */}
          <section className="map-primary-section mb-6" aria-label="Interactive Regional Atlas">
            <MapAtlas
              data={data}
              selectedHubId={selectedHubId}
              onSelectHub={setSelectedHubId}
              dayIndex={dayIndex}
              layer={layer}
            />
          </section>

          {/* Time Scrubber & Celestial Sun Arc beneath the map */}
          <section className="scrubber-beneath-section mb-8" aria-label="5-Day Outlook Scrubber">
            <TimeScrubber
              days={days}
              selectedDayIndex={dayIndex}
              onSelectDay={setDayIndex}
              peakYield={regionalSummary.bestHubYield}
            />
          </section>

          {/* Policy Alignment & Methodology Accordion */}
          <details className="policy-accordion">
            <summary className="policy-summary flex items-center gap-2">
              <FileTextIcon size={16} className="text-[var(--mist)]" />
              <span>Verified Policy Alignment & Scientific Data Attribution</span>
            </summary>
            <div className="policy-content space-y-3 text-xs text-[var(--sand-dim)] leading-relaxed">
              <p>
                <b className="text-[var(--sand-bright)]">ECOWAS Renewable Energy Policy (EREP):</b> Directly operationalizes regional mandates for 48% renewable electricity mix and 25% rural population served by mini-grids by 2030 through place-specific solar forecasting and clinical load protection.
              </p>
              <p>
                <b className="text-[var(--sand-bright)]">ECOWAS Energy Efficiency Policy:</b> Reduces mini-grid system distribution losses (currently regional average 35–40%, target &lt;10%) by detecting panel soiling degradation in real time and scheduling heavy daytime agricultural loads.
              </p>
              <p>
                <b className="text-[var(--sand-bright)]">Data Attribution & Licensing:</b> Satellite-derived estimates from NASA and EUMETSAT products (NASA GPM IMERG v07B via GIBS WMTS). Numerical weather prediction via Open-Meteo Weather API (CC-BY 4.0). Atmospheric aerosol density from Copernicus Atmosphere Monitoring Service (CAMS). Hydrological runoff via GloFAS v4.0. Cultural boundaries from Natural Earth Public Domain.
              </p>
              <p className="dim italic">
                *Notice: Regional risk thresholds (60 mm/day rain, 400 µg/m³ dust, 34–42°C heat) are operational advisory guidelines for mini-grid load scheduling and are not a substitute for official national meteorological agency warnings.
              </p>
            </div>
          </details>
        </>
      )}
    </main>
  );
}
