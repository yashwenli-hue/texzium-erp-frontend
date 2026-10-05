import { ID, ListQuery, Page } from "../../types/common";
import { Lead, LeadStatus, LeadTimelineEntry, leadActivityMeta } from "../../types/domain";
import {
  ILeadRepository,
  CreateLeadInput,
  UpdateLeadInput,
  LeadSortField,
  LogLeadActivityInput,
} from "../interfaces";
import { validateLeadActivityInput } from "../shared/leadActivity";
import { db } from "./db";
import { delay } from "./queryUtils";
import { applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Lead)[] = ["customerName", "companyName", "sourceName", "assignedToName", "email"];

export class MockLeadRepository implements ILeadRepository {
  async list(query?: ListQuery<LeadSortField>): Promise<Page<Lead>> {
    const page = applyListQuery(db.leads.getAll(), query, SEARCHABLE);
    return delay(page);
  }

  async getById(id: ID): Promise<Lead | null> {
    return delay(db.leads.getById(id) ?? null);
  }

  async create(input: CreateLeadInput): Promise<Lead> {
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
    const existing = db.leads.getById(id);
    if (!existing) throw new Error(`Lead ${id} not found`);
    const now = new Date().toISOString();
    const source = input.sourceId ? db.leadSources.getById(input.sourceId) : undefined;
    const patch: Partial<Lead> = {
      ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
      ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.alternatePhone !== undefined ? { alternatePhone: input.alternatePhone } : {}),
      ...(input.sourceId !== undefined ? { sourceId: input.sourceId, sourceName: source?.name ?? existing.sourceName } : {}),
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

  async assign(id: ID, assignedToId: ID, assignedToName: string): Promise<Lead> {
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { assignedToId, assignedToName, status: "PRE_SALES_ASSIGNED", updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "user",
      title: "Pre Sales Assigned",
      detail: `Assigned to ${assignedToName}`,
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async qualify(id: ID, salesUserId: ID): Promise<Lead> {
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (lead.status === "SALES_ASSIGNED" || lead.status === "QUALIFIED") throw new Error("Lead is already qualified");
    if (lead.status === "REJECTED") throw new Error("A rejected lead cannot be qualified");
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status: "SALES_ASSIGNED", assignedToId: salesUserId, updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "check",
      title: "Lead Qualified",
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async reject(id: ID, reason: string): Promise<Lead> {
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (lead.status === "REJECTED") throw new Error("Lead is already rejected");
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status: "REJECTED", updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: id,
      icon: "close",
      title: "Lead Rejected",
      detail: reason ?? "",
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
    if (!db.leads.getById(leadId)) throw new Error(`Lead ${leadId} not found`);

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
}
