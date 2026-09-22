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
 * Leads, Opportunities, Quotations, Proforma Invoices, Sales Orders, Sales
 * Invoices, Customers, and (since Milestone 1B) Notifications all go through
 * the repository instead of the mock `db` directly, so each reflects real
 * backend counts in connected mode —
 * refetched on every route change (there's no live push/subscription
 * mechanism against a plain REST backend, so this is "accurate as of your
 * last navigation", not millisecond-live). In mock mode Notifications keeps
 * its live subscription instead, since the mock UX (instant badge update on
 * marking something read, no navigation needed) is worth preserving and
 * MockNotificationRepository's own store already supports it.
 *
 * Contacts, Tasks and Notes genuinely have NO backend counterpart at all
 * (confirmed — no matching module exists anywhere in the backend) and stay
 * on the mock store's live subscription in both modes; `kind` is returned so
 * consumers (the Sidebar) can mark those three as demo data specifically
 * when running in connected mode, rather than presenting them as live counts.
 */
export function useLiveCounts() {
  const repo = useRepository();
  const pathname = usePathname();
  const [leadsCount, setLeadsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [quotationsCount, setQuotationsCount] = useState(0);
  const [proformaInvoicesCount, setProformaInvoicesCount] = useState(0);
  const [salesOrdersCount, setSalesOrdersCount] = useState(0);
  const [salesInvoicesCount, setSalesInvoicesCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [realUnreadNotificationsCount, setRealUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    repo.leads.list().then((page) => {
      if (!cancelled) setLeadsCount(page.total);
    });
    repo.opportunities.list().then((page) => {
      if (!cancelled) setOpportunitiesCount(page.total);
    });
    repo.quotations.list().then((page) => {
      if (!cancelled) setQuotationsCount(page.total);
    });
    repo.proformaInvoices.list().then((page) => {
      if (!cancelled) setProformaInvoicesCount(page.total);
    });
    repo.salesOrders.list().then((page) => {
      if (!cancelled) setSalesOrdersCount(page.total);
    });
    repo.salesInvoices.list().then((page) => {
      if (!cancelled) setSalesInvoicesCount(page.total);
    });
    repo.customers.list().then((page) => {
      if (!cancelled) setCustomersCount(page.total);
    });
    if (repo.kind === "real") {
      repo.notifications.unreadCount().then((n) => {
        if (!cancelled) setRealUnreadNotificationsCount(n);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [repo, pathname]);

  const tasks = useSyncExternalStore(db.tasks.subscribe, db.tasks.getSnapshot, db.tasks.getSnapshot);
  const mockNotifications = useSyncExternalStore(
    db.notifications.subscribe,
    db.notifications.getSnapshot,
    db.notifications.getSnapshot
  );
  const contacts = useSyncExternalStore(
    db.contacts.subscribe,
    db.contacts.getSnapshot,
    db.contacts.getSnapshot
  );
  const notes = useSyncExternalStore(db.notes.subscribe, db.notes.getSnapshot, db.notes.getSnapshot);

  return {
    kind: repo.kind,
    leadsCount,
    openTasksCount: tasks.filter((t) => !t.done).length,
    unreadNotificationsCount:
      repo.kind === "real" ? realUnreadNotificationsCount : mockNotifications.filter((n) => n.unread).length,
    opportunitiesCount,
    quotationsCount,
    proformaInvoicesCount,
    salesOrdersCount,
    salesInvoicesCount,
    customersCount,
    contactsCount: contacts.length,
    notesCount: notes.length,
  };
}
