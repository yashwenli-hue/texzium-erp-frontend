import { ID } from "../../types/common";
import { FollowupWorkItem, LeadFollowup } from "../../types/domain";
import { CreateFollowupInput, ILeadFollowupRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";
import { assertMockLeadActive } from "./leadGuards";

function syncLeadFollowups(leadId: ID) {
  const followups = db.leadFollowups.getAll().filter((f) => f.leadId === leadId);
  db.leads.update(leadId, { followups });
}

/** Mirrors the real dedicated LeadFollowup lifecycle (PENDING/COMPLETED/CANCELLED) — see docs/backend-ui-contract.md §5. */
export class MockLeadFollowupRepository implements ILeadFollowupRepository {
  async listByLead(leadId: ID): Promise<LeadFollowup[]> {
    const rows = db.leadFollowups
      .getAll()
      .filter((f) => f.leadId === leadId)
      .sort((a, b) => (a.followupDate < b.followupDate ? -1 : 1));
    return delay(rows);
  }

  async listAll(): Promise<FollowupWorkItem[]> {
    const rows: FollowupWorkItem[] = [];
    for (const f of db.leadFollowups.getAll()) {
      const lead = db.leads.getAll().find((l) => l.id === f.leadId);
      if (!lead) continue;
      rows.push({
        ...f,
        lead: {
          id: lead.id,
          customerName: lead.customerName,
          companyName: lead.companyName,
          phone: lead.phone,
          status: lead.status,
          isActive: lead.isActive,
          assignedToId: lead.assignedToId ?? null,
        },
      });
    }
    return delay(rows.sort((a, b) => (a.followupDate < b.followupDate ? -1 : 1)));
  }

  async create(input: CreateFollowupInput): Promise<LeadFollowup> {
    assertMockLeadActive(input.leadId);
    const now = new Date().toISOString();
    const row: LeadFollowup = {
      id: mockId("F"),
      leadId: input.leadId,
      followupDate: input.followupDate,
      remarks: input.remarks,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    db.leadFollowups.add(row);
    syncLeadFollowups(input.leadId);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: input.leadId,
      icon: "cal",
      title: "Followup Created",
      detail: input.remarks ?? "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(row);
  }

  private mustGet(id: ID): LeadFollowup {
    const row = db.leadFollowups.getById(id);
    if (!row) throw new Error(`Follow-up ${id} not found`);
    return row;
  }

  async complete(id: ID): Promise<LeadFollowup> {
    const existing = this.mustGet(id);
    if (existing.status !== "PENDING") throw new Error("Only a pending follow-up can be completed");
    const now = new Date().toISOString();
    const updated = db.leadFollowups.update(id, { status: "COMPLETED", completedAt: now, completedByName: "You", updatedAt: now })!;
    syncLeadFollowups(existing.leadId);
    db.leadTimeline.add({ source: "SYSTEM", id: mockId("T"), leadId: existing.leadId, icon: "checksq", title: "Followup Completed", detail: "", actorName: "You", occurredAt: now });
    return delay(updated);
  }

  async reschedule(id: ID, followupDate: string): Promise<LeadFollowup> {
    const existing = this.mustGet(id);
    if (existing.status !== "PENDING") throw new Error("Only a pending follow-up can be rescheduled");
    const now = new Date().toISOString();
    const updated = db.leadFollowups.update(id, { followupDate, status: "PENDING", updatedAt: now })!;
    syncLeadFollowups(existing.leadId);
    db.leadTimeline.add({ source: "SYSTEM", id: mockId("T"), leadId: existing.leadId, icon: "clock", title: "Followup Rescheduled", detail: "", actorName: "You", occurredAt: now });
    return delay(updated);
  }

  async cancel(id: ID): Promise<LeadFollowup> {
    const existing = this.mustGet(id);
    if (existing.status !== "PENDING") throw new Error("Only a pending follow-up can be cancelled");
    const now = new Date().toISOString();
    const updated = db.leadFollowups.update(id, { status: "CANCELLED", updatedAt: now })!;
    syncLeadFollowups(existing.leadId);
    db.leadTimeline.add({ source: "SYSTEM", id: mockId("T"), leadId: existing.leadId, icon: "close", title: "Followup Cancelled", detail: "", actorName: "You", occurredAt: now });
    return delay(updated);
  }
}
