import { ID, ListQuery, Page } from "../../types/common";
import { Lead, LeadStatus, LeadTimelineEntry } from "../../types/domain";
import { ILeadRepository, CreateLeadInput, UpdateLeadInput, LeadSortField } from "../interfaces";
import { apiFetch, ApiError } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendLead, mapLead, mapLeadTimeline } from "./mappers";

const SEARCHABLE: (keyof Lead)[] = ["customerName", "companyName", "sourceName", "assignedToName", "email"];

/**
 * VERIFIED leads routes: POST/GET /leads, GET/PATCH /leads/:id. The backend
 * returns a bare, unpaginated array for the list — filtering/search/sort
 * below happen client-side over that full array (docs/backend-ui-contract.md §20).
 * uiContext (Product/Interest, Remarks, City) is never sent — it has no
 * backend field (Stage 2A brief §6) and is dropped entirely here.
 */
export class RealLeadRepository implements ILeadRepository {
  async list(query?: ListQuery<LeadSortField>): Promise<Page<Lead>> {
    const rows = await apiFetch<BackendLead[]>("/leads");
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
    // No standalone timeline endpoint is confirmed — timelines only come
    // embedded in the single Lead detail response (docs/backend-ui-contract.md §9).
    const row = await apiFetch<BackendLead>(`/leads/${leadId}`);
    return (row.timelines ?? []).map(mapLeadTimeline).sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }

  async appendTimelineEntry(): Promise<LeadTimelineEntry> {
    // No backend endpoint creates an arbitrary timeline entry — real timeline
    // rows are only ever written by the specific verified actions (assign,
    // qualify, reject, status update, followups, opportunity creation). The
    // Lead Detail page hides "Log Activity" for the real repository so this
    // should never actually be called; it throws rather than faking a write.
    throw new Error("Activity logging isn't available yet for the connected backend.");
  }
}
