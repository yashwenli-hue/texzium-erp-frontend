"use client";

import { useSyncExternalStore } from "react";
import { db } from "../repository/mock/db";

/**
 * Powers the sidebar/topbar badge counts (Leads count, open Tasks count,
 * unread Notifications count, etc). These live in the persistent app shell,
 * which does NOT unmount between page navigations — so unlike the
 * per-page list hooks (which simply refetch on mount), this needs a live
 * subscription to reflect mutations made on whatever page is currently
 * active without a manual refetch trigger.
 *
 * NOTE — this is the one hook in the app that reaches into
 * `lib/repository/mock/db` directly rather than going through the
 * repository interfaces. That is a deliberate, contained exception:
 * a real backend has no equivalent in-memory store to subscribe to.
 * When the real API is wired in, reimplement this hook's internals using
 * whatever live-count strategy fits (a lightweight polling endpoint, a
 * websocket/SSE event, or simply deriving counts from data already fetched
 * by React Query/SWR's cache). The RETURN SHAPE below is the contract the
 * Sidebar/Topbar components depend on — keep it stable and no component
 * changes are needed.
 */
export function useLiveCounts() {
  const leads = useSyncExternalStore(db.leads.subscribe, db.leads.getSnapshot, db.leads.getSnapshot);
  const tasks = useSyncExternalStore(db.tasks.subscribe, db.tasks.getSnapshot, db.tasks.getSnapshot);
  const notifications = useSyncExternalStore(
    db.notifications.subscribe,
    db.notifications.getSnapshot,
    db.notifications.getSnapshot
  );
  const opportunities = useSyncExternalStore(
    db.opportunities.subscribe,
    db.opportunities.getSnapshot,
    db.opportunities.getSnapshot
  );
  const quotations = useSyncExternalStore(
    db.quotations.subscribe,
    db.quotations.getSnapshot,
    db.quotations.getSnapshot
  );
  const customers = useSyncExternalStore(
    db.customers.subscribe,
    db.customers.getSnapshot,
    db.customers.getSnapshot
  );
  const contacts = useSyncExternalStore(
    db.contacts.subscribe,
    db.contacts.getSnapshot,
    db.contacts.getSnapshot
  );
  const notes = useSyncExternalStore(db.notes.subscribe, db.notes.getSnapshot, db.notes.getSnapshot);

  return {
    leadsCount: leads.length,
    openTasksCount: tasks.filter((t) => !t.done).length,
    unreadNotificationsCount: notifications.filter((n) => n.unread).length,
    opportunitiesCount: opportunities.length,
    quotationsCount: quotations.length,
    customersCount: customers.length,
    contactsCount: contacts.length,
    notesCount: notes.length,
  };
}
