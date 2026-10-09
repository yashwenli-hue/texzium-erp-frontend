"use client";

import Link from "next/link";
import { useState } from "react";
import { Panel } from "../ui/Card";
import { Button } from "../ui/Button";
import { RestoreRecordDialog } from "./RestoreRecordDialog";
import { useAuth } from "../../lib/auth/AuthContext";
import { useDeletionLog } from "../../lib/hooks/useDataDeletion";
import { useToast } from "../ui/Toast";
import { DELETION_REASON_LABEL, DeletionEntityType, ENTITY_LABEL, ENTITY_NOUN, RestoreResult, recoveryText } from "../../lib/repository/shared/dataDeletion";
import { formatDate } from "../../lib/format";

/**
 * What a lead or customer link says when the record is not there. If the person may read the
 * Deletion Log and the record was deleted, it says so (when, by whom, why, how long it can be
 * restored) and offers the governed Restore; otherwise it is the plain "not found" (which is also what a
 * purged record gets: its original id is erased).
 */
export function DeletedRecordNotice({
  entityType,
  id,
  onRestored,
}: {
  entityType: DeletionEntityType;
  id: string;
  /** The record is back: the page re-reads it. */
  onRestored: (result: RestoreResult) => void;
}) {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canSee = hasPermission("governance.deletions.view");
  const canRestore = hasPermission("governance.deletions.restore");
  const { data } = useDeletionLog({ entityType, entityId: id, limit: 5 }, canSee);
  const [restoring, setRestoring] = useState<string | null>(null);
  const noun = ENTITY_NOUN[entityType];
  const label = ENTITY_LABEL[entityType];
  const latest = data?.[0];

  if (!canSee || !latest) {
    return (
      <Panel title={`${label} not found`}>
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>This {noun} may have been removed, or the link is out of date.</p>
      </Panel>
    );
  }

  // A purged record is not found here: its tombstone no longer carries the original id, so the id in this link
  // finds nothing, and the page says the plain "not found" (above). The minimal audit entry is in the Recycle Bin,
  // under the tombstone's own id.

  return (
    <Panel title={`${label} deleted`}>
      <div data-testid="deleted-notice" data-status={latest.status}>
        <p style={{ fontSize: 13.5, margin: 0 }}>
          <b>{latest.entityLabel}</b> was moved to the Recycle Bin on {formatDate(latest.deletedAt)}
          {latest.deletedBy?.fullName ? ` by ${latest.deletedBy.fullName}` : ""}.
        </p>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "6px 0 0" }}>
          {DELETION_REASON_LABEL[latest.reasonCode]}: {latest.reason}
        </p>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "6px 0 12px" }} data-testid="deleted-notice-recovery">
          {latest.recoverable ? `It can be restored: ${recoveryText(latest).toLowerCase()}.` : latest.status === "RESTORED" ? "It has since been restored." : "Its recovery period has ended."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {latest.recoverable && canRestore && (
            <Button variant="primary" icon="restore" onClick={() => setRestoring(latest.id)}>
              Restore {noun}
            </Button>
          )}
          <Link className="btn ghost" href="/recycle-bin">
            Open the Recycle Bin
          </Link>
        </div>
      </div>
      {restoring && (
        <RestoreRecordDialog
          recordId={restoring}
          onClose={() => setRestoring(null)}
          onRestored={(result) => {
            setRestoring(null);
            toast.success(`${result.label} restored`);
            onRestored(result);
          }}
        />
      )}
    </Panel>
  );
}
