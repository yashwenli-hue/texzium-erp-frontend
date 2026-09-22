"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, KeyboardEvent } from "react";
import { Icon } from "../ui/Icon";
import { PAGE_META } from "../../lib/pageMeta";
import { useLiveCounts } from "../../lib/hooks/useLiveCounts";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";

const DETAIL_LABELS: Record<string, string> = {
  leads: "Lead Details",
  opportunities: "Opportunity Details",
  quotations: "Quotation Details",
  "proforma-invoices": "Proforma Invoice Details",
  "sales-orders": "Sales Order Details",
  "sales-invoices": "Sales Invoice Details",
  customers: "Customer Details",
};

interface Crumb {
  label: string;
  href?: string;
}

// A detail route (e.g. /leads/abc123) now shows its parent list page as a
// clickable middle segment — "RevenueOS / Leads / Lead Details" — instead
// of jumping straight from "RevenueOS" to "Lead Details" with no trail back
// to the list. Top-level routes are unchanged (two segments, as before).
function crumbTrail(pathname: string): Crumb[] {
  const seg = pathname.split("/").filter(Boolean);
  const detailLabel = seg[0] && seg[1] ? DETAIL_LABELS[seg[0]] : undefined;
  if (detailLabel) {
    return [
      { label: PAGE_META[seg[0]]?.title ?? seg[0], href: `/${seg[0]}` },
      { label: detailLabel },
    ];
  }
  return [{ label: PAGE_META[seg[0]]?.title ?? "Dashboard" }];
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const counts = useLiveCounts();
  const [term, setTerm] = useState("");
  const trail = crumbTrail(pathname);

  function submitSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && term.trim()) {
      router.push(`/search?q=${encodeURIComponent(term.trim())}`);
    }
  }

  return (
    <header className="topbar">
      <button className="icon-btn mobile-toggle" onClick={onMenuClick} aria-label="Menu">
        <Icon name="menu" size={18} />
      </button>
      <div className="crumb">
        <span>RevenueOS</span>
        {trail.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="sep">/</span>
            {c.href ? (
              <span
                onClick={() => router.push(c.href!)}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              >
                {c.label}
              </span>
            ) : (
              <b>{c.label}</b>
            )}
          </span>
        ))}
      </div>
      <div className="search">
        <Icon name="search" size={16} />
        <input
          placeholder="Search leads, customers, quotations, orders, invoices…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={submitSearch}
        />
        <kbd>Enter</kbd>
      </div>
      <div className="top-actions">
        <div className="relbar">
          <button className="icon-btn" aria-label="Notifications" onClick={() => router.push("/notifications")}>
            {counts.unreadNotificationsCount > 0 && <span className="badge" />}
            <Icon name="bell" size={18} />
          </button>
        </div>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
