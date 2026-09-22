"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { SalesInvoiceStatusTag, AccountsReceivableStatusTag, DispatchOrderStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { RecordPaymentForm } from "../../../components/forms/RecordPaymentForm";
import { useSalesInvoiceDetail } from "../../../lib/hooks/useSalesInvoices";
import { useAccountsReceivableForInvoice } from "../../../lib/hooks/useAccountsReceivable";
import { useRecordPayment } from "../../../lib/hooks/usePaymentCollections";
import { useCustomerStatement } from "../../../lib/hooks/useCustomerStatement";
import { usePaymentLink } from "../../../lib/hooks/usePaymentLinks";
import { useReceiptVoucher } from "../../../lib/hooks/useReceiptVouchers";
import { useToast } from "../../../components/ui/Toast";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";
import { CustomerStatementEntry, PaymentCollectionRecord, PaymentLinkResult, ReceiptVoucher } from "../../../lib/types/domain";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export default function SalesInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const toast = useToast();
  const { invoice, salesOrder, proforma, quotation, opportunity, loading, error, refetch } = useSalesInvoiceDetail(id);
  const { accountsReceivable, loading: arLoading, error: arError, refetch: refetchAr } = useAccountsReceivableForInvoice(id);
  const { recordPayment } = useRecordPayment();
  const { statement, loading: statementLoading, error: statementError, refetch: refetchStatement } = useCustomerStatement(invoice?.customerName);
  const { generate: generatePaymentLink } = usePaymentLink();
  const { generate: generateReceipt } = useReceiptVoucher();

  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [lastPayment, setLastPayment] = useState<PaymentCollectionRecord | null>(null);
  const [receiptVoucher, setReceiptVoucher] = useState<ReceiptVoucher | null>(null);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkResult | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  async function handleGeneratePaymentLink() {
    if (!id) return;
    setGeneratingLink(true);
    setLinkError(null);
    try {
      const result = await generatePaymentLink(id);
      setPaymentLink(result);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Something went wrong generating payment instructions.");
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleGenerateReceipt() {
    if (!lastPayment) return;
    setGeneratingReceipt(true);
    setReceiptError(null);
    try {
      const voucher = await generateReceipt(lastPayment.id);
      setReceiptVoucher(voucher);
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : "Something went wrong generating the receipt.");
    } finally {
      setGeneratingReceipt(false);
    }
  }

  if (loading && !invoice) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  // A fetch failure (network/5xx) is not the same as a genuine not-found —
  // only getById() resolving to null means the invoice truly doesn't exist.
  // Same pattern as Quotation/Proforma/Sales Order detail.
  if (error) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/sales-invoices")}>
          <Icon name="back" size={14} /> Back to Sales Invoices
        </a>
        <Panel title="Couldn't load this sales invoice">
          <EmptyState
            icon="alert"
            title="Something went wrong"
            body={error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={
              <Button variant="ghost" onClick={refetch}>
                Retry
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/sales-invoices")}>
          <Icon name="back" size={14} /> Back to Sales Invoices
        </a>
        <Panel title="Sales invoice not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This sales invoice may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const hasGstSplit = (invoice.cgstAmount ?? 0) > 0 || (invoice.sgstAmount ?? 0) > 0 || (invoice.igstAmount ?? 0) > 0;
  const isOverpaid = accountsReceivable !== null && accountsReceivable !== undefined && accountsReceivable.balanceAmount < 0;

  const statementColumns: Column<CustomerStatementEntry>[] = [
    { key: "entryDate", header: "Date", render: (e) => formatDate(e.entryDate) },
    { key: "debitAmount", header: "Debit", render: (e) => (e.debitAmount > 0 ? formatInr(e.debitAmount) : "—") },
    { key: "creditAmount", header: "Credit", render: (e) => (e.creditAmount > 0 ? formatInr(e.creditAmount) : "—") },
    { key: "balanceAmount", header: "Balance", render: (e) => formatInr(e.balanceAmount) },
    { key: "remarks", header: "Remarks", render: (e) => e.remarks ?? "—" },
  ];

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/sales-invoices")}>
        <Icon name="back" size={14} /> Back to Sales Invoices
      </a>
      <div className="crm-grid">
        <div className="card panel">
          <div className="profile-head">
            <div className="top">
              <div className="av-lg">{initials(invoice.customerName)}</div>
              <div>
                <h3>{invoice.invoiceNumber}</h3>
                <div className="co">{invoice.customerName} · Owner: {invoice.ownerName}</div>
              </div>
            </div>
            <div className="tagrow">
              <SalesInvoiceStatusTag status={invoice.status} />
              {accountsReceivable && <AccountsReceivableStatusTag status={accountsReceivable.paymentStatus} />}
              <Tag color="n">{formatInr(invoice.totalAmount)}</Tag>
            </div>
          </div>

          <div style={{ padding: "16px 19px", borderBottom: "1px solid var(--line-2)" }}>
            <DocumentTrail
              nodes={[
                { key: "lead", label: invoice.customerName, sublabel: "Lead", href: opportunity ? `/leads/${opportunity.leadId}` : undefined },
                ...(opportunity ? [{ key: "opp", label: opportunity.title, sublabel: "Opportunity", href: `/opportunities/${opportunity.id}` }] : []),
                ...(quotation ? [{ key: "quote", label: quotation.quoteNo, sublabel: "Quotation", href: `/quotations/${quotation.id}` }] : []),
                ...(proforma ? [{ key: "proforma", label: proforma.proformaNumber, sublabel: "Proforma Invoice", href: `/proforma-invoices/${proforma.id}` }] : []),
                ...(salesOrder ? [{ key: "so", label: salesOrder.salesOrderCode, sublabel: "Sales Order", href: `/sales-orders/${salesOrder.id}` }] : []),
                { key: "si", label: invoice.invoiceNumber, sublabel: "Sales Invoice", current: true },
              ]}
            />
          </div>

          <div className="info-grid">
            <div className="f"><label>Invoice Date</label><div>{formatDate(invoice.invoiceDate)}</div></div>
            <div className="f"><label>Taxable Amount</label><div>{formatInr(invoice.taxableAmount)}</div></div>
            <div className="f"><label>GST</label><div>{formatInr(invoice.gstAmount)}</div></div>
            <div className="f"><label>Total Amount</label><div><b>{formatInr(invoice.totalAmount)}</b></div></div>
          </div>

          {hasGstSplit && (
            <div className="info-grid">
              {(invoice.cgstAmount ?? 0) > 0 && <div className="f"><label>CGST</label><div>{formatInr(invoice.cgstAmount!)}</div></div>}
              {(invoice.sgstAmount ?? 0) > 0 && <div className="f"><label>SGST</label><div>{formatInr(invoice.sgstAmount!)}</div></div>}
              {(invoice.igstAmount ?? 0) > 0 && <div className="f"><label>IGST</label><div>{formatInr(invoice.igstAmount!)}</div></div>}
            </div>
          )}

          {invoice.remarks && (
            <div style={{ padding: "0 19px 19px" }}>
              <div className="f">
                <label>Remarks</label>
                <div style={{ fontWeight: 400, color: "var(--text)" }}>{invoice.remarks}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {invoice.dispatchOrderNo && (
            <Panel title="Dispatch">
              <div className="info-grid" style={{ padding: 0 }}>
                <div className="f"><label>Dispatch Order</label><div>{invoice.dispatchOrderNo}</div></div>
                {invoice.dispatchStatus && (
                  <div className="f"><label>Status</label><div><DispatchOrderStatusTag status={invoice.dispatchStatus} /></div></div>
                )}
                {invoice.dispatchTransportName && (
                  <div className="f"><label>Transporter</label><div>{invoice.dispatchTransportName}</div></div>
                )}
                {invoice.dispatchVehicleNumber && (
                  <div className="f"><label>Vehicle</label><div>{invoice.dispatchVehicleNumber}</div></div>
                )}
                {invoice.dispatchLrNumber && (
                  <div className="f"><label>LR Number</label><div>{invoice.dispatchLrNumber}</div></div>
                )}
                {invoice.dispatchDestination && (
                  <div className="f"><label>Destination</label><div>{invoice.dispatchDestination}</div></div>
                )}
                {invoice.dispatchExpectedDelivery && (
                  <div className="f"><label>Expected Delivery</label><div>{formatDate(invoice.dispatchExpectedDelivery)}</div></div>
                )}
              </div>
            </Panel>
          )}
          <Panel title="Accounts Receivable">
            {arLoading && !accountsReceivable && <div className="skeleton" style={{ height: 120 }} />}
            {arError && (
              <EmptyState
                icon="alert"
                title="Couldn't load Accounts Receivable"
                body={arError.message || "Something went wrong reaching the RevenueOS backend."}
                action={<Button variant="ghost" onClick={refetchAr}>Retry</Button>}
              />
            )}
            {!arLoading && !arError && !accountsReceivable && (
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                No Accounts Receivable record was found for this invoice.
              </p>
            )}
            {accountsReceivable && (
              <>
                <div className="info-grid" style={{ padding: 0 }}>
                  <div className="f"><label>Invoice Total</label><div>{formatInr(invoice.totalAmount)}</div></div>
                  <div className="f"><label>Paid</label><div>{formatInr(accountsReceivable.paidAmount)}</div></div>
                  <div className="f"><label>Outstanding Balance</label><div style={isOverpaid ? { color: "var(--bad)" } : undefined}><b>{formatInr(accountsReceivable.balanceAmount)}</b></div></div>
                  <div className="f"><label>Due Date</label><div>{formatDate(accountsReceivable.dueDate)}</div></div>
                </div>
                <p style={{ fontSize: 11, color: "var(--faint)", margin: "8px 0 0" }}>
                  Paid amount, balance and status come from the real Accounts Receivable record linked to this
                  invoice — not from the invoice&apos;s own (stale) payment status field.
                </p>
                {isOverpaid && (
                  <p style={{ fontSize: 12, color: "var(--bad)", marginTop: 8 }}>
                    This balance is negative — more has been recorded as paid than was ever outstanding. The
                    backend does not clamp overpayment at zero, so this is shown exactly as returned.
                  </p>
                )}
                <div className="lead-action-row" style={{ marginTop: 12 }}>
                  <Button variant="primary" icon="cash" onClick={() => setShowRecordPayment(true)}>
                    Record Payment
                  </Button>
                  <Button variant="ghost" icon="receipt" onClick={handleGeneratePaymentLink} disabled={generatingLink}>
                    {generatingLink ? "Generating…" : "Payment Instructions"}
                  </Button>
                </div>
                {linkError && <p style={{ color: "var(--bad)", fontSize: 12.5, marginTop: 8 }}>{linkError}</p>}
                {paymentLink && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--line-2)", borderRadius: 8, fontSize: 12.5 }}>
                    {paymentLink.mode === "ONLINE" ? (
                      <>
                        <div><b>Online payment link</b> ({paymentLink.gateway})</div>
                        <div style={{ wordBreak: "break-all" }}>{paymentLink.paymentLink}</div>
                      </>
                    ) : (
                      <>
                        <div><b>Manual bank transfer</b> — {formatInr(paymentLink.amount)}</div>
                        <div>{paymentLink.bankName} · {paymentLink.accountName}</div>
                        <div>A/C {paymentLink.accountNumber} · IFSC {paymentLink.ifscCode}</div>
                        {paymentLink.upiId && <div>UPI: {paymentLink.upiId}</div>}
                      </>
                    )}
                  </div>
                )}
                {lastPayment && (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--good-bg)", borderRadius: 8, fontSize: 12.5 }}>
                    <div><b>Payment just recorded</b> — {formatInr(lastPayment.amount)} via {lastPayment.paymentMode}</div>
                    {!receiptVoucher ? (
                      <Button variant="ghost" onClick={handleGenerateReceipt} disabled={generatingReceipt} style={{ marginTop: 6 }}>
                        {generatingReceipt ? "Generating…" : "Generate Receipt"}
                      </Button>
                    ) : (
                      <div style={{ marginTop: 6 }}>
                        <div>Receipt <b>{receiptVoucher.receiptNumber}</b></div>
                        <div>{formatInr(receiptVoucher.amountReceived)} · {receiptVoucher.paymentMode} · Ref {receiptVoucher.referenceNo}</div>
                      </div>
                    )}
                    {receiptError && <p style={{ color: "var(--bad)", fontSize: 12, marginTop: 6 }}>{receiptError}</p>}
                    <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 6 }}>
                      Only available immediately after this payment — the backend has no way to look up a
                      past payment to generate a receipt for later.
                    </p>
                  </div>
                )}
              </>
            )}
          </Panel>
          <Panel title="Customer Collection History" flush>
            {statementLoading && !statement && <div className="skeleton" style={{ height: 100, margin: 16 }} />}
            {statementError && (
              <div style={{ padding: 16 }}>
                <EmptyState
                  icon="alert"
                  title="Couldn't load collection history"
                  body={statementError.message || "Something went wrong reaching the RevenueOS backend."}
                />
              </div>
            )}
            {statement && statement.entries.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--muted)", padding: 16 }}>
                No ledger activity found for {invoice.customerName}.
              </p>
            )}
            {statement && statement.entries.length > 0 && (
              <>
                <div className="info-grid" style={{ padding: "12px 19px 0" }}>
                  <div className="f"><label>Opening Balance</label><div>{formatInr(statement.openingBalance)}</div></div>
                  <div className="f"><label>Closing Balance</label><div>{formatInr(statement.closingBalance)}</div></div>
                </div>
                <DataTable columns={statementColumns} rows={statement.entries} emptyTitle="No ledger activity" />
              </>
            )}
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> This invoice was created from the VERIFIED <code>POST /sales-invoices</code>{" "}
        route, which requires the referenced Dispatch Order to already be DISPATCHED. Taxable amount, GST and
        total are entirely backend-computed (a flat 18% assumption on the sales order&apos;s own total,
        confirmed by reading sales-invoices.service.ts directly — not a real HSN-rate calculation). There is
        no verified endpoint to edit, cancel, or otherwise transition this invoice&apos;s status from this
        screen. Record Payment calls the VERIFIED <code>POST /payment-collections</code> route — the real
        source of truth for paid amount, balance and status is the linked Accounts Receivable record, never
        this invoice&apos;s own <code>paymentStatus</code> field (confirmed stale: real PAID/WRITTEN_OFF
        Accounts Receivable records still show their invoice stuck at Pending). There is no way to list past
        payments — Generate Receipt only works immediately after recording one, using the id from that
        payment&apos;s own response, and Collection History above is read from the real Customer Ledger, not
        from individual payment records (payment mode only appears inside its free-text remarks).
      </DesignNote>

      {showRecordPayment && accountsReceivable && (
        <RecordPaymentForm
          salesInvoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          outstandingBalance={accountsReceivable.balanceAmount}
          onClose={() => setShowRecordPayment(false)}
          onSubmit={async (input) => {
            const result = await recordPayment(input);
            setLastPayment(result.paymentRecord);
            setReceiptVoucher(null);
            setReceiptError(null);
            refetchAr();
            refetchStatement();
            return result;
          }}
        />
      )}
    </div>
  );
}
