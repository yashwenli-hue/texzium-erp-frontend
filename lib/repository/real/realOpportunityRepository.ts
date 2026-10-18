import { ID, ListQuery, Page } from "../../types/common";
import { Lead, Opportunity, OpportunityStage } from "../../types/domain";
import { IOpportunityRepository, CreateOpportunityInput, OpportunitySortField, IUserRepository } from "../interfaces";
import { apiFetch, ApiError } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { OpportunityStageConflictError, normalizeStageRemark, stageRemarkProblem, validateOpportunityStageMove } from "../shared/opportunityStage";
import { BackendOpportunity, mapLead, mapOpportunityStage } from "./mappers";
import { toCustomerError } from "./realCustomerRepository";

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
    customerId: raw.customerId ?? undefined,
    customer: raw.customer ?? undefined,
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
/** Shown when a deal has an owner whose name the person can't look up. */
export const OWNER_NAME_UNAVAILABLE = "Name not available";

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
      // The list carries the owner's id, not the name. When the people list can't be read
      // (it needs users.view), the deal still has an owner: say the name isn't available,
      // never "Unassigned".
      return toOpportunity(raw, assignedToId ? ownerNameById.get(assignedToId) ?? OWNER_NAME_UNAVAILABLE : undefined);
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
    let raw: BackendOpportunity;
    try {
      raw = await this.postOpportunity(input);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to create opportunities.");
    }
    return this.afterCreate(raw);
  }

  private async postOpportunity(input: CreateOpportunityInput): Promise<BackendOpportunity> {
    return apiFetch<BackendOpportunity>("/opportunities", {
      method: "POST",
      body: {
        leadId: input.leadId,
        title: input.title,
        expectedValue: input.expectedValue,
        probability: input.probability,
        expectedCloseDate: input.expectedCloseDate,
        ...(input.customerId ? { customerId: input.customerId } : {}),
      },
    });
  }

  private async afterCreate(raw: BackendOpportunity): Promise<Opportunity> {
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
      customerId: raw.customerId ?? undefined,
      customer: raw.customer ?? undefined,
    };
  }

  async updateStage(id: ID, fromStage: OpportunityStage, toStage: OpportunityStage, remarks?: string): Promise<Opportunity> {
    // The backend applies the same rules; checking first spares a round trip
    // and gives the same wording for a move that can never be valid.
    validateOpportunityStageMove(fromStage, toStage);
    const problem = stageRemarkProblem(remarks);
    if (problem) throw new Error(problem);
    const remark = normalizeStageRemark(remarks);

    try {
      // The remark rides on the same request as the move, so the stage and its history event
      // are still one atomic change on the backend. A blank remark is not sent. The actor is
      // never sent: the backend takes it from the signed-in user.
      await apiFetch<unknown>(`/opportunities/${id}/stage`, {
        method: "PATCH",
        body: remark === undefined ? { fromStage, toStage } : { fromStage, toStage, remarks: remark },
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

  async linkCustomer(id: ID, customerId: ID | null): Promise<Opportunity> {
    try {
      await apiFetch<BackendOpportunity>(`/opportunities/${encodeURIComponent(id)}/customer`, { method: "PATCH", body: { customerId } });
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to change an opportunity's customer.");
    }
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Opportunity ${id} not found`);
    return updated;
  }
}
