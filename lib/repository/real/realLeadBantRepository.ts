import { apiFetch } from "../../api/httpClient";
import { ID } from "../../types/common";
import { LeadBantView } from "../../types/domain";
import { ILeadBantRepository, SaveLeadBantInput } from "../interfaces";

/**
 * VERIFIED: GET/PUT /leads/:id/bant. The response is already in the frontend's shape
 * (questions, answers, score, grade, complete, missing, completedAt, updatedAt).
 */
export class RealLeadBantRepository implements ILeadBantRepository {
  async get(leadId: ID): Promise<LeadBantView> {
    return apiFetch<LeadBantView>(`/leads/${leadId}/bant`);
  }

  async save(leadId: ID, input: SaveLeadBantInput): Promise<LeadBantView> {
    return apiFetch<LeadBantView>(`/leads/${leadId}/bant`, { method: "PUT", body: input });
  }
}
