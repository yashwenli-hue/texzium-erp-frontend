import { ID, ListQuery, Page } from "../../types/common";
import { Opportunity, OpportunityStage, formatOpportunityStage, isQualifiedLeadStatus } from "../../types/domain";
import {
  IOpportunityRepository,
  CreateOpportunityInput,
  OpportunitySortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";
import { assertMockLeadActive } from "./leadGuards";
import {
  OpportunityStageConflictError,
  opportunityStageConflictMessage,
  validateOpportunityStageMove,
} from "../shared/opportunityStage";

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
    assertMockLeadActive(input.leadId);
    if (!isQualifiedLeadStatus(lead.status)) {
      throw new Error("Only a qualified lead can become an opportunity");
    }
    const now = new Date().toISOString();
    const opp: Opportunity = {
      id: mockId("O"),
      leadId: input.leadId,
      title: input.title,
      customerName: lead.customerName,
      stage: "QUALIFIED",
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

  /** Same rules and wording as the backend: rule check, then missing/inactive checks, then the stage the caller saw must still be current. */
  async updateStage(id: ID, fromStage: OpportunityStage, toStage: OpportunityStage): Promise<Opportunity> {
    validateOpportunityStageMove(fromStage, toStage);

    const current = db.opportunities.getById(id);
    if (!current) throw new Error("Opportunity not found.");
    assertMockLeadActive(current.leadId);
    if (current.stage !== fromStage) {
      throw new OpportunityStageConflictError(opportunityStageConflictMessage(current.stage));
    }

    const updated = db.opportunities.update(id, { stage: toStage });
    if (!updated) throw new Error("Opportunity not found.");
    db.leadTimeline.add({
      source: "SYSTEM",
      id: mockId("T"),
      leadId: current.leadId,
      icon: "pulse",
      title: "Opportunity Stage Changed",
      detail: `Opportunity "${current.title}": ${formatOpportunityStage(fromStage)} → ${formatOpportunityStage(toStage)}`,
      actorName: "You",
      actorId: "mock-user",
      occurredAt: new Date().toISOString(),
    });
    return delay(updated);
  }
}
