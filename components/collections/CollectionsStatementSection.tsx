"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { MoneyText } from "../ui/MoneyText";
import { CollectionStateTag, DueLine, PaymentHistoryList, ReviewNotes } from "./parts";
import { PaymentTarget, RecordPaymentDialog } from "./RecordPaymentDialog";
import { useInvoicePayments } from "../../lib/hooks/useCollections";
import { COLLECTIONS_STATEMENT_NOTE, CollectionState, DUE_DATE_DISCLOSURE, buildCollectionsStatement, collectionActions, daysUntil, formatDay, isOpenState } from "../../lib/repository/shared/collections";
import { Customer, CustomerOverviewInvoice } from "../../lib/types/domain";

/**
 * A customer's Collections Statement: each posted invoice, its receivable, and the payments
 * collected against it. It is built from RevenueOS receivables and payment collections only. It
 * is not a FinanceOS or general-ledger accounting statement, and says so on its face.
 *
 * Only ever rendered for someone with collections.view, and given the overview with its
 * receivables: the cockpit takes them out for everyone else.
 */
export function CollectionsStatementSection({ customer, invoices, canRecord, onChanged, now }: { customer: Pick<Customer, "id" | "customerName" | "customerCode" | "isActive">; invoices: CustomerOverviewInvoice[]; canRecord: boolean; onChanged?: () => void; now: Date }) {
  const posted = invoices.filter((i) => i.status === "POSTED");
  const { byInvoice, loading, refetch } = useInvoicePayments(posted.map((i) => i.id), true);
  const [recording, setRecording] = useState<PaymentTarget | null>(null);

  const statement = useMemo(
    () =>
      buildCollectionsStatement({
        invoices,
        payments: Object.fromEntries(posted.map((i) => [i.id, loading && !byInvoice[i.id] ? null : byInvoice[i.id]?.collections ?? null])),
        now,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, byInvoice, loading, now]
  );
  const identity = { kind: "linked" as const, customer: { id: customer.id, customerCode: customer.customerCode, customerName: customer.customerName, isActive: customer.isActive }, opportunityId: "" };

  return (
    <section className="card panel stmt col-scope" id="collections" aria-labelledby="collections-title" data-testid="collections-statement">
      <div className="panel-head">
        <h3 id="collections-title">Collections Statement</h3>
        <Link className="more" href={`/payments?customer=${customer.id}`}>
          Open in Collections
        </Link>
      </div>
      <p className="stmt-note" data-testid="statement-note">
        {COLLECTIONS_STATEMENT_NOTE} As of {formatDay(statement.asOf)}.
      </p>
      {statement.invoices.length === 0 ? (
        <p className="pay-empty" style={{ padding: "0 21px 16px" }}>
          No invoice has been posted for this customer yet.
        </p>
      ) : (
        <>
          {statement.invoices.map((inv) => {
            const state: CollectionState | undefined = inv.state;
            const open = state !== undefined && isOpenState(state);
            const actions = state
              ? collectionActions({ may: { view: true, record: canRecord }, row: { state, invoiceStatus: "POSTED", invoiceCustomerName: customer.customerName, paymentStatus: invoices.find((i) => i.id === inv.invoiceId)?.receivables[0]?.paymentStatus ?? "", balance: inv.balance } })
              : undefined;
            return (
              <div key={inv.invoiceId} className="stmt-inv" data-testid="statement-invoice">
                <div className="stmt-head">
                  <Link href={`/sales-invoices/${inv.invoiceId}`}>
                    <b>{inv.invoiceNumber}</b>
                  </Link>
                  <span>{formatDay(inv.invoiceDate)}</span>
                  {state && <CollectionStateTag state={state} />}
                  {state && inv.dueDate && (
                    <span className="due" style={{ display: "inline-flex", gap: 8 }}>
                      <DueLine state={state} days={daysUntil(inv.dueDate, now)} dueDate={inv.dueDate} />
                    </span>
                  )}
                  <span className="num" style={{ marginLeft: "auto" }}>
                    Invoiced <MoneyText value={inv.invoiced} mode="exact" /> · Paid <MoneyText value={inv.paid} mode="exact" /> · <b>Balance <MoneyText value={inv.balance} mode="exact" /></b>
                  </span>
                </div>
                {inv.anomalies.length > 0 && <ReviewNotes anomalies={inv.anomalies} identity={identity} />}
                {inv.payments === null ? (
                  <p className="pay-empty">{loading ? "Loading payments…" : "The payments of this invoice couldn't be read."}</p>
                ) : (
                  <Disclosure summary="Payments" count={inv.payments.length}>
                    <PaymentHistoryList collections={inv.payments} events={byInvoice[inv.invoiceId]?.events ?? []} />
                  </Disclosure>
                )}
                {open && actions && (
                  <div style={{ marginTop: 8 }}>
                    <Button variant="primary" icon="cash" disabled={!actions.recordPayment.enabled} onClick={() => setRecording({ salesInvoiceId: inv.invoiceId, invoiceNumber: inv.invoiceNumber, identity, invoiceCustomerName: customer.customerName, balance: inv.balance, state, dueDate: inv.dueDate })}>
                      Record payment
                    </Button>
                    {!actions.recordPayment.enabled && actions.recordPayment.reason && <p className="col-note">{actions.recordPayment.reason}</p>}
                  </div>
                )}
              </div>
            );
          })}
          <div className="stmt-totals" data-testid="statement-totals">
            <div>
              <span className="k">Invoiced</span>
              <MoneyText value={statement.totals.invoiced} />
            </div>
            <div>
              <span className="k">Paid</span>
              <MoneyText value={statement.totals.collected} />
            </div>
            <div>
              <span className="k">Outstanding</span>
              <b>
                <MoneyText value={statement.totals.outstanding} />
              </b>
            </div>
            <div>
              <span className="k">Overdue</span>
              <span style={statement.totals.overdue > 0 ? { color: "var(--bad)" } : undefined}>
                <MoneyText value={statement.totals.overdue} />
              </span>
            </div>
          </div>
          <p className="stmt-note">
            Outstanding is the sum of the open receivables as recorded; written-off receivables are not in it
            {statement.totals.writtenOff > 0 ? ` (${statement.totals.writtenOff} written off)` : ""}. {statement.paymentsComplete ? "" : "Some invoices' payments couldn't be read, so their payment checks are skipped."}
          </p>
          <Disclosure summary="About the due dates">
            <p style={{ fontSize: 12.5, margin: 0 }}>{DUE_DATE_DISCLOSURE}</p>
          </Disclosure>
        </>
      )}
      {recording && (
        <RecordPaymentDialog
          target={recording}
          liveBalance={statement.invoices.find((i) => i.invoiceId === recording.salesInvoiceId)?.balance}
          onClose={() => setRecording(null)}
          onRecorded={() => {
            refetch();
            onChanged?.();
          }}
          onStale={() => {
            refetch();
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}
