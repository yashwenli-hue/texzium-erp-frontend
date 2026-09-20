import { Task, LeadFollowup } from "./types/domain";

/**
 * MOCK/UI-ONLY presentation concept. The verified backend has a dedicated
 * lead-followups module with its own PENDING/COMPLETED/CANCELLED lifecycle
 * (docs/backend-ui-contract.md §5) — this frontend does not yet model that
 * entity separately. Until it does, "follow-up" here is derived from the
 * generic mock Task list (open tasks linked to a Lead), which is NOT the
 * same thing as a real LeadFollowup record. Do not treat this as backend
 * data; it exists to make the pipeline feel operational in Phase A.
 */
export type FollowupUrgency = "Overdue" | "Due Today" | "Tomorrow" | "Scheduled" | "None";

export interface FollowupInfo {
  urgency: FollowupUrgency;
  dueAt: string | null;
  taskTitle?: string;
}

const DAY = 86_400_000;

export function classifyFollowup(dueAt: string | null | undefined): FollowupUrgency {
  if (!dueAt) return "None";
  const due = new Date(dueAt);
  const now = new Date();
  const dueDay = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay - today) / DAY);
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due Today";
  if (diffDays === 1) return "Tomorrow";
  return "Scheduled";
}

/** Nearest open (not done) task linked to a record, used as its "next follow-up". */
export function nextFollowupFor(linkedId: string, tasks: Task[]): FollowupInfo {
  const open = tasks
    .filter((t) => t.linkedId === linkedId && !t.done && t.dueAt)
    .sort((a, b) => (a.dueAt! < b.dueAt! ? -1 : 1));
  const next = open[0];
  if (!next) return { urgency: "None", dueAt: null };
  return { urgency: classifyFollowup(next.dueAt), dueAt: next.dueAt, taskTitle: next.title };
}

/** Nearest PENDING LeadFollowup for a lead — the real backend equivalent of nextFollowupFor, sourced from LeadFollowup rather than the generic mock Task list. */
export function nextPendingFollowup(followups: LeadFollowup[] | undefined): FollowupInfo {
  const pending = (followups ?? [])
    .filter((f) => f.status === "PENDING")
    .sort((a, b) => (a.followupDate < b.followupDate ? -1 : 1));
  const next = pending[0];
  if (!next) return { urgency: "None", dueAt: null };
  return { urgency: classifyFollowup(next.followupDate), dueAt: next.followupDate };
}

export function followupCountsFor(linkedIds: string[], tasks: Task[]) {
  let overdue = 0;
  let dueToday = 0;
  for (const id of linkedIds) {
    const info = nextFollowupFor(id, tasks);
    if (info.urgency === "Overdue") overdue += 1;
    else if (info.urgency === "Due Today") dueToday += 1;
  }
  return { overdue, dueToday };
}
