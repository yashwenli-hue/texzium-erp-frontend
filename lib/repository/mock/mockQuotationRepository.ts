import { ID, ListQuery, Page } from "../../types/common";
import { Quotation, SalesOrder } from "../../types/domain";
import {
  IQuotationRepository,
  CreateQuotationInput,
  QuotationSortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

let mockOrderCounter = 5090;

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
    // Mock has no HSN/GST-rate master data, so it never computes or sets
    // taxableAmount/gstPercent/gstAmount/totalAmount — those are backend-
    // computed real fields only (see Quotation in lib/types/domain.ts).
    // `amount` here is a plain quantity × unit price presentation estimate,
    // not a tax calculation. Whether to treat that as authoritative is
    // decided by repo.kind in the UI, never by which optional fields happen
    // to be set on the object.
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

  async convert(id: ID): Promise<{ quotation: Quotation; salesOrderId: ID }> {
    const existing = db.quotations.getById(id);
    if (!existing) throw new Error(`Quotation ${id} not found`);
    const now = new Date().toISOString();
    mockOrderCounter += 1;
    // Mirrors the real quotationsService.convertToSalesOrder(): a Sales
    // Order linked by quotationId, status OPEN, no proforma involved. Unlike
    // the real backend (which leaves Quotation.status untouched), the mock
    // is free to show the master plan's documented terminal state for demo
    // purposes — that divergence is mock-only, same as before this change.
    const salesOrder: SalesOrder = {
      id: mockId("SO"),
      salesOrderCode: `SO-${mockOrderCounter}`,
      orderDate: now,
      totalAmount: existing.amount,
      status: "OPEN",
      quotationId: existing.id,
      quoteNo: existing.quoteNo,
      opportunityId: existing.opportunityId,
      opportunityName: existing.opportunityName,
      customerName: existing.customerName,
      ownerName: existing.ownerName,
      createdAt: now,
    };
    db.salesOrders.add(salesOrder);
    const updated = db.quotations.update(id, { status: "CONVERTED" });
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return delay({ quotation: updated, salesOrderId: salesOrder.id });
  }
}
