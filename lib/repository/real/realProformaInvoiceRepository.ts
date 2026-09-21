import { ID, ListQuery, Page } from "../../types/common";
import { ProformaInvoice, Quotation } from "../../types/domain";
import { CreateProformaInvoiceInput, IProformaInvoiceRepository, IQuotationRepository, ProformaInvoiceSortField } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendProformaInvoice, mapProformaInvoice } from "./mappers";

const SEARCHABLE: (keyof ProformaInvoice)[] = ["proformaNumber", "quoteNo", "customerName", "opportunityName", "ownerName"];

/**
 * VERIFIED proforma-invoices routes: POST /, GET /, PATCH /:id/approve
 * (docs/backend-ui-contract.md §9). No GET /:id exists — getById() works
 * from the same full list, same pattern as Opportunities/Quotations. GET
 * /proforma-invoices only nests the raw Quotation (no customerName field),
 * so this repository takes the real Quotation repository as a dependency
 * to resolve customerName/opportunityName/ownerName the same way the
 * Quotations screen itself does.
 *
 * SECURITY NOTE (not fixed — backend is read-only): the proforma-invoices
 * controller has no `@UseGuards`/`@Permissions` at all — every route here
 * is reachable without a JWT, same as Quotations. Confirmed by reading
 * proforma-invoices.controller.ts directly.
 */
export class RealProformaInvoiceRepository implements IProformaInvoiceRepository {
  constructor(private quotations: IQuotationRepository) {}

  private async quotationMap(): Promise<Map<string, Quotation>> {
    const page = await this.quotations.list();
    return new Map(page.items.map((q) => [q.id, q]));
  }

  private async fetchAll(): Promise<ProformaInvoice[]> {
    const [rows, qById] = await Promise.all([
      apiFetch<BackendProformaInvoice[]>("/proforma-invoices"),
      this.quotationMap(),
    ]);
    return rows.map((raw) => mapProformaInvoice(raw, qById));
  }

  async list(query?: ListQuery<ProformaInvoiceSortField>): Promise<Page<ProformaInvoice>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getById(id: ID): Promise<ProformaInvoice | null> {
    const all = await this.fetchAll();
    return all.find((p) => p.id === id) ?? null;
  }

  async create(input: CreateProformaInvoiceInput): Promise<ProformaInvoice> {
    const raw = await apiFetch<BackendProformaInvoice>("/proforma-invoices", {
      method: "POST",
      body: {
        quotationId: input.quotationId,
        issueDate: input.issueDate,
        totalAmount: input.totalAmount,
        validityDate: input.validityDate,
        remarks: input.remarks,
      },
    });
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return mapProformaInvoice(raw, new Map());
  }

  async approve(id: ID): Promise<ProformaInvoice> {
    await apiFetch<BackendProformaInvoice>(`/proforma-invoices/${id}/approve`, { method: "PATCH" });
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Proforma invoice ${id} not found`);
    return updated;
  }
}
