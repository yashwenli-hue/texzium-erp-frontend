import { ID, ListQuery, Page } from "../../types/common";
import { ProformaEvent, ProformaInvoice } from "../../types/domain";
import { CreateProformaInvoiceInput, IProformaInvoiceRepository, ProformaInvoiceSortField } from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import {
  PROFORMA_ACTIVE_EXISTS_MESSAGE,
  PROFORMA_CANCEL_BLOCKED_BY_ORDER_MESSAGE,
  PROFORMA_NOT_FOUND_MESSAGE,
  PROFORMA_REASON_MAX_LENGTH,
  PROFORMA_REMARKS_MAX_LENGTH,
  ProformaConflictError,
  isActiveProforma,
  isProformaExpired,
  isProformaTransitionAllowed,
  proformaCannotApproveMessage,
  proformaCannotCancelMessage,
  proformaExpiredMessage,
  proformaQuotationNotApprovedMessage,
} from "../shared/proformaLifecycle";
import { cleanQuotationText } from "../shared/quotationLifecycle";
import { isLiveSalesOrder } from "../shared/salesOrderLifecycle";

const SEARCHABLE: (keyof ProformaInvoice)[] = ["proformaNumber", "quoteNo", "customerName", "opportunityName", "ownerName"];

let proformaCounter = 1058;

/** The mock's stand-in for the signed-in user. The real backend takes the actor from the token. */
const MOCK_ACTOR = { id: "mock-user", name: "You" };

/** Expiry is derived from the validity date every time a Proforma is read, never stored. */
function withExpiry(p: ProformaInvoice): ProformaInvoice {
  return { ...p, isExpired: isProformaExpired(p.validityDate) };
}

/**
 * Mirrors the backend's Proforma Invoice lifecycle (commit 1d0b1dc): created
 * PENDING from an APPROVED quotation at the quotation's total (never typed), one
 * active Proforma per quotation, approval refused once expired and not
 * repeatable, cancellation with a mandatory reason and refused while a Sales
 * Order that is not cancelled references it, and an attributed history.
 */
export class MockProformaInvoiceRepository implements IProformaInvoiceRepository {
  async list(query?: ListQuery<ProformaInvoiceSortField>): Promise<Page<ProformaInvoice>> {
    return delay(applyListQuery(db.proformaInvoices.getAll().map(withExpiry), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<ProformaInvoice | null> {
    const p = db.proformaInvoices.getById(id);
    return delay(p ? withExpiry(p) : null);
  }

  private record(e: Omit<ProformaEvent, "id" | "actorName" | "actorId" | "occurredAt">) {
    db.proformaEvents.add({
      id: mockId("PE"),
      actorName: MOCK_ACTOR.name,
      actorId: MOCK_ACTOR.id,
      occurredAt: new Date().toISOString(),
      ...e,
    });
  }

  private require(id: ID): ProformaInvoice {
    const p = db.proformaInvoices.getById(id);
    if (!p) throw new Error(PROFORMA_NOT_FOUND_MESSAGE);
    return p;
  }

  async create(input: CreateProformaInvoiceInput): Promise<ProformaInvoice> {
    const remarks = cleanQuotationText(input.remarks, PROFORMA_REMARKS_MAX_LENGTH, false, "Remarks");
    const quotation = db.quotations.getById(input.quotationId);
    if (!quotation) throw new Error("Quotation not found.");
    if (quotation.status !== "APPROVED") throw new ProformaConflictError(proformaQuotationNotApprovedMessage(quotation.status));
    if (db.proformaInvoices.getAll().some((p) => p.quotationId === quotation.id && isActiveProforma(p))) {
      throw new ProformaConflictError(PROFORMA_ACTIVE_EXISTS_MESSAGE);
    }
    proformaCounter += 1;
    const now = new Date().toISOString();
    const proforma: ProformaInvoice = {
      id: mockId("PF"),
      proformaNumber: `PI-${proformaCounter}`,
      quotationId: quotation.id,
      quoteNo: quotation.quoteNo,
      customerName: quotation.customerName,
      opportunityId: quotation.opportunityId,
      opportunityName: quotation.opportunityName,
      issueDate: input.issueDate,
      // Never the caller's: the approved quotation's total is authoritative.
      totalAmount: quotation.totalAmount ?? quotation.amount,
      status: "PENDING",
      validityDate: input.validityDate ?? null,
      isExpired: false,
      remarks,
      ownerName: quotation.ownerName,
      createdAt: now,
    };
    db.proformaInvoices.add(proforma);
    this.record({ proformaInvoiceId: proforma.id, action: "PROFORMA_CREATED", toStatus: "PENDING" });
    return delay(withExpiry(proforma));
  }

  async approve(id: ID, remarks?: string): Promise<ProformaInvoice> {
    const note = cleanQuotationText(remarks, PROFORMA_REMARKS_MAX_LENGTH, false, "Remarks");
    const existing = this.require(id);
    if (!isProformaTransitionAllowed(existing.status, "APPROVED")) {
      throw new ProformaConflictError(proformaCannotApproveMessage(existing.status));
    }
    if (existing.validityDate && isProformaExpired(existing.validityDate)) {
      throw new ProformaConflictError(proformaExpiredMessage(existing.validityDate, "approved"));
    }
    const updated = db.proformaInvoices.update(id, { status: "APPROVED" });
    if (!updated) throw new Error(PROFORMA_NOT_FOUND_MESSAGE);
    this.record({ proformaInvoiceId: id, action: "PROFORMA_APPROVED", fromStatus: existing.status, toStatus: "APPROVED", remarks: note });
    return delay(withExpiry(updated));
  }

  async cancel(id: ID, reason: string): Promise<ProformaInvoice> {
    const clean = cleanQuotationText(reason, PROFORMA_REASON_MAX_LENGTH, true, "A reason");
    const existing = this.require(id);
    if (!isProformaTransitionAllowed(existing.status, "CANCELLED")) {
      throw new ProformaConflictError(proformaCannotCancelMessage(existing.status));
    }
    if (db.salesOrders.getAll().some((o) => o.proformaInvoiceId === id && isLiveSalesOrder(o.status))) {
      throw new ProformaConflictError(PROFORMA_CANCEL_BLOCKED_BY_ORDER_MESSAGE);
    }
    const updated = db.proformaInvoices.update(id, { status: "CANCELLED" });
    if (!updated) throw new Error(PROFORMA_NOT_FOUND_MESSAGE);
    this.record({ proformaInvoiceId: id, action: "PROFORMA_CANCELLED", fromStatus: existing.status, toStatus: "CANCELLED", remarks: clean });
    return delay(withExpiry(updated));
  }

  async listEvents(id: ID): Promise<ProformaEvent[]> {
    this.require(id);
    // Newest first; events recorded in the same millisecond keep their real order (the later one first).
    const events = db.proformaEvents
      .getAll()
      .map((e, index) => ({ e, index }))
      .filter(({ e }) => e.proformaInvoiceId === id)
      .sort((a, b) => +new Date(b.e.occurredAt) - +new Date(a.e.occurredAt) || b.index - a.index)
      .map(({ e }) => e);
    return delay(events);
  }
}
