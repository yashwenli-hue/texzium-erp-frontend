import { ID, ListQuery, Page } from "../../types/common";
import { Quotation, QuotationEvent } from "../../types/domain";
import {
  IQuotationRepository,
  CreateQuotationInput,
  QuotationSortField,
  QuotationRevision,
} from "../interfaces";
import { db } from "./db";
import {
  BUYER_GST_NOT_CUSTOMERS_MESSAGE,
  CUSTOMER_NOT_FOUND_MESSAGE,
  CustomerConflictError,
  OPPORTUNITY_NOT_LINKED_MESSAGE,
  customerInactiveForMessage,
} from "../shared/customerLifecycle";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import { mockPdf, mockPricedLine } from "./mockDocuments";
import { MOCK_INVENTORY_ITEMS } from "./mockInventoryItemRepository";
import { ApiError, DownloadedFile } from "../../api/httpClient";
import {
  QUOTATION_REASON_MAX_LENGTH,
  QUOTATION_REMARKS_MAX_LENGTH,
  QuotationConflictError,
  cleanQuotationText,
  computeQuotationAmounts,
  hasConsistentTaxBreakdown,
  isQuotationTransitionAllowed,
  parseTaxableAmount,
  parseUnitRate,
  quotationAmounts,
  quotationCannotApproveMessage,
  quotationCannotRejectMessage,
  quotationCannotReviseMessage,
  quotationInconsistentBreakdownMessage,
  quotationLockedByDownstreamMessage,
  QUOTATION_NOT_FOUND_MESSAGE,
} from "../shared/quotationLifecycle";
import { isActiveProforma } from "../shared/proformaLifecycle";
import { isLiveSalesOrder } from "../shared/salesOrderLifecycle";

const SEARCHABLE: (keyof Quotation)[] = ["quoteNo", "customerName", "opportunityName", "ownerName"];

let quoteCounter = 3420;

/** The mock has no HSN master, so a created quotation carries this stand-in GST rate. The real backend takes the rate from the item's HSN. */
export const MOCK_GST_PERCENT = 18;

/** The mock's stand-in for the signed-in user. The real backend takes the actor from the token. */
const MOCK_ACTOR = { id: "mock-user", name: "You" };

/**
 * Mirrors the backend's Quotation lifecycle (commit 1246647): the same
 * statuses, transitions, taxable-amount revision (GST recomputed from the stored
 * percentage), the lock on an approved quotation that has an active Proforma or
 * a live Sales Order, the refusal to revise/approve a legacy quotation whose tax
 * breakdown does not add up, mandatory rejection reason, and an attributed
 * history. The old convert action does not exist any more, here or in the backend.
 */
export class MockQuotationRepository implements IQuotationRepository {
  async list(query?: ListQuery<QuotationSortField>): Promise<Page<Quotation>> {
    return delay(applyListQuery(db.quotations.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<Quotation | null> {
    return delay(db.quotations.getById(id) ?? null);
  }

  private record(e: Omit<QuotationEvent, "id" | "actorName" | "actorId" | "occurredAt">) {
    db.quotationEvents.add({
      id: mockId("QE"),
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: new Date().toISOString(),
      ...e,
    });
  }

  private require(id: ID): Quotation {
    const q = db.quotations.getById(id);
    if (!q) throw new Error(QUOTATION_NOT_FOUND_MESSAGE);
    return q;
  }

  async create(input: CreateQuotationInput): Promise<Quotation> {
    const opportunity = db.opportunities.getById(input.opportunityId);
    if (!opportunity) throw new Error("Opportunity not found");
    // The same rules as the backend (quotations.service.ts create): the opportunity
    // has a customer, who is active, and the buyer registration is that customer's own and active.
    if (!opportunity.customerId) throw new CustomerConflictError(OPPORTUNITY_NOT_LINKED_MESSAGE, "OPPORTUNITY_NOT_LINKED");
    const customer = db.customers.getById(opportunity.customerId);
    if (!customer) throw new Error(CUSTOMER_NOT_FOUND_MESSAGE);
    if (!customer.isActive) throw new CustomerConflictError(customerInactiveForMessage("quotation"), "CUSTOMER_INACTIVE");
    const buyer = db.customers.getAll().flatMap((c) => c.gstRegistrations).find((g) => g.id === input.buyerGstId);
    if (!buyer) throw new Error("Buyer GST not found");
    if (buyer.customerId !== customer.id) throw new Error(BUYER_GST_NOT_CUSTOMERS_MESSAGE);
    if (!buyer.isActive) throw new CustomerConflictError("The buyer GST registration is inactive. Choose an active one.", "GST_INACTIVE");
    quoteCounter += 1;
    const now = new Date().toISOString();
    // The line the backend would store: the quotation's amounts are its line's.
    const line = mockPricedLine({
      lineNumber: 1,
      description: MOCK_INVENTORY_ITEMS.find((i) => i.id === input.inventoryItemId)?.name ?? "Item",
      hsnCode: input.inventoryItemId === "INV1" ? "84137090" : undefined,
      quantity: input.quantity,
      unitRate: input.unitPrice,
      gstRate: MOCK_GST_PERCENT,
    });
    const amounts = { taxableAmount: line.taxableAmount, gstAmount: line.gstAmount, totalAmount: line.totalAmount };
    const quotation: Quotation = {
      id: mockId("Q"),
      quoteNo: `QT-${quoteCounter}`,
      numbered: true,
      lines: [line],
      customerName: opportunity.customerName,
      opportunityId: opportunity.id,
      opportunityName: opportunity.title,
      amount: amounts.totalAmount,
      taxableAmount: amounts.taxableAmount,
      gstPercent: MOCK_GST_PERCENT,
      gstAmount: amounts.gstAmount,
      totalAmount: amounts.totalAmount,
      status: "DRAFT",
      ownerName: opportunity.ownerName,
      createdAt: now,
      quoteDate: input.quoteDate,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      buyerGstId: input.buyerGstId,
      sellerGstId: input.sellerGstId,
      placeOfSupply: buyer.stateName,
    };
    db.quotations.add(quotation);
    this.record({
      quotationId: quotation.id,
      action: "QUOTATION_CREATED",
      toStatus: "DRAFT",
      newTaxableAmount: amounts.taxableAmount,
      newTotalAmount: amounts.totalAmount,
    });
    return delay(quotation);
  }

  async revise(id: ID, change: QuotationRevision, remarks?: string): Promise<Quotation> {
    // As the backend: a quotation with a priced line is revised by its unit
    // rate; one without, by its taxable amount.
    const byRate = "unitPrice" in change;
    const parsed = byRate ? parseUnitRate(String(change.unitPrice)) : parseTaxableAmount(String(change.taxableAmount));
    if (parsed.error !== undefined) throw new Error(parsed.error);
    const lined = (db.quotations.getById(id)?.lines?.length ?? 0) > 0;
    if (lined !== byRate) {
      throw new ApiError(lined ? "This quotation has a priced line: revise its unit rate (unitPrice), not the taxable amount." : "This quotation has no priced line: revise its taxable amount (taxableAmount).", 400);
    }
    const note = cleanQuotationText(remarks, QUOTATION_REMARKS_MAX_LENGTH, false, "Remarks");
    const existing = this.require(id);
    if (!isQuotationTransitionAllowed(existing.status, "REVISED")) {
      throw new QuotationConflictError(quotationCannotReviseMessage(existing.status));
    }
    const current = quotationAmounts(existing);
    if (!hasConsistentTaxBreakdown(current)) {
      throw new QuotationConflictError(quotationInconsistentBreakdownMessage("revised"));
    }
    if (existing.status === "APPROVED") {
      // Locked once something has been built on it: an active (not cancelled) Proforma, or a Sales Order that is not cancelled.
      const proformas = db.proformaInvoices.getAll().filter((p) => p.quotationId === id);
      const proformaIds = new Set(proformas.map((p) => p.id));
      const blockers: string[] = [];
      if (proformas.some(isActiveProforma)) blockers.push("an active Proforma Invoice");
      if (db.salesOrders.getAll().some((o) => isLiveSalesOrder(o.status) && (o.quotationId === id || (o.proformaInvoiceId && proformaIds.has(o.proformaInvoiceId))))) {
        blockers.push("a Sales Order");
      }
      if (blockers.length > 0) throw new QuotationConflictError(quotationLockedByDownstreamMessage(blockers));
    }
    const revisedLine = byRate && existing.lines?.[0] ? mockPricedLine({ ...existing.lines[0], hsnCode: existing.lines[0].hsnCode, unitRate: parsed.value, gstRate: current.gstPercent, taxType: existing.taxType }) : null;
    const next = revisedLine
      ? { taxableAmount: revisedLine.taxableAmount, gstAmount: revisedLine.gstAmount, totalAmount: revisedLine.totalAmount }
      : computeQuotationAmounts(parsed.value, current.gstPercent);
    const updated = db.quotations.update(id, {
      status: "REVISED",
      amount: next.totalAmount,
      taxableAmount: next.taxableAmount,
      gstAmount: next.gstAmount,
      totalAmount: next.totalAmount,
      ...(revisedLine ? { lines: [revisedLine], unitPrice: parsed.value } : {}),
    });
    if (!updated) throw new Error(QUOTATION_NOT_FOUND_MESSAGE);
    this.record({
      quotationId: id,
      action: "QUOTATION_REVISED",
      fromStatus: existing.status,
      toStatus: "REVISED",
      remarks: note,
      previousTaxableAmount: current.taxableAmount,
      newTaxableAmount: next.taxableAmount,
      previousTotalAmount: current.totalAmount,
      newTotalAmount: next.totalAmount,
    });
    return delay(updated);
  }

  async approve(id: ID, remarks?: string): Promise<Quotation> {
    const note = cleanQuotationText(remarks, QUOTATION_REMARKS_MAX_LENGTH, false, "Remarks");
    const existing = this.require(id);
    if (!isQuotationTransitionAllowed(existing.status, "APPROVED")) {
      throw new QuotationConflictError(quotationCannotApproveMessage(existing.status));
    }
    if (!hasConsistentTaxBreakdown(quotationAmounts(existing))) {
      throw new QuotationConflictError(quotationInconsistentBreakdownMessage("approved"));
    }
    const updated = db.quotations.update(id, { status: "APPROVED" });
    if (!updated) throw new Error(QUOTATION_NOT_FOUND_MESSAGE);
    this.record({ quotationId: id, action: "QUOTATION_APPROVED", fromStatus: existing.status, toStatus: "APPROVED", remarks: note });
    return delay(updated);
  }

  async reject(id: ID, reason: string): Promise<Quotation> {
    const clean = cleanQuotationText(reason, QUOTATION_REASON_MAX_LENGTH, true, "A reason");
    const existing = this.require(id);
    if (!isQuotationTransitionAllowed(existing.status, "REJECTED")) {
      throw new QuotationConflictError(quotationCannotRejectMessage(existing.status));
    }
    const updated = db.quotations.update(id, { status: "REJECTED" });
    if (!updated) throw new Error(QUOTATION_NOT_FOUND_MESSAGE);
    this.record({ quotationId: id, action: "QUOTATION_REJECTED", fromStatus: existing.status, toStatus: "REJECTED", remarks: clean });
    return delay(updated);
  }

  async listEvents(id: ID): Promise<QuotationEvent[]> {
    this.require(id);
    // Newest first; events recorded in the same millisecond keep their real order (the later one first).
    const events = db.quotationEvents
      .getAll()
      .map((e, index) => ({ e, index }))
      .filter(({ e }) => e.quotationId === id)
      .sort((a, b) => +new Date(b.e.occurredAt) - +new Date(a.e.occurredAt) || b.index - a.index)
      .map(({ e }) => e);
    return delay(events);
  }

  async downloadPdf(id: ID): Promise<DownloadedFile> {
    const q = this.require(id);
    return mockPdf(`Quotation ${q.quoteNo}`, [`Customer: ${q.customerName}`, `Total: ${q.totalAmount ?? q.amount}`], `quotation-${q.quoteNo}`);
  }
}
