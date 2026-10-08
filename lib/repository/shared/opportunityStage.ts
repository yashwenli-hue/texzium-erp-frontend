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

/** The optional remark a person writes when they move an opportunity (the backend allows the same). */
export const OPPORTUNITY_STAGE_REMARK_MAX_LENGTH = 500;

/**
 * What the backend will store for what was typed: the text without its ends, or
 * nothing when it is blank (whitespace and line breaks only). Inner spacing and
 * line breaks are kept.
 */
export function normalizeStageRemark(text: string | null | undefined): string | undefined {
  if (typeof text !== "string") return undefined;
  const trimmed = text.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Why a remark cannot be sent, or null. The length is that of the trimmed text, as the backend counts it. */
export function stageRemarkProblem(text: string | null | undefined): string | null {
  const length = normalizeStageRemark(text)?.length ?? 0;
  return length > OPPORTUNITY_STAGE_REMARK_MAX_LENGTH
    ? `The remark is ${length - OPPORTUNITY_STAGE_REMARK_MAX_LENGTH} ${length - OPPORTUNITY_STAGE_REMARK_MAX_LENGTH === 1 ? "character" : "characters"} over the ${OPPORTUNITY_STAGE_REMARK_MAX_LENGTH}-character limit.`
    : null;
}

export type StageMoveKind = "forward" | "back" | "won" | "lost";

/** What kind of move this is, for the wording and the weight of the confirmation. */
export function stageMoveKind(from: OpportunityStage, to: OpportunityStage): StageMoveKind {
  if (to === "WON") return "won";
  if (to === "LOST") return "lost";
  const order: OpportunityStage[] = ["QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"];
  return order.indexOf(to) < order.indexOf(from) ? "back" : "forward";
}

export interface StageDialogCopy {
  kind: StageMoveKind;
  title: string;
  confirmLabel: string;
  /** Won and Lost cannot be undone. */
  destructive: boolean;
  /** Shown above the remark: what this move means. */
  note?: string;
}

/** The one wording both entry points (the opportunity page and the dashboard board) confirm with. */
export function stageDialogCopy(from: OpportunityStage, to: OpportunityStage): StageDialogCopy {
  const kind = stageMoveKind(from, to);
  const target = formatOpportunityStage(to);
  if (kind === "won") {
    return { kind, title: "Mark Won", confirmLabel: "Mark Won", destructive: false, note: "Won is final: the opportunity can't be moved again or reopened." };
  }
  if (kind === "lost") {
    return { kind, title: "Mark Lost", confirmLabel: "Mark Lost", destructive: true, note: "Lost is final: the opportunity can't be reopened and drops out of the active pipeline." };
  }
  if (kind === "back") {
    return { kind, title: `Move back to ${target}`, confirmLabel: `Move to ${target}`, destructive: false, note: "Use this if the deal genuinely regressed." };
  }
  return { kind, title: `Move to ${target}`, confirmLabel: `Move to ${target}`, destructive: false };
}

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
