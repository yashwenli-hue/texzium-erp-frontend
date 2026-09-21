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
    invoiceCounter += 1;
    const now = new Date().toISOString();
    // Mirrors the real service's flat 18% GST assumption on the sales
    // order's own totalAmount — not a real HSN-rate calculation, same
    // honesty-preserving shortcut as the backend itself.
    const taxableAmount = salesOrder.totalAmount;
    const gstAmount = taxableAmount * 0.18;
    const totalAmount = taxableAmount + gstAmount;
    const invoice: SalesInvoice = {
      id: mockId("SI"),
      invoiceNumber: `SI-${invoiceCounter}`,
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
      customerName: input.customerName,
      ownerName: salesOrder.ownerName,
      invoiceDate: input.invoiceDate,
      taxableAmount,
      gstAmount,
      totalAmount,
      status: "POSTED",
      paymentStatus: "PENDING",
      remarks: input.remarks,
      createdAt: now,
    };
    db.salesInvoices.add(invoice);
    return delay(invoice);
  }
}
