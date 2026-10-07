import type { Customer } from "../../types/domain";
import { normalizeCustomerName } from "./customerLifecycle";

/**
 * How the customer list reads and orders customers. Pure functions over the list the
 * backend returns (it has no query parameters, so search, filter and sort are done
 * here, on what was fetched).
 */

/** One state per customer, so the list says one thing about it (not an "Active" tag and a "can't be quoted" tag). */
export type Readiness = "READY" | "NEEDS_GST" | "INACTIVE";

export const READINESS_LABEL: Record<Readiness, string> = { READY: "Ready to quote", NEEDS_GST: "Needs GST", INACTIVE: "Inactive" };
export const READINESS_RANK: Record<Readiness, number> = { READY: 0, NEEDS_GST: 1, INACTIVE: 2 };

type Quotable = Pick<Customer, "isActive" | "gstRegistrations">;

/** Same two blockers the backend refuses a quotation for: an inactive customer, and no active GST registration. */
export function customerReadiness(c: Quotable): Readiness {
  if (!c.isActive) return "INACTIVE";
  return c.gstRegistrations.some((g) => g.isActive) ? "READY" : "NEEDS_GST";
}

/**
 * The states a customer is registered in, as chips: the default registration's state
 * first, then the other active ones, at most `max` of them and a count of the rest.
 * A customer with registrations but none active says so; one with none says none.
 */
export function gstStateSummary(c: Pick<Customer, "gstRegistrations">, max = 2): { states: string[]; more: number; none: boolean; allInactive: boolean } {
  const active = c.gstRegistrations.filter((g) => g.isActive);
  if (active.length === 0) return { states: [], more: 0, none: c.gstRegistrations.length === 0, allInactive: c.gstRegistrations.length > 0 };
  const ordered = [...active].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const names: string[] = [];
  for (const g of ordered) if (!names.includes(g.stateName)) names.push(g.stateName);
  return { states: names.slice(0, max), more: Math.max(0, names.length - max), none: false, allInactive: false };
}

export type CustomerFilter = "all" | "ready" | "needsGst" | "inactive" | "vendor";

export const CUSTOMER_FILTER_LABEL: Record<CustomerFilter, string> = {
  all: "All",
  ready: "Ready to quote",
  needsGst: "Needs GST",
  inactive: "Inactive",
  vendor: "Also a vendor",
};

export function matchesFilter(c: Customer, filter: CustomerFilter): boolean {
  switch (filter) {
    case "ready":
      return customerReadiness(c) === "READY";
    case "needsGst":
      return customerReadiness(c) === "NEEDS_GST";
    case "inactive":
      return customerReadiness(c) === "INACTIVE";
    case "vendor":
      return !!c.linkedVendorId;
    default:
      return true;
  }
}

/** The filters worth offering with how many customers each holds: "All", then only the ones that are not empty. */
export function customerFilterCounts(list: Customer[]): Array<{ filter: CustomerFilter; count: number }> {
  const all: CustomerFilter[] = ["all", "ready", "needsGst", "inactive", "vendor"];
  return all.map((filter) => ({ filter, count: list.filter((c) => matchesFilter(c, filter)).length })).filter((x) => x.filter === "all" || x.count > 0);
}

/** Search over what people type to find a customer: name, code, PAN, GSTIN, phone, email. Case and repeated spaces do not matter. */
export function searchCustomers(list: Customer[], term: string): Customer[] {
  const q = normalizeCustomerName(term);
  if (!q) return list;
  return list.filter((c) => [c.customerName, c.customerCode, c.panNumber ?? "", c.email ?? "", c.phone ?? "", ...c.gstRegistrations.map((g) => g.gstin)].some((f) => normalizeCustomerName(f).includes(q)));
}

export type CustomerSortKey = "name" | "status" | "updated" | "created";
export type SortDirection = "asc" | "desc";

export const CUSTOMER_SORT_LABEL: Record<CustomerSortKey, string> = {
  name: "Name",
  status: "Readiness",
  updated: "Last updated",
  created: "Created",
};

/** The direction each sort starts in: names A to Z, dates newest first, readiness ready-first. */
export const DEFAULT_SORT_DIRECTION: Record<CustomerSortKey, SortDirection> = { name: "asc", status: "asc", updated: "desc", created: "desc" };

/** A stable, deterministic order: ties fall back to the name, then the code. A new array; the input is not changed. */
export function sortCustomers(list: Customer[], key: CustomerSortKey, direction: SortDirection): Customer[] {
  const sign = direction === "asc" ? 1 : -1;
  const byName = (a: Customer, b: Customer) => a.customerName.localeCompare(b.customerName, "en", { sensitivity: "base" }) || a.customerCode.localeCompare(b.customerCode);
  const primary = (a: Customer, b: Customer): number => {
    switch (key) {
      case "status":
        return READINESS_RANK[customerReadiness(a)] - READINESS_RANK[customerReadiness(b)];
      case "updated":
        return +new Date(a.updatedAt) - +new Date(b.updatedAt);
      case "created":
        return +new Date(a.createdAt) - +new Date(b.createdAt);
      default:
        return byName(a, b);
    }
  };
  return [...list].sort((a, b) => sign * primary(a, b) || byName(a, b));
}
