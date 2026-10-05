import { ID, ListQuery, Page } from "../../types/common";
import { Opportunity, OpportunityStage, isQualifiedLeadStatus } from "../../types/domain";
import {
  IOpportunityRepository,
  CreateOpportunityInput,
  OpportunitySortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Opportunity)[] = ["title", "customerName", "ownerName"];

export class MockOpportunityRepository implements IOpportunityRepository {
  async list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>> {
    return delay(applyListQuery(db.opportunities.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<Opportunity | null> {
    return delay(db.opportunities.getById(id) ?? null);
  }

  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    const lead = db.leads.getById(input.leadId);
    if (!lead) throw new Error(`Lead ${input.leadId} not found`);
    if (!isQualifiedLeadStatus(lead.status)) {
      throw new Error("Only a qualified lead can become an opportunity");
    }
    const now = new Date().toISOString();
    const opp: Opportunity = {
      id: mockId("O"),
      leadId: input.leadId,
      title: input.title,
      customerName: lead.customerName,
      stage: "Qualified",
      expectedValue: input.expectedValue,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate,
      ownerName: lead.assignedToName ?? "Unassigned",
      createdAt: now,
    };
    db.opportunities.add(opp);
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: input.leadId,
      icon: "brief",
      title: `OPPORTUNITY_CREATED — ${input.title}`,
      detail: "",
      actorName: "You",
      occurredAt: now,
    });
    return delay(opp);
  }

  async updateStage(id: ID, stage: OpportunityStage): Promise<Opportunity> {
    const updated = db.opportunities.update(id, { stage });
    if (!updated) throw new Error(`Opportunity ${id} not found`);
    return delay(updated);
  }
}
