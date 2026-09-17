import { ID, ListQuery, Page } from "../../types/common";
import { Activity } from "../../types/domain";
import { IActivityRepository, CreateActivityInput } from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Activity)[] = ["relatedName", "note", "ownerName", "type"];

export class MockActivityRepository implements IActivityRepository {
  async list(query?: ListQuery): Promise<Page<Activity>> {
    const sorted = [...db.activities.getAll()].sort((a, b) =>
      a.occurredAt < b.occurredAt ? 1 : -1
    );
    return delay(applyListQuery(sorted, query as any, SEARCHABLE));
  }

  async create(input: CreateActivityInput): Promise<Activity> {
    const activity: Activity = {
      id: mockId("A"),
      ...input,
      occurredAt: new Date().toISOString(),
    };
    db.activities.add(activity);
    return delay(activity);
  }

  async listByRelated(relatedId: ID): Promise<Activity[]> {
    const rows = db.activities
      .getAll()
      .filter((a) => a.relatedId === relatedId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    return delay(rows);
  }
}
