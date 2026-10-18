import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

const { matchesText } = await import("../lib/ui/listSearch");
const { ResponsiveList, ListCard } = await import("../components/ui/ResponsiveList");

const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const LISTS = ["app/opportunities/page.tsx", "app/quotations/page.tsx", "app/proforma-invoices/page.tsx", "app/sales-orders/page.tsx", "app/sales-invoices/page.tsx"];

test("list search: every word must appear somewhere in the row, any case; empty values are ignored", () => {
  const row = ["QT24/26-27/00012", "Texmac Industries", null, undefined, "Priya"];
  assert.equal(matchesText(row, ""), true);
  assert.equal(matchesText(row, "  texmac  "), true);
  assert.equal(matchesText(row, "texmac 00012"), true);
  assert.equal(matchesText(row, "texmac ravi"), false);
  assert.equal(matchesText(row, "undefined"), false);
});

test("document lists are responsive lists: real row links, phone cards, a labelled search, announced loading", () => {
  for (const p of LISTS) {
    const s = src(p);
    assert.match(s, /<ResponsiveList/, p);
    assert.doesNotMatch(s, /<DataTable|onRowClick|router\.push/, p);
    assert.match(s, /<ListSearch /, p);
    assert.match(s, /<LoadingRegion label="Loading /, p);
    assert.match(s, /getLabel=\{/, p);
  }
});

test("opportunities show the product recorded on the lead (not only the browser-only interest field)", () => {
  assert.match(src("app/opportunities/page.tsx"), /l\.product\?\.name \?\? l\.uiContext\?\.productInterest/);
});

test("a list card: title, who it is for, status, amount and facts; empty facts are dropped", () => {
  const out = renderToStaticMarkup(<ListCard title="SO-1" sub="Texmac" status={<i>Open</i>} amount="₹1,000" meta={["Priya", null, "18 Oct"]} />);
  assert.match(out, /<div class="rl-title">SO-1<\/div><div class="rl-sub">Texmac<\/div><\/div><i>Open<\/i>/);
  assert.match(out, /<b class="rl-amount">₹1,000<\/b><span>Priya<\/span><span>18 Oct<\/span>/);
  const list = renderToStaticMarkup(
    <ResponsiveList rows={[{ id: "a" }]} columns={[{ key: "x", header: "X", render: () => "x" }]} getHref={() => "/sales-orders/a"} getLabel={() => "Open sales order SO-1"} card={() => <ListCard title="SO-1" />} caption="Sales orders" />
  );
  assert.equal((list.match(/href="\/sales-orders\/a"/g) ?? []).length, 2);
  assert.match(list, /<caption class="sr-only">Sales orders<\/caption>/);
});

test("a list the person may not open says which permission it needs, and offers no pointless Retry", () => {
  for (const p of ["app/opportunities/page.tsx", "app/sales-orders/page.tsx", "app/quotations/page.tsx", "app/proforma-invoices/page.tsx"]) {
    const s = src(p);
    assert.match(s, /const forbidden = \(error as \{ status\?: number \}\)\.status === 403;/, p);
    assert.match(s, /You don't have access to/, p);
    assert.match(s, /forbidden \? undefined : \(/, p);
  }
});
