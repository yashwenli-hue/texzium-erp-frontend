import { ID, ListQuery, Page } from "../../types/common";
import { Opportunity, Quotation } from "../../types/domain";
import { CreateQuotationInput, IOpportunityRepository, IQuotationRepository, QuotationSortField } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendQuotation, mapQuotation } from "./mappers";

const SEARCHABLE: (keyof Quotation)[] = ["quoteNo", "customerName", "opportunityName", "ownerName"];

/**
 * VERIFIED quotations routes: POST /, GET /, PATCH /:id/revise,
 * PATCH /:id/approve, POST /:id/convert (docs/backend-ui-contract.md §8).
 * No GET /:id exists — getById() works from the same full list, same
 * pattern as RealOpportunityRepository. GET /quotations only nests the raw
 * Opportunity (no customerName field), so this repository takes the real
 * Opportunity repository as a dependency to resolve customerName/
 * opportunityName/ownerName the same way the Opportunities screen itself does.
 *
 * SECURITY NOTE (not fixed — backend is read-only): the quotations
 * controller has no `@UseGuards`/`@Permissions` at all — every route here
 * is reachable without a JWT. Confirmed by reading quotations.controller.ts
 * directly. Flagged in the Stage 2C report.
 */
export class RealQuotationRepository implements IQuotationRepository {
  constructor(private opportunities: IOpportunityRepository) {}

  private async opportunityMap(): Promise<Map<string, Opportunity>> {
    const page = await this.opportunities.list();
    return new Map(page.items.map((o) => [o.id, o]));
  }

  private async fetchAll(): Promise<Quotation[]> {
    const [rows, oppById] = await Promise.all([
      apiFetch<BackendQuotation[]>("/quotations"),
      this.opportunityMap(),
    ]);
    return rows.map((raw) => mapQuotation(raw, oppById));
  }

  async list(query?: ListQuery<QuotationSortField>): Promise<Page<Quotation>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getById(id: ID): Promise<Quotation | null> {
    const all = await this.fetchAll();
    return all.find((q) => q.id === id) ?? null;
  }

  async create(input: CreateQuotationInput): Promise<Quotation> {
    const raw = await apiFetch<BackendQuotation>("/quotations", {
      method: "POST",
      body: {
        opportunityId: input.opportunityId,
        quoteDate: input.quoteDate,
        inventoryItemId: input.inventoryItemId,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        sellerGstId: input.sellerGstId,
        buyerGstId: input.buyerGstId,
      },
    });
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return mapQuotation(raw, new Map());
  }

  async revise(id: ID, amount: number): Promise<Quotation> {
    // VERIFIED body shape: { totalAmount }. `note` has no backend field — never sent.
    await apiFetch<BackendQuotation>(`/quotations/${id}/revise`, {
      method: "PATCH",
      body: { totalAmount: amount },
    });
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return updated;
  }

  async approve(id: ID): Promise<Quotation> {
    await apiFetch<BackendQuotation>(`/quotations/${id}/approve`, { method: "PATCH" });
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return updated;
  }

  async convert(id: ID): Promise<{ quotation: Quotation; salesOrderId: ID }> {
    // VERIFIED: creates a real SalesOrder linked to this quotation, but never
    // writes a status back onto the Quotation itself (confirmed by reading
    // quotations.service.ts) — re-fetching honestly reflects that the
    // quotation's own status is unchanged, rather than fabricating CONVERTED.
    // The endpoint's response body is the created SalesOrder record itself
    // (quotationsService.convertToSalesOrder returns prisma.salesOrder.create()
    // directly) — its id is read straight from that response, never re-derived.
    const salesOrder = await apiFetch<{ id: string }>(`/quotations/${id}/convert`, { method: "POST" });
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return { quotation: updated, salesOrderId: salesOrder.id };
  }
}
