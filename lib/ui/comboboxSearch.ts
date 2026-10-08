/**
 * The search and the arrow-key arithmetic behind the Combobox, kept apart from the
 * component so what matters (what a typed word finds, in what order, and where the
 * arrow keys go) is checked without a browser.
 */

export interface ComboOption {
  /** What is stored when the option is chosen. */
  value: string;
  /** What is shown, and what the input holds once chosen. */
  label: string;
  /** Shown quietly at the end of the row (a calling code, for instance). Not searched, see `keywords`. */
  hint?: string;
  /** Other things people type for this option: UK, USA, +44. Matched from the start of the word only. */
  keywords?: readonly string[];
}

/** Lower case, accents removed, anything that is not a letter or digit turned into one space. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9À-￿]+/g, " ")
    .trim();
}

/**
 * 0 best … 4 worst; -1 when the option does not answer to the query.
 * A keyword the person typed in full ("uk", "+44") is the best match there is, ahead of a
 * label that merely starts with the same letters (Ukraine). A keyword made of digits (a
 * calling code) is matched from its start only, so "44" does not find an area code 441.
 */
function tierOf(option: ComboOption, q: string): number {
  const label = fold(option.label);
  const keywords = (option.keywords ?? []).map(fold);
  if (keywords.includes(q)) return 0;
  if (label.startsWith(q)) return 1;
  if (label.split(" ").some((w) => w.startsWith(q))) return 2;
  for (const k of keywords) {
    if (k.startsWith(q)) return 3;
    if (!/^\d/.test(k) && k.split(" ").some((w) => w.startsWith(q))) return 3;
  }
  if (label.includes(q)) return 4;
  return -1;
}

/**
 * The options that answer to `query`, best first: a keyword that is exactly it, then a label
 * that starts with it, then a word of the label, then the start of a keyword, then a label
 * that merely contains it. Within one
 * tier the original order is kept. A blank query returns everything in the given order.
 * Accents and case do not matter; neither does punctuation ("st lucia" finds "Saint
 * Lucia" through its keyword, "u.s." finds the U.S. Virgin Islands).
 */
export function searchOptions<T extends ComboOption>(options: readonly T[], query: string): T[] {
  const q = fold(query);
  if (q === "") return [...options];
  const ranked: { o: T; tier: number; at: number }[] = [];
  options.forEach((o, at) => {
    const tier = tierOf(o, q);
    if (tier >= 0) ranked.push({ o, tier, at });
  });
  return ranked.sort((a, b) => a.tier - b.tier || a.at - b.at).map((r) => r.o);
}

/** The option whose label is exactly what was typed (ignoring case, accents and spacing), if there is one. */
export function exactLabelMatch<T extends ComboOption>(options: readonly T[], typed: string): T | undefined {
  const q = fold(typed);
  return q === "" ? undefined : options.find((o) => fold(o.label) === q);
}

export type ListMove = "down" | "up" | "first" | "last" | "pageDown" | "pageUp";

export const COMBOBOX_PAGE = 8;

/**
 * Where the highlight goes. `index` is the highlighted row, or -1 when there is none.
 * Down from the last row wraps to the first and Up from the first to the last, so the
 * list can be crossed from either end; the page keys stop at the ends instead.
 */
export function moveHighlight(index: number, count: number, move: ListMove): number {
  if (count <= 0) return -1;
  switch (move) {
    case "down":
      return index < 0 || index >= count - 1 ? 0 : index + 1;
    case "up":
      return index <= 0 ? count - 1 : index - 1;
    case "first":
      return 0;
    case "last":
      return count - 1;
    case "pageDown":
      return Math.min(count - 1, Math.max(0, index) + COMBOBOX_PAGE);
    case "pageUp":
      return Math.max(0, (index < 0 ? 0 : index) - COMBOBOX_PAGE);
  }
}

/** What a screen reader hears when the list changes. */
export function resultsStatus(count: number, query: string): string {
  if (count === 0) return "No matches";
  if (query.trim() === "") return `${count} options`;
  return count === 1 ? "1 match" : `${count} matches`;
}
