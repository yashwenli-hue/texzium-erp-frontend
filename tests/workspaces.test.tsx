import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { LeadFollowup, LeadTimelineEntry, LeadStatus } from "../lib/types/domain";

mock.module("next/navigation", { namedExports: { useRouter: () => ({ back: () => {}, push: () => {} }), usePathname: () => "/" } });

const { leadAttention, leadActionStates, leadJourney, lastCallOf, leadPermissions } = await import("../lib/repository/shared/leadWorkspace");
const { opportunityAttention, nextStageOf, QUIET_DAYS } = await import("../lib/repository/shared/opportunityWorkspace");
const { PRESALES_QUEUES, activeQueue, queueCountQuery } = await import("../lib/repository/shared/presalesQueues");
const { neighboursIn, sanitizeSequence } = await import("../lib/ui/recordSequence");
const { RecordJourney } = await import("../components/ui/RecordJourney");
const { QueueBar } = await import("../components/ui/QueueBar");
const { NextUp } = await import("../components/ui/NextUp");

const html = (el: JSX.Element) => renderToStaticMarkup(el);
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const NOW = new Date(2026, 9, 18, 12, 0);
const iso = (d: number, h = 10) => new Date(2026, 9, d, h).toISOString();
const ALL = leadPermissions(() => true);
const NONE = leadPermissions(() => false);

const lead = (status: LeadStatus, over: Record<string, unknown> = {}) => ({ status, isActive: true, assignedToId: undefined as string | undefined, assignedToName: undefined as string | undefined, customerName: "Asha", deactivationReason: undefined, ...over });
const call = (outcome: "CONNECTED" | "NOT_CONNECTED", d: number): LeadTimelineEntry => ({ id: `c${d}`, leadId: "l", source: "EMPLOYEE", activityType: "CALL", outcome, icon: "phone", title: "Call", detail: "", actorName: "Priya", occurredAt: iso(d) });
const fu = (d: number, status: LeadFollowup["status"] = "PENDING"): LeadFollowup => ({ id: `f${d}`, leadId: "l", followupDate: iso(d), status, createdAt: iso(1), updatedAt: iso(1) });
const ctx = (over: Record<string, unknown> = {}) => ({ lead: lead("NEW"), followups: [] as LeadFollowup[], timeline: [] as LeadTimelineEntry[], opportunities: [] as Array<{ id: string; title: string; stage: "QUALIFIED" }>, potentialDuplicates: 0, may: ALL, now: NOW, ...over }) as never;
const keys = (items: Array<{ key: string }>) => items.map((i) => i.key);

// ------------------------------------------------------------------ lead: what next

test("a new, unowned lead: assign it, log the first call, schedule a follow-up — in that order of urgency", () => {
  const items = leadAttention(ctx());
  assert.deepEqual(keys(items), ["unassigned", "no-call", "no-followup"]);
  assert.deepEqual(items[0].cta?.action, { type: "assign" });
  assert.equal(items[0].cta?.enabled, true);
});

test("an overdue follow-up comes first; a CNC asks for a follow-up when none is scheduled", () => {
  const overdue = leadAttention(ctx({ lead: lead("CONTACTED", { assignedToId: "u" }), followups: [fu(17)], timeline: [call("CONNECTED", 16)] }));
  assert.equal(overdue[0].key, "overdue");
  assert.equal(overdue[0].tone, "bad");
  const cnc = leadAttention(ctx({ lead: lead("PRE_SALES_ASSIGNED", { assignedToId: "u" }), timeline: [call("NOT_CONNECTED", 17)] }));
  const c = cnc.find((i) => i.key === "cnc")!;
  assert.equal(c.cta?.label, "Schedule follow-up");
  assert.ok(!keys(cnc).includes("no-followup"), "not asked twice");
  assert.ok(!keys(cnc).includes("decide"), "no qualify prompt after a failed call");
});

test("after a connected call it suggests deciding, but nothing is qualified until the person confirms", () => {
  const items = leadAttention(ctx({ lead: lead("CONTACTED", { assignedToId: "u" }), followups: [fu(20)], timeline: [call("CONNECTED", 17)] }));
  const d = items.find((i) => i.key === "decide")!;
  assert.deepEqual(d.cta?.action, { type: "qualify" }, "only opens the existing Qualify dialog");
});

test("without a permission the suggestion stays, disabled, with the permission it needs", () => {
  const items = leadAttention(ctx({ may: NONE }));
  const a = items.find((i) => i.key === "unassigned")!;
  assert.equal(a.cta?.enabled, false);
  assert.match(a.cta?.reason ?? "", /leads\.assign/);
});

test("qualified without an opportunity → create it; with one → open it; rejected → reopen; deactivated → only reactivate", () => {
  assert.equal(leadAttention(ctx({ lead: lead("SALES_ASSIGNED", { assignedToId: "u" }) }))[0].key, "convert");
  const withOpp = leadAttention(ctx({ lead: lead("SALES_ASSIGNED", { assignedToId: "u" }), opportunities: [{ id: "o1", title: "Loom", stage: "QUALIFIED" }] }));
  assert.deepEqual(withOpp.find((i) => i.key === "opportunity")?.cta?.action, { type: "open", href: "/opportunities/o1" });
  assert.deepEqual(keys(leadAttention(ctx({ lead: lead("REJECTED") }))), ["rejected"]);
  const off = leadAttention(ctx({ lead: lead("CONTACTED", { isActive: false, deactivationReason: "Spam" }) }));
  assert.deepEqual(keys(off), ["inactive"]);
  assert.match(off[0].detail ?? "", /Spam/);
});

test("possible duplicates are pointed out, never acted on", () => {
  const d = leadAttention(ctx({ potentialDuplicates: 2 })).find((i) => i.key === "duplicates")!;
  assert.deepEqual(d.cta?.action, { type: "open", href: "#duplicates" });
  assert.match(d.detail ?? "", /Nothing has been merged or changed/);
});

test("lead actions: only those the status allows are offered; unassign only from Pre Sales Assigned; a deactivated lead can only be reactivated or deleted", () => {
  const s = leadActionStates({ lead: lead("NEW"), may: ALL } as never);
  assert.equal(s.assign.available, true);
  assert.equal(s.unassign.available, false);
  assert.equal(s.reopen.available, false);
  assert.equal(s.convert.available, false);
  assert.equal(leadActionStates({ lead: lead("PRE_SALES_ASSIGNED", { assignedToId: "u" }), may: ALL } as never).unassign.available, true);
  assert.equal(leadActionStates({ lead: lead("SALES_ASSIGNED"), may: ALL } as never).assign.available, false);
  const off = leadActionStates({ lead: lead("CONTACTED", { isActive: false }), may: ALL } as never);
  assert.equal(off.qualify.enabled, false);
  assert.equal(off.qualify.reason, "Reactivate this lead first.");
  assert.equal(off.reactivate.available && off.reactivate.enabled, true);
  const noPerm = leadActionStates({ lead: lead("NEW"), may: NONE } as never);
  assert.equal(noPerm.qualify.enabled, false);
  // every action the role lacks shares one wording, so the page groups them on one line
  assert.equal(noPerm.qualify.reason, noPerm.reject.reason);
  assert.match(noPerm.qualify.reason ?? "", /Not part of your role/);
});

test("the last call is the latest logged call, whatever order the history comes in", () => {
  assert.equal(lastCallOf([call("CONNECTED", 10), call("NOT_CONNECTED", 15), call("CONNECTED", 12)])?.outcome, "NOT_CONNECTED");
  assert.equal(lastCallOf([]), null);
});

test("journey: where the lead is, with the opportunity as a link", () => {
  const steps = leadJourney({ status: "SALES_ASSIGNED", assignedToName: "Sam" }, { id: "o1", title: "Loom", stage: "PROPOSAL" as never }, 0);
  assert.deepEqual(steps.map((s) => s.state), ["done", "done", "done", "current", "todo"]);
  assert.equal(steps[3].href, "/opportunities/o1");
  assert.equal(steps[3].detail, "Stage: Proposal");
  const fresh = leadJourney({ status: "NEW", assignedToName: undefined }, undefined, 0);
  assert.deepEqual(fresh.map((s) => s.state), ["current", "todo", "todo", "todo", "todo"]);
  const rejected = leadJourney({ status: "REJECTED", assignedToName: undefined }, undefined, 0);
  assert.equal(rejected[1].state, "stopped");
  assert.equal(rejected[1].detail, "Rejected");
  const out = html(<RecordJourney steps={steps} />);
  assert.match(out, /<ol class="journey" aria-label="Sales journey">/);
  assert.match(out, /<li class="j-current" aria-current="step"><a class="j-link" href="\/opportunities\/o1">/);
});

// ------------------------------------------------------------------ opportunity: what next

const opp = (over: Record<string, unknown> = {}) => ({ stage: "QUALIFIED", customerId: "c1", expectedCloseDate: iso(30), title: "Loom", ...over });
const octx = (over: Record<string, unknown> = {}) =>
  ({ opportunity: opp(), leadActive: true, quotations: [], timeline: [call("CONNECTED", 17)], may: { editStage: true, editOpportunity: true, createQuotation: true, logActivity: true }, linkState: { enabled: true }, now: NOW, ...over }) as never;

test("opportunity: no customer blocks quoting; with a customer and no quotation, quote; otherwise the latest quotation's next step", () => {
  // even on a quiet deal, the missing customer comes first: it blocks every commercial step
  const a = opportunityAttention(octx({ opportunity: opp({ customerId: undefined }), timeline: [] }));
  assert.equal(a[0].key, "no-customer");
  assert.match(a[0].detail ?? "", /never creates or merges a customer/);
  assert.equal(opportunityAttention(octx())[0].key, "quote");
  const q = opportunityAttention(octx({ quotations: [{ id: "q1", quoteNo: "QT1", status: "DRAFT", createdAt: iso(10), next: { label: "Needs approval", tone: "action" } }] }));
  assert.equal(q[0].title, "QT1: Needs approval");
  assert.deepEqual(q[0].cta?.action, { type: "open", href: "/quotations/q1" });
});

test("opportunity: a passed close date and a quiet deal are flagged; a closed deal is only summarised", () => {
  const late = opportunityAttention(octx({ opportunity: opp({ expectedCloseDate: iso(10) }), timeline: [] }));
  assert.ok(keys(late).includes("close-passed"));
  assert.ok(keys(late).includes("quiet"));
  const recent = opportunityAttention(octx({ timeline: [call("CONNECTED", 18 - (QUIET_DAYS - 1))] }));
  assert.ok(!keys(recent).includes("quiet"));
  assert.deepEqual(keys(opportunityAttention(octx({ opportunity: opp({ stage: "WON" }) }))), ["final"]);
});

test("opportunity: the next stage is offered only where the stage rules allow it, and needs opportunities.edit", () => {
  assert.equal(nextStageOf("WON" as never), undefined);
  const items = opportunityAttention(octx({ may: { editStage: false, editOpportunity: false, createQuotation: false, logActivity: false } }));
  const next = items.find((i) => i.key === "next-stage")!;
  assert.equal(next.cta?.enabled, false);
  assert.match(next.cta?.reason ?? "", /opportunities\.edit/);
});

// ------------------------------------------------------------------ pre-sales queues

test("queues are presets of existing server filters; the active one is recognised; 'Worked by me' needs a signed-in person", () => {
  const unowned = PRESALES_QUEUES.find((q) => q.key === "unowned")!;
  assert.deepEqual(unowned.filters(null), { stage: ["PRE_QUALIFICATION"], assignment: ["unassigned"] });
  assert.equal(activeQueue({ assignment: ["unassigned"], stage: ["PRE_QUALIFICATION"] }, null)?.key, "unowned");
  assert.equal(activeQueue({ stage: ["PRE_QUALIFICATION"], assignment: ["unassigned"], source: ["x"] }, null), undefined);
  assert.equal(activeQueue({}, null)?.key, "all");
  assert.equal(PRESALES_QUEUES.find((q) => q.key === "mine")!.filters(null), null);
  const query = queueCountQuery(PRESALES_QUEUES.find((q) => q.key === "due")!, "u1", { showDeactivated: false })!;
  assert.deepEqual([query.stage, query.followup, query.pageSize], [["PRE_QUALIFICATION"], ["Overdue", "Due Today"], 1]);
  assert.equal(queueCountQuery(PRESALES_QUEUES.find((q) => q.key === "mine")!, "u1", { showDeactivated: false })!.presalesUserId?.[0], "u1");
});

test("queue bar: toggle buttons with counts; an unknown count is shown as such", () => {
  const out = html(<QueueBar items={[{ key: "a", label: "Needs an owner", hint: "h", count: 3 }, { key: "b", label: "All", hint: "h" }]} active="a" onSelect={() => {}} />);
  assert.match(out, /role="group" aria-label="Work queues"/);
  assert.match(out, /class="queue active" aria-pressed="true"/);
  assert.match(out, /aria-label="3 leads">3</);
  assert.match(out, /aria-label="count unavailable">–</);
});

// ------------------------------------------------------------------ record sequence

test("previous / next come from the list the record was opened from; tampered storage is ignored", () => {
  const seq = { ids: ["a", "b", "c"], from: "/presales", label: "Pre-Sales · Needs an owner" };
  assert.deepEqual(neighboursIn(seq, "b"), { prev: "a", next: "c", position: 2, total: 3, from: "/presales", label: "Pre-Sales · Needs an owner" });
  assert.equal(neighboursIn(seq, "z"), null);
  assert.equal(sanitizeSequence({ ids: ["a"], from: "https://evil.example", label: "x" }), null);
  assert.equal(sanitizeSequence({ ids: ["a"], from: "//evil.example", label: "x" }), null);
  assert.deepEqual(sanitizeSequence({ ids: ["a", 5, ""], from: "/leads", label: "Leads" })?.ids, ["a"]);
});

// ------------------------------------------------------------------ shared next-up and page wiring

test("Next up is generic: a page's own action comes back to it; links stay links", () => {
  const out = html(<NextUp items={[{ key: "x", tone: "action", title: "Assign it", cta: { label: "Assign", action: { type: "assign" }, enabled: false, reason: "Needs leads.assign" } }, { key: "y", tone: "info", title: "Deal", cta: { label: "Open", action: { type: "open", href: "/opportunities/o1" }, enabled: true } }]} onAction={() => {}} />);
  assert.match(out, /<button class="btn primary " disabled="" aria-describedby="nu-why-x">Assign<\/button><span id="nu-why-x" class="nu-why">Needs leads.assign<\/span>/);
  assert.match(out, /<a class="nu-link" href="\/opportunities\/o1">Open<\/a>/);
});

test("the lead and opportunity pages use the shared workspace: next up, journey, list pager, grouped actions", () => {
  const leadPage = src("app/leads/[id]/page.tsx");
  for (const s of ["<NextUp items={attention}", "<RecordJourney steps={journey}", '<RecordPager kind="lead"', "<ActionMenu items={menuItems}", 'testId="lead-work-actions"', 'testId="lead-lifecycle-actions"', 'id="duplicates"', "ws-mobilebar"]) assert.ok(leadPage.includes(s), s);
  // every lifecycle change still goes through its existing dialog
  for (const s of ["<AssignLeadDialog", "<QualifyLeadDialog", 'title="Reject Lead"', 'title="Reopen Lead"', "<StatusMoveDialog", "<DeactivateLeadDialog", "<DeleteRecordDialog"]) assert.ok(leadPage.includes(s), s);
  const oppPage = src("app/opportunities/[id]/page.tsx");
  for (const s of ["<NextUp items={attention}", '<RecordPager kind="opportunity"', "<OpportunityStageDialog", "<LinkCustomerDialog", 'testId="opportunity-stage-actions"']) assert.ok(oppPage.includes(s), s);
  for (const s of ["<QueueBar", "rememberSequence(\"lead\""]) assert.ok(src("app/presales/page.tsx").includes(s), s);
});

test("a people list the backend refused is reported as such, not as 'nobody available'", async () => {
  const { peopleListProblem } = await import("../lib/hooks/useAssignableUsers");
  assert.equal(peopleListProblem(null), null);
  assert.match(peopleListProblem(Object.assign(new Error("x"), { status: 403 })) ?? "", /users\.view/);
  assert.match(peopleListProblem(new Error("network")) ?? "", /Couldn't load/);
  for (const p of ["components/forms/AssignLeadDialog.tsx", "components/forms/QualifyLeadDialog.tsx"]) assert.match(src(p), /listProblem \? \(/, p);
});

test("a refused lead or opportunity page says which access it needs, without a pointless Retry", () => {
  for (const [p, perm] of [["app/leads/[id]/page.tsx", "leads.view"], ["app/opportunities/[id]/page.tsx", "opportunities.view"]]) {
    const s = src(p);
    assert.match(s, /const forbidden = \(error as \{ status\?: number \} \| null\)\?\.status === 403;/, p);
    assert.ok(s.includes(`needs the ${perm} permission`), p);
    assert.match(s, /forbidden \? undefined : \(/, p);
  }
});

test("when the lead's deals can't be read, nothing suggests creating one (it could duplicate a deal)", () => {
  const hidden = leadAttention(ctx({ lead: lead("SALES_ASSIGNED", { assignedToId: "u" }), dealsKnown: false }));
  assert.ok(!keys(hidden).includes("convert"));
  assert.ok(keys(hidden).includes("deals-hidden"));
  const steps = leadJourney({ status: "SALES_ASSIGNED", assignedToName: "Sam" }, undefined, 0, false);
  assert.equal(steps[3].detail, "Not visible to you");
  const page = src("app/leads/[id]/page.tsx");
  assert.ok(page.includes('!(k === "convert" && (primaryOpportunity || !dealsKnown))'));
  assert.ok(page.includes("needs the opportunities.view permission. One may already exist."));
});

test("when a deal's quotations can't be read, no quotation is suggested", () => {
  const items = opportunityAttention(octx({ quotationsKnown: false }));
  assert.ok(!keys(items).includes("quote"));
  assert.ok(keys(items).includes("quotes-hidden"));
  const page = src("app/opportunities/[id]/page.tsx");
  assert.ok(page.includes("mayQuote && quotationsKnown ?"));
  assert.ok(page.includes("needs the quotations.view permission. One may already exist."));
});
