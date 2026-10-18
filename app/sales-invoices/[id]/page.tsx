"use client";

import { useParams } from "next/navigation";
import { Panel } from "../../../components/ui/Card";
import { DocumentCustomer } from "../../../components/ui/DocumentCustomer";
import { SalesInvoiceStatusTag, AccountsReceivableStatusTag, DispatchOrderStatusTag, Tag } from "../../../components/ui/Tag";
import { BackLink } from "../../../components/ui/BackLink";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { ReceivableCollectionsPanel } from "../../../components/collections/ReceivableCollectionsPanel";
import { useSalesInvoiceDetail } from "../../../lib/hooks/useSalesInvoices";
import { useReceivableCollections } from "../../../lib/hooks/useCollections";
import { useAuth } from "../../../lib/auth/AuthContext";
import { identityOf } from "../../../lib/repository/shared/collections";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";
import { DocumentActions } from "../../../components/ui/DocumentActions";
import { DocumentLinesPanel } from "../../../components/ui/DocumentLinesPanel";
import { useDocumentDownload } from "../../../lib/hooks/useDocumentDownload";
import { useRepository } from "../../../lib/repository/RepositoryProvider";


export default function SalesInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { invoice, salesOrder, proforma, quotation, opportunity, opportunityStatus, loading, error, refetch } = useSalesInvoiceDetail(id);
  const { hasPermission } = useAuth();
  const repo = useRepository();
  const { downloading, download } = useDocumentDownload();
  const canViewInvoices = hasPermission("invoices.view");
  // VERIFIED (backend 2026-10-16): the tax-invoice PDF also needs invoices.document.view,
  // which is granted to nobody until the accountant has confirmed e-invoicing applicability.
  const canPrintTaxInvoice = hasPermission("invoices.document.view");
  const canView = hasPermission("collections.view");
  const canRecord = hasPermission("collections.record");
  const collectionsQuery = useReceivableCollections(id, canView);
  const accountsReceivable = collectionsQuery.collections?.receivable ?? null;
  // The customer on this page is the deal's governed one, never a name on the invoice.
  const identity = invoice && opportunityStatus !== "loading" ? identityOf(invoice, opportunityStatus === "ready" && opportunity ? [opportunity] : null) : undefined;

  if (!canViewInvoices) {
    return (
      <div className="page">
        <BackLink fallback="/sales-invoices">Back to Sales Invoices</BackLink>
        <Panel title="Sales invoice">
          <EmptyState icon="lock" title="No access" body="You don't have permission to view invoices." />
        </Panel>
      </div>
    );
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
        <BackLink fallback="/sales-invoices">Back to Sales Invoices</BackLink>
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
        <BackLink fallback="/sales-invoices">Back to Sales Invoices</BackLink>
        <Panel title="Sales invoice not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This sales invoice may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const hasGstSplit = (invoice.cgstAmount ?? 0) > 0 || (invoice.sgstAmount ?? 0) > 0 || (invoice.igstAmount ?? 0) > 0;
  return (
    <div className="page">
      <BackLink fallback="/sales-invoices">Back to Sales Invoices</BackLink>
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
              <DocumentCustomer opportunity={opportunity ?? null} status={opportunityStatus} />
            </div>
          </div>

          {canPrintTaxInvoice ? (
            <DocumentActions
              testId="invoice-actions"
              actions={[
                {
                  key: "pdf",
                  label: downloading ? "Preparing PDF…" : "Download tax invoice (PDF)",
                  icon: "file",
                  state: invoice.numbered
                    ? { enabled: !downloading }
                    : { enabled: false, reason: "Issued before invoices were numbered: it can't be printed as a tax invoice." },
                  onClick: () => download(() => repo.salesInvoices.downloadPdf(invoice.id), `${invoice.invoiceNumber} downloaded`),
                },
              ]}
            />
          ) : (
            <p className="dc-why" style={{ padding: "0 19px 12px", margin: 0 }} data-testid="tax-invoice-disabled">
              Tax-invoice printing is not enabled yet: it is switched on once the accountant has confirmed the e-invoicing
              requirements.
            </p>
          )}

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
          <DocumentLinesPanel lines={invoice.items} emptyText="This invoice was issued before its priced lines were stored." />
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
          <ReceivableCollectionsPanel invoice={invoice} identity={identity} canView={canView} canRecord={canRecord} query={collectionsQuery} />
        </div>
      </div>

    </div>
  );
}
