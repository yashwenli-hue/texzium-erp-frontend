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
    const quotation: Quotation = {
      id: mockId("Q"),
      quoteNo: `QT-${quoteCounter}`,
      customerName: opportunity.customerName,
      opportunityId: opportunity.id,
      opportunityName: opportunity.title,
      amount: input.amount,
      status: "Draft",
      validUntil: input.validUntil,
      ownerName: opportunity.ownerName,
      createdAt: now,
      version: 1,
      revisions: [{ version: 1, amount: input.amount, createdAt: now }],
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
      status: "Revised",
      version: nextVersion,
      revisions: [...existing.revisions, { version: nextVersion, amount, createdAt: now, note }],
    });
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return delay(updated);
  }

  async approve(id: ID): Promise<Quotation> {
    const updated = db.quotations.update(id, { status: "Approved" });
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return delay(updated);
  }
}
