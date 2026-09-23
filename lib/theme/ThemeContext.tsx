"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

/**
 * Version A theming. "light" is the untouched existing theme and stays
 * the default — no stored preference means light. "dark-v4" ("Graphite &
 * Emerald", docs/revenueos-version-a-dark-mode-v4.md) is the single
 * accepted dark theme, selected via app/globals.css's
 * `:root[data-theme="dark-v4"]` block. Three earlier dark candidates
 * (dark-v1/v2/v3, see docs/revenueos-version-a-dark-mode-ab-brief.md and
 * docs/revenueos-version-a-dark-mode-v3-proposed.md for that A/B process)
 * were removed from the application once dark-v4 was accepted — see git
 * history for that milestone.
 */
export type ThemeName = "light" | "dark-v4";

const STORAGE_KEY = "revenueos.theme";
const THEMES: ThemeName[] = ["light", "dark-v4"];

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeName) {
  // Light is the implicit default (no attribute) rather than
  // data-theme="light" — matches how app/globals.css's base :root already
  // IS the light theme, with dark variants layered on via an attribute
  // selector. Keeps the DOM clean for the common case.
  if (theme === "light") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("light");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && THEMES.includes(stored as ThemeName)) {
        setThemeState(stored as ThemeName);
        applyTheme(stored as ThemeName);
      }
    } catch {
      // localStorage unavailable — falls back to light, same as the
      // anti-flicker inline script in app/layout.tsx.
    }
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Theme choice just won't survive a refresh this session.
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() must be used within a ThemeProvider");
  return ctx;
}

/**
 * Inline script source, rendered in app/layout.tsx's <head> and run before
 * hydration — sets data-theme synchronously from localStorage so the page
 * never paints in the wrong theme and then flips (FOUC). Kept as a plain
 * string (not imported JS) since it must run as a blocking inline <script>,
 * not a bundled module.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)});if(t==="dark-v4"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
