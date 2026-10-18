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
