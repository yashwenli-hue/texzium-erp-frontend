import type { Lead, LeadStatus } from "../../types/domain";
import { formatLeadStatus } from "../../types/domain";
import type { FilterMap, SortState } from "../../types/common";
import type { FollowupInfo } from "../../followup";
import { countryName } from "../../geo/countries";
import { locationSearchText } from "../../geo/leadLocation";

/**
 * How the Leads list reads, filters and orders leads. Pure functions over the list the
 * backend returns (GET /leads has no query parameters, so search, filter, sort and
 * paging are done here, on what was fetched), plus the list's remembered view.
 */

/** The statuses in lifecycle order, the order the Status filter offers them in. */
export const LEAD_STATUS_ORDER: readonly LeadStatus[] = [
  "NEW",
  "ASSIGNED",
  "PRE_SALES_ASSIGNED",
  "CONTACTED",
  "QUALIFIED",
  "SALES_ASSIGNED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "REJECTED",
];

/** The Status filter's choices: the statuses the loaded leads have, in lifecycle order. */
export function leadStatusOptions(leads: readonly Pick<Lead, "status">[]): string[] {
  const present = new Set(leads.map((l) => l.status));
  const known = LEAD_STATUS_ORDER.filter((s) => present.has(s));
  // A status the frontend does not know yet still gets a choice, after the known ones.
  const unknown = [...present].filter((s) => !LEAD_STATUS_ORDER.includes(s)).sort();
  return [...known, ...unknown].map(formatLeadStatus);
}

export const LEAD_SORT_FIELDS = ["customerName", "createdAt", "lastActivityAt"] as const;
export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number];

export const NOT_SET = "Not set";
export const ASSIGNMENT_OPTIONS = ["Assigned", "Unassigned"] as const;

export interface LeadListView {
  search: string;
  filters: FilterMap;
  dateRange: { from: string; to: string };
  sort: SortState<LeadSortField>;
  page: number;
  showDeactivated: boolean;
}

export const DEFAULT_LEAD_LIST_VIEW: LeadListView = {
  search: "",
  filters: {},
  dateRange: { from: "", to: "" },
  sort: { field: "lastActivityAt", direction: "desc" },
  page: 1,
  showDeactivated: false,
};

export const LEAD_LIST_VIEW_KEY = "revenueos.leads.view.v1";

const MAX_SEARCH = 200;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A remembered view, checked field by field: anything malformed falls back to the default for that field. */
export function sanitizeLeadListView(raw: unknown): LeadListView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_LEAD_LIST_VIEW;

  const filters: FilterMap = {};
  if (r.filters && typeof r.filters === "object" && !Array.isArray(r.filters)) {
    for (const [key, value] of Object.entries(r.filters as Record<string, unknown>)) {
      if (typeof value === "string") filters[key] = value;
      else if (Array.isArray(value) && value.every((v) => typeof v === "string") && value.length > 0) filters[key] = value as string[];
    }
  }

  const range = r.dateRange as Record<string, unknown> | undefined;
  const day = (v: unknown) => (typeof v === "string" && DAY.test(v) ? v : "");
  const sort = r.sort as Record<string, unknown> | undefined;
  const sortOk = !!sort && LEAD_SORT_FIELDS.includes(sort.field as LeadSortField) && (sort.direction === "asc" || sort.direction === "desc");

  return {
    search: typeof r.search === "string" ? r.search.slice(0, MAX_SEARCH) : d.search,
    filters,
    dateRange: range && typeof range === "object" ? { from: day(range.from), to: day(range.to) } : d.dateRange,
    sort: sortOk ? { field: sort!.field as LeadSortField, direction: sort!.direction as "asc" | "desc" } : d.sort,
    page: typeof r.page === "number" && Number.isInteger(r.page) && r.page >= 1 ? r.page : d.page,
    showDeactivated: typeof r.showDeactivated === "boolean" ? r.showDeactivated : d.showDeactivated,
  };
}

/** The page to show: a remembered page past the end (the list got shorter) becomes the last page. */
export function clampPage(page: number, total: number, pageSize: number): number {
  const last = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), last);
}

const valuesOf = (filters: FilterMap, key: string): string[] => {
  const v = filters[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
};

export interface LeadListContext {
  followupById: ReadonlyMap<string, FollowupInfo>;
  categoryBySourceId: ReadonlyMap<string, string | undefined>;
}

export function filterAndSortLeads(leads: readonly Lead[], view: Pick<LeadListView, "search" | "filters" | "dateRange" | "sort">, ctx: LeadListContext): Lead[] {
  const { filters, dateRange, search, sort } = view;
  let rows = [...leads];
  const statusF = valuesOf(filters, "status");
  const sourceF = valuesOf(filters, "source");
  const sourceTypeF = valuesOf(filters, "sourceType");
  const followupF = valuesOf(filters, "followup");
  const countryF = valuesOf(filters, "country");
  const stateF = valuesOf(filters, "state");
  const cityF = valuesOf(filters, "city");
  const assignmentF = valuesOf(filters, "assignment");

  if (statusF.length) rows = rows.filter((l) => statusF.includes(formatLeadStatus(l.status)));
  if (sourceF.length) rows = rows.filter((l) => sourceF.includes(l.sourceName));
  if (sourceTypeF.length) rows = rows.filter((l) => sourceTypeF.includes(ctx.categoryBySourceId.get(l.sourceId) ?? ""));
  if (followupF.length) rows = rows.filter((l) => followupF.includes(ctx.followupById.get(l.id)?.urgency ?? "None"));
  if (countryF.length) rows = rows.filter((l) => countryF.includes(l.country ? countryName(l.country) : NOT_SET));
  if (stateF.length) rows = rows.filter((l) => stateF.includes(l.state ?? ""));
  if (cityF.length) rows = rows.filter((l) => cityF.includes(l.city ?? ""));
  // Both choices together are the same as neither.
  const wantAssigned = assignmentF.includes("Assigned");
  const wantUnassigned = assignmentF.includes("Unassigned");
  if (wantAssigned !== wantUnassigned) rows = rows.filter((l) => (wantAssigned ? !!l.assignedToId : !l.assignedToId));

  // The same createdAt that the Received column shows and sorts by, as local calendar days.
  if (dateRange.from) {
    const fromTs = new Date(`${dateRange.from}T00:00:00`).getTime();
    rows = rows.filter((l) => new Date(l.createdAt).getTime() >= fromTs);
  }
  if (dateRange.to) {
    const toTs = new Date(`${dateRange.to}T23:59:59.999`).getTime();
    rows = rows.filter((l) => new Date(l.createdAt).getTime() <= toTs);
  }

  const q = search.trim().toLowerCase();
  // A phone number matches on its digits, however it was typed, once there are enough to mean something.
  const qDigits = q.replace(/\D/g, "");
  if (q) {
    rows = rows.filter(
      (l) =>
        l.customerName.toLowerCase().includes(q) ||
        (l.companyName ?? "").toLowerCase().includes(q) ||
        (l.uiContext?.productInterest ?? "").toLowerCase().includes(q) ||
        locationSearchText(l).includes(q) ||
        (l.assignedToName ?? "").toLowerCase().includes(q) ||
        (qDigits.length >= 3 && l.phone.replace(/\D/g, "").includes(qDigits)) ||
        (l.email ?? "").toLowerCase().includes(q)
    );
  }

  const key = (l: Lead) => (sort.field === "customerName" ? l.customerName.toLowerCase() : l[sort.field] ?? "");
  rows.sort((a, b) => {
    const cmp = key(a).localeCompare(key(b));
    return sort.direction === "asc" ? cmp : -cmp;
  });
  return rows;
}

/** "Asha Rao, Sterling Pumps, Pune": what a row's link is called, with everything the row may cut short. */
export function leadRowLabel(lead: Pick<Lead, "customerName" | "companyName">, location: string): string {
  return [lead.customerName, lead.companyName, location].filter(Boolean).join(", ");
}
