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
import { ApiError, apiFetch, apiUpload, backendUrl } from "../../api/httpClient";

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
    const form = new FormData();
    form.append("title", input.title);
    form.append("kind", input.kind);
    if (input.description?.trim()) form.append("description", input.description.trim());
    if (input.tags?.length) form.append("tags", input.tags.join(","));
    if (input.inventoryItemId) form.append("inventoryItemId", input.inventoryItemId);
    form.append("file", file, file.name);
    return this.upload("/content-assets", form, onProgress);
  }

  addVersion(id: ID, file: File, onProgress?: (fraction: number) => void): Promise<ContentAssetDetail> {
    const form = new FormData();
    form.append("file", file, file.name);
    return this.upload(`/content-assets/${encodeURIComponent(id)}/versions`, form, onProgress);
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

  private async upload(path: string, form: FormData, onProgress?: (fraction: number) => void): Promise<ContentAssetDetail> {
    try {
      return await apiUpload<ContentAssetDetail>(path, form, onProgress);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw new ApiError("You don't have permission to manage sales content.", 403, err.details);
      throw err;
    }
  }
}
