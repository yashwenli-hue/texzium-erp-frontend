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
  canMove,
  onBlockedMove,
  onCardClick,
  gridColumns,
  colorMap,
}: {
  columns: KanbanColumnConfig<S>[];
  items: T[];
  getStage: (item: T) => S;
  renderCard: (item: T) => ReactNode;
  onMove?: (id: string, stage: S) => void;
  /**
   * Optional rule check for a move. When given, a card can only be dropped on a
   * column it may move to, the per-card dropdown disables the other columns,
   * and dropping a card on its own column does nothing. Without it every move
   * is allowed (the Lead pipeline's behaviour).
   */
  canMove?: (item: T, toStage: S) => boolean;
  /** Called when a move that `canMove` refuses is attempted anyway. */
  onBlockedMove?: (item: T, toStage: S) => void;
  onCardClick?: (id: string) => void;
  gridColumns?: number;
  /** Overrides the shared STAGE_COLOR/TINT lookup for this board's columns with direct
   * bg/fg pairs — e.g. the Lead Pipeline board uses LEAD_STATUS_STYLE, its own indigo
   * family, since Lead Status needs to stay visually distinct from Score/Follow-up. */
  colorMap?: Record<string, { bg: string; fg: string }>;
}) {
  const [dragOverStage, setDragOverStage] = useState<S | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function requestMove(item: T, stage: S) {
    if (canMove) {
      if (getStage(item) === stage) return;
      if (!canMove(item, stage)) {
        onBlockedMove?.(item, stage);
        return;
      }
    }
    onMove?.(item.id, stage);
  }

  function isRefusedTarget(stage: S): boolean {
    if (!canMove || !draggingId) return false;
    const dragged = items.find((item) => item.id === draggingId);
    return !!dragged && getStage(dragged) !== stage && !canMove(dragged, stage);
  }

  return (
    <div
      className="kanban"
      style={gridColumns ? { gridTemplateColumns: `repeat(${gridColumns}, 1fr)` } : undefined}
    >
      {columns.map((col) => {
        const colItems = items.filter((item) => getStage(item) === col.key);
        const tint = colorMap?.[col.key] ?? TINT[STAGE_COLOR[col.key] ?? "n"];
        const isDropTarget = dragOverStage === col.key;

        return (
          <div
            key={col.key}
            className={`kcol ${isDropTarget ? "drop-target" : ""}`}
            style={{ background: isDropTarget ? undefined : tint.bg }}
            onDragOver={(e) => {
              if (!onMove || isRefusedTarget(col.key)) return;
              e.preventDefault();
              setDragOverStage(col.key);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === col.key ? null : s))}
            onDrop={(e) => {
              if (!onMove) return;
              e.preventDefault();
              const id = e.dataTransfer.getData("text/kanban-id");
              const dropped = items.find((item) => item.id === id);
              if (dropped) requestMove(dropped, col.key);
              else if (id) onMove(id, col.key);
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
                      onChange={(e) => requestMove(item, e.target.value as S)}
                      aria-label="Move to a different column"
                    >
                      {columns.map((c) => (
                        <option
                          key={c.key}
                          value={c.key}
                          disabled={!!canMove && c.key !== getStage(item) && !canMove(item, c.key)}
                        >
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
