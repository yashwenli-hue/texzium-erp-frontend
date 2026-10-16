import { CallOutcome, LEAD_ACTIVITY_REMARKS_MAX_LENGTH, LeadActivityType, LEAD_ACTIVITY_TYPES } from "../../types/domain";
import { LogLeadActivityInput } from "../interfaces";

// Same tolerance as the backend, so mock and connected mode reject the same inputs.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface ValidatedLeadActivity {
  activityType: LeadActivityType;
  /** Absent for a call logged with only its outcome. */
  remarks?: string;
  outcome?: CallOutcome;
  occurredAt?: string;
}

const OUTCOMES: readonly CallOutcome[] = ["CONNECTED", "NOT_CONNECTED"];

/** Mirrors CreateLeadActivityDto + LeadsService.createActivity. Throws Error with a user-safe message. */
export function validateLeadActivityInput(input: LogLeadActivityInput, now: Date = new Date()): ValidatedLeadActivity {
  if (!LEAD_ACTIVITY_TYPES.some((t) => t.value === input.activityType)) {
    throw new Error("Choose a valid activity type.");
  }
  if (input.outcome !== undefined && !OUTCOMES.includes(input.outcome)) throw new Error("Choose a valid call outcome.");
  if (input.outcome && input.activityType !== "CALL") throw new Error("Only a call has an outcome.");
  const remarks = (input.remarks ?? "").trim();
  if (!remarks && !input.outcome) throw new Error(input.activityType === "CALL" ? "Write what happened, or choose the call outcome." : "Add a short note about what happened.");
  if (remarks.length > LEAD_ACTIVITY_REMARKS_MAX_LENGTH) {
    throw new Error(`Keep this under ${LEAD_ACTIVITY_REMARKS_MAX_LENGTH} characters.`);
  }
  if (input.occurredAt !== undefined) {
    const when = new Date(input.occurredAt);
    if (Number.isNaN(when.getTime())) throw new Error("Enter a valid date and time.");
    if (when.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) throw new Error("The activity time can't be in the future.");
  }
  return {
    activityType: input.activityType,
    ...(remarks ? { remarks } : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
    occurredAt: input.occurredAt,
  };
}
