import { ID, ListQuery, Page } from "../../types/common";
import { Lead, LeadStatus, LeadTimelineEntry } from "../../types/domain";
import { ILeadRepository, CreateLeadInput, UpdateLeadInput, LeadSortField, LeadListOptions, LogLeadActivityInput } from "../interfaces";
import { apiFetch, ApiError } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { validateLeadActivityInput } from "../shared/leadActivity";
import { validateDeactivationReason } from "../shared/leadLifecycle";
import { BackendLead, BackendLeadTimeline, mapLead, mapLeadTimeline } from "./mappers";

const SEARCHABLE: (keyof Lead)[] = ["customerName", "companyName", "sourceName", "assignedToName", "email"];

/**
 * VERIFIED leads routes: POST/GET /leads, GET/PATCH /leads/:id. The backend
 * returns a bare, unpaginated array for the list — filtering/search/sort
 * below happen client-side over that full array (docs/backend-ui-contract.md §20).
 * uiContext (Product/Interest, Remarks, City) is never sent — it has no
 * backend field (Stage 2A brief §6) and is dropped entirely here.
 */
export class RealLeadRepository implements ILeadRepository {
  async list(query?: ListQuery<LeadSortField>, options?: LeadListOptions): Promise<Page<Lead>> {
    // Inactive leads are left out by the backend unless asked for. The dedup key
    // is the full path, so the two variants never share a request.
    const rows = await apiFetch<BackendLead[]>(options?.includeInactive ? "/leads?includeInactive=true" : "/leads");
    return applyListQuery(rows.map(mapLead), query, SEARCHABLE);
  }

  async getById(id: ID): Promise<Lead | null> {
    try {
      const row = await apiFetch<BackendLead>(`/leads/${id}`);
      return mapLead(row);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async create(input: CreateLeadInput): Promise<Lead> {
    const row = await apiFetch<BackendLead>("/leads", {
      method: "POST",
      body: {
        customerName: input.customerName,
        companyName: input.companyName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        sourceId: input.sourceId,
      },
    });
    return mapLead(row);
  }

  async update(id: ID, input: UpdateLeadInput): Promise<Lead> {
    const row = await apiFetch<BackendLead>(`/leads/${id}`, {
      method: "PATCH",
      body: {
        customerName: input.customerName,
        companyName: input.companyName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        sourceId: input.sourceId,
      },
    });
    return mapLead(row);
  }

  async updateStatus(id: ID, status: LeadStatus): Promise<Lead> {
    const row = await apiFetch<BackendLead>("/lead-status", {
      method: "POST",
      body: { leadId: id, status },
    });
    return mapLead(row);
  }

  async assign(id: ID, assignedToId: ID, _assignedToName: string): Promise<Lead> {
    const row = await apiFetch<BackendLead>("/lead-assignments", {
      method: "POST",
      body: { leadId: id, assignedToId },
    });
    return mapLead(row);
  }

  async qualify(id: ID, salesUserId: ID): Promise<Lead> {
    const row = await apiFetch<BackendLead>(`/lead-assignments/${id}/qualify`, {
      method: "PATCH",
      body: { salesUserId },
    });
    return mapLead(row);
  }

  async reject(id: ID, reason: string): Promise<Lead> {
    const row = await apiFetch<BackendLead>(`/lead-assignments/${id}/reject`, {
      method: "PATCH",
      body: { reason },
    });
    return mapLead(row);
  }

  async getTimeline(leadId: ID): Promise<LeadTimelineEntry[]> {
    // No standalone timeline endpoint: the timeline is embedded in the lead
    // detail response, already ordered newest-first by the backend (occurredAt,
    // then createdAt, then id). The sort below is stable and only guards an
    // older backend; ties keep the server's order.
    const row = await apiFetch<BackendLead>(`/leads/${leadId}`);
    return (row.timelines ?? [])
      .map(mapLeadTimeline)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  async logActivity(leadId: ID, input: LogLeadActivityInput): Promise<LeadTimelineEntry> {
    // Same checks the backend applies, so a bad payload fails here with the same
    // message instead of a round trip. The actor is never sent: the backend
    // takes it from the authenticated user.
    const valid = validateLeadActivityInput(input);
    const row = await apiFetch<BackendLeadTimeline>(`/leads/${leadId}/activities`, {
      method: "POST",
      body: {
        activityType: valid.activityType,
        remarks: valid.remarks,
        ...(valid.occurredAt ? { occurredAt: valid.occurredAt } : {}),
      },
    });
    return mapLeadTimeline(row);
  }

  async deactivate(id: ID, reason: string): Promise<Lead> {
    // Checked here with the backend's own rule, so a bad reason fails without a
    // round trip. The actor is never sent: the backend uses the signed-in user.
    const clean = validateDeactivationReason(reason);
    const row = await apiFetch<BackendLead>(`/leads/${id}/deactivate`, {
      method: "PATCH",
      body: { reason: clean },
    });
    return mapLead(row);
  }

  async reactivate(id: ID): Promise<Lead> {
    const row = await apiFetch<BackendLead>(`/leads/${id}/reactivate`, { method: "PATCH" });
    return mapLead(row);
  }
}
