"use client";

import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { Panel } from "../../../components/ui/Card";
import { StatusTag, Tag } from "../../../components/ui/Tag";
import { Button } from "../../../components/ui/Button";
import { DesignNote } from "../../../components/ui/PageHeader";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { LifecycleStepper } from "../../../components/ui/LifecycleStepper";
import { QuickActions } from "../../../components/ui/QuickActions";
import { DataTable, Column } from "../../../components/ui/DataTable";
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

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const id = params?.id;
  const { opportunity, lead, loading, updateStage } = useOpportunityDetail(id);
  const { quotations } = useQuotations();

  if (loading && !opportunity) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
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

  async function advance() {
    if (!nextStep) return;
    await updateStage(nextStep);
    toast.show(`Moved to ${nextStep}`, "check");
  }

  async function markLost() {
    await updateStage("Lost");
    toast.show("Opportunity marked Lost", "close");
  }

  const quoteColumns: Column<Quotation>[] = [
    { key: "quoteNo", header: "No.", render: (q) => q.quoteNo },
    { key: "amount", header: "Amount", render: (q) => formatInr(q.amount) },
    { key: "status", header: "Status", render: (q) => <StatusTag status={q.status} /> },
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
            {!isTerminal && (
              <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
                {nextStep && (
                  <Button variant="primary" icon="arrow" onClick={advance}>
                    Move to {nextStep}
                  </Button>
                )}
                <Button variant="ghost" className="danger-ghost" icon="close" onClick={markLost}>
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
          <Panel title="Related Quotations" flush>
            <DataTable
              columns={quoteColumns}
              rows={relatedQuotes}
              emptyTitle="No quotations yet"
              emptyBody="Quote-to-cash workflows (Quotations onward) arrive in a later stage."
            />
          </Panel>
        </div>
      </div>

      <DesignNote>
        <b>Design note.</b> Stage-advance here is UI-only for now — no backend PATCH route for
        Opportunity stage is confirmed yet (docs/backend-ui-contract.md §2), so this exercises the
        stepper and updates only the local mock store until a real endpoint is confirmed.
      </DesignNote>
    </div>
  );
}
