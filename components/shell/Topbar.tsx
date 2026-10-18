"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, KeyboardEvent, RefObject } from "react";
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

export function Topbar({
  onMenuClick,
  menuOpen = false,
  menuControls,
  menuButtonRef,
}: {
  onMenuClick: () => void;
  menuOpen?: boolean;
  menuControls?: string;
  menuButtonRef?: RefObject<HTMLButtonElement>;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const counts = useLiveCounts();
  const [term, setTerm] = useState("");
  const trail = crumbTrail(pathname);
  const unread = counts.unreadNotificationsCount;

  function submitSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && term.trim()) {
      router.push(`/search?q=${encodeURIComponent(term.trim())}`);
    }
  }

  return (
    <header className="topbar">
      <button
        ref={menuButtonRef}
        className="icon-btn mobile-toggle"
        onClick={onMenuClick}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        aria-controls={menuControls}
      >
        <Icon name={menuOpen ? "close" : "menu"} size={18} />
      </button>
      <nav className="crumb" aria-label="Breadcrumb">
        <span className="crumb-root">RevenueOS</span>
        {trail.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="sep" aria-hidden="true">/</span>
            {c.href ? (
              <Link href={c.href} className="crumb-link">
                {c.label}
              </Link>
            ) : (
              <b aria-current="page">{c.label}</b>
            )}
          </span>
        ))}
      </nav>
      <div className="search" role="search">
        <Icon name="search" size={16} />
        <input
          type="search"
          aria-label="Search RevenueOS"
          placeholder="Search leads, customers, quotations, orders, invoices…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={submitSearch}
        />
        <kbd aria-hidden="true">Enter</kbd>
      </div>
      <div className="top-actions">
        <Link className="icon-btn search-btn" href="/search" aria-label="Search RevenueOS">
          <Icon name="search" size={18} />
        </Link>
        <div className="relbar">
          <Link
            className="icon-btn"
            href="/notifications"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          >
            {unread > 0 && <span className="badge" aria-hidden="true" />}
            <Icon name="bell" size={18} />
          </Link>
        </div>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
