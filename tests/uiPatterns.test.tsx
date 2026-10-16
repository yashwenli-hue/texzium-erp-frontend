import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { LeadStatus } from "../lib/types/domain";

// QuickActions raises toasts; rendering on the server runs no handlers, so a stub is enough.
mock.module(new URL("../components/ui/Toast.tsx", import.meta.url).href, {
  namedExports: { useToast: () => ({ success: () => 0, error: () => 0, info: () => 0, show: () => 0, dismiss: () => {} }) },
});
mock.module("next/navigation", { namedExports: { useRouter: () => ({ back: () => {}, push: () => {} }) } });

const { LEAD_STATUS_STYLE, LEAD_STATUS_MARK, LeadStatusTag, LeadDeactivatedTag } = await import("../components/ui/Tag");
const { QuickActions } = await import("../components/ui/QuickActions");
const { DataTable } = await import("../components/ui/DataTable");
const { BackLink } = await import("../components/ui/BackLink");
const { samePlacement, scrollTopToReveal } = await import("../components/ui/Combobox");
const { readSessionValue, writeSessionValue } = await import("../lib/ui/sessionState");
const { LEAD_STATUSES } = await import("../lib/types/domain");

const html = (el: JSX.Element) => renderToStaticMarkup(el);
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// ---- colour tokens, read from the stylesheet itself --------------------------------------

function block(selector: string): string {
  const at = css.indexOf(`${selector}{`);
  assert.ok(at >= 0, `${selector} block`);
  return css.slice(at, css.indexOf("\n}", at));
}
function tokens(selector: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of block(selector).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) map.set(m[1], m[2].trim());
  return map;
}
const LIGHT = tokens(":root");
const DARK = new Map([...LIGHT, ...tokens(':root[data-theme="dark-v4"]')]);

function resolve(value: string, theme: Map<string, string>): string {
  const v = value.match(/^var\(--([a-z0-9-]+)\)$/);
  if (!v) return value;
  const next = theme.get(v[1]);
  assert.ok(next, `--${v[1]} is defined`);
  return resolve(next, theme);
}
function rgba(color: string): [number, number, number, number] {
  const m = color.match(/^rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)$/);
  if (m) return [+m[1], +m[2], +m[3], +m[4]];
  const h = color.replace("#", "");
  assert.match(h, /^[0-9a-fA-F]{6}$/, color);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
}
function over(color: string, base: string): [number, number, number] {
  const [r, g, b, a] = rgba(color);
  const [br, bg, bb] = rgba(base);
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];
}
function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg: string, bg: string, theme: Map<string, string>): number {
  // Both colours as they appear on the card surface (a dark-theme tint is translucent).
  const surface = resolve("var(--surface)", theme);
  const [hi, lo] = [luminance(over(resolve(fg, theme), surface)), luminance(over(resolve(bg, theme), surface))].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

test("every lead status has a badge colour, and every badge is at least 4.5:1 in light and dark", () => {
  for (const status of LEAD_STATUSES) {
    const style = LEAD_STATUS_STYLE[status];
    assert.ok(style, status);
    for (const [name, theme] of [["light", LIGHT], ["dark", DARK]] as const) {
      const ratio = contrast(style.fg, style.bg, theme);
      assert.ok(ratio >= 4.5, `${status} ${name}: ${ratio.toFixed(2)}`);
    }
  }
  // The neutral "Deactivated" tag too (it used --muted before: 3.75:1 in light).
  assert.ok(contrast("var(--text-2)", "var(--line-2)", LIGHT) >= 4.5);
  assert.ok(contrast("var(--text-2)", "var(--line-2)", DARK) >= 4.5);
});

test("neighbouring stages no longer share a colour", () => {
  const same = (a: LeadStatus, b: LeadStatus) => LEAD_STATUS_STYLE[a].bg === LEAD_STATUS_STYLE[b].bg;
  assert.ok(!same("CONTACTED", "PRE_SALES_ASSIGNED"), "Contacted vs Pre-Sales Assigned");
  assert.ok(!same("QUALIFIED", "WON"), "Qualified vs Won");
  assert.ok(!same("SALES_ASSIGNED", "WON"), "Sales Assigned vs Won");
  assert.ok(!same("REJECTED", "LOST"), "Rejected vs Lost");
  assert.ok(!same("NEW", "CONTACTED"), "New vs Contacted");
  // Different names for the same stage keep one colour.
  assert.ok(same("QUALIFIED", "SALES_ASSIGNED") && same("ASSIGNED", "PRE_SALES_ASSIGNED"));
});

test("closed statuses carry an icon as well as their colour; open ones keep the dot", () => {
  assert.deepEqual(Object.keys(LEAD_STATUS_MARK).sort(), ["LOST", "REJECTED", "WON"]);
  const won = html(<LeadStatusTag status="WON" />);
  assert.match(won, /class="tag tag-mark"/);
  assert.match(won, /<svg[^>]*>.*<\/svg>Won<\/span>$/);
  const fresh = html(<LeadStatusTag status="NEW" />);
  assert.match(fresh, /^<span class="tag" style="[^"]+">New<\/span>$/);
  // An unknown status still renders, readably.
  assert.match(html(<LeadStatusTag status="SOMETHING_NEW" />), /color:var\(--text-2\)/);
  assert.match(html(<LeadDeactivatedTag />), /color:var\(--text-2\)">Deactivated/);
});

// ---- quick actions ------------------------------------------------------------------------

test("quick actions: Share is a fifth action only when sharing is offered", () => {
  const without = html(<QuickActions phone="9876543210" email="a@b.c" contactName="Asha" country="IN" />);
  assert.equal((without.match(/class="qa"/g) ?? []).length, 4);
  assert.doesNotMatch(without, /Share/);

  const withShare = html(<QuickActions phone="9876543210" contactName="Asha" country="IN" share={{ onShare: () => {} }} />);
  assert.equal((withShare.match(/class="qa"/g) ?? []).length, 5);
  assert.match(withShare, /aria-label="Share content with Asha"/);
  assert.doesNotMatch(withShare, /aria-disabled/);
  // One size container around one row.
  assert.match(withShare, /^<div class="qa-wrap"><div class="qa-row">/);
});

test("quick actions: a Share that cannot be used now stays focusable and says why", () => {
  const out = html(<QuickActions phone="9876543210" contactName="Asha" share={{ onShare: () => {}, unavailable: "Reactivate this lead before sharing content with it." }} />);
  assert.match(out, /aria-disabled="true"/);
  assert.match(out, /title="Reactivate this lead before sharing content with it\."/);
  assert.doesNotMatch(out, /\sdisabled=""/, "not the native disabled, which would take it out of the Tab order");
});

test("quick actions CSS: one row of equal buttons, rows of three on a narrow card, 44px targets", () => {
  assert.match(css, /\.qa-row\{display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\)/);
  assert.match(css, /@container \(max-width:340px\)\{\.qa-row\{grid-auto-flow:row;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}\}/);
  assert.match(css, /\.qa\{[^}]*min-height:44px/);
});

// ---- tables and links -------------------------------------------------------------------

test("a clickable table row can be reached with Tab; a sort header is a button", () => {
  const rows = [{ id: "1", name: "Asha" }];
  const cols = [{ key: "name", header: "Name", sortable: true, render: (r: { name: string }) => r.name }];
  const clickable = html(<DataTable columns={cols} rows={rows} sort={{ field: "name", direction: "asc" }} onSort={() => {}} onRowClick={() => {}} />);
  assert.match(clickable, /<tr class="clickable" tabindex="0">/);
  assert.match(clickable, /<th scope="col" aria-sort="ascending"><button type="button" class="th-sort active">/);
  const plain = html(<DataTable columns={cols} rows={rows} />);
  assert.match(plain, /<tr>/);
  assert.doesNotMatch(plain, /tabindex/);
});

test("the back link is a real link to its fallback", () => {
  assert.equal(html(<BackLink fallback="/leads">Back to Leads</BackLink>).replace(/<svg.*<\/svg>/, "<svg/>"), '<a class="back-link" href="/leads"><svg/> Back to Leads</a>');
});

test("Leads list CSS: a fixed-width identity column that cuts long values short", () => {
  assert.match(css, /\.lead-id\{width:200px;min-width:0\}/);
  assert.match(css, /\.lead-id b,\.lead-id small\{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
  assert.doesNotMatch(css, /\.lead-id\{min-width:172px\}/);
});

// ---- combobox ---------------------------------------------------------------------------

test("combobox: the list scrolls only as far as needed to show the highlighted row", () => {
  const list = { scrollTop: 100, clientHeight: 200 };
  assert.equal(scrollTopToReveal({ top: 150, height: 40 }, list), null, "already in view");
  assert.equal(scrollTopToReveal({ top: 60, height: 40 }, list), 56, "above: scroll up to it");
  assert.equal(scrollTopToReveal({ top: 280, height: 40 }, list), 124, "below: scroll down to it");
  assert.equal(scrollTopToReveal({ top: 2, height: 40 }, { scrollTop: 10, clientHeight: 200 }), 0, "never above the top");
});

test("combobox: an unchanged placement is recognised (no re-render while scrolling)", () => {
  const a = { left: 10, width: 200, top: 50, maxHeight: 300 };
  assert.ok(samePlacement(a, { ...a }));
  assert.ok(!samePlacement(a, { ...a, top: 51 }));
  assert.ok(!samePlacement(a, { left: 10, width: 200, bottom: 50, maxHeight: 300 }));
  assert.ok(samePlacement(null, null));
  assert.ok(!samePlacement(a, null));
});

test("combobox source: the list's own scroll is ignored and the page is never scrolled", () => {
  const src = readFileSync(new URL("../components/ui/Combobox.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\.scrollIntoView\(/);
  assert.match(src, /listRef\.current\?\.contains\(e\.target\)\) return;/);
  assert.match(src, /revealHighlight\.current = false;\s*setActive\(i\);/, "a pointer highlight does not scroll");
});

// ---- remembered view --------------------------------------------------------------------

test("session state: stored values are sanitised, and broken storage is harmless", () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  const before = g.window;
  try {
    g.window = { sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } };
    const keepNumber = (raw: unknown) => (typeof raw === "number" ? raw : null);
    writeSessionValue("k", 7);
    assert.equal(readSessionValue("k", keepNumber), 7);
    store.set("k", '"seven"');
    assert.equal(readSessionValue("k", keepNumber), null, "rejected by sanitize");
    store.set("k", "{not json");
    assert.equal(readSessionValue("k", keepNumber), null, "unreadable");
    assert.equal(readSessionValue("missing", keepNumber), null);

    g.window = { sessionStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } } };
    assert.equal(readSessionValue("k", keepNumber), null);
    assert.doesNotThrow(() => writeSessionValue("k", 1));
  } finally {
    g.window = before;
  }
});
