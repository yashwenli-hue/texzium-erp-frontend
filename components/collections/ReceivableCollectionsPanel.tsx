"use client";

import { useMemo, useState } from "react";
import { Panel } from "../ui/Card";
import { Button, EmptyState } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { LoadingRegion } from "../ui/LoadingRegion";
import { MoneyText } from "../ui/MoneyText";
import { CollectionStateTag, DueLine, ReviewNotes } from "./parts";
import { PaymentTarget, RecordPaymentDialog } from "./RecordPaymentDialog";
import { PaymentHistorySection } from "./PaymentHistorySection";
import { usePaymentLink } from "../../lib/hooks/usePaymentLinks";
import { useReceivableCollections } from "../../lib/hooks/useCollections";
import { CollectionRow, CustomerIdentity, DUE_DATE_DISCLOSURE, buildCollectionRows, collectionActions, customerDescription } from "../../lib/repository/shared/collections";
import { InvoiceCollections, PaymentLinkResult, SalesInvoice } from "../../lib/types/domain";
import { formatInr } from "../../lib/format";

type CollectionsQuery = ReturnType<typeof useReceivableCollections>;

/**
 * An invoice's collections, on the invoice: what is owed and since when, who recorded each
 * payment, and the one action (Record payment). It replaces the old receivable panel and the
 * ledger "collection history" keyed by customer name: the payments here are the invoice's own,
 * read by the invoice, and the customer is only ever the governed one.
 */
export function ReceivableCollectionsPanel({ invoice, identity, canView, canRecord, query }: { invoice: SalesInvoice; identity: CustomerIdentity | undefined; canView: boolean; canRecord: boolean; query: CollectionsQuery }) {
  const { generate: generateLink } = usePaymentLink();
  const { collections, loading, error, refetch } = query;

  const [recording, setRecording] = useState<PaymentTarget | null>(null);
  const [link, setLink] = useState<PaymentLinkResult | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const row: CollectionRow | undefined = useMemo(() => {
    if (!collections) return undefined;
    const r = buildCollectionRows({ receivables: [collections.receivable], invoices: [invoice], opportunities: null, collections: collections.collections, now: new Date() })[0];
    return identity ? { ...r, identity, needsReview: r.anomalies.length > 0 || identity.kind === "unlinked" } : r;
  }, [collections, invoice, identity]);

  if (!canView) {
    return (
      <Panel title="Collections">
        <EmptyState icon="lock" title="You can't view collections" body="Payments and receivables need the View Payment Collections permission." />
      </Panel>
    );
  }

  const actions = row ? collectionActions({ may: { view: canView, record: canRecord }, row }) : undefined;
  const open = row && row.state !== "PAID" && row.state !== "WRITTEN_OFF";

  async function showInstructions() {
    setLinkBusy(true);
    setLinkError(null);
    try {
      setLink(await generateLink(invoice.id));
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Something went wrong preparing the payment instructions.");
    } finally {
      setLinkBusy(false);
    }
  }

  const customerText = row ? customerDescription(row.identity, row.invoiceCustomerName) : "";

  return (
    <Panel title="Collections">
      <LoadingRegion label="Loading collections">
        {loading && !collections && <div className="skeleton" style={{ height: 150 }} />}
      </LoadingRegion>
      {error && !collections && (
        <EmptyState icon="alert" title="Couldn't load the collections" body={error.message || "Something went wrong reaching the RevenueOS backend."} action={<Button variant="ghost" onClick={refetch}>Retry</Button>} />
      )}
      {collections && row && (
        <div className="col-scope" data-testid="receivable-panel">
          <div className="info-grid" style={{ padding: 0 }}>
            <div className="f">
              <label>Invoiced</label>
              <div>
                <MoneyText value={row.invoiced} mode="exact" />
              </div>
            </div>
            <div className="f">
              <label>Paid</label>
              <div>
                <MoneyText value={row.paid} mode="exact" />
              </div>
            </div>
            <div className="f">
              <label>Outstanding</label>
              <div style={row.balance < 0 ? { color: "var(--bad)" } : undefined}>
                <b>
                  <MoneyText value={row.balance} mode="exact" />
                </b>
              </div>
            </div>
            <div className="f">
              <label>Due</label>
              <div className="due" style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
                <CollectionStateTag state={row.state} />
                <DueLine state={row.state} days={row.daysUntilDue} dueDate={row.dueDate} dueIsInvoiceDate={row.dueIsInvoiceDate && !!open} />
              </div>
            </div>
          </div>
          <ReviewNotes anomalies={row.anomalies} identity={row.identity} />
          <Disclosure summary="About the due date">
            <p style={{ fontSize: 12.5, margin: 0 }}>{DUE_DATE_DISCLOSURE}</p>
          </Disclosure>

          <div className="lead-action-row" style={{ marginTop: 12 }}>
            {open && actions && (
              <Button
                variant="primary"
                icon="cash"
                disabled={!actions.recordPayment.enabled}
                onClick={() => setRecording({ salesInvoiceId: invoice.id, invoiceNumber: row.invoiceNumber, identity: row.identity, invoiceCustomerName: row.invoiceCustomerName, balance: row.balance, state: row.state, dueDate: row.dueDate })}
              >
                Record payment
              </Button>
            )}
            <Button variant="ghost" icon="receipt" onClick={showInstructions} disabled={linkBusy}>
              {linkBusy ? "Preparing…" : "Payment instructions"}
            </Button>
          </div>
          {open && actions && !actions.recordPayment.enabled && actions.recordPayment.reason && (
            <p className="col-note" data-testid="record-disabled-reason">
              {actions.recordPayment.reason}
            </p>
          )}
          {linkError && <p className="form-error" style={{ color: "var(--bad)", fontSize: 12.5, marginTop: 8 }}>{linkError}</p>}
          {link && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--line-2)", borderRadius: 8, fontSize: 12.5 }} data-testid="payment-instructions">
              {link.mode === "ONLINE" ? (
                <>
                  <div>
                    <b>Online payment</b> ({link.gateway})
                  </div>
                  <div style={{ wordBreak: "break-all" }}>{link.paymentLink}</div>
                </>
              ) : (
                <>
                  <div>
                    <b>Bank transfer</b>: {formatInr(link.amount)}
                  </div>
                  <div>
                    {link.bankName} · {link.accountName}
                  </div>
                  <div>
                    A/C {link.accountNumber} · IFSC {link.ifscCode}
                  </div>
                  {link.upiId && <div>UPI: {link.upiId}</div>}
                </>
              )}
            </div>
          )}

          <h4 style={{ margin: "18px 0 4px", fontSize: 13 }}>Payments</h4>
          <PaymentHistorySection collections={collections.collections} events={collections.events} invoiceNumber={row.invoiceNumber} customer={customerText} canGenerateReceipt={!!actions?.generateReceipt.enabled} />
        </div>
      )}
      {recording && (
        <RecordPaymentDialog
          target={recording}
          liveBalance={row?.balance}
          onClose={() => setRecording(null)}
          onRecorded={() => refetch()}
          onStale={() => refetch()}
        />
      )}
    </Panel>
  );
}

export type { InvoiceCollections };
