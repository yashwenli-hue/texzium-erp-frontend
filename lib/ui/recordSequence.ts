import { readSessionValue, writeSessionValue } from "./sessionState";

/**
 * The list a record was opened from, so its page can offer "previous / next" in that same list
 * and a way back to it: work through a queue without returning to the list each time. Kept per
 * browser tab (sessionStorage) and per kind of record; a convenience only — a record that was not
 * opened from a remembered list simply has no neighbours. Only ids the list already showed are
 * kept: what the person may open is still decided by the backend.
 */
export interface RecordSequence {
  ids: string[];
  /** Where the list is, e.g. "/presales". */
  from: string;
  /** What the list is called, e.g. "Pre-Sales · Needs an owner". */
  label: string;
}

const KEY = (kind: string) => `revenueos.sequence.${kind}`;
const MAX = 200;

export function sanitizeSequence(raw: unknown): RecordSequence | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.ids) || typeof r.from !== "string" || typeof r.label !== "string") return null;
  if (!r.from.startsWith("/") || r.from.startsWith("//")) return null;
  const ids = r.ids.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 64).slice(0, MAX);
  return { ids, from: r.from, label: r.label.slice(0, 80) };
}

export function rememberSequence(kind: string, seq: RecordSequence): void {
  writeSessionValue(KEY(kind), { ...seq, ids: seq.ids.slice(0, MAX) });
}

export function readSequence(kind: string): RecordSequence | null {
  return readSessionValue(KEY(kind), sanitizeSequence);
}

export interface Neighbours {
  prev?: string;
  next?: string;
  position: number;
  total: number;
  from: string;
  label: string;
}

export function neighboursIn(seq: RecordSequence | null, id: string): Neighbours | null {
  if (!seq) return null;
  const at = seq.ids.indexOf(id);
  if (at < 0) return null;
  return { prev: seq.ids[at - 1], next: seq.ids[at + 1], position: at + 1, total: seq.ids.length, from: seq.from, label: seq.label };
}
