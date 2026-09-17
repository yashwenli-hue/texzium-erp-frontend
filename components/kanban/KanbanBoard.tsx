"use client";

import { useState } from "react";
import { Lead, LeadStage } from "../../lib/types/domain";
import { Icon } from "../ui/Icon";
import { STAGE_COLOR, TINT } from "../ui/Tag";
import { formatInr, formatRelative } from "../../lib/format";

export interface KanbanStageConfig {
  key: LeadStage;
  label: string;
}

export function KanbanBoard({
  stages,
  leads,
  onMove,
  onCardClick,
  columns,
}: {
  stages: KanbanStageConfig[];
  leads: Lead[];
  onMove: (leadId: string, stage: LeadStage) => void;
  onCardClick: (leadId: string) => void;
  columns?: number;
}) {
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div
      className="kanban"
      style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
    >
      {stages.map((stage) => {
        const items = leads.filter((l) => l.stage === stage.key);
        const color = STAGE_COLOR[stage.key] ?? "n";
        const tint = TINT[color];
        const isDropTarget = dragOverStage === stage.key;

        return (
          <div
            key={stage.key}
            className={`kcol ${isDropTarget ? "drop-target" : ""}`}
            style={{ background: isDropTarget ? undefined : tint.bg }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.key);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stage.key ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const leadId = e.dataTransfer.getData("text/lead-id");
              if (leadId) onMove(leadId, stage.key);
              setDragOverStage(null);
              setDraggingId(null);
            }}
          >
            <h4 style={{ color: tint.fg }}>
              {stage.label}
              <span style={{ color: tint.fg, opacity: 0.65 }}>{items.length}</span>
            </h4>
            {items.length === 0 && (
              <div style={{ fontSize: 12, color: tint.fg, opacity: 0.55, padding: "8px 2px" }}>
                No records
              </div>
            )}
            {items.map((lead) => (
              <div
                key={lead.id}
                className={`kcard ${draggingId === lead.id ? "dragging" : ""}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/lead-id", lead.id);
                  setDraggingId(lead.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => onCardClick(lead.id)}
              >
                <div className="co">{lead.name}</div>
                <div className="amt">{formatInr(lead.value)}</div>
                <div className="ppl">
                  <Icon name="user" size={14} /> {lead.ownerName}
                </div>
                <div className="days">
                  <span className="tag n" style={{ fontSize: 10.5, padding: "2px 8px" }}>
                    {formatRelative(lead.lastActivityAt)}
                  </span>
                </div>
                {/* Touch-friendly fallback: works alongside drag-and-drop on any device */}
                <div className="kcard-move" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.stage}
                    onChange={(e) => onMove(lead.id, e.target.value as LeadStage)}
                    aria-label={`Move ${lead.name} to a different stage`}
                  >
                    {stages.map((s) => (
                      <option key={s.key} value={s.key}>
                        Move to: {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
