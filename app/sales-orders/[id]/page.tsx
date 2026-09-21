"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { SalesOrderStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { useSalesOrderDetail } from "../../../lib/hooks/useSalesOrders";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { salesOrder, proforma, quotation, opportunity, loading, error, refetch } = useSalesOrderDetail(id);

  if (loading && !salesOrder) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  // A fetch failure (network/5xx) is not the same as a genuine not-found —
  // only getById() resolving to null means the sales order truly doesn't
  // exist. Same pattern as Opportunity/Quotation/Proforma detail.
  if (error) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/sales-orders")}>
          <Icon name="back" size={14} /> Back to Sales Orders
        </a>
        <Panel title="Couldn't load this sales order">
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

  if (!salesOrder) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/sales-orders")}>
          <Icon name="back" size={14} /> Back to Sales Orders
        </a>
        <Panel title="Sales order not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This sales order may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const hasGstDetails = salesOrder.sellerGstId || salesOrder.buyerGstId || salesOrder.taxType || salesOrder.placeOfSupply;

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/sales-orders")}>
        <Icon name="back" size={14} /> Back to Sales Orders
      </a>
      <div className="crm-grid">
        <div className="card panel">
          <div className="profile-head">
            <div className="top">
              <div className="av-lg">{initials(salesOrder.customerName)}</div>
              <div>
                <h3>{salesOrder.salesOrderCode}</h3>
                <div className="co">{salesOrder.customerName} · Owner: {salesOrder.ownerName}</div>
              </div>
            </div>
            <div className="tagrow">
              <SalesOrderStatusTag status={salesOrder.status} />
              <Tag color="n">{formatInr(salesOrder.totalAmount)}</Tag>
            </div>
          </div>

          <div style={{ padding: "16px 19px", borderBottom: "1px solid var(--line-2)" }}>
            <DocumentTrail
              nodes={[
                { key: "lead", label: salesOrder.customerName, sublabel: "Lead", href: opportunity ? `/leads/${opportunity.leadId}` : undefined },
                ...(opportunity ? [{ key: "opp", label: opportunity.title, sublabel: "Opportunity", href: `/opportunities/${opportunity.id}` }] : []),
                ...(quotation ? [{ key: "quote", label: quotation.quoteNo, sublabel: "Quotation", href: `/quotations/${quotation.id}` }] : []),
                ...(proforma ? [{ key: "proforma", label: proforma.proformaNumber, sublabel: "Proforma Invoice", href: `/proforma-invoices/${proforma.id}` }] : []),
                { key: "so", label: salesOrder.salesOrderCode, sublabel: "Sales Order", current: true },
              ]}
            />
          </div>

          <div className="info-grid">
            <div className="f"><label>Order Date</label><div>{formatDate(salesOrder.orderDate)}</div></div>
            <div className="f"><label>Total Amount</label><div><b>{formatInr(salesOrder.totalAmount)}</b></div></div>
            {salesOrder.taxType && <div className="f"><label>Tax Type</label><div>{salesOrder.taxType}</div></div>}
            {salesOrder.placeOfSupply && <div className="f"><label>Place of Supply</label><div>{salesOrder.placeOfSupply}</div></div>}
          </div>

          {!hasGstDetails && (
            <div style={{ padding: "0 19px 19px" }}>
              <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
                No seller/buyer GST or tax type on this order — it was created by converting a Quotation, which
                doesn&apos;t collect or copy that information (confirmed by reading quotations.service.ts directly).
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Downstream">
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              There is no verified action to approve, reject, or otherwise move this order past its current
              status from this screen — the RevenueOS Sales Orders API only supports creating and listing
              orders. Its remaining lifecycle (store approval, advance receipt, accounts approval, dispatch,
              invoicing) belongs to separate backend modules with no confirmed screen here yet.
            </p>
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> This order was created either by converting an approved Quotation (
        <code>POST /quotations/:id/convert</code>, linked by quotationId, always status <code>OPEN</code>) or
        directly from an approved Proforma Invoice (<code>POST /sales-orders</code>, linked by
        proformaInvoiceId, always status <code>PENDING_STORE_APPROVAL</code>) — never both, and the backend
        does not connect the two paths. Any other status value seen elsewhere in this app (e.g.
        &quot;Ready For Invoicing&quot;) is written by unrelated Dispatch/Workflow modules outside RevenueOS,
        not by anything reachable from this screen.
      </DesignNote>
    </div>
  );
}
