import { MOCK_LATENCY_MS } from "../../types/common";

/** Simulates real network latency so loading states get exercised now. */
export function delay<T>(value: T, ms: number = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// Moved to ../shared/listQuery.ts so the real repositories (Leads/Opportunities
// come back as full, unpaginated arrays — see docs/backend-ui-contract.md §20)
// can apply the same client-side query logic without importing from `mock/`.
export { applyListQuery } from "../shared/listQuery";
