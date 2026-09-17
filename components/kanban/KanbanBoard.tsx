"use client";

import { ReactNode, useState } from "react";
import { STAGE_COLOR, TINT } from "../ui/Tag";

export interface KanbanColumnConfig<S extends string> {
  key: S;
  label: string;
}

/**
 * Generic drag-and-drop board over any entity + string-keyed stage. Card
 * markup is fully supplied by the caller (renderCard), so this component
 * carries no domain knowledge — it is reused for the Lead pipeline (status)
 * and the Dashboard's Opportunity snapshot (stage), and can host future
 * boards (e.g. Sales Order approval gates) without change.
 */
export function KanbanBoard<T extends { id: string }, S extends string>({
  columns,
  items,
  getStage,
  renderCard,
  onMove,
  onCardClick,
  gridColumns,
}: {
  columns: KanbanColumnConfig<S>[];
  items: T[];
  getStage: (item: T) => S;
  renderCard: (item: T) => ReactNode;
  onMove?: (id: string, stage: S) => void;
  onCardClick?: (id: string) => void;
  gridColumns?: number;
}) {
  const [dragOverStage, setDragOverStage] = useState<S | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div
      className="kanban"
      style={gridColumns ? { gridTemplateColumns: `repeat(${gridColumns}, 1fr)` } : undefined}
    >
      {columns.map((col) => {
        const colItems = items.filter((item) => getStage(item) === col.key);
        const color = STAGE_COLOR[col.key] ?? "n";
        const tint = TINT[color];
        const isDropTarget = dragOverStage === col.key;

        return (
          <div
            key={col.key}
            className={`kcol ${isDropTarget ? "drop-target" : ""}`}
            style={{ background: isDropTarget ? undefined : tint.bg }}
            onDragOver={(e) => {
              if (!onMove) return;
              e.preventDefault();
              setDragOverStage(col.key);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === col.key ? null : s))}
            onDrop={(e) => {
              if (!onMove) return;
              e.preventDefault();
              const id = e.dataTransfer.getData("text/kanban-id");
              if (id) onMove(id, col.key);
              setDragOverStage(null);
              setDraggingId(null);
            }}
          >
            <h4 style={{ color: tint.fg }}>
              {col.label}
              <span style={{ color: tint.fg, opacity: 0.65 }}>{colItems.length}</span>
            </h4>
            {colItems.length === 0 && (
              <div style={{ fontSize: 12, color: tint.fg, opacity: 0.55, padding: "8px 2px" }}>
                No records
              </div>
            )}
            {colItems.map((item) => (
              <div
                key={item.id}
                className={`kcard ${draggingId === item.id ? "dragging" : ""}`}
                draggable={!!onMove}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/kanban-id", item.id);
                  setDraggingId(item.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => onCardClick?.(item.id)}
              >
                {renderCard(item)}
                {onMove && (
                  <div className="kcard-move" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={getStage(item)}
                      onChange={(e) => onMove(item.id, e.target.value as S)}
                      aria-label="Move to a different column"
                    >
                      {columns.map((c) => (
                        <option key={c.key} value={c.key}>
                          Move to: {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
