import { CollectionsAging, CollectionsEfficiency, CollectionsRecoveryRate, CollectionsSummary } from "../../types/domain";
import { ICollectionsDashboardRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/** Mirrors the real collections-dashboard's exact formulas against the mock AccountsReceivable store, same pattern as MockPaymentCollectionRepository mirroring the live payment-collections formula in Stage 2G. */
export class MockCollectionsDashboardRepository implements ICollectionsDashboardRepository {
  async summary(): Promise<CollectionsSummary> {
    const receivables = db.accountsReceivable.getAll();
    return delay({
      totalInvoices: receivables.length,
      totalOutstanding: receivables.reduce((s, r) => s + r.balanceAmount, 0),
      totalCollected: receivables.reduce((s, r) => s + r.paidAmount, 0),
    });
  }

  async aging(): Promise<CollectionsAging> {
    const receivables = db.accountsReceivable.getAll();
    const today = new Date();
    const buckets = { days0to30: 0, days31to60: 0, days61to90: 0, above90: 0 };
    for (const r of receivables) {
      const diff = Math.floor((today.getTime() - new Date(r.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) buckets.days0to30 += r.balanceAmount;
      else if (diff <= 60) buckets.days31to60 += r.balanceAmount;
      else if (diff <= 90) buckets.days61to90 += r.balanceAmount;
      else buckets.above90 += r.balanceAmount;
    }
    return delay(buckets);
  }

  async efficiency(): Promise<CollectionsEfficiency> {
    const receivables = db.accountsReceivable.getAll();
    return delay({
      total: receivables.length,
      paid: receivables.filter((r) => r.paymentStatus === "PAID").length,
      partial: receivables.filter((r) => r.paymentStatus === "PARTIAL").length,
      pending: receivables.filter((r) => r.paymentStatus === "PENDING").length,
      writtenOff: receivables.filter((r) => r.paymentStatus === "WRITTEN_OFF").length,
    });
  }

  async recoveryRate(): Promise<CollectionsRecoveryRate> {
    const receivables = db.accountsReceivable.getAll();
    const totalOutstanding = receivables.reduce((s, r) => s + r.balanceAmount, 0);
    const totalCollected = receivables.reduce((s, r) => s + r.paidAmount, 0);
    const totalInvoiceValue = totalOutstanding + totalCollected;
    const rate = totalInvoiceValue > 0 ? (totalCollected / totalInvoiceValue) * 100 : 0;
    return delay({ totalInvoiceValue, totalCollected, recoveryRate: rate.toFixed(2) + "%" });
  }
}
