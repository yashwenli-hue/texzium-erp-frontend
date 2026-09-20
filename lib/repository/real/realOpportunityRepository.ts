import { ID, ListQuery, Page } from "../../types/common";
import { Opportunity, OpportunityStage } from "../../types/domain";
import { IOpportunityRepository, CreateOpportunityInput, OpportunitySortField, IUserRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendOpportunity } from "./mappers";

const SEARCHABLE: (keyof Opportunity)[] = ["title", "customerName", "ownerName"];
const STAGE_KEY = "revenueos.real.opportunityStage";

/** Client-side-only stage cache — see the comment on OpportunityStage in lib/types/domain.ts. */
function readStageOverrides(): Record<string, OpportunityStage> {
  try {
    const raw = window.localStorage.getItem(STAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStageOverride(id: ID, stage: OpportunityStage): void {
  try {
    const current = readStageOverrides();
    current[id] = stage;
    window.localStorage.setItem(STAGE_KEY, JSON.stringify(current));
  } catch {
    // localStorage unavailable — stage change just won't survive a refresh this session.
  }
}

/**
 * VERIFIED routes: POST/GET /opportunities only — no GET /:id and no stage/
 * status mutation endpoint (docs/backend-ui-contract.md §7, §16, §17). `stage`
 * is therefore held entirely client-side (localStorage), separate from the
 * backend's own Opportunity.status (a plain string, always "OPEN", never
 * changed by any code path) — moving a card never claims the backend
 * changed. getById() works from the same full list, since no per-id route exists.
 */
export class RealOpportunityRepository implements IOpportunityRepository {
  constructor(private users: IUserRepository) {}

  private async fetchAll(): Promise<Opportunity[]> {
    const rows = await apiFetch<BackendOpportunity[]>("/opportunities");
    const overrides = readStageOverrides();

    let ownerNameById = new Map<string, string>();
    try {
      const users = await this.users.listAssignable();
      ownerNameById = new Map(users.map((u) => [u.id, u.name]));
    } catch {
      // Owner name is a display nicety — an unresolved lookup falls back to "Unassigned" below.
    }

    return rows.map((raw) => {
      const assignedToId = raw.lead?.assignedToId ?? undefined;
      return {
        id: raw.id,
        leadId: raw.leadId,
        title: raw.title,
        customerName: raw.lead?.customerName ?? "—",
        stage: overrides[raw.id] ?? "Qualified",
        expectedValue: raw.expectedValue,
        probability: raw.probability,
        expectedCloseDate: raw.expectedCloseDate,
        ownerName: (assignedToId && ownerNameById.get(assignedToId)) || "Unassigned",
        createdAt: raw.createdAt,
      };
    });
  }

  async list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getById(id: ID): Promise<Opportunity | null> {
    const all = await this.fetchAll();
    return all.find((o) => o.id === id) ?? null;
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
      stage: "Qualified",
      expectedValue: raw.expectedValue,
      probability: raw.probability,
      expectedCloseDate: raw.expectedCloseDate,
      ownerName: "Unassigned",
      createdAt: raw.createdAt,
    };
  }

  async updateStage(id: ID, stage: OpportunityStage): Promise<Opportunity> {
    writeStageOverride(id, stage);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Opportunity ${id} not found`);
    return updated;
  }
}
