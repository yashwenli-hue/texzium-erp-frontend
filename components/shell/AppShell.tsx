"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { FOCUSABLE_SELECTOR } from "../../lib/ui/focus";

const COLLAPSE_KEY = "revenueos.railCollapsed";
/** The width at and below which the navigation is a drawer (see .rail in globals.css). */
export const DRAWER_QUERY = "(max-width: 720px)";
export const NAV_ID = "app-nav";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Read the persisted preference after mount only, so the server-rendered
  // markup (always expanded) matches the client's first paint and React
  // doesn't hit a hydration mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      // localStorage unavailable (private mode etc.) — fall back to expanded.
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(DRAWER_QUERY);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const closeDrawer = useCallback((returnFocus: boolean) => {
    setMobileOpen(false);
    if (returnFocus) menuButtonRef.current?.focus();
  }, []);

  // Going to another page closes the drawer.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // A closed drawer is off screen: keep it out of the Tab order and away from assistive
  // technology. An open one takes focus and answers Escape.
  useEffect(() => {
    const nav = document.getElementById(NAV_ID);
    if (!nav) return;
    nav.inert = narrow && !mobileOpen;
    if (!narrow || !mobileOpen) return;
    // The current page's link, or else the first visible one (the desktop collapse button is hidden here).
    const visible = Array.from(nav.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
    (visible.find((el) => el.getAttribute("aria-current")) ?? visible[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeDrawer(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [narrow, mobileOpen, closeDrawer]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore — collapse state just won't persist this session
      }
      return next;
    });
  }

  return (
    <div className="app">
      <a className="skip-link" href="#stage">
        Skip to content
      </a>
      <Sidebar
        id={NAV_ID}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      {mobileOpen && <div className="rail-scrim" onClick={() => closeDrawer(false)} aria-hidden="true" />}
      <div className="main">
        <Topbar
          menuButtonRef={menuButtonRef}
          menuOpen={mobileOpen}
          menuControls={NAV_ID}
          onMenuClick={() => setMobileOpen((o) => !o)}
        />
        <main id="stage" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
