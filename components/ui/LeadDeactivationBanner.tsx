"use client";

import { Button } from "./Button";
import { Icon } from "./Icon";
import { formatDateTime } from "../../lib/format";

/**
 * Shown on the Lead detail page while a lead is deactivated: who took it out of
 * active sales, when, and why, with the way back. Presentational only; the page
 * owns the reactivate call and any error message.
 */
export function LeadDeactivationBanner({
  deactivatedAt,
  deactivatedByName,
  reason,
  canReactivate,
  busy,
  onReactivate,
}: {
  deactivatedAt?: string;
  deactivatedByName?: string;
  reason?: string;
  canReactivate: boolean;
  busy?: boolean;
  onReactivate: () => void;
}) {
  const who = deactivatedByName ? `Deactivated by ${deactivatedByName}` : "Deactivated";
  const when = deactivatedAt ? ` on ${formatDateTime(deactivatedAt)}` : "";

  return (
    <div
      className="card panel"
      role="status"
      style={{ padding: "14px 19px", borderLeft: "3px solid var(--warn)" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert" size={16} />
            <b>This lead is deactivated</b>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
            {who}
            {when}.
          </p>
          {reason && (
            <p style={{ fontSize: 13.5, marginTop: 6 }}>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>Reason: </span>
              {reason}
            </p>
          )}
          <p style={{ color: "var(--faint)", fontSize: 12, marginTop: 8 }}>
            It&apos;s out of active sales and can&apos;t be changed, but its history is kept. Reactivate it to work on it again.
          </p>
        </div>
        <Button
          variant="ghost"
          icon="check"
          onClick={onReactivate}
          disabled={!canReactivate || busy}
          title={canReactivate ? undefined : "You don't have permission to reactivate leads"}
        >
          {busy ? "Reactivating…" : "Reactivate"}
        </Button>
      </div>
    </div>
  );
}
