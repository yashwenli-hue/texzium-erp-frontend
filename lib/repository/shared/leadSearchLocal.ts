import type { Lead, LeadStatus } from "../../types/domain";
import { LEAD_BEFORE_QUALIFICATION_STATUSES } from "../../types/domain";
import { nextPendingFollowup } from "../../followup";
import {
  FacetCount,
  LeadSearchFacets,
  LeadSearchQuery,
  LeadSearchResult,
  NOT_SET_COUNTRY,
  PersonFacetCount,
  phoneDigitsQuery,
  phoneMatches,
} from "./leadSearch";

/**
 * GET /leads/search over leads held in memory (the mock repository), with the server's
 * rules: phone digits, pre-sales people (`lead.presales`), sales owner (the assignee after
 * qualification), and facets counted with every other filter applied.
 */

type Dim = "status" | "assignment" | "presales" | "sales" | "source" | "country" | "state" | "city" | "followup" | "lastCall";

const PRE_QUAL: readonly LeadStatus[] = LEAD_BEFORE_QUALIFICATION_STATUSES;
const salesOwnerOf = (l: Lead) => (!PRE_QUAL.includes(l.status) && l.salesOwnerId ? l.salesOwnerId : null);
const lastCallOf = (l: Lead) => (l.lastCallOutcome === "NOT_CONNECTED" ? "CNC" : l.lastCallOutcome === "CONNECTED" ? "CONNECTED" : "NONE");
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

function matchesText(l: Lead, q: string): boolean {
  const t = q.toLowerCase();
  const fields = [l.customerName, l.companyName, l.email, l.city, l.state, l.assignedToName];
  if (fields.some((f) => (f ?? "").toLowerCase().includes(t))) return true;
  const digits = q.replace(/\D+/g, "");
  return digits.length >= 4 && (phoneMatches(l.phone, digits) || phoneMatches(l.alternatePhone, digits));
}

function keep(l: Lead, q: LeadSearchQuery, except?: Dim): boolean {
  if (!q.includeInactive && !l.isActive) return false;
  if (q.q?.trim()) {
    const digits = phoneDigitsQuery(q.q.trim());
    if (digits ? !(phoneMatches(l.phone, digits) || phoneMatches(l.alternatePhone, digits)) : !matchesText(l, q.q.trim())) return false;
  }
  if (q.assignedToId && l.assignedToId !== q.assignedToId) return false;
  if (q.createdFrom && istDay(l.createdAt) < q.createdFrom) return false;
  if (q.createdTo && istDay(l.createdAt) > q.createdTo) return false;
  if (except !== "status" && q.status?.length && !q.status.includes(l.status)) return false;
  if (except !== "assignment" && q.assignment && (q.assignment === "assigned") !== !!l.assignedToId) return false;
  if (except !== "presales" && q.presalesUserId?.length && !(l.presales ?? []).some((p) => q.presalesUserId!.includes(p.id))) return false;
  if (except !== "sales" && q.salesUserId?.length && !q.salesUserId.includes(salesOwnerOf(l) ?? "")) return false;
  if (except !== "source" && q.source?.length && !q.source.includes(l.sourceName)) return false;
  if (except !== "country" && q.country?.length && !q.country.includes(l.country ?? NOT_SET_COUNTRY)) return false;
  if (except !== "state" && q.state?.length && !q.state.includes(l.state ?? "")) return false;
  if (except !== "city" && q.city?.length && !q.city.includes(l.city ?? "")) return false;
  if (except !== "followup" && q.followup?.length && !q.followup.includes(nextPendingFollowup(l.followups).urgency)) return false;
  if (except !== "lastCall" && q.lastCall?.length && !q.lastCall.includes(lastCallOf(l))) return false;
  return true;
}

function count(values: Array<string | null | undefined>): FacetCount[] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].map(([value, c]) => ({ value, count: c })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function searchLeadsLocally(all: readonly Lead[], q: LeadSearchQuery): LeadSearchResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 25));
  const dir = q.dir === "asc" ? 1 : -1;
  const key = (l: Lead) => (q.sort === "customerName" ? l.customerName.toLowerCase() : q.sort === "createdAt" ? l.createdAt : l.lastActivityAt);
  const rows = all.filter((l) => keep(l, q)).sort((a, b) => key(a).localeCompare(key(b)) * dir || a.id.localeCompare(b.id) * dir);
  const without = (dim: Dim) => all.filter((l) => keep(l, q, dim));
  const people = (dim: "presales" | "sales"): PersonFacetCount[] => {
    const names = new Map<string, string>();
    const values: string[] = [];
    for (const l of without(dim)) {
      if (dim === "presales") for (const p of l.presales ?? []) { names.set(p.id, p.name); values.push(p.id); }
      else if (salesOwnerOf(l)) { names.set(salesOwnerOf(l)!, l.salesOwnerName ?? ""); values.push(salesOwnerOf(l)!); }
    }
    return count(values).map((f) => ({ ...f, name: names.get(f.value) ?? "" }));
  };
  const facets: LeadSearchFacets = {
    status: count(without("status").map((l) => l.status)),
    assignment: count(without("assignment").map((l) => (l.assignedToId ? "assigned" : "unassigned"))),
    presales: people("presales"),
    sales: people("sales"),
    source: count(without("source").map((l) => l.sourceName)),
    country: count(without("country").map((l) => l.country ?? NOT_SET_COUNTRY)),
    state: count(without("state").map((l) => l.state)),
    city: count(without("city").map((l) => l.city)),
    followup: count(without("followup").map((l) => nextPendingFollowup(l.followups).urgency)),
    lastCall: count(without("lastCall").map(lastCallOf)),
  };
  return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, facets };
}
