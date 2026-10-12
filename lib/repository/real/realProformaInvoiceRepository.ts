import { ID, ListQuery, Page } from "../../types/common";
import { ProformaEvent, ProformaInvoice, Quotation } from "../../types/domain";
import { CreateProformaInvoiceInput, IProformaInvoiceRepository, IQuotationRepository, ProformaInvoiceSortField } from "../interfaces";
import { ApiError, apiFetch, DownloadedFile } from "../../api/httpClient";
import { downloadDocument } from "./documentDownload";
import { applyListQuery } from "../shared/listQuery";
import {
  PROFORMA_REASON_MAX_LENGTH,
  PROFORMA_REMARKS_MAX_LENGTH,
  ProformaConflictError,
} from "../shared/proformaLifecycle";
import { cleanQuotationText } from "../shared/quotationLifecycle";
import { BackendProformaEvent, BackendProformaInvoice, mapProformaEvent, mapProformaInvoice } from "./mappers";

const SEARCHABLE: (keyof ProformaInvoice)[] = ["proformaNumber", "quoteNo", "customerName", "opportunityName", "ownerName"];

/**
 * VERIFIED proforma-invoices routes (backend commit 1d0b1dc): POST /, GET /,
 * GET /:id/events, PATCH /:id/approve, PATCH /:id/cancel. Every route needs a
 * signed-in user and one permission (proformas.view / create / approve /
 * cancel). No GET /:id exists — getById() works from the same full list, same
 * pattern as Opportunities/Quotations. GET /proforma-invoices nests the raw
 * Quotation (no customerName field), so this repository takes the real
 * Quotation repository as a dependency to resolve customerName/opportunityName/
 * ownerName. Someone with proformas.view but not quotations.view still gets
 * their Proformas: the quotation lookup then simply comes back empty and those
 * denormalized fields show "—".
 *
 * The create body never carries a total: the backend derives it from the
 * APPROVED quotation. A 409 (not approved, already an active Proforma, expired,
 * a live Sales Order) is raised as ProformaConflictError so screens reload and
 * show the backend's message; a 403 stays an ApiError(403) and changes nothing.
 */
export class RealProformaInvoiceRepository implements IProformaInvoiceRepository {
  constructor(private quotations: IQuotationRepository) {}

  private async quotationMap(): Promise<Map<string, Quotation>> {
    try {
      const page = await this.quotations.list();
      return new Map(page.items.map((q) => [q.id, q]));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) return new Map();
      throw err;
    }
  }

  private async fetchAll(): Promise<ProformaInvoice[]> {
    const [rows, qById] = await Promise.all([
      apiFetch<BackendProformaInvoice[]>("/proforma-invoices"),
      this.quotationMap(),
    ]);
    return rows.map((raw) => mapProformaInvoice(raw, qById));
  }

  private async reload(id: ID): Promise<ProformaInvoice> {
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Proforma invoice ${id} not found`);
    return updated;
  }

  private async call<T>(path: string, method: "POST" | "PATCH", body: unknown, forbidden: string): Promise<T> {
    try {
      return await apiFetch<T>(path, { method, body });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) throw new ProformaConflictError(err.message);
        if (err.status === 403) throw new ApiError(forbidden, 403, err.details);
      }
      throw err;
    }
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
    const remarks = cleanQuotationText(input.remarks, PROFORMA_REMARKS_MAX_LENGTH, false, "Remarks");
    const raw = await this.call<BackendProformaInvoice>(
      "/proforma-invoices",
      "POST",
      {
        quotationId: input.quotationId,
        issueDate: input.issueDate,
        validityDate: input.validityDate,
        ...(remarks ? { remarks } : {}),
      },
      "You don't have permission to create Proforma Invoices."
    );
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return mapProformaInvoice(raw, new Map());
  }

  async approve(id: ID, remarks?: string): Promise<ProformaInvoice> {
    const note = cleanQuotationText(remarks, PROFORMA_REMARKS_MAX_LENGTH, false, "Remarks");
    await this.call(`/proforma-invoices/${id}/approve`, "PATCH", note ? { remarks: note } : {}, "You don't have permission to approve Proforma Invoices.");
    return this.reload(id);
  }

  async cancel(id: ID, reason: string): Promise<ProformaInvoice> {
    // Refused before any request: the backend requires a reason.
    const clean = cleanQuotationText(reason, PROFORMA_REASON_MAX_LENGTH, true, "A reason");
    await this.call(`/proforma-invoices/${id}/cancel`, "PATCH", { reason: clean }, "You don't have permission to cancel Proforma Invoices.");
    return this.reload(id);
  }

  async listEvents(id: ID): Promise<ProformaEvent[]> {
    const rows = await apiFetch<BackendProformaEvent[]>(`/proforma-invoices/${id}/events`);
    return rows.map(mapProformaEvent);
  }

  downloadPdf(id: ID): Promise<DownloadedFile> {
    return downloadDocument(`/proforma-invoices/${encodeURIComponent(id)}/document.pdf`, "proforma.pdf", "You don't have permission to view Proforma Invoices.");
  }
}
