import { ListQuery, Page } from "../../types/common";
import { Opportunity } from "../../types/domain";
import {
  IOpportunityRepository,
  CreateOpportunityInput,
  OpportunitySortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Opportunity)[] = ["name", "customerName", "ownerName"];

export class MockOpportunityRepository implements IOpportunityRepository {
  async list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>> {
    return delay(applyListQuery(db.opportunities.getAll(), query, SEARCHABLE));
  }

  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    const opp: Opportunity = { id: mockId("O"), ...input };
    db.opportunities.add(opp);
    return delay(opp);
  }
}
