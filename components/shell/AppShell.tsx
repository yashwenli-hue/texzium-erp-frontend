"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const COLLAPSE_KEY = "revenueos.railCollapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
      <Sidebar
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="main">
        <Topbar onMenuClick={() => setMobileOpen((o) => !o)} />
        <main id="stage">{children}</main>
      </div>
    </div>
  );
}
