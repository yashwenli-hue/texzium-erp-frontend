import { LeadSourceRecord } from "../../types/domain";
import { ILeadSourceRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/**
 * VERIFIED: lead creation requires a valid sourceId. Real integration should
 * load sources from the backend lead-sources module rather than hard-coding
 * them — this mock exists so the Lead form can exercise a real lookup
 * pattern now instead of a free-text field. See contract §4.
 */
export class MockLeadSourceRepository implements ILeadSourceRepository {
  async list(): Promise<LeadSourceRecord[]> {
    return delay(db.leadSources.getAll());
  }
}
