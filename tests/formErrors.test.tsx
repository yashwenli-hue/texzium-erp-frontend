import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

const rows = [
  { id: "o1", leadId: "l1", title: "Loom", status: "QUALIFIED", expectedValue: 1, probability: 10, expectedCloseDate: "2026-11-30T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z", lead: { id: "l1", customerName: "Asha", assignedToId: "u-sam" } },
  { id: "o2", leadId: "l2", title: "Braider", status: "QUALIFIED", expectedValue: 1, probability: 10, expectedCloseDate: "2026-11-30T00:00:00.000Z", createdAt: "2026-10-01T00:00:00.000Z", lead: { id: "l2", customerName: "Ravi", assignedToId: null } },
];
mock.module(new URL("../lib/api/httpClient.ts", import.meta.url).href, {
  namedExports: { apiFetch: async () => rows, ApiError: class extends Error {} },
});

const { FormError } = await import("../components/ui/FormError");
const { RealOpportunityRepository, OWNER_NAME_UNAVAILABLE } = await import("../lib/repository/real/realOpportunityRepository");
const src = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("a failed save is announced and shown, not left below the fold", () => {
  assert.equal(renderToStaticMarkup(<FormError message={null} />), "");
  assert.equal(renderToStaticMarkup(<FormError message="HSN not mapped to inventory item" />), '<p role="alert" class="form-error-msg">HSN not mapped to inventory item</p>');
  assert.match(src("components/ui/FormError.tsx"), /scrollIntoView/);
});

test("every dialog form reports its save error through FormError (no silent plain paragraph)", () => {
  const forms = readdirSync(new URL("../components/forms/", import.meta.url)).filter((f) => f.endsWith(".tsx"));
  for (const f of forms) {
    const s = src(`components/forms/${f}`);
    assert.doesNotMatch(s, /\{(error|errors\.form) && <p style=\{\{ color: "var\(--bad\)", fontSize: 12\.5 \}\}>/, f);
  }
  assert.match(src("components/forms/QuotationForm.tsx"), /<FormError message=\{errors\.form\} \/>/);
  assert.match(src("components/ui/ConfirmDialog.tsx"), /<FormError message=\{error\} \/>/);
});

test("the quotation form takes the person to the first invalid field", () => {
  assert.match(src("components/forms/QuotationForm.tsx"), /\[aria-invalid="true"\]'\)\?\.focus\(\)/);
});

test("an owner whose name can't be looked up is 'Name not available', never 'Unassigned'", async () => {
  const refused = { listAssignable: async () => { throw Object.assign(new Error("Forbidden"), { status: 403 }); } };
  const page = await new RealOpportunityRepository(refused as never).list();
  const byId = Object.fromEntries(page.items.map((o) => [o.id, o.ownerName]));
  assert.equal(byId.o1, OWNER_NAME_UNAVAILABLE);
  assert.equal(byId.o2, "Unassigned");
  const known = { listAssignable: async () => [{ id: "u-sam", name: "Sam Sales", active: true }] };
  const named = await new RealOpportunityRepository(known as never).list();
  assert.equal(named.items.find((o) => o.id === "o1")?.ownerName, "Sam Sales");
});
