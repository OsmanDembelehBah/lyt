"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Locale, LOCALES, TRANSLATIONS } from "./i18n";

interface AppContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  lowData: boolean;
  setLowData: (v: boolean) => void;
  t: (typeof TRANSLATIONS)["en"];
  isReviewNeeded: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [lowData, setLowDataState] = useState<boolean>(false);

  useEffect(() => {
    // Check saved preferences
    try {
      const savedLoc = localStorage.getItem("lyt_locale") as Locale;
      if (savedLoc && LOCALES[savedLoc]) setLocaleState(savedLoc);
      
      const savedLowData = localStorage.getItem("lyt_low_data");
      if (savedLowData !== null) {
        setLowDataState(savedLowData === "true");
      } else {
        // Auto-detect slow connections (Save-Data header or slow downlink)
        const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
        if (conn?.saveData || conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") {
          setLowDataState(true);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("lyt_locale", l);
    } catch {
      // Ignore
    }
  };

  const setLowData = (v: boolean) => {
    setLowDataState(v);
    try {
      localStorage.setItem("lyt_low_data", String(v));
    } catch {
      // Ignore
    }
  };

  const t = (TRANSLATIONS[locale] || TRANSLATIONS.en) as (typeof TRANSLATIONS)["en"];
  const isReviewNeeded = LOCALES[locale]?.needsReview ?? false;

  return (
    <AppContext.Provider value={{ locale, setLocale, lowData, setLowData, t, isReviewNeeded }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
}
