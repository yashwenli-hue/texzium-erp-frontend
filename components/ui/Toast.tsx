"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, FocusEvent, KeyboardEvent, ReactNode } from "react";
import { Icon } from "./Icon";
import {
  ToastHold,
  ToastItem,
  ToastManager,
  ToastOptions,
  ToastVariant,
  legacyVariant,
} from "../../lib/ui/toastManager";

/**
 * The one feedback mechanism of RevenueOS: a short message that confirms what just
 * happened, says what went wrong, or notes something that is not an error.
 *
 *   toast.success("Lead created")           something worked (4 s)
 *   toast.error("Could not save the note")  something failed (8 s)
 *   toast.info("No phone number on file")   neither (4 s)
 *   toast.show(message, icon?)              the original call, unchanged: an `alert`
 *                                           icon is an error, any other icon a success
 *
 * Raise a success only after the operation it describes has succeeded.
 *
 * What a person gets: bottom-right on a desktop and full width above the bottom edge
 * (and the safe area) on a phone; a dismiss button on every toast; Escape dismisses
 * the toast that has keyboard focus; a toast under the pointer or with focus inside it
 * is not removed; an identical message that is still showing is not stacked again; at
 * most three at once. What a screen reader gets: two live regions that are in the page
 * from the start (polite for success and info, assertive for errors), so a message
 * is announced when it arrives, and the variant is spoken as a word, not only shown
 * as a colour. The queue and its timing rules are in lib/ui/toastManager.ts.
 */

export interface ToastContextValue {
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
  /** The original API. Returns the toast's id, which `dismiss` takes. */
  show: (message: string, icon?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** What `useToast()` hands out, over one queue. `show` keeps its original meaning: only an `alert` icon marks an error. */
export function createToastApi(manager: ToastManager): ToastContextValue {
  return {
    success: (message, options) => manager.show("success", message, options),
    error: (message, options) => manager.show("error", message, options),
    info: (message, options) => manager.show("info", message, options),
    show: (message, icon) => manager.show(legacyVariant(icon), message, icon ? { icon } : undefined),
    dismiss: manager.dismiss,
  };
}

/** What a screen reader hears before the message. */
export const TOAST_VARIANT_WORD: Readonly<Record<ToastVariant, string>> = {
  success: "Success",
  error: "Error",
  info: "Note",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<ToastManager | null>(null);
  if (managerRef.current === null) managerRef.current = new ToastManager();
  const manager = managerRef.current;

  const toasts = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getServerSnapshot);

  useEffect(() => () => manager.dispose(), [manager]);

  const api = useMemo(() => createToastApi(manager), [manager]);

  // Where focus was before it moved into a toast, so dismissing that toast hands it back.
  const stackRef = useRef<HTMLDivElement>(null);
  const cameFrom = useRef<HTMLElement | null>(null);

  const onFocusCapture = useCallback((e: FocusEvent<HTMLDivElement>) => {
    const from = e.relatedTarget as HTMLElement | null;
    if (from && !stackRef.current?.contains(from)) cameFrom.current = from;
  }, []);

  const onDismiss = useCallback(
    (id: number) => {
      const focusWasInside = !!stackRef.current && stackRef.current.contains(document.activeElement);
      const back = cameFrom.current;
      manager.dismiss(id);
      if (focusWasInside && back && back.isConnected) back.focus();
    },
    [manager]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack
        toasts={toasts}
        stackRef={stackRef}
        onDismiss={onDismiss}
        onPause={manager.pause}
        onResume={manager.resume}
        onFocusCapture={onFocusCapture}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() must be used within a ToastProvider");
  return ctx;
}

/**
 * The toasts on screen, inside the two live regions. Presentational and free of hooks, so
 * it renders the same on the server and is tested without a browser. The regions are
 * always rendered, even empty: a live region that only appears together with its first
 * message is not reliably announced. `aria-atomic="false"` makes a screen reader read
 * the toast that was added, not every toast in the region again.
 */
export function ToastStack({
  toasts,
  stackRef,
  onDismiss,
  onPause,
  onResume,
  onFocusCapture,
}: {
  toasts: readonly ToastItem[];
  stackRef?: React.Ref<HTMLDivElement>;
  onDismiss: (id: number) => void;
  onPause: (id: number, reason: ToastHold) => void;
  onResume: (id: number, reason: ToastHold) => void;
  onFocusCapture?: (e: FocusEvent<HTMLDivElement>) => void;
}) {
  const view = (t: ToastItem) => <ToastView key={t.id} toast={t} onDismiss={onDismiss} onPause={onPause} onResume={onResume} />;
  return (
    <div className="toast-stack" data-testid="toast-stack" ref={stackRef} onFocusCapture={onFocusCapture}>
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="false" aria-relevant="additions" data-politeness="polite">
        {toasts.filter((t) => t.variant !== "error").map(view)}
      </div>
      <div className="toast-region" role="alert" aria-live="assertive" aria-atomic="false" aria-relevant="additions" data-politeness="assertive">
        {toasts.filter((t) => t.variant === "error").map(view)}
      </div>
    </div>
  );
}

export function ToastView({
  toast,
  onDismiss,
  onPause,
  onResume,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
  onPause: (id: number, reason: ToastHold) => void;
  onResume: (id: number, reason: ToastHold) => void;
}) {
  return (
    <div
      className="toast"
      data-testid="toast"
      data-variant={toast.variant}
      onMouseEnter={() => onPause(toast.id, "hover")}
      onMouseLeave={() => onResume(toast.id, "hover")}
      onFocus={() => onPause(toast.id, "focus")}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        // Focus moving between the parts of this toast is not leaving it.
        if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
        onResume(toast.id, "focus");
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Escape") return;
        // Dismisses this toast only: a dialog or menu behind it keeps its own Escape.
        e.stopPropagation();
        onDismiss(toast.id);
      }}
    >
      <span className="ic" aria-hidden="true">
        <Icon name={toast.icon} size={16} />
      </span>
      <span className="toast-msg">
        <span className="sr-only">{TOAST_VARIANT_WORD[toast.variant]}: </span>
        {toast.message}
        {toast.count > 1 && (
          <span className="toast-count" aria-label={`, ${toast.count} times`}>
            ×{toast.count}
          </span>
        )}
      </span>
      <button type="button" className="toast-x" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
