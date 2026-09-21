import { CreatePaymentCollectionInput, IPaymentCollectionRepository } from "../interfaces";
import { AccountsReceivable, CustomerStatementEntry, PaymentCollectionRecord, RecordPaymentResult } from "../../types/domain";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";

/**
 * Mirrors the real RevenueOS payment-collections.service.ts create() logic
 * exactly, including its lack of a balance-clamp on overpayment — this is a
 * deliberate simulation of verified real backend behavior, not a bug
 * introduced here. Like the real backend, the created PaymentCollectionRecord
 * is never exposed through any list/read method afterward (db.paymentCollections
 * has no corresponding list() on the repository interface) — its id is only
 * ever available from this method's own return value, same as the real API.
 */
export class MockPaymentCollectionRepository implements IPaymentCollectionRepository {
  async create(input: CreatePaymentCollectionInput): Promise<RecordPaymentResult> {
    const ar = db.accountsReceivable.getAll().find((r) => r.salesInvoiceId === input.salesInvoiceId);
    if (!ar) throw new Error("Accounts Receivable not found");
    const invoice = db.salesInvoices.getById(input.salesInvoiceId);
    if (!invoice) throw new Error("Invoice not found");

    const now = new Date().toISOString();
    const newPaidAmount = ar.paidAmount + input.amountReceived;
    // No clamp at zero — mirrors the live backend exactly (see
    // AccountsReceivable in lib/types/domain.ts).
    const newBalance = ar.outstandingAmount - newPaidAmount;
    const paymentStatus = newBalance <= 0 ? "PAID" : "PARTIAL";

    const updated: AccountsReceivable = {
      ...ar,
      paidAmount: newPaidAmount,
      balanceAmount: newBalance,
      paymentStatus,
    };
    db.accountsReceivable.update(ar.id, updated);

    const paymentRecord: PaymentCollectionRecord = {
      id: mockId("PC"),
      accountsReceivableId: ar.id,
      paymentDate: input.paymentDate,
      amount: input.amountReceived,
      paymentMode: input.paymentMode,
      referenceNumber: input.referenceNo,
      createdAt: now,
    };
    db.paymentCollections.add(paymentRecord);

    const lastLedger = db.customerLedger
      .getAll()
      .filter((e) => e.customerName === invoice.customerName)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .pop();
    const previousBalance = lastLedger?.balanceAmount ?? 0;

    const ledgerEntry: CustomerStatementEntry = {
      id: mockId("CL"),
      customerName: invoice.customerName,
      salesInvoiceId: input.salesInvoiceId,
      debitAmount: 0,
      creditAmount: input.amountReceived,
      balanceAmount: previousBalance - input.amountReceived,
      entryDate: input.paymentDate,
      remarks: `Payment received ${input.referenceNo}`,
      createdAt: now,
    };
    db.customerLedger.add(ledgerEntry);

    return delay({ paymentRecord, updatedReceivable: updated });
  }
}
