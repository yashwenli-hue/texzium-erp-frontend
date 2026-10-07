"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { ProformaInvoiceStatusTag, QuotationStatusTag, SalesOrderStatusTag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { CommercialSummary } from "../../../components/ui/CommercialSummary";
import { DocumentActions, DocumentAction } from "../../../components/ui/DocumentActions";
import { ChainStage, DocumentChain } from "../../../components/ui/DocumentChain";
import { ProformaCallout } from "../../../components/ui/ProformaCallout";
import { ProformaHistory } from "../../../components/ui/DocumentLifecycleHistory";
import { SalesOrderForm } from "../../../components/forms/SalesOrderForm";
import { useProformaInvoiceDetail } from "../../../lib/hooks/useProformaInvoices";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../lib/auth/AuthContext";
import { SALES_ORDER_PERMISSIONS, isLiveSalesOrder } from "../../../lib/repository/shared/salesOrderLifecycle";
import { PROFORMA_PERMISSIONS, proformaActions, validityLabel } from "../../../lib/repository/shared/proformaLifecycle";
import { isLegacyTaxBreakdown, quotationAmounts } from "../../../lib/repository/shared/quotationLifecycle";
import { formatDate, formatInrExact } from "../../../lib/format";
import { SalesOrder } from "../../../lib/types/domain";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export default function ProformaInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const id = params?.id;
  const {
    proforma,
    quotation,
    opportunity,
    loading,
    error,
    refetch,
    refreshAll,
    events,
    eventsLoading,
    eventsError,
    orders,
    ordersKnown,
    approveProformaInvoice,
    cancelProformaInvoice,
    createSalesOrder,
  } = useProformaInvoiceDetail(id);
  const [dialog, setDialog] = useState<null | "approve" | "cancel" | "order">(null);

  if (loading && !proforma) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 140, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 90, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  // A fetch failure (network/5xx/403) is not the same as a genuine not-found —
  // only getById() resolving to null means the proforma invoice truly doesn't exist.
  if (error) {
    const forbidden = (error as { status?: number }).status === 403;
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/proforma-invoices")}>
          <Icon name="back" size={14} /> Back to Proforma Invoices
        </a>
        <Panel title="Couldn't load this proforma invoice">
          <EmptyState
            icon="alert"
            title={forbidden ? "You don't have access to Proforma Invoices" : "Something went wrong"}
            body={forbidden ? "Viewing Proforma Invoices needs the proformas.view permission. Ask an administrator to grant it, then sign in again." : error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
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

  if (!proforma) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/proforma-invoices")}>
          <Icon name="back" size={14} /> Back to Proforma Invoices
        </a>
        <Panel title="Proforma invoice not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This proforma invoice may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  // Sales Orders that came from this Proforma, newest first. Cancelled ones stay
  // as history; only a live one blocks cancelling the Proforma or creating another.
  const allOrders = orders.filter((o) => o.proformaInvoiceId === proforma.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const liveOrders = allOrders.filter((o) => isLiveSalesOrder(o.status));

  const actions = proformaActions({
    status: proforma.status,
    isExpired: proforma.isExpired,
    validityDate: proforma.validityDate,
    quotationStatus: quotation?.status,
    may: {
      approve: hasPermission(PROFORMA_PERMISSIONS.approve),
      cancel: hasPermission(PROFORMA_PERMISSIONS.cancel),
      createSalesOrder: hasPermission(SALES_ORDER_PERMISSIONS.create),
    },
    liveOrderLabels: liveOrders.map((o) => o.salesOrderCode),
  });

  const actionList: DocumentAction[] = [
    { key: "approve", label: "Approve", icon: "check", variant: "primary", state: actions.approve, onClick: () => setDialog("approve") },
    { key: "createSalesOrder", label: "Create Sales Order", icon: "cart", variant: proforma.status === "APPROVED" && actions.createSalesOrder.enabled ? "primary" : "ghost", state: actions.createSalesOrder, onClick: () => setDialog("order") },
    { key: "cancel", label: "Cancel Proforma", icon: "close", className: "danger-ghost", state: actions.cancel, onClick: () => setDialog("cancel") },
  ];

  const quotationAmountsKnown = quotation ? quotationAmounts(quotation) : null;
  const quotationLegacy = quotation ? isLegacyTaxBreakdown(quotation) : true;
  const totalDiffers = !!quotation && Math.abs((quotation.totalAmount ?? quotation.amount) - proforma.totalAmount) > 0.011;
  const v = validityLabel(proforma.validityDate);

  const quotationStage: ChainStage = quotation
    ? {
        key: "quotation",
        label: "Quotation",
        title: quotation.quoteNo,
        href: `/quotations/${quotation.id}`,
        status: <QuotationStatusTag status={quotation.status} />,
        hint: quotation.status === "APPROVED" ? "Source of this Proforma's amount" : "No longer approved",
        state: quotation.status === "APPROVED" ? "normal" : "attention",
      }
    : { key: "quotation", label: "Quotation", title: proforma.quoteNo, href: `/quotations/${proforma.quotationId}`, hint: "Source of this Proforma's amount", state: "normal" };
  const orderStage: ChainStage = liveOrders.length
    ? { key: "order", label: "Sales Order", title: liveOrders[0].salesOrderCode, href: `/sales-orders/${liveOrders[0].id}`, status: <SalesOrderStatusTag status={liveOrders[0].status} />, hint: "Total taken from this Proforma", state: "normal" }
    : {
        key: "order",
        label: "Sales Order",
        title: "Not created yet",
        hint: allOrders.length ? `${allOrders.length} cancelled earlier. ${actions.createSalesOrder.enabled ? "A replacement can be created." : ""}`.trim() : actions.createSalesOrder.enabled ? "Ready to create from this Proforma." : "Needs an approved, unexpired Proforma.",
        state: proforma.status === "CANCELLED" ? "closed" : "upcoming",
      };

  const orderColumns: Column<SalesOrder>[] = [
    { key: "salesOrderCode", header: "Order No.", render: (o) => o.salesOrderCode },
    { key: "totalAmount", header: "Amount", render: (o) => formatInrExact(o.totalAmount) },
    { key: "status", header: "Status", render: (o) => <SalesOrderStatusTag status={o.status} /> },
  ];

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/proforma-invoices")}>
        <Icon name="back" size={14} /> Back to Proforma Invoices
      </a>

      <div className="card panel" style={{ marginBottom: 16 }}>
        <div className="doc-head" style={{ borderBottom: 0, paddingBottom: 10 }}>
          <div className="ident">
            <div className="dot" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--m-soft)", color: "var(--m)", display: "grid", placeItems: "center", flex: "none" }}>
              <Icon name="receipt" size={20} />
            </div>
            <div>
              <h3>{proforma.proformaNumber}</h3>
              <div className="co">
                {opportunity ? <Link href={`/leads/${opportunity.leadId}`}>{proforma.customerName}</Link> : proforma.customerName}
                {" · "}
                <Link href={`/quotations/${proforma.quotationId}`}>{proforma.quoteNo}</Link>
                {" · Owner: "}
                {proforma.ownerName}
              </div>
              <div className="statusrow">
                <ProformaInvoiceStatusTag status={proforma.status} expired={proforma.isExpired} />
              </div>
            </div>
          </div>
          <div className="doc-amount">
            <div className="k">Total amount</div>
            <div className="v" data-testid="header-total">{formatInrExact(proforma.totalAmount)}</div>
            <div className="sub">From quotation {proforma.quoteNo}</div>
          </div>
        </div>
        <DocumentActions actions={actionList} testId="proforma-actions" />
      </div>

      <ProformaCallout proforma={proforma} quotation={quotation} liveOrders={liveOrders} ordersKnown={ordersKnown} events={events} />

      <div style={{ marginBottom: 16 }}>
        <Panel title="From quotation to Sales Order">
          <DocumentChain
            stages={[
              quotationStage,
              { key: "proforma", label: "Proforma Invoice", title: proforma.proformaNumber, status: <ProformaInvoiceStatusTag status={proforma.status} expired={proforma.isExpired} />, hint: proforma.status === "CANCELLED" ? "Closed" : v.text, state: "current" },
              orderStage,
            ]}
          />
        </Panel>
      </div>

      <div className="crm-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card panel">
            <div className="panel-head"><h3>Amount and validity</h3></div>
            <CommercialSummary
              taxableAmount={quotationAmountsKnown?.taxableAmount}
              gstPercent={quotationAmountsKnown?.gstPercent}
              gstAmount={quotationAmountsKnown?.gstAmount}
              totalAmount={proforma.totalAmount}
              taxType={quotation?.taxType}
              breakdownAvailable={!!quotation && !quotationLegacy && !totalDiffers}
              totalLabel="Total (derived)"
              source={{ label: proforma.quoteNo, href: `/quotations/${proforma.quotationId}`, note: "Derived from the approved quotation; it can't be edited here. Source:" }}
            />
            {totalDiffers && (
              <p style={{ fontSize: 12, color: "var(--warn)", padding: "0 19px 12px" }}>
                This Proforma&apos;s total differs from its quotation&apos;s ({formatInrExact(quotation?.totalAmount ?? quotation?.amount ?? 0)}). A Sales Order can&apos;t be created from it until they agree.
              </p>
            )}
            <div className="facts">
              <div className="f"><label>Issue date</label><div>{formatDate(proforma.issueDate)}</div></div>
              <div className="f">
                <label>Valid through</label>
                <div>{proforma.validityDate ? formatDate(proforma.validityDate) : "No expiry"}</div>
                <div className={`note ${proforma.status === "CANCELLED" ? "" : v.tone === "none" ? "" : v.tone}`} data-testid="validity-note">{proforma.status === "CANCELLED" ? "Cancelled" : v.text}</div>
              </div>
              <div className="f"><label>Created</label><div>{formatDate(proforma.createdAt)}</div></div>
            </div>
            {proforma.remarks && (
              <div style={{ padding: "0 19px 19px" }}>
                <div className="facts" style={{ padding: 0 }}>
                  <div className="f"><label>Remarks</label><div style={{ fontWeight: 400 }}>{proforma.remarks}</div></div>
                </div>
              </div>
            )}
          </div>
          {allOrders.length > 0 && (
            <Panel title="Sales Orders from this Proforma" flush>
              <DataTable columns={orderColumns} rows={allOrders} onRowClick={(o) => router.push(`/sales-orders/${o.id}`)} emptyTitle="No sales orders yet" />
            </Panel>
          )}
        </div>
        <Panel title="Lifecycle history" flush>
          <ProformaHistory events={events} loading={eventsLoading} error={eventsError} onRetry={refreshAll} />
        </Panel>
      </div>

      {dialog === "approve" && (
        <ConfirmDialog
          title={`Approve ${proforma.proformaNumber}`}
          body={`Approving confirms this Proforma Invoice for ${formatInrExact(proforma.totalAmount)}${proforma.validityDate ? `, valid through ${formatDate(proforma.validityDate)}` : ""}. A Sales Order can then be created from it.`}
          confirmLabel="Approve Proforma"
          noteLabel="Remarks (optional)"
          onClose={() => setDialog(null)}
          onConfirm={async (remarks) => {
            await approveProformaInvoice(remarks);
            toast.show(`${proforma.proformaNumber} approved`, "check");
          }}
        />
      )}
      {dialog === "cancel" && (
        <ConfirmDialog
          title={`Cancel ${proforma.proformaNumber}`}
          body="Cancelling closes this Proforma Invoice for good. A new one can then be created from the quotation. Say why, for the record."
          confirmLabel="Cancel Proforma"
          destructive
          noteLabel="Reason"
          noteRequired
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            await cancelProformaInvoice(reason ?? "");
            toast.show(`${proforma.proformaNumber} cancelled`, "check");
          }}
        />
      )}
      {dialog === "order" && (
        <SalesOrderForm
          proformaInvoiceId={proforma.id}
          proformaNumber={proforma.proformaNumber}
          proformaTotalAmount={proforma.totalAmount}
          quotationBuyerGstId={quotation?.buyerGstId}
          quotationSellerGstId={quotation?.sellerGstId}
          onClose={() => setDialog(null)}
          onSubmit={(input) => createSalesOrder(input)}
        />
      )}
    </div>
  );
}
