"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/Icon";
import { NAV_SECTIONS } from "../../lib/pageMeta";
import { useLiveCounts } from "../../lib/hooks/useLiveCounts";

interface TooltipState {
  label: string;
  top: number;
}

export function Sidebar({
  mobileOpen,
  onNavigate,
  collapsed,
  onToggleCollapsed,
}: {
  mobileOpen: boolean;
  onNavigate: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const counts = useLiveCounts();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Tooltip is position:fixed (not CSS-hover ::after) because the rail's
  // scroll container clips absolutely-positioned overflow — fixed
  // positioning is the reliable way to escape that in a scrollable rail.
  function showTooltip(label: string, e: React.MouseEvent<HTMLElement>) {
    if (!collapsed || mobileOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  }
  function hideTooltip() {
    setTooltip(null);
  }

  return (
    <aside className={`rail ${mobileOpen ? "show" : ""} ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="logo">R</div>
        <div className="brand-text">
          <b>RevenueOS</b>
          <small>CRM · Texzium ERP</small>
        </div>
      </div>
      <div className="rail-scroll">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="nav-label">{section.label}</div>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              const count = item.countKey ? counts[item.countKey] : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mod ${active ? "active" : ""}`}
                  onClick={onNavigate}
                  onMouseEnter={(e) => showTooltip(item.label, e)}
                  onMouseLeave={hideTooltip}
                >
                  <span className="dot">
                    <Icon name={item.icon} size={14} />
                  </span>
                  <span className="mod-label">{item.label}</span>
                  {count !== undefined && <span className="badge-count">{count}</span>}
                  {count !== undefined && count > 0 && <span className="rail-dot" />}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <button
        className="rail-collapse-btn"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onMouseEnter={(e) => showTooltip("Expand", e)}
        onMouseLeave={hideTooltip}
      >
        <Icon name="collapse" size={15} className={collapsed ? "flip" : undefined} />
        <span className="mod-label">Collapse</span>
      </button>
      {collapsed && tooltip && (
        <div className="rail-tooltip" style={{ top: tooltip.top }}>
          {tooltip.label}
        </div>
      )}
    </aside>
  );
}
