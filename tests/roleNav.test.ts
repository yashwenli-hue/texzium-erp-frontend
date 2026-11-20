import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_SECTIONS } from "../lib/pageMeta";
import { visibleNavSections } from "../lib/navVisibility";

const PRE_SALES_CODES = new Set([
  "leads.view", "leads.create", "leads.edit", "leads.status.update", "leads.qualify", "leads.reject",
  "leads.followups.view", "leads.followups.create", "customers.view", "content.view", "content.share",
]);
const labels = (role: string | undefined, has: (p: string) => boolean) =>
  visibleNavSections(NAV_SECTIONS, has, role).flatMap((s) => s.items.map((i) => i.label));

test("Pre-Sales sees exactly its seven RevenueOS menu items, in menu order", () => {
  assert.deepEqual(labels("PRE_SALES", (p) => PRE_SALES_CODES.has(p)), [
    "Dashboard",
    "Leads",
    "Activities",
    "Tasks",
    "Content Library",
    "Reports",
    "Notifications",
  ]);
});

test("a Pre-Sales menu item still needs its permission", () => {
  assert.ok(!labels("PRE_SALES", (p) => p !== "content.view").includes("Content Library"));
});

test("other roles keep the full permission-filtered menu", () => {
  const all = () => true;
  for (const role of ["SALES", "SALES_MANAGER", "FINANCE", "SUPER_ADMIN", undefined])
    assert.deepEqual(labels(role, all), labels(undefined, all), String(role));
  assert.ok(labels("SALES", all).includes("Opportunities"));
});

test("sections left empty for a role are dropped, not shown as empty headings", () => {
  const sections = visibleNavSections(NAV_SECTIONS, () => true, "PRE_SALES");
  assert.ok(sections.every((s) => s.items.length > 0));
  assert.ok(!sections.some((s) => s.label === "Quote to Cash" || s.label === "Accounts"));
});
