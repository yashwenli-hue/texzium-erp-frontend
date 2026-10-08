"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/Button";
import { MoneyText } from "../ui/MoneyText";
import { CustomerChip } from "../ui/EntityChip";
import { CollectionStateTag, CustomerCell, DueLine, ReviewNotes } from "./parts";
import { PaymentHistorySection } from "./PaymentHistorySection";
import { useReceivableCollections } from "../../lib/hooks/useCollections";
import {
  CollectedWindow,
  CollectionGroup,
  CollectionRow,
  CollectionsSummary,
  collectionActions,
  customerDescription,
  formatDay,
} from "../../lib/repository/shared/collections";

/** An invoice whose own name text differs from the customer its deal is linked to. Shown as a fact, never used to change who the customer is. */
function differentName(row: CollectionRow): boolean {
  if (row.identity.kind !== "linked" || !row.invoiceCustomerName) return false;
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(row.invoiceCustomerName) !== norm(row.identity.customer.customerName);
}

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The five numbers that say where collections stand today. Compact with the exact figure one hover away. */
export function CollectionsSummaryStrip({ summary }: { summary: CollectionsSummary }) {
  const c: CollectedWindow | null = summary.collected;
  const tiles = [
    { key: "open", k: "To collect", v: summary.openBalance, note: n(summary.openCount, "open invoice", "open invoices") },
    { key: "overdue", k: "Overdue", v: summary.overdue, note: summary.overdueCount > 0 ? n(summary.overdueCount, "invoice", "invoices") : "nothing overdue", bad: summary.overdue > 0 },
    { key: "soon", k: "Due soon", v: summary.dueSoon, note: summary.dueSoonCount > 0 ? `${n(summary.dueSoonCount, "invoice", "invoices")}, within 3 days` : "nothing due in 3 days" },
    { key: "collected", k: "Collected, last 30 days", v: c?.amount ?? null, note: c === null ? "payments unavailable" : c.complete ? n(c.count, "payment", "payments") : `${n(c.count, "payment", "payments")}, may be short` },
    { key: "review", k: "Needs review", v: null, count: summary.needsReview, note: summary.needsReview > 0 ? "records to check" : "nothing to check" },
  ];
  return (
    <section className="snapshot snap-5" aria-label="Collections summary" data-testid="collections-summary">
      <ul>
        {tiles.map((t) => (
          <li key={t.key} className={t.bad ? "snap-bad" : undefined} data-tile={t.key}>
            <span className="k">{t.k}</span>
            <span className="v">{t.key === "review" ? t.count : t.v === null ? "n/a" : <MoneyText value={t.v} />}</span>
            <span className="n">{t.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Column labels for the wide layout. On a narrow list each figure carries its own label instead, so this row is hidden there. */
export function CollectionsColumnHeads({ showCustomer }: { showCustomer: boolean }) {
  return (
    <div className="col-row col-head" aria-hidden="true" data-testid="collection-heads">
      <div>Invoice</div>
      <div>{showCustomer ? "Customer" : "Last payment"}</div>
      <div>Invoiced</div>
      <div>Paid</div>
      <div>Balance</div>
      <div>Due</div>
      <div />
    </div>
  );
}

/** One receivable: the invoice, who and when, what is owed, and what can be done. */
export function CollectionRowItem({ row, may, showCustomer, onRecord }: { row: CollectionRow; may: { view: boolean; record: boolean }; showCustomer: boolean; onRecord: (row: CollectionRow) => void }) {
  const [open, setOpen] = useState(false);
  const actions = collectionActions({ may, row });
  const closed = row.state === "PAID" || row.state === "WRITTEN_OFF";
  return (
    <div className={`col-row ${closed ? "is-closed" : ""}`} data-testid="collection-row" data-state={row.state} data-id={row.id}>
      <div className="inv">
        <Link href={`/sales-invoices/${row.salesInvoiceId}`}>{row.invoiceNumber}</Link>
        {row.invoiceDate && <span className="sub">Invoiced {formatDay(row.invoiceDate)}</span>}
      </div>
      <div className="who-cell">
        {showCustomer ? (
          <CustomerCell identity={row.identity} invoiceCustomerName={row.invoiceCustomerName} />
        ) : (
          <span className="sub" data-testid="last-payment">
            {row.invoiceStatus && row.invoiceStatus !== "POSTED" ? "Invoice not posted. " : ""}
            {row.lastPaymentDate ? `Last payment ${formatDay(row.lastPaymentDate)}` : "No payments recorded"}
            {differentName(row) && (
              <span className="sub" data-testid="invoice-name-differs">
                The invoice is addressed to &quot;{row.invoiceCustomerName}&quot;
              </span>
            )}
          </span>
        )}
      </div>
      <div className="num">
        <span className="k">Invoiced</span>
        <MoneyText value={row.invoiced} mode="exact" />
      </div>
      <div className="num">
        <span className="k">Paid</span>
        <MoneyText value={row.paid} mode="exact" />
      </div>
      <div className={`num bal ${row.balance < 0 ? "neg" : ""}`}>
        <span className="k">Balance</span>
        <MoneyText value={row.balance} mode="exact" />
      </div>
      <div className="due">
        <CollectionStateTag state={row.state} />
        <DueLine state={row.state} days={row.daysUntilDue} dueDate={row.dueDate} dueIsInvoiceDate={row.dueIsInvoiceDate && !closed} />
        {row.needsReview && <span className="mark" data-testid="needs-review-flag">Needs review</span>}
      </div>
      <div className="acts">
        {!closed && (
          <Button variant="primary" icon="cash" disabled={!actions.recordPayment.enabled} onClick={() => onRecord(row)} aria-label={`Record payment for ${row.invoiceNumber}`}>
            Record payment
          </Button>
        )}
        <Button variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} payments for ${row.invoiceNumber}`}>
          {open ? "Hide payments" : "Payments"}
        </Button>
        {!closed && !actions.recordPayment.enabled && actions.recordPayment.reason && <span className="why">{actions.recordPayment.reason}</span>}
      </div>
      {open && (
        <div className="col-detail" style={{ gridColumn: "1 / -1" }}>
          <RowDetail row={row} canReceipt={actions.generateReceipt.enabled} />
        </div>
      )}
    </div>
  );
}

function RowDetail({ row, canReceipt }: { row: CollectionRow; canReceipt: boolean }) {
  const q = useReceivableCollections(row.salesInvoiceId, true);
  return (
    <div data-testid="row-detail">
      <ReviewNotes anomalies={row.anomalies} identity={row.identity} />
      {q.loading && !q.collections && <p className="pay-empty">Loading payments…</p>}
      {q.error && !q.collections && (
        <p className="pay-empty" role="alert">
          Couldn&apos;t load the payments: {q.error.message}{" "}
          <button type="button" className="btn ghost" onClick={q.refetch}>
            Retry
          </button>
        </p>
      )}
      {q.collections && <PaymentHistorySection collections={q.collections.collections} events={q.collections.events} invoiceNumber={row.invoiceNumber} customer={customerDescription(row.identity, row.invoiceCustomerName)} canGenerateReceipt={canReceipt} />}
    </div>
  );
}

/** A group of receivables: one governed customer, or the receivables that cannot be put under one. */
export function CollectionGroupView({ group, may, onRecord }: { group: CollectionGroup; may: { view: boolean; record: boolean }; onRecord: (row: CollectionRow) => void }) {
  const title = group.kind === "customer" ? null : group.kind === "unlinked" ? "Not linked to a customer" : "Customer unknown";
  return (
    <section className="card panel col-group" data-testid="collection-group" data-kind={group.kind} aria-label={group.kind === "customer" ? `Receivables of ${group.customer?.customerName}` : title ?? undefined}>
      <div className="col-group-head">
        {group.customer ? <CustomerChip customer={group.customer} /> : <h3>{title}</h3>}
        <span className="col-sum">
          <span>{n(group.rows.length, "invoice", "invoices")}</span>
          <span>
            To collect <MoneyText value={group.balance} />
          </span>
          {group.overdue > 0 && (
            <span className="bad">
              Overdue <MoneyText value={group.overdue} />
            </span>
          )}
        </span>
      </div>
      {group.kind === "unlinked" && <p className="col-note" style={{ padding: "0 16px" }}>Their deals have no customer linked. Open the deal to link one; until then they cannot be put under a customer, and the name on the invoice is not used to guess.</p>}
      {group.kind === "unknown" && <p className="col-note" style={{ padding: "0 16px" }}>The deal behind these invoices was not found or could not be read, so their customer cannot be said.</p>}
      <CollectionsColumnHeads showCustomer={group.kind !== "customer"} />
      <div className="col-rows" role="list">
        {group.rows.map((r) => (
          <div key={r.id} role="listitem">
            <CollectionRowItem row={r} may={may} showCustomer={group.kind !== "customer"} onRecord={onRecord} />
          </div>
        ))}
      </div>
    </section>
  );
}
