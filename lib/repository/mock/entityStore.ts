import { ID } from "../../types/common";

/**
 * A tiny observable in-memory table. This is the ONLY piece of state that
 * makes the mock feel like a shared backend rather than per-component
 * `useState` — every hook subscribed to a store re-renders the instant any
 * other part of the app mutates it (e.g. creating a Lead updates the
 * Dashboard, the Leads list and the Pipeline board at once).
 *
 * This is intentionally framework-light: it implements the subscribe/
 * getSnapshot contract React's built-in `useSyncExternalStore` expects,
 * so no extra state-management dependency is required.
 *
 * THIS FILE IS MOCK-ONLY. It has no equivalent when the real API is wired
 * in — at that point, hooks call the repository directly and rely on
 * normal fetch/response cycles (optionally revalidated with whatever
 * data-fetching approach the team standardizes on, e.g. SWR/React Query).
 */
export class EntityStore<T extends { id: ID }> {
  private rows: T[];
  private listeners = new Set<() => void>();

  constructor(seed: T[]) {
    this.rows = [...seed];
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): T[] => {
    return this.rows;
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }

  getAll(): T[] {
    return this.rows;
  }

  getById(id: ID): T | undefined {
    return this.rows.find((r) => r.id === id);
  }

  add(row: T): T {
    this.rows = [row, ...this.rows];
    this.emit();
    return row;
  }

  update(id: ID, patch: Partial<T>): T | undefined {
    let updated: T | undefined;
    this.rows = this.rows.map((r) => {
      if (r.id === id) {
        updated = { ...r, ...patch };
        return updated;
      }
      return r;
    });
    if (updated) this.emit();
    return updated;
  }

  remove(id: ID): void {
    this.rows = this.rows.filter((r) => r.id !== id);
    this.emit();
  }
}

let counter = 1000;
/** Deterministic-ish unique id generator for the mock layer only. */
export function mockId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}
