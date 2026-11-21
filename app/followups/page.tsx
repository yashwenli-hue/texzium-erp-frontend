"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { FilterChips } from "../../components/ui/FilterChips";
import { useToast } from "../../components/ui/Toast";
import { FOLLOWUPS_CHANGED_EVENT } from "../../components/shell/FollowupReminderHost";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useAsyncList } from "../../lib/hooks/useAsyncList";
import { useAssignableUsers } from "../../lib/hooks/useAssignableUsers";
import { FollowupCalendarEntry } from "../../lib/types/domain";
import { CalendarState, calendarState, dayKey, groupByDay, leadTitle, monthGrid, monthWindow } from "../../lib/followupReminders";

type StateFilter = "all" | CalendarState;
type View = "month" | "list";

const STATE_LABEL: Record<CalendarState, string> = { pending: "Upcoming", overdue: "Overdue", done: "Done", cancelled: "Cancelled" };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function FollowupCalendarPage() {
  const repo = useRepository();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const seesEveryone = hasPermission("revenue.view.all");
  const canComplete = hasPermission("leads.followups.create");
  const canView = hasPermission("leads.followups.view");

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string>(dayKey(today));
  const [ownerId, setOwnerId] = useState("");
  const [filter, setFilter] = useState<StateFilter>("all");
  const [view, setView] = useState<View>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Phones start on the list: a month grid is too small to read there.
  useEffect(() => {
    if (window.matchMedia("(max-width: 720px)").matches) setView("list");
  }, []);

  const { users } = useAssignableUsers();
  const win = monthWindow(cursor.year, cursor.month);
  const { data, loading, error, refetch } = useAsyncList(
    () => (canView ? repo.leadFollowups.calendar(win.from, win.to, ownerId || undefined) : Promise.resolve([])),
    [repo, win.from, win.to, ownerId, canView]
  );
  useEffect(() => {
    const onChanged = () => refetch();
    window.addEventListener(FOLLOWUPS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(FOLLOWUPS_CHANGED_EVENT, onChanged);
  }, [refetch]);
  useEffect(() => setNow(Date.now()), [data]);

  const entries = data ?? [];
  const counts = useMemo(() => {
    const c: Record<CalendarState, number> = { pending: 0, overdue: 0, done: 0, cancelled: 0 };
    for (const e of entries) c[calendarState(e, now)]++;
    return c;
  }, [entries, now]);
  const visible = useMemo(() => (filter === "all" ? entries : entries.filter((e) => calendarState(e, now) === filter)), [entries, filter, now]);
  const byDay = useMemo(() => groupByDay(visible), [visible]);
  const grid = monthGrid(cursor.year, cursor.month);
  const monthTitle = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = dayKey(today);

  function move(delta: number) {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(dayKey(d));
  }
  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(todayKey);
  }

  async function complete(e: FollowupCalendarEntry) {
    setBusy(e.id);
    try {
      await repo.leadFollowups.complete(e.id);
      toast.success(`Follow-up with ${e.lead.customerName} marked done`);
      window.dispatchEvent(new Event(FOLLOWUPS_CHANGED_EVENT));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete the follow-up. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const chipOptions: Array<{ value: StateFilter; label: string; count?: number }> = [
    { value: "all", label: "All", count: entries.length },
    ...(Object.keys(STATE_LABEL) as CalendarState[]).filter((s) => counts[s] > 0).map((s) => ({ value: s, label: STATE_LABEL[s], count: counts[s] })),
  ];

  function EntryRow({ e }: { e: FollowupCalendarEntry }) {
    const state = calendarState(e, now);
    return (
      <li className="fc-row" data-state={state}>
        <span className="fc-row-time">{timeOf(e.followupDate)}</span>
        <div className="fc-row-main">
          <Link href={`/leads/${e.lead.id}`} className="fc-row-who">{leadTitle(e.lead)}</Link>
          {e.remarks && <div className="fc-row-note">{e.remarks}</div>}
          <div className="fc-row-meta">
            <span className="fc-badge" data-state={state}>{STATE_LABEL[state]}</span>
            {e.lead.assignedTo && <span><Icon name="user" size={12} /> {e.lead.assignedTo.fullName}</span>}
            {state === "done" && e.completedBy && <span>done by {e.completedBy.fullName}</span>}
            <a href={`tel:${e.lead.phone.replace(/\s+/g, "")}`}><Icon name="phone" size={12} /> {e.lead.phone}</a>
          </div>
        </div>
        {canComplete && e.status === "PENDING" && e.lead.isActive && (
          <Button variant="ghost" className="fc-done" disabled={busy === e.id} onClick={() => complete(e)}>
            <Icon name="check" size={14} /> {busy === e.id ? "Saving…" : "Done"}
          </Button>
        )}
      </li>
    );
  }

  const selectedEntries = byDay.get(selected) ?? [];
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-`;
  const listDays = [...byDay.entries()].filter(([k]) => k.startsWith(monthPrefix)).sort(([a], [b]) => (a < b ? -1 : 1));
  const listCount = listDays.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Follow-ups"
        title="Follow-up Calendar"
        subtitle={seesEveryone ? "Every follow-up across the company, by day." : "Your follow-ups by day: the leads you own, and the ones you worked on."}
      />

      {!canView ? (
        <Panel title="Follow-ups">
          <p style={{ color: "var(--muted)", fontSize: 13 }}>You don&apos;t have access to follow-ups. Ask an administrator if you need it.</p>
        </Panel>
      ) : (
        <>
          <div className="fc-toolbar">
            <div className="fc-nav">
              <button className="fc-arrow" aria-label="Previous month" onClick={() => move(-1)}><Icon name="back" size={16} /></button>
              <h2 className="fc-title">{monthTitle}</h2>
              <button className="fc-arrow fc-next" aria-label="Next month" onClick={() => move(1)}><Icon name="back" size={16} /></button>
              <Button variant="ghost" onClick={goToday}>Today</Button>
            </div>
            <div className="fc-tools">
              {seesEveryone && users.length > 0 && (
                <select className="fc-select" aria-label="Whose follow-ups" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">Everyone</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
              <FilterChips<View> label="Calendar view" value={view} onChange={setView} options={[{ value: "month", label: "Month" }, { value: "list", label: "List" }]} />
            </div>
          </div>
          <FilterChips<StateFilter> label="Filter follow-ups" value={filter} onChange={setFilter} options={chipOptions} />

          {error ? (
            <Panel title="Follow-ups">
              <div role="alert">
                <p style={{ color: "var(--bad)", fontSize: 13 }}>Couldn&apos;t load the follow-ups: {error.message}</p>
                <Button variant="ghost" onClick={refetch}>Retry</Button>
              </div>
            </Panel>
          ) : view === "month" ? (
            <>
              <div className="fc-grid card" aria-busy={loading || undefined}>
                {WEEKDAYS.map((d) => <div key={d} className="fc-wd">{d}</div>)}
                {grid.map((d) => {
                  const k = dayKey(d);
                  const list = byDay.get(k) ?? [];
                  const outside = d.getMonth() !== cursor.month;
                  return (
                    <button
                      key={k}
                      type="button"
                      className="fc-day"
                      data-outside={outside || undefined}
                      data-today={k === todayKey || undefined}
                      data-selected={k === selected || undefined}
                      aria-label={`${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}: ${list.length} follow-up${list.length === 1 ? "" : "s"}`}
                      onClick={() => setSelected(k)}
                    >
                      <span className="fc-num">{d.getDate()}</span>
                      <span className="fc-items">
                        {list.slice(0, 3).map((e) => (
                          <span key={e.id} className="fc-item" data-state={calendarState(e, now)}>
                            <span className="fc-item-time">{timeOf(e.followupDate)}</span> {e.lead.customerName}
                          </span>
                        ))}
                        {list.length > 3 && <span className="fc-item-more">+{list.length - 3} more</span>}
                      </span>
                      {list.length > 0 && <span className="fc-dots" aria-hidden="true">{list.length}</span>}
                    </button>
                  );
                })}
              </div>
              <Panel title={new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}>
                {selectedEntries.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>{loading ? "Loading…" : "No follow-ups on this day."}</p>
                ) : (
                  <ul className="fc-list">{selectedEntries.map((e) => <EntryRow key={e.id} e={e} />)}</ul>
                )}
              </Panel>
            </>
          ) : (
            <Panel title={`${monthTitle} · ${listCount} follow-up${listCount === 1 ? "" : "s"}`}>
              {listDays.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>{loading ? "Loading…" : "No follow-ups in this period."}</p>
              ) : (
                listDays.map(([k, list]) => (
                  <section key={k} className="fc-agenda-day">
                    <h3 className="fc-agenda-title" data-today={k === todayKey || undefined}>
                      {new Date(k + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                      {k === todayKey && " · Today"}
                    </h3>
                    <ul className="fc-list">{list.map((e) => <EntryRow key={e.id} e={e} />)}</ul>
                  </section>
                ))
              )}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
