"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { LeadHistoryTimeline } from "../../../components/ui/LeadHistoryTimeline";
import { Panel } from "../../../components/ui/Card";
import { DocumentCustomer } from "../../../components/ui/DocumentCustomer";
import { CustomerStatusTag, OpportunityStageTag, QuotationStatusTag, Tag } from "../../../components/ui/Tag";
import { DocumentActions, DocumentAction } from "../../../components/ui/DocumentActions";
import { LinkCustomerDialog } from "../../../components/forms/LinkCustomerDialog";
import { LoadingRegion } from "../../../components/ui/LoadingRegion";
import { Button, EmptyState } from "../../../components/ui/Button";
import { DocumentTrail } from "../../../components/ui/DocumentTrail";
import { LifecycleStepper } from "../../../components/ui/LifecycleStepper";
import { QuickActions } from "../../../components/ui/QuickActions";
import { DataTable, Column } from "../../../components/ui/DataTable";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { OpportunityStageDialog } from "../../../components/opportunities/OpportunityStageDialog";
import { QuotationForm } from "../../../components/forms/QuotationForm";
import { useOpportunityDetail } from "../../../lib/hooks/useOpportunities";
import { useQuotations } from "../../../lib/hooks/useQuotations";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ShareContentDialog } from "../../../components/content/ShareContentDialog";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate } from "../../../lib/format";
import { OPPORTUNITY_STEPS, OpportunityStage, Quotation, formatOpportunityStage } from "../../../lib/types/domain";
import { canMoveOpportunityStage, isOpportunityStageFinal } from "../../../lib/repository/shared/opportunityStage";
import { QUOTATION_PERMISSIONS } from "../../../lib/repository/shared/quotationLifecycle";
import { OPPORTUNITY_EDIT_PERMISSION, opportunityCustomerActions } from "../../../lib/repository/shared/customerLifecycle";

function goBackOrTo(router: ReturnType<typeof useRouter>, fallback: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

/** The move being confirmed: captured when the person asks for it, so the dialog keeps saying what it was asked about even if the page reloads behind it. */
type PendingMove = { from: OpportunityStage; to: OpportunityStage };

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canEditStage = hasPermission("opportunities.edit");
  const id = params?.id;
  const { opportunity, lead, timeline, loading, error, updateStage, linkCustomer, refetch } = useOpportunityDetail(id);
  const { quotations, createQuotation, refetch: refetchQuotations } = useQuotations();
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [customerDialog, setCustomerDialog] = useState<null | "link" | "remove">(null);

  if (loading && !opportunity) {
    return (
      <div className="page">
        <LoadingRegion label="Loading opportunity">
          <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 260 }} />
        </LoadingRegion>
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
  const customerActions = opportunityCustomerActions({
    hasCustomer: !!opportunity.customerId,
    hasQuotation: relatedQuotes.length > 0,
    mayEdit: hasPermission(OPPORTUNITY_EDIT_PERMISSION),
    leadActive: lead ? lead.isActive : true,
  });
  const customerActionList: DocumentAction[] = opportunity.customerId
    ? [
        { key: "change", label: "Change customer", icon: "edit", state: customerActions.change, onClick: () => setCustomerDialog("link") },
        { key: "remove", label: "Remove customer", icon: "close", className: "danger-ghost", state: customerActions.remove, onClick: () => setCustomerDialog("remove") },
      ]
    : [{ key: "link", label: "Link a customer", icon: "target", variant: "primary", state: customerActions.link, onClick: () => setCustomerDialog("link") }];
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

  // The dialog asks for the remark, shows the account and runs this. A success is announced only
  // once the move has really happened; a refusal is thrown back into the dialog, which explains it.
  async function moveTo(from: OpportunityStage, to: OpportunityStage, remark: string | undefined) {
    await updateStage(to, remark, from);
    if (to === "LOST") toast.success("Opportunity marked Lost", { icon: "close" });
    else if (to === "WON") toast.success("Opportunity marked Won");
    else toast.success(`Moved to ${formatOpportunityStage(to)}`);
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
                <div className="co">{opportunity.customer?.customerName ?? opportunity.customerName} · Owner: {opportunity.ownerName}</div>
              </div>
            </div>
            <div className="tagrow">
              <OpportunityStageTag stage={opportunity.stage} />
              <Tag color="n">{formatInr(opportunity.expectedValue)}</Tag>
              <Tag color="n">{opportunity.probability}% probability</Tag>
              {opportunity.customerId && opportunity.customer ? (
                <DocumentCustomer opportunity={opportunity} status="ready" />
              ) : (
                <a href="#customer-panel" className="tag-link" aria-label="No customer linked. Go to the customer section">
                  <Tag color="w">No customer linked</Tag>
                </a>
              )}
            </div>
            {lead && <QuickActions phone={lead.phone} email={lead.email} contactName={opportunity.customerName} country={lead.country ?? null} />}
            {lead && hasPermission("content.view") && hasPermission("content.share") && (
              <div className="content-share-row">
                <Button
                  variant="ghost"
                  icon="share"
                  onClick={() => setShowShare(true)}
                  disabled={!lead.isActive || opportunity.customer?.isActive === false}
                  title={
                    !lead.isActive
                      ? "Reactivate the lead before sharing content for this opportunity"
                      : opportunity.customer?.isActive === false
                        ? "Reactivate the customer before sharing content for this opportunity"
                        : "Share a catalogue, photo or video from the Content Library"
                  }
                >
                  Share content
                </Button>
              </div>
            )}
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
                    onClick={() => setPendingMove({ from: opportunity.stage, to: nextStep })}
                  >
                    {nextStep === "WON" ? "Mark Won" : `Move to ${formatOpportunityStage(nextStep)}`}
                  </Button>
                )}
                {prevStep && (
                  <Button
                    variant="ghost"
                    disabled={!canEditStage}
                    title={canEditStage ? undefined : noStagePermission}
                    onClick={() => setPendingMove({ from: opportunity.stage, to: prevStep })}
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
                  onClick={() => setPendingMove({ from: opportunity.stage, to: "LOST" })}
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
          <div className="card panel" id="customer-panel" data-testid="customer-panel">
            <div className="panel-head">
              <h3>Customer</h3>
            </div>
            <div style={{ padding: "4px 19px 0" }}>
              {opportunity.customer ? (
                <>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Link href={`/customers/${opportunity.customer.id}`} style={{ fontWeight: 700, color: "var(--ink)" }}>
                      {opportunity.customer.customerName}
                    </Link>
                    <small style={{ color: "var(--muted)" }}>{opportunity.customer.customerCode}</small>
                    <CustomerStatusTag isActive={opportunity.customer.isActive} />
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                    Every quotation, Proforma Invoice and Sales Order under this opportunity belongs to this customer.
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: "var(--muted)" }} data-testid="no-customer">
                  <b style={{ color: "var(--text)" }}>No customer linked yet.</b> A quotation is made for a customer, with that customer&apos;s GST registration, so link one before quoting.
                  {relatedQuotes.length > 0 && " This opportunity already has quotations; they will belong to the customer you link."}
                </p>
              )}
            </div>
            <DocumentActions actions={customerActionList} testId="customer-actions" />
          </div>
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

      {pendingMove && (
        <OpportunityStageDialog
          opportunityTitle={opportunity.title}
          customerName={opportunity.customer?.customerName ?? opportunity.customerName}
          from={pendingMove.from}
          to={pendingMove.to}
          onConfirm={(remark) => moveTo(pendingMove.from, pendingMove.to, remark)}
          onClose={() => setPendingMove(null)}
        />
      )}

      {customerDialog === "link" && (
        <LinkCustomerDialog
          opportunityTitle={opportunity.title}
          leadName={lead?.customerName ?? opportunity.customerName}
          leadCompany={lead?.companyName}
          leadEmail={lead?.email}
          leadPhone={lead?.phone}
          currentCustomerId={opportunity.customerId}
          onClose={() => setCustomerDialog(null)}
          onSubmit={(customerId) => linkCustomer(customerId)}
        />
      )}
      {customerDialog === "remove" && (
        <ConfirmDialog
          title="Remove the customer"
          body={`Remove ${opportunity.customer?.customerName ?? "the customer"} from "${opportunity.title}"? You can link a customer again until the first quotation is made.`}
          confirmLabel="Remove customer"
          destructive
          onClose={() => setCustomerDialog(null)}
          onConfirm={async () => {
            await linkCustomer(null);
            toast.show("Customer removed", "check");
          }}
        />
      )}

      {showQuotationForm && (
        <QuotationForm
          defaultOpportunityId={opportunity.id}
          onClose={() => setShowQuotationForm(false)}
          onLinkCustomer={() => {
            setShowQuotationForm(false);
            setCustomerDialog("link");
          }}
          onSubmit={async (input) => {
            const q = await createQuotation(input);
            refetchQuotations();
            refetch();
            return q;
          }}
        />
      )}
      {showShare && lead && (
        <ShareContentDialog
          target={{ type: "OPPORTUNITY", id: opportunity.id, name: opportunity.customerName, phone: lead.phone, country: lead.country ?? null }}
          onShared={refetch}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
