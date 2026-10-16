import { test } from "node:test";
import assert from "node:assert/strict";
import type { Lead } from "../lib/types/domain";
import {
  LEAD_STATUSES,
  canMoveLeadStatus,
  canQualifyLeadFrom,
  canReopenLeadFrom,
  leadActionBlockedReason,
} from "../lib/types/domain";
import {
  DEFAULT_LEAD_LIST_VIEW,
  LEAD_STATUS_ORDER,
  LeadListView,
  clampPage,
  filterValueLabel,
  leadRowLabel,
  sanitizeLeadListView,
  toSearchQuery,
} from "../lib/repository/shared/leadList";
import { leadSearchParams, phoneDigitsQuery, phoneMatches } from "../lib/repository/shared/leadSearch";
import { searchLeadsLocally } from "../lib/repository/shared/leadSearchLocal";
import { validateLeadActivityInput } from "../lib/repository/shared/leadActivity";
import { describeReasons, isHidden, probeIsWorthChecking } from "../lib/repository/shared/leadDuplicates";

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
const view = (over: Partial<LeadListView> = {}) => ({ ...DEFAULT_LEAD_LIST_VIEW, ...over });
const ids = (r: { items: Lead[] }) => r.items.map((l) => l.id).sort();

test("the lifecycle order names every backend status exactly once, Underqualified after Contacted", () => {
  assert.deepEqual([...LEAD_STATUS_ORDER].sort(), [...LEAD_STATUSES].sort());
  assert.equal(LEAD_STATUS_ORDER.indexOf("UNDERQUALIFIED"), LEAD_STATUS_ORDER.indexOf("CONTACTED") + 1);
});

test("lifecycle rules match the backend: qualify from Qualified and Underqualified, reopen only Rejected, pre-qualification moves", () => {
  assert.ok(canQualifyLeadFrom("QUALIFIED") && canQualifyLeadFrom("UNDERQUALIFIED"));
  assert.ok(!canQualifyLeadFrom("SALES_ASSIGNED") && !canQualifyLeadFrom("REJECTED"));
  assert.deepEqual(LEAD_STATUSES.filter(canReopenLeadFrom), ["REJECTED"]);
  assert.ok(canMoveLeadStatus("NEW", "UNDERQUALIFIED") && canMoveLeadStatus("PRE_SALES_ASSIGNED", "CONTACTED"));
  assert.ok(!canMoveLeadStatus("NEW", "NEW") && !canMoveLeadStatus("REJECTED", "CONTACTED") && !canMoveLeadStatus("NEW", "QUALIFIED"));
  assert.equal(leadActionBlockedReason("reopen", "WON"), "Only a rejected lead can be reopened; this one is Won.");
});

test("a view becomes the server query: values not labels, both assignment choices mean none", () => {
  const q = toSearchQuery(
    view({
      filters: { status: ["NEW", "BOGUS"], assignment: ["assigned", "unassigned"], presales: ["u1"], lastCall: ["CNC"], country: ["NOT_SET", "IN"] },
      dateRange: { from: "2026-10-01", to: "" },
      sort: { field: "customerName", direction: "asc" },
      page: 3,
      showDeactivated: true,
    }),
    "  98765 43210 ",
    20,
  );
  assert.deepEqual(q, {
    q: "98765 43210",
    status: ["NEW"],
    assignment: undefined,
    presalesUserId: ["u1"],
    salesUserId: undefined,
    followup: undefined,
    lastCall: ["CNC"],
    source: undefined,
    country: ["NOT_SET", "IN"],
    state: undefined,
    city: undefined,
    createdFrom: "2026-10-01",
    createdTo: undefined,
    includeInactive: true,
    sort: "customerName",
    dir: "asc",
    page: 3,
    pageSize: 20,
  });
  assert.equal(toSearchQuery(view({ filters: { assignment: ["unassigned"] } }), "", 20).assignment, "unassigned");
});

test("the query string lists values comma-separated and leaves empty ones out", () => {
  assert.equal(
    leadSearchParams({ q: " asha ", status: ["NEW", "CONTACTED"], presalesUserId: [], includeInactive: false, page: 2, pageSize: 20 }),
    "q=asha&status=NEW%2CCONTACTED&page=2&pageSize=20",
  );
});

test("a remembered view is checked field by field; unknown filter keys and label-era values are dropped", () => {
  assert.equal(sanitizeLeadListView(null), null);
  assert.deepEqual(sanitizeLeadListView({}), DEFAULT_LEAD_LIST_VIEW);
  const bad = sanitizeLeadListView({
    search: 42,
    filters: { status: ["NEW"], hacked: ["x"], city: "Pune", presales: [1] },
    dateRange: { from: "01/10/2026" },
    sort: { field: "phone", direction: "asc" },
    page: 0,
  });
  assert.deepEqual(bad, { ...DEFAULT_LEAD_LIST_VIEW, filters: { status: ["NEW"] }, dateRange: { from: "", to: "" } });
});

test("clampPage and labels", () => {
  assert.equal(clampPage(5, 17, 8), 3);
  assert.equal(clampPage(0, 30, 8), 1);
  assert.equal(filterValueLabel("status", "UNDERQUALIFIED"), "Underqualified");
  assert.equal(filterValueLabel("lastCall", "CNC"), "Not connected (CNC)");
  assert.equal(filterValueLabel("country", "NOT_SET"), "Not set");
  assert.equal(filterValueLabel("presales", "u1", { u1: "Priya" }), "Priya");
  assert.equal(leadRowLabel({ customerName: "Asha Rao", companyName: "Sterling Pumps" }, "Pune"), "Asha Rao, Sterling Pumps, Pune");
});

test("phone search: digits only, last 10 for a full number, partial from 4 digits", () => {
  assert.equal(phoneDigitsQuery("+91 (98765) 43210"), "919876543210");
  assert.equal(phoneDigitsQuery("Asha 9876"), null, "letters make it a text search");
  assert.equal(phoneDigitsQuery("987"), null, "too few digits");
  assert.ok(phoneMatches("098765-43210", "919876543210"));
  assert.ok(phoneMatches("+91 98765 43210", "43210"));
  assert.ok(!phoneMatches("080 2233 4455", "9876543210"));
});

test("the local search (mock) finds every lead on one number, pages, and keeps totals", () => {
  const leads = [
    lead("a", { phone: "+91 98765 43210" }),
    lead("b", { phone: "098765-43210" }),
    lead("c", { phone: "022 4000 1000", alternatePhone: "(98765) 43210" }),
    lead("d", { phone: "080-2233-4455" }),
  ];
  for (const q of ["9876543210", "+91-98765-43210", "0 98765 43210"]) assert.deepEqual(ids(searchLeadsLocally(leads, { q })), ["a", "b", "c"], q);
  const p2 = searchLeadsLocally(leads, { q: "43210", pageSize: 2, page: 2, sort: "customerName", dir: "asc" });
  assert.equal(p2.total, 3);
  assert.deepEqual(ids(p2), ["c"]);
});

test("the local search filters by pre-sales people and counts each facet without its own filter", () => {
  const leads = [
    lead("a", { presales: [{ id: "priya", name: "Priya" }], status: "SALES_ASSIGNED", assignedToId: "sam", salesOwnerId: "sam", salesOwnerName: "Sam" }),
    lead("b", { presales: [{ id: "priya", name: "Priya" }, { id: "raj", name: "Raj" }], status: "PRE_SALES_ASSIGNED", assignedToId: "raj" }),
    lead("c", { status: "NEW" }),
  ];
  assert.deepEqual(ids(searchLeadsLocally(leads, { presalesUserId: ["raj"] })), ["b"]);
  assert.deepEqual(ids(searchLeadsLocally(leads, { salesUserId: ["sam"] })), ["a"]);
  const r = searchLeadsLocally(leads, { presalesUserId: ["raj"] });
  // the presales facet ignores the presales filter, so both people are still offered
  assert.deepEqual(r.facets.presales.map((p) => [p.value, p.count]), [["priya", 2], ["raj", 1]]);
  // other facets apply it: only B's status is counted
  assert.deepEqual(r.facets.status, [{ value: "PRE_SALES_ASSIGNED", count: 1 }]);
  assert.deepEqual(r.facets.assignment, [{ value: "assigned", count: 1 }]);
});

test("a call can be logged with only its outcome; other entries need a remark", () => {
  assert.deepEqual(validateLeadActivityInput({ activityType: "CALL", outcome: "NOT_CONNECTED" }), { activityType: "CALL", outcome: "NOT_CONNECTED", occurredAt: undefined });
  assert.throws(() => validateLeadActivityInput({ activityType: "CALL" }), /call outcome/);
  assert.throws(() => validateLeadActivityInput({ activityType: "MEETING", outcome: "CONNECTED", remarks: "x" }), /Only a call/);
  assert.throws(() => validateLeadActivityInput({ activityType: "EMAIL", remarks: "  " }), /short note/);
});

test("duplicate helpers", () => {
  assert.ok(probeIsWorthChecking({ phone: "98765 43210" }));
  assert.ok(probeIsWorthChecking({ email: "a@b.co" }));
  assert.ok(probeIsWorthChecking({ customerName: "Asha", companyName: "Sterling" }));
  assert.ok(!probeIsWorthChecking({ phone: "98765", customerName: "Asha" }));
  assert.equal(describeReasons(["PHONE", "NAME_AND_COMPANY"]), "same phone number, same name and company");
  assert.ok(isHidden({ hidden: true }) && !isHidden({ id: "x" } as { hidden?: boolean }));
});
