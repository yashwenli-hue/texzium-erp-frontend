import { ID, ListQuery, Page } from "../../types/common";
import { Lead, LeadStatus, LeadTimelineEntry } from "../../types/domain";
import { ILeadRepository, CreateLeadInput, UpdateLeadInput, LeadSortField, LeadListOptions, LogLeadActivityInput } from "../interfaces";
import { apiFetch, ApiError } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { validateLeadActivityInput } from "../shared/leadActivity";
import { validateDeactivationReason } from "../shared/leadLifecycle";
import { LeadLocationFields, locationChangeProblems, locationProblems, mergeLocation, EMPTY_STORED_LOCATION, normalizedLocationFields } from "../../geo/leadLocation";
import { BackendLead, BackendLeadTimeline, mapLead, mapLeadTimeline } from "./mappers";
import { LeadSearchQuery, LeadSearchResult, leadSearchParams } from "../shared/leadSearch";
import { LeadDuplicateProbe, LeadDuplicateResult } from "../shared/leadDuplicates";

type BackendFacet = { value: string | null; count: number; person?: { id: string; fullName: string | null } | null };
type BackendLeadSearch = {
  items: BackendLead[];
  total: number;
  page: number;
  pageSize: number;
  facets: Record<"status" | "assignment" | "presales" | "sales" | "source" | "country" | "state" | "city" | "followup" | "lastCall", BackendFacet[]> & {
    /** Absent on a backend before 2026-10-17. */
    stage?: BackendFacet[];
    product?: Array<BackendFacet & { item?: { productName: string; sku?: string | null } | null }>;
  };
};
const hasValue = <T extends { value: string | null }>(f: T): f is T & { value: string } => typeof f.value === "string" && f.value !== "";

const SEARCHABLE: (keyof Lead)[] = ["customerName", "companyName", "sourceName", "assignedToName", "email"];

/** On create there is nothing stored to clear: a blank field is simply not sent. */
function withoutNulls(location: LeadLocationFields): LeadLocationFields {
  const out: LeadLocationFields = {};
  for (const k of ["country", "state", "city"] as const) if (typeof location[k] === "string") out[k] = location[k];
  return out;
}

/** Only the location fields that were mentioned: undefined stays out of the body (keep), null goes in (clear). */
function definedLocation(location: LeadLocationFields): LeadLocationFields {
  const out: LeadLocationFields = {};
  if (location.country !== undefined) out.country = location.country;
  if (location.state !== undefined) out.state = location.state;
  if (location.city !== undefined) out.city = location.city;
  return out;
}

/**
 * VERIFIED leads routes: POST/GET /leads, GET/PATCH /leads/:id. The backend
 * returns a bare, unpaginated array for the list — filtering/search/sort
 * below happen client-side over that full array (docs/backend-ui-contract.md §20).
 * uiContext (Product/Interest, Remarks) is never sent — it has no backend
 * field (Stage 2A brief §6) and is dropped entirely here. The location (country,
 * state, city) is a real field and is sent; it is checked with the backend's rules
 * first, so a bad location fails here with the backend's own words.
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
    // A lead may be created without a location (the API allows it); one that is given is whole and valid.
    const location = normalizedLocationFields({ country: input.country, state: input.state, city: input.city });
    const problem = locationProblems(mergeLocation(EMPTY_STORED_LOCATION, location))[0];
    if (problem) throw new ApiError(problem.message, 400);
    const row = await apiFetch<BackendLead>("/leads", {
      method: "POST",
      body: {
        customerName: input.customerName,
        companyName: input.companyName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        sourceId: input.sourceId,
        ...(input.inventoryItemId ? { inventoryItemId: input.inventoryItemId } : {}),
        ...withoutNulls(location),
      },
    });
    return mapLead(row);
  }

  async update(id: ID, input: UpdateLeadInput): Promise<Lead> {
    // A field left out keeps what is stored; null clears it. The backend checks the whole location after the change.
    const location = normalizedLocationFields({ country: input.country, state: input.state, city: input.city });
    const problem = locationChangeProblems(location)[0];
    if (problem) throw new ApiError(problem.message, 400);
    const row = await apiFetch<BackendLead>(`/leads/${id}`, {
      method: "PATCH",
      body: {
        customerName: input.customerName,
        companyName: input.companyName,
        email: input.email,
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        sourceId: input.sourceId,
        ...(input.inventoryItemId !== undefined ? { inventoryItemId: input.inventoryItemId } : {}),
        ...definedLocation(location),
      },
    });
    return mapLead(row);
  }

  async updateStatus(id: ID, status: LeadStatus, options?: { expectedStatus?: LeadStatus; remarks?: string }): Promise<Lead> {
    const remarks = options?.remarks?.trim();
    const row = await apiFetch<BackendLead>("/lead-status", {
      method: "POST",
      body: {
        leadId: id,
        status,
        ...(options?.expectedStatus ? { expectedStatus: options.expectedStatus } : {}),
        ...(remarks ? { remarks } : {}),
      },
    });
    return mapLead(row);
  }

  async reopen(id: ID, reason: string): Promise<Lead> {
    const clean = reason.trim();
    if (!clean) throw new ApiError("Say why the lead is being reopened.", 400);
    const row = await apiFetch<BackendLead>(`/lead-assignments/${id}/reopen`, {
      method: "PATCH",
      body: { reason: clean },
    });
    return mapLead(row);
  }

  async search(query: LeadSearchQuery): Promise<LeadSearchResult> {
    const res = await apiFetch<BackendLeadSearch>(`/leads/search?${leadSearchParams(query)}`);
    const person = (f: { value: string; count: number; person?: { fullName: string | null } | null }) => ({
      value: f.value,
      count: f.count,
      name: f.person?.fullName ?? "Former user",
    });
    return {
      items: res.items.map(mapLead),
      total: res.total,
      page: res.page,
      pageSize: res.pageSize,
      facets: {
        status: res.facets.status.filter(hasValue),
        stage: (res.facets.stage ?? []).filter(hasValue),
        assignment: res.facets.assignment.filter(hasValue),
        presales: res.facets.presales.filter(hasValue).map(person),
        sales: res.facets.sales.filter(hasValue).map(person),
        source: res.facets.source.filter(hasValue),
        product: (res.facets.product ?? []).filter(hasValue).map((f) => ({
          value: f.value,
          count: f.count,
          name: f.item ? (f.item.sku ? `${f.item.productName} (${f.item.sku})` : f.item.productName) : f.value === "NOT_SET" ? "Not recorded" : "Removed product",
        })),
        country: res.facets.country.filter(hasValue),
        state: res.facets.state.filter(hasValue),
        city: res.facets.city.filter(hasValue),
        followup: res.facets.followup.filter(hasValue),
        lastCall: res.facets.lastCall.filter(hasValue),
      },
    };
  }

  async duplicateCheck(probe: LeadDuplicateProbe): Promise<LeadDuplicateResult> {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(probe)) if (typeof v === "string" && v.trim()) p.set(k, v.trim());
    return apiFetch<LeadDuplicateResult>(`/leads/duplicate-check?${p.toString()}`);
  }

  async duplicatesOf(id: ID): Promise<LeadDuplicateResult> {
    return apiFetch<LeadDuplicateResult>(`/leads/${id}/duplicates`);
  }

  async assign(id: ID, assignedToId: ID, _assignedToName: string): Promise<Lead> {
    const row = await apiFetch<BackendLead>("/lead-assignments", {
      method: "POST",
      body: { leadId: id, assignedToId },
    });
    return mapLead(row);
  }

  async unassign(id: ID, assignedToId: ID, remark?: string): Promise<Lead> {
    const row = await apiFetch<BackendLead>(`/lead-assignments/${id}/unassign`, {
      method: "PATCH",
      body: remark ? { assignedToId, remarks: remark } : { assignedToId },
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
        ...(valid.remarks ? { remarks: valid.remarks } : {}),
        ...(valid.outcome ? { outcome: valid.outcome } : {}),
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
