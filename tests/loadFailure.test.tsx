import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

const { LoadFailure, isForbidden } = await import("../components/ui/LoadFailure");
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const html = (el: JSX.Element) => renderToStaticMarkup(el);
const err = (message: string, status?: number) => Object.assign(new Error(message), status === undefined ? {} : { status });

test("a refused request shows one no-access state: the permission it needs, no 'Couldn't load', no Retry", () => {
  const out = html(<LoadFailure error={err("You don't have permission to do that.", 403)} noun="quotation" permission="quotations.view" onRetry={() => {}} />);
  assert.match(out, /No access/);
  assert.match(out, /You don&#x27;t have access to this quotation/);
  assert.match(out, /needs the quotations\.view permission/);
  assert.doesNotMatch(out, /Couldn&#x27;t load/);
  assert.doesNotMatch(out, /Retry/);
  assert.doesNotMatch(out, /Something went wrong/);
});

test("a network or server failure keeps its message and Retry, and says nothing about permissions", () => {
  for (const status of [undefined, 0, 500, 404]) {
    const out = html(<LoadFailure error={err("Could not reach the RevenueOS backend.", status)} noun="sales order" permission="salesorders.view" onRetry={() => {}} />);
    assert.match(out, /Couldn&#x27;t load this sales order/, String(status));
    assert.match(out, /Could not reach the RevenueOS backend\./);
    assert.match(out, /Retry/);
    assert.doesNotMatch(out, /No access|permission/);
  }
});

test("only a 403 counts as refused", () => {
  assert.equal(isForbidden(err("x", 403)), true);
  for (const e of [err("x", 401), err("x", 500), err("x"), null, undefined]) assert.equal(isForbidden(e), false);
});

test("the four document pages use the shared state, each with its own backend permission", () => {
  const pages: Array<[string, string, string]> = [
    ["app/quotations/[id]/page.tsx", "quotation", "quotations.view"],
    ["app/proforma-invoices/[id]/page.tsx", "proforma invoice", "proformas.view"],
    ["app/sales-orders/[id]/page.tsx", "sales order", "salesorders.view"],
    ["app/sales-invoices/[id]/page.tsx", "sales invoice", "invoices.view"],
  ];
  for (const [p, noun, perm] of pages) {
    const s = src(p);
    assert.ok(s.includes(`<LoadFailure error={error} noun="${noun}" permission="${perm}" onRetry={refetch} />`), p);
    assert.doesNotMatch(s, /Couldn't load this/, `${p}: no second, local copy of the error panel`);
  }
});
