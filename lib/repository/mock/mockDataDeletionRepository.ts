import { ID } from "../../types/common";
import { ApiError } from "../../api/httpClient";
import { Customer, CustomerEvent, Lead, LeadFollowup, LeadTimelineEntry } from "../../types/domain";
import { IDataDeletionRepository } from "../interfaces";
import {
  DeleteRecordInput,
  DeletionBlockedError,
  DeletionEntityType,
  DeletionLogEntry,
  DeletionLogQuery,
  DeletionPreview,
  DeletionResult,
  DeletionStaleError,
  DELETION_REASON_CODES,
  ENTITY_NOUN,
  PurgeResult,
  RECOVERY_WINDOW_DAYS,
  RecoveryClosedError,
  RestoreBlockedError,
  RestoreConflict,
  RestorePreview,
  RestoreResult,
  RestoreStaleError,
  customerDeletionBlockers,
  describeBlocked,
  leadDeletionBlockers,
  validateDeleteInput,
  DeletionBlocker,
  DeletionLine,
} from "../shared/dataDeletion";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";

/** The mock's stand-in for the signed-in user. The real backend takes the actor from the token. */
const ACTOR = { id: "mock-user", fullName: "You" };
const DAY = 24 * 60 * 60 * 1000;

interface Tombstone {
  entry: DeletionLogEntry;
  /** The record and what was removed with it, as it was. Null once purged. */
  snapshot: { lead?: Lead; timeline?: LeadTimelineEntry[]; followups?: LeadFollowup[]; customer?: Customer; events?: CustomerEvent[] } | null;
}

// Module-level, like the mock db itself: it lasts as long as the tab.
const records: Tombstone[] = [];

/** A small, stable digest of the facts a decision rests on (the mock's version token). */
function digest(facts: unknown): string {
  const text = JSON.stringify(facts);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, "0");
}

const norm = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

interface Evaluation {
  label: string;
  code: string | null;
  blockers: DeletionBlocker[];
  removes: DeletionLine[];
  version: string;
}

function evaluateLead(id: ID): Evaluation | null {
  const lead = db.leads.getById(id);
  if (!lead) return null;
  const timeline = db.leadTimeline.getAll().filter((t) => t.leadId === id);
  const followups = db.leadFollowups.getAll().filter((f) => f.leadId === id);
  const counts = {
    opportunities: db.opportunities.getAll().filter((o) => o.leadId === id).length,
    employeeActivity: timeline.filter((t) => t.source === "EMPLOYEE").length,
    decisions: timeline.filter((t) => /^(LEAD_(QUALIFIED|REJECTED)|Lead (Qualified|Rejected))/.test(t.title)).length,
    completedFollowups: followups.filter((f) => f.status === "COMPLETED").length,
    pendingFollowups: followups.filter((f) => f.status === "PENDING").length,
  };
  const removes: DeletionLine[] = [
    { label: "The lead record", count: 1 },
    { label: "History events", count: timeline.length },
    { label: "Cancelled follow-ups", count: followups.length },
  ].filter((l) => l.count > 0);
  return {
    label: lead.customerName,
    code: null,
    blockers: leadDeletionBlockers(counts),
    removes,
    version: digest({ updatedAt: lead.updatedAt, active: lead.isActive, counts, timeline: timeline.length, followups: followups.length }),
  };
}

function evaluateCustomer(id: ID): Evaluation | null {
  const customer = db.customers.getById(id);
  if (!customer) return null;
  const events = db.customerEvents.getAll().filter((e) => e.customerId === id);
  const names = new Set([customer.customerName, ...customer.gstRegistrations.flatMap((r) => [r.legalName, r.tradeName ?? ""])].filter(Boolean).map(norm));
  const counts = {
    opportunities: db.opportunities.getAll().filter((o) => o.customerId === id).length,
    documents: 0,
    dispatchOrders: 0,
    vendorLink: customer.isVendor || !!customer.linkedVendorId,
    nameKeyed:
      db.salesInvoices.getAll().filter((i) => !!i.invoiceCustomerName && names.has(norm(i.invoiceCustomerName))).length +
      db.customerLedger.getAll().filter((l) => names.has(norm(l.customerName))).length,
  };
  const removes: DeletionLine[] = [
    { label: "The customer record", count: 1 },
    { label: "GST registrations", count: customer.gstRegistrations.length },
    { label: "History events", count: events.length },
  ].filter((l) => l.count > 0);
  return {
    label: customer.customerName,
    code: customer.customerCode,
    blockers: customerDeletionBlockers(counts),
    removes,
    version: digest({ updatedAt: customer.updatedAt, active: customer.isActive, counts, events: events.length, registrations: customer.gstRegistrations.length }),
  };
}

const evaluate = (type: DeletionEntityType, id: ID) => (type === "LEAD" ? evaluateLead(id) : evaluateCustomer(id));
const notFound = (type: DeletionEntityType) => new ApiError(`${type === "LEAD" ? "Lead" : "Customer"} not found.`, 404);

function windowState(entry: DeletionLogEntry, now = Date.now()) {
  const expired = now > Date.parse(entry.purgeAfter);
  return { expired, recoverable: entry.status === "DELETED" && !expired };
}

/**
 * The purge worker of the real backend, in the mock: a record whose recovery period has ended
 * and that nobody restored is erased automatically (AUTOMATIC: a system action, nobody is
 * recorded). Run before every read, so the mock never shows an expired record as still DELETED.
 */
function sweepExpired() {
  const now = new Date().toISOString();
  for (const t of records) {
    if (t.entry.status === "DELETED" && windowState(t.entry).expired) erase(t, "AUTOMATIC", now);
  }
}

/**
 * The purge, as the backend does it, for both paths: everything that only served recovery is
 * erased in one step and only the minimal audit is kept (id, kind, original id, reason code,
 * when it was deleted, the deadline, when and how it was erased, and who: nobody for the system).
 */
function erase(t: Tombstone, method: "MANUAL" | "AUTOMATIC", now: string) {
  t.snapshot = null;
  t.entry = {
    id: t.entry.id,
    entityType: t.entry.entityType,
    entityId: null,
    entityCode: null,
    entityLabel: null,
    reasonCode: t.entry.reasonCode,
    reason: null,
    survivorId: null,
    survivorLabel: null,
    impact: {},
    status: "PURGED",
    deletedAt: t.entry.deletedAt,
    purgeAfter: t.entry.purgeAfter,
    deletedBy: null,
    purgedAt: now,
    purgeMethod: method,
    purgedBy: method === "MANUAL" ? ACTOR : null,
    recoverable: false,
    expired: true,
  };
}

const withWindow = (t: Tombstone): DeletionLogEntry => ({ ...t.entry, ...windowState(t.entry) });

function restoreConflicts(t: Tombstone): { conflicts: RestoreConflict[]; restores: DeletionLine[] } {
  const s = t.snapshot;
  const conflicts: RestoreConflict[] = [];
  if (!s) return { conflicts: [{ code: "SNAPSHOT_INVALID", message: "The saved copy is not readable." }], restores: [] };
  if (s.lead) {
    if (db.leads.getById(s.lead.id)) conflicts.push({ code: "LEAD_ID_EXISTS", message: "A lead with this identity already exists." });
    return { conflicts, restores: [{ label: "The lead record", count: 1 }, { label: "History events", count: s.timeline?.length ?? 0 }].filter((l) => l.count > 0) };
  }
  if (s.customer) {
    if (db.customers.getById(s.customer.id)) conflicts.push({ code: "CUSTOMER_ID_EXISTS", message: "A customer with this identity already exists." });
    const same = db.customers.getAll().find((c) => norm(c.customerName) === norm(s.customer!.customerName));
    if (same) conflicts.push({ code: "DUPLICATE_NAME", message: `Another customer, "${same.customerName}" (${same.customerCode}), now has the same name.` });
    if (s.customer.panNumber) {
      const pan = db.customers.getAll().find((c) => c.panNumber && c.panNumber.toUpperCase() === s.customer!.panNumber!.toUpperCase());
      if (pan) conflicts.push({ code: "DUPLICATE_PAN", message: `Another customer, "${pan.customerName}" (${pan.customerCode}), now has the same PAN.` });
    }
    return { conflicts, restores: [{ label: "The customer record", count: 1 }, { label: "GST registrations", count: s.customer.gstRegistrations.length }, { label: "History events", count: s.events?.length ?? 0 }].filter((l) => l.count > 0) };
  }
  return { conflicts, restores: [] };
}

/**
 * Follows the backend's governed deletion and recovery (the same blockers and sentences,
 * 30-day window, restore conflicts and tokens) over the mock tables. It cannot reproduce
 * concurrency (the backend proves that on a real database): calls here run one after the
 * other, which gives the same outcomes.
 */
export class MockDataDeletionRepository implements IDataDeletionRepository {
  async preview(entityType: DeletionEntityType, id: ID): Promise<DeletionPreview> {
    const e = evaluate(entityType, id);
    if (!e) throw notFound(entityType);
    return delay({
      entityType,
      entityId: id,
      label: e.label,
      code: e.code,
      eligible: e.blockers.length === 0,
      blockers: e.blockers,
      removes: e.removes,
      keeps: [
        `The record goes to the Recycle Bin and can be restored by an administrator for ${RECOVERY_WINDOW_DAYS} days. After that its saved copy is erased automatically; an administrator may also erase it earlier.`,
        "A complete copy is kept in the Deletion Log, readable only by administrators.",
      ],
      version: e.version,
      reasonCodes: DELETION_REASON_CODES,
      recoveryDays: RECOVERY_WINDOW_DAYS,
    });
  }

  async delete(entityType: DeletionEntityType, id: ID, input: DeleteRecordInput): Promise<DeletionResult> {
    const valid = validateDeleteInput(input);
    if (valid.duplicateOfId === id) throw new ApiError("A record cannot be a duplicate of itself.", 400);
    const survivorLabel = valid.duplicateOfId
      ? entityType === "LEAD"
        ? db.leads.getById(valid.duplicateOfId)?.customerName
        : db.customers.getById(valid.duplicateOfId)?.customerName
      : undefined;
    if (valid.duplicateOfId && !survivorLabel) throw new ApiError(`The surviving ${ENTITY_NOUN[entityType]} was not found. It may have been deleted.`, 400);

    const e = evaluate(entityType, id);
    if (!e) throw notFound(entityType);
    if (e.blockers.length > 0) throw new DeletionBlockedError(describeBlocked(ENTITY_NOUN[entityType], e.blockers), e.blockers);
    if (e.version !== valid.version) throw new DeletionStaleError();

    const now = new Date();
    const snapshot: Tombstone["snapshot"] =
      entityType === "LEAD"
        ? { lead: { ...db.leads.getById(id)! }, timeline: db.leadTimeline.getAll().filter((t) => t.leadId === id).map((t) => ({ ...t })), followups: db.leadFollowups.getAll().filter((f) => f.leadId === id).map((f) => ({ ...f })) }
        : { customer: structuredClone(db.customers.getById(id)!), events: db.customerEvents.getAll().filter((x) => x.customerId === id).map((x) => ({ ...x })) };
    const entry: DeletionLogEntry = {
      id: mockId("DD"),
      entityType,
      entityId: id,
      entityCode: e.code ?? undefined,
      entityLabel: e.label,
      reasonCode: valid.reasonCode,
      reason: valid.reason,
      survivorId: valid.duplicateOfId,
      survivorLabel,
      impact: { removed: e.removes, blockersChecked: [], version: e.version },
      status: "DELETED",
      deletedAt: now.toISOString(),
      purgeAfter: new Date(now.getTime() + RECOVERY_WINDOW_DAYS * DAY).toISOString(),
      deletedBy: ACTOR,
      recoverable: true,
      expired: false,
    };

    if (entityType === "LEAD") {
      db.leadTimeline.getAll().filter((t) => t.leadId === id).forEach((t) => db.leadTimeline.remove(t.id));
      db.leadFollowups.getAll().filter((f) => f.leadId === id).forEach((f) => db.leadFollowups.remove(f.id));
      db.leads.remove(id);
    } else {
      db.customerEvents.getAll().filter((x) => x.customerId === id).forEach((x) => db.customerEvents.remove(x.id));
      db.customers.remove(id);
    }
    records.unshift({ entry, snapshot });
    return delay({ id: entry.id, entityType, entityId: id, label: e.label, reasonCode: valid.reasonCode, survivorId: valid.duplicateOfId ?? null, deletedAt: entry.deletedAt, purgeAfter: entry.purgeAfter });
  }

  async list(query?: DeletionLogQuery): Promise<DeletionLogEntry[]> {
    sweepExpired();
    const rows = records
      .map(withWindow)
      .filter((r) => !query?.entityType || r.entityType === query.entityType)
      .filter((r) => !query?.status || r.status === query.status)
      .filter((r) => !query?.entityId || r.entityId === query.entityId)
      .slice(query?.offset ?? 0, (query?.offset ?? 0) + (query?.limit ?? 50));
    return delay(rows);
  }

  async get(recordId: ID): Promise<DeletionLogEntry> {
    sweepExpired();
    const t = records.find((r) => r.entry.id === recordId);
    if (!t) throw new ApiError("Deletion record not found.", 404);
    return delay({ ...withWindow(t), snapshot: t.snapshot ?? { purged: true } });
  }

  async restorePreview(recordId: ID): Promise<RestorePreview> {
    sweepExpired();
    const t = records.find((r) => r.entry.id === recordId);
    if (!t) throw new ApiError("Deletion record not found.", 404);
    const { expired } = windowState(t.entry);
    const base = { id: t.entry.id, entityType: t.entry.entityType, entityId: t.entry.entityId, label: t.entry.entityLabel, status: t.entry.status, deletedAt: t.entry.deletedAt, purgeAfter: t.entry.purgeAfter, expired };
    if (t.entry.status !== "DELETED") {
      const code = t.entry.status === "RESTORED" ? "ALREADY_RESTORED" : "ALREADY_PURGED";
      return delay({ ...base, eligible: false, conflicts: [{ code, message: t.entry.status === "RESTORED" ? "This record has already been restored." : "This record has been purged and can no longer be restored." }], restores: [], version: digest({ s: t.entry.status }) });
    }
    const { conflicts, restores } = restoreConflicts(t);
    const all = expired ? [{ code: "RESTORE_WINDOW_EXPIRED", message: "The recovery period for this record has ended, so it can no longer be restored." }, ...conflicts] : conflicts;
    return delay({ ...base, eligible: all.length === 0, conflicts: all, restores, version: digest({ s: t.entry.status, p: t.entry.purgeAfter, conflicts }) });
  }

  async restore(recordId: ID, version: string): Promise<RestoreResult> {
    sweepExpired();
    const t = records.find((r) => r.entry.id === recordId);
    if (!t) throw new ApiError("Deletion record not found.", 404);
    if (t.entry.status === "RESTORED") throw new RecoveryClosedError("ALREADY_RESTORED", "This record has already been restored.");
    if (t.entry.status === "PURGED") throw new RecoveryClosedError("ALREADY_PURGED", "This record has been purged and can no longer be restored.");
    if (windowState(t.entry).expired) throw new RecoveryClosedError("RESTORE_WINDOW_EXPIRED", "The recovery period for this record has ended, so it can no longer be restored.");
    const { conflicts } = restoreConflicts(t);
    if (conflicts.length > 0) throw new RestoreBlockedError(`This ${ENTITY_NOUN[t.entry.entityType]} can't be restored: ${conflicts.map((c) => c.message).join(" ")}`, conflicts);
    if (version !== digest({ s: t.entry.status, p: t.entry.purgeAfter, conflicts })) throw new RestoreStaleError();

    const now = new Date().toISOString();
    const s = t.snapshot!;
    if (s.lead) {
      db.leads.add({ ...s.lead, updatedAt: now, lastActivityAt: now });
      (s.timeline ?? []).forEach((x) => db.leadTimeline.add({ ...x }));
      (s.followups ?? []).forEach((x) => db.leadFollowups.add({ ...x }));
      db.leadTimeline.add({ source: "SYSTEM", id: mockId("T"), leadId: s.lead.id, icon: "check", title: "LEAD_RESTORED", detail: `Lead restored from the Recycle Bin. It had been deleted earlier.`, actorName: ACTOR.fullName, occurredAt: now });
    } else if (s.customer) {
      db.customers.add({ ...structuredClone(s.customer), updatedAt: now });
      (s.events ?? []).forEach((x) => db.customerEvents.add({ ...x }));
    }
    t.entry = { ...t.entry, status: "RESTORED", restoredAt: now, restoredBy: ACTOR };
    return delay({ id: t.entry.id, entityType: t.entry.entityType, entityId: t.entry.entityId as string, label: t.entry.entityLabel as string, restoredAt: now });
  }

  async purge(recordId: ID): Promise<PurgeResult> {
    sweepExpired();
    const t = records.find((r) => r.entry.id === recordId);
    if (!t) throw new ApiError("Deletion record not found.", 404);
    if (t.entry.status === "PURGED") throw new RecoveryClosedError("ALREADY_PURGED", "This record has been purged and can no longer be restored.");
    if (t.entry.status === "RESTORED") throw new RecoveryClosedError("ALREADY_RESTORED", "Only a record that is still deleted can be purged.");
    // An administrator may erase it at any time, inside the recovery window or after it.
    const now = new Date().toISOString();
    erase(t, "MANUAL", now);
    return delay({ id: t.entry.id, entityType: t.entry.entityType, purgedAt: now, purgeMethod: "MANUAL" });
  }

  /** For tests only: moves a record's stored deadline, standing in for the passing of time. */
  static _ageForTest(recordId: ID, purgeAfter: string) {
    const t = records.find((r) => r.entry.id === recordId);
    if (t) t.entry = { ...t.entry, purgeAfter };
  }

  /** For tests only. */
  static _resetForTest() {
    records.length = 0;
  }
}
