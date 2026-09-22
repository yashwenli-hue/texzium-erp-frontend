"use client";

import { useMemo } from "react";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useNotifications } from "../../lib/hooks/useNotifications";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { formatDateTime } from "../../lib/format";

function groupLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const DAY = 86_400_000;
  if (diff < DAY) return "Today";
  if (diff < DAY * 2) return "Yesterday";
  return "This week";
}

export default function NotificationsPage() {
  const repo = useRepository();
  const { notifications, markRead, markAllRead } = useNotifications();

  const groups = useMemo(() => {
    const map = new Map<string, typeof notifications>();
    notifications.forEach((n) => {
      const g = groupLabel(n.occurredAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(n);
    });
    const order = ["Today", "Yesterday", "This week"];
    return order.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Notifications"
        title="Notifications"
        subtitle="Everything that needs your attention, in one feed."
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <Button variant="ghost" icon="check" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      </div>

      {groups.length === 0 ? (
        <Panel title="Notifications">
          <p style={{ color: "var(--muted)", fontSize: 13 }}>You&apos;re all caught up.</p>
        </Panel>
      ) : (
        groups.map(([label, items]) => (
          <div key={label} style={{ marginTop: 16 }}>
            <Panel title={label}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map((n) => (
                  <div
                    className={`notif ${n.unread ? "unread" : ""}`}
                    key={n.id}
                    onClick={() => n.unread && markRead(n.id)}
                    style={{ cursor: n.unread ? "pointer" : "default" }}
                  >
                    <div className="ic"><Icon name={n.icon} size={16} /></div>
                    <div className="body"><b>{n.text}</b></div>
                    <div className="time">{formatDateTime(n.occurredAt)}</div>
                    {n.unread && <div className="udot" />}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ))
      )}

      <DesignNote>
        <b>Design note.</b> Unread notifications get a tinted background and a dot, not a loud badge
        color. Click any unread item to mark it read.{" "}
        {repo.kind === "real"
          ? "This calls the real RevenueOS notification endpoint (GET/PATCH /notifications) — the sidebar badge reflects it on your next navigation, since there's no live push mechanism against a plain REST backend. “Mark all as read” issues one request per unread notification, as there's no bulk endpoint."
          : "The sidebar badge count updates immediately, since this is a live subscription against the mock store."}
      </DesignNote>
    </div>
  );
}
