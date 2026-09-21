import { CollectionsAging, CollectionsEfficiency, CollectionsRecoveryRate, CollectionsSummary } from "../../types/domain";
import { ICollectionsDashboardRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import {
  BackendCollectionsAging,
  BackendCollectionsEfficiency,
  BackendCollectionsRecoveryRate,
  BackendCollectionsSummary,
  mapCollectionsAging,
  mapCollectionsEfficiency,
  mapCollectionsRecoveryRate,
  mapCollectionsSummary,
} from "./mappers";

/**
 * VERIFIED: `GET /collections-dashboard/{summary,aging,efficiency,recovery-rate}`
 * — all sum the authoritative AccountsReceivable fields directly, same rule
 * established in Stage 2G. `high-risk` and `customer-ranking` also exist on
 * this controller but are deliberately not exposed here — see
 * ICollectionsDashboardRepository for why. No date-range parameter exists
 * on any of these. No guard.
 */
export class RealCollectionsDashboardRepository implements ICollectionsDashboardRepository {
  async summary(): Promise<CollectionsSummary> {
    const raw = await apiFetch<BackendCollectionsSummary>("/collections-dashboard/summary");
    return mapCollectionsSummary(raw);
  }

  async aging(): Promise<CollectionsAging> {
    const raw = await apiFetch<BackendCollectionsAging>("/collections-dashboard/aging");
    return mapCollectionsAging(raw);
  }

  async efficiency(): Promise<CollectionsEfficiency> {
    const raw = await apiFetch<BackendCollectionsEfficiency>("/collections-dashboard/efficiency");
    return mapCollectionsEfficiency(raw);
  }

  async recoveryRate(): Promise<CollectionsRecoveryRate> {
    const raw = await apiFetch<BackendCollectionsRecoveryRate>("/collections-dashboard/recovery-rate");
    return mapCollectionsRecoveryRate(raw);
  }
}
