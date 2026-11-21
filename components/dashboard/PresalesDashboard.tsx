"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "../ui/PageHeader";
import { StatCard, StatRow, Panel, Cols } from "../ui/Card";
import { Button, EmptyState } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { OPPORTUNITY_STAGE_TINT } from "../ui/Tag";
import { KanbanBoard, KanbanColumnConfig } from "../kanban/KanbanBoard";
import { LeadFunnel } from "../ui/Funnel";
import { SourceBreakdown } from "../ui/SourceBreakdown";
import { LeadForm } from "../forms/LeadForm";
import { useLeads } from "../../lib/hooks/useLeads";
import { useAuth } from "../../lib/auth/AuthContext";
import { OpportunityStage, OPPORTUNITY_STEPS, formatOpportunityStage } from "../../lib/types/domain";
import { formatInr, formatRelative } from "../../lib/format";
import {
  FocusKind,
  PipelineDeal,
  focusTasks,
  leadToWinConversion,
  pipelineDeals,
  workStatus,
} from "../../lib/presalesDashboard";

const FOCUS_DEFAULT_COUNT = 6;
const PIPELINE_COLUMNS: KanbanColumnConfig<OpportunityStage>[] = OPPORTUNITY_STEPS.map((stage) => ({
  key: stage,
  label: formatOpportunityStage(stage),
}));

const FOCUS_LOOK: Record<FocusKind, { label: string; tone: "bad" | "warn" | "info" | "n"; icon: string }> = {
  overdue: { label: "Overdue", tone: "bad", icon: "clock" },
  today: { label: "Due today", tone: "warn", icon: "clock" },
  qualify: { label: "Ready to qualify", tone: "info", icon: "check" },
  new: { label: "New lead", tone: "info", icon: "user" },
  decide: { label: "Decide", tone: "info", icon: "target" },
  tomorrow: { label: "Tomorrow", tone: "n", icon: "clock" },
  upcoming: { label: "This week", tone: "n", icon: "clock" },
};

/**
 * The dashboard a Pre-Sales user sees: only their own work. Everything comes from
 * GET /leads, which the backend already limits to the leads they are assigned or
 * worked on; each lead carries its follow-ups and its opportunities.
 */
export function PresalesDashboard() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const me = user?.id ?? "";
  const { leads, loading, error, refetch, createLead } = useLeads();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [focusExpanded, setFocusExpanded] = useState(false);

  const activeLeads = useMemo(() => leads.filter((l) => l.isActive), [leads]);
  const status = useMemo(() => workStatus(leads, me), [leads, me]);
  const tasks = useMemo(() => focusTasks(leads, me), [leads, me]);
  const deals = useMemo(() => pipelineDeals(activeLeads).filter((d) => d.stage !== "LOST"), [activeLeads]);
  const conversion = useMemo(() => leadToWinConversion(leads), [leads]);
  const shownTasks = focusExpanded ? tasks : tasks.slice(0, FOCUS_DEFAULT_COUNT);
  const won = conversion[conversion.length - 1];

  function renderDeal(d: PipelineDeal) {
    return (
      <>
        <div className="co">{d.leadName}</div>
        <div className="amt">{formatInr(d.expectedValue)}</div>
        <div className="ppl" title={d.title}>
          <Icon name="brief" size={14} /> {d.title}
        </div>
        <div className="days">
          <span className="tag n" style={{ fontSize: 10.5, padding: "2px 8px" }}>{d.probability}% probability</span>
        </div>
      </>
    );
  }

  const header = (
    <PageHeader
      eyebrow="RevenueOS · Pre-Sales"
      title="My Dashboard"
      subtitle="Your leads, your follow-ups and how your leads are converting. Only your own work is shown."
      cta={
        hasPermission("leads.create") ? (
          <Button variant="primary" icon="plus" onClick={() => setShowLeadForm(true)}>
            New Lead
          </Button>
        ) : undefined
      }
    />
  );

  if (loading && leads.length === 0) {
    return (
      <div className="page" aria-busy="true">
        {header}
        <div className="skeleton" style={{ height: 96, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  if (error && leads.length === 0) {
    return (
      <div className="page">
        {header}
        <Panel title="My work">
          <div style={{ padding: "4px 19px 12px" }} role="alert">
            <p style={{ color: "var(--bad)", fontSize: 12.5 }}>
              Couldn&apos;t load your leads: {error.message || "something went wrong reaching RevenueOS."}
            </p>
            <Button variant="ghost" onClick={refetch}>Retry</Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      {header}

      <StatRow>
        <StatCard
          label="My Open Leads"
          value={String(status.open)}
          note={status.notContacted ? `${status.notContacted} not contacted yet` : "all contacted"}
        />
        <StatCard
          label="Follow-ups Today"
          value={String(status.followupsToday)}
          note={status.followupsOverdue ? `${status.followupsOverdue} overdue` : "none overdue"}
          dir={status.followupsOverdue ? "down" : "flat"}
        />
        <StatCard label="Qualified to Sales" value={String(status.handedOver)} note={`${status.rejected} rejected`} />
        <StatCard label="Won Deals" value={String(won.count)} note="from leads you handled" dir={won.count ? "up" : "flat"} />
      </StatRow>

      <Cols>
        <Panel
          title="Focused Tasks"
          more={
            tasks.length > FOCUS_DEFAULT_COUNT
              ? { label: focusExpanded ? "Show less" : `View all (${tasks.length})`, onClick: () => setFocusExpanded((e) => !e) }
              : undefined
          }
        >
          {tasks.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, padding: "6px 0" }}>
              Nothing waiting on you: every lead assigned to you has a follow-up on schedule.
            </p>
          ) : (
            <div className="list-tight">
              {shownTasks.map((t) => {
                const look = FOCUS_LOOK[t.kind];
                return (
                  <div
                    className="li"
                    key={t.id}
                    role="link"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/leads/${t.leadId}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/leads/${t.leadId}`);
                      }
                    }}
                  >
                    <div
                      className="ic"
                      style={{
                        background: `var(--${look.tone === "n" ? "line-2" : look.tone + "-bg"})`,
                        color: look.tone === "n" ? "var(--muted)" : `var(--${look.tone})`,
                      }}
                    >
                      <Icon name={look.icon} size={16} />
                    </div>
                    <div className="tx">
                      <b>{t.title}</b>
                      <small>{t.leadName}</small>
                    </div>
                    <div className="rt">
                      <span className={`focus-urgency ${look.tone}`}>{look.label}</span>
                      <small>{formatRelative(t.at)}</small>
                    </div>
                    <Icon name="arrow" size={14} className="li-arrow" />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Lead Qualification Funnel">
          <LeadFunnel leads={activeLeads} />
        </Panel>
      </Cols>

      <Cols>
        <Panel title="Opportunity Pipeline">
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 19px 10px" }}>
            Deals opened from leads you qualified. Sales moves them between stages; open a card to see its lead.
          </p>
          {deals.length === 0 ? (
            <EmptyState
              icon="brief"
              title="No deals yet"
              body="When Sales opens an opportunity on a lead you qualified, it shows here."
            />
          ) : (
            <KanbanBoard
              columns={PIPELINE_COLUMNS}
              items={deals}
              getStage={(d) => d.stage}
              renderCard={renderDeal}
              gridColumns={4}
              colorMap={OPPORTUNITY_STAGE_TINT}
              onCardClick={(id) => {
                const d = deals.find((x) => x.id === id);
                if (d) router.push(`/leads/${d.leadId}`);
              }}
            />
          )}
        </Panel>
        <Panel title="Leads by Source">
          <SourceBreakdown leads={activeLeads} />
        </Panel>
      </Cols>

      <Panel title="Lead to Win Conversion">
        <StatRow>
          {conversion.map((step) => (
            <StatCard
              key={step.label}
              label={step.label}
              value={String(step.count)}
              note={step.rate === undefined ? "assigned to you or worked on" : `${step.rate}% of the step before`}
            />
          ))}
        </StatRow>
        <p style={{ fontSize: 11.5, color: "var(--faint-text)", margin: "10px 19px 0" }}>
          &quot;Won&quot; is the deal&apos;s stage as Sales records it. Sales orders are not linked to leads in what
          Pre-Sales can see yet, so orders themselves are not counted here.
        </p>
      </Panel>

      {showLeadForm && <LeadForm onClose={() => setShowLeadForm(false)} onSubmit={createLead} />}
    </div>
  );
}
