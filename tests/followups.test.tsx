import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { FollowupWorkItem } from "../lib/types/domain";

mock.module(new URL("../components/ui/Toast.tsx", import.meta.url).href, {
  namedExports: { useToast: () => ({ success: () => 0, error: () => 0, info: () => 0, show: () => 0, dismiss: () => {} }) },
});

const { followupBucket, filterWorklist, groupWorklist, isActionable } = await import("../lib/repository/shared/followupWorklist");
const { mapFollowupWorkItem } = await import("../lib/repository/real/mappers");
const { FollowupActions } = await import("../components/followups/FollowupActions");
const { Chip } = await import("../components/ui/Tag");
const { NAV_SECTIONS } = await import("../lib/pageMeta");
const { visibleNavSections } = await import("../lib/navVisibility");

const html = (el: JSX.Element) => renderToStaticMarkup(el);
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const NOW = new Date(2026, 9, 18, 12, 0);
const at = (d: number, h: number) => new Date(2026, 9, d, h, 0).toISOString();

function item(id: string, followupDate: string, over: Partial<FollowupWorkItem> = {}, lead: Partial<FollowupWorkItem["lead"]> = {}): FollowupWorkItem {
  return {
    id,
    leadId: `L-${id}`,
    followupDate,
    status: "PENDING",
    createdAt: at(1, 9),
    updatedAt: at(1, 9),
    ...over,
    lead: { id: `L-${id}`, customerName: `Lead ${id}`, companyName: "Texmac", phone: "+91 98450 12345", status: "CONTACTED", isActive: true, assignedToId: "u1", ...lead },
  };
}

test("buckets: late, due later today, after today; anything not pending is closed", () => {
  assert.equal(followupBucket(item("a", at(18, 9)), NOW), "OVERDUE");
  assert.equal(followupBucket(item("b", at(17, 15)), NOW), "OVERDUE");
  assert.equal(followupBucket(item("c", at(18, 18)), NOW), "TODAY");
  assert.equal(followupBucket(item("d", at(19, 9)), NOW), "UPCOMING");
  assert.equal(followupBucket(item("e", at(10, 9), { status: "COMPLETED" }), NOW), "CLOSED");
  assert.equal(followupBucket(item("f", at(25, 9), { status: "CANCELLED" }), NOW), "CLOSED");
});

test("only a pending follow-up of an active lead can be acted on (the backend refuses the rest)", () => {
  assert.equal(isActionable(item("a", at(18, 9))), true);
  assert.equal(isActionable(item("b", at(18, 9), { status: "COMPLETED" })), false);
  assert.equal(isActionable(item("c", at(18, 9), {}, { isActive: false })), false);
});

test("filters: mine, deactivated leads hidden unless asked for, search by name, company, remarks or phone digits", () => {
  const rows = [
    item("a", at(18, 9), { remarks: "Send the loom catalogue" }),
    item("b", at(18, 9), {}, { assignedToId: "u2", customerName: "Ravi", companyName: undefined, phone: "080-4000 1234" }),
    item("c", at(18, 9), {}, { isActive: false }),
  ];
  assert.deepEqual(filterWorklist(rows, {}).map((r) => r.id), ["a", "b"]);
  assert.deepEqual(filterWorklist(rows, { showInactive: true }).map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(filterWorklist(rows, { mineOf: "u2" }).map((r) => r.id), ["b"]);
  assert.deepEqual(filterWorklist(rows, { search: "catalogue" }).map((r) => r.id), ["a"]);
  assert.deepEqual(filterWorklist(rows, { search: "ravi" }).map((r) => r.id), ["b"]);
  assert.deepEqual(filterWorklist(rows, { search: "4000 1234" }).map((r) => r.id), ["b"]);
  assert.deepEqual(filterWorklist(rows, { search: "98450" }).map((r) => r.id), ["a"]);
  // a short number is not treated as a phone search
  assert.deepEqual(filterWorklist(rows, { search: "12" }).map((r) => r.id), []);
});

test("groups: most overdue first, finished ones newest first and capped", () => {
  const closed = Array.from({ length: 25 }, (_, i) => item(`z${i}`, at(1, 9), { status: "COMPLETED", completedAt: new Date(2026, 9, 1, i).toISOString() }));
  const g = groupWorklist([item("late2", at(18, 10)), item("late1", at(16, 9)), item("up", at(20, 9)), ...closed], NOW, 20);
  assert.deepEqual(g.OVERDUE.map((r) => r.id), ["late1", "late2"]);
  assert.deepEqual(g.UPCOMING.map((r) => r.id), ["up"]);
  assert.equal(g.CLOSED.length, 20);
  assert.equal(g.CLOSED[0].id, "z24");
});

test("GET /lead-followups rows map to the worklist shape, keeping only what is shown", () => {
  const mapped = mapFollowupWorkItem({
    id: "f1",
    leadId: "l1",
    followupDate: "2026-10-18T06:30:00.000Z",
    remarks: null,
    status: "PENDING",
    completedAt: null,
    completedBy: null,
    createdAt: "2026-10-10T00:00:00.000Z",
    updatedAt: "2026-10-10T00:00:00.000Z",
    lead: { id: "l1", customerName: "Asha", companyName: null, phone: "9845012345", sourceId: "s1", status: "SALES_ASSIGNED", assignedToId: null, isActive: false, createdAt: "", updatedAt: "" } as never,
  });
  assert.deepEqual(mapped.lead, { id: "l1", customerName: "Asha", companyName: undefined, phone: "9845012345", status: "SALES_ASSIGNED", isActive: false, assignedToId: null });
  assert.equal(mapped.remarks, undefined);
});

test("follow-up actions: three labelled buttons naming the lead; nothing is cancelled without asking", () => {
  const out = html(<FollowupActions followup={item("a", at(18, 9))} leadName="Asha" onComplete={async () => {}} onReschedule={async () => {}} onCancel={async () => {}} />);
  assert.match(out, /aria-label="Complete the follow-up with Asha"/);
  assert.match(out, /aria-label="Reschedule the follow-up with Asha"/);
  assert.match(out, /aria-label="Cancel the follow-up with Asha"/);
  const fa = src("components/followups/FollowupActions.tsx");
  // cancel goes through a confirmation; only that dialog calls onCancel
  assert.equal((fa.match(/onCancel\(/g) ?? []).length, 1);
  assert.match(fa, /<ConfirmDialog[\s\S]*onCancel\(followup\.id\)/);
});

test("chips that act are toggle buttons (Enter/Space work, state is announced); passive chips stay text", () => {
  assert.equal(html(<Chip label="Mine" active onClick={() => {}} />), '<button type="button" class="chip active" aria-pressed="true">Mine</button>');
  assert.equal(html(<Chip label="All" onClick={() => {}} />), '<button type="button" class="chip " aria-pressed="false">All</button>');
  assert.equal(html(<Chip label="Info" />), '<span class="chip ">Info</span>');
});

test("navigation: Follow-ups needs leads.followups.view; sample-data screens are grouped as Previews", () => {
  const followups = NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.href === "/tasks")!;
  assert.equal(followups.label, "Follow-ups");
  assert.equal(followups.permission, "leads.followups.view");
  assert.equal(followups.countKey, undefined);
  const previews = NAV_SECTIONS.find((s) => s.label === "Previews")!;
  assert.deepEqual(previews.items.map((i) => i.href), ["/contacts", "/activities", "/notes"]);
  const without = visibleNavSections(NAV_SECTIONS, (p) => p !== "leads.followups.view");
  assert.ok(!without.flatMap((s) => s.items).some((i) => i.href === "/tasks"));
});

test("the dashboard and Follow-ups use real follow-ups, not the sample task list", () => {
  for (const p of ["app/dashboard/page.tsx", "app/tasks/page.tsx"]) {
    assert.doesNotMatch(src(p), /useTasks/, p);
    assert.match(src(p), /useFollowupWorklist/, p);
  }
  for (const p of ["app/contacts/page.tsx", "app/notes/page.tsx", "app/activities/page.tsx"]) {
    assert.match(src(p), /<PreviewNotice /, p);
  }
});
