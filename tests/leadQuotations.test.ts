import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/repository/mock/db";
import { MockLeadQuotationRepository } from "../lib/repository/mock/mockLeadQuotationRepository";

test("a lead's quotations come back with their progress and products, and no price at all", async () => {
  const quoted = db.quotations.getAll().find((q) => q.opportunityId && db.opportunities.getById(q.opportunityId)?.leadId);
  assert.ok(quoted, "the mock data has a quotation on a lead's opportunity");
  const leadId = db.opportunities.getById(quoted!.opportunityId!)!.leadId!;

  const rows = await new MockLeadQuotationRepository().listForLead(leadId);
  assert.ok(rows.some((r) => r.id === quoted!.id));
  for (const r of rows) {
    assert.ok(r.progressLabel.length > 0);
    assert.equal(typeof r.opportunity.title, "string");
  }
  const text = JSON.stringify(rows);
  for (const word of ["amount", "Amount", "unitRate", "unitPrice", "gst", "total"]) assert.ok(!text.includes(word), `no "${word}"`);
});

test("a lead with no opportunities has no quotations", async () => {
  const withoutDeals = db.leads.getAll().find((l) => !db.opportunities.getAll().some((o) => o.leadId === l.id));
  assert.ok(withoutDeals);
  assert.deepEqual(await new MockLeadQuotationRepository().listForLead(withoutDeals!.id), []);
});
