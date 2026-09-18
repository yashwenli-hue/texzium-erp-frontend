"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { StatCard, StatRow, Panel, Cols } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Who } from "../../components/ui/Who";
import { StatusTag } from "../../components/ui/Tag";
import { Icon } from "../../components/ui/Icon";
import { DataTable, Column } from "../../components/ui/DataTable";
import { KanbanBoard, KanbanColumnConfig } from "../../components/kanban/KanbanBoard";
import { LeadFunnel } from "../../components/ui/Funnel";
import { SourceBreakdown } from "../../components/ui/SourceBreakdown";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads } from "../../lib/hooks/useLeads";
import { useOpportunities } from "../../lib/hooks/useOpportunities";
import { useTasks } from "../../lib/hooks/useTasks";
import { useQuotations } from "../../lib/hooks/useQuotations";
import { Lead, Opportunity, OpportunityStage, OPPORTUNITY_STEPS } from "../../lib/types/domain";
import { formatInr } from "../../lib/format";
import { classifyFollowup } from "../../lib/followup";

const SNAPSHOT_COLUMNS: KanbanColumnConfig<OpportunityStage>[] = OPPORTUNITY_STEPS.map((stage) => ({
  key: stage,
  label: stage,
}));

interface AttentionItem {
  id: string;
  icon: string;
  tone: "bad" | "warn" | "info" | "n";
  title: string;
  subtitle: string;
  href: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { leads, createLead } = useLeads();
  const { opportunities, updateStage } = useOpportunities();
  const { tasks } = useTasks();
  const { quotations } = useQuotations();
  const [showLeadForm, setShowLeadForm] = useState(false);

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
  const openLeadsCount = leads.filter((l) => l.status !== "Rejected").length;

  // MOCK/UI-ONLY prioritization surface — overdue/due-today follow-ups are
  // derived from the generic mock Task list (see lib/followup.ts), not a
  // real backend LeadFollowup. Unassigned leads and Draft quotations are
  // computed straight from already-loaded mock data — nothing invented.
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    const leadById = new Map(leads.map((l) => [l.id, l]));

    for (const t of tasks) {
      if (t.done || !t.dueAt) continue;
      const urgency = classifyFollowup(t.dueAt);
      if (urgency !== "Overdue" && urgency !== "Due Today") continue;
      const href = t.linkedType === "Lead" ? `/leads/${t.linkedId}` : `/customers/${t.linkedId}`;
      items.push({
        id: `task-${t.id}`,
        icon: "clock",
        tone: urgency === "Overdue" ? "bad" : "warn",
        title: t.title,
        subtitle: `${urgency === "Overdue" ? "Overdue" : "Due today"} · ${t.linkedName}`,
        href,
      });
    }

    for (const l of leads) {
      if (l.status === "New" && !l.assignedToId) {
        items.push({
          id: `unassigned-${l.id}`,
          icon: "user",
          tone: "info",
          title: `${l.customerName} needs an owner`,
          subtitle: `New lead · ${l.sourceName} · unassigned`,
          href: `/leads/${l.id}`,
        });
      }
    }

    for (const q of quotations) {
      if (q.status !== "Draft") continue;
      items.push({
        id: `quote-${q.id}`,
        icon: "file",
        tone: "n",
        title: `${q.quoteNo} still in Draft`,
        subtitle: `${q.customerName} · ${formatInr(q.amount)}`,
        href: `/quotations/${q.id}`,
      });
    }

    const priority: Record<AttentionItem["tone"], number> = { bad: 0, warn: 1, info: 2, n: 3 };
    return items.sort((a, b) => priority[a.tone] - priority[b.tone]).slice(0, 7);
  }, [tasks, leads, quotations]);

  const recentColumns: Column<Lead>[] = [
    { key: "customerName", header: "Lead", render: (l) => <Who name={l.customerName} sub={l.companyName ?? l.sourceName} /> },
    { key: "sourceName", header: "Source", render: (l) => l.sourceName },
    { key: "status", header: "Status", render: (l) => <StatusTag status={l.status} /> },
    { key: "assignedToName", header: "Assigned To", render: (l) => l.assignedToName ?? "Unassigned" },
  ];

  const recentLeads = [...leads]
    .sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1))
    .slice(0, 5);

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
        <StatCard label="Total Leads" value={String(leads.length)} note="in the system" />
      </StatRow>

      <Cols>
        <Panel title="What Needs Your Attention">
          {attentionItems.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13, padding: "6px 0" }}>
              Nothing urgent right now — every follow-up is on schedule.
            </p>
          ) : (
            <div className="list-tight">
              {attentionItems.map((item) => (
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
                    <small>{item.subtitle}</small>
                  </div>
                  <Icon name="arrow" size={14} className="li-arrow" />
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Leads by Source">
          <SourceBreakdown leads={leads} />
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
        <Panel title="Lead Qualification Funnel">
          <LeadFunnel leads={leads} />
        </Panel>
      </Cols>

      <div style={{ marginTop: 16 }}>
        <Panel title="Recent Leads" more={{ label: "View all", onClick: () => router.push("/leads") }} flush>
          <DataTable
            columns={recentColumns}
            rows={recentLeads}
            onRowClick={(l) => router.push(`/leads/${l.id}`)}
            emptyTitle="No leads yet"
            emptyBody="Create your first lead to see it here."
          />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> &quot;What Needs Your Attention&quot; is a presentation-only prioritization
        built from mock Task/Lead/Quotation data — overdue/due-today follow-ups are not a real backend
        LeadFollowup yet (see lib/followup.ts). Everything else recomputes live from current data.
      </DesignNote>

      {showLeadForm && (
        <LeadForm onClose={() => setShowLeadForm(false)} onSubmit={createLead} />
      )}
    </div>
  );
}
