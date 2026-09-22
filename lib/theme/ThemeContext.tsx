"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

/**
 * Version A Dark Mode A/B experiment (docs/revenueos-version-a-dark-mode-ab-brief.md).
 * "light" is the untouched existing theme and stays the default — this
 * experiment must not change what a user with no stored preference sees.
 * "dark-v1" is added by this commit; "dark-v2" is added by the following
 * commit once Variant 2 exists, with no changes needed here beyond the
 * union type and the selector UI's option list.
 */
export type ThemeName = "light" | "dark-v1" | "dark-v2";

const STORAGE_KEY = "revenueos.theme";
const THEMES: ThemeName[] = ["light", "dark-v1", "dark-v2"];

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
)});if(t&&t!=="light"&&(t==="dark-v1"||t==="dark-v2")){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
