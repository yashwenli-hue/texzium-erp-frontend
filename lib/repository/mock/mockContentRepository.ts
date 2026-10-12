import {
  CONTENT_KIND_META,
  ContentAccessUrl,
  ContentAsset,
  ContentAssetDetail,
  ContentFileVersion,
  ContentListFilters,
  ContentShare,
  ContentShareInput,
  ContentShareResult,
  ContentUpdateInput,
  ContentUploadInput,
} from "../../types/domain";
import { ID } from "../../types/common";
import { IContentRepository } from "../interfaces";
import { ApiError } from "../../api/httpClient";
import { db } from "./db";
import { recordMockCustomerEvent } from "./customerRules";
import { delay } from "./queryUtils";

// Mock-mode content library, in memory (files are kept as browser object URLs). It
// follows the backend's rules: the kind must match the file, the size limits, versions
// that never change, archived content can't be shared, inactive records are refused.
type Stored = { asset: ContentAssetDetail; urls: Map<number, string>; shares: ContentShare[] };
const library = new Map<ID, Stored>();
let seq = 0;
const nextId = (prefix: string) => `${prefix}-mock-${++seq}`;
const now = () => new Date().toISOString();
const YOU = { id: "U-mock", fullName: "You" };

function check(kind: ContentUploadInput["kind"], file: File) {
  const meta = CONTENT_KIND_META[kind];
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!meta.extensions.includes(ext)) throw new ApiError(`A ${meta.label.toLowerCase()} must be ${meta.formats.split(",")[0]}.`, 415);
  if (file.size > meta.maxBytes) throw new ApiError(`This file is too large: ${meta.formats}.`, 413);
}

function version(file: File, n: number): ContentFileVersion {
  return { id: nextId("F"), version: n, originalName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, width: null, height: null, metadataRemoved: [], uploadedBy: YOU, createdAt: now() };
}

function summary(s: Stored): ContentAssetDetail {
  return structuredClone({ ...s.asset, currentVersion: s.asset.versions[0] ?? null, versionCount: s.asset.versions.length, shareCount: s.shares.length });
}

function get(id: ID): Stored {
  const s = library.get(id);
  if (!s) throw new ApiError("Content not found.", 404);
  return s;
}

export class MockContentRepository implements IContentRepository {
  async list(filters: ContentListFilters = {}): Promise<ContentAsset[]> {
    const q = filters.q?.trim().toLowerCase();
    const rows = [...library.values()]
      .map(summary)
      .filter((a) => (filters.status ?? "ACTIVE") === "ALL" || a.status === (filters.status ?? "ACTIVE"))
      .filter((a) => !filters.kind || a.kind === filters.kind)
      .filter((a) => !filters.tag || a.tags.includes(filters.tag.toLowerCase()))
      .filter((a) => !q || a.title.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q) || a.tags.includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return delay(rows);
  }

  async get(id: ID): Promise<ContentAssetDetail> {
    return delay(summary(get(id)));
  }

  async create(input: ContentUploadInput, file: File, onProgress?: (fraction: number) => void): Promise<ContentAssetDetail> {
    check(input.kind, file);
    onProgress?.(1);
    const v = version(file, 1);
    const asset: ContentAssetDetail = {
      id: nextId("C"), title: input.title.trim(), description: input.description?.trim() || null, kind: input.kind,
      tags: [...new Set((input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean))], inventoryItem: null,
      status: "ACTIVE", archivedAt: null, archiveReason: null, archivedBy: null, createdBy: YOU, updatedBy: YOU,
      createdAt: now(), updatedAt: now(), currentVersion: v, versionCount: 1, shareCount: 0, versions: [v],
    };
    library.set(asset.id, { asset, urls: new Map([[1, URL.createObjectURL(file)]]), shares: [] });
    return this.get(asset.id);
  }

  async update(id: ID, input: ContentUpdateInput): Promise<ContentAssetDetail> {
    const s = get(id);
    if (s.asset.status !== "ACTIVE") throw new ApiError("This content is archived. Restore it first.", 409);
    if (input.title !== undefined) s.asset.title = input.title.trim();
    if (input.description !== undefined) s.asset.description = input.description?.trim() || null;
    if (input.tags !== undefined) s.asset.tags = [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    s.asset.updatedAt = now();
    return this.get(id);
  }

  async addVersion(id: ID, file: File, onProgress?: (fraction: number) => void): Promise<ContentAssetDetail> {
    const s = get(id);
    if (s.asset.status !== "ACTIVE") throw new ApiError("This content is archived. Restore it first.", 409);
    check(s.asset.kind, file);
    onProgress?.(1);
    const v = version(file, s.asset.versions.length + 1);
    s.asset.versions.unshift(v);
    s.urls.set(v.version, URL.createObjectURL(file));
    s.asset.updatedAt = now();
    return this.get(id);
  }

  async archive(id: ID, reason: string): Promise<ContentAssetDetail> {
    const s = get(id);
    if (s.asset.status === "ARCHIVED") throw new ApiError("This content is already archived.", 409);
    Object.assign(s.asset, { status: "ARCHIVED", archivedAt: now(), archiveReason: reason, archivedBy: YOU });
    return this.get(id);
  }

  async restore(id: ID): Promise<ContentAssetDetail> {
    const s = get(id);
    if (s.asset.status === "ACTIVE") throw new ApiError("This content is not archived.", 409);
    Object.assign(s.asset, { status: "ACTIVE", archivedAt: null, archiveReason: null, archivedBy: null });
    return this.get(id);
  }

  async accessUrl(id: ID, _disposition: "inline" | "attachment", versionNo?: number): Promise<ContentAccessUrl> {
    const s = get(id);
    const v = versionNo ? s.asset.versions.find((x) => x.version === versionNo) : s.asset.versions[0];
    if (!v) throw new ApiError("That version does not exist.", 404);
    return delay({ url: s.urls.get(v.version) ?? "", expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), fileId: v.id, version: v.version, mimeType: v.mimeType, fileName: v.originalName });
  }

  async share(id: ID, input: ContentShareInput): Promise<ContentShareResult> {
    const s = get(id);
    if (s.asset.status !== "ACTIVE") throw new ApiError("Archived content can’t be shared. Restore it first.", 409);
    const v = s.asset.versions[0];
    let lead: ContentShare["lead"] = null;
    let opportunity: ContentShare["opportunity"] = null;
    let customer: ContentShare["customer"] = null;
    if (input.targetType === "LEAD" || input.targetType === "OPPORTUNITY") {
      const opp = input.targetType === "OPPORTUNITY" ? db.opportunities.getById(input.targetId) : undefined;
      if (input.targetType === "OPPORTUNITY" && !opp) throw new ApiError("Opportunity not found.", 404);
      const l = db.leads.getById(opp ? opp.leadId : input.targetId);
      if (!l) throw new ApiError("Lead not found.", 404);
      if (l.isActive === false) throw new ApiError("This lead is inactive. Reactivate it before sharing content with it.", 409);
      lead = { id: l.id, customerName: l.customerName, leadCode: null };
      if (opp) opportunity = { id: opp.id, title: opp.title };
      db.leadTimeline.add({ source: "SYSTEM", id: nextId("T"), leadId: l.id, icon: "share", title: "Content Shared", detail: `Shared “${s.asset.title}” (version ${v.version}).`, actorName: "You", occurredAt: now() });
    } else {
      const c = db.customers.getById(input.targetId);
      if (!c) throw new ApiError("Customer not found.", 404);
      if (!c.isActive) throw new ApiError("This customer is inactive. Reactivate it before sharing content with it.", 409);
      customer = { id: c.id, customerName: c.customerName, customerCode: c.customerCode };
      recordMockCustomerEvent({ customerId: c.id, action: "CONTENT_SHARED", remarks: `Shared “${s.asset.title}” (version ${v.version}).` });
    }
    const share: ContentShare = {
      id: nextId("S"), assetId: id, fileId: v.id, version: v.version, targetType: input.targetType, lead, opportunity, customer,
      channel: input.channel, recipientName: input.recipientName ?? null, recipientPhone: input.recipientPhone ?? null, message: input.message ?? null,
      actor: YOU, createdAt: now(),
    };
    s.shares.unshift(share);
    return { ...share, download: await this.accessUrl(id, "attachment", v.version) };
  }

  async listShares(id: ID): Promise<ContentShare[]> {
    return delay(structuredClone(get(id).shares));
  }
}
