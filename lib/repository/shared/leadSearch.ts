import type { CallOutcome, Lead, LeadStage, LeadStatus } from "../../types/domain";
import type { FollowupUrgency } from "../../followup";

/**
 * VERIFIED (backend 81bea43): GET /leads/search — the Leads list and the Pre-Sales panel,
 * filtered, sorted, paged and counted on the server, inside the caller's record scope.
 * A phone number in any format is matched on digits (last 10 for a full number). Pre-sales
 * involvement comes from recorded ids only; sales ownership is the assignee after
 * qualification. Facets count every value with all the OTHER filters applied, so a
 * facet count is the total you get by choosing it.
 */
export type LastCallFilter = "CNC" | "CONNECTED" | "NONE";
export const LEAD_SEARCH_SORTS = ["lastActivityAt", "createdAt", "customerName"] as const;
export type LeadSearchSort = (typeof LEAD_SEARCH_SORTS)[number];
export const NOT_SET_COUNTRY = "NOT_SET";
export const LEAD_SEARCH_MAX_PAGE_SIZE = 100;

export interface LeadSearchQuery {
  q?: string;
  status?: LeadStatus[];
  stage?: LeadStage[];
  assignment?: "assigned" | "unassigned";
  assignedToId?: string;
  presalesUserId?: string[];
  salesUserId?: string[];
  source?: string[];
  /** Inventory item ids of the enquiry's product, or NOT_SET for none recorded. */
  product?: string[];
  /** ISO codes, or NOT_SET. */
  country?: string[];
  state?: string[];
  city?: string[];
  followup?: FollowupUrgency[];
  lastCall?: LastCallFilter[];
  /** YYYY-MM-DD, India time, inclusive. */
  createdFrom?: string;
  createdTo?: string;
  includeInactive?: boolean;
  sort?: LeadSearchSort;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface PersonFacetCount extends FacetCount {
  name: string;
}

export interface LeadSearchFacets {
  status: FacetCount[];
  stage: FacetCount[];
  assignment: FacetCount[];
  presales: PersonFacetCount[];
  sales: PersonFacetCount[];
  source: FacetCount[];
  /** value: an inventory item id (name: the product), or NOT_SET. */
  product: PersonFacetCount[];
  country: FacetCount[];
  state: FacetCount[];
  city: FacetCount[];
  followup: FacetCount[];
  lastCall: FacetCount[];
}

export interface LeadSearchResult {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  facets: LeadSearchFacets;
}

export const EMPTY_FACETS: LeadSearchFacets = {
  status: [], stage: [], assignment: [], presales: [], sales: [], source: [], product: [], country: [], state: [], city: [], followup: [], lastCall: [],
};

/** The query string GET /leads/search takes (lists comma-separated, empty values left out). */
export function leadSearchParams(query: LeadSearchQuery): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string | number | boolean | undefined) => {
    if (v === undefined || v === "" || v === false) return;
    p.set(k, String(v));
  };
  const list = (k: string, v: readonly string[] | undefined) => {
    if (v && v.length) p.set(k, v.join(","));
  };
  put("q", query.q?.trim() || undefined);
  list("status", query.status);
  list("stage", query.stage);
  put("assignment", query.assignment);
  put("assignedToId", query.assignedToId);
  list("presalesUserId", query.presalesUserId);
  list("salesUserId", query.salesUserId);
  list("source", query.source);
  list("product", query.product);
  list("country", query.country);
  list("state", query.state);
  list("city", query.city);
  list("followup", query.followup);
  list("lastCall", query.lastCall);
  put("createdFrom", query.createdFrom);
  put("createdTo", query.createdTo);
  put("includeInactive", query.includeInactive);
  put("sort", query.sort);
  put("dir", query.dir);
  put("page", query.page);
  put("pageSize", query.pageSize);
  return p.toString();
}

/** Facet counts as a lookup for the filter dropdowns. */
export function countsOf(facet: FacetCount[]): Record<string, number> {
  return Object.fromEntries(facet.map((f) => [f.value, f.count]));
}

export function outcomeOfLastCall(value: string | null | undefined): CallOutcome | null {
  return value === "CONNECTED" || value === "NOT_CONNECTED" ? value : null;
}

/** The phone-search rule the server applies, for the mock repository and the hint text. */
export function phoneDigitsQuery(q: string): string | null {
  const digits = q.replace(/\D+/g, "");
  return /^[+\d\s().-]+$/.test(q) && digits.length >= 4 ? digits : null;
}

export function phoneMatches(stored: string | undefined, digits: string): boolean {
  const d = (stored ?? "").replace(/\D+/g, "");
  if (digits.length >= 10) return d.length >= 10 && d.slice(-10) === digits.slice(-10);
  return d.includes(digits);
}
