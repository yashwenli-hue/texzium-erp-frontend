import type { FilterMap } from "../../types/common";
import { DEFAULT_LEAD_LIST_VIEW, LeadListView, toSearchQuery } from "./leadList";
import type { LeadSearchQuery } from "./leadSearch";

/**
 * Pre-Sales work queues: the questions a pre-sales team asks every morning, each one a preset of the
 * lead list's own server filters (no new rule, no new status). Choosing a queue only filters the list;
 * nothing is assigned, qualified or changed by being in a queue. "Worked by me" uses the recorded
 * pre-sales history, the same filter as "Pre-sales by".
 */
export interface PresalesQueue {
  key: string;
  label: string;
  hint: string;
  filters: (me: string | null) => FilterMap | null;
}

const PRE = ["PRE_QUALIFICATION"];

export const PRESALES_QUEUES: PresalesQueue[] = [
  { key: "unowned", label: "Needs an owner", hint: "New enquiries nobody is working yet", filters: () => ({ stage: PRE, assignment: ["unassigned"] }) },
  { key: "due", label: "Follow-up due", hint: "Overdue or due today", filters: () => ({ stage: PRE, followup: ["Overdue", "Due Today"] }) },
  { key: "cnc", label: "Not connected", hint: "The last call didn't connect", filters: () => ({ stage: PRE, lastCall: ["CNC"] }) },
  { key: "uncalled", label: "Never called", hint: "No call logged yet", filters: () => ({ stage: PRE, lastCall: ["NONE"] }) },
  { key: "mine", label: "Worked by me", hint: "Leads in whose pre-sales history you appear", filters: (me) => (me ? { presales: [me] } : null) },
  { key: "handed", label: "Handed to sales", hint: "Qualified and with a salesperson", filters: () => ({ stage: ["QUALIFIED"] }) },
  { key: "all", label: "All", hint: "Every lead you may see", filters: () => ({}) },
];

function same(a: FilterMap, b: FilterMap): boolean {
  const norm = (m: FilterMap) =>
    JSON.stringify(
      Object.keys(m)
        .sort()
        .map((k) => [k, ([] as string[]).concat(m[k] ?? []).slice().sort()])
        .filter(([, v]) => (v as string[]).length > 0)
    );
  return norm(a) === norm(b);
}

/** The queue whose filters are exactly the current ones (none when the person has refined them). */
export function activeQueue(filters: FilterMap, me: string | null): PresalesQueue | undefined {
  return PRESALES_QUEUES.find((q) => {
    const f = q.filters(me);
    return f !== null && same(f, filters);
  });
}

/** The query that counts a queue: one row, the total is what matters. */
export function queueCountQuery(q: PresalesQueue, me: string | null, view: Pick<LeadListView, "showDeactivated">): LeadSearchQuery | null {
  const filters = q.filters(me);
  if (!filters) return null;
  return toSearchQuery({ ...DEFAULT_LEAD_LIST_VIEW, filters, showDeactivated: view.showDeactivated }, "", 1);
}
