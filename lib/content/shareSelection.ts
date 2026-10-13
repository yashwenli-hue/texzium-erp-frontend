import { CONTENT_KIND_META, ContentAsset, ContentKind } from "../types/domain";

/**
 * What the Share content dialog has chosen to share, kept apart from the dialog so it can be
 * tested on its own. A selection is a list of library items in the order they were picked; an
 * item appears at most once (the backend always shares an item's current version, so the item
 * is the unit, and its version is shown so the person sees exactly what goes out).
 */

/** The key an item is selected by: one entry per item and version. */
export function selectionKey(asset: ContentAsset): string {
  return `${asset.id}@${asset.currentVersion?.version ?? 0}`;
}

export function isSelected(selection: readonly ContentAsset[], asset: ContentAsset): boolean {
  return selection.some((s) => s.id === asset.id);
}

/** Picks an item, or unpicks it if it is already picked. Never adds the same item twice. */
export function toggleSelection(selection: readonly ContentAsset[], asset: ContentAsset): ContentAsset[] {
  return isSelected(selection, asset) ? selection.filter((s) => s.id !== asset.id) : [...selection, asset];
}

export function removeFromSelection(selection: readonly ContentAsset[], assetId: string): ContentAsset[] {
  return selection.filter((s) => s.id !== assetId);
}

/** The items the search and the kind filter leave in the list. The selection is not affected by either. */
export function filterContent(items: readonly ContentAsset[], term: string, kind: ContentKind | "ALL"): ContentAsset[] {
  const q = term.trim().toLowerCase();
  return items.filter(
    (a) =>
      (kind === "ALL" || a.kind === kind) &&
      (!q || a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)) || (a.description ?? "").toLowerCase().includes(q))
  );
}

function describe(asset: ContentAsset): string {
  return `${CONTENT_KIND_META[asset.kind].label.toLowerCase()} “${asset.title}”`;
}

/**
 * The message suggested for the WhatsApp chat (and recorded with each share).
 * One item reads as before: Hello Asha, please find our video “Loom 10/27G”.
 */
export function suggestedShareMessage(recipient: string, selection: readonly ContentAsset[]): string {
  if (selection.length === 0) return "";
  const parts = selection.map(describe);
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `Hello ${recipient}, please find our ${list}.`;
}

/** The file the person will download for an item, for the preview: the stored name of its current version. */
export function selectionFileName(asset: ContentAsset): string | null {
  return asset.currentVersion?.originalName ?? null;
}

/**
 * Which share actions are open for a selection, the same rules for one item or many: nothing is
 * shared without a selection or without the share permission, and WhatsApp needs a usable number.
 * More than one item is confirmed first, since each item becomes its own permanent share.
 */
export function shareActionState({ count, canShare, whatsappOk }: { count: number; canShare: boolean; whatsappOk: boolean }) {
  return {
    downloadDisabled: count === 0 || !canShare,
    whatsappDisabled: count === 0 || !canShare || !whatsappOk,
    needsConfirmation: count > 1,
    countLabel: count > 1 ? ` ${count}` : "",
  };
}
