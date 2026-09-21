"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { ProformaInvoiceStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useProformaInvoiceDetail } from "../../../lib/hooks/useProformaInvoices";
import { useToast } from "../../../components/ui/Toast";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";

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
  const id = params?.id;
  const { proforma, quotation, opportunity, loading, error, refetch, approveProformaInvoice } = useProformaInvoiceDetail(id);
  const [showApprove, setShowApprove] = useState(false);

  if (loading && !proforma) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  // A fetch failure (network/5xx) is not the same as a genuine not-found —
  // only getById() resolving to null means the proforma invoice truly
  // doesn't exist. Same pattern as Opportunity/Quotation detail.
  if (error) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/proforma-invoices")}>
          <Icon name="back" size={14} /> Back to Proforma Invoices
        </a>
        <Panel title="Couldn't load this proforma invoice">
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

  const canApprove = proforma.status === "PENDING";

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/proforma-invoices")}>
        <Icon name="back" size={14} /> Back to Proforma Invoices
      </a>
      <div className="crm-grid">
        <div className="card panel">
          <div className="profile-head">
            <div className="top">
              <div className="av-lg">{initials(proforma.customerName)}</div>
              <div>
                <h3>{proforma.proformaNumber}</h3>
                <div className="co">{proforma.customerName} · Owner: {proforma.ownerName}</div>
              </div>
            </div>
            <div className="tagrow">
              <ProformaInvoiceStatusTag status={proforma.status} />
              <Tag color="n">{formatInr(proforma.totalAmount)}</Tag>
              {proforma.validityDate && <Tag color="n">Valid until {formatDate(proforma.validityDate)}</Tag>}
            </div>
            <div className="lead-action-row">
              <Button variant="primary" icon="check" onClick={() => setShowApprove(true)} disabled={!canApprove}>
                Approve
              </Button>
            </div>
          </div>

          <div style={{ padding: "16px 19px", borderBottom: "1px solid var(--line-2)" }}>
            <DocumentTrail
              nodes={[
                { key: "lead", label: proforma.customerName, sublabel: "Lead", href: opportunity ? `/leads/${opportunity.leadId}` : undefined },
                ...(opportunity ? [{ key: "opp", label: opportunity.title, sublabel: "Opportunity", href: `/opportunities/${opportunity.id}` }] : []),
                ...(quotation ? [{ key: "quote", label: quotation.quoteNo, sublabel: "Quotation", href: `/quotations/${quotation.id}` }] : []),
                { key: "proforma", label: proforma.proformaNumber, sublabel: "Proforma Invoice", current: true },
              ]}
            />
          </div>

          <div className="info-grid">
            <div className="f"><label>Issue Date</label><div>{formatDate(proforma.issueDate)}</div></div>
            <div className="f"><label>Total Amount</label><div><b>{formatInr(proforma.totalAmount)}</b></div></div>
          </div>

          {proforma.remarks && (
            <div style={{ padding: "0 19px 19px" }}>
              <div className="f">
                <label>Remarks</label>
                <div style={{ fontWeight: 400, color: "var(--text)" }}>{proforma.remarks}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Downstream">
            <p style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {proforma.status === "APPROVED"
                ? "This proforma invoice is approved. Sales Order creation from an approved proforma is a later Quote-to-Cash stage — that screen hasn't been built yet."
                : "Approve this proforma invoice to move it toward the next Quote-to-Cash stage."}
            </p>
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> Approve mirrors the VERIFIED `PATCH /:id/approve` operation, which sets
        customerStatus to Approved — no other status exists. There is no verified Sales Order creation
        tied to this action, so none is offered here.
      </DesignNote>

      {showApprove && (
        <ConfirmDialog
          title="Approve Proforma Invoice"
          body={`Approve ${proforma.proformaNumber}? This confirms it for the customer.`}
          confirmLabel="Approve"
          onClose={() => setShowApprove(false)}
          onConfirm={async () => {
            await approveProformaInvoice();
            toast.show(`${proforma.proformaNumber} approved`, "check");
          }}
        />
      )}
    </div>
  );
}
