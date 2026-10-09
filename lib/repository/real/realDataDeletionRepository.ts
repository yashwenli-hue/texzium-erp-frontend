import { ID } from "../../types/common";
import { ApiError, apiFetch } from "../../api/httpClient";
import { IDataDeletionRepository } from "../interfaces";
import {
  DeleteRecordInput,
  DeletionEntityType,
  DeletionLogEntry,
  DeletionLogQuery,
  DeletionPreview,
  DeletionResult,
  PurgeResult,
  RestorePreview,
  RestoreResult,
  classifyDeletionError,
  validateDeleteInput,
} from "../shared/dataDeletion";

const base = (type: DeletionEntityType, id: ID) => (type === "LEAD" ? `/leads/${id}` : `/customers/${id}`);

/** A 409 the screens act on becomes a typed error with the backend's own words; everything else passes through. */
async function mapped<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError) {
      const typed = classifyDeletionError(err.status, err.details, err.message);
      if (typed) throw typed;
    }
    throw err;
  }
}

/**
 * VERIFIED routes (see IDataDeletionRepository). The request is checked here with the
 * backend's own rules first, so a bad one fails without a round trip; the actor is never
 * sent (the backend uses the signed-in user).
 */
export class RealDataDeletionRepository implements IDataDeletionRepository {
  preview(entityType: DeletionEntityType, id: ID): Promise<DeletionPreview> {
    return apiFetch<DeletionPreview>(`${base(entityType, id)}/deletion-preview`);
  }

  delete(entityType: DeletionEntityType, id: ID, input: DeleteRecordInput): Promise<DeletionResult> {
    const body = validateDeleteInput(input);
    return mapped(() => apiFetch<DeletionResult>(base(entityType, id), { method: "DELETE", body }));
  }

  list(query?: DeletionLogQuery): Promise<DeletionLogEntry[]> {
    const params = new URLSearchParams();
    if (query?.entityType) params.set("entityType", query.entityType);
    if (query?.status) params.set("status", query.status);
    if (query?.entityId) params.set("entityId", query.entityId);
    if (query?.limit !== undefined) params.set("limit", String(query.limit));
    if (query?.offset !== undefined) params.set("offset", String(query.offset));
    const qs = params.toString();
    return apiFetch<DeletionLogEntry[]>(`/data-deletions${qs ? `?${qs}` : ""}`);
  }

  get(recordId: ID): Promise<DeletionLogEntry> {
    return apiFetch<DeletionLogEntry>(`/data-deletions/${recordId}`);
  }

  restorePreview(recordId: ID): Promise<RestorePreview> {
    return apiFetch<RestorePreview>(`/data-deletions/${recordId}/restore-preview`);
  }

  restore(recordId: ID, version: string): Promise<RestoreResult> {
    if (!version) throw new Error("Review the record before restoring it.");
    return mapped(() => apiFetch<RestoreResult>(`/data-deletions/${recordId}/restore`, { method: "POST", body: { version } }));
  }

  purge(recordId: ID): Promise<PurgeResult> {
    return mapped(() => apiFetch<PurgeResult>(`/data-deletions/${recordId}/purge`, { method: "POST", body: {} }));
  }
}
