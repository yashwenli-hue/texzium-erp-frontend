import { ID, ListQuery, Page } from "../../types/common";
import { Lead, LeadStatus, LeadTimelineEntry } from "../../types/domain";
import {
  ILeadRepository,
  CreateLeadInput,
  LeadSortField,
} from "../interfaces";
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
      status: "New",
      score: "Warm",
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    db.leads.add(lead);
    db.leadTimeline.add({
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

  async updateStatus(id: ID, status: LeadStatus): Promise<Lead> {
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status, updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
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
    const updated = db.leads.update(id, { assignedToId, assignedToName, updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      id: mockId("T"),
      leadId: id,
      icon: "user",
      title: `PRE_SALES_ASSIGNED — assigned to ${assignedToName}`,
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async qualify(id: ID): Promise<Lead> {
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (lead.status === "Qualified") throw new Error("Lead is already qualified");
    if (lead.status === "Rejected") throw new Error("A rejected lead cannot be qualified");
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status: "Qualified", updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      id: mockId("T"),
      leadId: id,
      icon: "check",
      title: "LEAD_QUALIFIED",
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(updated);
  }

  async reject(id: ID, reason?: string): Promise<Lead> {
    const lead = db.leads.getById(id);
    if (!lead) throw new Error(`Lead ${id} not found`);
    if (lead.status === "Rejected") throw new Error("Lead is already rejected");
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { status: "Rejected", updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      id: mockId("T"),
      leadId: id,
      icon: "close",
      title: "LEAD_REJECTED",
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

  async appendTimelineEntry(
    leadId: ID,
    entry: Omit<LeadTimelineEntry, "id" | "leadId">
  ): Promise<LeadTimelineEntry> {
    const row: LeadTimelineEntry = { ...entry, id: mockId("T"), leadId };
    db.leadTimeline.add(row);
    db.leads.update(leadId, { lastActivityAt: entry.occurredAt, updatedAt: entry.occurredAt });
    return delay(row);
  }
}
