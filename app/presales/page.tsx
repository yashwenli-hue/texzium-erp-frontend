"use client";

import { PageHeader, PageHelp } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { Button, EmptyState, Pagination } from "../../components/ui/Button";
import { Chip, ChipGroup } from "../../components/ui/Tag";
import { initials } from "../../components/ui/Who";
import { ResponsiveList, ResponsiveColumn } from "../../components/ui/ResponsiveList";
import { FilterBar, ActiveFilterChips, DateRangeFilter } from "../../components/ui/FilterButton";
import { LastCallTag, LeadStatusCell, ListStatus, leadListSort } from "../../components/leads/LeadListParts";
import { leadFilterGroups } from "../../components/leads/leadFilters";
import { useLeadListView } from "../../lib/hooks/useLeadListView";
import { Lead } from "../../lib/types/domain";
import { formatRelative, formatDate } from "../../lib/format";
import { formatLeadLocationShort } from "../../lib/geo/leadLocation";
import { FilterMap } from "../../lib/types/common";
import { DEFAULT_LEAD_LIST_VIEW, LeadFilterKey, PRESALES_VIEW_KEY, leadRowLabel } from "../../lib/repository/shared/leadList";

const PAGE_SIZE = 20;
const FILTERS: readonly LeadFilterKey[] = ["presales", "assignment", "stage", "status", "sales", "lastCall", "followup", "source", "product"];

/** Who holds the lead now, and in what capacity. */
function ownerOf(l: Lead): { label: string; name: string } | null {
  if (l.salesOwnerName) return { label: "Sales", name: l.salesOwnerName };
  if (l.assignedToName) return { label: l.status === "PRE_SALES_ASSIGNED" ? "Pre-sales (assigned)" : "Assigned", name: l.assignedToName };
  return null;
}

/**
 * The Pre-Sales panel: leads by the pre-sales people who worked on them (now or before,
 * from the recorded history), their assignment, status and current sales owner. The same
 * server search as the Leads list, inside what the person may see.
 */
export default function PresalesPage() {
  const { view, setView, change, result, loaded, loading, searching, error, refetch } = useLeadListView(PRESALES_VIEW_KEY, PAGE_SIZE, DEFAULT_LEAD_LIST_VIEW);
  const { search, filters, dateRange, showDeactivated } = view;
  const setFilters = (f: FilterMap) => change({ filters: f });
  const filterGroups = leadFilterGroups(result.facets, filters, FILTERS);
  const anyFilter = !!search.trim() || Object.keys(filters).length > 0 || !!dateRange.from || !!dateRange.to;

  const people = (l: Lead) =>
    l.presales && l.presales.length > 0 ? (
      <div className="cell-tags">
        {l.presales.map((p) => (
          <span key={p.id} className="tag n person-tag" title={p.name}>{p.name}</span>
        ))}
      </div>
    ) : (
      <span className="cell-none">None recorded</span>
    );

  const columns: ResponsiveColumn<Lead>[] = [
    {
      key: "customerName",
      header: "Lead",
      sortKey: "customerName",
      render: (l) => (
        <div className={`who${l.isActive ? "" : " is-inactive"}`}>
          <div className="av" aria-hidden="true">{initials(l.customerName)}</div>
          <div className="lead-id">
            <b title={l.customerName}>{l.customerName}</b>
            <small title={l.companyName ?? l.sourceName}>{l.companyName ?? l.sourceName}</small>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (l) => <LeadStatusCell lead={l} /> },
    { key: "presales", header: "Pre-sales", render: people },
    {
      key: "owner",
      header: "Held by",
      render: (l) => {
        const o = ownerOf(l);
        return o ? (
          <span className="owner-cell" title={`${o.label}: ${o.name}`}>
            <small>{o.label}</small>
            <span className="cell-clip">{o.name}</span>
          </span>
        ) : (
          <span className="cell-none">Unassigned</span>
        );
      },
    },
    { key: "lastCall", header: "Last call", render: (l) => <LastCallTag lead={l} /> },
    { key: "createdAt", header: "Received", sortKey: "createdAt", render: (l) => <span className="cell-nowrap">{formatDate(l.createdAt)}</span> },
    { key: "lastActivityAt", header: "Last Activity", sortKey: "lastActivityAt", render: (l) => <span className="cell-nowrap">{formatRelative(l.lastActivityAt)}</span> },
  ];

  const card = (l: Lead) => {
    const o = ownerOf(l);
    return (
      <>
        <div className="rl-top">
          <div style={{ minWidth: 0 }}>
            <div className="rl-title">{l.customerName}</div>
            {l.companyName && <div className="rl-sub">{l.companyName}</div>}
          </div>
          <LeadStatusCell lead={l} />
        </div>
        <div className="rl-meta">
          <span>Pre-sales: {l.presales?.map((p) => p.name).join(", ") || "none recorded"}</span>
          <span>{o ? `${o.label}: ${o.name}` : "Unassigned"}</span>
          {l.lastCallOutcome === "NOT_CONNECTED" && <span>Last call: CNC</span>}
          <span>Active {formatRelative(l.lastActivityAt)}</span>
        </div>
      </>
    );
  };

  const header = (
    <PageHeader
      eyebrow="RevenueOS · Pipeline · Pre-Sales"
      title="Pre-Sales"
      subtitle="Leads by the pre-sales people who worked on them, their assignment and where they stand now."
    />
  );

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
        <Panel title="Pre-Sales leads">
          <EmptyState icon="alert" title="Couldn't load leads" body={error.message || "Please try again."} action={<Button variant="ghost" onClick={refetch}>Retry</Button>} />
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
          <input type="search" value={search} onChange={(e) => change({ search: e.target.value })} placeholder="Search name, company, phone…" />
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
        <Panel title={`Pre-Sales leads · ${result.total}`} flush>
          <ResponsiveList
            rows={result.items}
            columns={columns}
            getHref={(l) => `/leads/${l.id}`}
            getLabel={(l) => `Open lead ${leadRowLabel(l, formatLeadLocationShort(l))}`}
            card={card}
            caption="Pre-Sales leads"
            testId="presales-list"
            emptyIcon="users"
            emptyTitle={anyFilter ? "No leads match these filters" : "No leads yet"}
            emptyBody={anyFilter ? "Try another pre-sales person or clear the filters." : "Leads appear here once they arrive."}
            sort={leadListSort(view, change)}
          />
          <Pagination page={view.page} pageSize={PAGE_SIZE} total={result.total} onPageChange={(p) => setView((v) => ({ ...v, page: p }))} />
        </Panel>
      </div>

      <PageHelp title="Who counts as pre-sales">
        Anyone recorded as working the lead before it was qualified: the person it was assigned to in pre-sales,
        whoever logged calls, meetings or status changes before qualification, and whoever qualified it. Older
        leads may show nobody, because early assignments named the person only in text. The sales owner is
        whoever holds the lead after qualification.
      </PageHelp>
    </div>
  );
}
