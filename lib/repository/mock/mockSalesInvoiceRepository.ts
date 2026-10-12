import { ID, ListQuery, Page } from "../../types/common";
import { SalesInvoice } from "../../types/domain";
import {
  ISalesInvoiceRepository,
  CreateSalesInvoiceInput,
  SalesInvoiceSortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import { mockPdf } from "./mockDocuments";
import { ApiError, DownloadedFile } from "../../api/httpClient";
import { hasConsistentTaxBreakdown, quotationAmounts } from "../shared/quotationLifecycle";

const SEARCHABLE: (keyof SalesInvoice)[] = ["invoiceNumber", "customerName", "opportunityName", "salesOrderCode", "quoteNo"];

let invoiceCounter = 7710;

/** Mirrors the VERIFIED POST /sales-invoices path only — requires a DISPATCHED mock Dispatch Order, same server-side precondition as the real backend. */
export class MockSalesInvoiceRepository implements ISalesInvoiceRepository {
  async list(query?: ListQuery<SalesInvoiceSortField>): Promise<Page<SalesInvoice>> {
    return delay(applyListQuery(db.salesInvoices.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<SalesInvoice | null> {
    return delay(db.salesInvoices.getById(id) ?? null);
  }

  async create(input: CreateSalesInvoiceInput): Promise<SalesInvoice> {
    const salesOrder = db.salesOrders.getById(input.salesOrderId);
    if (!salesOrder) throw new Error(`Sales order ${input.salesOrderId} not found`);
    const dispatchOrder = db.dispatchOrders.getById(input.dispatchOrderId);
    if (!dispatchOrder || dispatchOrder.status !== "DISPATCHED") {
      throw new Error("Dispatch Order must be DISPATCHED");
    }
    // As the backend (2026-10-15): an order is invoiced once, and every amount
    // is the Quotation's it was built from (through its Proforma or directly);
    // nothing is added on top. An order that cannot be checked that way is refused.
    if (db.salesInvoices.getAll().some((i) => i.salesOrderId === salesOrder.id)) {
      throw new ApiError("This Sales Order has already been invoiced. An order is invoiced once, for its full value; no invoice was created.", 409);
    }
    const proforma = salesOrder.proformaInvoiceId ? db.proformaInvoices.getById(salesOrder.proformaInvoiceId) : undefined;
    const quotation = db.quotations.getById(salesOrder.quotationId ?? proforma?.quotationId ?? "");
    if (!quotation || !hasConsistentTaxBreakdown(quotationAmounts(quotation))) {
      throw new ApiError("The Quotation behind this Sales Order has no complete tax breakdown, so the invoice's tax cannot be determined. No invoice was created.", 409);
    }
    const q = quotationAmounts(quotation);
    if (Math.abs(salesOrder.totalAmount - q.totalAmount) > 0.01) {
      throw new ApiError(`This Sales Order's total (${salesOrder.totalAmount}) is not its Quotation's total including GST (${q.totalAmount}). No invoice was created.`, 409);
    }
    const lines = (proforma?.lines?.length ? proforma.lines : quotation.lines) ?? [];
    const customer = quotation.opportunityId ? db.customers.getById(db.opportunities.getById(quotation.opportunityId)?.customerId ?? "") : undefined;
    invoiceCounter += 1;
    const now = new Date().toISOString();
    const { taxableAmount, gstAmount, totalAmount } = q;
    const sum = (k: "cgstAmount" | "sgstAmount" | "igstAmount") => Math.round(lines.reduce((a, l) => a + l[k] * 100, 0)) / 100;
    const invoice: SalesInvoice = {
      id: mockId("SI"),
      invoiceNumber: `SI24/26-27/${String(invoiceCounter).padStart(5, "0")}`,
      numbered: true,
      items: lines.map((l) => ({ ...l })),
      salesOrderId: salesOrder.id,
      salesOrderCode: salesOrder.salesOrderCode,
      quotationId: salesOrder.quotationId,
      quoteNo: salesOrder.quoteNo,
      proformaInvoiceId: salesOrder.proformaInvoiceId,
      proformaNumber: salesOrder.proformaNumber,
      opportunityId: salesOrder.opportunityId,
      opportunityName: salesOrder.opportunityName,
      dispatchOrderId: dispatchOrder.id,
      dispatchOrderNo: dispatchOrder.dispatchOrderNo,
      dispatchStatus: dispatchOrder.status,
      customerName: customer?.customerName ?? salesOrder.customerName,
      invoiceCustomerName: customer?.customerName,
      ownerName: salesOrder.ownerName,
      invoiceDate: input.invoiceDate,
      taxableAmount,
      gstAmount,
      cgstAmount: lines.length ? sum("cgstAmount") : 0,
      sgstAmount: lines.length ? sum("sgstAmount") : 0,
      igstAmount: lines.length ? sum("igstAmount") : gstAmount,
      totalAmount,
      status: "POSTED",
      paymentStatus: "PENDING",
      remarks: input.remarks,
      createdAt: now,
    };
    db.salesInvoices.add(invoice);
    return delay(invoice);
  }

  async downloadPdf(id: ID): Promise<DownloadedFile> {
    const inv = db.salesInvoices.getById(id);
    if (!inv) throw new ApiError("Sales invoice not found.", 404);
    if (!inv.numbered || !inv.items?.length) {
      throw new ApiError("This invoice cannot be printed as a tax invoice: it was issued before invoices were numbered.", 409);
    }
    return mockPdf(`Tax Invoice ${inv.invoiceNumber}`, [`Customer: ${inv.customerName}`, `Total: ${inv.totalAmount}`], `invoice-${inv.invoiceNumber}`);
  }
}
