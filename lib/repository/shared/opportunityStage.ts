import { OpportunityStage, formatOpportunityStage, isOpportunityStage } from "../../types/domain";

/**
 * Opportunity stage rules, mirroring the backend (opportunity-stage.ts, commit
 * 933231a). The backend is the authority and re-checks every move; these rules
 * let the UI offer only valid moves and let the mock behave the same way.
 *
 * One step forward, one step back, or Lost from any open stage. Won and Lost
 * are final: nothing moves out of them (no reopen in this version).
 */
export const OPPORTUNITY_STAGE_TRANSITIONS: Record<OpportunityStage, readonly OpportunityStage[]> = {
  QUALIFIED: ["PROPOSAL", "LOST"],
  PROPOSAL: ["NEGOTIATION", "QUALIFIED", "LOST"],
  NEGOTIATION: ["WON", "PROPOSAL", "LOST"],
  WON: [],
  LOST: [],
};

export function isOpportunityStageFinal(stage: OpportunityStage): boolean {
  return OPPORTUNITY_STAGE_TRANSITIONS[stage].length === 0;
}

export function canMoveOpportunityStage(from: OpportunityStage, to: OpportunityStage): boolean {
  return OPPORTUNITY_STAGE_TRANSITIONS[from].includes(to);
}

/** Same wording as the backend's 400 for a move the rules do not allow. Throws with a user-safe message. */
export function validateOpportunityStageMove(from: OpportunityStage, to: OpportunityStage): void {
  if (canMoveOpportunityStage(from, to)) return;
  if (isOpportunityStageFinal(from)) {
    throw new Error(`A ${formatOpportunityStage(from)} opportunity is final and can't be moved.`);
  }
  if (from === to) {
    throw new Error(`The opportunity is already in ${formatOpportunityStage(to)}.`);
  }
  throw new Error(
    `An opportunity can't move from ${formatOpportunityStage(from)} to ${formatOpportunityStage(to)}. ` +
      "Move it one step at a time, or mark it Lost."
  );
}

/** Same wording as the backend's 409 when the stored stage is no longer the one the caller saw. */
export function opportunityStageConflictMessage(current: string): string {
  // A stored value outside the five stages (e.g. a legacy OPEN) is shown as it is, like the backend does.
  const shown = isOpportunityStage(current) ? formatOpportunityStage(current) : current;
  return `This opportunity's stage has changed (now ${shown}). Reload and try again.`;
}

/**
 * The stored stage no longer matches the one the person was looking at (someone
 * else moved it first). Thrown by both repositories, so screens handle it once:
 * reload, then show the message.
 */
export class OpportunityStageConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpportunityStageConflictError";
  }
}
