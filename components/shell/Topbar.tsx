"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, KeyboardEvent } from "react";
import { Icon } from "../ui/Icon";
import { PAGE_META } from "../../lib/pageMeta";
import { useLiveCounts } from "../../lib/hooks/useLiveCounts";

function crumbFor(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  if (seg[0] === "leads" && seg[1]) return "Lead Details";
  if (seg[0] === "opportunities" && seg[1]) return "Opportunity Details";
  if (seg[0] === "customers" && seg[1]) return "Customer Details";
  return PAGE_META[seg[0]]?.title ?? "Dashboard";
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const counts = useLiveCounts();
  const [term, setTerm] = useState("");

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
        <span className="sep">/</span>
        <b>{crumbFor(pathname)}</b>
      </div>
      <div className="search">
        <Icon name="search" size={16} />
        <input
          placeholder="Search leads, customers, quotations…"
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
        <div className="avatar">RK</div>
      </div>
    </header>
  );
}
