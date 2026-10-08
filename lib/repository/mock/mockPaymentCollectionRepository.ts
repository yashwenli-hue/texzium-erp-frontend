import { ID } from "../../types/common";
import { ApiError } from "../../api/httpClient";
import { AccountsReceivable, InvoiceCollections, PaymentCollection, PaymentCollectionDetail, PaymentCollectionEvent, PaymentCollectionRecord, RecordPaymentResult, CustomerStatementEntry } from "../../types/domain";
import { CreatePaymentCollectionInput, IPaymentCollectionRepository, ListPaymentCollectionsQuery } from "../interfaces";
import { PaymentConflictError, fromPaise, normalizePaymentMode, paymentInputProblems, planPayment } from "../shared/paymentCollection";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";

/** The mock's stand-in for the signed-in user. The real backend takes the recorder from the token. */
const MOCK_ACTOR = { id: "mock-user", name: "You" };

const LIST_DEFAULT_LIMIT = 100;
const LIST_MAX_LIMIT = 500;

/**
 * Follows the RevenueOS payment collection rules (Payment Collection V1) through the
 * same planPayment() the real backend's order of checks is mirrored in: a payment
 * is refused for a bad request (400), an unknown invoice or receivable (404), or a
 * state that forbids it (a PaymentConflictError with the backend's message and
 * code); otherwise the collection, the ledger credit, the receivable's new figures
 * and the event all change together, or none of them does.
 *
 * What it cannot reproduce is concurrency: the backend serialises payments on the
 * receivable with a row lock and a conditional update, and proves it against a real
 * database. Here, calls run one after the other, which gives the same outcomes.
 */
export class MockPaymentCollectionRepository implements IPaymentCollectionRepository {
  async create(input: CreatePaymentCollectionInput): Promise<RecordPaymentResult> {
    const problems = paymentInputProblems(input);
    if (problems.length > 0) throw new ApiError(problems.join(" "), 400);

    const invoice = db.salesInvoices.getById(input.salesInvoiceId) ?? null;
    const receivables = db.accountsReceivable.getAll().filter((r) => r.salesInvoiceId === input.salesInvoiceId);
    const existingReferences = receivables.length === 1
      ? db.paymentCollections.getAll().filter((c) => c.accountsReceivableId === receivables[0].id && c.referenceNumber).map((c) => c.referenceNumber as string)
      : [];
    const ledgerName = invoice?.customerName ?? "";
    const lastLedger = [...db.customerLedger.getAll()]
      .filter((e) => e.customerName === ledgerName)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .pop();

    const plan = planPayment({
      input,
      invoice: invoice ? { status: invoice.status, customerName: invoice.customerName } : null,
      receivables,
      existingReferences,
      lastLedgerBalance: lastLedger?.balanceAmount ?? null,
    });

    const ar = receivables[0];
    const now = new Date().toISOString();
    const updated: AccountsReceivable = {
      ...ar,
      paidAmount: fromPaise(plan.paidAfter),
      balanceAmount: fromPaise(plan.balanceAfter),
      paymentStatus: plan.statusAfter,
    };
    db.accountsReceivable.update(ar.id, updated);

    const paymentRecord: PaymentCollectionRecord = {
      id: mockId("PC"),
      accountsReceivableId: ar.id,
      paymentDate: input.paymentDate,
      amount: fromPaise(plan.amount),
      paymentMode: normalizePaymentMode(input.paymentMode),
      referenceNumber: input.referenceNo.trim(),
      remarks: input.remarks && input.remarks.trim() ? input.remarks.trim() : undefined,
      createdAt: now,
      recordedById: MOCK_ACTOR.id,
      recordedByName: MOCK_ACTOR.name,
    };
    db.paymentCollections.add(paymentRecord);

    const ledgerEntry: CustomerStatementEntry = {
      id: mockId("CL"),
      customerName: ledgerName,
      salesInvoiceId: input.salesInvoiceId,
      debitAmount: 0,
      creditAmount: fromPaise(plan.amount),
      balanceAmount: fromPaise(plan.ledgerBalance),
      entryDate: input.paymentDate,
      remarks: `Payment received ${input.referenceNo.trim()}`,
      createdAt: now,
    };
    db.customerLedger.add(ledgerEntry);

    const event: PaymentCollectionEvent = {
      id: mockId("PE"),
      paymentCollectionId: paymentRecord.id,
      accountsReceivableId: ar.id,
      salesInvoiceId: input.salesInvoiceId,
      action: "PAYMENT_RECORDED",
      amount: fromPaise(plan.amount),
      balanceBefore: fromPaise(plan.balanceBefore),
      balanceAfter: fromPaise(plan.balanceAfter),
      fromStatus: ar.paymentStatus,
      toStatus: plan.statusAfter,
      remarks: paymentRecord.remarks,
      actorId: MOCK_ACTOR.id,
      actorName: MOCK_ACTOR.name,
      occurredAt: now,
    };
    db.paymentCollectionEvents.add(event);

    // Like the backend, the updated receivable carries no nested invoice.
    const { invoiceNumber: _i, customerName: _c, ...bare } = updated;
    void _i;
    void _c;
    return delay({ paymentRecord, updatedReceivable: bare as AccountsReceivable, event });
  }

  async list(query?: ListPaymentCollectionsQuery): Promise<PaymentCollection[]> {
    const limit = query?.limit ?? LIST_DEFAULT_LIMIT;
    const offset = query?.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > LIST_MAX_LIMIT) throw new ApiError(`limit must not be greater than ${LIST_MAX_LIMIT}`, 400);
    if (!Number.isInteger(offset) || offset < 0) throw new ApiError("offset must not be less than 0", 400);

    const receivableOf = (c: PaymentCollectionRecord) => db.accountsReceivable.getById(c.accountsReceivableId);
    const rows = db.paymentCollections
      .getAll()
      .filter((c) => !query?.accountsReceivableId || c.accountsReceivableId === query.accountsReceivableId)
      .filter((c) => !query?.salesInvoiceId || receivableOf(c)?.salesInvoiceId === query.salesInvoiceId)
      .filter((c) => !query?.from || Date.parse(c.paymentDate) >= Date.parse(query.from))
      .filter((c) => !query?.to || Date.parse(c.paymentDate) <= Date.parse(query.to))
      .sort((a, b) => Date.parse(b.paymentDate) - Date.parse(a.paymentDate) || (a.createdAt < b.createdAt ? 1 : -1))
      .slice(offset, offset + limit)
      .map((c) => this.withInvoice(c));
    return delay(rows);
  }

  async getById(id: ID): Promise<PaymentCollectionDetail> {
    const c = db.paymentCollections.getById(id);
    if (!c) throw new ApiError("Payment collection not found.", 404);
    const events = db.paymentCollectionEvents.getAll().filter((e) => e.paymentCollectionId === id).sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));
    return delay({ ...this.withInvoice(c), events });
  }

  async getForInvoice(salesInvoiceId: ID): Promise<InvoiceCollections> {
    const invoice = db.salesInvoices.getById(salesInvoiceId);
    if (!invoice) throw new ApiError("Sales invoice not found.", 404);
    const receivables = db.accountsReceivable.getAll().filter((r) => r.salesInvoiceId === salesInvoiceId);
    if (receivables.length === 0) throw new ApiError("This invoice has no receivable to collect against.", 404);
    if (receivables.length > 1) throw new PaymentConflictError("This invoice has more than one receivable, so its collections cannot be shown as one.", "AMBIGUOUS_RECEIVABLE");
    const receivable = receivables[0];
    const collections = db.paymentCollections
      .getAll()
      .filter((c) => c.accountsReceivableId === receivable.id)
      .sort((a, b) => Date.parse(b.paymentDate) - Date.parse(a.paymentDate) || (a.createdAt < b.createdAt ? 1 : -1));
    const events = db.paymentCollectionEvents.getAll().filter((e) => e.accountsReceivableId === receivable.id).sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));
    return delay({ receivable, collections, events });
  }

  private withInvoice(c: PaymentCollectionRecord): PaymentCollection {
    const ar = db.accountsReceivable.getById(c.accountsReceivableId);
    return {
      ...c,
      salesInvoiceId: ar?.salesInvoiceId ?? "",
      invoiceNumber: ar?.invoiceNumber,
      customerName: ar?.customerName,
      receivableStatus: ar?.paymentStatus,
      receivableBalance: ar?.balanceAmount,
    };
  }
}
