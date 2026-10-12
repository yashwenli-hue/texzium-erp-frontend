import {
  ContentAccessUrl,
  ContentAsset,
  ContentAssetDetail,
  ContentListFilters,
  ContentShare,
  ContentShareInput,
  ContentShareResult,
  ContentUpdateInput,
  ContentUploadInput,
} from "../../types/domain";
import { ID } from "../../types/common";
import { IContentRepository } from "../interfaces";
import { ApiError, apiFetch, apiPutBinary, backendUrl } from "../../api/httpClient";

/**
 * VERIFIED (backend 2026-10-18): /content-assets and the signed /content-files route.
 * The backend checks every file by its content (and removes location data), so the
 * client-side checks in the upload dialog are only a convenience; the backend's answer
 * wins. Signed URLs come back as backend paths and are turned into frontend paths here.
 */
export class RealContentRepository implements IContentRepository {
  private async call<T>(path: string, init: Parameters<typeof apiFetch>[1], forbidden: string): Promise<T> {
    try {
      return await apiFetch<T>(path, init);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw new ApiError(forbidden, 403, err.details);
      throw err;
    }
  }

  list(filters: ContentListFilters = {}): Promise<ContentAsset[]> {
    const q = new URLSearchParams();
    if (filters.kind) q.set("kind", filters.kind);
    if (filters.status) q.set("status", filters.status);
    if (filters.q?.trim()) q.set("q", filters.q.trim());
    if (filters.tag?.trim()) q.set("tag", filters.tag.trim());
    const qs = q.toString();
    return this.call(`/content-assets${qs ? `?${qs}` : ""}`, {}, "You don't have permission to view sales content.");
  }

  get(id: ID): Promise<ContentAssetDetail> {
    return this.call(`/content-assets/${encodeURIComponent(id)}`, {}, "You don't have permission to view sales content.");
  }

  async create(input: ContentUploadInput, file: File, onProgress?: (fraction: number) => void): Promise<ContentAssetDetail> {
    const uploadId = await this.uploadInPieces(file, onProgress);
    return this.call(
      "/content-assets",
      {
        method: "POST",
        body: {
          title: input.title,
          kind: input.kind,
          ...(input.description?.trim() ? { description: input.description.trim() } : {}),
          ...(input.tags?.length ? { tags: input.tags.join(",") } : {}),
          ...(input.inventoryItemId ? { inventoryItemId: input.inventoryItemId } : {}),
          uploadId,
        },
      },
      "You don't have permission to manage sales content."
    );
  }

  async addVersion(id: ID, file: File, onProgress?: (fraction: number) => void): Promise<ContentAssetDetail> {
    const uploadId = await this.uploadInPieces(file, onProgress);
    return this.call(`/content-assets/${encodeURIComponent(id)}/versions`, { method: "POST", body: { uploadId } }, "You don't have permission to manage sales content.");
  }

  update(id: ID, input: ContentUpdateInput): Promise<ContentAssetDetail> {
    return this.call(`/content-assets/${encodeURIComponent(id)}`, { method: "PATCH", body: input }, "You don't have permission to manage sales content.");
  }

  archive(id: ID, reason: string): Promise<ContentAssetDetail> {
    return this.call(`/content-assets/${encodeURIComponent(id)}/archive`, { method: "POST", body: { reason } }, "You don't have permission to manage sales content.");
  }

  restore(id: ID): Promise<ContentAssetDetail> {
    return this.call(`/content-assets/${encodeURIComponent(id)}/restore`, { method: "POST" }, "You don't have permission to manage sales content.");
  }

  async accessUrl(id: ID, disposition: "inline" | "attachment", version?: number): Promise<ContentAccessUrl> {
    const raw = await this.call<ContentAccessUrl>(
      `/content-assets/${encodeURIComponent(id)}/access-url`,
      { method: "POST", body: { disposition, ...(version ? { version } : {}) } },
      "You don't have permission to view sales content.",
    );
    return { ...raw, url: backendUrl(raw.url) };
  }

  async share(id: ID, input: ContentShareInput): Promise<ContentShareResult> {
    const raw = await this.call<ContentShareResult>(
      `/content-assets/${encodeURIComponent(id)}/shares`,
      { method: "POST", body: input },
      "You don't have permission to share sales content.",
    );
    return { ...raw, download: { ...raw.download, url: backendUrl(raw.download.url) } };
  }

  listShares(id: ID): Promise<ContentShare[]> {
    return this.call(`/content-assets/${encodeURIComponent(id)}/shares`, {}, "You don't have permission to view sales content.");
  }

  /**
   * Uploads a file in pieces of at most 4 MB (POST /content-uploads, then PUT each piece at
   * its offset). One request for a whole video can outlast the servers' 5-minute request
   * limit on a slow connection; a piece takes seconds. A piece that fails on the network
   * is sent again (up to 4 times, waiting longer each time); when the backend says the
   * upload continues elsewhere (409 with the offset it expects), it resumes from there.
   * On failure the upload is cancelled so nothing is left behind. Returns the upload id.
   */
  private async uploadInPieces(file: File, onProgress?: (fraction: number) => void): Promise<string> {
    const started = await this.call<{ id: string; chunkBytes: number }>(
      "/content-uploads",
      { method: "POST", body: { fileName: file.name, sizeBytes: file.size } },
      "You don't have permission to manage sales content."
    );
    let offset = 0;
    try {
      while (offset < file.size) {
        const piece = file.slice(offset, offset + started.chunkBytes);
        for (let attempt = 1; ; attempt++) {
          try {
            const at = offset;
            const r = await apiPutBinary<{ received: number }>(`/content-uploads/${started.id}/chunks?offset=${at}`, piece, (f) =>
              onProgress?.(Math.min(1, (at + f * piece.size) / file.size))
            );
            offset = r.received;
            break;
          } catch (err) {
            const expected = err instanceof ApiError && err.status === 409 ? (err.details as { received?: unknown } | undefined)?.received : undefined;
            if (typeof expected === "number") {
              offset = expected;
              break;
            }
            const retryable = err instanceof ApiError && (err.status === 0 || err.status === 408 || err.status === 429 || err.status >= 500);
            if (!retryable) throw err;
            if (attempt >= 4) throw new ApiError("The upload was interrupted: the connection to RevenueOS was lost several times. Check the connection and try again.", 0);
            await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
          }
        }
      }
      onProgress?.(1);
      return started.id;
    } catch (err) {
      void apiFetch(`/content-uploads/${started.id}`, { method: "DELETE" }).catch(() => undefined);
      throw err;
    }
  }
}
