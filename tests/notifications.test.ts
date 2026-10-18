import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationGroup } from "../lib/ui/notificationGroups";

test("notifications are grouped by calendar day, and old ones are 'Earlier', not 'This week'", () => {
  const now = new Date(2026, 9, 18, 9, 0); // Sun 18 Oct 2026, 09:00 local
  assert.equal(notificationGroup(new Date(2026, 9, 18, 0, 5).toISOString(), now), "Today");
  assert.equal(notificationGroup(new Date(2026, 9, 17, 23, 0).toISOString(), now), "Yesterday");
  assert.equal(notificationGroup(new Date(2026, 9, 12, 10, 0).toISOString(), now), "Earlier this week");
  assert.equal(notificationGroup(new Date(2026, 6, 1).toISOString(), now), "Earlier");
});
