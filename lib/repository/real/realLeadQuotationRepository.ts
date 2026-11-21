import { apiFetch } from "../../api/httpClient";
import { ID } from "../../types/common";
import { LeadQuotationSummary } from "../../types/domain";
import { ILeadQuotationRepository } from "../interfaces";

/** VERIFIED: GET /leads/:id/quotations (already in the frontend's shape; no prices). */
export class RealLeadQuotationRepository implements ILeadQuotationRepository {
  async listForLead(leadId: ID): Promise<LeadQuotationSummary[]> {
    return apiFetch<LeadQuotationSummary[]>(`/leads/${leadId}/quotations`);
  }
}
