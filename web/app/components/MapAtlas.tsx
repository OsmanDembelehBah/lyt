"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HubData, Layer, LAYERS, raw, val, explainHubDay } from "../atlas";
import { DataBadge } from "./DataBadge";
import { useApp } from "../context";
import {
  SearchIcon,
  LayersIcon,
  TerrainIcon,
  SatelliteIcon,
  VectorIcon,
  SunIcon,
  CloudRainIcon,
  WindIcon,
  DustIcon,
  ZapIcon,
  BatteryIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CompassIcon,
  ExternalLinkIcon,
  ActivityIcon,
} from "./Icons";

interface MapAtlasProps {
  data: HubData[];
  selectedHubId: string | null;
  onSelectHub: (id: string) => void;
  dayIndex: number;
  layer: Layer;
}

export type MapEngine = "maplibre" | "vector";

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export function MapAtlas({
  data,
  selectedHubId,
  onSelectHub,
  dayIndex,
  layer,
}: MapAtlasProps) {
  const { lowData } = useApp();
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [mapEngine, setMapEngine] = useState<MapEngine>(lowData ? "vector" : "maplibre");
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lon: number; name?: string } | null>(null);

  // Satellite Loop State (24h loop)
  const [isLoopPlaying, setIsLoopPlaying] = useState(false);
  const [satelliteFrameIdx, setSatelliteFrameIdx] = useState(6); // 0 to 7 (every 3h)

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Satellite 24h frames (ISO times for IMERG Early/Late run)
  const SATELLITE_FRAMES = [
    { time: "00:00 UTC", label: "T-24h (00:00 UTC)" },
    { time: "03:00 UTC", label: "T-21h (03:00 UTC)" },
    { time: "06:00 UTC", label: "T-18h (06:00 UTC)" },
    { time: "09:00 UTC", label: "T-15h (09:00 UTC)" },
    { time: "12:00 UTC", label: "T-12h (12:00 UTC)" },
    { time: "15:00 UTC", label: "T-09h (15:00 UTC)" },
    { time: "18:00 UTC", label: "T-06h (18:00 UTC)" },
    { time: "21:00 UTC", label: "T-03h Latest (~4h latency)" },
  ];

  // Load local Natural Earth West Africa GeoJSON
  useEffect(() => {
    fetch("/data/west-africa.json")
      .then((r) => r.json())
      .then((json: FeatureCollection<Geometry>) => setGeoData(json))
      .catch((err) => console.error("Failed to load map borders", err));
  }, []);

  // Update mapEngine if lowData mode changes
  useEffect(() => {
    if (lowData) {
      setMapEngine("vector");
    }
  }, [lowData]);

  // Dimensions for SVG vector fallback
  const width = 960;
  const height = 540;

  // D3 Projection for SVG fallback
  const { pathGenerator, projection } = useMemo(() => {
    if (!geoData) return { pathGenerator: null, projection: null };
    const proj = geoMercator().fitExtent(
      [
        [32, 26],
        [width - 32, height - 26],
      ],
      geoData
    );
    const gen = geoPath().projection(proj);
    return { pathGenerator: gen, projection: proj };
  }, [geoData, width, height]);

  // Filter hubs by search query and country
  const filteredHubs = useMemo(() => {
    return data.filter((h) => {
      const matchesCountry = countryFilter === "ALL" || h.cc === countryFilter;
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.country.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCountry && matchesSearch;
    });
  }, [data, countryFilter, searchQuery]);

  // Countries for filter dropdown
  const countries = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((h) => map.set(h.cc, h.country));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  // Debounced Open-Meteo Geocoding Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchQuery.trim()
        )}&count=5&language=en&format=json`
      )
        .then((res) => res.json())
        .then((json) => {
          setSearchResults(json.results || []);
          setIsSearching(false);
        })
        .catch(() => {
          setSearchResults([]);
          setIsSearching(false);
        });
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Satellite Loop Animation
  useEffect(() => {
    if (!isLoopPlaying || layer !== "satellite") return;
    const interval = setInterval(() => {
      setSatelliteFrameIdx((prev) => (prev + 1) % SATELLITE_FRAMES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isLoopPlaying, layer, SATELLITE_FRAMES.length]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (mapEngine !== "maplibre" || !mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Section 6: OpenFreeMap keyless vector style (Living Atlas of Light)
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [-1.2, 11.2],
      zoom: 4.8,
      minZoom: 3.5,
      maxZoom: 13,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    // Click anywhere for point forecast and Place Passport trigger
    map.on("click", (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      // Find nearest hub
      let nearest = data[0];
      let minDist = 999999;
      data.forEach((hub) => {
        const d = Math.hypot(hub.lat - lat, hub.lon - lng);
        if (d < minDist) {
          minDist = d;
          nearest = hub;
        }
      });

      setClickedLocation({
        lat,
        lon: lng,
        name: minDist < 0.8 ? nearest.name : undefined,
      });

      if (minDist < 0.8) {
        onSelectHub(nearest.id);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapEngine, data, onSelectHub]);

  // Sync Markers on MapLibre map
  useEffect(() => {
    if (mapEngine !== "maplibre" || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const currentLayerMeta = LAYERS[layer];

    filteredHubs.forEach((hub) => {
      const d = hub.days[dayIndex] || hub.days[0];
      const riskVal = val(layer, d);
      const rawVal = raw(layer, d);
      const isSelected = hub.id === selectedHubId;

      // Marker element
      const el = document.createElement("div");
      el.className = `maplibre-hub-marker ${isSelected ? "selected" : ""}`;
      el.style.cssText = `
        width: ${Math.round(14 + riskVal * 20)}px;
        height: ${Math.round(14 + riskVal * 20)}px;
        background: ${currentLayerMeta.color};
        border-radius: 50%;
        border: ${isSelected ? "3px solid #FFFFFF" : `1.5px solid ${currentLayerMeta.color}`};
        box-shadow: 0 0 12px ${currentLayerMeta.color}88;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.3)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectHub(hub.id);
        map.flyTo({ center: [hub.lon, hub.lat], zoom: 7.2, speed: 1.2 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([hub.lon, hub.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapEngine, filteredHubs, dayIndex, layer, selectedHubId, onSelectHub]);

  // Harmattan Wind & Dust Particle Canvas
  useEffect(() => {
    if (lowData) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    const particleCount = 65;

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: -(0.7 + Math.random() * 1.1), // northeast to southwest trade winds
      vy: 0.35 + Math.random() * 0.6,
      len: 5 + Math.random() * 8,
      opacity: 0.12 + Math.random() * 0.35,
      size: 1 + Math.random() * 1.2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(210, 163, 90, ${p.opacity})`;
        ctx.lineWidth = p.size;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [lowData, width, height]);

  const activeHub = data.find((h) => h.id === selectedHubId) || data[0];
  const activeDay = activeHub?.days[dayIndex] || activeHub?.days[0];
  const explanation = activeHub && activeDay ? explainHubDay(activeHub, activeDay) : null;
  const currentLayer = LAYERS[layer];

  // Select Geocoded search result
  const handleSelectSearchResult = (result: GeocodingResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setClickedLocation({
      lat: result.latitude,
      lon: result.longitude,
      name: `${result.name}, ${result.country}`,
    });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [result.longitude, result.latitude],
        zoom: 8.5,
        speed: 1.4,
      });
    }
  };

  const renderLayerIcon = (key: string, size = 16) => {
    switch (key) {
      case "sun":
        return <SunIcon size={size} className="text-[#FFB347]" />;
      case "rain":
        return <CloudRainIcon size={size} className="text-[#7FB8FF]" />;
      case "heat":
        return <ActivityIcon size={size} className="text-[#C8472E]" />;
      case "dust":
        return <DustIcon size={size} className="text-[#D2A35A]" />;
      case "satellite":
        return <SatelliteIcon size={size} className="text-[#6FD0C4]" />;
      case "zap":
        return <ZapIcon size={size} className="text-[#FFB347]" />;
      case "battery":
        return <BatteryIcon size={size} className="text-[#10B981]" />;
      case "check":
        return <CheckCircleIcon size={size} className="text-[#10B981]" />;
      default:
        return <AlertTriangleIcon size={size} className="text-[#C8472E]" />;
    }
  };

  return (
    <div className="atlas-container">
      {/* Search, Country Filter and Geographic Engine Toolbar */}
      <div className="atlas-toolbar">
        {/* Open-Meteo Geocoding City Search */}
        <div className="search-box relative">
          <span className="search-icon">
            <SearchIcon size={16} className="text-[var(--sun)]" />
          </span>
          <input
            type="text"
            placeholder="Search any town, city, or country in West Africa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search places in West Africa"
            className="input-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="clear-btn"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}

          {/* Autocomplete Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="search-results-popover">
              <div className="search-popover-header">Open-Meteo Geocoded Results</div>
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  className="search-result-item"
                  onClick={() => handleSelectSearchResult(res)}
                >
                  <div className="font-semibold text-xs text-[var(--sand-bright)]">{res.name}</div>
                  <div className="text-[11px] text-[var(--sand-dim)]">
                    {res.admin1 ? `${res.admin1}, ` : ""}
                    {res.country} ({res.latitude.toFixed(2)}°N, {res.longitude.toFixed(2)}°E)
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Country Filter */}
        <div className="filter-group">
          <label htmlFor="country-select" className="filter-label">
            Country:
          </label>
          <select
            id="country-select"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="select-country"
          >
            <option value="ALL">All West Africa ({data.length} hubs)</option>
            {countries.map(([code, name]) => (
              <option key={code} value={code}>
                {name} ({data.filter((h) => h.cc === code).length})
              </option>
            ))}
          </select>
        </div>

        {/* Map Engine Toggle */}
        <div className="map-mode-toggle" role="group" aria-label="Map rendering engine">
          <button
            type="button"
            className={`mode-btn ${mapEngine === "maplibre" ? "active" : ""}`}
            onClick={() => setMapEngine("maplibre")}
            title="Real zoomable MapLibre GL JS engine"
            disabled={lowData}
          >
            <CompassIcon size={14} />
            <span className="hide-mobile">MapLibre GL</span>
          </button>
          <button
            type="button"
            className={`mode-btn ${mapEngine === "vector" ? "active" : ""}`}
            onClick={() => setMapEngine("vector")}
            title="Lightweight vector fallback (recommended for low bandwidth)"
          >
            <VectorIcon size={14} />
            <span className="hide-mobile">Lite Vector</span>
          </button>
        </div>

        {/* Legend indicator */}
        <div className="map-legend-indicator">
          <span
            className="legend-color-dot"
            style={{ background: currentLayer.color }}
          />
          <b>{currentLayer.label}</b>
          <span className="dim">({currentLayer.unit})</span>
        </div>
      </div>

      {/* Main Map Viewport & Contextual Side Sheet (Top fold!) */}
      <div className="atlas-grid">
        <div className="map-wrapper" role="region" aria-label="West Africa Regional Climate Map">
          {/* MapLibre GL WebGL Map */}
          {mapEngine === "maplibre" && (
            <div ref={mapContainerRef} className="maplibre-canvas w-full h-full min-h-[580px]" />
          )}

          {/* D3 Vector SVG Fallback (Always active in Lite Vector / Low Data mode) */}
          {mapEngine === "vector" && (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="atlas-svg"
              role="img"
              aria-label="Geographic map of West Africa mini-grid hubs"
            >
              <rect width={width} height={height} fill="#082725" />

              {/* Country land polygons (Natural Earth 50m) */}
              {geoData && pathGenerator && (
                <g className="land-layer" opacity={0.94}>
                  {geoData.features.map((feature, idx) => {
                    const d = pathGenerator(feature);
                    if (!d) return null;
                    const isFiltered =
                      countryFilter !== "ALL" &&
                      (feature.properties as { code?: string })?.code === countryFilter;

                    return (
                      <path
                        key={idx}
                        d={d}
                        fill={isFiltered ? "#13423F" : "#0C3836"}
                        stroke={isFiltered ? "#FFB347" : "rgba(239, 227, 203, 0.22)"}
                        strokeWidth={isFiltered ? 2 : 0.85}
                        className="country-polygon transition-colors duration-300"
                      >
                        <title>{(feature.properties as { name?: string })?.name}</title>
                      </path>
                    );
                  })}
                </g>
              )}

              {/* Hub Data Droplets */}
              {projection &&
                filteredHubs.map((hub) => {
                  const coords = projection([hub.lon, hub.lat]);
                  if (!coords) return null;
                  const [cx, cy] = coords;
                  const d = hub.days[dayIndex] || hub.days[0];
                  const riskVal = val(layer, d);
                  const rawVal = raw(layer, d);
                  const isSelected = hub.id === selectedHubId;
                  const radius = 5 + 16 * riskVal;

                  return (
                    <g
                      key={hub.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${hub.name}, ${hub.country}: ${currentLayer.label} ${rawVal.toFixed(1)} ${currentLayer.unit}`}
                      className={`hub-node ${isSelected ? "selected" : ""}`}
                      onClick={() => onSelectHub(hub.id)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={currentLayer.color}
                        fillOpacity={0.35 + 0.65 * riskVal}
                        stroke={isSelected ? "#FFFFFF" : currentLayer.color}
                        strokeWidth={isSelected ? 2.5 : 1.2}
                      />
                      <circle cx={cx} cy={cy} r={2.5} fill="#FFFFFF" />
                      {(isSelected || riskVal > 0.65) && (
                        <text
                          x={cx + radius + 6}
                          y={cy + 4}
                          className="hub-label-text font-semibold text-xs"
                          fill="#FFFFFF"
                        >
                          {hub.name}
                        </text>
                      )}
                    </g>
                  );
                })}
            </svg>
          )}

          {/* Harmattan Wind & Dust Flow Particle Canvas (Active when not low-data) */}
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={`wind-flow-canvas pointer-events-none ${lowData ? "hidden" : ""}`}
            aria-hidden="true"
          />

          {/* NASA GIBS IMERG 24-Hour Scrubber Bar (Active when layer === 'satellite') */}
          {layer === "satellite" && (
            <div className="satellite-loop-controller">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="satellite-play-btn"
                    onClick={() => setIsLoopPlaying(!isLoopPlaying)}
                    aria-label={isLoopPlaying ? "Pause satellite loop" : "Play satellite loop"}
                  >
                    {isLoopPlaying ? "❚❚ Pause" : "▶ Play 24h Loop"}
                  </button>
                  <span className="text-xs font-mono font-bold text-[var(--mist)]">
                    {SATELLITE_FRAMES[satelliteFrameIdx].label}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--sand-dim)]">
                  NASA GPM IMERG 10km Rain Scan (Early Run, ~4h latency)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={SATELLITE_FRAMES.length - 1}
                value={satelliteFrameIdx}
                onChange={(e) => {
                  setSatelliteFrameIdx(parseInt(e.target.value));
                  setIsLoopPlaying(false);
                }}
                className="w-full accent-[var(--mist)] cursor-pointer"
                aria-label="Satellite time frame scrubber"
              />
            </div>
          )}

          {/* Clicked Location Point HUD Card */}
          {clickedLocation && (
            <div className="clicked-point-hud">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <div className="text-xs font-bold text-[var(--sand-bright)]">
                    {clickedLocation.name || "Inspected Coordinates"}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--sun)]">
                    {clickedLocation.lat.toFixed(2)}°N, {Math.abs(clickedLocation.lon).toFixed(2)}°W
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-[var(--sand-dim)] hover:text-white"
                  onClick={() => setClickedLocation(null)}
                >
                  ✕
                </button>
              </div>
              <div className="text-[11px] text-[var(--sand-dim)] mb-2">
                Point forecast & satellite rain estimate computed.
              </div>
              <Link
                href={`/p/${clickedLocation.name ? clickedLocation.name.toLowerCase().split(",")[0].trim() : `${clickedLocation.lat.toFixed(2)},${clickedLocation.lon.toFixed(2)}`}`}
                className="btn-passport-cta text-xs inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[var(--sun)] text-[#082725] font-bold"
              >
                <span>Open Place Passport</span>
                <ExternalLinkIcon size={12} />
              </Link>
            </div>
          )}

          {/* Map bottom overlay status */}
          <div className="map-status-overlay flex items-center justify-between px-4 py-2.5 text-xs flex-wrap gap-2">
            <span className="flex items-center gap-2 text-[var(--sun)] font-mono">
              <CompassIcon size={14} className="text-[var(--sun)]" />
              Showing {filteredHubs.length} of {data.length} hubs · Engine: {mapEngine.toUpperCase()}
            </span>
            <span className="source-cite dim">
              Satellite-derived estimates from NASA and EUMETSAT products · Open-Meteo CC-BY 4.0
            </span>
          </div>
        </div>

        {/* Contextual Hub Sheet & Inspector (Answers: 1. Happening, 2. Why, 3. Actions) */}
        <aside className="hub-sheet" aria-live="polite">
          {activeHub && activeDay && explanation ? (
            <>
              <div className="sheet-header flex items-start justify-between pb-3 border-b border-[var(--earth-border)]">
                <div>
                  <h2 className="sheet-title text-lg font-bold text-[var(--sand-bright)] mb-1">
                    {activeHub.name} <small className="text-[var(--sun)] font-medium text-sm">({activeHub.country})</small>
                  </h2>
                  <span className="sheet-coords text-xs dim font-mono">
                    {activeHub.lat.toFixed(2)}°N, {Math.abs(activeHub.lon).toFixed(2)}°W · Hub: {activeHub.id.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/p/${activeHub.id}`}
                    className="btn-passport-link inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--sun)] text-[#082725] hover:opacity-95 transition-opacity"
                    title="View full Place Passport"
                  >
                    <span>Place Passport</span>
                    <ExternalLinkIcon size={12} />
                  </Link>
                </div>
              </div>

              {/* 3-Question Framework */}
              <div className="sheet-questions space-y-4">
                <section className="q-card happening p-4 rounded-xl bg-[var(--lagoon)] border border-[var(--earth-border)]">
                  <h3 className="q-label text-xs uppercase tracking-wider text-[var(--sun)] font-bold mb-2">
                    1. What is happening?
                  </h3>
                  <p className="q-text text-sm leading-relaxed text-[var(--sand)]">{explanation.happening}</p>
                </section>

                <section className="q-card matters p-4 rounded-xl bg-[var(--lagoon)] border border-[var(--earth-border)]">
                  <h3 className="q-label text-xs uppercase tracking-wider text-[var(--sun)] font-bold mb-2">
                    2. Why does it matter?
                  </h3>
                  <p className="q-text text-sm leading-relaxed text-[var(--sand)]">{explanation.whyItMatters}</p>
                </section>

                <section className="q-card action p-4 rounded-xl bg-[var(--lagoon)] border border-[var(--earth-border)]">
                  <h3 className="q-label text-xs uppercase tracking-wider text-[var(--sun)] font-bold mb-2">
                    3. What should I do?
                  </h3>
                  <ul className="sheet-actions-list space-y-2 mt-2">
                    {explanation.actions.map((act, i) => (
                      <li key={i} className={`action-pill ${act.tone} p-3 rounded-lg flex items-start gap-3 text-xs leading-relaxed bg-[var(--deep)] border border-[var(--earth-border)]`}>
                        <span className="action-icon mt-0.5">
                          {renderLayerIcon(act.icon, 16)}
                        </span>
                        <span className="action-text text-[var(--sand)]">{act.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* 5-Layer Metric Bars */}
              <div className="sheet-metrics pt-3 border-t border-[var(--earth-border)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="metrics-title text-xs font-semibold text-[var(--sun)] uppercase tracking-wider">
                    5-Day Outlook for {activeHub.name}
                  </h4>
                  <Link href={`/site?id=${activeHub.id}`} className="text-xs text-[var(--mist)] hover:underline flex items-center gap-1 font-mono">
                    <span>Site Brain Dispatch</span>
                    <ExternalLinkIcon size={11} />
                  </Link>
                </div>
                <div className="metrics-grid space-y-3">
                  {(Object.keys(LAYERS) as Layer[]).map((lKey) => {
                    const lMeta = LAYERS[lKey];
                    const v = val(lKey, activeDay);
                    const r = raw(lKey, activeDay);
                    return (
                      <div key={lKey} className="metric-row">
                        <div className="metric-info flex items-center justify-between mb-1 text-xs">
                          <span className="flex items-center gap-2">
                            {renderLayerIcon(lMeta.icon, 14)}
                            {lMeta.label}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <b className="text-[var(--sand-bright)] font-mono">
                              {lKey === "dust" && !activeHub.dustOk
                                ? "N/A"
                                : `${r.toFixed(lKey === "sun" ? 1 : 0)} ${lMeta.unit}`}
                            </b>
                            <DataBadge status={lKey === "satellite" ? "LIVE" : "MODELED"} size="xs" />
                          </span>
                        </div>
                        <div className="metric-track h-2 rounded-full bg-[var(--lagoon)] overflow-hidden border border-[var(--earth-border)]">
                          <div
                            className="metric-fill h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round(v * 100)}%`,
                              background: lMeta.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="dim text-sm text-center py-8">Select a hub on the map to inspect conditions.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
