import { formatCompactInr, formatExactInr } from "../../lib/repository/shared/money";

/**
 * An amount of money, written one way across RevenueOS. Where you
 * scan (a snapshot tile, a step of a deal, an attention line) it is compact:
 * "₹2.5 L". The exact figure is always there too: on hover (title) and, for a
 * screen reader, as the only thing it reads, so nobody has to trust a rounded
 * "2.5 L" for a sum that matters. Where the figure is the point (a document, a
 * list of documents) pass mode="exact".
 *
 * Presentational only, and generic: any RevenueOS screen that shows money where it is
 * scanned may use it (Collections does). It was introduced for the Customer screens;
 * screens that have not adopted it keep their own formatting until they are redesigned.
 */
export function MoneyText({ value, mode = "compact", className }: { value: number; mode?: "compact" | "exact"; className?: string }) {
  const exact = formatExactInr(value);
  if (mode === "exact") return <span className={`money ${className ?? ""}`.trim()}>{exact}</span>;
  return (
    <span className={`money ${className ?? ""}`.trim()} title={exact}>
      <span aria-hidden="true">{formatCompactInr(value)}</span>
      <span className="sr-only">{exact}</span>
    </span>
  );
}
