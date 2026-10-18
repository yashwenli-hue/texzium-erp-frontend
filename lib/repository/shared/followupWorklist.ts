import { FollowupWorkItem } from "../../types/domain";

/**
 * The follow-up worklist: every follow-up the person may see (the backend scopes the list),
 * sorted into what is late, what is due today, what comes later, and what is finished.
 * Presentation only — the lifecycle (PENDING → COMPLETED or CANCELLED, both final) is the
 * backend's, and only a PENDING follow-up on an active lead can be acted on.
 */
export type FollowupBucket = "OVERDUE" | "TODAY" | "UPCOMING" | "CLOSED";

export const FOLLOWUP_BUCKETS: Array<{ key: FollowupBucket; label: string }> = [
  { key: "OVERDUE", label: "Overdue" },
  { key: "TODAY", label: "Due today" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "CLOSED", label: "Completed or cancelled" },
];

export function followupBucket(f: Pick<FollowupWorkItem, "status" | "followupDate">, now: Date = new Date()): FollowupBucket {
  if (f.status !== "PENDING") return "CLOSED";
  const due = new Date(f.followupDate).getTime();
  const endOfToday = new Date(now).setHours(23, 59, 59, 999);
  if (due < now.getTime()) return "OVERDUE";
  if (due <= endOfToday) return "TODAY";
  return "UPCOMING";
}

/** Whether the person can act on it at all: the backend only changes a pending follow-up of an active lead. */
export function isActionable(f: FollowupWorkItem): boolean {
  return f.status === "PENDING" && f.lead.isActive;
}

export interface WorklistFilter {
  /** Only follow-ups of leads assigned to this person. */
  mineOf?: string | null;
  search?: string;
  /** Include follow-ups of deactivated leads (read-only). */
  showInactive?: boolean;
}

function matches(f: FollowupWorkItem, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  const digits = term.replace(/\D/g, "");
  const hay = [f.lead.customerName, f.lead.companyName, f.remarks].filter(Boolean).join(" ").toLowerCase();
  if (hay.includes(t)) return true;
  return digits.length >= 4 && !!f.lead.phone && f.lead.phone.replace(/\D/g, "").includes(digits);
}

export function filterWorklist(items: FollowupWorkItem[], filter: WorklistFilter): FollowupWorkItem[] {
  const term = (filter.search ?? "").trim();
  return items.filter(
    (f) =>
      (filter.showInactive || f.lead.isActive) &&
      (!filter.mineOf || f.lead.assignedToId === filter.mineOf) &&
      matches(f, term)
  );
}

/**
 * Grouped and ordered: late and today's work by due time (the most overdue first), upcoming by
 * due time, finished ones most recent first and capped, since that list only grows.
 */
export function groupWorklist(items: FollowupWorkItem[], now: Date = new Date(), closedLimit = 20): Record<FollowupBucket, FollowupWorkItem[]> {
  const groups: Record<FollowupBucket, FollowupWorkItem[]> = { OVERDUE: [], TODAY: [], UPCOMING: [], CLOSED: [] };
  for (const f of items) groups[followupBucket(f, now)].push(f);
  const byDue = (a: FollowupWorkItem, b: FollowupWorkItem) => a.followupDate.localeCompare(b.followupDate);
  groups.OVERDUE.sort(byDue);
  groups.TODAY.sort(byDue);
  groups.UPCOMING.sort(byDue);
  groups.CLOSED.sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
  groups.CLOSED = groups.CLOSED.slice(0, closedLimit);
  return groups;
}
