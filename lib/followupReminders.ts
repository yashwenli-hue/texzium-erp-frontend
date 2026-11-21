import { FollowupCalendarEntry } from "./types/domain";

/**
 * When the follow-up reminder pops up, and when it stops. Pure functions, so the rules
 * are tested without a browser; the popup (FollowupReminderHost) only calls them.
 */

export const MINUTE = 60_000;
/** A reminder appears this long before the follow-up is due. */
export const REMIND_BEFORE_MS = 10 * MINUTE;
/** How far back an overdue follow-up still reminds. Older ones are on the calendar. */
export const OVERDUE_WINDOW_MS = 7 * 24 * 60 * MINUTE;
/** How often the list is fetched again. */
export const POLL_MS = MINUTE;

/** Snoozes and dismissals, per follow-up AND its date, so a rescheduled follow-up reminds again. */
export type SnoozeMap = Record<string, number>;

export const snoozeKeyOf = (e: Pick<FollowupCalendarEntry, "id" | "followupDate">) => `${e.id}@${e.followupDate}`;

/** The window GET /lead-followups/mine is asked for: a week back to the reminder horizon ahead. */
export function reminderWindow(now: number): { from: string; to: string } {
  return {
    from: new Date(now - OVERDUE_WINDOW_MS).toISOString(),
    to: new Date(now + REMIND_BEFORE_MS + POLL_MS).toISOString(),
  };
}

/** The follow-ups to show now: pending, due within REMIND_BEFORE_MS (or overdue), not snoozed. */
export function dueReminders(entries: FollowupCalendarEntry[], now: number, snoozed: SnoozeMap): FollowupCalendarEntry[] {
  return entries
    .filter((e) => e.status === "PENDING")
    .filter((e) => {
      const due = new Date(e.followupDate).getTime();
      return due - REMIND_BEFORE_MS <= now && due >= now - OVERDUE_WINDOW_MS;
    })
    .filter((e) => (snoozed[snoozeKeyOf(e)] ?? 0) <= now)
    .sort((a, b) => (a.followupDate < b.followupDate ? -1 : 1));
}

/** Drops snoozes that have run out (and would otherwise pile up in storage). */
export function pruneSnoozes(snoozed: SnoozeMap, now: number): SnoozeMap {
  return Object.fromEntries(Object.entries(snoozed).filter(([, until]) => until > now));
}

/** "in 8 min", "due now", "25 min overdue", "3 h overdue", "2 days overdue". */
export function dueLabel(followupDate: string, now: number): string {
  const diff = new Date(followupDate).getTime() - now;
  const mins = Math.round(Math.abs(diff) / MINUTE);
  if (mins < 1) return "due now";
  if (diff > 0) return `in ${mins} min`;
  if (mins < 60) return `${mins} min overdue`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h overdue`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} overdue`;
}

/** Who the reminder is about: the person, with the company when it differs. */
export function leadTitle(lead: FollowupCalendarEntry["lead"]): string {
  return lead.companyName && lead.companyName !== lead.customerName ? `${lead.customerName} · ${lead.companyName}` : lead.customerName;
}

// ---------------------------------------------------------------------------
// The calendar.
// ---------------------------------------------------------------------------

export type CalendarState = "pending" | "overdue" | "done" | "cancelled";

export function calendarState(e: Pick<FollowupCalendarEntry, "status" | "followupDate">, now: number): CalendarState {
  if (e.status === "COMPLETED") return "done";
  if (e.status === "CANCELLED") return "cancelled";
  return new Date(e.followupDate).getTime() < now ? "overdue" : "pending";
}

/** A local calendar day as "YYYY-MM-DD". */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The 42 days (six Monday-first weeks) shown for a month. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

/** The window to fetch for a month's grid: its first day to the day after its last (42 days). */
export function monthWindow(year: number, month: number): { from: string; to: string } {
  const days = monthGrid(year, month);
  const end = new Date(days[41]);
  end.setDate(end.getDate() + 1);
  return { from: days[0].toISOString(), to: end.toISOString() };
}

export function groupByDay(entries: FollowupCalendarEntry[]): Map<string, FollowupCalendarEntry[]> {
  const map = new Map<string, FollowupCalendarEntry[]>();
  for (const e of entries) {
    const k = dayKey(new Date(e.followupDate));
    const list = map.get(k);
    if (list) list.push(e);
    else map.set(k, [e]);
  }
  for (const list of map.values()) list.sort((a, b) => (a.followupDate < b.followupDate ? -1 : 1));
  return map;
}
