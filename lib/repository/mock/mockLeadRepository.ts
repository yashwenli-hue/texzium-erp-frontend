import { ID, ListQuery, Page } from "../../types/common";
import {
  Lead,
  LeadStatus,
  LeadTimelineEntry,
  canAssignLeadFrom,
  canQualifyLeadFrom,
  canRejectLeadFrom,
  leadActionBlockedReason,
  leadActivityMeta,
} from "../../types/domain";
import {
  ILeadRepository,
  CreateLeadInput,
  UpdateLeadInput,
  LeadSortField,
  LeadListOptions,
  LogLeadActivityInput,
} from "../interfaces";
import { ApiError } from "../../api/httpClient";
import { EMPTY_STORED_LOCATION, locationProblems, mergeLocation, normalizedLocationFields, storedLocationOf } from "../../geo/leadLocation";
import { validateLeadActivityInput } from "../shared/leadActivity";
import { describeDeactivationBlockers, validateDeactivationReason } from "../shared/leadLifecycle";
import { assertMockLeadActive } from "./leadGuards";
import { db } from "./db";
import { delay } from "./queryUtils";
import { applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import { MOCK_ASSIGNABLE_USERS } from "./mockUserRepository";
import { OPPORTUNITY_STAGE_REMARK_MAX_LENGTH as LEAD_REJECT_REASON_MAX_LENGTH } from "../shared/opportunityStage";

// Like the backend: only an existing, active user can take a lead.
function activeAssignee(userId: ID) {
  const user = MOCK_ASSIGNABLE_USERS.find((u) => u.id === userId);
  if (!user) throw new Error("The selected user does not exist.");
  if (!user.active) throw new Error("The selected user is not active and cannot take leads.");
  return user;
}

// " (previously Rohit M.)" when someone else held the lead; nothing otherwise.
function previously(lead: Lead, newAssigneeId: ID) {
  if (!lead.assignedToId || lead.assignedToId === newAssigneeId) return "";
  return ` (previously ${lead.assignedToName ?? lead.assignedToId})`;
}

const SEARCHABLE: (keyof Lead)[] = ["customerName", "companyName", "sourceName", "assignedToName", "email"];

export class MockLeadRepository implements ILeadRepository {
  async list(query?: ListQuery<LeadSortField>, options?: LeadListOptions): Promise<Page<Lead>> {
    const rows = db.leads.getAll().filter((l) => options?.includeInactive || l.isActive);
    const page = applyListQuery(rows, query, SEARCHABLE);
    return delay(page);
  }

  async getById(id: ID): Promise<Lead | null> {
    return delay(db.leads.getById(id) ?? null);
  }

  async create(input: CreateLeadInput): Promise<Lead> {
    // Same rules as the backend: a location that is given is whole and valid; none at all is allowed.
    const location = mergeLocation(EMPTY_STORED_LOCATION, normalizedLocationFields({ country: input.country, state: input.state, city: input.city }));
    const problem = locationProblems(location)[0];
    if (problem) throw new ApiError(problem.message, 400);
    const now = new Date().toISOString();
    const source = db.leadSources.getById(input.sourceId);
    const lead: Lead = {
      id: mockId("L"),
      customerName: input.customerName,
      companyName: input.companyName,
      email: input.email,
      phone: input.phone,
      alternatePhone: input.alternatePhone,
      sourceId: input.sourceId,
      sourceName: source?.name ?? "Unknown source",
      status: "NEW",
      isActive: true,
      ...(location.country ? { country: location.country } : {}),
      ...(location.state ? { state: location.state } : {}),
      ...(location.city ? { city: location.city } : {}),
      score: "Warm",
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      uiContext: input.uiContext,
    };
    db.leads.add(lead);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: lead.id,
      icon: "funnel",
      title: "LEAD_CREATED",
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(lead);
  }

  async update(id: ID, input: UpdateLeadInput): Promise<Lead> {
    assertMockLeadActive(id);
    const existing = db.leads.getById(id);
    if (!existing) throw new Error(`Lead ${id} not found`);
    // A location field left out keeps what is stored, null clears it, and the result is checked as a whole.
    const change = normalizedLocationFields({ country: input.country, state: input.state, city: input.city });
    const touchesLocation = change.country !== undefined || change.state !== undefined || change.city !== undefined;
    const location = mergeLocation(storedLocationOf(existing), change);
    const problem = touchesLocation ? locationProblems(location)[0] : undefined;
    if (problem) throw new ApiError(problem.message, 400);
    const now = new Date().toISOString();
    const source = input.sourceId ? db.leadSources.getById(input.sourceId) : undefined;
    const patch: Partial<Lead> = {
      ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.alternatePhone !== undefined ? { alternatePhone: input.alternatePhone } : {}),
      ...(input.sourceId !== undefined ? { sourceId: input.sourceId, sourceName: source?.name ?? existing.sourceName } : {}),
      ...(touchesLocation ? { country: location.country ?? undefined, state: location.state ?? undefined, city: location.city ?? undefined } : {}),
      ...(input.uiContext !== undefined ? { uiContext: { ...existing.uiContext, ...input.uiContext } } : {}),
      updatedAt: now,
      lastActivityAt: now,
    };
    const updated = db.leads.update(id, patch);
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "pulse",
      title: "LEAD_UPDATED",
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async updateStatus(id: ID, status: LeadStatus): Promise<Lead> {
    assertMockLeadActive(id);
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status, updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "pulse",
      title: `STATUS_UPDATED — moved to ${status}`,
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  // Same rules and sentence as the backend (lead-transitions.ts there).
  async assign(id: ID, assignedToId: ID, _assignedToName: string): Promise<Lead> {
    assertMockLeadActive(id);
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (!canAssignLeadFrom(lead.status)) throw new Error(leadActionBlockedReason("assign", lead.status));
    const assignee = activeAssignee(assignedToId);
    if (lead.status === "PRE_SALES_ASSIGNED" && lead.assignedToId === assignee.id) {
      throw new Error(`This lead is already assigned to ${assignee.name}.`);
    }
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { assignedToId: assignee.id, assignedToName: assignee.name, status: "PRE_SALES_ASSIGNED", updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "user",
      title: "Pre Sales Assigned",
      detail: `Assigned to pre-sales: ${assignee.name}${previously(lead, assignee.id)}.`,
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async unassign(id: ID, assignedToId: ID, remark?: string): Promise<Lead> {
    assertMockLeadActive(id);
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (lead.status !== "PRE_SALES_ASSIGNED" || !lead.assignedToId) {
      throw new Error("Only a lead that is assigned to pre-sales (Pre Sales Assigned) can be unassigned.");
    }
    if (lead.assignedToId !== assignedToId) throw new Error("This lead's assignment has changed. Reload the lead and try again.");
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { assignedToId: undefined, assignedToName: undefined, status: "NEW", updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    const userRemark = remark?.trim() || undefined;
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "user",
      title: "Lead Unassigned",
      detail: `Unassigned from ${lead.assignedToName ?? lead.assignedToId}; status returned to New.`,
      ...(userRemark ? { userRemark } : {}),
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async qualify(id: ID, salesUserId: ID): Promise<Lead> {
    assertMockLeadActive(id);
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (!canQualifyLeadFrom(lead.status)) throw new Error(leadActionBlockedReason("qualify", lead.status));
    const salesUser = activeAssignee(salesUserId);
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status: "SALES_ASSIGNED", assignedToId: salesUser.id, assignedToName: salesUser.name, updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "check",
      title: "Lead Qualified",
      detail: `Qualified and assigned to sales: ${salesUser.name}${previously(lead, salesUser.id)}.`,
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async reject(id: ID, reason: string): Promise<Lead> {
    assertMockLeadActive(id);
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (!canRejectLeadFrom(lead.status)) throw new Error(leadActionBlockedReason("reject", lead.status));
    // Like the backend: the reason is required, trimmed, at most 500 characters, and
    // kept as the person's remark beside a fixed sentence. The assignee is kept.
    const userRemark = (reason ?? "").trim();
    if (!userRemark) throw new Error("A reason is required to reject a lead.");
    if (userRemark.length > LEAD_REJECT_REASON_MAX_LENGTH) {
      throw new Error(`The reason can be at most ${LEAD_REJECT_REASON_MAX_LENGTH} characters.`);
    }
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status: "REJECTED", updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "close",
      title: "Lead Rejected",
      detail: "Lead rejected.",
      userRemark,
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async getTimeline(leadId: ID): Promise<LeadTimelineEntry[]> {
    const rows = db.leadTimeline
      .getAll()
      .filter((t) => t.leadId === leadId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    return delay(rows);
  }

  async logActivity(leadId: ID, input: LogLeadActivityInput): Promise<LeadTimelineEntry> {
    const valid = validateLeadActivityInput(input);
    assertMockLeadActive(leadId);

    const now = new Date().toISOString();
    const meta = leadActivityMeta(valid.activityType);
    const row: LeadTimelineEntry = {
      id: mockId("T"),
      leadId,
      source: "EMPLOYEE",
      activityType: valid.activityType,
      icon: meta.icon,
      title: meta.label,
      detail: valid.remarks,
      actorName: "You",
      occurredAt: valid.occurredAt ?? now,
      recordedAt: now,
    };
    db.leadTimeline.add(row);
    // Same as the backend: logging activity touches the lead's last-activity time, never its status.
    db.leads.update(leadId, { lastActivityAt: now, updatedAt: now });
    return delay(row);
  }

  // Same rules as the backend: a reason is required, an already deactivated lead
  // is refused, and a lead with any opportunity or pending follow-up cannot be
  // deactivated. Neither of those is ever changed.
  async deactivate(id: ID, reason: string): Promise<Lead> {
    const clean = validateDeactivationReason(reason);
    const lead = db.leads.getById(id);
    if (!lead) throw new Error("Lead not found.");
    if (!lead.isActive) throw new Error("This lead is already deactivated.");

    const blockers = describeDeactivationBlockers({
      opportunities: db.opportunities.getAll().filter((o) => o.leadId === id).length,
      pendingFollowups: db.leadFollowups.getAll().filter((f) => f.leadId === id && f.status === "PENDING").length,
    });
    if (blockers) throw new Error(blockers);

    const now = new Date().toISOString();
    const updated = db.leads.update(id, {
      isActive: false,
      deactivatedAt: now,
      deactivatedById: "mock-user",
      deactivatedByName: "You",
      deactivationReason: clean,
      updatedAt: now,
      lastActivityAt: now,
    });
    if (!updated) throw new Error("Lead not found.");
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "alert",
      title: "Lead Deactivated",
      detail: clean,
      actorName: "You",
      actorId: "mock-user",
      occurredAt: now,
    });
    return delay(updated);
  }

  async reactivate(id: ID): Promise<Lead> {
    const lead = db.leads.getById(id);
    if (!lead) throw new Error("Lead not found.");
    if (lead.isActive) throw new Error("This lead is already active.");

    const now = new Date().toISOString();
    const updated = db.leads.update(id, {
      isActive: true,
      deactivatedAt: undefined,
      deactivatedById: undefined,
      deactivatedByName: undefined,
      deactivationReason: undefined,
      updatedAt: now,
      lastActivityAt: now,
    });
    if (!updated) throw new Error("Lead not found.");
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "check",
      title: "Lead Reactivated",
      detail: "Lead reactivated.",
      actorName: "You",
      actorId: "mock-user",
      occurredAt: now,
    });
    return delay(updated);
  }
}
