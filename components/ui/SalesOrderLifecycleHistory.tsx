"use client";

import { Icon } from "./Icon";
import { Tag, TagColor } from "./Tag";
import { SalesOrderEvent, formatSalesOrderEventAction, formatSalesOrderStatus } from "../../lib/types/domain";
import { formatDateTime } from "../../lib/format";

const RESULT_COLOR: Record<string, TagColor> = { VERIFIED: "g", APPROVED: "g", REJECTED: "b" };
const ACTION_ICON: Record<string, string> = {
  ADVANCE_RECEIPT_VERIFIED: "check",
  ADVANCE_RECEIPT_REJECTED: "close",
  ACCOUNTS_APPROVED: "checksq",
};

/**
 * A Sales Order's lifecycle (audit) history: who verified, rejected or
 * approved, with the result, the status change and any remarks. It is not
 * general notes, and it only holds what the backend recorded: verification,
 * rejection and accounts approval. Order creation, payment terms and receipt
 * entry are not events, so none is shown for them.
 */
export function SalesOrderLifecycleHistory({ events }: { events: SalesOrderEvent[] }) {
  return (
    <div className="tl" data-testid="sales-order-history">
      {events.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13, padding: "4px 0 12px" }}>
          No approvals or verifications recorded yet.
        </p>
      )}
      {events.map((e) => {
        const moved = !!e.fromStatus && !!e.toStatus && e.fromStatus !== e.toStatus;
        return (
          <div className="tl-item" key={e.id}>
            <div className="dot">
              <Icon name={ACTION_ICON[e.action] ?? "pulse"} size={14} />
            </div>
            <div className="body">
              <div className="r1">
                <b>{formatSalesOrderEventAction(e.action)}</b>
                <span className="when">{formatDateTime(e.occurredAt)}</span>
              </div>
              {e.fromStatus && e.toStatus && (
                <p>
                  {moved
                    ? `${formatSalesOrderStatus(e.fromStatus)} → ${formatSalesOrderStatus(e.toStatus)}`
                    : `The order stayed at ${formatSalesOrderStatus(e.toStatus)}`}
                </p>
              )}
              {e.remarks && <p style={{ fontStyle: "italic" }}>&ldquo;{e.remarks}&rdquo;</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {e.result && <Tag color={RESULT_COLOR[e.result] ?? "n"}>{formatSalesOrderStatus(e.result)}</Tag>}
                <small style={{ color: "var(--muted)", fontSize: 11.5 }}>
                  {e.actorName ? `by ${e.actorName}` : "Actor not recorded"}
                </small>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
