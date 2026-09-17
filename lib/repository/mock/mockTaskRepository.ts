import { ID, ListQuery, Page } from "../../types/common";
import { Task } from "../../types/domain";
import { ITaskRepository, CreateTaskInput, TaskSortField } from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Task)[] = ["title", "linkedName", "assigneeName"];

export class MockTaskRepository implements ITaskRepository {
  async list(query?: ListQuery<TaskSortField>): Promise<Page<Task>> {
    return delay(applyListQuery(db.tasks.getAll(), query, SEARCHABLE));
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const task: Task = {
      id: mockId("TK"),
      ...input,
      done: false,
      createdAt: new Date().toISOString(),
    };
    db.tasks.add(task);
    return delay(task);
  }

  async setDone(id: ID, done: boolean): Promise<Task> {
    const updated = db.tasks.update(id, { done });
    if (!updated) throw new Error(`Task ${id} not found`);
    return delay(updated);
  }
}
