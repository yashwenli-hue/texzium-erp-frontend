import { ID } from "../../types/common";
import { CustomerLedgerStatementLine, CustomerStatement, CustomerStatementEntry, StatementPeriod } from "../../types/domain";
import { ICustomerStatementRepository } from "../interfaces";
import { ApiError, DownloadedFile } from "../../api/httpClient";
import { db } from "./db";
import { delay } from "./queryUtils";

const LIMIT = 5000;
const day = (iso: string) => iso.slice(0, 10);
const paise = (rupees: number) => Math.round(rupees * 100);
const norm = (s?: string) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Mirrors GET /customers/:id/statement: the customer's ledger rows found by id only
 * (customer -> linked opportunities -> quotations -> proformas -> sales orders ->
 * invoices), balances from debits and credits in paise, calendar-day periods with both
 * ends inclusive, the same refusals. Mock invoices are all posted.
 */
export class MockCustomerStatementRepository implements ICustomerStatementRepository {
  async get(customerId: ID, period: StatementPeriod = {}): Promise<CustomerStatement> {
    return delay(this.build(customerId, period));
  }

  async downloadPdf(customerId: ID, period: StatementPeriod = {}): Promise<DownloadedFile> {
    const s = this.build(customerId, period);
    // Mock mode has no PDF renderer: a plain-text stand-in, named as such.
    const text = [`Customer statement (mock) - ${s.customer.customerName} (${s.customer.customerCode})`, `Closing balance: ${s.closingBalance.toFixed(2)}`].join("\n");
    return delay({ blob: new Blob([text], { type: "text/plain" }), fileName: `statement-${s.customer.customerCode}-mock.txt` });
  }

  private build(customerId: ID, period: StatementPeriod): CustomerStatement {
    const from = period.from ?? null;
    const to = period.to ?? null;
    if (from && to && from > to) throw new ApiError("The start date must not be after the end date.", 400);

    const customer = db.customers.getById(customerId);
    if (!customer) throw new ApiError("That record could not be found.", 404);

    const opportunityIds = new Set(db.opportunities.getAll().filter((o) => o.customerId === customerId).map((o) => o.id));
    const quotationIds = new Set(db.quotations.getAll().filter((q) => !!q.opportunityId && opportunityIds.has(q.opportunityId)).map((q) => q.id));
    const proformaIds = new Set(db.proformaInvoices.getAll().filter((p) => !!p.quotationId && quotationIds.has(p.quotationId)).map((p) => p.id));
    const orderIds = new Set(
      db.salesOrders.getAll().filter((o) => (o.quotationId && quotationIds.has(o.quotationId)) || (o.proformaInvoiceId && proformaIds.has(o.proformaInvoiceId))).map((o) => o.id),
    );
    const invoices = db.salesInvoices.getAll().filter((i) => orderIds.has(i.salesOrderId));
    const invoiceNumbers = new Map(invoices.map((i) => [i.id, i.invoiceNumber]));
    const rows = db.customerLedger.getAll().filter((r) => invoiceNumbers.has(r.salesInvoiceId));

    const before = from ? rows.filter((r) => day(r.entryDate) < from) : [];
    const inPeriod = rows
      .filter((r) => (!from || day(r.entryDate) >= from) && (!to || day(r.entryDate) <= to))
      .sort((a, b) => day(a.entryDate).localeCompare(day(b.entryDate)) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    if (inPeriod.length > LIMIT) throw new ApiError(`This statement would have more than ${LIMIT.toLocaleString("en-IN")} entries. Choose a shorter period.`, 422);

    const net = (list: CustomerStatementEntry[]) => list.reduce((t, r) => t + paise(r.debitAmount) - paise(r.creditAmount), 0);
    let running = net(before);
    const opening = running;
    let debits = 0;
    let credits = 0;
    const entries: CustomerLedgerStatementLine[] = inPeriod.map((r) => {
      debits += paise(r.debitAmount);
      credits += paise(r.creditAmount);
      running += paise(r.debitAmount) - paise(r.creditAmount);
      return {
        id: r.id,
        entryDate: day(r.entryDate),
        salesInvoiceId: r.salesInvoiceId,
        invoiceNumber: invoiceNumbers.get(r.salesInvoiceId),
        debit: paise(r.debitAmount) / 100,
        credit: paise(r.creditAmount) / 100,
        runningBalance: running / 100,
        remarks: r.remarks,
      };
    });

    const ledgered = new Set(rows.map((r) => r.salesInvoiceId));
    const name = norm(customer.customerName);
    const leads = new Map(db.leads.getAll().map((l) => [l.id, l]));
    const legacy = db.opportunities.getAll().filter((o) => {
      if (o.customerId) return false;
      const lead = leads.get(o.leadId);
      return !!lead && (norm(lead.customerName) === name || (!!lead.companyName && norm(lead.companyName) === name));
    }).length;

    return {
      customer: { id: customer.id, customerCode: customer.customerCode, customerName: customer.customerName, isActive: customer.isActive },
      period: { from, to },
      currency: "INR",
      openingBalance: opening / 100,
      totalDebits: debits / 100,
      totalCredits: credits / 100,
      closingBalance: running / 100,
      entries,
      coverage: { postedInvoicesWithoutLedgerEntries: invoices.filter((i) => !ledgered.has(i.id)).length, unlinkedLegacyMatches: legacy },
      generatedAt: new Date().toISOString(),
    };
  }
}
