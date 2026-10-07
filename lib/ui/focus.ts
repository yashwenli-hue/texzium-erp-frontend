/**
 * Keyboard focus helpers for dialogs. The DOM-free part is kept separate so the
 * rule that matters (Tab wraps inside the dialog, in both directions) can be
 * checked without a browser.
 */

/** What can take keyboard focus inside a dialog. */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Where Tab (or Shift+Tab) goes from `current` among `count` focusable
 * elements, or null when the browser's own move is already inside the dialog.
 * `current` is the index of the focused element, or -1 when focus is outside
 * the list (on the dialog itself, or somewhere else).
 *
 *  - no focusable element: stay put (return 0 is meaningless, so null and the
 *    caller keeps focus on the dialog)
 *  - forward from the last element: wrap to the first
 *  - backward from the first element, or from outside the list: wrap to the last
 *  - focus outside the list going forward: go to the first
 */
export function trapTarget(count: number, current: number, backwards: boolean): number | null {
  if (count <= 0) return null;
  if (backwards) return current <= 0 ? count - 1 : null;
  return current === -1 || current === count - 1 ? 0 : null;
}
