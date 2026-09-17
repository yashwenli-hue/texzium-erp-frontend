"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui/Icon";
import { NAV_SECTIONS } from "../../lib/pageMeta";
import { useLiveCounts } from "../../lib/hooks/useLiveCounts";

export function Sidebar({ mobileOpen, onNavigate }: { mobileOpen: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const counts = useLiveCounts();

  return (
    <aside className={`rail ${mobileOpen ? "show" : ""}`}>
      <div className="brand">
        <div className="logo">R</div>
        <div>
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
                >
                  <span className="dot">
                    <Icon name={item.icon} size={14} />
                  </span>
                  {item.label}
                  {count !== undefined && <span className="badge-count">{count}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
