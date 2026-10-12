"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Panel } from "../../../components/ui/Card";
import { Button, EmptyState } from "../../../components/ui/Button";
import { Tag } from "../../../components/ui/Tag";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { ContentKindBadge, ContentPreview, useContentDownload } from "../../../components/content/contentUi";
import { ContentEditDialog, ContentUploadDialog } from "../../../components/content/ContentUploadDialog";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { formatDate, formatDateTime } from "../../../lib/format";
import { ApiError } from "../../../lib/api/httpClient";
import { CONTENT_KIND_META, ContentAssetDetail, ContentShare, formatFileSize } from "../../../lib/types/domain";

const REMOVED_LABEL: Record<string, string> = {
  gps: "GPS location",
  exif: "unreadable EXIF",
  xmp: "XMP metadata",
  iptc: "IPTC metadata",
  "mp4-metadata": "video metadata",
};

function shareTarget(s: ContentShare): { label: string; href: string | null } {
  if (s.opportunity) return { label: `${s.opportunity.title} (opportunity)`, href: `/opportunities/${s.opportunity.id}` };
  if (s.lead) return { label: s.lead.customerName, href: `/leads/${s.lead.id}` };
  if (s.customer) return { label: `${s.customer.customerName} (${s.customer.customerCode})`, href: `/customers/${s.customer.id}` };
  return { label: "—", href: null };
}

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const repo = useRepository();
  const router = useRouter();
  const toast = useToast();
  const download = useContentDownload();
  const { hasPermission } = useAuth();
  const allowed = hasPermission("content.view");
  const canManage = hasPermission("content.manage");
  const [asset, setAsset] = useState<ContentAssetDetail | null>(null);
  const [shares, setShares] = useState<ContentShare[] | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [dialog, setDialog] = useState<"version" | "edit" | "archive" | "restore" | null>(null);

  const load = useCallback(() => {
    setError(null);
    repo.content
      .get(id)
      .then(setAsset)
      .catch((err) => setError({ message: err instanceof Error ? err.message : "This content couldn't be loaded.", notFound: err instanceof ApiError && err.status === 404 }));
    repo.content.listShares(id).then(setShares).catch(() => setShares([]));
  }, [repo, id]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const startDownload = async (version?: number) => {
    try {
      await download(id, version);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The download couldn't be started.");
    }
  };

  if (!allowed) {
    return (
      <div className="page">
        <PageHeader eyebrow="Sales Enablement · Content Library" title="Content" subtitle="" />
        <Panel title="Content">
          <EmptyState icon="lock" title="No access" body="You don't have permission to view sales content." />
        </Panel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <PageHeader eyebrow="Sales Enablement · Content Library" title="Content" subtitle="" />
        <Panel title="Content">
          <EmptyState
            icon={error.notFound ? "search" : "alert"}
            title={error.notFound ? "Content not found" : "Couldn't load this content"}
            body={error.message}
            action={
              <Button variant="ghost" onClick={() => router.push("/content")}>
                Back to the library
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 420 }} />
      </div>
    );
  }

  const archived = asset.status === "ARCHIVED";
  const current = asset.versions[0];
  const replace = (d: ContentAssetDetail, message: string) => {
    setAsset(d);
    setDialog(null);
    toast.success(message);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Sales Enablement · ${CONTENT_KIND_META[asset.kind].label}`}
        title={asset.title}
        subtitle={asset.description ?? ""}
        cta={
          <div className="content-actions">
            <Button variant="primary" icon="download" onClick={() => startDownload()}>
              Download
            </Button>
            {canManage && !archived && (
              <>
                <Button variant="ghost" icon="plus" onClick={() => setDialog("version")}>
                  New version
                </Button>
                <Button variant="ghost" icon="edit" onClick={() => setDialog("edit")}>
                  Edit
                </Button>
                <Button variant="ghost" className="danger-ghost" icon="trash" onClick={() => setDialog("archive")}>
                  Archive
                </Button>
              </>
            )}
            {canManage && archived && (
              <Button variant="ghost" icon="restore" onClick={() => setDialog("restore")}>
                Restore
              </Button>
            )}
          </div>
        }
      />
      {archived && (
        <p className="content-archived" role="status">
          Archived {asset.archivedAt ? formatDate(asset.archivedAt) : ""}
          {asset.archivedBy ? ` by ${asset.archivedBy.fullName}` : ""}: {asset.archiveReason}. Archived content can&apos;t be shared until it is restored.
        </p>
      )}
      <div className="crm-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Panel title={`Preview · version ${current?.version ?? 1}`}>
            {current ? <ContentPreview assetId={asset.id} kind={asset.kind} title={asset.title} version={current.version} /> : <p>No file.</p>}
          </Panel>
          <Panel title={`Shared ${shares?.length ?? 0} time${shares?.length === 1 ? "" : "s"}`} flush>
            {!shares ? (
              <div className="skeleton" style={{ height: 80 }} />
            ) : shares.length === 0 ? (
              <EmptyState icon="share" title="Not shared yet" body="Share it from a lead, an opportunity or a customer." />
            ) : (
              <ul className="content-share-log">
                {shares.map((s) => {
                  const t = shareTarget(s);
                  return (
                    <li key={s.id}>
                      <span>
                        {t.href ? <a href={t.href}>{t.label}</a> : t.label} &middot; v{s.version} &middot; {s.channel === "WHATSAPP" ? "WhatsApp" : "download"}
                      </span>
                      <span className="content-card-meta">
                        {formatDateTime(s.createdAt)}
                        {s.actor ? ` · ${s.actor.fullName}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Panel title="Details">
            <div className="info-grid" style={{ padding: 0 }}>
              <div className="f"><label>Kind</label><div><ContentKindBadge kind={asset.kind} /></div></div>
              <div className="f"><label>Status</label><div>{archived ? <Tag color="w">Archived</Tag> : <Tag color="g">Active</Tag>}</div></div>
              <div className="f"><label>Tags</label><div>{asset.tags.length ? asset.tags.join(", ") : "—"}</div></div>
              <div className="f"><label>Product</label><div>{asset.inventoryItem ? `${asset.inventoryItem.productName} (${asset.inventoryItem.sku})` : "—"}</div></div>
              <div className="f"><label>Created</label><div>{formatDate(asset.createdAt)}{asset.createdBy ? ` · ${asset.createdBy.fullName}` : ""}</div></div>
              <div className="f"><label>Updated</label><div>{formatDate(asset.updatedAt)}{asset.updatedBy ? ` · ${asset.updatedBy.fullName}` : ""}</div></div>
            </div>
          </Panel>
          <Panel title={`Versions (${asset.versions.length})`} flush>
            <ul className="content-versions">
              {asset.versions.map((v) => (
                <li key={v.id}>
                  <div>
                    <b>v{v.version}</b>
                    {v.version === current?.version && <Tag color="g">Current</Tag>}
                    <div className="content-card-meta">
                      {v.originalName} &middot; {formatFileSize(v.sizeBytes)}
                      {v.width && v.height ? ` · ${v.width}×${v.height}` : ""}
                    </div>
                    <div className="content-card-meta">
                      {formatDateTime(v.createdAt)}
                      {v.uploadedBy ? ` · ${v.uploadedBy.fullName}` : ""}
                      {v.metadataRemoved.length ? ` · removed: ${v.metadataRemoved.map((m) => REMOVED_LABEL[m] ?? m).join(", ")}` : ""}
                    </div>
                  </div>
                  <Button variant="ghost" className="sm" icon="download" onClick={() => startDownload(v.version)} aria-label={`Download version ${v.version}`}>
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      {dialog === "version" && <ContentUploadDialog asset={asset} onClose={() => setDialog(null)} onDone={(d) => replace(d, `Version ${d.versions[0]?.version} uploaded`)} />}
      {dialog === "edit" && <ContentEditDialog asset={asset} onClose={() => setDialog(null)} onDone={(d) => replace(d, "Details saved")} />}
      {dialog === "archive" && (
        <ConfirmDialog
          title="Archive this content?"
          body="It leaves the library and can't be shared until it is restored. Its versions and share history are kept."
          confirmLabel="Archive"
          destructive
          noteLabel="Why is it archived?"
          noteRequired
          onClose={() => setDialog(null)}
          onConfirm={async (note) => replace(await repo.content.archive(asset.id, note ?? ""), "Content archived")}
        />
      )}
      {dialog === "restore" && (
        <ConfirmDialog
          title="Restore this content?"
          body="It returns to the library and can be shared again."
          confirmLabel="Restore"
          onClose={() => setDialog(null)}
          onConfirm={async () => replace(await repo.content.restore(asset.id), "Content restored")}
        />
      )}
    </div>
  );
}
