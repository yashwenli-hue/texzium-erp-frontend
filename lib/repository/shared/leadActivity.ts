import { LEAD_ACTIVITY_REMARKS_MAX_LENGTH, LeadActivityType, LEAD_ACTIVITY_TYPES } from "../../types/domain";
import { LogLeadActivityInput } from "../interfaces";

// Same tolerance as the backend, so mock and connected mode reject the same inputs.
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface ValidatedLeadActivity {
  activityType: LeadActivityType;
  remarks: string;
  occurredAt?: string;
}

/** Mirrors CreateLeadActivityDto + LeadsService.createActivity. Throws Error with a user-safe message. */
export function validateLeadActivityInput(input: LogLeadActivityInput, now: Date = new Date()): ValidatedLeadActivity {
  if (!LEAD_ACTIVITY_TYPES.some((t) => t.value === input.activityType)) {
    throw new Error("Choose a valid activity type.");
  }
  const remarks = input.remarks.trim();
  if (!remarks) throw new Error("Add a short note about what happened.");
  if (remarks.length > LEAD_ACTIVITY_REMARKS_MAX_LENGTH) {
    throw new Error(`Keep this under ${LEAD_ACTIVITY_REMARKS_MAX_LENGTH} characters.`);
  }
  if (input.occurredAt !== undefined) {
    const when = new Date(input.occurredAt);
    if (Number.isNaN(when.getTime())) throw new Error("Enter a valid date and time.");
    if (when.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) throw new Error("The activity time can't be in the future.");
  }
  return { activityType: input.activityType, remarks, occurredAt: input.occurredAt };
}
