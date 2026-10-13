import { ApiError } from "../api/httpClient";
import { ContentAccessUrl, ContentAsset, ContentShare, ContentShareInput, ContentShareResult } from "../types/domain";

/**
 * Recording a share of several library items with one lead, opportunity or customer.
 *
 * The backend records one item per request (POST /content-assets/:id/shares): the share and
 * its history entry are written in one transaction, so each item is either fully recorded or
 * not at all. There is no batch endpoint, so a selection of several items is several requests,
 * one after the other, and some can succeed while others fail. This module keeps an exact
 * account per item and makes retrying safe:
 *
 *  - an item already recorded is never sent again;
 *  - a refusal from the backend (a 4xx answer) means nothing was recorded for that item;
 *  - any other failure (no answer, a lost connection, a 5xx) may have been recorded, so the
 *    item's share history is read back and the share is looked for (same target, channel,
 *    message and person, since the batch started), and looked for again before every retry
 *    (the server may still have been working on it the first time). If the history can't be
 *    read, the item is left "unconfirmed" and is not re-sent until it can.
 *  - 401 and 403 stop the batch: they would refuse every remaining item.
 */

export interface ShareBatchApi {
  share(assetId: string, input: ContentShareInput): Promise<ContentShareResult>;
  listShares(assetId: string): Promise<ContentShare[]>;
  accessUrl(assetId: string, disposition: "attachment", version: number): Promise<ContentAccessUrl>;
}

export type ShareItemState =
  | { status: "pending" }
  | { status: "sharing" }
  /** Recorded. `recovered`: found in the item's history after an uncertain failure. */
  | { status: "shared"; share: ContentShare; download: ContentAccessUrl | null; recovered: boolean }
  /** Not recorded. `refused`: the backend answered no (4xx); otherwise no clear answer came and the history showed no share. */
  | { status: "failed"; message: string; refused: boolean }
  /** It may or may not have been recorded; the history could not be checked. Never re-sent blindly. */
  | { status: "unconfirmed"; message: string }
  /** Not attempted: an earlier refusal (sign-in or permission) applies to it too. */
  | { status: "not-attempted"; message: string };

export type ShareBatchState = Record<string, ShareItemState>;

export interface ShareBatchOptions {
  /** When this run of the batch (its first attempt) started, in ms. Shares found in history must be newer. */
  startedAt: number;
  /** The signed-in person; a share found in history must be theirs. */
  actorId?: string | null;
  /** The states from an earlier attempt: shared items are kept, the others are tried again. */
  previous?: ShareBatchState;
  /** Called after every change, with a fresh copy of the states. */
  onUpdate?: (state: ShareBatchState) => void;
}

// A share's createdAt comes from the server clock; allow for it differing from this one.
const CLOCK_SKEW_MS = 5 * 60_000;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** A 4xx answer is the backend refusing the request: its transaction did not commit. */
function isRefusal(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status >= 400 && err.status < 500;
}

function stopsTheBatch(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

/** Whether a recorded share is the one this batch sent for this item. */
export function matchesShare(share: ContentShare, input: ContentShareInput, opts: { startedAt: number; actorId?: string | null }): boolean {
  const target =
    input.targetType === "LEAD" ? share.lead?.id : input.targetType === "OPPORTUNITY" ? share.opportunity?.id : share.customer?.id;
  return (
    share.targetType === input.targetType &&
    target === input.targetId &&
    share.channel === input.channel &&
    (share.message ?? "") === (input.message ?? "") &&
    (!opts.actorId || share.actor?.id === opts.actorId) &&
    new Date(share.createdAt).getTime() >= opts.startedAt - CLOCK_SKEW_MS
  );
}

/** Looks for this batch's share of an item in the item's history. null: not there; throws if the history can't be read. */
async function findRecorded(api: ShareBatchApi, assetId: string, input: ContentShareInput, opts: ShareBatchOptions): Promise<ShareItemState | null> {
  const shares = await api.listShares(assetId);
  const found = shares.find((s) => matchesShare(s, input, opts));
  if (!found) return null;
  let download: ContentAccessUrl | null = null;
  try {
    download = await api.accessUrl(assetId, "attachment", found.version);
  } catch {
    download = null; // recorded all the same; the file can be downloaded from the library
  }
  return { status: "shared", share: found, download, recovered: true };
}

export async function runShareBatch(api: ShareBatchApi, assets: readonly ContentAsset[], input: ContentShareInput, opts: ShareBatchOptions): Promise<ShareBatchState> {
  const state: ShareBatchState = {};
  for (const a of assets) {
    const before = opts.previous?.[a.id];
    state[a.id] = before?.status === "shared" ? before : { status: "pending" };
  }
  const emit = () => opts.onUpdate?.({ ...state });
  emit();

  let stop: string | null = null;
  for (const a of assets) {
    const before = opts.previous?.[a.id];
    if (state[a.id].status === "shared") continue;
    if (stop) {
      state[a.id] = { status: "not-attempted", message: stop };
      continue;
    }
    state[a.id] = { status: "sharing" };
    emit();

    // An earlier attempt may have been recorded without an answer: look before sending again.
    if (before?.status === "unconfirmed" || (before?.status === "failed" && !before.refused)) {
      try {
        const found = await findRecorded(api, a.id, input, opts);
        if (found) {
          state[a.id] = found;
          emit();
          continue;
        }
      } catch (err) {
        state[a.id] = { status: "unconfirmed", message: `Couldn't check whether it was recorded: ${errorMessage(err, "the history couldn't be read")}` };
        emit();
        continue;
      }
    }

    try {
      const result = await api.share(a.id, input);
      const { download, ...share } = result;
      state[a.id] = { status: "shared", share, download, recovered: false };
    } catch (err) {
      if (isRefusal(err)) {
        state[a.id] = { status: "failed", message: errorMessage(err, "The share couldn't be recorded."), refused: true };
        if (stopsTheBatch(err)) stop = errorMessage(err, "Not attempted.");
      } else {
        // No clear answer: it may have been recorded. Check the item's history now.
        try {
          const found = await findRecorded(api, a.id, input, opts);
          state[a.id] = found ?? { status: "failed", message: errorMessage(err, "The share couldn't be recorded."), refused: false };
        } catch {
          state[a.id] = {
            status: "unconfirmed",
            message: `${errorMessage(err, "No answer from the server.")} It may have been recorded; it will be checked before it is tried again.`,
          };
        }
      }
    }
    emit();
  }
  emit();
  return state;
}

export function countBy(state: ShareBatchState) {
  const all = Object.values(state);
  return {
    shared: all.filter((s) => s.status === "shared").length,
    notShared: all.filter((s) => s.status === "failed" || s.status === "not-attempted").length,
    unconfirmed: all.filter((s) => s.status === "unconfirmed").length,
    total: all.length,
  };
}
