import {
  DeleteRecordInput,
  DeletionBlockedError,
  DeletionBlocker,
  DeletionEntityType,
  DeletionResult,
  DeletionStaleError,
  PurgeResult,
  RecoveryClosedError,
  RestoreBlockedError,
  RestoreConflict,
  RestoreResult,
  RestoreStaleError,
} from "../repository/shared/dataDeletion";
import { IDataDeletionRepository } from "../repository/interfaces";
import { SingleFlight } from "./singleFlight";

/**
 * What one press of the confirm button comes to, as plain data for the dialogs. The press
 * runs through a SingleFlight, so a second activation while the first is still running is
 * ignored and the server is asked once. "done" only ever follows a server that said yes: a
 * success message is shown after it and never before.
 */
export type DeleteOutcome =
  | { kind: "ignored" }
  | { kind: "done"; result: DeletionResult }
  | { kind: "stale"; message: string }
  | { kind: "blocked"; message: string; blockers: DeletionBlocker[] }
  | { kind: "error"; message: string };

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export async function submitDeletion(
  repo: Pick<IDataDeletionRepository, "delete">,
  flight: SingleFlight,
  entityType: DeletionEntityType,
  id: string,
  input: DeleteRecordInput
): Promise<DeleteOutcome> {
  const ran = await flight.run(async (): Promise<DeleteOutcome> => {
    try {
      return { kind: "done", result: await repo.delete(entityType, id, input) };
    } catch (err) {
      if (err instanceof DeletionStaleError) return { kind: "stale", message: err.message };
      if (err instanceof DeletionBlockedError) return { kind: "blocked", message: err.message, blockers: err.blockers };
      return { kind: "error", message: messageOf(err, "Could not delete this record. Please try again.") };
    }
  });
  return ran ?? { kind: "ignored" };
}

export type RestoreOutcome =
  | { kind: "ignored" }
  | { kind: "done"; result: RestoreResult }
  | { kind: "stale"; message: string }
  | { kind: "blocked"; message: string; conflicts: RestoreConflict[] }
  | { kind: "closed"; code: RecoveryClosedError["code"]; message: string }
  | { kind: "error"; message: string };

export async function submitRestore(
  repo: Pick<IDataDeletionRepository, "restore">,
  flight: SingleFlight,
  recordId: string,
  version: string
): Promise<RestoreOutcome> {
  const ran = await flight.run(async (): Promise<RestoreOutcome> => {
    try {
      return { kind: "done", result: await repo.restore(recordId, version) };
    } catch (err) {
      if (err instanceof RestoreStaleError) return { kind: "stale", message: err.message };
      if (err instanceof RestoreBlockedError) return { kind: "blocked", message: err.message, conflicts: err.conflicts };
      if (err instanceof RecoveryClosedError) return { kind: "closed", code: err.code, message: err.message };
      return { kind: "error", message: messageOf(err, "Could not restore this record. Please try again.") };
    }
  });
  return ran ?? { kind: "ignored" };
}

/** Whether the confirm button of the delete dialog may be pressed. */
export function canConfirmDelete(s: {
  eligible: boolean;
  reasonCode: string;
  reasonProblem: string | null;
  typedOk: boolean;
  submitting: boolean;
  stale: boolean;
}): boolean {
  return s.eligible && !!s.reasonCode && s.reasonProblem === null && s.typedOk && !s.submitting && !s.stale;
}

export type PurgeOutcome =
  | { kind: "ignored" }
  | { kind: "done"; result: PurgeResult }
  // already erased or restored by someone else: nothing was done by this request
  | { kind: "closed"; code: RecoveryClosedError["code"]; message: string }
  | { kind: "error"; message: string };

/**
 * One press of "Erase permanently". It runs through a SingleFlight, so a second activation while
 * the first is running is ignored and the server is asked once. The server is the authority: it
 * refuses (409) a record that was restored or erased in the meantime.
 */
export async function submitPurge(repo: Pick<IDataDeletionRepository, "purge">, flight: SingleFlight, recordId: string): Promise<PurgeOutcome> {
  const ran = await flight.run(async (): Promise<PurgeOutcome> => {
    try {
      return { kind: "done", result: await repo.purge(recordId) };
    } catch (err) {
      if (err instanceof RecoveryClosedError) return { kind: "closed", code: err.code, message: err.message };
      return { kind: "error", message: messageOf(err, "Could not erase this record. Please try again.") };
    }
  });
  return ran ?? { kind: "ignored" };
}

/**
 * Whether "Erase permanently" may be pressed: the person ticked that they understand it is
 * irreversible AND typed the record's name, whether or not its recovery window is still open
 * (an erase is never one click). Nothing is pressable while a request is running.
 */
export function canConfirmPurge(s: { acknowledged: boolean; typedOk: boolean; submitting: boolean }): boolean {
  return s.acknowledged && s.typedOk && !s.submitting;
}
