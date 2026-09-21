"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { SalesInvoiceStatusTag, PaymentStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { useSalesInvoiceDetail } from "../../../lib/hooks/useSalesInvoices";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";

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
  const { invoice, salesOrder, proforma, quotation, opportunity, loading, error, refetch } = useSalesInvoiceDetail(id);

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
              {invoice.paymentStatus && <PaymentStatusTag status={invoice.paymentStatus} />}
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
                {invoice.dispatchStatus && <div className="f"><label>Status</label><div>{invoice.dispatchStatus}</div></div>}
              </div>
            </Panel>
          )}
          <Panel title="Downstream">
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              This invoice is posted — the backend has already created the linked Accounts Receivable and
              Customer Ledger entries. Payment collection and receivable tracking are a separate,
              not-yet-integrated RevenueOS area; the {invoice.paymentStatus ? "payment status above" : "payment status"} reflects real backend data, but no collection action is offered here.
            </p>
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> This invoice was created from the VERIFIED <code>POST /sales-invoices</code>{" "}
        route, which requires the referenced Dispatch Order to already be DISPATCHED. Taxable amount, GST and
        total are entirely backend-computed (a flat 18% assumption on the sales order&apos;s own total,
        confirmed by reading sales-invoices.service.ts directly — not a real HSN-rate calculation). There is
        no verified endpoint to edit, cancel, or otherwise transition this invoice&apos;s status from this
        screen.
      </DesignNote>
    </div>
  );
}
