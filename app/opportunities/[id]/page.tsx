"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "../../../components/ui/Icon";
import { LeadHistoryTimeline } from "../../../components/ui/LeadHistoryTimeline";
import { Panel } from "../../../components/ui/Card";
import { DocumentCustomer } from "../../../components/ui/DocumentCustomer";
import { CustomerStatusTag, OpportunityStageTag, QuotationStatusTag } from "../../../components/ui/Tag";
import { DocumentActions, DocumentAction } from "../../../components/ui/DocumentActions";
import { LinkCustomerDialog } from "../../../components/forms/LinkCustomerDialog";
import { LoadingRegion } from "../../../components/ui/LoadingRegion";
import { Button, EmptyState } from "../../../components/ui/Button";
import { LifecycleStepper } from "../../../components/ui/LifecycleStepper";
import { QuickActions } from "../../../components/ui/QuickActions";
import { BackLink } from "../../../components/ui/BackLink";
import { NextUp } from "../../../components/ui/NextUp";
import { NextStepCell } from "../../../components/ui/NextStepCell";
import { RecordJourney } from "../../../components/ui/RecordJourney";
import { RecordPager } from "../../../components/ui/RecordPager";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { OpportunityStageDialog } from "../../../components/opportunities/OpportunityStageDialog";
import { QuotationForm } from "../../../components/forms/QuotationForm";
import { LeadActivityForm } from "../../../components/forms/LeadActivityForm";
import { useRepository } from "../../../lib/repository/RepositoryProvider";
import { useOpportunityDetail } from "../../../lib/hooks/useOpportunities";
import { useQuotationPipeline } from "../../../lib/hooks/useQuotations";
import { buildCommercialChain, quotationNextStep } from "../../../lib/repository/shared/commercialChain";
import { OpportunityAction, lastContactAt, opportunityAttention } from "../../../lib/repository/shared/opportunityWorkspace";
import { leadJourney } from "../../../lib/repository/shared/leadWorkspace";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ShareContentDialog } from "../../../components/content/ShareContentDialog";
import { initials } from "../../../components/ui/Who";
import { formatInr, formatDate, formatRelative } from "../../../lib/format";
import { CallOutcome, OPPORTUNITY_STEPS, OpportunityStage, formatOpportunityStage } from "../../../lib/types/domain";
import { canMoveOpportunityStage, isOpportunityStageFinal } from "../../../lib/repository/shared/opportunityStage";
import { QUOTATION_PERMISSIONS } from "../../../lib/repository/shared/quotationLifecycle";
import { OPPORTUNITY_EDIT_PERMISSION, opportunityCustomerActions } from "../../../lib/repository/shared/customerLifecycle";

/** The move being confirmed: captured when the person asks for it, so the dialog keeps saying what it was asked about even if the page reloads behind it. */
type PendingMove = { from: OpportunityStage; to: OpportunityStage };

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canEditStage = hasPermission("opportunities.edit");
  const id = params?.id;
  const { opportunity, lead, timeline, loading, error, updateStage, linkCustomer, refetch } = useOpportunityDetail(id);
  const { quotations, proformas, orders, createQuotation, refetch: refetchQuotations } = useQuotationPipeline();
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  // The interaction form, open with this outcome preset ("" = none); null = closed.
  const [activityOutcome, setActivityOutcome] = useState<CallOutcome | "" | null>(null);
  const repo = useRepository();
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
        <BackLink fallback="/opportunities">Back to Opportunities</BackLink>
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
        <BackLink fallback="/opportunities">Back to Opportunities</BackLink>
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

  const chains = new Map(relatedQuotes.map((q) => [q.id, buildCommercialChain(q.id, proformas, orders)]));
  const quotesWithNext = relatedQuotes.map((q) => ({ ...q, next: quotationNextStep(q, chains.get(q.id)!) }));
  const leadActive = lead ? lead.isActive : true;
  const attention = opportunityAttention({
    opportunity,
    leadActive,
    quotations: quotesWithNext,
    timeline,
    may: { editStage: canEditStage, editOpportunity: hasPermission(OPPORTUNITY_EDIT_PERMISSION), createQuotation: hasPermission(QUOTATION_PERMISSIONS.create), logActivity: hasPermission("leads.edit") },
    linkState: customerActions.link,
    now: new Date(),
  });
  const journey = lead ? leadJourney(lead, opportunity, relatedQuotes.length) : null;
  const closePassed = !isTerminal && !!opportunity.expectedCloseDate && new Date(opportunity.expectedCloseDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const lastContact = lastContactAt(timeline);
  const stageReason = !canEditStage ? noStagePermission : !leadActive ? "The lead is deactivated." : undefined;
  const stageActions: DocumentAction[] = isTerminal
    ? []
    : [
        ...(nextStep ? [{ key: "next", label: nextStep === "WON" ? "Mark Won" : `Move to ${formatOpportunityStage(nextStep)}`, icon: "arrow", variant: "primary" as const, state: { enabled: !stageReason, reason: stageReason }, onClick: () => setPendingMove({ from: opportunity.stage, to: nextStep }) }] : []),
        ...(prevStep ? [{ key: "back", label: `Back to ${formatOpportunityStage(prevStep)}`, state: { enabled: !stageReason, reason: stageReason }, onClick: () => setPendingMove({ from: opportunity.stage, to: prevStep }) }] : []),
        { key: "lost", label: "Mark Lost", icon: "close", className: "danger-ghost", state: { enabled: !stageReason, reason: stageReason }, onClick: () => setPendingMove({ from: opportunity.stage, to: "LOST" }) },
      ];
  const mayLog = !!lead && lead.isActive && hasPermission("leads.edit");
  const mayQuote = hasPermission(QUOTATION_PERMISSIONS.create);

  function onAttention(a: OpportunityAction) {
    if (a.type === "link") setCustomerDialog("link");
    else if (a.type === "quote") setShowQuotationForm(true);
    else if (a.type === "logCall") setActivityOutcome("");
    else if (a.type === "moveNext" && nextStep) setPendingMove({ from: opportunity!.stage, to: nextStep });
    else if (a.type === "lost") setPendingMove({ from: opportunity!.stage, to: "LOST" });
  }

  return (
    <div className="page opp-ws">
      <div className="ws-top">
        <BackLink fallback="/opportunities">Back to Opportunities</BackLink>
        <RecordPager kind="opportunity" id={opportunity.id} hrefOf={(x) => `/opportunities/${x}`} />
      </div>

      <header className="card ws-head">
        <div className="ws-id">
          <div className="av-lg" aria-hidden="true">{initials(opportunity.customerName)}</div>
          <div className="ws-title">
            <p className="ws-kind">Opportunity</p>
            <h1>{opportunity.title}</h1>
            <p className="co">
              {opportunity.customer ? <Link href={`/customers/${opportunity.customer.id}`}>{opportunity.customer.customerName}</Link> : <>{opportunity.customerName} · <span className="ws-warn">no customer linked</span></>}
              {" · from lead "}
              <Link href={`/leads/${opportunity.leadId}`}>{lead?.customerName ?? opportunity.customerName}</Link>
            </p>
            <div className="tagrow">
              <OpportunityStageTag stage={opportunity.stage} />
              {opportunity.customerId && opportunity.customer && <DocumentCustomer opportunity={opportunity} status="ready" />}
            </div>
          </div>
        </div>
        <dl className="ws-facts">
          <div><dt>Expected value</dt><dd>{formatInr(opportunity.expectedValue)}</dd></div>
          <div>
            <dt>Probability</dt>
            <dd className="ws-prob">
              <span className="bar" aria-hidden="true"><i style={{ width: `${opportunity.probability}%` }} /></span>
              {opportunity.probability}%
            </dd>
          </div>
          <div><dt>Expected close</dt><dd className={closePassed ? "ws-warn" : undefined}>{formatDate(opportunity.expectedCloseDate)}{closePassed && <small> · passed</small>}</dd></div>
          <div><dt>Owner</dt><dd>{opportunity.ownerName} <small>{lastContact ? `· last contact ${formatRelative(lastContact)}` : "· no contact logged"}</small></dd></div>
        </dl>
        {lead && (
          <QuickActions
            phone={lead.phone}
            email={lead.email}
            contactName={opportunity.customerName}
            country={lead.country ?? null}
            share={
              hasPermission("content.view") && hasPermission("content.share")
                ? {
                    onShare: () => setShowShare(true),
                    unavailable: !lead.isActive
                      ? "Reactivate the lead before sharing content for this opportunity."
                      : opportunity.customer?.isActive === false
                        ? "Reactivate the customer before sharing content for this opportunity."
                        : undefined,
                  }
                : undefined
            }
          />
        )}
        <div className="ws-stage">
          <LifecycleStepper
            steps={OPPORTUNITY_STEPS.map((s) => ({ key: s, label: formatOpportunityStage(s) }))}
            currentKey={opportunity.stage}
            lostKey="LOST"
            lostLabel="Lost"
          />
          {stageActions.length > 0 ? (
            <div className="ws-actions"><DocumentActions actions={stageActions} testId="opportunity-stage-actions" /></div>
          ) : (
            <p className="ws-sub">{stageLabel} is final — this opportunity can&apos;t be moved or reopened.</p>
          )}
        </div>
        {journey && (
          <div className="ws-journey">
            <RecordJourney steps={journey} />
          </div>
        )}
      </header>

      <NextUp items={attention} onAction={onAttention} />

      <div className="ws-grid">
        <div className="ws-main">
          <Panel
            title="Calls, meetings & history"
            flush
            extraHead={
              mayLog ? (
                <span className="panel-acts">
                  <button type="button" className="more" onClick={() => setActivityOutcome("NOT_CONNECTED")}>
                    <Icon name="phone" size={14} /> Log CNC
                  </button>
                  <button type="button" className="more" onClick={() => setActivityOutcome("")}>
                    <Icon name="plus" size={14} /> Log call or meeting
                  </button>
                </span>
              ) : undefined
            }
          >
            {lead?.notes && lead.notes.length > 0 && (
              <div className="ws-notes ws-notes-top">
                <h4>Imported with the lead</h4>
                {lead.notes.map((note) => (
                  <div key={note.id} className="ws-note">
                    <p>{note.note}</p>
                    <small>{formatDate(note.createdAt)}</small>
                  </div>
                ))}
              </div>
            )}
            <LeadHistoryTimeline
              entries={timeline}
              emptyText={lead?.notes && lead.notes.length > 0 ? "No activity logged yet." : "No Pre-Sales history available."}
            />
          </Panel>
        </div>

        <aside className="ws-side" aria-label="Customer and quotations">
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
            title={`Quotations${relatedQuotes.length ? ` · ${relatedQuotes.length}` : ""}`}
            flush
            extraHead={
              mayQuote ? (
                <span className="panel-acts">
                  <button type="button" className="more" onClick={() => setShowQuotationForm(true)}>
                    <Icon name="plus" size={14} /> Create quotation
                  </button>
                </span>
              ) : undefined
            }
          >
            {quotesWithNext.length === 0 ? (
              <p className="ws-empty">
                No quotations yet.{" "}
                {!opportunity.customerId ? "Link a customer first." : mayQuote ? "Create one to start Quote-to-Cash." : "Someone with the quotations.create permission can create one."}
              </p>
            ) : (
              <ul className="ws-links">
                {quotesWithNext.map((q) => (
                  <li key={q.id}>
                    <Link href={`/quotations/${q.id}`} className="ws-link">
                      <span className="wl-main">
                        <b>{q.quoteNo}</b>
                        <small>{formatInr(q.amount)} · <NextStepCell step={q.next} /></small>
                      </span>
                      <QuotationStatusTag status={q.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
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
            toast.success("Customer removed");
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
      {activityOutcome !== null && lead && (
        <LeadActivityForm
          customerName={lead.customerName}
          context={`Recorded on the lead's history, for the opportunity "${opportunity.title}".`}
          initialOutcome={activityOutcome || undefined}
          onClose={() => setActivityOutcome(null)}
          onSubmit={async (input) => {
            await repo.leads.logActivity(lead.id, input);
            refetch();
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
