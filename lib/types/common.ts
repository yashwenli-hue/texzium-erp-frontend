/**
 * Shared, entity-agnostic types.
 *
 * These are designed so that swapping the mock repository for a real
 * API-backed repository does NOT require changing any UI component.
 * The real backend may implement pagination/sorting server-side; the
 * mock implementation does it in-memory. The shape returned to the UI
 * is identical either way.
 */

export type ID = string;

export type SortDirection = "asc" | "desc";

export interface SortState<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

export interface PageRequest {
  page: number; // 1-indexed
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Generic filter bag. Repositories interpret the keys they understand. */
export type FilterMap = Record<string, string | string[] | undefined>;

export interface ListQuery<TSortField extends string = string> {
  filters?: FilterMap;
  search?: string;
  sort?: SortState<TSortField>;
  page?: PageRequest;
}

/**
 * Every mock mutation resolves after a small simulated network delay so
 * that loading states in the UI are exercised now, before the real API
 * (with real latency) is wired in.
 */
export const MOCK_LATENCY_MS = 220;
