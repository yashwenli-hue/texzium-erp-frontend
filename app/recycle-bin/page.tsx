"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Chip, ChipGroup, Tag } from "../../components/ui/Tag";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { RestoreRecordDialog } from "../../components/governance/RestoreRecordDialog";
import { PurgeRecordDialog } from "../../components/governance/PurgeRecordDialog";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useDeletionLog } from "../../lib/hooks/useDataDeletion";
import {
  BinTab,
  DELETION_REASON_LABEL,
  DeletionEntityType,
  DeletionLogEntry,
  ENTITY_LABEL,
  ENTITY_NOUN,
  STATUS_LABEL,
  binTabOf,
  entryTitle,
  purgeAuditText,
  purgedTitle,
  recoveryText,
} from "../../lib/repository/shared/dataDeletion";
import { formatDate, formatDateTime } from "../../lib/format";

const TABS: Array<{ key: BinTab | "all"; label: string }> = [
  { key: "bin", label: "In the Recycle Bin" },
  { key: "restored", label: "Restored" },
  { key: "ended", label: "Ended or purged" },
  { key: "all", label: "All" },
];

const tagColor = (e: DeletionLogEntry) => (e.status === "RESTORED" ? "g" : e.status === "PURGED" ? "n" : e.recoverable ? "w" : "b");

/** The Recycle Bin and Deletion Log: every lead and customer deleted through the governed path, and where its recovery stands. */
export default function RecycleBinPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const repo = useRepository();
  const canView = hasPermission("governance.deletions.view");
  const canRestore = hasPermission("governance.deletions.restore");
  const canPurge = hasPermission("governance.deletions.purge");
  const { data, loading, error, reload } = useDeletionLog({ limit: 200 }, canView);
  const [tab, setTab] = useState<BinTab | "all">("bin");
  const [entity, setEntity] = useState<DeletionEntityType | "all">("all");
  const [details, setDetails] = useState<DeletionLogEntry | null>(null);
  const [restoring, setRestoring] = useState<DeletionLogEntry | null>(null);
  const [purging, setPurging] = useState<DeletionLogEntry | null>(null);

  const rows = useMemo(() => (data ?? []).filter((r) => entity === "all" || r.entityType === entity), [data, entity]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { bin: 0, restored: 0, ended: 0, all: rows.length };
    for (const r of rows) c[binTabOf(r)] += 1;
    return c;
  }, [rows]);
  const shown = useMemo(() => rows.filter((r) => tab === "all" || binTabOf(r) === tab), [rows, tab]);

  if (!canView) {
    return (
      <div className="page">
        <PageHeader eyebrow="RevenueOS · Governance" title="Recycle Bin" subtitle="Deleted leads and customers, and how long they can be restored." />
        <Panel title="No access">
          <EmptyState icon="lock" title="You don't have access to the Recycle Bin" body="It is for administrators. Ask for the “View Data Deletion Log” permission if you need it." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page" data-testid="recycle-bin">
      <PageHeader eyebrow="RevenueOS · Governance" title="Recycle Bin" subtitle="Deleted leads and customers: what was removed, by whom, why, and how long it can be restored." />

      <div className="bin-filters">
        <ChipGroup>
          {TABS.map((t) => (
            <Chip key={t.key} label={`${t.label} · ${counts[t.key] ?? 0}`} active={tab === t.key} onClick={() => setTab(t.key)} />
          ))}
        </ChipGroup>
        <ChipGroup>
          <Chip label="All records" active={entity === "all"} onClick={() => setEntity("all")} />
          <Chip label="Leads" active={entity === "LEAD"} onClick={() => setEntity("LEAD")} />
          <Chip label="Customers" active={entity === "CUSTOMER"} onClick={() => setEntity("CUSTOMER")} />
        </ChipGroup>
      </div>

      <Panel title="Deleted records">
        {loading && !data ? (
          <div className="skeleton" style={{ height: 160 }} aria-busy="true" />
        ) : error ? (
          <EmptyState icon="alert" title="Couldn't load the Recycle Bin" body={error.message} action={<Button variant="ghost" onClick={reload}>Retry</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon="trash"
            title={tab === "bin" ? "The Recycle Bin is empty" : "Nothing here"}
            body={tab === "bin" ? "Nothing deleted can be restored right now." : "No deleted record matches this view."}
          />
        ) : (
          <ul className="bin-list" data-testid="bin-list">
            {shown.map((r) => (
              <li key={r.id} className="bin-row" data-testid="bin-row" data-status={r.status} data-entity={r.entityType}>
                <div className="bin-main">
                  <div className="bin-title">
                    <Tag color={r.entityType === "LEAD" ? "i" : "n"}>{ENTITY_LABEL[r.entityType]}</Tag>
                    <b>{entryTitle(r)}</b>
                    {r.entityCode && <span className="bin-code">{r.entityCode}</span>}
                    {r.status === "PURGED" && <span className="bin-code mono" data-testid="bin-purged-id" title="Audit id">{r.id.slice(0, 8)}</span>}
                  </div>
                  {r.status === "PURGED" ? (
                    // A purged record: only the minimal audit is left (the category, when, how). No name, no explanation.
                    <>
                      <div className="bin-reason" data-testid="bin-purged-category">
                        <span className="bin-rc">{DELETION_REASON_LABEL[r.reasonCode]}</span>
                      </div>
                      <div className="bin-meta">Deleted {formatDate(r.deletedAt)} · {purgeAuditText(r)}</div>
                    </>
                  ) : (
                    <>
                      <div className="bin-reason">
                        <span className="bin-rc">{DELETION_REASON_LABEL[r.reasonCode]}</span> · {r.reason}
                      </div>
                      <div className="bin-meta">
                        Deleted {formatDate(r.deletedAt)}
                        {r.deletedBy?.fullName ? ` by ${r.deletedBy.fullName}` : ""}
                        {r.survivorLabel ? ` · duplicate of ${r.survivorLabel}` : ""}
                      </div>
                    </>
                  )}
                </div>
                <div className="bin-state">
                  <Tag color={tagColor(r)}>{r.status === "DELETED" && !r.recoverable ? "Recovery ended" : STATUS_LABEL[r.status]}</Tag>
                  {r.status !== "PURGED" && <span className="bin-when" data-testid="bin-recovery">{recoveryText(r)}</span>}
                </div>
                <div className="bin-actions">
                  <Button variant="ghost" onClick={() => setDetails(r)} aria-label={`Details of ${entryTitle(r)}`}>
                    Details
                  </Button>
                  {r.recoverable && canRestore && (
                    <Button variant="primary" icon="restore" onClick={() => setRestoring(r)} aria-label={`Restore ${entryTitle(r)}`}>
                      Restore
                    </Button>
                  )}
                  {r.status === "DELETED" && canPurge && (
                    <Button variant="ghost" className="danger-ghost" icon="trash" onClick={() => setPurging(r)} aria-label={`Erase the saved copy of ${entryTitle(r)} permanently`}>
                      Erase permanently
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {details && (
        <Modal title={entryTitle(details) === purgedTitle(details.entityType) ? purgedTitle(details.entityType) : `${ENTITY_LABEL[details.entityType]} — ${details.entityLabel}`} onClose={() => setDetails(null)} footer={<Button variant="primary" onClick={() => setDetails(null)}>Close</Button>}>
          {details.status === "PURGED" ? (
            // Only the minimal audit record exists: no name, no explanation, no copy, no contact data.
            <>
              <dl className="bin-detail" data-testid="bin-detail" data-purged="true">
                <div><dt>State</dt><dd>Erased permanently</dd></div>
                <div><dt>Audit id</dt><dd className="mono" data-testid="bin-detail-audit-id">{details.id}</dd></div>
                <div><dt>Category</dt><dd>{DELETION_REASON_LABEL[details.reasonCode]}</dd></div>
                <div><dt>Deleted</dt><dd>{formatDateTime(details.deletedAt)}</dd></div>
                <div><dt>Copy erased</dt><dd data-testid="bin-detail-purge">{details.purgedAt ? formatDateTime(details.purgedAt) : ""} · {purgeAuditText(details)}</dd></div>
              </dl>
              <p className="gov-muted" style={{ marginTop: 12 }} data-testid="bin-detail-minimal">
                Only this minimal audit entry is kept. The name, the explanation, the saved copy and the record&apos;s original id were erased, and the {ENTITY_NOUN[details.entityType]} can never be restored.
              </p>
            </>
          ) : (
          <dl className="bin-detail" data-testid="bin-detail">
            <div><dt>State</dt><dd>{STATUS_LABEL[details.status]}{details.status === "DELETED" && !details.recoverable ? " (recovery period ended)" : ""}</dd></div>
            <div><dt>Identity</dt><dd className="mono">{details.entityId}{details.entityCode ? ` · ${details.entityCode}` : ""}</dd></div>
            <div><dt>Reason</dt><dd>{DELETION_REASON_LABEL[details.reasonCode]} — {details.reason}</dd></div>
            {details.survivorLabel && <div><dt>Duplicate of</dt><dd>{details.survivorLabel}</dd></div>}
            <div><dt>Deleted</dt><dd>{formatDateTime(details.deletedAt)}{details.deletedBy?.fullName ? ` by ${details.deletedBy.fullName}` : ""}</dd></div>
            <div><dt>Recoverable until</dt><dd>{formatDateTime(details.purgeAfter)} · {recoveryText(details)}</dd></div>
            {details.restoredAt && <div><dt>Restored</dt><dd>{formatDateTime(details.restoredAt)}{details.restoredBy?.fullName ? ` by ${details.restoredBy.fullName}` : ""}</dd></div>}
            <div>
              <dt>What the saved copy holds</dt>
              <dd>
                <ul className="bin-impact">
                  {(details.impact.removed ?? []).map((l) => (
                    <li key={l.label}>{l.label}: <b className="tnum">{l.count}</b></li>
                  ))}
                </ul>
              </dd>
            </div>
            <div><dt>Checked before deleting</dt><dd>{(details.impact.blockersChecked ?? []).length} dependency checks, none found</dd></div>
          </dl>
          )}
          {details.status === "RESTORED" && (
            <p style={{ marginTop: 12 }}>
              <Link className="linklike" href={details.entityType === "LEAD" ? `/leads/${details.entityId ?? ""}` : `/customers/${details.entityId ?? ""}`}>
                Open the restored {ENTITY_NOUN[details.entityType]}
              </Link>
            </p>
          )}
        </Modal>
      )}

      {restoring && (
        <RestoreRecordDialog
          recordId={restoring.id}
          onClose={() => setRestoring(null)}
          onRestored={(result) => {
            setRestoring(null);
            toast.success(`${result.label} restored`);
            reload();
          }}
        />
      )}

      {purging && (
        <PurgeRecordDialog
          entry={purging}
          onClose={() => setPurging(null)}
          onOutOfDate={reload}
          onPurged={() => {
            // The name is only ever shown here, once, from the row the person was looking at; the answer carries none.
            const purgedName = entryTitle(purging);
            setPurging(null);
            toast.success(`The saved copy of ${purgedName} was erased`);
            reload();
          }}
        />
      )}
    </div>
  );
}
