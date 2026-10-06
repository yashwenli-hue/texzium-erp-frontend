"use client";

import { Icon } from "./Icon";
import { formatInr, formatDateTime } from "../../lib/format";

/**
 * Shown on the Sales Order detail page once an order is CANCELLED: who
 * cancelled it, when and why (from its lifecycle event), and what the
 * cancellation does not do. Presentational only. Cancelling is final: there is
 * no reopen, and it does not refund or reverse anything outside the order's own
 * approval steps.
 */
export function SalesOrderCancelledBanner({
  salesOrderCode,
  cancelledAt,
  cancelledByName,
  reason,
  verifiedAdvanceTotal,
}: {
  salesOrderCode: string;
  cancelledAt?: string;
  cancelledByName?: string;
  reason?: string;
  /** Total of advance receipts that are still VERIFIED on the order; they are not refunded by the cancellation. */
  verifiedAdvanceTotal?: number;
}) {
  const who = cancelledByName ? `Cancelled by ${cancelledByName}` : "Cancelled";
  const when = cancelledAt ? ` on ${formatDateTime(cancelledAt)}` : "";

  return (
    <div
      className="card panel"
      role="status"
      data-testid="sales-order-cancelled-banner"
      style={{ padding: "14px 19px", marginBottom: 16, borderLeft: "3px solid var(--bad)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="alert" size={16} />
        <b>{salesOrderCode} is cancelled</b>
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
        Cancellation is final: this order can&apos;t be reopened or changed, and its history is kept. If it came from a
        Proforma Invoice, a new Sales Order can be created from that Proforma.
      </p>
      {verifiedAdvanceTotal !== undefined && verifiedAdvanceTotal > 0 && (
        <p style={{ fontSize: 12.5, marginTop: 8 }} data-testid="sales-order-cancelled-advance-note">
          <b>Advance not refunded.</b> {formatInr(verifiedAdvanceTotal)} of verified advance stays on record against this
          order. Cancelling does not refund it, and nothing is changed for payments, dispatches or invoices.
        </p>
      )}
    </div>
  );
}
