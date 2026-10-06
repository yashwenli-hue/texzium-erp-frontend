import { ID, ListQuery, Page } from "../../types/common";
import { Quotation, SalesOrder, SalesOrderEvent } from "../../types/domain";
import { CreateSalesOrderInput, IQuotationRepository, ISalesOrderRepository, SalesOrderSortField } from "../interfaces";
import { apiFetch, ApiError } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { SalesOrderConflictError, toCreateSalesOrderBody } from "../shared/salesOrderLifecycle";
import { BackendSalesOrder, BackendSalesOrderEvent, mapSalesOrder, mapSalesOrderEvent } from "./mappers";

const SEARCHABLE: (keyof SalesOrder)[] = ["salesOrderCode", "customerName", "opportunityName", "ownerName", "quoteNo"];

/**
 * VERIFIED sales-orders routes (backend 85c3666): POST /, GET / and
 * GET /:id/events — still no GET /:id, so getById() list-scans, same pattern
 * as Quotations/Proforma Invoices. The order's status is never changed from
 * here: it moves only through the advance-receipt and accounts-approval actions
 * (see RealSalesOrderCommercialRepository). GET /sales-orders nests the raw
 * ProformaInvoice only (never the Quotation), so this repository takes the real
 * Quotation repository as a dependency to resolve customerName/opportunityName/
 * ownerName/quoteNo, same pattern as RealProformaInvoiceRepository.
 *
 * Every route needs a signed-in user and its salesorders.* permission
 * (salesorders.view for the two reads, salesorders.create for create).
 *
 * The create body carries no total: the backend takes it from the approved
 * Proforma Invoice and refuses any other value (see toCreateSalesOrderBody).
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
    let raw: BackendSalesOrder;
    try {
      raw = await apiFetch<BackendSalesOrder>("/sales-orders", {
        method: "POST",
        body: toCreateSalesOrderBody(input),
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // 409: the Proforma is not approved, or already has a Sales Order.
        if (err.status === 409) throw new SalesOrderConflictError(err.message);
        if (err.status === 403) throw new ApiError("You don't have permission to create Sales Orders.", 403, err.details);
      }
      throw err;
    }
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return mapSalesOrder(raw, new Map());
  }

  async listEvents(id: ID): Promise<SalesOrderEvent[]> {
    const rows = await apiFetch<BackendSalesOrderEvent[]>(`/sales-orders/${id}/events`);
    return rows.map(mapSalesOrderEvent);
  }
}
