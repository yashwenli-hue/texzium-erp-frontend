/**
 * Governed deletion and recovery: what the screens and the repositories (real and mock)
 * share. The backend (data-governance, 21dd2dc and its M3 follow-up) is the authority;
 * this file mirrors its vocabulary and wording so the dialogs can explain a refusal before
 * it happens, and the mock can follow the same rules.
 *
 * A deleted lead or customer goes to the Recycle Bin: a tombstone holds a complete copy for
 * 30 days, and an administrator can restore it. The 30th day is the last day it can be restored
 * (the stored deadline is inclusive). After it the copy is erased (purged) automatically; an
 * administrator may also erase it earlier, at any time, by hand. Once erased it can never be
 * restored through RevenueOS.
 */

export type DeletionEntityType = "LEAD" | "CUSTOMER";
export type DeletionStatus = "DELETED" | "RESTORED" | "PURGED";
/** How a copy was erased: by an administrator (who is recorded), or automatically after the recovery period (a system action, nobody is recorded). */
export type PurgeMethod = "MANUAL" | "AUTOMATIC";

export const DELETION_REASON_CODES = ["DUPLICATE", "ENTERED_IN_ERROR", "TEST_DATA", "JUNK_OR_SPAM", "OTHER"] as const;
export type DeletionReasonCode = (typeof DELETION_REASON_CODES)[number];

export const DELETION_REASON_LABEL: Readonly<Record<DeletionReasonCode, string>> = {
  DUPLICATE: "Duplicate",
  ENTERED_IN_ERROR: "Entered in error",
  TEST_DATA: "Test data",
  JUNK_OR_SPAM: "Junk or spam",
  OTHER: "Other",
};

export const DELETION_REASON_MAX_LENGTH = 500;
export const RECOVERY_WINDOW_DAYS = 30;

export const ENTITY_NOUN: Readonly<Record<DeletionEntityType, string>> = { LEAD: "lead", CUSTOMER: "customer" };
export const ENTITY_LABEL: Readonly<Record<DeletionEntityType, string>> = { LEAD: "Lead", CUSTOMER: "Customer" };

export interface DeletionBlocker {
  code: string;
  message: string;
  count: number;
  hint?: string;
}

export interface DeletionLine {
  label: string;
  count: number;
}

export interface DeletionPreview {
  entityType: DeletionEntityType;
  entityId: string;
  label: string;
  code: string | null;
  eligible: boolean;
  blockers: DeletionBlocker[];
  removes: DeletionLine[];
  keeps: string[];
  /** The token the deletion must carry: it is refused (409) if the record changed after this preview. */
  version: string;
  reasonCodes: readonly DeletionReasonCode[];
  recoveryDays: number;
}

export interface DeleteRecordInput {
  reasonCode: DeletionReasonCode;
  reason: string;
  /** For a duplicate: the record that survives. */
  duplicateOfId?: string;
  version: string;
}

export interface DeletionResult {
  id: string;
  entityType: DeletionEntityType;
  entityId: string;
  label: string;
  reasonCode: DeletionReasonCode;
  survivorId: string | null;
  deletedAt: string;
  purgeAfter: string;
}

export interface RestoreConflict {
  code: string;
  message: string;
}

export interface RestorePreview {
  id: string;
  entityType: DeletionEntityType;
  /** null once the record is purged: the original id was erased with the copy. */
  entityId: string | null;
  /** null once the record is purged: its name was erased with the copy. */
  label: string | null;
  status: DeletionStatus;
  deletedAt: string;
  purgeAfter: string;
  expired: boolean;
  eligible: boolean;
  conflicts: RestoreConflict[];
  restores: DeletionLine[];
  version: string;
}

export interface RestoreResult {
  id: string;
  entityType: DeletionEntityType;
  entityId: string;
  label: string;
  restoredAt: string;
}

/** What the backend answers to a purge: nothing that names the record (its name is erased with the copy). */
export interface PurgeResult {
  id: string;
  entityType: DeletionEntityType;
  purgedAt: string;
  purgeMethod: PurgeMethod;
}

export interface DeletionActor {
  id: string;
  fullName?: string | null;
}

/** One row of the Recycle Bin / Deletion Log. The snapshot (the full copy) is only on a single record read. */
export interface DeletionLogEntry {
  /** The tombstone's own id: the audit key. The only id a purged entry has. */
  id: string;
  entityType: DeletionEntityType;
  /** The lead's or customer's original id. null once the entry is purged: nothing points back to the record. */
  entityId: string | null;
  entityCode?: string | null;
  /** The record's name. null once it is purged (erased with the copy, never shown again). */
  entityLabel: string | null;
  /** One of five fixed categories: kept after a purge (governance reporting), never free text. */
  reasonCode: DeletionReasonCode;
  /** The person's own words. null once the record is purged. */
  reason: string | null;
  survivorId?: string | null;
  survivorLabel?: string | null;
  /** What the deletion removed and checked. Empty ({}) once the record is purged. */
  impact: { removed?: DeletionLine[]; blockersChecked?: string[]; version?: string };
  status: DeletionStatus;
  deletedAt: string;
  purgeAfter: string;
  restoredAt?: string;
  purgedAt?: string;
  /** Set once the copy was erased; the backend sends null before. */
  purgeMethod?: PurgeMethod | null;
  /** null once purged (not kept). */
  deletedBy?: DeletionActor | null;
  restoredBy?: DeletionActor | null;
  /** The administrator of a manual purge; null for an automatic one (a system action). */
  purgedBy?: DeletionActor | null;
  /** Judged by the server when it answered: still DELETED and inside its window. */
  recoverable: boolean;
  expired: boolean;
  snapshot?: unknown;
}

export interface DeletionLogQuery {
  entityType?: DeletionEntityType;
  status?: DeletionStatus;
  entityId?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Typed refusals (the backend's 409s, with their code)
// ---------------------------------------------------------------------------

export class DeletionBlockedError extends Error {
  readonly blockers: DeletionBlocker[];
  constructor(message: string, blockers: DeletionBlocker[]) {
    super(message);
    this.name = "DeletionBlockedError";
    this.blockers = blockers;
  }
}

export class DeletionStaleError extends Error {
  constructor(message = "This record changed after you reviewed it. Review it again before deleting.") {
    super(message);
    this.name = "DeletionStaleError";
  }
}

export class RestoreBlockedError extends Error {
  readonly conflicts: RestoreConflict[];
  constructor(message: string, conflicts: RestoreConflict[]) {
    super(message);
    this.name = "RestoreBlockedError";
    this.conflicts = conflicts;
  }
}

export class RestoreStaleError extends Error {
  constructor(message = "This record changed after you reviewed it. Review it again before restoring.") {
    super(message);
    this.name = "RestoreStaleError";
  }
}

/** The recovery window has ended, or the record was already restored or purged: it cannot be restored (or purged) now. */
export class RecoveryClosedError extends Error {
  readonly code: "RESTORE_WINDOW_EXPIRED" | "ALREADY_RESTORED" | "ALREADY_PURGED";
  constructor(code: RecoveryClosedError["code"], message: string) {
    super(message);
    this.name = "RecoveryClosedError";
    this.code = code;
  }
}

/** What the backend said, as a typed error where it has a code the screens act on. */
export function classifyDeletionError(status: number, payload: unknown, message: string): Error | null {
  if (status !== 409 || !payload || typeof payload !== "object") return null;
  const p = payload as { code?: string; blockers?: DeletionBlocker[]; conflicts?: RestoreConflict[] };
  switch (p.code) {
    case "DELETION_BLOCKED":
      return new DeletionBlockedError(message, Array.isArray(p.blockers) ? p.blockers : []);
    case "DELETION_STALE":
      return new DeletionStaleError(message);
    case "RESTORE_BLOCKED":
      return new RestoreBlockedError(message, Array.isArray(p.conflicts) ? p.conflicts : []);
    case "RESTORE_STALE":
      return new RestoreStaleError(message);
    case "RESTORE_WINDOW_EXPIRED":
    case "ALREADY_RESTORED":
    case "ALREADY_PURGED":
      return new RecoveryClosedError(p.code, message);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// The request, checked the way the backend checks it
// ---------------------------------------------------------------------------

export const normalizeReason = (reason: string) => reason.trim();

/** What is wrong with a deletion reason, in words for the person; null when it is fine. */
export function reasonProblem(reason: string): string | null {
  const trimmed = normalizeReason(reason);
  if (trimmed === "") return "Say why, in a few words.";
  if (trimmed.length > DELETION_REASON_MAX_LENGTH) return `Keep it to ${DELETION_REASON_MAX_LENGTH} characters.`;
  return null;
}

/** The checks the backend applies to a deletion request: used before a request is sent. Throws a message safe to show. */
export function validateDeleteInput(input: DeleteRecordInput): DeleteRecordInput {
  if (!DELETION_REASON_CODES.includes(input.reasonCode)) throw new Error("Choose a reason.");
  const problem = reasonProblem(input.reason);
  if (problem) throw new Error(problem);
  if (input.duplicateOfId && input.reasonCode !== "DUPLICATE") throw new Error("A surviving record can only be named when the reason is Duplicate.");
  if (!input.version) throw new Error("Review the record before deleting it.");
  return {
    reasonCode: input.reasonCode,
    reason: normalizeReason(input.reason),
    ...(input.duplicateOfId ? { duplicateOfId: input.duplicateOfId } : {}),
    version: input.version,
  };
}

const squash = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

/** The typed confirmation: the record's name, ignoring case, surrounding and repeated spaces. */
export function typedNameMatches(typed: string, name: string): boolean {
  const wanted = squash(name);
  return wanted !== "" && squash(typed) === wanted;
}

// ---------------------------------------------------------------------------
// The wording of a refusal, shared with the mock (the backend's own sentences)
// ---------------------------------------------------------------------------

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function leadDeletionBlockers(counts: {
  opportunities: number;
  employeeActivity: number;
  decisions: number;
  completedFollowups: number;
  pendingFollowups: number;
}): DeletionBlocker[] {
  const out: DeletionBlocker[] = [];
  if (counts.opportunities > 0)
    out.push({
      code: "LEAD_HAS_OPPORTUNITIES",
      count: counts.opportunities,
      message: `It has ${counts.opportunities} ${plural(counts.opportunities, "opportunity", "opportunities")}, so it is part of the sales pipeline.`,
      hint: "Opportunities, and the quotations and orders that follow them, are never deleted with a lead.",
    });
  if (counts.employeeActivity > 0)
    out.push({
      code: "LEAD_HAS_EMPLOYEE_ACTIVITY",
      count: counts.employeeActivity,
      message: `${counts.employeeActivity} ${plural(counts.employeeActivity, "activity was", "activities were")} logged on it by your team.`,
      hint: "Work your team logged is part of the record and is kept.",
    });
  if (counts.decisions > 0)
    out.push({
      code: "LEAD_QUALIFIED_OR_REJECTED",
      count: counts.decisions,
      message: "A sales decision (qualified or rejected) was recorded on it.",
      hint: "A decision on a lead is part of the record and is kept.",
    });
  if (counts.completedFollowups > 0)
    out.push({
      code: "LEAD_HAS_COMPLETED_FOLLOWUPS",
      count: counts.completedFollowups,
      message: `${counts.completedFollowups} ${plural(counts.completedFollowups, "follow-up was", "follow-ups were")} completed.`,
      hint: "A completed follow-up is work that was done and is kept.",
    });
  if (counts.pendingFollowups > 0)
    out.push({
      code: "LEAD_HAS_PENDING_FOLLOWUPS",
      count: counts.pendingFollowups,
      message: `It has ${counts.pendingFollowups} pending ${plural(counts.pendingFollowups, "follow-up", "follow-ups")}.`,
      hint: "Cancel its pending follow-ups first.",
    });
  return out;
}

export function customerDeletionBlockers(counts: {
  opportunities: number;
  documents: number;
  dispatchOrders: number;
  vendorLink: boolean;
  nameKeyed: number;
}): DeletionBlocker[] {
  const out: DeletionBlocker[] = [];
  if (counts.opportunities > 0)
    out.push({
      code: "CUSTOMER_HAS_OPPORTUNITIES",
      count: counts.opportunities,
      message: `It is linked to ${counts.opportunities} ${plural(counts.opportunities, "opportunity", "opportunities")}.`,
      hint: "Take the customer off each deal first (possible until a quotation exists).",
    });
  if (counts.documents > 0)
    out.push({
      code: "CUSTOMER_GST_IN_DOCUMENTS",
      count: counts.documents,
      message: `${counts.documents} ${plural(counts.documents, "quotation or order uses", "quotations or orders use")} its GST registrations.`,
      hint: "Quotations, proforma invoices and sales orders are never deleted.",
    });
  if (counts.dispatchOrders > 0)
    out.push({
      code: "CUSTOMER_HAS_DISPATCH_ORDERS",
      count: counts.dispatchOrders,
      message: `${counts.dispatchOrders} ${plural(counts.dispatchOrders, "dispatch order refers", "dispatch orders refer")} to it.`,
      hint: "Dispatch orders are never deleted.",
    });
  if (counts.vendorLink)
    out.push({ code: "CUSTOMER_VENDOR_LINK", count: 1, message: "It is linked to a vendor record.", hint: "A customer that is also a vendor is kept." });
  if (counts.nameKeyed > 0)
    out.push({
      code: "CUSTOMER_NAME_IN_FINANCIAL_RECORDS",
      count: counts.nameKeyed,
      message: `${counts.nameKeyed} ${plural(counts.nameKeyed, "invoice, ledger entry or dispatch order carries", "invoices, ledger entries or dispatch orders carry")} its name.`,
      hint: "Financial records are never deleted, and they refer to a customer by name only, so a customer whose name is on one is kept.",
    });
  return out;
}

export function describeBlocked(noun: string, blockers: DeletionBlocker[]): string {
  return `This ${noun} can't be deleted: ${blockers.map((b) => b.message).join(" ")}`;
}

/** The blockers after which "deactivate instead" is no better (a lead with a deal or a pending follow-up cannot be deactivated either). */
export const DEACTIVATE_ALSO_BLOCKED = ["LEAD_HAS_OPPORTUNITIES", "LEAD_HAS_PENDING_FOLLOWUPS"];

/** Whether the lead could be deactivated instead of deleted, from what stands in the way of deleting it. */
export function canDeactivateInstead(blockers: DeletionBlocker[]): boolean {
  return blockers.length > 0 && !blockers.some((b) => DEACTIVATE_ALSO_BLOCKED.includes(b.code));
}

// ---------------------------------------------------------------------------
// Recovery time
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left to restore (rounded up), 0 once the window has ended. */
export function daysLeft(purgeAfter: string, now: Date = new Date()): number {
  const left = Date.parse(purgeAfter) - now.getTime();
  return left <= 0 ? 0 : Math.ceil(left / DAY_MS);
}

export const STATUS_LABEL: Readonly<Record<DeletionStatus, string>> = {
  DELETED: "In Recycle Bin",
  RESTORED: "Restored",
  PURGED: "Purged",
};

/** How a log row says where its recovery stands. */
export function recoveryText(entry: Pick<DeletionLogEntry, "status" | "purgeAfter" | "expired">, now: Date = new Date()): string {
  if (entry.status === "RESTORED") return "Restored";
  if (entry.status === "PURGED") return "Purged";
  if (entry.expired || Date.parse(entry.purgeAfter) < now.getTime()) return "Recovery period ended";
  const days = daysLeft(entry.purgeAfter, now);
  return days <= 1 ? "Less than a day left" : `${days} days left`;
}

/**
 * The only thing a purged record is called anywhere: its kind and that it was erased. Its name is
 * gone (and is never reconstructed from anywhere), so this is all there is to show.
 */
export function purgedTitle(entityType: DeletionEntityType): string {
  return `${ENTITY_LABEL[entityType]} erased`;
}

/** The name to show for a log entry: the record's name, or, once purged, the neutral title. */
export function entryTitle(entry: Pick<DeletionLogEntry, "entityType" | "entityLabel">): string {
  return entry.entityLabel ?? purgedTitle(entry.entityType);
}

/** Who erased a copy, or that nobody did: for the log. */
export function purgeAuditText(entry: Pick<DeletionLogEntry, "status" | "purgeMethod" | "purgedBy">): string {
  if (entry.status !== "PURGED") return "";
  if (entry.purgeMethod === "AUTOMATIC") return "Erased automatically when the recovery period ended";
  return entry.purgedBy?.fullName ? `Erased by ${entry.purgedBy.fullName}` : "Erased by an administrator";
}

/** A row of the Recycle Bin tab (still recoverable now), the Restored tab, or the ended / purged tab. */
export type BinTab = "bin" | "restored" | "ended";

export function binTabOf(entry: Pick<DeletionLogEntry, "status" | "recoverable">): BinTab {
  if (entry.status === "RESTORED") return "restored";
  if (entry.status === "DELETED" && entry.recoverable) return "bin";
  return "ended";
}
