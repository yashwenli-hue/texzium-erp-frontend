import { LeadSourceRecord } from "../../types/domain";
import { ILeadSourceRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendLeadSource, mapLeadSource } from "./mappers";

/** VERIFIED: GET /lead-sources — no guards, bare array response. See docs/backend-ui-contract.md §4. */
export class RealLeadSourceRepository implements ILeadSourceRepository {
  async list(): Promise<LeadSourceRecord[]> {
    const rows = await apiFetch<BackendLeadSource[]>("/lead-sources");
    return rows.map(mapLeadSource);
  }
}
