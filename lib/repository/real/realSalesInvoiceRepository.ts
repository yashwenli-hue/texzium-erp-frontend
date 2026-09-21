import { ID, ListQuery, Page } from "../../types/common";
import { SalesInvoice, SalesOrder } from "../../types/domain";
import { CreateSalesInvoiceInput, ISalesInvoiceRepository, ISalesOrderRepository, SalesInvoiceSortField } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendSalesInvoice, mapSalesInvoice } from "./mappers";

const SEARCHABLE: (keyof SalesInvoice)[] = ["invoiceNumber", "customerName", "opportunityName", "salesOrderCode", "quoteNo"];

/**
 * VERIFIED sales-invoices routes: POST /, GET / only — no GET /:id, no
 * approve/cancel/status-transition route of any kind (confirmed by reading
 * sales-invoices.controller.ts directly; the RevenueOS one, the only one
 * actually wired into AppModule — a second, identically-routed FinanceOS
 * sales-invoices module exists in source but is never imported, so it's
 * dead code with no live route). getById() list-scans, same pattern as
 * Quotations/Proforma/Sales Orders. GET /sales-invoices nests the raw
 * SalesOrder and DispatchOrder (never Quotation/Proforma/Opportunity), so
 * this repository takes the real Sales Order repository as a dependency to
 * resolve customerName/opportunityName/quoteNo/proformaNumber, same pattern
 * as RealProformaInvoiceRepository/RealSalesOrderRepository.
 *
 * SECURITY NOTE (not fixed — backend is read-only): the sales-invoices
 * controller has no `@UseGuards`/`@Permissions` at all, same as every other
 * Quote-to-Cash controller. Confirmed by reading sales-invoices.controller.ts
 * directly.
 */
export class RealSalesInvoiceRepository implements ISalesInvoiceRepository {
  constructor(private salesOrders: ISalesOrderRepository) {}

  private async salesOrderMap(): Promise<Map<string, SalesOrder>> {
    const page = await this.salesOrders.list();
    return new Map(page.items.map((o) => [o.id, o]));
  }

  private async fetchAll(): Promise<SalesInvoice[]> {
    const [rows, soById] = await Promise.all([
      apiFetch<BackendSalesInvoice[]>("/sales-invoices"),
      this.salesOrderMap(),
    ]);
    return rows.map((raw) => mapSalesInvoice(raw, soById));
  }

  async list(query?: ListQuery<SalesInvoiceSortField>): Promise<Page<SalesInvoice>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getById(id: ID): Promise<SalesInvoice | null> {
    const all = await this.fetchAll();
    return all.find((i) => i.id === id) ?? null;
  }

  async create(input: CreateSalesInvoiceInput): Promise<SalesInvoice> {
    const raw = await apiFetch<BackendSalesInvoice>("/sales-invoices", {
      method: "POST",
      body: {
        salesOrderId: input.salesOrderId,
        dispatchOrderId: input.dispatchOrderId,
        invoiceDate: input.invoiceDate,
        customerName: input.customerName,
        remarks: input.remarks,
      },
    });
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return mapSalesInvoice(raw, new Map());
  }
}
