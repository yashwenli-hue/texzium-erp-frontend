"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { SalesOrderStatusTag, SalesInvoiceStatusTag, DispatchOrderStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { SalesInvoiceForm } from "../../../components/forms/SalesInvoiceForm";
import { useSalesOrderDetail } from "../../../lib/hooks/useSalesOrders";
import { useSalesInvoices } from "../../../lib/hooks/useSalesInvoices";
import { useDispatchOrders } from "../../../lib/hooks/useDispatchOrders";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";
import { SalesInvoice } from "../../../lib/types/domain";

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
  const { salesInvoices, createSalesInvoice, refetch: refetchInvoices } = useSalesInvoices();
  const { dispatchOrders } = useDispatchOrders();
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

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
  // READY_FOR_INVOICING is the real status the Dispatch Orders service
  // writes onto a Sales Order the moment a linked Dispatch Order is marked
  // DISPATCHED — not a frontend-invented gate. The matching-order lookup is
  // a frontend safeguard on top of that: the backend itself does not check
  // that a Sales Invoice's dispatchOrderId actually belongs to its
  // salesOrderId (confirmed by reading sales-invoices.service.ts directly),
  // so this only ever offers a Dispatch Order that's both DISPATCHED and
  // genuinely linked to this Sales Order. See the Stage 2F report.
  const matchingDispatchedOrders = dispatchOrders.filter((d) => d.salesOrderId === salesOrder.id && d.status === "DISPATCHED");
  // Read-only OperationsOS visibility — every Dispatch Order linked to this
  // Sales Order, regardless of status, not just the DISPATCHED ones used to
  // gate invoice creation above. No create/pack/dispatch action exists here.
  const linkedDispatchOrders = dispatchOrders.filter((d) => d.salesOrderId === salesOrder.id);
  const canCreateInvoice = salesOrder.status === "READY_FOR_INVOICING" && matchingDispatchedOrders.length > 0;
  const relatedInvoices = salesInvoices.filter((i) => i.salesOrderId === salesOrder.id);
  const invoiceColumns: Column<SalesInvoice>[] = [
    { key: "invoiceNumber", header: "Invoice No.", render: (i) => i.invoiceNumber },
    { key: "totalAmount", header: "Amount", render: (i) => formatInr(i.totalAmount) },
    { key: "status", header: "Status", render: (i) => <SalesInvoiceStatusTag status={i.status} /> },
  ];

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
          <Panel
            title="Related Sales Invoices"
            flush
            extraHead={
              canCreateInvoice ? (
                <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowInvoiceForm(true); }}>
                  <Icon name="plus" size={14} /> Create Sales Invoice
                </a>
              ) : undefined
            }
          >
            <DataTable
              columns={invoiceColumns}
              rows={relatedInvoices}
              onRowClick={(i) => router.push(`/sales-invoices/${i.id}`)}
              emptyTitle="No sales invoices yet"
              emptyBody={
                canCreateInvoice
                  ? "Create one now that a dispatched shipment exists for this order."
                  : salesOrder.status === "READY_FOR_INVOICING"
                  ? "This order is ready to invoice, but no matching dispatched order was found for it."
                  : "This order needs a dispatched shipment before it can be invoiced."
              }
            />
          </Panel>
          {linkedDispatchOrders.length > 0 && (
            <Panel title="Dispatch">
              {linkedDispatchOrders.map((d) => (
                <div key={d.id} className="info-grid" style={{ padding: 0, marginBottom: 12 }}>
                  <div className="f"><label>Dispatch Order</label><div>{d.dispatchOrderNo}</div></div>
                  <div className="f"><label>Status</label><div><DispatchOrderStatusTag status={d.status} /></div></div>
                  {d.dispatchDate && <div className="f"><label>Dispatch Date</label><div>{formatDate(d.dispatchDate)}</div></div>}
                  {d.transportName && <div className="f"><label>Transporter</label><div>{d.transportName}</div></div>}
                  {d.vehicleNumber && <div className="f"><label>Vehicle</label><div>{d.vehicleNumber}</div></div>}
                  {d.lrNumber && <div className="f"><label>LR Number</label><div>{d.lrNumber}</div></div>}
                  {d.destination && <div className="f"><label>Destination</label><div>{d.destination}</div></div>}
                  {d.expectedDelivery && <div className="f"><label>Expected Delivery</label><div>{formatDate(d.expectedDelivery)}</div></div>}
                </div>
              ))}
            </Panel>
          )}
          <Panel title="Downstream">
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              There is no verified action to approve, reject, or otherwise move this order through its own
              status from this screen — the RevenueOS Sales Orders API only supports creating and listing
              orders. Its remaining lifecycle (store approval, advance receipt, accounts approval) belongs to
              separate backend modules with no confirmed screen here yet. Dispatch is the one exception: once
              a Dispatch Order linked to this order is marked DISPATCHED (an OperationsOS action outside this
              app), this order&apos;s status becomes &quot;Ready For Invoicing&quot; and Create Sales Invoice
              above becomes available.
            </p>
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> This order was created either by converting an approved Quotation (
        <code>POST /quotations/:id/convert</code>, linked by quotationId, always status <code>OPEN</code>) or
        directly from an approved Proforma Invoice (<code>POST /sales-orders</code>, linked by
        proformaInvoiceId, always status <code>PENDING_STORE_APPROVAL</code>) — never both, and the backend
        does not connect the two paths. &quot;Ready For Invoicing&quot; is written by the OperationsOS
        Dispatch Orders service the moment a linked Dispatch Order is marked DISPATCHED — the intended
        lifecycle is Sales Order → Dispatch Order → Sales Invoice, so Create Sales Invoice above only appears
        once that real status is reached and a matching dispatched order is found; there is no
        Quotation/Proforma → Sales Invoice shortcut anywhere in this app.
      </DesignNote>

      {showInvoiceForm && (
        <SalesInvoiceForm
          salesOrderId={salesOrder.id}
          salesOrderCode={salesOrder.salesOrderCode}
          defaultCustomerName={salesOrder.customerName}
          dispatchOrders={matchingDispatchedOrders}
          onClose={() => setShowInvoiceForm(false)}
          onSubmit={async (input) => {
            const invoice = await createSalesInvoice(input);
            refetchInvoices();
            return invoice;
          }}
        />
      )}
    </div>
  );
}
