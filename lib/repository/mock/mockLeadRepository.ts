import { ID, ListQuery, Page } from "../../types/common";
import { Lead, LeadStage, LeadTimelineEntry } from "../../types/domain";
import {
  ILeadRepository,
  CreateLeadInput,
  LeadSortField,
} from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";
import { applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Lead)[] = ["name", "industry", "city", "ownerName", "email"];

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
    const lead: Lead = {
      id: mockId("L"),
      name: input.name,
      industry: input.industry,
      city: input.city,
      source: input.source,
      stage: "New",
      score: "Warm",
      value: input.value,
      ownerId: mockId("U"),
      ownerName: input.ownerName,
      phone: input.phone,
      email: input.email,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    db.leads.add(lead);
    db.leadTimeline.add({
      id: mockId("T"),
      leadId: lead.id,
      icon: "user",
      title: "Lead created",
      detail: "",
      actorName: input.ownerName,
      occurredAt: now,
    });
    return delay(lead);
  }

  async updateStage(id: ID, stage: LeadStage): Promise<Lead> {
    const now = new Date().toISOString();
    const updated = db.leads.update(id, { stage, updatedAt: now, lastActivityAt: now });
    if (!updated) throw new Error(`Lead ${id} not found`);
    db.leadTimeline.add({
      id: mockId("T"),
      leadId: id,
      icon: "pulse",
      title: `Stage changed to ${stage}`,
      detail: "",
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
