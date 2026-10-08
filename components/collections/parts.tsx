import Link from "next/link";
import { ReactNode } from "react";
import { Tag, TagColor } from "../ui/Tag";
import { CustomerChip } from "../ui/EntityChip";
import { MoneyText } from "../ui/MoneyText";
import {
  Anomaly,
  COLLECTION_STATE_LABEL,
  CollectionState,
  CustomerIdentity,
  dueWording,
  formatDay,
} from "../../lib/repository/shared/collections";
import { paymentModeLabel } from "../../lib/repository/shared/paymentCollection";
import { InvoiceCollections, PaymentCollectionEvent, PaymentCollectionRecord } from "../../lib/types/domain";

const STATE_COLOR: Record<CollectionState, TagColor> = {
  WRITTEN_OFF: "n",
  PAID: "g",
  OVERDUE: "b",
  DUE_TODAY: "w",
  DUE_SOON: "w",
  NOT_YET_DUE: "i",
};

/** Where a receivable stands. Written off is a state of its own, not a problem. */
export function CollectionStateTag({ state }: { state: CollectionState }) {
  return <Tag color={STATE_COLOR[state]}>{COLLECTION_STATE_LABEL[state]}</Tag>;
}

/** "84 days overdue" / "Due in 2 days", empty for a closed receivable. */
export function DueLine({ state, days, dueDate, dueIsInvoiceDate }: { state: CollectionState; days: number; dueDate: string; dueIsInvoiceDate?: boolean }) {
  const wording = dueWording(state, days);
  return (
    <>
      {wording && <span className="when">{wording}</span>}
      <span className="when">Due {formatDay(dueDate)}</span>
      {dueIsInvoiceDate && (
        <span className="mark" title="Finance's due date is the invoice's own date: credit terms are not reflected">
          due date = invoice date
        </span>
      )}
    </>
  );
}

/** Who the receivable is for. Only the governed link names a customer; what is written on the invoice is shown as exactly that. */
export function CustomerCell({ identity, invoiceCustomerName }: { identity: CustomerIdentity; invoiceCustomerName?: string }) {
  const onInvoice = invoiceCustomerName ? <span className="name-on-invoice">Name on invoice: {invoiceCustomerName} (not verified)</span> : null;
  if (identity.kind === "linked") return <CustomerChip customer={identity.customer} />;
  if (identity.kind === "unlinked") {
    return (
      <span className="col-who" data-state="unlinked">
        Not linked to a customer. <Link href={`/opportunities/${identity.opportunityId}`}>Open the deal</Link>
        <br />
        {onInvoice}
      </span>
    );
  }
  return (
    <span className="col-who" data-state="unknown">
      {identity.reason === "deals-unavailable" ? "Customer unavailable: the deals couldn't be read." : "Customer unknown: no deal is recorded for this invoice."}
      <br />
      {onInvoice}
    </span>
  );
}

/** Why a receivable needs review, in words. Written-off and unmatched are not anomalies of the records, so they say what they are. */
export function ReviewNotes({ anomalies, identity }: { anomalies: Anomaly[]; identity: CustomerIdentity }) {
  const lines: ReactNode[] = anomalies.map((a) => (
    <li key={a.key}>
      <b>{a.label}.</b> {a.detail}
    </li>
  ));
  if (identity.kind === "unlinked") lines.push(<li key="unlinked">No customer is linked to this invoice&apos;s deal, so it cannot be grouped under one. Link a customer on the deal.</li>);
  if (identity.kind === "unknown" && identity.reason !== "deals-unavailable") lines.push(<li key="unknown">The deal behind this invoice was not found, so its customer cannot be said.</li>);
  if (lines.length === 0) return null;
  return (
    <div className="col-review" data-testid="review-notes">
      <b>Needs review.</b> Nothing here has been changed.
      <ul>{lines}</ul>
    </div>
  );
}

/** The payments of one receivable, newest first, with who recorded each and what it did to the balance. */
export function PaymentHistoryList({
  collections,
  events,
  renderAction,
}: {
  collections: PaymentCollectionRecord[];
  events: PaymentCollectionEvent[];
  /** Something extra under a payment, for example the receipt button. */
  renderAction?: (c: PaymentCollectionRecord) => ReactNode;
}) {
  if (collections.length === 0) return <p className="pay-empty">No payments recorded yet.</p>;
  const eventOf = (id: string) => events.find((e) => e.paymentCollectionId === id);
  return (
    <ul className="pay-list" data-testid="payment-history">
      {collections.map((c) => {
        const ev = eventOf(c.id);
        return (
          <li key={c.id} className="pay-item">
            <span>
              {formatDay(c.paymentDate)} · {paymentModeLabel(c.paymentMode)}
              {c.referenceNumber ? ` · ${c.referenceNumber}` : ""}
            </span>
            <span className="amt">
              <MoneyText value={c.amount} mode="exact" />
            </span>
            <span className="meta">
              {c.recordedByName ? `Recorded by ${c.recordedByName}` : "Recorded before payments were tracked: no recorder is kept"}
              {ev ? ` · balance ${ev.balanceBefore === ev.balanceAfter ? "unchanged" : "after it"} ` : ""}
              {ev && ev.balanceBefore !== ev.balanceAfter ? <MoneyText value={ev.balanceAfter} mode="exact" /> : null}
              {c.remarks ? ` · ${c.remarks}` : ""}
            </span>
            {renderAction && <span className="receipt">{renderAction(c)}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export type { InvoiceCollections };
