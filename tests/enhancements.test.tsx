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
  holds,
  permissionArea,
  permissionKind,
} = await import("../lib/repository/shared/access");
const { createCustomerThenRegistration } = await import("../lib/repository/shared/customerCreate");
const { contentCategories, filterContent } = await import("../lib/content/shareSelection");
const { LeadDuplicatesPanel } = await import("../components/ui/LeadDuplicatesPanel");
const { NO_DUPLICATES, namesOf, probeIsWorthChecking, routingAdvice } = await import("../lib/repository/shared/leadDuplicates");
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

test("revenue.view.all includes finance.view.all for hold-what-you-grant; both are sensitive", () => {
  assert.equal(holds(new Set(["revenue.view.all"]), "finance.view.all"), true);
  assert.equal(holds(new Set(["leads.view"]), "finance.view.all"), false);
  assert.equal(holds(new Set(["finance.view.all"]), "revenue.view.all"), false, "never the other way round");
  assert.ok(SENSITIVE_PERMISSIONS.includes("finance.view.all") && SENSITIVE_PERMISSIONS.includes("payments.gateway.manage"));
  assert.equal(permissionKind("finance.view.all"), "See every financial record");
  assert.equal(permissionArea("payments.gateway.manage"), "Payment gateway");
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
  assert.match(out, /Same GSTIN<\/span> <span>A customer you do not have access to<\/span>/);
  assert.match(out, /No salesperson is linked to it yet/);
  assert.doesNotMatch(out, /href="\/customers\/"/);
  assert.match(out, /href="\/customers\/c9">Raj Traders \(CUST-9\)<\/a> · inactive — same name/);
});

// ---------------------------------------------------------------- duplicate leads

test("returning enquiries: kinds kept apart, provenance for visible ones, routing for hidden customers", () => {
  const out = html(
    <LeadDuplicatesPanel
      result={{
        person: { returning: true, previousEnquiries: 2 },
        leads: [
          { id: "l1", customerName: "Asha Rao", companyName: "Sterling", status: "CONTACTED", isActive: true, createdAt: "2026-10-01T05:00:00Z", sourceName: "IndiaMART", inventoryItem: { id: "i1", productName: "Needle Loom 100", sku: "NL-100" }, assignedTo: { id: "u1", fullName: "Priya N." }, customer: null, relation: "EARLIER", strength: "EXACT", reasons: ["PHONE", "NAME"], differentName: false, kind: "POTENTIAL_DUPLICATE", sameProduct: true },
          { id: "l2", customerName: "Asha Rao", companyName: null, status: "LOST", isActive: true, createdAt: "2026-03-01T05:00:00Z", sourceName: "Website", inventoryItem: { id: "i2", productName: "Braider 16", sku: null }, assignedTo: null, customer: { hidden: true, mappedTo: [{ id: "u9", fullName: "Tara S." }] }, relation: "EARLIER", strength: "EXACT", reasons: ["EMAIL", "NAME"], differentName: false, kind: "REPEAT_ENQUIRY", sameProduct: false },
          { hidden: true, strength: "POSSIBLE", reasons: ["PHONE"], differentName: true, kind: "POSSIBLE_MATCH", relation: "LATER", handledBy: { id: "u7", fullName: "Sam S." } },
        ],
        customers: [{ hidden: true, mappedTo: [{ id: "u9", fullName: "Tara S." }], link: "MATCH", strength: "EXACT", reasons: ["GSTIN"] }],
        summary: { potentialDuplicates: 1, repeatEnquiries: 1, possibleMatches: 1, linkedCustomers: 0, matchingCustomers: 1 },
        productComparison: "available",
      }}
    />,
  );
  assert.match(out, /This may be an enquiry that is already in RevenueOS/);
  assert.match(out, /Possible duplicate<\/span>.*href="\/leads\/l1">Asha Rao · Sterling<\/a>/);
  assert.match(out, /IndiaMART · received .* \(earlier\) · Needle Loom 100 \(same product\) · same phone number, same name · handled by Priya N\./);
  assert.match(out, /Earlier enquiry<\/span>.*Braider 16 \(another product\).*linked to a customer looked after by Tara S\./);
  assert.match(out, /An enquiry you do not have access to \(later\)\..*same phone number - but another name: it may be a different person · handled by Sam S\./);
  assert.match(out, /An existing customer you do not have access to \(same GSTIN\)\..*It is looked after by Tara S\. Pass the enquiry to them/);
  assert.doesNotMatch(out, /href="\/customers\//);
  assert.doesNotMatch(out, /S\.\./, "no doubled full stop after a name");
  assert.match(out, /aria-label="Earlier enquiries from this person"/);
  assert.equal(html(<LeadDuplicatesPanel result={NO_DUPLICATES} />), "");
});

test("a weak phone match alone is shown as something to check, not as the same person", () => {
  const out = html(
    <LeadDuplicatesPanel
      compact
      result={{
        ...NO_DUPLICATES,
        leads: [{ id: "l3", customerName: "Ravi Kumar", companyName: "Acme", status: "NEW", isActive: true, createdAt: "2026-10-01T05:00:00Z", sourceName: "Website", inventoryItem: null, assignedTo: null, customer: null, relation: null, strength: "POSSIBLE", reasons: ["PHONE"], differentName: true, kind: "POSSIBLE_MATCH", sameProduct: null }],
        summary: { ...NO_DUPLICATES.summary, possibleMatches: 1 },
      }}
    />,
  );
  assert.match(out, /Similar records exist - check whether they are the same person\./);
  assert.match(out, /Possible match/);
  assert.doesNotMatch(out, /already in RevenueOS/);
});

test("routing advice names who looks after a customer, or says to ask an administrator", () => {
  assert.equal(namesOf([{ id: "a", fullName: "Sam" }, { id: "b", fullName: "Tara" }, { id: "c", fullName: null }]), "Sam, Tara and a former user");
  assert.match(routingAdvice([{ id: "a", fullName: "Sam" }]), /^It is looked after by Sam\. Pass the enquiry to them, or ask an administrator .* do not create another customer\.$/);
  assert.match(routingAdvice([]), /^No salesperson is linked to it yet\. Ask an administrator/);
  assert.equal(probeIsWorthChecking({ gstin: "27 abcde 1234 f1z5" }), true);
  assert.equal(probeIsWorthChecking({ gstin: "27ABCDE" }), false);
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
