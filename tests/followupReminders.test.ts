import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MINUTE, REMIND_BEFORE_MS, OVERDUE_WINDOW_MS, dueReminders, dueLabel, pruneSnoozes, reminderWindow, snoozeKeyOf,
  calendarState, monthGrid, monthWindow, groupByDay, dayKey, leadTitle,
} from "../lib/followupReminders";
import { FollowupCalendarEntry } from "../lib/types/domain";

const NOW = new Date("2026-11-21T10:00:00Z").getTime();
const entry = (id: string, offsetMin: number, status: FollowupCalendarEntry["status"] = "PENDING"): FollowupCalendarEntry => ({
  id,
  followupDate: new Date(NOW + offsetMin * MINUTE).toISOString(),
  remarks: null,
  status,
  completedAt: null,
  completedBy: null,
  lead: { id: "L" + id, leadCode: null, customerName: "Rao", companyName: "Rao Textiles", phone: "9", status: "CONTACTED", isActive: true, assignedTo: { id: "U1", fullName: "Priya" } },
});

test("a reminder shows from 10 minutes before until a week overdue, pending only, oldest first", () => {
  const rows = [
    entry("soon", 9), entry("later", 11), entry("overdue", -30), entry("ancient", -(OVERDUE_WINDOW_MS / MINUTE) - 1),
    entry("done", -5, "COMPLETED"), entry("cancelled", -5, "CANCELLED"),
  ];
  assert.deepEqual(dueReminders(rows, NOW, {}).map((e) => e.id), ["overdue", "soon"]);
});

test("a snooze hides it until it runs out; a reschedule starts it again", () => {
  const e = entry("a", -1);
  const snoozed = { [snoozeKeyOf(e)]: NOW + 10 * MINUTE };
  assert.deepEqual(dueReminders([e], NOW, snoozed), []);
  assert.equal(dueReminders([e], NOW + 10 * MINUTE, snoozed).length, 1);
  const moved = { ...e, followupDate: new Date(NOW - 2 * MINUTE).toISOString() };
  assert.equal(dueReminders([moved], NOW, snoozed).length, 1);
  assert.deepEqual(pruneSnoozes({ old: NOW - 1, live: NOW + 1 }, NOW), { live: NOW + 1 });
});

test("the window fetched covers the overdue week and the time until the next poll", () => {
  const w = reminderWindow(NOW);
  assert.equal(new Date(w.from).getTime(), NOW - OVERDUE_WINDOW_MS);
  assert.ok(new Date(w.to).getTime() > NOW + REMIND_BEFORE_MS);
});

test("due labels", () => {
  const at = (min: number) => new Date(NOW + min * MINUTE).toISOString();
  assert.equal(dueLabel(at(0), NOW), "due now");
  assert.equal(dueLabel(at(8), NOW), "in 8 min");
  assert.equal(dueLabel(at(-25), NOW), "25 min overdue");
  assert.equal(dueLabel(at(-180), NOW), "3 h overdue");
  assert.equal(dueLabel(at(-60 * 24), NOW), "1 day overdue");
  assert.equal(dueLabel(at(-60 * 48), NOW), "2 days overdue");
  assert.equal(leadTitle(entry("x", 0).lead), "Rao · Rao Textiles");
});

test("calendar states and the month grid", () => {
  assert.equal(calendarState(entry("a", -1), NOW), "overdue");
  assert.equal(calendarState(entry("a", 1), NOW), "pending");
  assert.equal(calendarState(entry("a", -1, "COMPLETED"), NOW), "done");
  assert.equal(calendarState(entry("a", 1, "CANCELLED"), NOW), "cancelled");

  const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
  assert.equal(grid.length, 42);
  assert.equal(dayKey(grid[0]), "2026-10-26"); // the Monday before
  assert.equal(grid[0].getDay(), 1);
  assert.equal(dayKey(grid[6]), "2026-11-01");
  const w = monthWindow(2026, 10);
  const days = (new Date(w.to).getTime() - new Date(w.from).getTime()) / (24 * 60 * MINUTE);
  assert.ok(days >= 41.9 && days <= 42.1 && days <= 62);

  const byDay = groupByDay([entry("b", 60), entry("a", 30)]);
  assert.deepEqual([...byDay.values()][0].map((e) => e.id), ["a", "b"]);
});

test("demo mode: reminders go to the lead's current owner; the calendar shows every status", async () => {
  const { db } = await import("../lib/repository/mock/db");
  const { MockLeadFollowupRepository } = await import("../lib/repository/mock/mockLeadFollowupRepository");
  const repo = new MockLeadFollowupRepository();
  const owned = db.leads.getAll().find((l) => l.isActive && l.assignedToId)!;
  const other = db.leads.getAll().find((l) => l.isActive && l.assignedToId && l.assignedToId !== owned.assignedToId)!;
  const soon = new Date(Date.now() + 5 * MINUTE).toISOString();
  const a = await repo.create({ leadId: owned.id, followupDate: soon, remarks: "mine" });
  const b = await repo.create({ leadId: other.id, followupDate: soon, remarks: "theirs" });
  const done = await repo.create({ leadId: owned.id, followupDate: soon });
  await repo.complete(done.id);

  const w = reminderWindow(Date.now());
  const mine = await repo.listMine(owned.assignedToId!, w.from, w.to);
  assert.ok(mine.some((e) => e.id === a.id));
  assert.ok(!mine.some((e) => e.id === b.id || e.id === done.id));
  assert.equal(mine.find((e) => e.id === a.id)!.lead.assignedTo?.id, owned.assignedToId);

  const cal = await repo.calendar(w.from, w.to);
  for (const id of [a.id, b.id, done.id]) assert.ok(cal.some((e) => e.id === id));
  const narrowed = await repo.calendar(w.from, w.to, other.assignedToId);
  assert.ok(narrowed.every((e) => e.lead.assignedTo?.id === other.assignedToId));
});
