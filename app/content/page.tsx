"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { FilterChips } from "../../components/ui/FilterChips";
import { ResponsiveColumn, ResponsiveList } from "../../components/ui/ResponsiveList";
import { Tag } from "../../components/ui/Tag";
import { useToast } from "../../components/ui/Toast";
import { ContentKindBadge } from "../../components/content/contentUi";
import { ContentUploadDialog } from "../../components/content/ContentUploadDialog";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { formatDate } from "../../lib/format";
import { CONTENT_KIND_META, CONTENT_KINDS, ContentAsset, ContentKind, formatFileSize } from "../../lib/types/domain";

type KindFilter = ContentKind | "ALL";
type StatusFilter = "ACTIVE" | "ARCHIVED";

/**
 * The sales content library (VERIFIED: /content-assets, content.view to browse,
 * content.manage to upload): product catalogues, machine photos and machine videos,
 * shared from a lead, an opportunity or a customer.
 */
export default function ContentLibraryPage() {
  const repo = useRepository();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const allowed = hasPermission("content.view");
  const canManage = hasPermission("content.manage");
  const [items, setItems] = useState<ContentAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("ACTIVE");
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [term, setTerm] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    setError(null);
    repo.content
      .list({ status })
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "The content library couldn't be loaded."));
  }, [repo, status]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (items ?? []).filter(
      (a) => (kind === "ALL" || a.kind === kind) && (!q || a.title.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)))
    );
  }, [items, kind, term]);

  const header = (
    <PageHeader
      eyebrow="Sales Enablement · Content Library"
      title="Content Library"
      subtitle="Catalogues, machine photos and machine videos to share with leads and customers."
      cta={
        allowed && canManage ? (
          <Button variant="primary" icon="plus" onClick={() => setUploading(true)}>
            Upload content
          </Button>
        ) : undefined
      }
    />
  );

  if (!allowed) {
    return (
      <div className="page">
        {header}
        <Panel title="Content Library">
          <EmptyState icon="lock" title="No access" body="You don't have permission to view sales content." />
        </Panel>
      </div>
    );
  }

  const columns: ResponsiveColumn<ContentAsset>[] = [
    { key: "title", header: "Title", primary: true, render: (a) => <b>{a.title}</b> },
    { key: "kind", header: "Kind", render: (a) => <ContentKindBadge kind={a.kind} /> },
    { key: "tags", header: "Tags", render: (a) => (a.tags.length ? a.tags.join(", ") : "—") },
    { key: "version", header: "Version", render: (a) => `v${a.currentVersion?.version ?? 1}${a.currentVersion ? ` · ${formatFileSize(a.currentVersion.sizeBytes)}` : ""}` },
    { key: "shares", header: "Shared", render: (a) => (a.shareCount ? `${a.shareCount}×` : "—") },
    { key: "updated", header: "Updated", render: (a) => formatDate(a.updatedAt) },
  ];

  const card = (a: ContentAsset) => (
    <div className="content-card">
      <div className="content-card-top">
        <ContentKindBadge kind={a.kind} />
        {a.status === "ARCHIVED" && <Tag color="w">Archived</Tag>}
      </div>
      <b>{a.title}</b>
      <span className="content-card-meta">
        v{a.currentVersion?.version ?? 1}
        {a.currentVersion ? ` · ${formatFileSize(a.currentVersion.sizeBytes)}` : ""}
        {a.shareCount ? ` · shared ${a.shareCount}×` : ""}
      </span>
      {a.tags.length > 0 && <span className="content-card-meta">{a.tags.join(", ")}</span>}
    </div>
  );

  const kindOptions: Array<{ value: KindFilter; label: string; count?: number }> = [
    { value: "ALL", label: "All", count: items?.length },
    ...CONTENT_KINDS.map((k) => ({ value: k as KindFilter, label: CONTENT_KIND_META[k].plural, count: (items ?? []).filter((a) => a.kind === k).length })),
  ];

  return (
    <div className="page">
      {header}
      <div className="cust-toolbar">
        <label className="cust-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search content</span>
          <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by title, description or tag" />
        </label>
        <FilterChips label="Filter content by kind" value={kind} onChange={setKind} options={kindOptions} />
        <FilterChips
          label="Active or archived content"
          value={status}
          onChange={(s) => {
            setItems(null);
            setStatus(s);
          }}
          options={[
            { value: "ACTIVE" as const, label: "Active" },
            { value: "ARCHIVED" as const, label: "Archived" },
          ]}
        />
      </div>
      {error && (
        <p role="alert" className="content-error">
          {error}{" "}
          <Button variant="ghost" onClick={load}>
            Try again
          </Button>
        </p>
      )}
      <Panel title={status === "ACTIVE" ? "Content" : "Archived content"} flush>
        {!items && !error ? (
          <div className="skeleton" style={{ height: 220 }} />
        ) : (
          <ResponsiveList
            rows={rows}
            columns={columns}
            getHref={(a) => `/content/${a.id}`}
            getLabel={(a) => `Open ${a.title}`}
            card={card}
            caption="Content"
            testId="content-list"
            emptyIcon="layers"
            emptyTitle={(items ?? []).length === 0 ? (status === "ACTIVE" ? "No content yet" : "Nothing archived") : "Nothing matches"}
            emptyBody={(items ?? []).length === 0 ? (status === "ACTIVE" ? "Upload a catalogue, a machine photo or a machine video to share it with leads and customers." : undefined) : "Try a different search or kind."}
            emptyAction={
              (items ?? []).length === 0 && status === "ACTIVE" && canManage ? (
                <Button variant="primary" icon="plus" onClick={() => setUploading(true)}>
                  Upload content
                </Button>
              ) : undefined
            }
          />
        )}
      </Panel>
      {uploading && (
        <ContentUploadDialog
          onClose={() => setUploading(false)}
          onDone={(detail) => {
            setUploading(false);
            toast.success(`“${detail.title}” uploaded`);
            router.push(`/content/${detail.id}`);
          }}
        />
      )}
    </div>
  );
}
