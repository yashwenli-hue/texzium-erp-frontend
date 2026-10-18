import { test } from "node:test";
import assert from "node:assert/strict";
import { toLocalDateTimeInput } from "../lib/format";

test("a follow-up's time is pre-filled in local time, and saving it unchanged keeps the same instant", () => {
  const iso = "2026-10-18T10:40:00.000Z";
  const local = toLocalDateTimeInput(iso);
  assert.match(local, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  // what FollowupForm sends back: new Date(<input value>).toISOString()
  assert.equal(new Date(local).toISOString(), iso);
  assert.equal(toLocalDateTimeInput("not a date"), "");
});

test("in India (UTC+5:30) a 10:40 UTC follow-up shows 16:10", () => {
  const d = new Date("2026-10-18T10:40:00.000Z");
  if (d.getTimezoneOffset() === -330) assert.equal(toLocalDateTimeInput(d.toISOString()), "2026-10-18T16:10");
});

test("relative day labels count calendar days, not 48-hour windows", async (t) => {
  const { formatRelative } = await import("../lib/format");
  const now = new Date(2026, 9, 18, 14, 30);
  t.mock.timers.enable({ apis: ["Date"], now });
  try {
    assert.equal(formatRelative(new Date(2026, 9, 19, 16, 10).toISOString()), "Tomorrow");
    assert.equal(formatRelative(new Date(2026, 9, 20, 11, 30).toISOString()), "in 2 days");
    assert.equal(formatRelative(new Date(2026, 9, 17, 9, 0).toISOString()), "Yesterday");
    assert.equal(formatRelative(new Date(2026, 9, 16, 20, 0).toISOString()), "2 days ago");
    assert.equal(formatRelative(new Date(2026, 9, 18, 16, 30).toISOString()), "in 2 hrs");
  } finally {
    t.mock.timers.reset();
  }
});
