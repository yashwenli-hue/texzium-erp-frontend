"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { DocumentCustomer } from "../../../components/ui/DocumentCustomer";
import { ProformaInvoiceStatusTag, QuotationStatusTag, SalesOrderStatusTag, Tag } from "../../../components/ui/Tag";
import { BackLink } from "../../../components/ui/BackLink";
import { LoadFailure } from "../../../components/ui/LoadFailure";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { CommercialSummary } from "../../../components/ui/CommercialSummary";
import { DocumentActions, DocumentAction } from "../../../components/ui/DocumentActions";
import { ChainStage, DocumentChain } from "../../../components/ui/DocumentChain";
import { QuotationCallout } from "../../../components/ui/QuotationCallout";
import { QuotationHistory } from "../../../components/ui/DocumentLifecycleHistory";
import { QuotationReviseDialog } from "../../../components/forms/QuotationReviseDialog";
import { DocumentLinesPanel } from "../../../components/ui/DocumentLinesPanel";
import { useDocumentDownload } from "../../../lib/hooks/useDocumentDownload";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { QuotationApproveDialog } from "../../../components/forms/QuotationApproveDialog";
import { ProformaInvoiceForm } from "../../../components/forms/ProformaInvoiceForm";
import { useQuotationDetail } from "../../../lib/hooks/useQuotations";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import { buildCommercialChain } from "../../../lib/repository/shared/commercialChain";
import { QUOTATION_PERMISSIONS, isLegacyTaxBreakdown, quotationActions, quotationAmounts } from "../../../lib/repository/shared/quotationLifecycle";
import { PROFORMA_PERMISSIONS, validityLabel } from "../../../lib/repository/shared/proformaLifecycle";
import { formatDate, formatInrExact } from "../../../lib/format";


export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const id = params?.id;
  const {
    quotation,
    opportunity,
    opportunityStatus,
    loading,
    error,
    refetch,
    events,
    eventsLoading,
    eventsError,
    proformas,
    orders,
    downstreamKnown,
    reviseQuotation,
    approveQuotation,
    rejectQuotation,
    createProformaInvoice,
    refreshAll,
  } = useQuotationDetail(id);
  const [dialog, setDialog] = useState<null | "revise" | "approve" | "reject" | "proforma">(null);
  const repo = useRepository();
  const { downloading, download } = useDocumentDownload();

  if (loading && !quotation) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 140, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 90, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  // A fetch failure (network/5xx/403) is not the same as a genuine not-found —
  // only getById() resolving to null means the quotation truly doesn't exist.
  if (error) {
    return (
      <div className="page">
        <BackLink fallback="/quotations">Back to Quotations</BackLink>
        <LoadFailure error={error} noun="quotation" permission="quotations.view" onRetry={refetch} />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="page">
        <BackLink fallback="/quotations">Back to Quotations</BackLink>
        <Panel title="Quotation not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This quotation may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const amounts = quotationAmounts(quotation);
  const legacy = isLegacyTaxBreakdown(quotation);
  const chain = buildCommercialChain(quotation.id, proformas, orders);
  const activeProforma = chain.activeProforma;
  const liveOrders = chain.liveOrders;

  const actions = quotationActions({
    status: quotation.status,
    legacyBreakdown: legacy,
    may: {
      approve: hasPermission(QUOTATION_PERMISSIONS.approve),
      edit: hasPermission(QUOTATION_PERMISSIONS.edit),
      reject: hasPermission(QUOTATION_PERMISSIONS.reject),
      createProforma: hasPermission(PROFORMA_PERMISSIONS.create),
    },
    activeProformaLabels: activeProforma ? [activeProforma.proformaNumber] : [],
    liveOrderLabels: liveOrders.map((o) => o.salesOrderCode),
  });

  const actionList: DocumentAction[] = [
    { key: "approve", label: "Approve", icon: "check", variant: "primary", state: actions.approve, onClick: () => setDialog("approve") },
    { key: "createProforma", label: "Create Proforma Invoice", icon: "receipt", variant: quotation.status === "APPROVED" && actions.createProforma.enabled ? "primary" : "ghost", state: actions.createProforma, onClick: () => setDialog("proforma") },
    { key: "revise", label: "Revise", icon: "layers", state: actions.revise, onClick: () => setDialog("revise") },
    { key: "reject", label: "Reject", icon: "close", className: "danger-ghost", state: actions.reject, onClick: () => setDialog("reject") },
    {
      key: "pdf",
      label: downloading ? "Preparing PDF…" : "Download PDF",
      icon: "file",
      state: { enabled: !downloading },
      onClick: () => download(() => repo.quotations.downloadPdf(quotation.id), `${quotation.quoteNo} downloaded`),
    },
  ];

  const olderProformas = chain.proformas.filter((p) => p !== activeProforma);
  const proformaStage: ChainStage = activeProforma
    ? {
        key: "proforma",
        label: "Proforma Invoice",
        title: activeProforma.proformaNumber,
        href: `/proforma-invoices/${activeProforma.id}`,
        status: <ProformaInvoiceStatusTag status={activeProforma.status} expired={activeProforma.isExpired} />,
        hint: validityLabel(activeProforma.validityDate).text + (olderProformas.length ? ` · ${olderProformas.length} cancelled earlier` : ""),
        state: activeProforma.isExpired ? "attention" : "normal",
      }
    : {
        key: "proforma",
        label: "Proforma Invoice",
        title: "Not created yet",
        hint: actions.createProforma.enabled ? `Ready to create from this quotation.${olderProformas.length ? ` ${olderProformas.length} cancelled earlier.` : ""}` : olderProformas.length ? `${olderProformas.length} cancelled earlier. ${quotation.status === "APPROVED" ? "" : "Needs an approved quotation."}`.trim() : "Needs an approved quotation.",
        state: quotation.status === "REJECTED" ? "closed" : "upcoming",
      };
  const orderStage: ChainStage = liveOrders.length
    ? {
        key: "order",
        label: "Sales Order",
        title: liveOrders[0].salesOrderCode,
        href: `/sales-orders/${liveOrders[0].id}`,
        status: <SalesOrderStatusTag status={liveOrders[0].status} />,
        hint: liveOrders[0].proformaInvoiceId ? (liveOrders.length > 1 ? `+${liveOrders.length - 1} more` : undefined) : "Legacy order, created straight from this quotation.",
        state: "normal",
      }
    : {
        key: "order",
        label: "Sales Order",
        title: "Not created yet",
        hint: chain.orders.length ? `${chain.orders.length} cancelled. A new one is created from an approved Proforma.` : "Created from an approved Proforma Invoice.",
        state: quotation.status === "REJECTED" ? "closed" : "upcoming",
      };

  const documentRows: Array<{ id: string; kind: "Proforma" | "Sales Order"; number: string; href: string; amount: number; status: JSX.Element }> = [
    ...chain.proformas.map((p) => ({ id: p.id, kind: "Proforma" as const, number: p.proformaNumber, href: `/proforma-invoices/${p.id}`, amount: p.totalAmount, status: <ProformaInvoiceStatusTag status={p.status} expired={p.isExpired} /> })),
    ...chain.orders.map((o) => ({ id: o.id, kind: "Sales Order" as const, number: o.salesOrderCode, href: `/sales-orders/${o.id}`, amount: o.totalAmount, status: <SalesOrderStatusTag status={o.status} /> })),
  ];
  const documentColumns: Column<(typeof documentRows)[number]>[] = [
    { key: "kind", header: "Document", render: (r) => r.kind },
    { key: "number", header: "No.", render: (r) => r.number },
    { key: "amount", header: "Amount", render: (r) => formatInrExact(r.amount) },
    { key: "status", header: "Status", render: (r) => r.status },
  ];

  return (
    <div className="page">
      <BackLink fallback="/quotations">Back to Quotations</BackLink>

      <div className="card panel" style={{ marginBottom: 16 }}>
        <div className="doc-head" style={{ borderBottom: 0, paddingBottom: 10 }}>
          <div className="ident">
            <div className="dot" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--m-soft)", color: "var(--m)", display: "grid", placeItems: "center", flex: "none" }}>
              <Icon name="notepad" size={20} />
            </div>
            <div>
              <h3>{quotation.quoteNo}</h3>
              <div className="co">
                {opportunity ? <Link href={`/leads/${opportunity.leadId}`}>{quotation.customerName}</Link> : quotation.customerName}
                {" · "}
                {opportunity ? <Link href={`/opportunities/${opportunity.id}`}>{quotation.opportunityName}</Link> : quotation.opportunityName}
                {" · Owner: "}
                {quotation.ownerName}
              </div>
              <div className="statusrow">
                <QuotationStatusTag status={quotation.status} />
                {legacy && <Tag color="w">Legacy tax breakdown</Tag>}
              </div>
              <DocumentCustomer opportunity={opportunity ?? null} status={opportunityStatus} />
            </div>
          </div>
          <div className="doc-amount">
            <div className="k">Total amount</div>
            <div className="v" data-testid="header-total">{formatInrExact(amounts.totalAmount)}</div>
            <div className="sub">{legacy ? "Tax breakdown not recorded" : `Taxable ${formatInrExact(amounts.taxableAmount)} + GST ${amounts.gstPercent}%`}</div>
          </div>
        </div>
        <DocumentActions actions={actionList} testId="quotation-actions" />
      </div>

      <QuotationCallout quotation={quotation} legacy={legacy} activeProforma={activeProforma} liveOrders={liveOrders} downstreamKnown={downstreamKnown} events={events} />

      <div style={{ marginBottom: 16 }}>
        <Panel title="From quotation to Sales Order">
          <DocumentChain stages={[{ key: "quotation", label: "Quotation", title: quotation.quoteNo, status: <QuotationStatusTag status={quotation.status} />, hint: quotation.status === "APPROVED" ? "Commercially approved" : quotation.status === "REJECTED" ? "Closed" : "Not approved yet", state: "current" }, proformaStage, orderStage]} />
        </Panel>
      </div>

      <div className="crm-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card panel">
            <div className="panel-head"><h3>Commercial summary</h3></div>
            <CommercialSummary
              taxableAmount={amounts.taxableAmount}
              gstPercent={amounts.gstPercent}
              gstAmount={amounts.gstAmount}
              totalAmount={amounts.totalAmount}
              taxType={quotation.taxType}
              breakdownAvailable={!legacy}
            />
            <div className="facts">
              <div className="f"><label>Quote date</label><div>{quotation.quoteDate ? formatDate(quotation.quoteDate) : "—"}</div></div>
              <div className="f"><label>Place of supply</label><div>{quotation.placeOfSupply ?? "—"}</div></div>
              <div className="f"><label>Created</label><div>{formatDate(quotation.createdAt)}</div></div>
            </div>
          </div>
          <DocumentLinesPanel lines={quotation.lines} emptyText="This quotation was recorded before line items were stored: its item, quantity and rate are not available." />
          {documentRows.length > 0 && (
            <Panel title="Documents built on this quotation" flush>
              <DataTable
                columns={documentColumns}
                rows={documentRows}
                onRowClick={(r) => router.push(r.href)}
                emptyTitle="Nothing built on this quotation yet"
              />
            </Panel>
          )}
        </div>
        <Panel title="Lifecycle history" flush>
          <QuotationHistory events={events} loading={eventsLoading} error={eventsError} onRetry={refreshAll} />
        </Panel>
      </div>

      {dialog === "revise" && (
        <QuotationReviseDialog
          quoteNo={quotation.quoteNo}
          status={quotation.status}
          current={amounts}
          taxType={quotation.taxType}
          line={quotation.lines?.length === 1 ? quotation.lines[0] : undefined}
          onClose={() => setDialog(null)}
          onSubmit={(change, remarks) => reviseQuotation(change, remarks)}
        />
      )}
      {dialog === "approve" && (
        <QuotationApproveDialog
          quoteNo={quotation.quoteNo}
          wasRevised={quotation.status === "REVISED"}
          amounts={amounts}
          onClose={() => setDialog(null)}
          onSubmit={(remarks) => approveQuotation(remarks)}
        />
      )}
      {dialog === "reject" && (
        <ConfirmDialog
          title={`Reject ${quotation.quoteNo}`}
          body="Rejecting closes this quotation for good: it can't be revised, approved or turned into a Proforma Invoice. Say why, for the record."
          confirmLabel="Reject quotation"
          destructive
          noteLabel="Reason"
          noteRequired
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            await rejectQuotation(reason ?? "");
            toast.success(`${quotation.quoteNo} rejected`);
          }}
        />
      )}
      {dialog === "proforma" && (
        <ProformaInvoiceForm
          quoteNo={quotation.quoteNo}
          amounts={amounts}
          breakdownAvailable={!legacy}
          onClose={() => setDialog(null)}
          onSubmit={(input) => createProformaInvoice(input)}
        />
      )}
    </div>
  );
}
