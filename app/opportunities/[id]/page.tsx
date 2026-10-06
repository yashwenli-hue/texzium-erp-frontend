"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { LeadHistoryTimeline } from "../../../components/ui/LeadHistoryTimeline";
import { Panel } from "../../../components/ui/Card";
import { OpportunityStageTag, QuotationStatusTag, Tag } from "../../../components/ui/Tag";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { LifecycleStepper } from "../../../components/ui/LifecycleStepper";
import { QuickActions } from "../../../components/ui/QuickActions";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { QuotationForm } from "../../../components/forms/QuotationForm";
import { useOpportunityDetail } from "../../../lib/hooks/useOpportunities";
import { useQuotations } from "../../../lib/hooks/useQuotations";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../lib/auth/AuthContext";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";
import { OPPORTUNITY_STEPS, OpportunityStage, Quotation, formatOpportunityStage } from "../../../lib/types/domain";
import { canMoveOpportunityStage, isOpportunityStageFinal } from "../../../lib/repository/shared/opportunityStage";
import { QUOTATION_PERMISSIONS } from "../../../lib/repository/shared/quotationLifecycle";

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
  const { hasPermission } = useAuth();
  const canEditStage = hasPermission("opportunities.edit");
  const id = params?.id;
  const { opportunity, lead, timeline, loading, error, updateStage, refetch } = useOpportunityDetail(id);
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
  const isTerminal = isOpportunityStageFinal(opportunity.stage);
  const stageLabel = formatOpportunityStage(opportunity.stage);
  const stepAfter = stepIdx >= 0 ? OPPORTUNITY_STEPS[stepIdx + 1] : undefined;
  const stepBefore = stepIdx > 0 ? OPPORTUNITY_STEPS[stepIdx - 1] : undefined;
  const nextStep: OpportunityStage | undefined =
    stepAfter && canMoveOpportunityStage(opportunity.stage, stepAfter) ? stepAfter : undefined;
  const prevStep: OpportunityStage | undefined =
    stepBefore && canMoveOpportunityStage(opportunity.stage, stepBefore) ? stepBefore : undefined;
  const noStagePermission = "You don't have permission to change an opportunity's stage";

  async function runAction() {
    if (!pendingAction) return;
    // Errors (a stage that changed in the meantime, no permission, a refused
    // move) are thrown to the confirm dialog, which shows the message.
    if (pendingAction.kind === "lost") {
      await updateStage("LOST");
      toast.show("Opportunity marked Lost", "close");
    } else if (pendingAction.stage === "WON") {
      await updateStage("WON");
      toast.show("Opportunity marked Won", "check");
    } else {
      await updateStage(pendingAction.stage);
      toast.show(`Moved to ${formatOpportunityStage(pendingAction.stage)}`, "check");
    }
  }

  const quoteColumns: Column<Quotation>[] = [
    { key: "quoteNo", header: "No.", render: (q) => q.quoteNo },
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
              <OpportunityStageTag stage={opportunity.stage} />
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
              steps={OPPORTUNITY_STEPS.map((s) => ({ key: s, label: formatOpportunityStage(s) }))}
              currentKey={opportunity.stage}
              lostKey="LOST"
              lostLabel="Lost"
            />
            {!isTerminal && (
              <div style={{ display: "flex", gap: 9, marginTop: 16, flexWrap: "wrap" }}>
                {nextStep && (
                  <Button
                    variant="primary"
                    icon="arrow"
                    disabled={!canEditStage}
                    title={canEditStage ? undefined : noStagePermission}
                    onClick={() => setPendingAction({ kind: "forward", stage: nextStep })}
                  >
                    Move to {formatOpportunityStage(nextStep)}
                  </Button>
                )}
                {prevStep && (
                  <Button
                    variant="ghost"
                    disabled={!canEditStage}
                    title={canEditStage ? undefined : noStagePermission}
                    onClick={() => setPendingAction({ kind: "back", stage: prevStep })}
                  >
                    Move back to {formatOpportunityStage(prevStep)}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="danger-ghost"
                  icon="close"
                  disabled={!canEditStage}
                  title={canEditStage ? undefined : noStagePermission}
                  onClick={() => setPendingAction({ kind: "lost" })}
                >
                  Mark Lost
                </Button>
              </div>
            )}
            {isTerminal && (
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}>
                {stageLabel} is final — this opportunity can&apos;t be moved or reopened.
              </p>
            )}
          </div>

          <div className="info-grid">
            <div className="f"><label>Expected Close</label><div>{formatDate(opportunity.expectedCloseDate)}</div></div>
            <div className="f"><label>Expected Value</label><div>{formatInr(opportunity.expectedValue)}</div></div>
          </div>

          <Panel title="Pre-Sales History" flush>
            {lead?.notes && lead.notes.length > 0 && (
              <div style={{ padding: "14px 19px", borderBottom: "1px solid var(--line-2)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  Imported notes
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {lead.notes.map((note) => (
                    <div key={note.id} style={{ fontSize: 13.5 }}>
                      <div>{note.note}</div>
                      <div style={{ color: "var(--muted)", fontSize: 11.5, marginTop: 3 }}>
                        {formatDate(note.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: "6px 0" }}>
              <LeadHistoryTimeline
                entries={timeline}
                emptyText={lead?.notes && lead.notes.length > 0 ? "No activity logged yet." : "No Pre-Sales history available."}
              />
            </div>
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel
            title="Related Quotations"
            flush
            extraHead={
              hasPermission(QUOTATION_PERMISSIONS.create) ? (
                <a className="more" href="#" onClick={(e) => { e.preventDefault(); setShowQuotationForm(true); }}>
                  <Icon name="plus" size={14} /> Create Quotation
                </a>
              ) : undefined
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

      {pendingAction && (
        <ConfirmDialog
          title={
            pendingAction.kind === "lost"
              ? "Mark Opportunity Lost"
              : pendingAction.stage === "WON"
              ? "Mark Opportunity Won"
              : pendingAction.kind === "back"
              ? "Move Stage Back"
              : "Advance Stage"
          }
          body={
            pendingAction.kind === "lost"
              ? `Mark "${opportunity.title}" as Lost? Lost is final — the opportunity can't be reopened and will drop out of the active pipeline.`
              : pendingAction.stage === "WON"
              ? `Mark "${opportunity.title}" as Won? Won is final — the opportunity can't be moved again or reopened.`
              : pendingAction.kind === "back"
              ? `Move "${opportunity.title}" back to ${formatOpportunityStage(pendingAction.stage)}? Use this if the deal genuinely regressed.`
              : `Move "${opportunity.title}" to ${formatOpportunityStage(pendingAction.stage)}?`
          }
          confirmLabel={
            pendingAction.kind === "lost"
              ? "Mark Lost"
              : pendingAction.stage === "WON"
              ? "Mark Won"
              : `Move to ${formatOpportunityStage(pendingAction.stage)}`
          }
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
