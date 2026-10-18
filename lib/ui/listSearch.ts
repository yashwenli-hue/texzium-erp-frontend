/**
 * Search over a list that is already loaded: every word of the term must appear in one of the
 * row's values (case-insensitive), so "texmac QT24" finds that company's quotation. Presentation
 * only — the backend has already decided which rows the person may see.
 */
export function matchesText(values: Array<string | number | null | undefined>, term: string): boolean {
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = values.filter((v) => v !== null && v !== undefined && v !== "").join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
