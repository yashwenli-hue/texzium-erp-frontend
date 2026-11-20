import { test } from "node:test";
import assert from "node:assert/strict";
import type { Lead, LeadFollowup, LeadOpportunity } from "../lib/types/domain";
import { dealsByStage, focusTasks, leadToWinConversion, myOpenLeads, pipelineDeals, workStatus } from "../lib/presalesDashboard";

const ME = "u-presales";
const OTHER = "u-other";
// Relative to today: classifyFollowup (lib/followup.ts) reads the real clock.
const NOW = new Date();
const at = (days: number, hour = 11) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const followup = (id: string, days: number, status: LeadFollowup["status"] = "PENDING", remarks?: string): LeadFollowup => ({
  id,
  leadId: "x",
  followupDate: at(days),
  remarks,
  status,
  createdAt: at(-3),
  updatedAt: at(-3),
});
const deal = (id: string, stage: LeadOpportunity["stage"], value: number): LeadOpportunity => ({
  id,
  title: `Deal ${id}`,
  stage,
  expectedValue: value,
  probability: 50,
  createdAt: at(-2),
});
const lead = (id: string, over: Partial<Lead> = {}): Lead => ({
  id,
  customerName: `Person ${id}`,
  companyName: `Company ${id}`,
  phone: "9000000000",
  sourceId: "s1",
  sourceName: "Website",
  status: "PRE_SALES_ASSIGNED",
  isActive: true,
  assignedToId: ME,
  createdAt: at(-5),
  updatedAt: at(-1),
  lastActivityAt: at(-1),
  followups: [],
  opportunities: [],
  ...over,
});

// The leads a Pre-Sales user receives from GET /leads: theirs, and ones they handed on.
const LEADS: Lead[] = [
  lead("new", { status: "PRE_SALES_ASSIGNED" }),
  lead("overdue", { status: "CONTACTED", followups: [followup("f1", -2, "PENDING", "Send brochure")] }),
  lead("today", { status: "CONTACTED", followups: [followup("f2", 0, "PENDING", "Call back at 4")] }),
  lead("tomorrow", { status: "PRE_SALES_ASSIGNED", followups: [followup("f3", 1)] }),
  lead("later", { status: "CONTACTED", followups: [followup("f4", 20)] }),
  lead("done-call", { status: "CONTACTED", followups: [followup("f5", -1, "COMPLETED")] }),
  lead("under", { status: "UNDERQUALIFIED" }),
  lead("rejected", { status: "REJECTED" }),
  lead("to-sales", { status: "SALES_ASSIGNED", assignedToId: OTHER, opportunities: [deal("o1", "PROPOSAL", 400000)] }),
  lead("to-sales-2", { status: "SALES_ASSIGNED", assignedToId: OTHER }),
  lead("won", { status: "SALES_ASSIGNED", assignedToId: OTHER, opportunities: [deal("o2", "WON", 500000), deal("o3", "NEGOTIATION", 100000)] }),
  lead("someone-elses-open", { status: "CONTACTED", assignedToId: OTHER, followups: [followup("f6", -1)] }),
  lead("deactivated", { status: "CONTACTED", isActive: false, followups: [followup("f7", -1)] }),
];

test("only leads assigned to me and still in Pre-Sales are mine to work", () => {
  assert.deepEqual(
    myOpenLeads(LEADS, ME).map((l) => l.id),
    ["new", "overdue", "today", "tomorrow", "later", "done-call", "under"]
  );
});

test("work status counts my open leads, my follow-ups and what I handed on", () => {
  assert.deepEqual(workStatus(LEADS, ME), {
    open: 7,
    notContacted: 2, // "new" and "tomorrow" (not yet contacted)
    followupsToday: 1,
    followupsOverdue: 1, // the other person's and the deactivated lead's do not count
    handedOver: 3,
    rejected: 1,
  });
});

test("focus tasks: overdue, today, new leads, decisions, tomorrow, then the next week", () => {
  const tasks = focusTasks(LEADS, ME, NOW);
  assert.deepEqual(
    tasks.map((t) => [t.kind, t.leadId]),
    [
      ["overdue", "overdue"],
      ["today", "today"],
      ["new", "new"],
      ["decide", "under"],
      ["tomorrow", "tomorrow"],
    ]
  );
  assert.equal(tasks[0].title, "Send brochure");
  assert.equal(tasks[0].leadName, "Company overdue");
  // a follow-up 20 days away, a completed one, and other people's are not today's focus
  assert.ok(!tasks.some((t) => ["later", "done-call", "someone-elses-open", "deactivated"].includes(t.leadId)));
});

test("a follow-up without remarks still reads as a task", () => {
  const [t] = focusTasks([lead("a", { followups: [followup("f", 0)] })], ME, NOW);
  assert.equal(t.title, "Follow-up call");
});

test("the pipeline is every opportunity opened from my leads, by stage", () => {
  const deals = pipelineDeals(LEADS);
  assert.deepEqual(deals.map((d) => [d.id, d.leadId]), [["o1", "to-sales"], ["o2", "won"], ["o3", "won"]]);
  assert.deepEqual(dealsByStage(deals), {
    PROPOSAL: { count: 1, value: 400000 },
    WON: { count: 1, value: 500000 },
    NEGOTIATION: { count: 1, value: 100000 },
  });
});

test("lead-to-win conversion: handled, qualified to Sales, opportunity opened, won", () => {
  assert.deepEqual(leadToWinConversion(LEADS), [
    { label: "Leads I handled", count: 12 }, // every lead but the deactivated one (a rejected lead still counts)
    { label: "Qualified to Sales", count: 3, rate: 25 },
    { label: "Opportunity opened", count: 2, rate: 67 },
    { label: "Won", count: 1, rate: 50 },
  ]);
});

test("with no leads everything is zero, never a division by zero", () => {
  assert.deepEqual(leadToWinConversion([]).map((s) => s.rate ?? 0), [0, 0, 0, 0]);
  assert.deepEqual(workStatus([], ME), { open: 0, notContacted: 0, followupsToday: 0, followupsOverdue: 0, handedOver: 0, rejected: 0 });
  assert.deepEqual(focusTasks([], ME, NOW), []);
});
