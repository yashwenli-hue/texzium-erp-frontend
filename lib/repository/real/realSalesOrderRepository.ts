import { ID, ListQuery, Page } from "../../types/common";
import { Quotation, SalesOrder } from "../../types/domain";
import { CreateSalesOrderInput, IQuotationRepository, ISalesOrderRepository, SalesOrderSortField } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendSalesOrder, mapSalesOrder } from "./mappers";

const SEARCHABLE: (keyof SalesOrder)[] = ["salesOrderCode", "customerName", "opportunityName", "ownerName", "quoteNo"];

/**
 * VERIFIED sales-orders routes: POST /, GET / only — no GET /:id and no
 * approve/reject/status-transition route of any kind, despite
 * sales-orders.service.ts having an unused updateStatus() method with no
 * controller route calling it (confirmed by reading both files directly).
 * getById() list-scans, same pattern as Quotations/Proforma Invoices. GET
 * /sales-orders nests the raw ProformaInvoice only (never the Quotation),
 * so this repository takes the real Quotation repository as a dependency to
 * resolve customerName/opportunityName/ownerName/quoteNo, same pattern as
 * RealProformaInvoiceRepository.
 *
 * SECURITY NOTE (not fixed — backend is read-only): the sales-orders
 * controller has no `@UseGuards`/`@Permissions` at all — every route here
 * is reachable without a JWT, same as Quotations and Proforma Invoices.
 * Confirmed by reading sales-orders.controller.ts directly.
 */
export class RealSalesOrderRepository implements ISalesOrderRepository {
  constructor(private quotations: IQuotationRepository) {}

  private async quotationMap(): Promise<Map<string, Quotation>> {
    const page = await this.quotations.list();
    return new Map(page.items.map((q) => [q.id, q]));
  }

  private async fetchAll(): Promise<SalesOrder[]> {
    const [rows, qById] = await Promise.all([
      apiFetch<BackendSalesOrder[]>("/sales-orders"),
      this.quotationMap(),
    ]);
    return rows.map((raw) => mapSalesOrder(raw, qById));
  }

  async list(query?: ListQuery<SalesOrderSortField>): Promise<Page<SalesOrder>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getById(id: ID): Promise<SalesOrder | null> {
    const all = await this.fetchAll();
    return all.find((s) => s.id === id) ?? null;
  }

  async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    const raw = await apiFetch<BackendSalesOrder>("/sales-orders", {
      method: "POST",
      body: {
        proformaInvoiceId: input.proformaInvoiceId,
        orderDate: input.orderDate,
        totalAmount: input.totalAmount,
        inventoryItemId: input.inventoryItemId,
        orderQty: input.orderQty,
        sellerGstId: input.sellerGstId,
        buyerGstId: input.buyerGstId,
      },
    });
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return mapSalesOrder(raw, new Map());
  }
}
