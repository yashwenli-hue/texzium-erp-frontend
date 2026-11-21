import { ID } from "../../types/common";
import { FollowupCalendarEntry, LeadFollowup } from "../../types/domain";
import { CreateFollowupInput, ILeadFollowupRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendLeadFollowup, mapLeadFollowup } from "./mappers";

/** VERIFIED lead-followups routes — see docs/backend-ui-contract.md §5. */
export class RealLeadFollowupRepository implements ILeadFollowupRepository {
  async listByLead(leadId: ID): Promise<LeadFollowup[]> {
    const rows = await apiFetch<BackendLeadFollowup[]>(`/lead-followups/${leadId}`);
    return rows.map(mapLeadFollowup);
  }

  async create(input: CreateFollowupInput): Promise<LeadFollowup> {
    const row = await apiFetch<BackendLeadFollowup>("/lead-followups", {
      method: "POST",
      body: { leadId: input.leadId, followupDate: input.followupDate, remarks: input.remarks },
    });
    return mapLeadFollowup(row);
  }

  async complete(id: ID): Promise<LeadFollowup> {
    const row = await apiFetch<BackendLeadFollowup>(`/lead-followups/${id}/complete`, { method: "PATCH" });
    return mapLeadFollowup(row);
  }

  async reschedule(id: ID, followupDate: string): Promise<LeadFollowup> {
    const row = await apiFetch<BackendLeadFollowup>(`/lead-followups/${id}/reschedule`, {
      method: "PATCH",
      body: { followupDate },
    });
    return mapLeadFollowup(row);
  }

  async cancel(id: ID): Promise<LeadFollowup> {
    const row = await apiFetch<BackendLeadFollowup>(`/lead-followups/${id}/cancel`, { method: "PATCH" });
    return mapLeadFollowup(row);
  }

  async listMine(_userId: ID, from: string, to: string): Promise<FollowupCalendarEntry[]> {
    const q = new URLSearchParams({ from, to });
    return apiFetch<FollowupCalendarEntry[]>(`/lead-followups/mine?${q}`);
  }

  async calendar(from: string, to: string, ownerId?: ID): Promise<FollowupCalendarEntry[]> {
    const q = new URLSearchParams({ from, to });
    if (ownerId) q.set("ownerId", ownerId);
    return apiFetch<FollowupCalendarEntry[]>(`/lead-followups/calendar?${q}`);
  }
}
