"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel, Cols } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { OPPORTUNITY_STAGE_TINT } from "../../components/ui/Tag";
import { OpportunityStageDialog } from "../../components/opportunities/OpportunityStageDialog";
import { useToast } from "../../components/ui/Toast";
import { KanbanBoard, KanbanColumnConfig } from "../../components/kanban/KanbanBoard";
import { LeadFunnel } from "../../components/ui/Funnel";
import { SourceBreakdown } from "../../components/ui/SourceBreakdown";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads } from "../../lib/hooks/useLeads";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { useTasks } from "../../lib/hooks/useTasks";
import { useQuotations } from "../../lib/hooks/useQuotations";
import { useCustomers } from "../../lib/hooks/useCustomers";
import { useQuoteToCashSummary } from "../../lib/hooks/useQuoteToCashSummary";
import { useFinancialSummary } from "../../lib/hooks/useFinancialSummary";
import { useAuth } from "../../lib/auth/AuthContext";
import { Opportunity, OpportunityStage, OPPORTUNITY_STEPS, formatOpportunityStage, isQualifiedLeadStatus } from "../../lib/types/domain";
import { canMoveOpportunityStage, validateOpportunityStageMove } from "../../lib/repository/shared/opportunityStage";
import { formatInr, formatRelative } from "../../lib/format";
import { classifyFollowup } from "../../lib/followup";

const SNAPSHOT_COLUMNS: KanbanColumnConfig<OpportunityStage>[] = OPPORTUNITY_STEPS.map((stage) => ({
  key: stage,
  label: formatOpportunityStage(stage),
}));

const FOCUS_DEFAULT_COUNT = 5;

interface FocusItem {
  id: string;
  icon: string;
  tone: "bad" | "warn" | "info" | "n";
  urgencyLabel: string;
  title: string;
  company: string;
  time: string;
  href: string;
}

interface StageState {
  count: number;
  loading: boolean;
  error: Error | null;
}

/** Each Quote-to-Cash stage shows its own state independently — one failed list must not blank the others. */
function stageValue(stage: StageState): string {
  if (stage.error) return "—";
  if (stage.loading && stage.count === 0) return "…";
  return String(stage.count);
}

function stageNote(stage: StageState): string | undefined {
  return stage.error ? "Unavailable" : undefined;
}

export default function DashboardPage() {
  const router = useRouter();
  const { leads, createLead } = useLeads();
  const { opportunities, updateStage } = useOpportunities();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canEditStage = hasPermission("opportunities.edit");
  // The move waiting for its confirmation: every drop on the board asks first, and a cancelled one leaves the card where it was.
  const [pendingMove, setPendingMove] = useState<{ opportunity: Opportunity; from: OpportunityStage; to: OpportunityStage } | null>(null);
  const { tasks } = useTasks();
  const { quotations } = useQuotations();
  const { customers } = useCustomers();
  const quoteToCash = useQuoteToCashSummary();
  const { data: financials, loading: financialsLoading, error: financialsError, refetch: refetchFinancials } = useFinancialSummary();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [focusExpanded, setFocusExpanded] = useState(false);

  const openOpportunities = useMemo(
    () => opportunities.filter((o) => o.stage !== "WON" && o.stage !== "LOST"),
    [opportunities]
  );
  const openPipelineValue = useMemo(
    () => openOpportunities.reduce((s, o) => s + o.expectedValue, 0),
    [openOpportunities]
  );
  const wonValue = useMemo(
    () => opportunities.filter((o) => o.stage === "WON").reduce((s, o) => s + o.expectedValue, 0),
    [opportunities]
  );
  const openLeadsCount = leads.filter((l) => l.status !== "REJECTED").length;
  const qualificationRate = leads.length
    ? Math.round((leads.filter((l) => isQualifiedLeadStatus(l.status)).length / leads.length) * 100)
    : 0;

  // MOCK/UI-ONLY prioritization surface — follow-up urgency is derived from
  // the generic mock Task list (see lib/followup.ts), not a real backend
  // LeadFollowup/priority field. Unassigned leads and Draft quotations are
  // computed straight from already-loaded mock data — nothing invented.
  const allFocusItems = useMemo<FocusItem[]>(() => {
    const items: FocusItem[] = [];

    for (const t of tasks) {
      if (t.done || !t.dueAt) continue;
      const urgency = classifyFollowup(t.dueAt);
      const href = t.linkedType === "Lead" ? `/leads/${t.linkedId}` : `/customers/${t.linkedId}`;
      const tone = urgency === "Overdue" ? "bad" : urgency === "Due Today" ? "warn" : "n";
      const urgencyLabel = urgency === "Overdue" ? "Overdue" : urgency === "Due Today" ? "Due today" : "Upcoming";
      items.push({
        id: `task-${t.id}`,
        icon: "clock",
        tone,
        urgencyLabel,
        title: t.title,
        company: t.linkedName,
        time: formatRelative(t.dueAt),
        href,
      });
    }

    for (const l of leads) {
      if (l.status === "NEW" && !l.assignedToId) {
        items.push({
          id: `unassigned-${l.id}`,
          icon: "user",
          tone: "info",
          urgencyLabel: "Needs action",
          title: "Needs an owner assigned",
          company: l.companyName ?? l.customerName,
          time: formatRelative(l.lastActivityAt),
          href: `/leads/${l.id}`,
        });
      }
    }

    for (const q of quotations) {
      if (q.status !== "DRAFT" && q.status !== "REVISED") continue;
      items.push({
        id: `quote-${q.id}`,
        icon: "file",
        tone: "n",
        urgencyLabel: "Needs action",
        title: q.status === "DRAFT" ? `${q.quoteNo} still in Draft` : `${q.quoteNo} revised — needs approval`,
        company: q.customerName,
        time: formatRelative(q.createdAt),
        href: `/quotations/${q.id}`,
      });
    }

    const priority: Record<string, number> = { Overdue: 0, "Due today": 1, "Needs action": 2, Upcoming: 3 };
    return items.sort((a, b) => (priority[a.urgencyLabel] ?? 4) - (priority[b.urgencyLabel] ?? 4));
  }, [tasks, leads, quotations]);

  const focusItems = focusExpanded ? allFocusItems : allFocusItems.slice(0, FOCUS_DEFAULT_COUNT);

  // Every drop opens the same confirmation as the opportunity page (transition, who is acting, an optional
  // remark). Nothing has moved yet: the board only changes after the server accepts the move.
  function handleMove(id: string, stage: OpportunityStage) {
    const opp = opportunities.find((o) => o.id === id);
    if (opp) setPendingMove({ opportunity: opp, from: opp.stage, to: stage });
  }

  // A success is announced only once the move has happened; a refusal stays in the dialog, which explains it.
  async function confirmMove(move: { opportunity: Opportunity; from: OpportunityStage; to: OpportunityStage }, remark: string | undefined) {
    await updateStage(move.opportunity.id, move.to, remark, move.from);
    toast.success(move.to === "WON" ? "Opportunity marked Won" : `Moved to ${formatOpportunityStage(move.to)}`);
  }

  function explainBlockedMove(o: Opportunity, stage: OpportunityStage) {
    try {
      validateOpportunityStageMove(o.stage, stage);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "That move isn't allowed.", "alert");
    }
  }

  function renderOppCard(o: Opportunity) {
    return (
      <>
        <div className="co">{o.customerName}</div>
        <div className="amt">{formatInr(o.expectedValue)}</div>
        <div className="ppl">
          <Icon name="user" size={14} /> {o.ownerName}
        </div>
        <div className="days">
          <span className="tag n" style={{ fontSize: 10.5, padding: "2px 8px" }}>{o.probability}% probability</span>
        </div>
      </>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Dashboard"
        title="Dashboard"
        subtitle="How sales is performing, where the open deals are, and what needs you right now."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowLeadForm(true)}>
            New Lead
          </Button>
        }
      />

      <StatRow>
        <StatCard label="Open Leads" value={String(openLeadsCount)} note="not yet rejected" />
        <StatCard label="Open Pipeline" value={formatInr(openPipelineValue)} note={`${openOpportunities.length} open`} />
        <StatCard label="Won Value" value={formatInr(wonValue)} note={`${opportunities.filter((o) => o.stage === "WON").length} deals`} />
        <StatCard label="Qualification Rate" value={`${qualificationRate}%`} note="of all leads" />
      </StatRow>

      <Cols>
        <Panel
          title="Today's Focus"
          more={allFocusItems.length > FOCUS_DEFAULT_COUNT ? { label: focusExpanded ? "Show less" : `View all (${allFocusItems.length})`, onClick: () => setFocusExpanded((e) => !e) } : undefined}
        >
          {focusItems.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, padding: "6px 0" }}>
              Nothing urgent right now — every follow-up is on schedule.
            </p>
          ) : (
            <div className="list-tight">
              {focusItems.map((item) => (
                <div
                  className="li"
                  key={item.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(item.href)}
                >
                  <div className="ic" style={{ background: `var(--${item.tone === "n" ? "line-2" : item.tone + "-bg"})`, color: item.tone === "n" ? "var(--muted)" : `var(--${item.tone})` }}>
                    <Icon name={item.icon} size={16} />
                  </div>
                  <div className="tx">
                    <b>{item.title}</b>
                    <small>{item.company}</small>
                  </div>
                  <div className="rt">
                    <span className={`focus-urgency ${item.tone}`}>{item.urgencyLabel}</span>
                    <small>{item.time}</small>
                  </div>
                  <Icon name="arrow" size={14} className="li-arrow" />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Lead Qualification Funnel">
          <LeadFunnel leads={leads} />
        </Panel>
      </Cols>

      <Cols>
        <Panel title="Opportunity Pipeline" more={{ label: "Open opportunities", onClick: () => router.push("/opportunities") }}>
          {!canEditStage && (
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 19px 10px" }}>
              You don&apos;t have permission to change opportunity stages, so cards on this board can&apos;t be moved.
            </p>
          )}
          <KanbanBoard
            columns={SNAPSHOT_COLUMNS}
            items={openOpportunities}
            getStage={(o) => o.stage}
            renderCard={renderOppCard}
            gridColumns={4}
            colorMap={OPPORTUNITY_STAGE_TINT}
            onMove={canEditStage ? handleMove : undefined}
            canMove={(o, stage) => canMoveOpportunityStage(o.stage, stage)}
            onBlockedMove={explainBlockedMove}
            onCardClick={(id) => router.push(`/opportunities/${id}`)}
          />
        </Panel>
        <Panel title="Leads by Source">
          <SourceBreakdown leads={leads} />
        </Panel>
      </Cols>

      <Panel title="Quote-to-Cash">
        <StatRow>
          <StatCard label="Quotations" value={stageValue(quoteToCash.quotations)} note={stageNote(quoteToCash.quotations)} />
          <StatCard label="Proforma Invoices" value={stageValue(quoteToCash.proformaInvoices)} note={stageNote(quoteToCash.proformaInvoices)} />
          <StatCard label="Sales Orders" value={stageValue(quoteToCash.salesOrders)} note={stageNote(quoteToCash.salesOrders)} />
          <StatCard label="Dispatch Orders" value={stageValue(quoteToCash.dispatchOrders)} note={stageNote(quoteToCash.dispatchOrders)} />
          <StatCard label="Sales Invoices" value={stageValue(quoteToCash.salesInvoices)} note={stageNote(quoteToCash.salesInvoices)} />
          <StatCard label="Customers" value={String(customers.length)} note="GET /customers" />
        </StatRow>
        <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "10px 19px 0" }}>
          Operational counts from each stage&apos;s own real list — not a conversion funnel. The backend
          does not track which quotation led to which sales order, so no stage-to-stage rate is implied.
        </p>
      </Panel>

      <Panel title="Revenue & Collections" more={{ label: "Open Collections", onClick: () => router.push("/payments") }}>
        {financialsLoading && !financials && <div className="skeleton" style={{ height: 120 }} />}
        {financialsError && (
          <div style={{ padding: "4px 19px 12px" }}>
            <p style={{ color: "var(--bad)", fontSize: 12.5 }}>
              Couldn&apos;t load revenue/collections data: {financialsError.message || "Something went wrong reaching the RevenueOS backend."}
            </p>
            <Button variant="ghost" onClick={refetchFinancials}>Retry</Button>
          </div>
        )}
        {financials && (
          <>
            <StatRow>
              <StatCard label="Total Revenue" value={formatInr(financials.revenue.totalRevenue)} note={`tax ${formatInr(financials.revenue.totalTax)}`} />
              <StatCard label="Outstanding AR" value={formatInr(financials.collections.totalOutstanding)} note={`${financials.collections.totalInvoices} receivables`} />
              <StatCard label="Collected" value={formatInr(financials.collections.totalCollected)} note="all-time" />
              <StatCard label="Recovery Rate" value={financials.recoveryRate.recoveryRate} note="collected vs invoiced" />
            </StatRow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "12px 19px 0", fontSize: 12.5 }}>
              <div>
                <b style={{ color: "var(--text)" }}>AR status</b>{" "}
                <span style={{ color: "var(--muted)" }}>
                  Paid {financials.efficiency.paid} · Partial {financials.efficiency.partial} · Pending {financials.efficiency.pending} · Written off {financials.efficiency.writtenOff}
                </span>
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Aging</b>{" "}
                <span style={{ color: "var(--muted)" }}>
                  0-30d {formatInr(financials.aging.days0to30)} · 31-60d {formatInr(financials.aging.days31to60)} · 61-90d {formatInr(financials.aging.days61to90)} · 90d+ {formatInr(financials.aging.above90)}
                </span>
              </div>
            </div>
          </>
        )}
        <p style={{ fontSize: 11.5, color: "var(--faint)", margin: "12px 19px 0" }}>
          AR status and balances come from the authoritative AccountsReceivable record, never the sales
          invoice&apos;s own payment status field (see Stage 2G). Figures are all-time totals — the backend
          has no date-range filtering on any of these endpoints.
        </p>
      </Panel>

      <DesignNote>
        <b>Design note.</b> &quot;Today&apos;s Focus&quot; is a presentation-only prioritization built from
        mock Task/Lead/Quotation data — follow-up urgency is not a real backend priority field yet (see
        lib/followup.ts). Opportunity stage, and the Open Pipeline and Won Value figures derived from it, come
        from the backend&apos;s saved stage; the figures themselves are summed in the browser. Quote-to-Cash
        and Revenue &amp; Collections above are real, backend-sourced, all-time totals (no endpoint here
        supports a date range) — intentionally excluded are quotation/lead &quot;conversion rate&quot;,
        salesperson performance and customer ranking endpoints, each found during investigation to produce
        naive or misleading numbers rather than true analytics.
      </DesignNote>

      {pendingMove && (
        <OpportunityStageDialog
          opportunityTitle={pendingMove.opportunity.title}
          customerName={pendingMove.opportunity.customerName}
          from={pendingMove.from}
          to={pendingMove.to}
          onConfirm={(remark) => confirmMove(pendingMove, remark)}
          onClose={() => setPendingMove(null)}
        />
      )}

      {showLeadForm && (
        <LeadForm onClose={() => setShowLeadForm(false)} onSubmit={createLead} />
      )}
    </div>
  );
}
