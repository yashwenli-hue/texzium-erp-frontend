"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { ActionState } from "../../lib/repository/shared/quotationLifecycle";

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  state: ActionState;
  onClick: () => void;
  tone?: "danger";
}

/** The rows of the menu. Exported on its own so that what each row says (and whether it can be used) can be checked without opening a menu. */
export function MenuItems({ items, idPrefix, onPick }: { items: MenuItem[]; idPrefix: string; onPick: (item: MenuItem) => void }) {
  return (
    <>
      {items.map((it) => {
        const enabled = it.state.enabled;
        const reasonId = `${idPrefix}-${it.key}-why`;
        return (
          <button
            key={it.key}
            type="button"
            role="menuitem"
            className={`am-item ${it.tone === "danger" ? "danger" : ""}`}
            aria-disabled={!enabled}
            aria-describedby={!enabled && it.state.reason ? reasonId : undefined}
            onClick={() => {
              if (enabled) onPick(it);
            }}
          >
            <span className="am-label">
              {it.icon && <Icon name={it.icon} size={15} />}
              {it.label}
            </span>
            {!enabled && it.state.reason && (
              <span id={reasonId} className="am-reason">
                {it.state.reason}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

/**
 * The actions behind a "⋯" button: for a record whose one obvious action is shown
 * on its own and whose other actions should be reachable but quiet. An action that
 * is not available stays in the menu with its reason written under it (the same
 * rule as DocumentActions: a tooltip is invisible to touch and to assistive
 * technology). A disabled item can still be reached with the keyboard so its reason
 * is read, but it does nothing. Arrow keys move, Escape closes and returns to the
 * button, Tab or a click outside closes. On a phone the menu is a sheet at the
 * bottom of the screen with large rows.
 */
export function ActionMenu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const rows = () => Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const first = rows().find((r) => r.getAttribute("aria-disabled") !== "true") ?? rows()[0];
    first?.focus();
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    const list = rows();
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(at + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(at - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div className="action-menu">
      <button
        ref={trigger}
        type="button"
        className="btn ghost am-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Icon name="more" size={18} />
      </button>
      {open && (
        <>
          <div className="am-scrim" onClick={() => close(false)} aria-hidden="true" />
          <div ref={panel} id={`${id}-menu`} role="menu" aria-label={label} className="am-panel" onKeyDown={onKeyDown}>
            <MenuItems
              items={items}
              idPrefix={id}
              onPick={(it) => {
                // Focus goes back to the "⋯" button first, so a dialog the action opens returns focus to a button that still exists.
                close(true);
                it.onClick();
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
