import { ID, ListQuery, Page } from "../../types/common";
import { Quotation } from "../../types/domain";
import {
  IQuotationRepository,
  CreateQuotationInput,
  QuotationSortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Quotation)[] = ["quoteNo", "customerName", "opportunityName", "ownerName"];

let quoteCounter = 3420;

export class MockQuotationRepository implements IQuotationRepository {
  async list(query?: ListQuery<QuotationSortField>): Promise<Page<Quotation>> {
    return delay(applyListQuery(db.quotations.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<Quotation | null> {
    return delay(db.quotations.getById(id) ?? null);
  }

  async create(input: CreateQuotationInput): Promise<Quotation> {
    const opportunity = db.opportunities.getById(input.opportunityId);
    if (!opportunity) throw new Error(`Opportunity ${input.opportunityId} not found`);
    quoteCounter += 1;
    const now = new Date().toISOString();
    // Mock has no HSN/GST-rate master data to replicate the real tax calc —
    // this is a presentation-only taxable-amount estimate, same spirit as
    // the real backend's own calculation but without a GST rate applied.
    const amount = input.quantity * input.unitPrice;
    const quotation: Quotation = {
      id: mockId("Q"),
      quoteNo: `QT-${quoteCounter}`,
      customerName: opportunity.customerName,
      opportunityId: opportunity.id,
      opportunityName: opportunity.title,
      amount,
      status: "DRAFT",
      validUntil: null,
      ownerName: opportunity.ownerName,
      createdAt: now,
      version: 1,
      revisions: [{ version: 1, amount, createdAt: now }],
      quoteDate: input.quoteDate,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      taxableAmount: amount,
      totalAmount: amount,
    };
    db.quotations.add(quotation);
    return delay(quotation);
  }

  async revise(id: ID, amount: number, note?: string): Promise<Quotation> {
    const existing = db.quotations.getById(id);
    if (!existing) throw new Error(`Quotation ${id} not found`);
    const now = new Date().toISOString();
    const nextVersion = existing.version + 1;
    const updated = db.quotations.update(id, {
      amount,
      status: "REVISED",
      version: nextVersion,
      revisions: [...existing.revisions, { version: nextVersion, amount, createdAt: now, note }],
    });
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return delay(updated);
  }

  async approve(id: ID): Promise<Quotation> {
    const updated = db.quotations.update(id, { status: "APPROVED" });
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return delay(updated);
  }

  async convert(id: ID): Promise<Quotation> {
    // Mock-only: unlike the real backend (which creates a SalesOrder but
    // leaves Quotation.status untouched), the mock has no Sales Order
    // concept at all, so it's free to show the master plan's documented
    // terminal state for demo purposes.
    const updated = db.quotations.update(id, { status: "CONVERTED" });
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return delay(updated);
  }
}
