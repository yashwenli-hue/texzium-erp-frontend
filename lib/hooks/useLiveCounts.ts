"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { db } from "../repository/mock/db";
import { useRepository } from "../repository/RepositoryProvider";

/**
 * Powers the sidebar/topbar badge counts (Leads count, open Tasks count,
 * unread Notifications count, etc). These live in the persistent app shell,
 * which does NOT unmount between page navigations — so unlike the
 * per-page list hooks (which simply refetch on mount), this needs a live
 * subscription to reflect mutations made on whatever page is currently
 * active without a manual refetch trigger.
 *
 * Leads/Opportunities (the two Stage 2A entities) go through the repository
 * instead of the mock `db` directly, so this reflects real backend counts
 * once the real repository is wired in — refetched on every route change
 * (there's no live push/subscription mechanism against a plain REST
 * backend, so this is "accurate as of your last navigation", not
 * millisecond-live). Every other entity here is still out of Stage 2A's
 * scope and keeps reading the mock store's live subscription directly.
 */
export function useLiveCounts() {
  const repo = useRepository();
  const pathname = usePathname();
  const [leadsCount, setLeadsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    repo.leads.list().then((page) => {
      if (!cancelled) setLeadsCount(page.total);
    });
    repo.opportunities.list().then((page) => {
      if (!cancelled) setOpportunitiesCount(page.total);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, pathname]);

  const tasks = useSyncExternalStore(db.tasks.subscribe, db.tasks.getSnapshot, db.tasks.getSnapshot);
  const notifications = useSyncExternalStore(
    db.notifications.subscribe,
    db.notifications.getSnapshot,
    db.notifications.getSnapshot
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
    leadsCount,
    openTasksCount: tasks.filter((t) => !t.done).length,
    unreadNotificationsCount: notifications.filter((n) => n.unread).length,
    opportunitiesCount,
    quotationsCount: quotations.length,
    customersCount: customers.length,
    contactsCount: contacts.length,
    notesCount: notes.length,
  };
}
