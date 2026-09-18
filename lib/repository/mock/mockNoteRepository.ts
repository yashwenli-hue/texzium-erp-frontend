import { ID, ListQuery, Page } from "../../types/common";
import { Note } from "../../types/domain";
import { INoteRepository, CreateNoteInput, UpdateNoteInput } from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Note)[] = ["text", "linkedName", "authorName"];

export class MockNoteRepository implements INoteRepository {
  async list(query?: ListQuery): Promise<Page<Note>> {
    const sorted = [...db.notes.getAll()].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
    return delay(applyListQuery(sorted, query as any, SEARCHABLE));
  }

  async create(input: CreateNoteInput): Promise<Note> {
    const note: Note = {
      id: mockId("N"),
      ...input,
      pinned: input.pinned ?? false,
      createdAt: new Date().toISOString(),
    };
    db.notes.add(note);
    return delay(note);
  }

  async update(id: ID, input: UpdateNoteInput): Promise<Note> {
    const updated = db.notes.update(id, input);
    if (!updated) throw new Error(`Note ${id} not found`);
    return delay(updated);
  }

  async listByRelated(linkedId: ID): Promise<Note[]> {
    return delay(db.notes.getAll().filter((n) => n.linkedId === linkedId));
  }
}
