import { ID } from "../../types/common";
import { LEAD_DEACTIVATED_MESSAGE } from "../shared/leadLifecycle";
import { db } from "./db";

/** The mock's equivalent of the backend's 409 for a normal sales write on a deactivated lead. */
export function assertMockLeadActive(leadId: ID): void {
  const lead = db.leads.getById(leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  if (!lead.isActive) throw new Error(LEAD_DEACTIVATED_MESSAGE);
}
