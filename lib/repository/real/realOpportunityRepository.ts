import { ID, ListQuery, Page } from "../../types/common";
import { Lead, Opportunity, OpportunityStage } from "../../types/domain";
import { IOpportunityRepository, CreateOpportunityInput, OpportunitySortField, IUserRepository } from "../interfaces";
import { apiFetch, ApiError } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { OpportunityStageConflictError, validateOpportunityStageMove } from "../shared/opportunityStage";
import { BackendOpportunity, mapLead, mapOpportunityStage } from "./mappers";

const SEARCHABLE: (keyof Opportunity)[] = ["title", "customerName", "ownerName"];

function toOpportunity(raw: BackendOpportunity, ownerName: string | undefined, lead?: Lead): Opportunity {
  return {
    id: raw.id,
    leadId: raw.leadId,
    title: raw.title,
    customerName: raw.lead?.customerName ?? "—",
    stage: mapOpportunityStage(raw.status),
    expectedValue: raw.expectedValue,
    probability: raw.probability,
    expectedCloseDate: raw.expectedCloseDate,
    ownerName: ownerName || "Unassigned",
    createdAt: raw.createdAt,
    lead,
  };
}

/**
 * VERIFIED routes (backend 933231a): POST /opportunities, GET /opportunities,
 * GET /opportunities/:id (embeds the lead — source, assignee {id, fullName},
 * notes, timelines, followups) and PATCH /opportunities/:id/stage with
 * { fromStage, toStage } (permission opportunities.edit).
 *
 * `stage` is the backend's Opportunity.status (QUALIFIED, PROPOSAL, NEGOTIATION,
 * WON or LOST). Nothing about the stage is kept in the browser.
 */
export class RealOpportunityRepository implements IOpportunityRepository {
  constructor(private users: IUserRepository) {}

  private async fetchAll(): Promise<Opportunity[]> {
    const rows = await apiFetch<BackendOpportunity[]>("/opportunities");

    let ownerNameById = new Map<string, string>();
    try {
      const users = await this.users.listAssignable();
      ownerNameById = new Map(users.map((u) => [u.id, u.name]));
    } catch {
      // Owner name is a display nicety — an unresolved lookup falls back to "Unassigned" below.
    }

    return rows.map((raw) => {
      const assignedToId = raw.lead?.assignedToId ?? undefined;
      return toOpportunity(raw, assignedToId ? ownerNameById.get(assignedToId) : undefined);
    });
  }

  async list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getById(id: ID): Promise<Opportunity | null> {
    try {
      const raw = await apiFetch<BackendOpportunity>(`/opportunities/${id}`);
      return toOpportunity(raw, raw.lead?.assignedTo?.fullName, raw.lead ? mapLead(raw.lead) : undefined);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    const raw = await apiFetch<BackendOpportunity>("/opportunities", {
      method: "POST",
      body: {
        leadId: input.leadId,
        title: input.title,
        expectedValue: input.expectedValue,
        probability: input.probability,
        expectedCloseDate: input.expectedCloseDate,
      },
    });
    const created = await this.getById(raw.id);
    if (created) return created;
    // Fallback in the unlikely event the immediate re-fetch races the write.
    return {
      id: raw.id,
      leadId: raw.leadId,
      title: raw.title,
      customerName: "—",
      stage: mapOpportunityStage(raw.status),
      expectedValue: raw.expectedValue,
      probability: raw.probability,
      expectedCloseDate: raw.expectedCloseDate,
      ownerName: "Unassigned",
      createdAt: raw.createdAt,
    };
  }

  async updateStage(id: ID, fromStage: OpportunityStage, toStage: OpportunityStage): Promise<Opportunity> {
    // The backend applies the same rules; checking first spares a round trip
    // and gives the same wording for a move that can never be valid.
    validateOpportunityStageMove(fromStage, toStage);

    try {
      await apiFetch<unknown>(`/opportunities/${id}/stage`, {
        method: "PATCH",
        body: { fromStage, toStage },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // 409: the stage changed since the person opened it (or the lead is
        // deactivated). The backend's message says which; callers reload.
        if (err.status === 409) throw new OpportunityStageConflictError(err.message);
        if (err.status === 403) {
          throw new ApiError("You don't have permission to change an opportunity's stage.", 403, err.details);
        }
      }
      throw err;
    }

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Opportunity ${id} not found`);
    return updated;
  }
}
