"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { QuotationStatusTag, ProformaInvoiceStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { QuotationReviseDialog } from "../../../components/forms/QuotationReviseDialog";
import { ProformaInvoiceForm } from "../../../components/forms/ProformaInvoiceForm";
import { useQuotationDetail } from "../../../lib/hooks/useQuotations";
import { useProformaInvoices } from "../../../lib/hooks/useProformaInvoices";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { useToast } from "../../../components/ui/Toast";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate, formatDateTime } from "../../../lib/format";
import { ProformaInvoice } from "../../../lib/types/domain";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;
  const { quotation, opportunity, loading, error, refetch, reviseQuotation, approveQuotation, convertQuotation } = useQuotationDetail(id);
  const { proformaInvoices, createProformaInvoice, refetch: refetchProformas } = useProformaInvoices();
  const repo = useRepository();
  const isReal = repo.kind === "real";
  const [showRevise, setShowRevise] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showProformaForm, setShowProformaForm] = useState(false);

  if (loading && !quotation) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  // A fetch failure (network/5xx) is not the same as a genuine not-found —
  // only getById() resolving to null means the quotation truly doesn't exist.
  if (error) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/quotations")}>
          <Icon name="back" size={14} /> Back to Quotations
        </a>
        <Panel title="Couldn't load this quotation">
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

  if (!quotation) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/quotations")}>
          <Icon name="back" size={14} /> Back to Quotations
        </a>
        <Panel title="Quotation not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This quotation may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  // Which amounts panel to show is decided by the repository mode, not by
  // which optional fields happen to be set on the object — mock quotations
  // never carry real GST/tax figures to render, by design (repo.kind is the
  // same distinction already used for Lead notes/activity — see
  // app/leads/[id]/page.tsx).
  const canRevise = quotation.status !== "CONVERTED";
  const canApprove = quotation.status === "DRAFT" || quotation.status === "REVISED";
  // The backend's own convert() has no status precondition at all — this
  // gate is a UX safeguard matching the documented Revise → Approve →
  // Convert sequence, not a claimed backend restriction.
  const canConvert = quotation.status === "APPROVED";
  const revisions = [...quotation.revisions].sort((a, b) => b.version - a.version);
  const relatedProformas = proformaInvoices.filter((p) => p.quotationId === quotation.id);
  // No backend precondition exists on proforma creation (it doesn't even
  // check the quotation's status) — this mirrors the same documented
  // Quote-to-Cash sequence assumption as Convert's own gate, not a claimed
  // backend rule. See docs/revenueos-stage2-plan.md §4.
  const canCreateProforma = quotation.status === "APPROVED";

  const proformaColumns: Column<ProformaInvoice>[] = [
    { key: "proformaNumber", header: "No.", render: (p) => p.proformaNumber },
    { key: "totalAmount", header: "Amount", render: (p) => formatInr(p.totalAmount) },
    { key: "status", header: "Status", render: (p) => <ProformaInvoiceStatusTag status={p.status} /> },
  ];

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/quotations")}>
        <Icon name="back" size={14} /> Back to Quotations
      </a>
      <div className="crm-grid">
        <div className="card panel">
          <div className="profile-head">
            <div className="top">
              <div className="av-lg">{initials(quotation.customerName)}</div>
              <div>
                <h3>{quotation.quoteNo} <span className="version-badge" style={{ marginLeft: 6 }}>V{quotation.version}</span></h3>
                <div className="co">{quotation.customerName} · Owner: {quotation.ownerName}</div>
              </div>
            </div>
            <div className="tagrow">
              <QuotationStatusTag status={quotation.status} />
              <Tag color="n">{formatInr(quotation.amount)}</Tag>
              {quotation.validUntil && <Tag color="n">Valid until {formatDate(quotation.validUntil)}</Tag>}
            </div>
            <div className="lead-action-row">
              <Button variant="ghost" icon="layers" onClick={() => setShowRevise(true)} disabled={!canRevise}>
                Revise
              </Button>
              <Button variant="primary" icon="check" onClick={() => setShowApprove(true)} disabled={!canApprove}>
                Approve
              </Button>
              <Button variant="ghost" icon="arrow" onClick={() => setShowConvert(true)} disabled={!canConvert}>
                Convert
              </Button>
            </div>
          </div>

          <div style={{ padding: "16px 19px", borderBottom: "1px solid var(--line-2)" }}>
            <DocumentTrail
              nodes={[
                { key: "lead", label: quotation.customerName, sublabel: "Lead", href: opportunity ? `/leads/${opportunity.leadId}` : undefined },
                ...(opportunity ? [{ key: "opp", label: opportunity.title, sublabel: "Opportunity", href: `/opportunities/${opportunity.id}` }] : []),
                { key: "quote", label: quotation.quoteNo, sublabel: "Quotation", current: true },
              ]}
            />
          </div>

          {isReal ? (
            <div className="info-grid">
              <div className="f"><label>Taxable Amount</label><div>{formatInr(quotation.taxableAmount ?? 0)}</div></div>
              <div className="f"><label>GST ({quotation.gstPercent ?? 0}%{quotation.taxType ? ` · ${quotation.taxType}` : ""})</label><div>{formatInr(quotation.gstAmount ?? 0)}</div></div>
              <div className="f"><label>Total Amount</label><div><b>{formatInr(quotation.totalAmount ?? quotation.amount)}</b></div></div>
              <div className="f"><label>Quote Date</label><div>{quotation.quoteDate ? formatDate(quotation.quoteDate) : "—"}</div></div>
            </div>
          ) : (
            <div className="info-grid">
              <div className="f"><label>Taxable Amount (estimate)</label><div>{formatInr(quotation.amount)}</div></div>
              <div className="f"><label>Tax / Total</label><div style={{ color: "var(--faint)" }}>Computed by backend once connected</div></div>
            </div>
          )}

          <div style={{ padding: "0 19px 19px" }}>
            <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
              {isReal
                ? "GST, HSN and total calculation are backend-owned — the figures above are exactly what the connected backend returned."
                : "The amount shown is a frontend presentation estimate. GST, HSN and total calculation are backend-owned per the verified quotation contract — do not treat figures here as final until a real quotation response is connected."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Revision History" flush>
            <div className="tl" style={{ padding: "14px 19px" }}>
              {revisions.length === 0 && (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>
                  {isReal
                    ? "No persisted version history — the backend's revise operation updates the amount in place rather than keeping prior versions."
                    : "No revisions yet."}
                </p>
              )}
              {revisions.map((r, i) => (
                <div className="tl-item" key={r.version}>
                  <div className="dot"><Icon name="layers" size={14} /></div>
                  <div className="body">
                    <div className="r1">
                      <b>V{r.version} — {formatInr(r.amount)}</b>
                      <span className="when">{formatDateTime(r.createdAt)}</span>
                    </div>
                    {r.note && <p>{r.note}</p>}
                    {i === 0 && <p style={{ color: "var(--m)", fontWeight: 600 }}>Current</p>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Related Proforma Invoices"
            flush
            extraHead={
              canCreateProforma ? (
                <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowProformaForm(true); }}>
                  <Icon name="plus" size={14} /> Create Proforma
                </a>
              ) : undefined
            }
          >
            <DataTable
              columns={proformaColumns}
              rows={relatedProformas}
              onRowClick={(p) => router.push(`/proforma-invoices/${p.id}`)}
              emptyTitle="No proforma invoices yet"
              emptyBody={canCreateProforma ? "Create one to move toward a Sales Order." : "Approve this quotation first."}
            />
          </Panel>
          <Panel title="Downstream">
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {quotation.status === "APPROVED"
                ? "This quotation is approved. Create a Proforma Invoice above, and/or Convert directly to a Sales Order — the backend supports both independently and does not require one before the other. Note: the backend does not change this quotation's own status when converting, so it will keep showing Approved even after conversion."
                : "Approve this quotation to create a Proforma Invoice or Convert it to a Sales Order."}
            </p>
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> Revise and Approve mirror VERIFIED backend operations. Convert calls the
        VERIFIED `POST /:id/convert` route, which creates a real Sales Order — Sales Order screens
        themselves are a later Quote-to-Cash stage, so this page only confirms the conversion happened.
      </DesignNote>

      {showRevise && (
        <QuotationReviseDialog
          quoteNo={quotation.quoteNo}
          currentVersion={quotation.version}
          currentAmount={quotation.amount}
          onClose={() => setShowRevise(false)}
          onSubmit={(amount, note) => reviseQuotation(amount, note)}
        />
      )}
      {showApprove && (
        <ConfirmDialog
          title="Approve Quotation"
          body={`Approve ${quotation.quoteNo}? This confirms the current amount and version as final for this stage.`}
          confirmLabel="Approve"
          onClose={() => setShowApprove(false)}
          onConfirm={async () => {
            await approveQuotation();
            toast.show(`${quotation.quoteNo} approved`, "check");
          }}
        />
      )}
      {showConvert && (
        <ConfirmDialog
          title="Convert to Sales Order"
          body={`Convert ${quotation.quoteNo} to a Sales Order? This creates a new Sales Order record from this quotation's current amount and cannot be undone from this screen.`}
          confirmLabel="Convert"
          onClose={() => setShowConvert(false)}
          onConfirm={async () => {
            await convertQuotation();
            toast.show(`${quotation.quoteNo} converted — Sales Order created`, "check");
          }}
        />
      )}
      {showProformaForm && (
        <ProformaInvoiceForm
          quotationId={quotation.id}
          quoteNo={quotation.quoteNo}
          defaultTotalAmount={quotation.totalAmount ?? quotation.amount}
          onClose={() => setShowProformaForm(false)}
          onSubmit={async (input) => {
            const p = await createProformaInvoice(input);
            refetchProformas();
            return p;
          }}
        />
      )}
    </div>
  );
}
