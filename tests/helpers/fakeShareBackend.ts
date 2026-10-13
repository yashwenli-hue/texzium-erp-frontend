import { ApiError } from "../../lib/api/httpClient";
import type { ContentAccessUrl, ContentShare, ContentShareInput, ContentShareResult } from "../../lib/types/domain";
import type { ShareBatchApi } from "../../lib/content/shareBatch";

/**
 * A stand-in for POST /content-assets/:id/shares and GET /content-assets/:id/shares with the
 * backend's semantics: a share and its lead-history entry are written together or not at all.
 * Faults can be planned per call: refuse with a status, or commit and then lose the answer.
 */
type Fault = { kind: "refuse"; status: number; message: string } | { kind: "commit-then-drop" } | { kind: "drop-before-commit" } | { kind: "history-down" };

export function fakeShareBackend(opts: { actorId?: string } = {}) {
  const shares: ContentShare[] = [];
  const timeline: Array<{ leadId: string; action: string; remarks: string; actorId: string | null }> = [];
  const faults = new Map<string, Fault[]>();
  const sent: string[] = [];
  let historyDown = false;
  let n = 0;

  const plan = (assetId: string, ...f: Fault[]) => faults.set(assetId, [...(faults.get(assetId) ?? []), ...f]);
  const access = (assetId: string, version: number): ContentAccessUrl => ({
    url: `/api/backend/content-files/${assetId}-v${version}?sig=test`, expiresAt: new Date(Date.now() + 900_000).toISOString(),
    fileId: `${assetId}-v${version}`, version, mimeType: "application/octet-stream", fileName: `${assetId}-v${version}.bin`,
  });

  const api: ShareBatchApi = {
    async share(assetId: string, input: ContentShareInput): Promise<ContentShareResult> {
      sent.push(assetId);
      const fault = faults.get(assetId)?.shift();
      if (fault?.kind === "refuse") throw new ApiError(fault.message, fault.status);
      if (fault?.kind === "drop-before-commit") throw new ApiError("Could not reach the RevenueOS backend. Check your connection and try again.", 0);
      const share: ContentShare = {
        id: `s${++n}`, assetId, fileId: `${assetId}-v1`, version: 1, targetType: input.targetType,
        lead: input.targetType === "LEAD" ? { id: input.targetId, customerName: "Testing Lead", leadCode: null } : null,
        opportunity: input.targetType === "OPPORTUNITY" ? { id: input.targetId, title: "Opp" } : null,
        customer: input.targetType === "CUSTOMER" ? { id: input.targetId, customerName: "Cust", customerCode: "C1" } : null,
        channel: input.channel, recipientName: input.recipientName ?? null, recipientPhone: input.recipientPhone ?? null, message: input.message ?? null,
        actor: opts.actorId ? { id: opts.actorId, fullName: "You" } : null, createdAt: new Date().toISOString(),
      };
      // one transaction: the share and its history entry
      shares.push(share);
      if (input.targetType === "LEAD") timeline.push({ leadId: input.targetId, action: "CONTENT_SHARED", remarks: `Shared ${assetId} (version 1).`, actorId: opts.actorId ?? null });
      if (fault?.kind === "commit-then-drop") throw new TypeError("network connection was lost");
      return { ...share, download: access(assetId, 1) };
    },
    async listShares(assetId: string) {
      if (historyDown) throw new ApiError("Could not reach the RevenueOS backend. Check your connection and try again.", 0);
      return shares.filter((s) => s.assetId === assetId).reverse();
    },
    async accessUrl(assetId: string, _d: "attachment", version: number) {
      return access(assetId, version);
    },
  };
  return { api, shares, timeline, sent, plan, setHistoryDown: (v: boolean) => (historyDown = v) };
}
