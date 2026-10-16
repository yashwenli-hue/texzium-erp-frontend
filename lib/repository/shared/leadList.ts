import type { Lead, LeadStatus } from "../../types/domain";
import { LEAD_STATUSES, formatLeadStatus } from "../../types/domain";
import type { FilterMap, SortState } from "../../types/common";
import type { FollowupUrgency } from "../../followup";
import { countryName } from "../../geo/countries";
import { LEAD_SEARCH_SORTS, LastCallFilter, LeadSearchQuery, LeadSearchSort, NOT_SET_COUNTRY } from "./leadSearch";

/**
 * The remembered view of a lead list (the Leads list and the Pre-Sales panel), and how it
 * becomes a GET /leads/search query. Filtering, sorting, paging and counting all happen on
 * the server; this module only keeps the person's choices and turns them into a query.
 */

/** The statuses in lifecycle order, the order the Status filter offers them in. */
export const LEAD_STATUS_ORDER: readonly LeadStatus[] = [
  "NEW",
  "ASSIGNED",
  "PRE_SALES_ASSIGNED",
  "CONTACTED",
  "UNDERQUALIFIED",
  "QUALIFIED",
  "SALES_ASSIGNED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "REJECTED",
];

export type LeadSortField = LeadSearchSort;

/** The filter keys a list keeps, each a list of values sent to the server. */
export const LEAD_FILTER_KEYS = ["status", "assignment", "presales", "sales", "followup", "lastCall", "source", "country", "state", "city"] as const;
export type LeadFilterKey = (typeof LEAD_FILTER_KEYS)[number];

export const ASSIGNMENT_LABEL: Record<"assigned" | "unassigned", string> = { assigned: "Assigned", unassigned: "Unassigned" };
export const LAST_CALL_LABEL: Record<LastCallFilter, string> = { CNC: "Not connected (CNC)", CONNECTED: "Connected", NONE: "No call logged" };
export const FOLLOWUP_OPTIONS: readonly FollowupUrgency[] = ["Overdue", "Due Today", "Tomorrow", "Scheduled", "None"];

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

/** v2: filters hold server values (status codes, user ids, country codes), not labels. */
export const LEAD_LIST_VIEW_KEY = "revenueos.leads.view.v2";
export const PRESALES_VIEW_KEY = "revenueos.presales.view.v1";

const MAX_SEARCH = 100;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A remembered view, checked field by field: anything malformed falls back to the default for that field. */
export function sanitizeLeadListView(raw: unknown): LeadListView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const d = DEFAULT_LEAD_LIST_VIEW;

  const filters: FilterMap = {};
  if (r.filters && typeof r.filters === "object" && !Array.isArray(r.filters)) {
    for (const [key, value] of Object.entries(r.filters as Record<string, unknown>)) {
      if (!(LEAD_FILTER_KEYS as readonly string[]).includes(key)) continue;
      if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string" && v.length <= 100)) filters[key] = value as string[];
    }
  }

  const range = r.dateRange as Record<string, unknown> | undefined;
  const day = (v: unknown) => (typeof v === "string" && DAY.test(v) ? v : "");
  const sort = r.sort as Record<string, unknown> | undefined;
  const sortOk = !!sort && (LEAD_SEARCH_SORTS as readonly string[]).includes(sort.field as string) && (sort.direction === "asc" || sort.direction === "desc");

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

const valuesOf = (filters: FilterMap, key: LeadFilterKey): string[] => {
  const v = filters[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
};

/** The view as a GET /leads/search query. `search` is the (debounced) text to send. */
export function toSearchQuery(view: LeadListView, search: string, pageSize: number): LeadSearchQuery {
  const f = view.filters;
  const list = (key: LeadFilterKey) => (valuesOf(f, key).length ? valuesOf(f, key) : undefined);
  const status = valuesOf(f, "status").filter((s): s is LeadStatus => (LEAD_STATUSES as string[]).includes(s));
  const assignment = valuesOf(f, "assignment");
  return {
    q: search.trim() || undefined,
    status: status.length ? status : undefined,
    // Both choices together are the same as neither.
    assignment: assignment.length === 1 && (assignment[0] === "assigned" || assignment[0] === "unassigned") ? assignment[0] : undefined,
    presalesUserId: list("presales"),
    salesUserId: list("sales"),
    followup: list("followup") as FollowupUrgency[] | undefined,
    lastCall: list("lastCall") as LastCallFilter[] | undefined,
    source: list("source"),
    country: list("country"),
    state: list("state"),
    city: list("city"),
    createdFrom: view.dateRange.from || undefined,
    createdTo: view.dateRange.to || undefined,
    includeInactive: view.showDeactivated || undefined,
    sort: view.sort.field,
    dir: view.sort.direction,
    page: view.page,
    pageSize,
  };
}

/** What a filter value is called on screen. */
export function filterValueLabel(key: LeadFilterKey, value: string, names: Record<string, string> = {}): string {
  switch (key) {
    case "status":
      return formatLeadStatus(value);
    case "assignment":
      return ASSIGNMENT_LABEL[value as "assigned"] ?? value;
    case "lastCall":
      return LAST_CALL_LABEL[value as LastCallFilter] ?? value;
    case "country":
      return value === NOT_SET_COUNTRY ? "Not set" : countryName(value);
    case "presales":
    case "sales":
      return names[value] || "Former user";
    default:
      return value;
  }
}

/** "Asha Rao, Sterling Pumps, Pune": what a row's link is called, with everything the row may cut short. */
export function leadRowLabel(lead: Pick<Lead, "customerName" | "companyName">, location: string): string {
  return [lead.customerName, lead.companyName, location].filter(Boolean).join(", ");
}
