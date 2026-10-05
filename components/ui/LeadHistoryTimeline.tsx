"use client";

import { Icon } from "./Icon";
import { Tag } from "./Tag";
import { LeadTimelineEntry } from "../../lib/types/domain";
import { formatDateTime } from "../../lib/format";

// An entry recorded well after it happened is labelled so the history stays honest.
const RECORDED_LATER_MS = 5 * 60 * 1000;

function recordedLater(t: LeadTimelineEntry): boolean {
  if (!t.recordedAt) return false;
  return Math.abs(new Date(t.recordedAt).getTime() - new Date(t.occurredAt).getTime()) > RECORDED_LATER_MS;
}

/**
 * One chronological stream of a lead's history. System lifecycle events and
 * employee activity are visibly different: system rows carry a "System" tag
 * and no author; employee rows show who logged them.
 */
export function LeadHistoryTimeline({
  entries,
  emptyText = "No activity logged yet.",
}: {
  entries: LeadTimelineEntry[];
  emptyText?: string;
}) {
  return (
    <div className="tl">
      {entries.length === 0 && (
        <p style={{ color: "var(--muted)", fontSize: 13, padding: "4px 0 12px" }}>{emptyText}</p>
      )}
      {entries.map((t) => {
        const employee = t.source === "EMPLOYEE";
        return (
          <div className="tl-item" key={t.id} data-source={t.source}>
            <div className="dot">
              <Icon name={t.icon} size={14} />
            </div>
            <div className="body">
              <div className="r1">
                <b>{t.title}</b>
                <span className="when">{formatDateTime(t.occurredAt)}</span>
              </div>
              {t.detail && <p>{t.detail}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                <Tag color={employee ? "g" : "n"}>{employee ? "Employee" : "System"}</Tag>
                {employee && (
                  <small style={{ color: "var(--muted)", fontSize: 11.5 }}>
                    {t.actorName ? `Logged by ${t.actorName}` : "Author not recorded"}
                    {recordedLater(t) && t.recordedAt ? ` · recorded ${formatDateTime(t.recordedAt)}` : ""}
                  </small>
                )}
                {!employee && t.actorName && (
                  <small style={{ color: "var(--muted)", fontSize: 11.5 }}>by {t.actorName}</small>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
