"use client";

import { LeadDeactivatedTag, LeadStatusTag } from "../ui/Tag";
import { Icon } from "../ui/Icon";
import type { Lead } from "../../lib/types/domain";
import type { LeadSortField, LeadListView } from "../../lib/repository/shared/leadList";
import type { ListSort } from "../ui/ResponsiveList";

export const LEAD_SORT_OPTIONS: Array<{ key: LeadSortField; label: string }> = [
  { key: "lastActivityAt", label: "Last activity" },
  { key: "createdAt", label: "Received" },
  { key: "customerName", label: "Lead name" },
];
// A new sort key starts in the direction people expect: names A-Z, dates newest first.
const FIRST_DIRECTION: Record<LeadSortField, "asc" | "desc"> = { customerName: "asc", createdAt: "desc", lastActivityAt: "desc" };

/** The list's sort control, wired to a lead list view. */
export function leadListSort(view: LeadListView, change: (patch: Partial<LeadListView>) => void): ListSort {
  const sort = view.sort;
  return {
    key: sort.field,
    direction: sort.direction,
    options: LEAD_SORT_OPTIONS,
    onChange: (key, direction) => {
      const field = key as LeadSortField;
      change({ sort: { field, direction: direction ?? (field === sort.field ? (sort.direction === "asc" ? "desc" : "asc") : FIRST_DIRECTION[field]) } });
    },
  };
}

/** The lead's status, and "Deactivated" beside it (never instead of it). */
export function LeadStatusCell({ lead }: { lead: Lead }) {
  return (
    <div className="cell-tags">
      <LeadStatusTag status={lead.status} />
      {!lead.isActive && <LeadDeactivatedTag />}
    </div>
  );
}

/** The latest call's outcome, when one was logged. */
export function LastCallTag({ lead }: { lead: Lead }) {
  if (lead.lastCallOutcome === "NOT_CONNECTED") {
    return (
      <span className="tag call-outcome cnc" title="The latest call did not connect">
        <Icon name="phone" size={11} /> CNC
      </span>
    );
  }
  if (lead.lastCallOutcome === "CONNECTED") return <span className="tag call-outcome ok">Connected</span>;
  return <span className="cell-none">—</span>;
}

/** "Searching…" while typing pauses, and the result count read out when it changes. */
export function ListStatus({ total, searching, loading, noun }: { total: number; searching: boolean; loading: boolean; noun: string }) {
  return (
    <span className="list-status" role="status" aria-live="polite">
      {searching || loading ? "Searching…" : `${total} ${noun}${total === 1 ? "" : "s"}`}
    </span>
  );
}
