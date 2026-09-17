/**
 * Formats a whole-rupee number the way the prototype displayed money:
 * lakhs as "₹18.4 L", crores as "₹1.1 Cr". Below ₹1L, shows plain rupees.
 * @backend-verify: confirm the real API's money representation (paise vs
 * rupees, string vs number, multi-currency support) — see
 * docs/backend-ui-contract.md.
 */
export function formatInr(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2).replace(/\.00$/, ".0")} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Compact "2 hrs ago" / "Yesterday" / "5 days ago" style relative time. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const isFuture = diffMs < 0;
  const abs = Math.abs(diffMs);

  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;
  const WEEK = DAY * 7;

  const fmt = (n: number, unit: string) =>
    `${isFuture ? "in " : ""}${n} ${unit}${n === 1 ? "" : "s"}${isFuture ? "" : " ago"}`;

  if (abs < MIN) return "just now";
  if (abs < HOUR) return fmt(Math.round(abs / MIN), "min");
  if (abs < DAY) return fmt(Math.round(abs / HOUR), "hr");
  if (abs < DAY * 2 && !isFuture) return "Yesterday";
  if (abs < DAY * 2 && isFuture) return "Tomorrow";
  if (abs < WEEK) return fmt(Math.round(abs / DAY), "day");
  return fmt(Math.round(abs / WEEK), "week");
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}
