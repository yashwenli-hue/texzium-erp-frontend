"use client";

import { ConfirmDialog } from "../ui/ConfirmDialog";
import { MoneyText } from "../ui/MoneyText";
import { formatDay } from "../../lib/repository/shared/collections";
import { paymentModeLabel } from "../../lib/repository/shared/paymentCollection";

export interface ReceiptContext {
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  paymentDate: string;
  /** The governed customer's name, or the words "Name on invoice: X (not verified)". */
  customer: string;
  invoice: string;
}

/**
 * Generating a receipt is Finance's call and it is not repeatable safely: every confirmation
 * creates a new receipt voucher, and there is no way to ask Finance whether one already exists
 * for a payment. So it is never one click: the person sees which payment, customer and invoice
 * it is for, and what will happen, before anything is created.
 */
export function ReceiptConfirmDialog({ context, onConfirm, onClose }: { context: ReceiptContext; onConfirm: () => Promise<unknown>; onClose: () => void }) {
  return (
    <ConfirmDialog
      title="Generate a receipt?"
      body="A new receipt voucher is created every time you confirm this, and Finance gives us no way to see whether one already exists for this payment. Continue only if no receipt has been issued for it."
      confirmLabel="Generate receipt"
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <dl className="receipt-ctx" data-testid="receipt-context" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", fontSize: 13, margin: 0 }}>
        <dt>Payment</dt>
        <dd style={{ margin: 0 }}>
          <MoneyText value={context.amount} mode="exact" /> by {paymentModeLabel(context.paymentMode)}
          {context.referenceNumber ? `, ref ${context.referenceNumber}` : ""}, {formatDay(context.paymentDate)}
        </dd>
        <dt>Customer</dt>
        <dd style={{ margin: 0 }}>{context.customer}</dd>
        <dt>Invoice</dt>
        <dd style={{ margin: 0 }}>{context.invoice}</dd>
      </dl>
    </ConfirmDialog>
  );
}
