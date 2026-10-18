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

/**
 * An exact rupee amount for commercial documents (taxable amount, GST, total),
 * where the compact "₹1.1 Cr" of formatInr would hide the figures that matter:
 * "₹2,95,000.00". Always two decimals, Indian digit grouping.
 */
export function formatInrExact(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

/**
 * An instant as the value of a datetime-local input, in the browser's own time zone
 * ("2026-10-18T16:10"). Cutting the ISO string instead would show UTC: 10:40 for a 4:10 pm
 * follow-up in India, and saving that unchanged would move it.
 */
export function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
