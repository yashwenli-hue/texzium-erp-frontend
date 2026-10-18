"use client";

import { useMemo, useState } from "react";
import { PageHeader, PreviewNotice } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ChipGroup, Chip } from "../../components/ui/Tag";
import { Icon } from "../../components/ui/Icon";
import { ActivityForm } from "../../components/forms/ActivityForm";
import { useActivities } from "../../lib/hooks/useActivities";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { ActivityType } from "../../lib/types/domain";
import { formatDateTime } from "../../lib/format";

const TYPES: ActivityType[] = ["Call", "Email", "Meeting", "WhatsApp", "Quotation"];
const ICON_BY_TYPE: Record<string, string> = {
  Call: "phone",
  Email: "mail",
  Meeting: "cal",
  WhatsApp: "wa",
  Quotation: "file",
  "Stage Change": "pulse",
  Note: "notepad",
};

function groupLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const DAY = 86_400_000;
  if (diff < DAY) return "Today";
  if (diff < DAY * 2) return "Yesterday";
  if (diff < DAY * 7) return "This week";
  return "Earlier";
}

export default function ActivitiesPage() {
  const repo = useRepository();
  const { activities, logActivity } = useActivities();
  const [typeChip, setTypeChip] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const filtered = typeChip === "All" ? activities : activities.filter((a) => a.type === typeChip);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((a) => {
      const g = groupLabel(a.occurredAt);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(a);
    });
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    return order.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
  }, [filtered]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Activities"
        title="Activities"
        subtitle="A unified log of every call, email, meeting and message across RevenueOS."
        cta={
          <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
            Log Activity
          </Button>
        }
      />

      {repo.kind === "real" && <PreviewNotice entered="Anything you log" />}

      <ChipGroup>
        <Chip label="All" active={typeChip === "All"} onClick={() => setTypeChip("All")} />
        {TYPES.map((t) => (
          <Chip key={t} label={t} active={typeChip === t} onClick={() => setTypeChip(t)} />
        ))}
      </ChipGroup>

      {groups.length === 0 && (
        <div className="card panel" style={{ marginTop: 16 }}>
          <div className="empty-state">
            <div className="ic"><Icon name="pulse" size={20} /></div>
            <b>No activity yet</b>
            <p>Log a call, email or meeting to see it appear here.</p>
          </div>
        </div>
      )}

      {groups.map(([label, items]) => (
        <div key={label} style={{ marginTop: 16 }}>
          <Panel title={label}>
            <div className="tl">
              {items.map((a) => (
                <div className="tl-item" key={a.id}>
                  <div className="dot"><Icon name={ICON_BY_TYPE[a.type] ?? "pulse"} size={14} /></div>
                  <div className="body">
                    <div className="r1">
                      <b>{a.type} · {a.relatedName}</b>
                      <span className="when">{formatDateTime(a.occurredAt)}</span>
                    </div>
                    <p>{a.note} — <span style={{ color: "var(--faint-text)" }}>{a.ownerName}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ))}


      {showForm && <ActivityForm onClose={() => setShowForm(false)} onSubmit={logActivity} />}
    </div>
  );
}
