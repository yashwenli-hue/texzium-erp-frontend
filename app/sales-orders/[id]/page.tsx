"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { DocumentCustomer } from "../../../components/ui/DocumentCustomer";
import { SalesOrderStatusTag, SalesInvoiceStatusTag, DispatchOrderStatusTag, AdvanceReceiptStatusTag, Tag } from "../../../components/ui/Tag";
import { BackLink } from "../../../components/ui/BackLink";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { SalesInvoiceForm } from "../../../components/forms/SalesInvoiceForm";
import { SalesOrderPaymentTermForm } from "../../../components/forms/SalesOrderPaymentTermForm";
import { SalesOrderAdvanceReceiptForm } from "../../../components/forms/SalesOrderAdvanceReceiptForm";
import { SalesOrderLifecycleHistory } from "../../../components/ui/SalesOrderLifecycleHistory";
import { SalesOrderCancelledBanner } from "../../../components/ui/SalesOrderCancelledBanner";
import { LifecycleStepper } from "../../../components/ui/LifecycleStepper";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useSalesOrderDetail } from "../../../lib/hooks/useSalesOrders";
import { useSalesInvoices } from "../../../lib/hooks/useSalesInvoices";
import { useDispatchOrders } from "../../../lib/hooks/useDispatchOrders";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";
import {
  SalesInvoice,
  SalesOrderAdvanceReceipt,
  SalesOrderCommercialApproval,
  SalesOrderPaymentTerm,
  formatPaymentMode,
  formatPaymentType,
  formatSalesOrderStatus,
} from "../../../lib/types/domain";
import {
  SALES_ORDER_LIFECYCLE_STATUS,
  SALES_ORDER_PERMISSIONS,
  canCancelSalesOrder,
  canGiveAccountsApproval,
  canRecordCommercialDocuments,
  canRetractAccountsApproval,
  canRetractAdvanceVerification,
  canVerifyAdvanceReceipt,
  isInSalesOrderLifecycle,
  isSalesOrderCancelled,
} from "../../../lib/repository/shared/salesOrderLifecycle";


export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const toast = useToast();
  const { hasPermission } = useAuth();
  const {
    salesOrder,
    proforma,
    quotation,
    opportunity,
    opportunityStatus,
    loading,
    error,
    refetch,
    access,
    paymentTerms,
    paymentTermsError,
    advanceReceipts,
    advanceReceiptsError,
    approvals,
    approvalsError,
    events,
    eventsLoading,
    eventsError,
    createPaymentTerm,
    createAdvanceReceipt,
    verifyAdvanceReceipt,
    approveCommercially,
    retractVerification,
    retractApproval,
    cancelSalesOrder,
  } = useSalesOrderDetail(id);
  const { salesInvoices, createSalesInvoice, refetch: refetchInvoices } = useSalesInvoices();
  const { dispatchOrders } = useDispatchOrders();
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showTermForm, setShowTermForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [receiptAction, setReceiptAction] = useState<{ kind: "verify" | "reject"; receipt: SalesOrderAdvanceReceipt } | null>(null);
  const [showApprove, setShowApprove] = useState(false);
  const [retractReceipt, setRetractReceipt] = useState<SalesOrderAdvanceReceipt | null>(null);
  const [retractApprovalTarget, setRetractApprovalTarget] = useState<SalesOrderCommercialApproval | null>(null);
  const [showCancel, setShowCancel] = useState(false);

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
        <BackLink fallback="/sales-orders">Back to Sales Orders</BackLink>
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
        <BackLink fallback="/sales-orders">Back to Sales Orders</BackLink>
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
  const relatedInvoices = salesInvoices.filter((i) => i.salesOrderId === salesOrder.id);
  // VERIFIED (backend 2026-10-15): issuing needs invoices.create, and an order
  // is invoiced once (a second invoice is refused).
  const mayInvoice = hasPermission("invoices.create");
  const canCreateInvoice = mayInvoice && relatedInvoices.length === 0 && salesOrder.status === "READY_FOR_INVOICING" && matchingDispatchedOrders.length > 0;

  // ---- Commercial workflow. An action is offered when the order's status fits it
  // AND the person holds its permission (shown disabled, with the reason, when
  // they do not). The backend re-checks both and its answer wins: a refused
  // action shows the backend's message and reloads everything.
  const status = salesOrder.status;
  const inWorkflow = isInSalesOrderLifecycle(status);
  const mayRecordTerms = hasPermission(SALES_ORDER_PERMISSIONS.paymentTermsCreate);
  const mayRecordReceipts = hasPermission(SALES_ORDER_PERMISSIONS.advanceReceiptsCreate);
  const mayVerify = hasPermission(SALES_ORDER_PERMISSIONS.advanceReceiptsVerify);
  const mayApprove = hasPermission(SALES_ORDER_PERMISSIONS.commercialApprovalApprove);
  const documentsOpen = canRecordCommercialDocuments(status);
  const noPermission = (what: string) => `You don't have permission to ${what}`;

  // ---- Retract and cancel. Same rule: offered for the right status, disabled with
  // the reason without the permission. CANCELLED is terminal, so a cancelled
  // order is offered no workflow action at all. Once Operations has a Dispatch
  // Order or Finance an invoice for the order the backend refuses to retract or
  // cancel; the page already holds both lists, so it says so up front.
  const cancelled = isSalesOrderCancelled(status);
  const mayRetractVerification = hasPermission(SALES_ORDER_PERMISSIONS.advanceReceiptsRetract);
  const mayRetractApproval = hasPermission(SALES_ORDER_PERMISSIONS.commercialApprovalRetract);
  const mayCancel = hasPermission(SALES_ORDER_PERMISSIONS.cancel);
  const downstreamStarted = linkedDispatchOrders.length > 0 || relatedInvoices.length > 0;
  const downstreamTitle = "A Dispatch Order or Sales Invoice already exists for this order, so it can no longer be retracted or cancelled here.";
  const reversalTitle = (permitted: boolean, what: string) =>
    !permitted ? noPermission(what) : downstreamStarted ? downstreamTitle : undefined;
  // What a cancellation leaves behind: verified advances stay verified and are not refunded.
  const verifiedAdvanceTotal = advanceReceipts.filter((r) => r.verificationStatus === "VERIFIED").reduce((sum, r) => sum + r.amountReceived, 0);
  // Events come newest first, so the first cancellation event is the one that happened.
  const cancelEvent = events.find((e) => e.action === "SALES_ORDER_CANCELLED");

  const termColumns: Column<SalesOrderPaymentTerm>[] = [
    { key: "type", header: "Type", render: (t) => formatPaymentType(t.paymentType) },
    { key: "advance", header: "Advance", render: (t) => formatInr(t.advanceAmount) },
    { key: "balance", header: "Balance", render: (t) => formatInr(t.balanceAmount) },
    {
      key: "credit",
      header: "Credit / Due",
      render: (t) =>
        [t.creditDays !== undefined ? `${t.creditDays} days` : null, t.dueDate ? `due ${formatDate(t.dueDate)}` : null].filter(Boolean).join(" · ") || "—",
    },
    { key: "remarks", header: "Remarks", render: (t) => t.remarks ?? "—" },
  ];

  const receiptColumns: Column<SalesOrderAdvanceReceipt>[] = [
    { key: "date", header: "Date", render: (r) => formatDate(r.receiptDate) },
    { key: "amount", header: "Amount", render: (r) => formatInr(r.amountReceived) },
    { key: "mode", header: "Mode", render: (r) => formatPaymentMode(r.paymentMode) + (r.referenceNo ? ` · ${r.referenceNo}` : "") },
    { key: "status", header: "Status", render: (r) => <AdvanceReceiptStatusTag status={r.verificationStatus} /> },
    {
      key: "verified",
      header: "Decided",
      render: (r) => (r.verifiedAt ? `${r.verifiedBy ?? "—"} · ${formatDate(r.verifiedAt)}` : "—"),
    },
    {
      key: "actions",
      header: "",
      render: (r) => {
        if (r.verificationStatus === "PENDING") {
          // A cancelled order takes no more decisions: its pending receipts stay pending.
          if (cancelled) return null;
          return (
            <div style={{ display: "flex", gap: 6 }}>
              {canVerifyAdvanceReceipt(status) && (
                <Button
                  variant="primary"
                  disabled={!mayVerify}
                  title={mayVerify ? undefined : noPermission("verify advance receipts")}
                  onClick={() => setReceiptAction({ kind: "verify", receipt: r })}
                >
                  Verify
                </Button>
              )}
              <Button
                variant="ghost"
                className="danger-ghost"
                disabled={!mayVerify}
                title={mayVerify ? undefined : noPermission("reject advance receipts")}
                onClick={() => setReceiptAction({ kind: "reject", receipt: r })}
              >
                Reject
              </Button>
            </div>
          );
        }
        // The verification can be retracted only while the order waits for Accounts approval.
        if (r.verificationStatus === "VERIFIED" && canRetractAdvanceVerification(status)) {
          return (
            <Button
              variant="ghost"
              disabled={!mayRetractVerification || downstreamStarted}
              title={reversalTitle(mayRetractVerification, "retract advance receipt verifications")}
              onClick={() => setRetractReceipt(r)}
            >
              Retract verification
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const invoiceColumns: Column<SalesInvoice>[] = [
    { key: "invoiceNumber", header: "Invoice No.", render: (i) => i.invoiceNumber },
    { key: "totalAmount", header: "Amount", render: (i) => formatInr(i.totalAmount) },
    { key: "status", header: "Status", render: (i) => <SalesInvoiceStatusTag status={i.status} /> },
  ];

  return (
    <div className="page">
      <BackLink fallback="/sales-orders">Back to Sales Orders</BackLink>
      {cancelled && (
        <SalesOrderCancelledBanner
          salesOrderCode={salesOrder.salesOrderCode}
          cancelledAt={cancelEvent?.occurredAt}
          cancelledByName={cancelEvent?.actorName || undefined}
          reason={cancelEvent?.remarks}
          verifiedAdvanceTotal={verifiedAdvanceTotal}
        />
      )}
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
              <DocumentCustomer opportunity={opportunity ?? null} status={opportunityStatus} />
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
              <p style={{ fontSize: 11.5, color: "var(--faint-text)" }}>
                No seller/buyer GST or tax type on this order — it is a legacy order, created before the lifecycle by
                converting a Quotation directly, which didn&apos;t collect that information.
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
                  : !mayInvoice && salesOrder.status === "READY_FOR_INVOICING"
                  ? "You don't have permission to issue invoices."
                  : cancelled
                  ? "This order is cancelled and cannot be invoiced."
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
              Payment terms, advance receipts and Accounts approval are handled in the Commercial workflow below.
              Once Accounts approves, the order is &quot;Ready For Dispatch Order&quot;. Dispatch itself is an
              OperationsOS action outside this app: when a Dispatch Order linked to this order is marked DISPATCHED,
              the order&apos;s status becomes &quot;Ready For Invoicing&quot; and Create Sales Invoice above becomes available.
            </p>
          </Panel>
        </div>
      </div>

      <div className="crm-grid" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Commercial workflow">
            {cancelled ? (
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                This order is cancelled and is no longer part of the commercial workflow. Its history is kept below.
              </p>
            ) : inWorkflow ? (
              <LifecycleStepper
                steps={[
                  { key: SALES_ORDER_LIFECYCLE_STATUS.PENDING_STORE_APPROVAL, label: "Store approval" },
                  { key: SALES_ORDER_LIFECYCLE_STATUS.PENDING_ACCOUNTS_APPROVAL, label: "Accounts approval" },
                  { key: SALES_ORDER_LIFECYCLE_STATUS.READY_FOR_DISPATCH_ORDER, label: "Ready for dispatch" },
                ]}
                currentKey={status}
              />
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                This order is {formatSalesOrderStatus(status)}, which is outside the commercial approval steps (Pending
                Store Approval → Pending Accounts Approval → Ready For Dispatch Order) that apply to orders created from
                a Proforma Invoice.
              </p>
            )}
            {(canGiveAccountsApproval(status) || canCancelSalesOrder(status)) && (
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canGiveAccountsApproval(status) && (
                  <Button
                    variant="primary"
                    icon="check"
                    disabled={!mayApprove}
                    title={mayApprove ? undefined : noPermission("give accounts commercial approval")}
                    onClick={() => setShowApprove(true)}
                  >
                    Give Accounts Approval
                  </Button>
                )}
                {canCancelSalesOrder(status) && (
                  <Button
                    variant="ghost"
                    className="danger-ghost"
                    icon="close"
                    disabled={!mayCancel || downstreamStarted}
                    title={reversalTitle(mayCancel, "cancel Sales Orders")}
                    onClick={() => setShowCancel(true)}
                  >
                    Cancel Sales Order
                  </Button>
                )}
              </div>
            )}
            {approvals.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {approvals.map((a) =>
                  a.status === "RETRACTED" ? (
                    // Kept for the record, but no longer in force.
                    <p key={a.id} style={{ fontSize: 12.5, color: "var(--faint-text)" }}>
                      Accounts approval by {a.approvedBy} on {formatDate(a.createdAt)} was retracted.
                    </p>
                  ) : (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
                        Accounts approval given by <b style={{ color: "var(--text)" }}>{a.approvedBy}</b> on {formatDate(a.createdAt)}
                        {a.remarks ? ` — “${a.remarks}”` : ""}
                      </p>
                      {canRetractAccountsApproval(status) && (
                        <Button
                          variant="ghost"
                          disabled={!mayRetractApproval || downstreamStarted}
                          title={reversalTitle(mayRetractApproval, "retract accounts commercial approvals")}
                          onClick={() => setRetractApprovalTarget(a)}
                        >
                          Retract approval
                        </Button>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
            {!access.viewApprovals && (
              <p style={{ fontSize: 12, color: "var(--faint-text)", marginTop: 10 }}>
                You don&apos;t have permission to view accounts approvals.
              </p>
            )}
            {approvalsError && <p style={{ fontSize: 12, color: "var(--bad)", marginTop: 10 }}>{approvalsError.message}</p>}
          </Panel>

          <Panel
            title="Payment Terms"
            flush
            extraHead={
              documentsOpen && mayRecordTerms ? (
                <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowTermForm(true); }}>
                  <Icon name="plus" size={14} /> Set Payment Terms
                </a>
              ) : undefined
            }
          >
            {!access.viewTerms ? (
              <p style={{ fontSize: 12.5, color: "var(--muted)", padding: "14px 19px" }}>
                You don&apos;t have permission to view payment terms.
              </p>
            ) : paymentTermsError ? (
              <p style={{ fontSize: 12.5, color: "var(--bad)", padding: "14px 19px" }}>{paymentTermsError.message}</p>
            ) : (
              <DataTable
                columns={termColumns}
                rows={paymentTerms}
                emptyTitle="No payment terms yet"
                emptyBody={documentsOpen ? "Set the payment terms agreed for this order." : "Payment terms can be set while the order is waiting for store or accounts approval."}
              />
            )}
          </Panel>

          <Panel
            title="Advance Receipts"
            flush
            extraHead={
              documentsOpen && mayRecordReceipts ? (
                <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowReceiptForm(true); }}>
                  <Icon name="plus" size={14} /> Record Advance Receipt
                </a>
              ) : undefined
            }
          >
            {!access.viewReceipts ? (
              <p style={{ fontSize: 12.5, color: "var(--muted)", padding: "14px 19px" }}>
                You don&apos;t have permission to view advance receipts.
              </p>
            ) : advanceReceiptsError ? (
              <p style={{ fontSize: 12.5, color: "var(--bad)", padding: "14px 19px" }}>{advanceReceiptsError.message}</p>
            ) : (
              <DataTable
                columns={receiptColumns}
                rows={advanceReceipts}
                emptyTitle="No advance receipts yet"
                emptyBody={
                  documentsOpen
                    ? "Record the advance payment received. Verifying it moves the order to Accounts approval."
                    : "Advance receipts can be recorded while the order is waiting for store or accounts approval."
                }
              />
            )}
            {cancelled && advanceReceipts.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--faint-text)", padding: "10px 19px 14px" }}>
                This order is cancelled. Its receipts are left exactly as they were: a verified advance stays verified
                (it is not refunded here) and a pending receipt stays pending.
              </p>
            )}
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Lifecycle history">
            <p style={{ fontSize: 12, color: "var(--faint-text)", marginBottom: 10 }}>
              Audit trail of advance verifications, rejections, accounts approvals, their retractions and any
              cancellation for this order, with the reason for each retraction or cancellation. It is not a place for
              general notes.
            </p>
            {!access.viewHistory ? (
              <p style={{ fontSize: 12.5, color: "var(--muted)" }}>You don&apos;t have permission to view this order&apos;s history.</p>
            ) : eventsError ? (
              <p style={{ fontSize: 12.5, color: "var(--bad)" }}>{eventsError.message}</p>
            ) : eventsLoading && events.length === 0 ? (
              <div className="skeleton" style={{ height: 80 }} />
            ) : (
              <SalesOrderLifecycleHistory events={events} />
            )}
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> A Sales Order is created from an approved, unexpired Proforma Invoice
        (<code>POST /sales-orders</code>, linked by proformaInvoiceId, status <code>PENDING_STORE_APPROVAL</code>,
        total taken from that Proforma). An order with status <code>OPEN</code> is a legacy order created before
        that, straight from a quotation; it does not enter the commercial workflow. Verifying an advance receipt
        moves an order to Pending Accounts Approval, and Accounts approval makes it Ready For Dispatch Order. The
        backend decides who did what (the signed-in user) and keeps it in the lifecycle history; a rejected advance
        leaves the status unchanged. &quot;Ready For Invoicing&quot; is written by the OperationsOS Dispatch Orders service
        when a linked Dispatch Order is marked DISPATCHED, so Create Sales Invoice only appears once that real
        status is reached and a matching dispatched order is found. Each step can be retracted (most recent
        first) and an order can be cancelled, both with a mandatory reason that is kept in the history; once a
        Dispatch Order or Sales Invoice exists the backend refuses both. Cancelled is final, and cancelling does not
        refund an advance or change any downstream record.
      </DesignNote>

      {showTermForm && (
        <SalesOrderPaymentTermForm
          salesOrderCode={salesOrder.salesOrderCode}
          orderTotal={salesOrder.totalAmount}
          onClose={() => setShowTermForm(false)}
          onSubmit={(input) => createPaymentTerm(input)}
        />
      )}

      {showReceiptForm && (
        <SalesOrderAdvanceReceiptForm
          salesOrderCode={salesOrder.salesOrderCode}
          onClose={() => setShowReceiptForm(false)}
          onSubmit={(input) => createAdvanceReceipt(input)}
        />
      )}

      {receiptAction && (
        <ConfirmDialog
          title={receiptAction.kind === "verify" ? "Verify Advance Receipt" : "Reject Advance Receipt"}
          body={
            receiptAction.kind === "verify"
              ? `Verify the advance receipt of ${formatInr(receiptAction.receipt.amountReceived)} (${formatPaymentMode(receiptAction.receipt.paymentMode)})? ${salesOrder.salesOrderCode} will move to Pending Accounts Approval.`
              : `Reject the advance receipt of ${formatInr(receiptAction.receipt.amountReceived)} (${formatPaymentMode(receiptAction.receipt.paymentMode)})? ${salesOrder.salesOrderCode} stays at ${formatSalesOrderStatus(status)}, and the rejection is recorded in its history.`
          }
          confirmLabel={receiptAction.kind === "verify" ? "Verify" : "Reject"}
          destructive={receiptAction.kind === "reject"}
          noteLabel="Remarks (optional)"
          onClose={() => setReceiptAction(null)}
          onConfirm={async (note) => {
            await verifyAdvanceReceipt(receiptAction.receipt.id, receiptAction.kind === "verify" ? "VERIFIED" : "REJECTED", note);
            toast.success(receiptAction.kind === "verify" ? "Advance receipt verified" : "Advance receipt rejected");
          }}
        />
      )}

      {showApprove && (
        <ConfirmDialog
          title="Give Accounts Commercial Approval"
          body={`Approve ${salesOrder.salesOrderCode} commercially? It will become Ready For Dispatch Order.`}
          confirmLabel="Approve"
          noteLabel="Remarks (optional)"
          onClose={() => setShowApprove(false)}
          onConfirm={async (note) => {
            await approveCommercially(note);
            toast.success("Accounts commercial approval given");
          }}
        />
      )}

      {retractReceipt && (
        <ConfirmDialog
          title="Retract Advance Verification"
          body={`Retract the verification of the advance receipt of ${formatInr(retractReceipt.amountReceived)} (${formatPaymentMode(retractReceipt.paymentMode)})? The receipt goes back to Pending and ${salesOrder.salesOrderCode} returns to Pending Store Approval. The original verification stays in the history.`}
          confirmLabel="Retract verification"
          noteLabel="Reason"
          noteRequired
          onClose={() => setRetractReceipt(null)}
          onConfirm={async (note) => {
            await retractVerification(retractReceipt.id, note ?? "");
            toast.success("Advance verification retracted");
          }}
        />
      )}

      {retractApprovalTarget && (
        <ConfirmDialog
          title="Retract Accounts Approval"
          body={`Retract the accounts approval of ${salesOrder.salesOrderCode}? It returns to Pending Accounts Approval and needs approving again. The original approval stays in the history.`}
          confirmLabel="Retract approval"
          noteLabel="Reason"
          noteRequired
          onClose={() => setRetractApprovalTarget(null)}
          onConfirm={async (note) => {
            await retractApproval(retractApprovalTarget.id, note ?? "");
            toast.success("Accounts approval retracted");
          }}
        />
      )}

      {showCancel && (
        <ConfirmDialog
          title="Cancel Sales Order"
          body={`Cancel ${salesOrder.salesOrderCode}? This is final: a cancelled Sales Order can't be reopened or changed. Cancelling does not reverse or refund anything outside this order's own approval steps: any verified advance${
            verifiedAdvanceTotal > 0 ? ` (${formatInr(verifiedAdvanceTotal)} verified so far)` : ""
          } stays verified and is not refunded, and nothing is changed for payments, dispatches or invoices.`}
          confirmLabel="Cancel order permanently"
          destructive
          noteLabel="Reason"
          noteRequired
          onClose={() => setShowCancel(false)}
          onConfirm={async (note) => {
            await cancelSalesOrder(note ?? "");
            toast.success("Sales Order cancelled");
          }}
        />
      )}

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
