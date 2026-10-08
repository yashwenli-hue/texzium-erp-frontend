/**
 * The queue behind the Toast: what is on screen, for how long, and what a hover,
 * a keyboard focus, a repeat or a fourth message does to it. Framework-free on
 * purpose, with an injectable clock, so every timing rule is tested exactly and
 * the provider stays a thin shell around it.
 *
 * The rules:
 *  - three variants: success and info stay 4 s, an error stays 8 s;
 *  - a toast that is hovered or has keyboard focus is held: its timer stops, and
 *    when it is let go it gets what was left of its time (at least 1.5 s, so it
 *    never disappears the instant the pointer leaves);
 *  - an identical message (same variant) that is still on screen is not stacked a
 *    second time: that toast's timer starts over and it shows how many times;
 *  - at most three are visible; a newer one pushes the oldest out;
 *  - a toast can always be dismissed.
 */

export type ToastVariant = "success" | "error" | "info";

export const TOAST_DURATION_MS: Readonly<Record<ToastVariant, number>> = {
  success: 4000,
  info: 4000,
  error: 8000,
};
export const TOAST_MAX_VISIBLE = 3;
/** What a toast that was held is still given once it is released. */
export const TOAST_RESUME_FLOOR_MS = 1500;

export const TOAST_DEFAULT_ICON: Readonly<Record<ToastVariant, string>> = {
  success: "check",
  error: "alert",
  info: "info",
};

/** Why a toast is held. It stays held until every reason is gone. */
export type ToastHold = "hover" | "focus";

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
  icon: string;
  durationMs: number;
  /** How many times this same message was raised while it was on screen. */
  count: number;
}

export interface ToastOptions {
  /** An icon key from components/ui/Icon. Defaults to the variant's own. */
  icon?: string;
  /** How long it stays, in milliseconds. Defaults to the variant's own. */
  durationMs?: number;
}

export interface ToastClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: ToastClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * The variant the older `show(message, icon)` call means. Its second argument was
 * only ever an icon; `alert` was the one used for failures, every other icon
 * (check, close, cal, ...) marked something that worked.
 */
export function legacyVariant(icon?: string): ToastVariant {
  return icon === "alert" ? "error" : "success";
}

interface Timer {
  handle: unknown;
  endsAt: number;
  remaining: number;
  holds: Set<ToastHold>;
}

export class ToastManager {
  private items: readonly ToastItem[] = [];
  private timers = new Map<number, Timer>();
  private listeners = new Set<() => void>();
  private nextId = 0;

  constructor(private readonly clock: ToastClock = realClock) {}

  // Arrow properties: React hands these around unbound.
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): readonly ToastItem[] => this.items;

  /** Server rendering has nothing to show. */
  getServerSnapshot = (): readonly ToastItem[] => EMPTY;

  /** Raises a toast and returns its id (the id of the existing one when it was a repeat). 0 when there was nothing to say. */
  show = (variant: ToastVariant, message: string, options: ToastOptions = {}): number => {
    const text = typeof message === "string" ? message.trim() : "";
    if (text === "") return 0;

    const durationMs = positive(options.durationMs) ?? TOAST_DURATION_MS[variant];

    const same = this.items.find((t) => t.variant === variant && t.message === text);
    if (same) {
      this.items = this.items.map((t) => (t.id === same.id ? { ...t, count: t.count + 1, durationMs } : t));
      const timer = this.timers.get(same.id);
      if (timer && timer.holds.size === 0) this.schedule(same.id, durationMs);
      else if (timer) timer.remaining = durationMs;
      this.emit();
      return same.id;
    }

    const id = ++this.nextId;
    this.items = [...this.items, { id, variant, message: text, icon: options.icon || TOAST_DEFAULT_ICON[variant], durationMs, count: 1 }];
    this.timers.set(id, { handle: null, endsAt: 0, remaining: durationMs, holds: new Set() });
    this.schedule(id, durationMs);

    while (this.items.length > TOAST_MAX_VISIBLE) this.remove(this.items[0].id);
    this.emit();
    return id;
  };

  dismiss = (id: number): void => {
    if (!this.items.some((t) => t.id === id)) return;
    this.remove(id);
    this.emit();
  };

  /** Holds a toast open (pointer over it, or focus inside it). */
  pause = (id: number, reason: ToastHold): void => {
    const timer = this.timers.get(id);
    if (!timer) return;
    if (timer.holds.size === 0) {
      this.clock.clearTimeout(timer.handle);
      timer.handle = null;
      timer.remaining = Math.max(0, timer.endsAt - this.clock.now());
    }
    timer.holds.add(reason);
  };

  /** Lets go of one reason; when none is left the toast gets its remaining time again. */
  resume = (id: number, reason: ToastHold): void => {
    const timer = this.timers.get(id);
    if (!timer || !timer.holds.delete(reason)) return;
    if (timer.holds.size === 0) this.schedule(id, Math.max(timer.remaining, TOAST_RESUME_FLOOR_MS));
  };

  isHeld = (id: number): boolean => (this.timers.get(id)?.holds.size ?? 0) > 0;

  /** Removes everything and stops every timer (unmount). The manager stays usable. */
  dispose = (): void => {
    for (const timer of this.timers.values()) this.clock.clearTimeout(timer.handle);
    this.timers.clear();
    this.items = [];
    this.emit();
  };

  private schedule(id: number, ms: number): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    this.clock.clearTimeout(timer.handle);
    timer.endsAt = this.clock.now() + ms;
    timer.remaining = ms;
    timer.handle = this.clock.setTimeout(() => this.dismiss(id), ms);
  }

  private remove(id: number): void {
    const timer = this.timers.get(id);
    if (timer) this.clock.clearTimeout(timer.handle);
    this.timers.delete(id);
    this.items = this.items.filter((t) => t.id !== id);
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

const EMPTY: readonly ToastItem[] = [];

function positive(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
