"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, PageHelp } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Chip, ChipGroup, LeadStatusTag, Tag } from "../../components/ui/Tag";
import { Icon } from "../../components/ui/Icon";
import { Disclosure } from "../../components/ui/Disclosure";
import { LoadingRegion } from "../../components/ui/LoadingRegion";
import { FollowupActions } from "../../components/followups/FollowupActions";
import { useFollowupWorklist } from "../../lib/hooks/useFollowupWorklist";
import { useAuth } from "../../lib/auth/AuthContext";
import { FollowupWorkItem } from "../../lib/types/domain";
import { FOLLOWUP_BUCKETS, FollowupBucket, filterWorklist, groupWorklist, isActionable } from "../../lib/repository/shared/followupWorklist";
import { formatDateTime, formatRelative } from "../../lib/format";

const EMPTY_TEXT: Record<FollowupBucket, string> = {
  OVERDUE: "Nothing overdue.",
  TODAY: "Nothing else due today.",
  UPCOMING: "Nothing scheduled after today.",
  CLOSED: "",
};

/**
 * Follow-ups: every follow-up the person may see, across all their leads, sorted into what is
 * late, due today and coming up. The data and its scope are the backend's (GET /lead-followups);
 * acting on one uses the same operations as the lead's own page.
 */
export default function FollowupsPage() {
  const { hasPermission, user, ready } = useAuth();
  const mayView = hasPermission("leads.followups.view");
  const mayAct = hasPermission("leads.followups.create");
  const list = useFollowupWorklist(ready && mayView);
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const shown = useMemo(
    () => filterWorklist(list.items, { search, mineOf: mine ? user?.id : null, showInactive }),
    [list.items, search, mine, user?.id, showInactive]
  );
  const groups = useMemo(() => groupWorklist(shown), [shown]);
  const pending = groups.OVERDUE.length + groups.TODAY.length + groups.UPCOMING.length;
  const anyFilter = !!search.trim() || mine || showInactive;

  const header = (
    <PageHeader
      eyebrow="RevenueOS · Activity · Follow-ups"
      title="Follow-ups"
      subtitle="Every follow-up on your leads: what is late, what is due today and what comes next."
      cta={
        <Link className="btn ghost" href="/leads">
          <Icon name="funnel" size={16} />
          Go to Leads
        </Link>
      }
    />
  );

  if (!ready || (mayView && list.loading && !list.loaded)) {
    return (
      <div className="page">
        {header}
        <LoadingRegion label="Loading follow-ups">
          <div className="skeleton" style={{ height: 88, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 300 }} />
        </LoadingRegion>
      </div>
    );
  }

  if (!mayView) {
    return (
      <div className="page">
        {header}
        <Panel title="Follow-ups">
          <EmptyState icon="lock" title="You don't have access to follow-ups" body="Seeing follow-ups needs the leads.followups.view permission. Ask an administrator, then sign in again." />
        </Panel>
      </div>
    );
  }

  if (list.error && !list.loaded) {
    return (
      <div className="page">
        {header}
        <Panel title="Follow-ups">
          <EmptyState
            icon="alert"
            title="Couldn't load follow-ups"
            body="Something went wrong reaching RevenueOS. Nothing was changed; please try again."
            action={<Button variant="ghost" onClick={list.refetch}>Retry</Button>}
          />
        </Panel>
      </div>
    );
  }

  const row = (f: FollowupWorkItem, bucket: FollowupBucket) => (
    <li className={`fu-row fu-${bucket.toLowerCase()}`} key={f.id}>
      <div className="fu-when">
        <b>{bucket === "CLOSED" ? formatDateTime(f.followupDate) : formatRelative(f.followupDate)}</b>
        {bucket !== "CLOSED" && <small>{formatDateTime(f.followupDate)}</small>}
      </div>
      <div className="fu-main">
        <div className="fu-lead">
          <Link href={`/leads/${f.lead.id}`}>{f.lead.customerName}</Link>
          {f.lead.companyName && <span className="fu-co">{f.lead.companyName}</span>}
        </div>
        {f.remarks && <p className="fu-remarks">{f.remarks}</p>}
        <div className="fu-tags">
          <LeadStatusTag status={f.lead.status} />
          {!f.lead.isActive && <Tag color="n">Lead deactivated</Tag>}
          {f.status === "COMPLETED" && <Tag color="g">Completed{f.completedByName ? ` by ${f.completedByName}` : ""}</Tag>}
          {f.status === "CANCELLED" && <Tag color="n">Cancelled</Tag>}
        </div>
      </div>
      {mayAct && isActionable(f) && (
        <FollowupActions followup={f} leadName={f.lead.customerName} onComplete={list.complete} onReschedule={list.reschedule} onCancel={list.cancel} />
      )}
      {f.status === "PENDING" && !f.lead.isActive && <p className="fu-note">Reactivate the lead to act on this follow-up.</p>}
    </li>
  );

  return (
    <div className="page followups">
      {header}

      <ul className="fu-summary" aria-label="Pending follow-ups">
        {FOLLOWUP_BUCKETS.filter((b) => b.key !== "CLOSED").map((b) => (
          <li key={b.key} className={`fu-sum fu-${b.key.toLowerCase()}`}>
            <a href={`#fu-${b.key}`}>
              <b>{groups[b.key].length}</b>
              <span>{b.label}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="list-toolbar">
        <label className="list-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search follow-ups by lead, company, phone number or remarks</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lead, company, phone, remarks…" />
        </label>
        <ChipGroup>
          <Chip label="Assigned to me" active={mine} onClick={() => setMine((m) => !m)} />
          <Chip label="Show deactivated leads" active={showInactive} onClick={() => setShowInactive((v) => !v)} />
        </ChipGroup>
        <p className="list-status" role="status">
          {list.loading ? "Updating…" : `${pending} pending`}
        </p>
      </div>
      {list.error && <p className="form-error" role="alert">Couldn&apos;t refresh the list. What you see may be out of date.</p>}

      {pending === 0 && groups.CLOSED.length === 0 ? (
        <Panel title="Follow-ups">
          <EmptyState
            icon="cal"
            title={anyFilter ? "No follow-ups match" : "No follow-ups yet"}
            body={anyFilter ? "Try clearing the search or the filters above." : "Schedule a follow-up from a lead's page and it appears here."}
          />
        </Panel>
      ) : (
        <>
          {FOLLOWUP_BUCKETS.filter((b) => b.key !== "CLOSED").map((b) => (
            <section key={b.key} id={`fu-${b.key}`} className="fu-group" aria-labelledby={`fu-h-${b.key}`}>
              <h2 id={`fu-h-${b.key}`}>
                <Icon name={b.key === "OVERDUE" ? "alert" : b.key === "TODAY" ? "clock" : "cal"} size={14} />
                {b.label}
                <span className="fu-count">{groups[b.key].length}</span>
              </h2>
              {groups[b.key].length === 0 ? <p className="fu-empty">{EMPTY_TEXT[b.key]}</p> : <ul className="fu-list">{groups[b.key].map((f) => row(f, b.key))}</ul>}
            </section>
          ))}
          {groups.CLOSED.length > 0 && (
            <Disclosure summary="Recently completed or cancelled" count={groups.CLOSED.length}>
              <ul className="fu-list">{groups.CLOSED.map((f) => row(f, "CLOSED"))}</ul>
            </Disclosure>
          )}
        </>
      )}

      <PageHelp title="About follow-ups">
        You see the follow-ups of the leads you may open. Complete or reschedule one here or on the lead&apos;s page;
        a cancelled or completed follow-up stays in the lead&apos;s history and cannot be reopened. To schedule a new
        one, open the lead.
      </PageHelp>
    </div>
  );
}
