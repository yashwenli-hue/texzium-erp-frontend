export const LEAD_DEACTIVATION_REASON_MAX_LENGTH = 500;

/** Same wording as the backend's 409 for any normal sales write on a deactivated lead. */
export const LEAD_DEACTIVATED_MESSAGE = "This lead is deactivated. Reactivate it to make changes.";

/**
 * Product definition, used everywhere the UI explains deactivation:
 * Deactivation is the safe way to remove an erroneous, duplicate, junk, test,
 * or otherwise invalid lead from active sales without deleting its historical
 * record. It is not a substitute for correcting valid lead information.
 */
export const LEAD_DEACTIVATION_USE_FOR =
  "Use this for a lead that was entered by mistake, is a duplicate, or is a test, junk or otherwise invalid entry.";
export const LEAD_DEACTIVATION_NOT_FOR =
  "If the lead is real but some of its details are wrong, edit the lead and correct them instead.";
export const LEAD_DEACTIVATION_EFFECT =
  "The lead is removed from active sales, but nothing is deleted. Its history stays on record, and you can reactivate it later.";

/** Mirrors DeactivateLeadDto on the backend. Returns the trimmed reason or throws with a user-safe message. */
export function validateDeactivationReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Add a reason so the team knows why this lead was deactivated.");
  if (trimmed.length > LEAD_DEACTIVATION_REASON_MAX_LENGTH) {
    throw new Error(`Keep the reason under ${LEAD_DEACTIVATION_REASON_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

/**
 * Mirrors the backend's refusal text. A lead with any opportunity, or any
 * pending follow-up, cannot be deactivated. The backend is the authority; this
 * lets the dialog explain the blocker up front, and the mock apply the same rule.
 */
export function describeDeactivationBlockers(counts: { opportunities: number; pendingFollowups: number }): string | null {
  const parts: string[] = [];
  if (counts.opportunities > 0) {
    parts.push(`${counts.opportunities} ${counts.opportunities === 1 ? "opportunity" : "opportunities"}`);
  }
  if (counts.pendingFollowups > 0) {
    parts.push(`${counts.pendingFollowups} pending ${counts.pendingFollowups === 1 ? "follow-up" : "follow-ups"}`);
  }
  if (parts.length === 0) return null;
  return `This lead can't be deactivated while it has ${parts.join(" and ")}.`;
}
