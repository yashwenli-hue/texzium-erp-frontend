"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { StatusTag, Tag } from "../../../components/ui/Tag";
import { Button } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { QuotationReviseDialog } from "../../../components/forms/QuotationReviseDialog";
import { useQuotationDetail } from "../../../lib/hooks/useQuotations";
import { useToast } from "../../../components/ui/Toast";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate, formatDateTime } from "../../../lib/format";

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
  const { quotation, opportunity, loading, reviseQuotation, approveQuotation } = useQuotationDetail(id);
  const [showRevise, setShowRevise] = useState(false);
  const [showApprove, setShowApprove] = useState(false);

  if (loading && !quotation) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
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

  const canRevise = quotation.status !== "Converted";
  const canApprove = quotation.status === "Draft" || quotation.status === "Revised";
  const revisions = [...quotation.revisions].sort((a, b) => b.version - a.version);

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
              <StatusTag status={quotation.status} />
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

          <div className="info-grid">
            <div className="f"><label>Taxable Amount (estimate)</label><div>{formatInr(quotation.amount)}</div></div>
            <div className="f"><label>Tax / Total</label><div style={{ color: "var(--faint)" }}>Computed by backend once connected</div></div>
          </div>

          <div style={{ padding: "0 19px 19px" }}>
            <p style={{ fontSize: 11.5, color: "var(--faint)" }}>
              The amount shown is a frontend presentation estimate. GST, HSN and total calculation are
              backend-owned per the verified quotation contract — do not treat figures here as final
              until a real quotation response is connected.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Revision History" flush>
            <div className="tl" style={{ padding: "14px 19px" }}>
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
          <Panel title="Downstream">
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {quotation.status === "Approved"
                ? "This quotation is approved and eligible to move to a Proforma Invoice — that screen arrives in a later Quote-to-Cash stage."
                : "Approve this quotation to make it eligible for the next Quote-to-Cash stage."}
            </p>
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> Revision History (V1/V2/…) is a mock/UI-only concept — the verified backend
        confirms a `revise` operation exists but not a persisted version-history model (see
        QuotationRevision in lib/types/domain.ts). Revise and Approve mirror VERIFIED backend
        operations; Convert (to Sales Order) is intentionally not offered yet.
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
    </div>
  );
}
