"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useApp } from "../context";
import { LOCALES, Locale } from "../i18n";
import {
  AlertTriangleIcon,
  ZapIcon,
  GlobeIcon,
  LayersIcon,
  ActivityIcon,
  SlidersIcon,
  LeafIcon,
  BrainIcon,
  ShieldCheckIcon,
  TerminalIcon,
  CompassIcon,
} from "./Icons";

export interface HeaderProps {
  statusBadge?: React.ReactNode;
}

export function Header({ statusBadge }: HeaderProps) {
  const pathname = usePathname();
  const { locale, setLocale, lowData, setLowData, t, isReviewNeeded } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4 Primary Nav Items (Section 9: reduce 8-item nav to 4 primary + More)
  const primaryNavItems = [
    { href: "/", label: "Atlas", icon: <LayersIcon size={15} /> },
    { href: "/p/fna", label: "Place Passport", icon: <CompassIcon size={15} /> },
    { href: "/site", label: "Site Brain", icon: <ActivityIcon size={15} /> },
    { href: "/agent", label: "Ask Layt", icon: <TerminalIcon size={15} />, isLive: true },
  ];

  // Secondary Modules under "More"
  const secondaryNavItems = [
    { href: "/trust", label: "Trust Scoreboard", desc: "Forecast vs satellite calibration", icon: <BrainIcon size={15} /> },
    { href: "/console", label: "Operator Console", desc: "Telemetry alerts & maintenance", icon: <ShieldCheckIcon size={15} /> },
    { href: "/community", label: "Community Dispatch", desc: "SMS, USSD & WhatsApp dispatch", icon: <GlobeIcon size={15} /> },
    { href: "/planner", label: "Siting Planner", desc: "Regional electrification ranking", icon: <SlidersIcon size={15} /> },
    { href: "/impact", label: "Impact Ledger", desc: "Emissions displaced & avoided diesel", icon: <LeafIcon size={15} /> },
  ];

  const isMoreActive = secondaryNavItems.some((item) => pathname === item.href);

  return (
    <>
      {isReviewNeeded && (
        <aside className="review-banner" role="alert" aria-live="polite">
          <span className="review-badge flex items-center gap-2">
            <AlertTriangleIcon size={13} className="text-[#082725]" />
            Native Review Flag
          </span>
          <span className="review-notice-text">{t.reviewNotice}</span>
        </aside>
      )}

      <header className="global-header">
        <div className="header-brand">
          <Link href="/" className="logo-text" aria-label="Layt Home">
            Layt<span className="logo-dot">·</span>
          </Link>
          <span className="brand-badge hide-mobile">West Africa</span>
        </div>

        {/* Desktop 4-Item Primary Nav + More Popover */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <div className="nav-pill-track">
            {primaryNavItems.map((item) => {
              const active = pathname === item.href || (item.href === "/p/fna" && pathname.startsWith("/p"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "active" : ""} ${item.isLive ? "nav-link-agent" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.isLive && <span className="nav-agent-pulse" title="Live Grounded Agent" />}
                </Link>
              );
            })}

            {/* "More" Dropdown Menu */}
            <div className="nav-more-wrapper" ref={moreRef}>
              <button
                type="button"
                className={`nav-link nav-more-btn ${isMoreActive ? "active" : ""}`}
                onClick={() => setMoreOpen(!moreOpen)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
              >
                <span className="nav-icon"><SlidersIcon size={14} /></span>
                <span className="nav-label">More</span>
                <span className={`chevron ${moreOpen ? "open" : ""}`}>▾</span>
              </button>

              {moreOpen && (
                <div className="more-dropdown-panel" role="menu">
                  {secondaryNavItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`more-dropdown-item ${active ? "active" : ""}`}
                        onClick={() => setMoreOpen(false)}
                        role="menuitem"
                      >
                        <span className="more-item-icon">{item.icon}</span>
                        <div className="more-item-text">
                          <span className="more-item-label">{item.label}</span>
                          <span className="more-item-desc">{item.desc}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Global Header Actions: Live Status, Low Data Mode, Language */}
        <div className="header-actions">
          {statusBadge && <div className="status-badge-wrapper">{statusBadge}</div>}

          <button
            type="button"
            className={`btn-pill data-saver ${lowData ? "active" : ""}`}
            onClick={() => setLowData(!lowData)}
            title={lowData ? t.lowData.active : "Toggle low-data mode"}
            aria-pressed={lowData}
          >
            <ZapIcon size={13} className="btn-icon" />
            <span className="hide-mobile">{t.lowData.toggle}</span>
          </button>

          <div className="lang-picker">
            <label htmlFor="lang-select" className="sr-only">
              Select Language
            </label>
            <select
              id="lang-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="lang-select"
            >
              {(Object.keys(LOCALES) as Locale[]).map((loc) => (
                <option key={loc} value={loc}>
                  {LOCALES[loc].flag} {LOCALES[loc].label}
                  {LOCALES[loc].needsReview ? " *" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Section 9: thumb-reachable, 44px min tap targets) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation Bar">
        {primaryNavItems.map((item) => {
          const active = pathname === item.href || (item.href === "/p/fna" && pathname.startsWith("/p"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-tab-item ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="mobile-tab-icon">{item.icon}</span>
              <span className="mobile-tab-label">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`mobile-tab-item ${isMoreActive || mobileDrawerOpen ? "active" : ""}`}
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open More modules"
        >
          <span className="mobile-tab-icon"><SlidersIcon size={16} /></span>
          <span className="mobile-tab-label">More</span>
        </button>
      </nav>

      {/* Mobile Bottom Sheet Drawer for "More" */}
      {mobileDrawerOpen && (
        <div className="mobile-drawer-overlay" role="dialog" aria-modal="true" aria-label="More Features">
          <div className="drawer-backdrop" onClick={() => setMobileDrawerOpen(false)} />
          <div className="drawer-sheet-content">
            <div className="drawer-sheet-handle" />
            <div className="drawer-sheet-header">
              <span className="drawer-sheet-title">More Platform Features</span>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul className="drawer-sheet-list">
              {secondaryNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`drawer-sheet-link ${active ? "active" : ""}`}
                      onClick={() => setMobileDrawerOpen(false)}
                    >
                      <span className="drawer-item-icon">{item.icon}</span>
                      <div className="drawer-item-info">
                        <span className="drawer-item-title">{item.label}</span>
                        <span className="drawer-item-desc">{item.desc}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
