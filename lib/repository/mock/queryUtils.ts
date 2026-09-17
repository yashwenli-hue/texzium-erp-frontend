import { ListQuery, Page, MOCK_LATENCY_MS } from "../../types/common";

/** Simulates real network latency so loading states get exercised now. */
export function delay<T>(value: T, ms: number = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Applies filters (exact-match or "value is in provided array"), a free-text
 * search across the given fields, a sort, and pagination — in that order.
 * This mirrors the order a real API would typically apply query params in,
 * so behavior should carry over conceptually once swapped for a real fetch.
 */
export function applyListQuery<T extends Record<string, any>>(
  rows: T[],
  query: ListQuery<Extract<keyof T, string>> | undefined,
  searchableFields: (keyof T)[]
): Page<T> {
  let result = [...rows];

  if (query?.filters) {
    for (const [key, val] of Object.entries(query.filters)) {
      if (val === undefined || val === "" || val === "All") continue;
      const values = Array.isArray(val) ? val : [val];
      result = result.filter((row) => values.includes(String(row[key])));
    }
  }

  if (query?.search && query.search.trim()) {
    const term = query.search.trim().toLowerCase();
    result = result.filter((row) =>
      searchableFields.some((field) =>
        String(row[field] ?? "").toLowerCase().includes(term)
      )
    );
  }

  if (query?.sort) {
    const { field, direction } = query.sort;
    result.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return direction === "asc" ? cmp : -cmp;
    });
  }

  const total = result.length;
  const page = query?.page?.page ?? 1;
  const pageSize = (query?.page?.pageSize ?? total) || 1;
  const start = (page - 1) * pageSize;
  const items = query?.page ? result.slice(start, start + pageSize) : result;

  return { items, total, page, pageSize };
}
