import type { ActionState } from "./quotationLifecycle";
import type { Customer, CustomerGstRegistration, CustomerMatchReason, QuotingBlocker } from "../../types/domain";

/**
 * Customer Management rules, mirroring the backend (commits bb9f81f customer
 * master, 70a8609 GST registrations, 7c10ab0 opportunity link). The backend is
 * the authority and re-checks everything; these rules let the forms catch a
 * mistake before a round trip, let the screens offer the right actions and say
 * why one is unavailable, and let the mock behave the same way. The tests
 * compare them with the backend's own modules.
 */

// ---------------------------------------------------------------------------
// Permissions (backend: 20261008_crm_customer_permissions.sql, ..._gst_permissions.sql)
// ---------------------------------------------------------------------------
export const CUSTOMER_PERMISSIONS = {
  view: "customers.view",
  create: "customers.create",
  edit: "customers.edit",
  deactivate: "customers.deactivate",
  gstManage: "customers.gst.manage",
} as const;

/** Linking a customer to an opportunity is an edit of the opportunity. */
export const OPPORTUNITY_EDIT_PERMISSION = "opportunities.edit";

// ---------------------------------------------------------------------------
// Limits and formats (backend: customer-values.ts, customer-gst-values.ts)
// ---------------------------------------------------------------------------
export const CUSTOMER_NAME_MAX_LENGTH = 200;
export const CUSTOMER_TYPE_MAX_LENGTH = 50;
export const CUSTOMER_EMAIL_MAX_LENGTH = 254;
export const CUSTOMER_REASON_MAX_LENGTH = 500;
export const GST_NAME_MAX_LENGTH = 200;
export const GST_ADDRESS_MAX_LENGTH = 200;
export const GST_CITY_MAX_LENGTH = 100;
export const GST_REASON_MAX_LENGTH = 500;

/** Five letters, four digits, a letter. Stored upper-case. */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
/** Digits with the usual separators, 7 to 20 characters. A sanity check on typing. */
export const PHONE_PATTERN = /^\+?[0-9][0-9()\-\s]{5,18}[0-9]$/;
/** State code, the holder's PAN, an entity number, Z, a check character (the check character is not verified). */
export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Offered as suggestions; the backend accepts any text up to the limit. */
export const CUSTOMER_TYPE_SUGGESTIONS = ["B2B", "B2C", "Government"];

/** The GSTIN state codes that can be issued, with the names registrations already use. */
export const GST_STATES: Readonly<Record<string, string>> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

// ---------------------------------------------------------------------------
// Normalising, the way the backend does before it stores or compares
// ---------------------------------------------------------------------------
export const normalizePan = (pan: string) => pan.trim().toUpperCase();
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizeGstin = (gstin: string) => gstin.trim().toUpperCase();
/** Names are the same when they differ only in case, surrounding or repeated space. No fuzzy matching. */
export const normalizeCustomerName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
export const phoneDigits = (phone: string) => phone.replace(/\D/g, "");
/** Phones match for a duplicate warning when their last ten digits match and each has at least seven. */
export function samePhone(a: string, b: string): boolean {
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  return x.length >= 7 && y.length >= 7 && x.slice(-10) === y.slice(-10);
}

export const gstinStateCode = (gstin: string) => gstin.slice(0, 2);
export const gstinPan = (gstin: string) => gstin.slice(2, 12);

/** The state a GSTIN is registered in, or null when its code cannot be issued. */
export function gstinState(gstin: string): { stateCode: string; stateName: string } | null {
  const stateCode = gstinStateCode(gstin);
  const stateName = GST_STATES[stateCode];
  return stateName ? { stateCode, stateName } : null;
}

/** Does the PAN inside the GSTIN belong to the customer? A customer without a PAN has nothing to disagree with. */
export function gstinMatchesPan(gstin: string, customerPan: string | null | undefined): boolean {
  if (!customerPan || customerPan.trim() === "") return true;
  return gstinPan(gstin) === customerPan.trim().toUpperCase();
}

/** CUST-000001. Numbers above 999999 simply grow longer. */
export function formatCustomerCode(n: number): string {
  return `CUST-${String(n).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Form checks. Return a message per field, or {} when the input is fine.
// ---------------------------------------------------------------------------
export interface CustomerFieldsInput {
  customerName?: string;
  customerType?: string;
  panNumber?: string;
  email?: string;
  phone?: string;
}

export function validateCustomerFields(input: CustomerFieldsInput): Record<string, string> {
  const e: Record<string, string> = {};
  const name = (input.customerName ?? "").trim();
  if (!name) e.customerName = "Customer name is required.";
  else if (name.length > CUSTOMER_NAME_MAX_LENGTH) e.customerName = `Keep the name under ${CUSTOMER_NAME_MAX_LENGTH} characters.`;

  const type = (input.customerType ?? "").trim();
  if (type.length > CUSTOMER_TYPE_MAX_LENGTH) e.customerType = `Keep the type under ${CUSTOMER_TYPE_MAX_LENGTH} characters.`;

  const pan = (input.panNumber ?? "").trim();
  if (pan && !PAN_PATTERN.test(normalizePan(pan))) e.panNumber = "Enter a valid PAN, for example ABCDE1234F.";

  const email = (input.email ?? "").trim();
  if (email && (!EMAIL_PATTERN.test(email) || email.length > CUSTOMER_EMAIL_MAX_LENGTH)) e.email = "Enter a valid email address.";

  const phone = (input.phone ?? "").trim();
  if (phone && !PHONE_PATTERN.test(phone)) e.phone = "Enter a valid phone number (7 to 20 digits).";

  return e;
}

export interface GstFieldsInput {
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  branchName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
}

/**
 * `forEdit` skips the GSTIN: a registration's GSTIN and state never change.
 * `customerPan` is the customer's PAN, which the GSTIN has to carry.
 */
export function validateGstFields(input: GstFieldsInput, opts: { forEdit?: boolean; customerPan?: string | null } = {}): Record<string, string> {
  const e: Record<string, string> = {};

  if (!opts.forEdit) {
    const gstin = normalizeGstin(input.gstin ?? "");
    if (!gstin) e.gstin = "GSTIN is required.";
    else if (!GSTIN_PATTERN.test(gstin)) e.gstin = "Enter a valid 15-character GSTIN, for example 27ABCDE1234F1Z5.";
    else if (!gstinState(gstin)) e.gstin = `The GSTIN starts with ${gstinStateCode(gstin)}, which is not a GST state code.`;
    else if (!gstinMatchesPan(gstin, opts.customerPan)) {
      e.gstin = `This GSTIN carries the PAN ${gstinPan(gstin)}, not the customer's ${normalizePan(opts.customerPan ?? "")}.`;
    }
  }

  const need = (key: keyof GstFieldsInput, label: string, max: number) => {
    const v = (input[key] ?? "").trim();
    if (!v) e[key] = `${label} is required.`;
    else if (v.length > max) e[key] = `Keep ${label.toLowerCase()} under ${max} characters.`;
  };
  const optional = (key: keyof GstFieldsInput, label: string, max: number) => {
    const v = (input[key] ?? "").trim();
    if (v.length > max) e[key] = `Keep ${label.toLowerCase()} under ${max} characters.`;
  };

  need("legalName", "Legal name", GST_NAME_MAX_LENGTH);
  optional("tradeName", "Trade name", GST_NAME_MAX_LENGTH);
  optional("branchName", "Branch name", GST_NAME_MAX_LENGTH);
  need("addressLine1", "Address", GST_ADDRESS_MAX_LENGTH);
  optional("addressLine2", "Address line 2", GST_ADDRESS_MAX_LENGTH);
  need("city", "City", GST_CITY_MAX_LENGTH);

  const pin = (input.pincode ?? "").trim();
  if (!pin) e.pincode = "PIN code is required.";
  else if (!PINCODE_PATTERN.test(pin)) e.pincode = "Enter a 6-digit PIN code.";

  return e;
}

/** Remarks/reason checks (trimmed). `required` mirrors the deactivation reason. */
export function cleanCustomerText(text: string | undefined, max: number, required: boolean, label: string): string | undefined {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    if (required) throw new Error(`${label} is required.`);
    return undefined;
  }
  if (trimmed.length > max) throw new Error(`Keep ${label.toLowerCase()} under ${max} characters.`);
  return trimmed;
}

// ---------------------------------------------------------------------------
// Wording identical to the backend's messages (the mock raises the same ones).
// ---------------------------------------------------------------------------
export const CUSTOMER_NOT_FOUND_MESSAGE = "Customer not found.";
export const GST_NOT_FOUND_MESSAGE = "GST registration not found.";
export const CUSTOMER_INACTIVE_EDIT_MESSAGE = "This customer is inactive. Reactivate it to edit it.";
export const CUSTOMER_INACTIVE_GST_MESSAGE = "This customer is inactive. Reactivate it before changing its GST registrations.";
export const CUSTOMER_INACTIVE_LINK_MESSAGE = "This customer is inactive. Reactivate it before linking it to an opportunity.";
export const CUSTOMER_ALREADY_INACTIVE_MESSAGE = "This customer is already inactive.";
export const CUSTOMER_ALREADY_ACTIVE_MESSAGE = "This customer is already active.";
export const PAN_MISMATCHES_GST_MESSAGE =
  "This PAN does not match the GSTIN of one or more of the customer's active GST registrations. Deactivate those registrations first, or use the PAN they carry.";
export const GST_ALREADY_INACTIVE_MESSAGE = "This GST registration is already inactive.";
export const GST_ALREADY_ACTIVE_MESSAGE = "This GST registration is already active.";
export const GST_IS_DEFAULT_MESSAGE = "This is the default GST registration. Make another registration the default first.";
export const GST_INACTIVE_EDIT_MESSAGE = "This GST registration is inactive. Reactivate it to edit it.";
export const GST_INACTIVE_DEFAULT_MESSAGE = "This GST registration is inactive. Reactivate it before making it the default.";
export const OPPORTUNITY_NOT_LINKED_MESSAGE = "This opportunity has no customer yet. Link a customer to it before creating a quotation.";
export const OPPORTUNITY_CUSTOMER_LOCKED_MESSAGE = "This opportunity already has a customer and a quotation, so its customer can no longer be changed or removed.";
export const OPPORTUNITY_GST_OF_ANOTHER_CUSTOMER_MESSAGE =
  "This opportunity already has documents that use a GST registration of another customer, so it cannot be linked to this one.";
export const OPPORTUNITY_CUSTOMER_CHANGED_MESSAGE = "This opportunity's customer changed while you were working. Reload and try again.";
export const BUYER_GST_NOT_CUSTOMERS_MESSAGE = "The buyer GST registration does not belong to this opportunity's customer.";

export const duplicatePanMessage = (name: string, code: string) =>
  `A customer with this PAN already exists: ${name} (${code}). Add another site as a GST registration of that customer instead.`;
export const duplicateNameMessage = (name: string, code: string) =>
  `A customer with this name already exists: ${name} (${code}). Use that customer, or make the name distinct.`;
export const duplicateGstinMessage = (gstin: string, name: string, code: string) =>
  `The GSTIN ${gstin} is already registered to ${name} (${code}).`;
export const customerInactiveForMessage = (what: "quotation" | "Proforma Invoice" | "Sales Order") =>
  `This customer is inactive. Reactivate it before creating ${what === "quotation" ? "a quotation" : what === "Sales Order" ? "a Sales Order" : "a Proforma Invoice"} for it.`;

/** Backend codes that arrive with a 409 (customer-lifecycle.ts, customer-gst-lifecycle.ts, opportunity-customer.ts). */
export type CustomerConflictCode =
  | "DUPLICATE_PAN"
  | "DUPLICATE_NAME"
  | "DUPLICATE_GSTIN"
  | "CUSTOMER_INACTIVE"
  | "ALREADY_INACTIVE"
  | "ALREADY_ACTIVE"
  | "PAN_MISMATCHES_GST"
  | "GST_ALREADY_INACTIVE"
  | "GST_ALREADY_ACTIVE"
  | "GST_INACTIVE"
  | "GST_IS_DEFAULT"
  | "OPPORTUNITY_NOT_LINKED"
  | "OPPORTUNITY_CUSTOMER_LOCKED"
  | "OPPORTUNITY_CUSTOMER_CHANGED"
  | "OPPORTUNITY_GST_OF_ANOTHER_CUSTOMER";

/**
 * A request the backend refused because the record is no longer where the person
 * saw it, or because a rule forbids it (a duplicate, an inactive customer, a
 * locked link). Thrown by both repositories, so screens handle it once: reload,
 * then show the message. `existing` names the record that blocks a duplicate.
 */
export class CustomerConflictError extends Error {
  code?: string;
  existing?: { id: string; customerCode?: string; customerName?: string; gstin?: string; isActive?: boolean };
  /** The existing customer is one the person may not open: who looks after it (D3). */
  mappedTo?: { id: string; fullName: string | null }[];

  constructor(message: string, code?: string, existing?: CustomerConflictError["existing"], mappedTo?: CustomerConflictError["mappedTo"]) {
    super(message);
    this.name = "CustomerConflictError";
    this.code = code;
    this.existing = existing;
    this.mappedTo = mappedTo;
  }
}

// ---------------------------------------------------------------------------
// Which actions make sense, and why one does not. The UI also needs the
// permission; the backend decides. Every disabled action carries a reason that
// is shown as text (not only a tooltip).
// ---------------------------------------------------------------------------
const yes: ActionState = { enabled: true };
const no = (reason: string): ActionState => ({ enabled: false, reason });

export interface CustomerActions {
  edit: ActionState;
  deactivate: ActionState;
  reactivate: ActionState;
  addGst: ActionState;
}

export function customerActions(ctx: { isActive: boolean; may: { edit: boolean; deactivate: boolean; gstManage: boolean } }): CustomerActions {
  const { isActive, may } = ctx;
  return {
    edit: !may.edit ? no("You don't have permission to edit customers.") : !isActive ? no("This customer is inactive. Reactivate it to edit it.") : yes,
    deactivate: !may.deactivate ? no("You don't have permission to deactivate customers.") : !isActive ? no("Already inactive.") : yes,
    reactivate: !may.deactivate ? no("You don't have permission to reactivate customers.") : isActive ? no("Already active.") : yes,
    addGst: !may.gstManage ? no("You don't have permission to manage GST registrations.") : !isActive ? no("Reactivate the customer before changing its GST registrations.") : yes,
  };
}

export interface GstActions {
  edit: ActionState;
  deactivate: ActionState;
  reactivate: ActionState;
  makeDefault: ActionState;
}

export function gstActions(
  reg: Pick<CustomerGstRegistration, "isActive" | "isDefault">,
  ctx: { customerActive: boolean; may: { gstManage: boolean }; otherActiveCount: number }
): GstActions {
  const blocked = !ctx.may.gstManage
    ? "You don't have permission to manage GST registrations."
    : !ctx.customerActive
    ? "Reactivate the customer before changing its GST registrations."
    : undefined;
  if (blocked) {
    return { edit: no(blocked), deactivate: no(blocked), reactivate: no(blocked), makeDefault: no(blocked) };
  }
  return {
    edit: !reg.isActive ? no("Reactivate this registration to edit it.") : yes,
    deactivate: !reg.isActive
      ? no("Already inactive.")
      : reg.isDefault && ctx.otherActiveCount > 0
      ? no("This is the default registration. Make another registration the default first.")
      : yes,
    reactivate: reg.isActive ? no("Already active.") : yes,
    makeDefault: !reg.isActive ? no("Reactivate it before making it the default.") : reg.isDefault ? no("Already the default.") : yes,
  };
}

export interface OpportunityCustomerActions {
  link: ActionState;
  change: ActionState;
  remove: ActionState;
}

/**
 * A customer can be linked to an opportunity that has none (even one that already
 * has documents), but once an opportunity has a customer AND a quotation the
 * customer can no longer be changed or removed.
 */
export function opportunityCustomerActions(ctx: { hasCustomer: boolean; hasQuotation: boolean; mayEdit: boolean; leadActive: boolean }): OpportunityCustomerActions {
  const base = !ctx.mayEdit ? "You don't have permission to edit opportunities." : !ctx.leadActive ? "The lead is deactivated, so its opportunities can't be changed." : undefined;
  const locked = ctx.hasCustomer && ctx.hasQuotation;
  const lockedReason = "This opportunity already has a quotation, so its customer can no longer be changed or removed.";
  return {
    link: base ? no(base) : ctx.hasCustomer ? no("A customer is already linked.") : yes,
    change: base ? no(base) : !ctx.hasCustomer ? no("No customer is linked yet.") : locked ? no(lockedReason) : yes,
    remove: base ? no(base) : !ctx.hasCustomer ? no("No customer is linked yet.") : locked ? no(lockedReason) : yes,
  };
}

// ---------------------------------------------------------------------------
// Quoting readiness
// ---------------------------------------------------------------------------
export function quotingBlockers(customer: Pick<Customer, "isActive" | "gstRegistrations">): QuotingBlocker[] {
  const blockers: QuotingBlocker[] = [];
  if (!customer.isActive) blockers.push("CUSTOMER_INACTIVE");
  if (!customer.gstRegistrations.some((g) => g.isActive)) blockers.push("NO_ACTIVE_GST");
  return blockers;
}

export function quotingBlockerText(blocker: QuotingBlocker): string {
  return blocker === "CUSTOMER_INACTIVE"
    ? "The customer is inactive. Reactivate it to create quotations."
    : "It has no active GST registration. A quotation needs the buyer's GST registration to work out the tax.";
}

export const MATCH_REASON_LABEL: Record<CustomerMatchReason, string> = {
  GSTIN: "same GSTIN",
  PAN: "same PAN",
  NAME: "same name",
  PHONE: "same phone",
  EMAIL: "same email",
};

/** The default registration first, then the other active ones, then the inactive ones. */
export function sortRegistrations<T extends Pick<CustomerGstRegistration, "isActive" | "isDefault" | "createdAt">>(regs: T[]): T[] {
  const rank = (g: T) => (g.isActive ? (g.isDefault ? 0 : 1) : 2);
  return regs.slice().sort((a, b) => rank(a) - rank(b) || (a.createdAt < b.createdAt ? -1 : 1));
}

/** The registration a new quotation should default to: the active default, else any active one. */
export function defaultRegistration<T extends Pick<CustomerGstRegistration, "isActive" | "isDefault">>(regs: T[]): T | undefined {
  return regs.find((g) => g.isActive && g.isDefault) ?? regs.find((g) => g.isActive);
}

/** "Raj Gujarat — 24XYZAB1234K1Z1 · Gujarat" */
export function registrationLabel(g: Pick<CustomerGstRegistration, "gstin" | "branchName" | "legalName" | "stateName">): string {
  return `${g.branchName || g.legalName} — ${g.gstin} · ${g.stateName}`;
}
