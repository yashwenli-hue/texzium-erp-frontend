"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { LoadingRegion } from "../../components/ui/LoadingRegion";
import { useToast } from "../../components/ui/Toast";
import { useNotifications } from "../../lib/hooks/useNotifications";
import { formatDateTime } from "../../lib/format";
import { NOTIFICATION_GROUPS, notificationGroup } from "../../lib/ui/notificationGroups";

export default function NotificationsPage() {
  const { notifications, loading, error, markRead, markAllRead, refetch } = useNotifications();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, typeof notifications>();
    notifications.forEach((n) => {
      const g = notificationGroup(n.occurredAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    });
    return NOTIFICATION_GROUPS.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  async function run(key: string, action: () => Promise<void>, failure: string) {
    if (busy) return;
    setBusy(key);
    try {
      await action();
    } catch {
      toast.error(failure);
    } finally {
      setBusy(null);
    }
  }

  const header = (
    <PageHeader
      eyebrow="RevenueOS · Notifications"
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread. Everything that needs your attention, in one feed.` : "Everything that needs your attention, in one feed."}
      cta={
        <Button
          variant="ghost"
          icon="check"
          onClick={() => run("all", markAllRead, "Couldn't mark the notifications as read. Please try again.")}
          disabled={unreadCount === 0 || busy !== null}
        >
          {busy === "all" ? "Marking…" : "Mark all as read"}
        </Button>
      }
    />
  );

  if (loading && notifications.length === 0) {
    return (
      <div className="page">
        {header}
        <LoadingRegion label="Loading notifications">
          <div className="skeleton" style={{ height: 260 }} />
        </LoadingRegion>
      </div>
    );
  }

  // A failed load must not read as "all caught up".
  if (error && notifications.length === 0) {
    return (
      <div className="page">
        {header}
        <Panel title="Notifications">
          <EmptyState
            icon="alert"
            title="Couldn't load notifications"
            body="Something went wrong reaching RevenueOS. Your notifications are still there; please try again."
            action={<Button variant="ghost" onClick={refetch}>Retry</Button>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      {header}

      {groups.length === 0 ? (
        <Panel title="Notifications">
          <EmptyState icon="bell" title="You're all caught up" body="New notifications appear here." />
        </Panel>
      ) : (
        groups.map(([label, items]) => (
          <div key={label} style={{ marginTop: 16 }}>
            <Panel title={label}>
              <ul className="notif-list">
                {items.map((n) => (
                  <li className={`notif ${n.unread ? "unread" : ""}`} key={n.id}>
                    <div className="ic" aria-hidden="true"><Icon name={n.icon} size={16} /></div>
                    <div className="body">
                      <b>{n.text}</b>
                      <p>
                        {n.unread && <span className="sr-only">Unread. </span>}
                        <time dateTime={n.occurredAt}>{formatDateTime(n.occurredAt)}</time>
                      </p>
                    </div>
                    {n.unread && (
                      <button
                        type="button"
                        className="btn ghost sm notif-read"
                        onClick={() => run(n.id, () => markRead(n.id), "Couldn't mark it as read. Please try again.")}
                        disabled={busy !== null}
                        aria-label={`Mark as read: ${n.text}`}
                      >
                        {busy === n.id ? "Marking…" : "Mark read"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ))
      )}
    </div>
  );
}
