import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { ContentAsset, Customer } from "../lib/types/domain";
import { PDF, PHOTO, VIDEO } from "./helpers/fixtures";

mock.module("next/navigation", { namedExports: { useRouter: () => ({ back: () => {}, push: () => {} }) } });

const {
  GATED_PERMISSIONS,
  ROLE_PRESETS,
  SENSITIVE_PERMISSIONS,
  describeAuditEntry,
  diffCodes,
  groupPermissions,
  permissionArea,
  permissionKind,
} = await import("../lib/repository/shared/access");
const { createCustomerThenRegistration } = await import("../lib/repository/shared/customerCreate");
const { contentCategories, filterContent } = await import("../lib/content/shareSelection");
const { LeadDuplicatesPanel } = await import("../components/ui/LeadDuplicatesPanel");
const { MatchList } = await import("../components/forms/CustomerForm");

const html = (el: JSX.Element) => renderToStaticMarkup(el);

// ---------------------------------------------------------------- access administration

test("presets never include a sensitive or business-gated permission", () => {
  for (const p of ROLE_PRESETS) {
    for (const c of p.codes) {
      assert.ok(!SENSITIVE_PERMISSIONS.includes(c), `${p.key}: ${c} is sensitive`);
      assert.ok(!GATED_PERMISSIONS.includes(c), `${p.key}: ${c} is gated`);
    }
  }
  assert.ok(SENSITIVE_PERMISSIONS.includes("revenue.view.all") && SENSITIVE_PERMISSIONS.includes("invoices.create"));
});

test("a role change is exactly the codes added and removed", () => {
  assert.deepEqual(diffCodes(["leads.view", "leads.edit"], new Set(["leads.view", "content.view"])), { grant: ["content.view"], revoke: ["leads.edit"] });
  assert.deepEqual(diffCodes(["a.view"], ["a.view"]), { grant: [], revoke: [] });
});

test("permissions are grouped by area, searchable, and described by kind", () => {
  const all = [
    { id: "1", code: "leads.view", name: "View Leads", module: "RevenueOS" },
    { id: "2", code: "leads.delete", name: "Delete Leads", module: "RevenueOS" },
    { id: "3", code: "roles.permissions.assign", name: "Assign", module: "AdminOS" },
  ];
  assert.deepEqual(groupPermissions(all).map((g) => [g.area, g.permissions.map((p) => p.code)]), [
    ["Access administration", ["roles.permissions.assign"]],
    ["Leads", ["leads.delete", "leads.view"]],
  ]);
  assert.deepEqual(groupPermissions(all, "delete").map((g) => g.area), ["Leads"]);
  assert.equal(permissionKind("leads.delete"), "Delete / restore");
  assert.equal(permissionKind("revenue.view.all"), "See every record");
  assert.equal(permissionArea("salesorders.view"), "Sales Orders");
});

test("audit entries read as sentences from their recorded data only", () => {
  const e = (action: string, data: Record<string, unknown>) => describeAuditEntry({ id: "x", action, actorName: "Admin", createdAt: "", data });
  assert.deepEqual(e("ROLE_PERMISSION_REVOKED", { permissionCode: "leads.view", roleName: "SALES" }), { title: "Permission revoked", detail: "leads.view from SALES" });
  assert.deepEqual(e("USER_STATUS_CHANGED", { fullName: "Sam", from: "ACTIVE", to: "SUSPENDED", reason: "On leave" }), { title: "Status changed", detail: "Sam: active → suspended (On leave)" });
});

// ---------------------------------------------------------------- customer creation

const customer = (gstins: string[]): Customer =>
  ({ id: "c1", customerCode: "CUST-1", customerName: "Orbit", isActive: true, isVendor: false, createdAt: "", updatedAt: "", gstRegistrations: gstins.map((g) => ({ id: g, gstin: g })) }) as unknown as Customer;

test("a customer and its first registration are created in one request, never half", async () => {
  const calls: unknown[] = [];
  const api = {
    createCustomer: async (input: unknown) => {
      calls.push(input);
      return customer(["27ABCDE1234F1Z5"]);
    },
    addRegistration: async () => {
      throw new Error("must not be called");
    },
  };
  const reg = { gstin: "27ABCDE1234F1Z5", legalName: "Orbit", addressLine1: "x", city: "Pune", pincode: "411001", isDefault: true };
  const out = await createCustomerThenRegistration(api, { customerName: "Orbit" }, reg);
  assert.equal(out.kind, "done");
  assert.deepEqual(calls, [{ customerName: "Orbit", gstRegistration: { gstin: "27ABCDE1234F1Z5", legalName: "Orbit", addressLine1: "x", city: "Pune", pincode: "411001" } }]);
  const refused = await createCustomerThenRegistration(
    { ...api, createCustomer: async () => { throw new Error("This GSTIN is already registered"); } },
    { customerName: "Orbit" },
    reg,
  );
  assert.deepEqual([refused.kind, refused.kind === "failed" && refused.error.message], ["failed", "This GSTIN is already registered"]);
});

test("a duplicate the person may not open is named only as such", () => {
  const out = html(
    <MatchList
      matches={[
        { id: "", customerCode: "", customerName: "", isActive: true, reasons: ["GSTIN", "PAN"], strength: "EXACT", hidden: true },
        { id: "c9", customerCode: "CUST-9", customerName: "Raj Traders", isActive: false, reasons: ["NAME"], strength: "STRONG" },
      ]}
    />,
  );
  assert.match(out, /Same GSTIN<\/span> <span>A customer you do not have access to/);
  assert.doesNotMatch(out, /href="\/customers\/"/);
  assert.match(out, /href="\/customers\/c9">Raj Traders \(CUST-9\)<\/a> · inactive — same name/);
});

// ---------------------------------------------------------------- duplicate leads

test("duplicate leads: provenance for visible ones, nothing identifying for hidden ones", () => {
  const out = html(
    <LeadDuplicatesPanel
      result={{
        leads: [
          { id: "l1", customerName: "Asha Rao", companyName: "Sterling", status: "NEW", isActive: true, createdAt: "2026-10-01T05:00:00Z", sourceName: "IndiaMART", relation: "EARLIER", strength: "EXACT", reasons: ["PHONE"] },
          { hidden: true, strength: "POSSIBLE", reasons: ["COMPANY_AND_CITY"] },
        ],
        customers: [{ hidden: true, reasons: ["PHONE"] }],
        exact: 1,
        possible: 1,
        productComparison: "unavailable",
      }}
    />,
  );
  assert.match(out, /href="\/leads\/l1">Asha Rao · Sterling<\/a>/);
  assert.match(out, /IndiaMART · received .* \(earlier\) · same phone number/);
  assert.match(out, /A lead you do not have access to \(same company and city\)/);
  assert.match(out, /An existing customer you do not have access to/);
  assert.equal(html(<LeadDuplicatesPanel result={{ leads: [], customers: [], exact: 0, possible: 0, productComparison: "unavailable" }} />), "");
});

// ---------------------------------------------------------------- content sharing

test("content can be narrowed to a machine / product category from real catalogue data", () => {
  const withCat = (a: ContentAsset, category: string | null): ContentAsset => ({ ...a, inventoryItem: { id: `i-${a.id}`, sku: "S", productName: "P", category } });
  const items = [withCat(VIDEO, "Needle Looms"), withCat(PDF, "Braiding Machines"), PHOTO];
  assert.deepEqual(contentCategories(items), ["Braiding Machines", "Needle Looms"]);
  assert.deepEqual(filterContent(items, "", "ALL", "needle looms").map((a) => a.id), [VIDEO.id]);
  assert.equal(filterContent(items, "", "ALL").length, 3, "no category given: everything");
  assert.deepEqual(contentCategories([PHOTO]), [], "nothing is invented when no item has a category");
});
