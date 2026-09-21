"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel, Cols } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { KanbanBoard, KanbanColumnConfig } from "../../components/kanban/KanbanBoard";
import { LeadFunnel } from "../../components/ui/Funnel";
import { SourceBreakdown } from "../../components/ui/SourceBreakdown";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads } from "../../lib/hooks/useLeads";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { useTasks } from "../../lib/hooks/useTasks";
import { useQuotations } from "../../lib/hooks/useQuotations";
import { Opportunity, OpportunityStage, OPPORTUNITY_STEPS, isQualifiedLeadStatus } from "../../lib/types/domain";
import { formatInr, formatRelative } from "../../lib/format";
import { classifyFollowup } from "../../lib/followup";

const SNAPSHOT_COLUMNS: KanbanColumnConfig<OpportunityStage>[] = OPPORTUNITY_STEPS.map((stage) => ({
  key: stage,
  label: stage,
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

export default function DashboardPage() {
  const router = useRouter();
  const { leads, createLead } = useLeads();
  const { opportunities, updateStage } = useOpportunities();
  const { tasks } = useTasks();
  const { quotations } = useQuotations();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [focusExpanded, setFocusExpanded] = useState(false);

  const openOpportunities = useMemo(
    () => opportunities.filter((o) => o.stage !== "Won" && o.stage !== "Lost"),
    [opportunities]
  );
  const openPipelineValue = useMemo(
    () => openOpportunities.reduce((s, o) => s + o.expectedValue, 0),
    [openOpportunities]
  );
  const wonValue = useMemo(
    () => opportunities.filter((o) => o.stage === "Won").reduce((s, o) => s + o.expectedValue, 0),
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
      if (q.status !== "DRAFT") continue;
      items.push({
        id: `quote-${q.id}`,
        icon: "file",
        tone: "n",
        urgencyLabel: "Needs action",
        title: `${q.quoteNo} still in Draft`,
        company: q.customerName,
        time: formatRelative(q.createdAt),
        href: `/quotations/${q.id}`,
      });
    }

    const priority: Record<string, number> = { Overdue: 0, "Due today": 1, "Needs action": 2, Upcoming: 3 };
    return items.sort((a, b) => (priority[a.urgencyLabel] ?? 4) - (priority[b.urgencyLabel] ?? 4));
  }, [tasks, leads, quotations]);

  const focusItems = focusExpanded ? allFocusItems : allFocusItems.slice(0, FOCUS_DEFAULT_COUNT);

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
        <StatCard label="Open Pipeline" value={formatInr(openPipelineValue)} note={`${openOpportunities.length} open opportunities`} />
        <StatCard label="Won Value" value={formatInr(wonValue)} note={`${opportunities.filter((o) => o.stage === "Won").length} deals`} />
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
          <KanbanBoard
            columns={SNAPSHOT_COLUMNS}
            items={openOpportunities}
            getStage={(o) => o.stage}
            renderCard={renderOppCard}
            gridColumns={4}
            onMove={(id, stage) => updateStage(id, stage)}
            onCardClick={(id) => router.push(`/opportunities/${id}`)}
          />
        </Panel>
        <Panel title="Leads by Source">
          <SourceBreakdown leads={leads} />
        </Panel>
      </Cols>

      <DesignNote>
        <b>Design note.</b> &quot;Today&apos;s Focus&quot; is a presentation-only prioritization built from
        mock Task/Lead/Quotation data — follow-up urgency is not a real backend priority field yet (see
        lib/followup.ts). Opportunity stage now persists across a refresh via local mock storage (see
        lib/repository/mock/entityStore.ts) — still not a real backend transition endpoint.
      </DesignNote>

      {showLeadForm && (
        <LeadForm onClose={() => setShowLeadForm(false)} onSubmit={createLead} />
      )}
    </div>
  );
}
