"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { Icon } from "./Icon";
import { FOCUSABLE_SELECTOR, trapTarget } from "../../lib/ui/focus";

// Dialogs can open on top of each other (a confirmation over a form). Only the
// top one answers Escape and traps Tab, and the page behind stays locked until
// the last one closes.
const openDialogs: symbol[] = [];
let scrollLocks = 0;
let savedOverflow = "";

function lockScroll() {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true" && el.offsetParent !== null
  );
}

/**
 * The shared dialog. On a wide screen it is a centred window; on a phone
 * (<= 640px) the same markup is a full-height sheet with a footer that stays in
 * view (see .modal in globals.css), so every form built on it is usable on a
 * phone without its own mobile layout.
 *
 * Keyboard: focus moves into the dialog when it opens (the first field, or the
 * dialog itself when it has none), Tab stays inside it, Escape closes it, and
 * focus returns to what opened it. The page behind does not scroll.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const me = Symbol("dialog");
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogs.push(me);
    lockScroll();

    // Into the first field of the body; failing that, the dialog itself, so a
    // plain confirmation is read out and nothing is activated by accident.
    const firstField = bodyRef.current ? focusableIn(bodyRef.current)[0] : undefined;
    (firstField ?? dialogRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== me) return;

      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = focusableIn(dialogRef.current);
      const current = items.indexOf(document.activeElement as HTMLElement);
      const target = trapTarget(items.length, current, e.shiftKey);

      if (items.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
      } else if (target !== null) {
        e.preventDefault();
        items[target].focus();
      }
    };

    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      const at = openDialogs.indexOf(me);
      if (at >= 0) openDialogs.splice(at, 1);
      unlockScroll();
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
