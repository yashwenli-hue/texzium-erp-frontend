import type { ContentAsset, ContentKind } from "../../lib/types/domain";

/** A library item as the backend lists it (only the fields the share dialog reads matter). */
export function asset(id: string, kind: ContentKind, title: string, opts: { version?: number; tags?: string[]; file?: string; size?: number } = {}): ContentAsset {
  const version = opts.version ?? 1;
  const ext = kind === "PHOTO" ? "jpg" : kind === "VIDEO" ? "mp4" : "pdf";
  return {
    id, title, kind, description: null, tags: opts.tags ?? [], inventoryItem: null, status: "ACTIVE",
    archivedAt: null, archiveReason: null, archivedBy: null, createdBy: null, updatedBy: null,
    createdAt: "2026-10-13T00:00:00.000Z", updatedAt: "2026-10-13T00:00:00.000Z",
    currentVersion: {
      id: `${id}-v${version}`, version, originalName: opts.file ?? `${id}.${ext}`, mimeType: kind === "PHOTO" ? "image/jpeg" : kind === "VIDEO" ? "video/mp4" : "application/pdf",
      sizeBytes: opts.size ?? 1_000_000, width: null, height: null, metadataRemoved: [], uploadedBy: null, createdAt: "2026-10-13T00:00:00.000Z",
    },
    versionCount: version, shareCount: 0,
  };
}

export const VIDEO = asset("a-video", "VIDEO", "Super High Speed Needle Loom 10/27G", { size: 121_810_610, file: "loom.mp4" });
export const PDF = asset("a-pdf", "CATALOGUE", "32/2 Braiding Machine", { tags: ["braiding"], file: "braiding.pdf" });
export const PHOTO = asset("a-photo", "PHOTO", "DH-4 Donghong Coiling Machine S2 Type", { tags: ["coiling"], file: "dh4.jpg" });
