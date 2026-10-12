import { ID, ListQuery, Page } from "../../types/common";
import { Opportunity, Quotation, QuotationEvent } from "../../types/domain";
import { CreateQuotationInput, IOpportunityRepository, IQuotationRepository, QuotationRevision, QuotationSortField } from "../interfaces";
import { ApiError, apiFetch, DownloadedFile } from "../../api/httpClient";
import { downloadDocument } from "./documentDownload";
import { applyListQuery } from "../shared/listQuery";
import {
  QUOTATION_REASON_MAX_LENGTH,
  QUOTATION_REMARKS_MAX_LENGTH,
  QuotationConflictError,
  cleanQuotationText,
  parseTaxableAmount,
  parseUnitRate,
} from "../shared/quotationLifecycle";
import { BackendQuotation, BackendQuotationEvent, mapQuotation, mapQuotationEvent } from "./mappers";

const SEARCHABLE: (keyof Quotation)[] = ["quoteNo", "customerName", "opportunityName", "ownerName"];

/**
 * VERIFIED quotation routes (backend commit 1246647): POST /, GET /,
 * GET /:id/events, PATCH /:id/revise, PATCH /:id/approve, PATCH /:id/reject.
 * Every route needs a signed-in user and one permission (quotations.view /
 * create / edit / approve / reject). The old POST /:id/convert route is retired
 * (it answers 410 and writes nothing) and the old PATCH /:id/status is gone, so
 * neither is used here. No GET /:id exists — getById() works from the same full
 * list, same pattern as RealOpportunityRepository. GET /quotations only nests
 * the raw Opportunity (no customerName field), so this repository takes the real
 * Opportunity repository as a dependency to resolve customerName/
 * opportunityName/ownerName the same way the Opportunities screen itself does.
 *
 * Failure handling: a 409 means the quotation is no longer where the person saw
 * it (someone else acted, it is locked by a Proforma or Sales Order, or its
 * legacy tax breakdown forbids the action) and is raised as
 * QuotationConflictError so screens reload and show the backend's message. A 403
 * stays an ApiError(403) and changes nothing.
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

  private async reload(id: ID): Promise<Quotation> {
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Quotation ${id} not found`);
    return updated;
  }

  private async mutate(path: string, body: unknown, forbidden: string): Promise<void> {
    try {
      await apiFetch<BackendQuotation>(path, { method: "PATCH", body });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) throw new QuotationConflictError(err.message);
        if (err.status === 403) throw new ApiError(forbidden, 403, err.details);
      }
      throw err;
    }
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
    let raw: BackendQuotation;
    try {
      raw = await apiFetch<BackendQuotation>("/quotations", {
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
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        throw new ApiError("You don't have permission to create quotations.", 403, err.details);
      }
      throw err;
    }
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return mapQuotation(raw, new Map());
  }

  async revise(id: ID, change: QuotationRevision, remarks?: string): Promise<Quotation> {
    // Only the unit rate (or, for an older quotation, the taxable amount) goes
    // over the wire; the taxable value, GST and the total are the backend's.
    const byRate = "unitPrice" in change;
    const parsed = byRate ? parseUnitRate(String(change.unitPrice)) : parseTaxableAmount(String(change.taxableAmount));
    if (parsed.error !== undefined) throw new Error(parsed.error);
    const note = cleanQuotationText(remarks, QUOTATION_REMARKS_MAX_LENGTH, false, "Remarks");
    await this.mutate(
      `/quotations/${id}/revise`,
      { ...(byRate ? { unitPrice: parsed.value } : { taxableAmount: parsed.value }), ...(note ? { remarks: note } : {}) },
      "You don't have permission to revise quotations."
    );
    return this.reload(id);
  }

  downloadPdf(id: ID): Promise<DownloadedFile> {
    return downloadDocument(`/quotations/${encodeURIComponent(id)}/document.pdf`, "quotation.pdf", "You don't have permission to view quotations.");
  }

  async approve(id: ID, remarks?: string): Promise<Quotation> {
    const note = cleanQuotationText(remarks, QUOTATION_REMARKS_MAX_LENGTH, false, "Remarks");
    await this.mutate(`/quotations/${id}/approve`, note ? { remarks: note } : {}, "You don't have permission to approve quotations.");
    return this.reload(id);
  }

  async reject(id: ID, reason: string): Promise<Quotation> {
    // Refused before any request: the backend requires a reason.
    const clean = cleanQuotationText(reason, QUOTATION_REASON_MAX_LENGTH, true, "A reason");
    await this.mutate(`/quotations/${id}/reject`, { reason: clean }, "You don't have permission to reject quotations.");
    return this.reload(id);
  }

  async listEvents(id: ID): Promise<QuotationEvent[]> {
    const rows = await apiFetch<BackendQuotationEvent[]>(`/quotations/${id}/events`);
    return rows.map(mapQuotationEvent);
  }
}
