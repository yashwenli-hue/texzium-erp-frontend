import { SalesRevenueSummary } from "../../types/domain";
import { ISalesReportsRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/** Mirrors the real revenue-summary — sums every mock Sales Invoice, all-time, same as the live endpoint's own all-table-sum behavior. */
export class MockSalesReportsRepository implements ISalesReportsRepository {
  async revenueSummary(): Promise<SalesRevenueSummary> {
    const invoices = db.salesInvoices.getAll();
    const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const taxableRevenue = invoices.reduce((s, i) => s + i.taxableAmount, 0);
    const totalTax = invoices.reduce((s, i) => s + i.gstAmount, 0);
    return delay({ totalRevenue, taxableRevenue, totalTax });
  }
}
