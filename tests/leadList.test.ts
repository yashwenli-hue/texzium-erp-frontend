import { test } from "node:test";
import assert from "node:assert/strict";
import type { Lead, LeadStatus } from "../lib/types/domain";
import type { FollowupInfo } from "../lib/followup";
import {
  DEFAULT_LEAD_LIST_VIEW,
  LEAD_STATUS_ORDER,
  LeadListView,
  clampPage,
  filterAndSortLeads,
  leadRowLabel,
  leadStatusOptions,
  sanitizeLeadListView,
} from "../lib/repository/shared/leadList";
import { LEAD_STATUSES } from "../lib/types/domain";

const lead = (id: string, over: Partial<Lead> = {}): Lead => ({
  id,
  customerName: `Lead ${id}`,
  phone: "+91 98765 43210",
  sourceId: "src-1",
  sourceName: "Website",
  status: "NEW",
  isActive: true,
  createdAt: "2026-10-10T06:00:00.000Z",
  updatedAt: "2026-10-10T06:00:00.000Z",
  lastActivityAt: "2026-10-10T06:00:00.000Z",
  ...over,
});

const ctx = { followupById: new Map<string, FollowupInfo>(), categoryBySourceId: new Map<string, string | undefined>() };
const view = (over: Partial<LeadListView> = {}) => ({ ...DEFAULT_LEAD_LIST_VIEW, ...over });
const ids = (rows: Lead[]) => rows.map((l) => l.id);

test("the lifecycle order names every backend status exactly once", () => {
  assert.equal(LEAD_STATUS_ORDER.length, LEAD_STATUSES.length);
  assert.deepEqual([...LEAD_STATUS_ORDER].sort(), [...LEAD_STATUSES].sort());
});

test("Status filter: the statuses present, in lifecycle order, not alphabetical", () => {
  const leads = (["REJECTED", "NEW", "SALES_ASSIGNED", "CONTACTED", "NEW"] as LeadStatus[]).map((status, i) => lead(String(i), { status }));
  assert.deepEqual(leadStatusOptions(leads), ["New", "Contacted", "Sales Assigned", "Rejected"]);
  assert.deepEqual(leadStatusOptions([]), []);
});

test("Assignment filter: Assigned, Unassigned, and both together meaning no filter", () => {
  const leads = [lead("a", { assignedToId: "u1", assignedToName: "Asha" }), lead("b")];
  const run = (assignment: string[] | undefined) => ids(filterAndSortLeads(leads, view({ filters: { assignment } }), ctx)).sort();
  assert.deepEqual(run(["Assigned"]), ["a"]);
  assert.deepEqual(run(["Unassigned"]), ["b"]);
  assert.deepEqual(run(["Assigned", "Unassigned"]), ["a", "b"]);
  assert.deepEqual(run(undefined), ["a", "b"]);
});

test("search finds a phone number however it is typed, but not on one or two digits", () => {
  const leads = [lead("a", { phone: "+91 98765 43210" }), lead("b", { phone: "080-2233-4455" })];
  assert.deepEqual(ids(filterAndSortLeads(leads, view({ search: "98765-432" }), ctx)), ["a"]);
  assert.deepEqual(ids(filterAndSortLeads(leads, view({ search: "2233 44" }), ctx)), ["b"]);
  // "1" alone would match almost every number.
  assert.deepEqual(ids(filterAndSortLeads(leads, view({ search: "1" }), ctx)), []);
});

test("search covers name, company, place, owner and email", () => {
  const leads = [
    lead("a", { customerName: "Asha Rao" }),
    lead("b", { companyName: "Sterling Pumps" }),
    lead("c", { country: "IN", state: "Maharashtra", city: "Pune" }),
    lead("d", { assignedToName: "Yash Kumar" }),
    lead("e", { email: "buyer@example.com" }),
  ];
  for (const [q, id] of [["asha", "a"], ["sterling", "b"], ["pune", "c"], ["yash", "d"], ["buyer@", "e"]]) {
    assert.deepEqual(ids(filterAndSortLeads(leads, view({ search: q }), ctx)), [id], q);
  }
});

test("sort: names ignore case; dates by their ISO value; both directions", () => {
  const leads = [lead("1", { customerName: "bravo", createdAt: "2026-10-02T00:00:00Z" }), lead("2", { customerName: "Alpha", createdAt: "2026-10-03T00:00:00Z" }), lead("3", { customerName: "charlie", createdAt: "2026-10-01T00:00:00Z" })];
  assert.deepEqual(ids(filterAndSortLeads(leads, view({ sort: { field: "customerName", direction: "asc" } }), ctx)), ["2", "1", "3"]);
  assert.deepEqual(ids(filterAndSortLeads(leads, view({ sort: { field: "createdAt", direction: "desc" } }), ctx)), ["2", "1", "3"]);
  assert.deepEqual(ids(filterAndSortLeads(leads, view({ sort: { field: "createdAt", direction: "asc" } }), ctx)), ["3", "1", "2"]);
});

test("a remembered view is checked field by field, never trusted", () => {
  assert.equal(sanitizeLeadListView(null), null);
  assert.equal(sanitizeLeadListView("x"), null);
  assert.equal(sanitizeLeadListView([1]), null);
  assert.deepEqual(sanitizeLeadListView({}), DEFAULT_LEAD_LIST_VIEW);

  const good = {
    search: "pune",
    filters: { status: ["New", "Contacted"], assignment: "Unassigned" },
    dateRange: { from: "2026-10-01", to: "2026-10-31" },
    sort: { field: "createdAt", direction: "asc" },
    page: 3,
    showDeactivated: true,
  };
  assert.deepEqual(sanitizeLeadListView(good), good);

  const bad = sanitizeLeadListView({
    search: 42,
    filters: { status: [1, 2], city: [], ok: ["Pune"], nested: { a: 1 } },
    dateRange: { from: "01/10/2026", to: "<script>" },
    sort: { field: "passwordHash", direction: "asc" },
    page: 0,
    showDeactivated: "yes",
  });
  assert.deepEqual(bad, { ...DEFAULT_LEAD_LIST_VIEW, filters: { ok: ["Pune"] }, dateRange: { from: "", to: "" } });
  assert.equal(sanitizeLeadListView({ page: 2.5 })!.page, 1);
  assert.equal(sanitizeLeadListView({ search: "x".repeat(500) })!.search.length, 200);
});

test("a remembered page past the end of a shorter list becomes the last page", () => {
  assert.equal(clampPage(5, 17, 8), 3);
  assert.equal(clampPage(2, 17, 8), 2);
  assert.equal(clampPage(4, 0, 8), 1);
  assert.equal(clampPage(0, 30, 8), 1);
});

test("a row's accessible name carries everything the row may cut short", () => {
  assert.equal(leadRowLabel({ customerName: "Asha Rao", companyName: "Sterling Pumps" }, "Pune, Maharashtra"), "Asha Rao, Sterling Pumps, Pune, Maharashtra");
  assert.equal(leadRowLabel({ customerName: "Asha Rao" }, ""), "Asha Rao");
});
