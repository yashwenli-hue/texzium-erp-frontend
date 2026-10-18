"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { Button, EmptyState, Pagination } from "../../components/ui/Button";
import { Chip, ChipGroup } from "../../components/ui/Tag";
import { SourceTag } from "../../components/ui/SourceBadge";
import { FollowupTag } from "../../components/ui/FollowupTag";
import { initials } from "../../components/ui/Who";
import { ResponsiveList, ResponsiveColumn } from "../../components/ui/ResponsiveList";
import { FilterBar, ActiveFilterChips, DateRangeFilter } from "../../components/ui/FilterButton";
import { LeadForm } from "../../components/forms/LeadForm";
import { LastCallTag, LeadStatusCell, ListStatus, leadListSort } from "../../components/leads/LeadListParts";
import { leadFilterGroups } from "../../components/leads/leadFilters";
import { useLeadListView } from "../../lib/hooks/useLeadListView";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useAuth } from "../../lib/auth/AuthContext";
import { Lead } from "../../lib/types/domain";
import { CreateLeadInput } from "../../lib/repository/interfaces";
import { formatRelative, formatDate } from "../../lib/format";
import { nextPendingFollowup } from "../../lib/followup";
import { formatLeadLocationShort } from "../../lib/geo/leadLocation";
import { FilterMap } from "../../lib/types/common";
import { LEAD_LIST_VIEW_KEY, LeadFilterKey, leadRowLabel } from "../../lib/repository/shared/leadList";

const PAGE_SIZE = 20;
const FILTERS: readonly LeadFilterKey[] = ["stage", "status", "assignment", "followup", "lastCall", "presales", "sales", "source", "product", "country", "state", "city"];

const none = (text = "—") => <span className="cell-none">{text}</span>;

export default function LeadsPage() {
  // Search, filters, sort and page run on the server (GET /leads/search) and are kept for
  // this browser tab, so opening a lead and coming back finds the list as it was left.
  const { view, setView, change, result, loaded, loading, searching, error, refetch } = useLeadListView(LEAD_LIST_VIEW_KEY, PAGE_SIZE);
  const { search, filters, dateRange, showDeactivated } = view;
  const repo = useRepository();
  const { hasPermission } = useAuth();
  const [showForm, setShowForm] = useState(false);

  const setFilters = (f: FilterMap) => change({ filters: f });
  const filterGroups = leadFilterGroups(result.facets, filters, FILTERS);
  const anyFilter = !!search.trim() || Object.keys(filters).length > 0 || !!dateRange.from || !!dateRange.to;

  async function createLead(input: CreateLeadInput) {
    const lead = await repo.leads.create(input);
    refetch();
    return lead;
  }

  const subline = (l: Lead) => [l.companyName, formatLeadLocationShort(l)].filter(Boolean).join(" · ");
  const followupOf = (l: Lead) => nextPendingFollowup(l.followups);

  const columns: ResponsiveColumn<Lead>[] = [
    {
      key: "customerName",
      header: "Lead",
      sortKey: "customerName",
      // A fixed-width identity column: a long name, company or place is cut short with "…"
      // instead of widening the table. The whole value is in the tooltip, in the row
      // link's accessible name, and on the lead's own page.
      render: (l) => (
        <div className={`who${l.isActive ? "" : " is-inactive"}`}>
          <div className="av" aria-hidden="true">{initials(l.customerName)}</div>
          <div className="lead-id">
            <b title={l.customerName}>{l.customerName}</b>
            <small title={subline(l) || l.sourceName}>{subline(l) || l.sourceName}</small>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (l) => <LeadStatusCell lead={l} /> },
    { key: "assignedToName", header: "Assigned To", render: (l) => (l.assignedToName ? <span className="cell-clip" title={l.assignedToName}>{l.assignedToName}</span> : none("Unassigned")) },
    { key: "followup", header: "Follow-up", render: (l) => <FollowupTag urgency={followupOf(l).urgency} dueAt={followupOf(l).dueAt} /> },
    { key: "lastCall", header: "Last call", render: (l) => <LastCallTag lead={l} /> },
    { key: "sourceName", header: "Source", render: (l) => <SourceTag source={l.sourceName} /> },
    { key: "product", header: "Product", render: (l) => (l.product ? <span className="cell-clip" title={l.product.name}>{l.product.name}</span> : none("Not recorded")) },
    { key: "createdAt", header: "Received", sortKey: "createdAt", render: (l) => <span className="cell-nowrap">{formatDate(l.createdAt)}</span> },
    { key: "lastActivityAt", header: "Last Activity", sortKey: "lastActivityAt", render: (l) => <span className="cell-nowrap">{formatRelative(l.lastActivityAt)}</span> },
  ];

  const card = (l: Lead) => (
    <>
      <div className="rl-top">
        <div style={{ minWidth: 0 }}>
          <div className="rl-title">{l.customerName}</div>
          {subline(l) && <div className="rl-sub">{subline(l)}</div>}
        </div>
        <LeadStatusCell lead={l} />
      </div>
      <div className="rl-meta">
        <span>{l.assignedToName ?? "Unassigned"}</span>
        <span>{l.sourceName}</span>
        {l.product && <span>{l.product.name}</span>}
        <span>Received {formatDate(l.createdAt)}</span>
        <span>Active {formatRelative(l.lastActivityAt)}</span>
        {l.lastCallOutcome === "NOT_CONNECTED" && <span>Last call: CNC</span>}
      </div>
      {followupOf(l).urgency !== "None" && <FollowupTag urgency={followupOf(l).urgency} dueAt={followupOf(l).dueAt} />}
    </>
  );

  const header = (
    <PageHeader
      eyebrow="RevenueOS · Pipeline · Leads"
      title="Leads"
      subtitle="Every inbound and outbound lead, from first contact to qualification."
      cta={
        <>
          {hasPermission("governance.deletions.view") && (
            <Link className="btn ghost" href="/recycle-bin">
              <Icon name="trash" size={16} />
              Recycle Bin
            </Link>
          )}
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setShowForm(true)}
            disabled={!hasPermission("leads.create")}
            title={hasPermission("leads.create") ? undefined : "You don't have permission to create leads"}
          >
            New Lead
          </Button>
        </>
      }
    />
  );

  // The first load shows a placeholder, not "no leads"; a failed load says so (with retry)
  // instead of reading as an empty list.
  if (!loaded && loading) {
    return (
      <div className="page">
        {header}
        <div className="skeleton" style={{ height: 300 }} aria-label="Loading leads" />
      </div>
    );
  }
  if (error && !loaded) {
    return (
      <div className="page">
        {header}
        <Panel title="Lead Master">
          <EmptyState
            icon="alert"
            title="Couldn't load leads"
            body={error.message || "Something went wrong reaching the RevenueOS backend. Please try again."}
            action={<Button variant="ghost" onClick={refetch}>Retry</Button>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      {header}

      <div className="list-toolbar">
        <label className="list-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search leads by name, company, phone number, place or owner</span>
          <input
            type="search"
            value={search}
            onChange={(e) => change({ search: e.target.value })}
            placeholder="Search name, company, phone, place, owner…"
          />
        </label>
        <ChipGroup>
          <Chip label="Show deactivated" active={showDeactivated} onClick={() => change({ showDeactivated: !showDeactivated })} />
        </ChipGroup>
        <ListStatus total={result.total} searching={searching} loading={loading} noun="lead" />
      </div>

      <FilterBar
        groups={filterGroups}
        value={filters}
        onChange={setFilters}
        trailing={<DateRangeFilter label="Received date" value={dateRange} onChange={(v) => change({ dateRange: v })} />}
      />
      <ActiveFilterChips groups={filterGroups} value={filters} onChange={setFilters} />
      {error && <p className="form-error" role="alert">Couldn&apos;t refresh the list: {error.message}</p>}

      <div className="lead-list" style={{ marginTop: 14 }} aria-busy={loading}>
        <Panel title={`Lead Master · ${result.total}`} flush>
          <ResponsiveList
            rows={result.items}
            columns={columns}
            getHref={(l) => `/leads/${l.id}`}
            getLabel={(l) => `Open lead ${leadRowLabel(l, formatLeadLocationShort(l))}`}
            card={card}
            caption="Leads"
            testId="lead-list"
            emptyIcon="funnel"
            emptyTitle={anyFilter ? "No leads match these filters" : "No leads yet"}
            emptyBody={anyFilter ? "Try clearing the search or filters above." : "New enquiries appear here as they arrive."}
            sort={leadListSort(view, change)}
          />
          <Pagination page={view.page} pageSize={PAGE_SIZE} total={result.total} onPageChange={(p) => setView((v) => ({ ...v, page: p }))} />
        </Panel>
      </div>


      {showForm && <LeadForm onClose={() => setShowForm(false)} onSubmit={createLead} />}
    </div>
  );
}
