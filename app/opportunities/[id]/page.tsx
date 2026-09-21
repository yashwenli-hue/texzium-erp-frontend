"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { StatusTag, QuotationStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { LifecycleStepper } from "../../../components/ui/LifecycleStepper";
import { QuickActions } from "../../../components/ui/QuickActions";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { QuotationForm } from "../../../components/forms/QuotationForm";
import { useOpportunityDetail } from "../../../lib/hooks/useOpportunities";
import { useQuotations } from "../../../lib/hooks/useQuotations";
import { useToast } from "../../../components/ui/Toast";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";
import { OPPORTUNITY_STEPS, OpportunityStage, Quotation } from "../../../lib/types/domain";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

type StageAction = { kind: "forward" | "back"; stage: OpportunityStage } | { kind: "lost" };

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;
  const { opportunity, lead, loading, error, updateStage, refetch } = useOpportunityDetail(id);
  const { quotations, createQuotation, refetch: refetchQuotations } = useQuotations();
  const [pendingAction, setPendingAction] = useState<StageAction | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);

  if (loading && !opportunity) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  // A fetch failure (403/network/5xx) is not the same as a genuine not-found —
  // only getById() resolving to null (id absent from the real list, or a
  // real 404) means the opportunity truly doesn't exist. See the equivalent
  // Lead Detail handling for the same pattern.
  if (error) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/opportunities")}>
          <Icon name="back" size={14} /> Back to Opportunities
        </a>
        <Panel title="Couldn't load this opportunity">
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

  if (!opportunity) {
    return (
      <div className="page">
        <a className="back-link" onClick={() => goBackOrTo(router, "/opportunities")}>
          <Icon name="back" size={14} /> Back to Opportunities
        </a>
        <Panel title="Opportunity not found">
          <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
            This opportunity may have been removed, or the link is out of date.
          </p>
        </Panel>
      </div>
    );
  }

  const relatedQuotes = quotations.filter((q) => q.opportunityId === opportunity.id);
  const stepIdx = OPPORTUNITY_STEPS.indexOf(opportunity.stage);
  const isLost = opportunity.stage === "Lost";
  const isTerminal = isLost || opportunity.stage === "Won";
  const nextStep: OpportunityStage | undefined =
    !isTerminal && stepIdx >= 0 && stepIdx < OPPORTUNITY_STEPS.length - 1 ? OPPORTUNITY_STEPS[stepIdx + 1] : undefined;
  const prevStep: OpportunityStage | undefined =
    !isTerminal && stepIdx > 0 ? OPPORTUNITY_STEPS[stepIdx - 1] : undefined;

  async function runAction() {
    if (!pendingAction) return;
    if (pendingAction.kind === "lost") {
      await updateStage("Lost");
      toast.show("Opportunity marked Lost", "close");
    } else {
      await updateStage(pendingAction.stage);
      toast.show(`Moved to ${pendingAction.stage}`, "check");
    }
  }

  const quoteColumns: Column<Quotation>[] = [
    { key: "quoteNo", header: "No.", render: (q) => `${q.quoteNo} · V${q.version}` },
    { key: "amount", header: "Amount", render: (q) => formatInr(q.amount) },
    { key: "status", header: "Status", render: (q) => <QuotationStatusTag status={q.status} /> },
  ];

  return (
    <div className="page">
      <a className="back-link" onClick={() => goBackOrTo(router, "/opportunities")}>
        <Icon name="back" size={14} /> Back to Opportunities
      </a>
      <div className="crm-grid">
        <div className="card panel">
          <div className="profile-head">
            <div className="top">
              <div className="av-lg">{initials(opportunity.customerName)}</div>
              <div>
                <h3>{opportunity.title}</h3>
                <div className="co">{opportunity.customerName} · Owner: {opportunity.ownerName}</div>
              </div>
            </div>
            <div className="tagrow">
              <StatusTag status={opportunity.stage} />
              <Tag color="n">{formatInr(opportunity.expectedValue)}</Tag>
              <Tag color="n">{opportunity.probability}% probability</Tag>
            </div>
            {lead && <QuickActions phone={lead.phone} email={lead.email} contactName={opportunity.customerName} />}
          </div>

          <div style={{ padding: "16px 19px", borderBottom: "1px solid var(--line-2)" }}>
            <DocumentTrail
              nodes={[
                { key: "lead", label: opportunity.customerName, sublabel: "Lead", href: `/leads/${opportunity.leadId}` },
                { key: "opp", label: opportunity.title, sublabel: "Opportunity", current: true },
              ]}
            />
          </div>

          <div style={{ padding: "18px 19px" }}>
            <LifecycleStepper
              steps={OPPORTUNITY_STEPS.map((s) => ({ key: s, label: s }))}
              currentKey={opportunity.stage}
              lostKey="Lost"
              lostLabel="Lost"
            />
            <div style={{ marginTop: 8 }}>
              <Tag color="n">Not saved to backend</Tag>
            </div>
            {!isTerminal && (
              <div style={{ display: "flex", gap: 9, marginTop: 16, flexWrap: "wrap" }}>
                {nextStep && (
                  <Button variant="primary" icon="arrow" onClick={() => setPendingAction({ kind: "forward", stage: nextStep })}>
                    Move to {nextStep}
                  </Button>
                )}
                {prevStep && (
                  <Button variant="ghost" onClick={() => setPendingAction({ kind: "back", stage: prevStep })}>
                    Move back to {prevStep}
                  </Button>
                )}
                <Button variant="ghost" className="danger-ghost" icon="close" onClick={() => setPendingAction({ kind: "lost" })}>
                  Mark Lost
                </Button>
              </div>
            )}
          </div>

          <div className="info-grid">
            <div className="f"><label>Expected Close</label><div>{formatDate(opportunity.expectedCloseDate)}</div></div>
            <div className="f"><label>Expected Value</label><div>{formatInr(opportunity.expectedValue)}</div></div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel
            title="Related Quotations"
            flush
            extraHead={
              <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowQuotationForm(true); }}>
                <Icon name="plus" size={14} /> Create Quotation
              </a>
            }
          >
            <DataTable
              columns={quoteColumns}
              rows={relatedQuotes}
              onRowClick={(q) => router.push(`/quotations/${q.id}`)}
              emptyTitle="No quotations yet"
              emptyBody="Create one to move this opportunity toward Quote-to-Cash."
            />
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> Stage movement (forward, backward, or Lost) is UI-only — no backend PATCH
        route for Opportunity stage exists (docs/backend-ui-contract.md §7, §17). It&apos;s saved in your
        browser only, not the connected backend, so it won&apos;t follow this opportunity to another device.
      </DesignNote>

      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.kind === "lost" ? "Mark Opportunity Lost" : pendingAction.kind === "back" ? "Move Stage Back" : "Advance Stage"}
          body={
            pendingAction.kind === "lost"
              ? `Mark "${opportunity.title}" as Lost? This is a terminal state — the opportunity will drop out of the active pipeline.`
              : pendingAction.kind === "back"
              ? `Move "${opportunity.title}" back to ${pendingAction.stage}? Use this if the deal genuinely regressed.`
              : `Move "${opportunity.title}" to ${pendingAction.stage}?`
          }
          confirmLabel={pendingAction.kind === "lost" ? "Mark Lost" : `Move to ${pendingAction.stage}`}
          destructive={pendingAction.kind === "lost"}
          onClose={() => setPendingAction(null)}
          onConfirm={runAction}
        />
      )}

      {showQuotationForm && (
        <QuotationForm
          defaultOpportunityId={opportunity.id}
          onClose={() => setShowQuotationForm(false)}
          onSubmit={async (input) => {
            const q = await createQuotation(input);
            refetchQuotations();
            refetch();
            return q;
          }}
        />
      )}
    </div>
  );
}
