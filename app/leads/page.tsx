"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Icon } from "../../components/ui/Icon";
import { Button, EmptyState } from "../../components/ui/Button";
import { LeadStatusTag, LeadDeactivatedTag, LeadScoreTag, Chip, ChipGroup } from "../../components/ui/Tag";
import { SourceTag } from "../../components/ui/SourceBadge";
import { FollowupTag } from "../../components/ui/FollowupTag";
import { initials } from "../../components/ui/Who";
import { ResponsiveList, ResponsiveColumn } from "../../components/ui/ResponsiveList";
import { Pagination, paginate } from "../../components/ui/Button";
import { FilterBar, ActiveFilterChips, FilterGroupConfig, DateRangeFilter } from "../../components/ui/FilterButton";
import { LeadForm } from "../../components/forms/LeadForm";
import { useLeads, useLeadSources } from "../../lib/hooks/useLeads";
import { useAuth } from "../../lib/auth/AuthContext";
import { Lead } from "../../lib/types/domain";
import { formatRelative, formatDate } from "../../lib/format";
import { nextPendingFollowup, FollowupInfo } from "../../lib/followup";
import { countryName } from "../../lib/geo/countries";
import { formatLeadLocationShort } from "../../lib/geo/leadLocation";
import { FilterMap } from "../../lib/types/common";
import { useSessionState } from "../../lib/ui/sessionState";
import {
  ASSIGNMENT_OPTIONS,
  DEFAULT_LEAD_LIST_VIEW,
  LEAD_LIST_VIEW_KEY,
  LeadListView,
  LeadSortField,
  NOT_SET,
  clampPage,
  filterAndSortLeads,
  leadRowLabel,
  leadStatusOptions,
  sanitizeLeadListView,
} from "../../lib/repository/shared/leadList";

const PAGE_SIZE = 8;

const SORT_OPTIONS: Array<{ key: LeadSortField; label: string }> = [
  { key: "lastActivityAt", label: "Last activity" },
  { key: "createdAt", label: "Received" },
  { key: "customerName", label: "Lead name" },
];
// A new sort key starts in the direction people expect: names A-Z, dates newest first.
const FIRST_DIRECTION: Record<LeadSortField, "asc" | "desc"> = { customerName: "asc", createdAt: "desc", lastActivityAt: "desc" };

const none = (text = "—") => <span className="cell-none">{text}</span>;

export default function LeadsPage() {
  const router = useRouter();
  // The list's search, filters, sort and page are kept for this browser tab, so opening a
  // lead and coming back finds the list as it was left.
  const [view, setView] = useSessionState<LeadListView>(LEAD_LIST_VIEW_KEY, DEFAULT_LEAD_LIST_VIEW, sanitizeLeadListView);
  const { search, filters, dateRange, sort, showDeactivated } = view;
  // Deactivated leads stay out of the normal list; the toggle below brings them in.
  const { leads: allLeads, loading, error, createLead, refetch } = useLeads({ includeInactive: showDeactivated });
  const { sources } = useLeadSources();
  const { hasPermission } = useAuth();
  const [showForm, setShowForm] = useState(false);

  // Every change to what is shown goes back to the first page.
  const change = (patch: Partial<Omit<LeadListView, "page">>) => setView((v) => ({ ...v, ...patch, page: 1 }));
  const setFilters = (f: FilterMap) => change({ filters: f });

  const categoryBySourceId = useMemo(() => new Map(sources.map((s) => [s.id, s.category])), [sources]);
  const followupById = useMemo(() => {
    const map = new Map<string, FollowupInfo>();
    for (const l of allLeads) map.set(l.id, nextPendingFollowup(l.followups));
    return map;
  }, [allLeads]);

  const sourceOptions = useMemo(() => [...new Set(allLeads.map((l) => l.sourceName))].sort(), [allLeads]);
  const sourceTypeOptions = useMemo(
    () => [...new Set(sources.map((s) => s.category).filter((c): c is string => !!c))].sort(),
    [sources]
  );
  // Location filters offer only what the leads in the list actually have. "Not set" finds the
  // leads that were recorded without a location (older leads, and those the WhatsApp bot creates).
  const countryOptions = useMemo(() => {
    const names = [...new Set(allLeads.filter((l) => l.country).map((l) => countryName(l.country)))].sort();
    return allLeads.some((l) => !l.country) ? [...names, NOT_SET] : names;
  }, [allLeads]);
  const stateOptions = useMemo(
    () => [...new Set(allLeads.map((l) => l.state).filter((s): s is string => !!s))].sort(),
    [allLeads]
  );
  const cityOptions = useMemo(
    () => [...new Set(allLeads.map((l) => l.city).filter((c): c is string => !!c))].sort(),
    [allLeads]
  );
  const statusOptions = useMemo(() => leadStatusOptions(allLeads), [allLeads]);

  // Groups with zero options (e.g. Source Type has no backend basis once real leads
  // have no source-category data) are dropped rather than shown as a permanently-empty dropdown.
  const filterGroups: FilterGroupConfig[] = [
    { key: "status", label: "Status", options: statusOptions },
    { key: "assignment", label: "Assignment", options: [...ASSIGNMENT_OPTIONS] },
    { key: "followup", label: "Follow-up", options: ["Overdue", "Due Today", "Tomorrow", "Scheduled", "None"] },
    { key: "source", label: "Source", options: sourceOptions },
    { key: "sourceType", label: "Source Type", options: sourceTypeOptions },
    { key: "country", label: "Country", options: countryOptions },
    { key: "state", label: "State", options: stateOptions },
    { key: "city", label: "City", options: cityOptions },
  ].filter((g) => g.options.length > 0);

  const filtered = useMemo(
    () => filterAndSortLeads(allLeads, { search, filters, dateRange, sort }, { followupById, categoryBySourceId }),
    [allLeads, search, filters, dateRange, sort, followupById, categoryBySourceId]
  );

  // A remembered page past the end of a shorter list shows the last page instead of nothing.
  const page = clampPage(view.page, filtered.length, PAGE_SIZE);
  const pageRows = paginate(filtered, page, PAGE_SIZE);

  // Score and Product / Interest have no backend field yet, so real leads never have them:
  // their columns appear only when some lead in the list does.
  const hasScore = allLeads.some((l) => l.score);
  const hasInterest = allLeads.some((l) => l.uiContext?.productInterest);

  const followupOf = (l: Lead) => followupById.get(l.id) ?? { urgency: "None" as const, dueAt: null };
  const subline = (l: Lead) => [l.companyName, formatLeadLocationShort(l)].filter(Boolean).join(" · ");

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
    { key: "sourceName", header: "Source", render: (l) => <SourceTag source={l.sourceName} /> },
    ...(hasInterest
      ? [{ key: "productInterest", header: "Product / Interest", render: (l: Lead) => (l.uiContext?.productInterest ? <span className="cell-clip" title={l.uiContext.productInterest}>{l.uiContext.productInterest}</span> : none()) }]
      : []),
    ...(hasScore ? [{ key: "score", header: "Score", render: (l: Lead) => (l.score ? <LeadScoreTag score={l.score} /> : none()) }] : []),
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
        <span>Received {formatDate(l.createdAt)}</span>
        <span>Active {formatRelative(l.lastActivityAt)}</span>
      </div>
      {followupOf(l).urgency !== "None" && <FollowupTag urgency={followupOf(l).urgency} dueAt={followupOf(l).dueAt} />}
    </>
  );

  // Without this guard the table briefly renders its "no leads match these
  // filters" empty state during the initial mock fetch (allLeads starts
  // empty until the request resolves), which reads as a real empty result
  // rather than a loading state — same guard Lead Detail already uses.
  if (loading && allLeads.length === 0) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 220, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  // A failed fetch must not read as "zero leads" — that's the list's own
  // empty state below, reserved for a genuine successful zero-result response.
  if (error && allLeads.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="RevenueOS · Pipeline · Leads"
          title="Leads"
          subtitle="Every inbound and outbound lead, from first contact to qualification."
        />
        <Panel title="Lead Master">
          <EmptyState
            icon="alert"
            title="Couldn't load leads"
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

  return (
    <div className="page">
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

      <div className="list-toolbar">
        <label className="list-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search leads</span>
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
      </div>

      <FilterBar
        groups={filterGroups}
        value={filters}
        onChange={setFilters}
        trailing={<DateRangeFilter label="Received date" value={dateRange} onChange={(v) => change({ dateRange: v })} />}
      />
      <ActiveFilterChips groups={filterGroups} value={filters} onChange={setFilters} />

      <div className="lead-list" style={{ marginTop: 14 }}>
        <Panel title={`Lead Master · ${filtered.length}`} flush>
          <ResponsiveList
            rows={pageRows}
            columns={columns}
            getHref={(l) => `/leads/${l.id}`}
            getLabel={(l) => `Open lead ${leadRowLabel(l, formatLeadLocationShort(l))}`}
            card={card}
            caption="Leads"
            testId="lead-list"
            emptyIcon="funnel"
            emptyTitle={allLeads.length === 0 ? "No leads yet" : "No leads match these filters"}
            emptyBody={allLeads.length === 0 ? "New enquiries appear here as they arrive." : "Try clearing the search or filters above."}
            sort={{
              key: sort.field,
              direction: sort.direction,
              options: SORT_OPTIONS,
              onChange: (key, direction) => {
                const field = key as LeadSortField;
                change({ sort: { field, direction: direction ?? (field === sort.field ? (sort.direction === "asc" ? "desc" : "asc") : FIRST_DIRECTION[field]) } });
              },
            }}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={(p) => setView((v) => ({ ...v, page: p }))} />
        </Panel>
      </div>

      <DesignNote>
        <b>Design note.</b> Follow-up urgency is derived from each lead&apos;s own LeadFollowup records.
        Product/Interest and Score have no backend field yet, so their columns only appear when a lead has
        them. Search, filters, sort and page are remembered for this browser tab.
      </DesignNote>

      {showForm && <LeadForm onClose={() => setShowForm(false)} onSubmit={createLead} />}
    </div>
  );
}

/** The lead's status, and "Deactivated" beside it (never instead of it). */
function LeadStatusCell({ lead }: { lead: Lead }) {
  return (
    <div className="cell-tags">
      <LeadStatusTag status={lead.status} />
      {!lead.isActive && <LeadDeactivatedTag />}
    </div>
  );
}
