/**
 * VERIFIED (backend, returning enquiries 2026-10-17): GET /leads/duplicate-check and
 * GET /leads/:id/duplicates. Nothing is blocked or merged: the result is context for a
 * person to decide.
 *
 * Strength of the PERSON match (a phone number may be shared, so it is not enough alone):
 *   EXACT     phone or email AND the same name; or phone AND email
 *   STRONG    the same email; or the same phone and the same company
 *   POSSIBLE  the same phone only (another name), the same name and company, or the same
 *             company in the same city
 * Kind of each other enquiry (only EXACT/STRONG ones are "the same person"):
 *   POTENTIAL_DUPLICATE  still open and about the same product (or a product not recorded)
 *   REPEAT_ENQUIRY       a new enquiry: another product, or the earlier one closed
 *   POSSIBLE_MATCH       the person is not certain
 * A lead the caller may not see comes back without name, contact, source or dates: how it
 * matches, its kind, and who handles it. A customer the caller may not open (outside their
 * scope, or no customers.view) comes back as { hidden, mappedTo } - the salesperson who
 * looks after it, never the customer's details.
 */
export type DuplicateStrength = "EXACT" | "STRONG" | "POSSIBLE";
export type EnquiryKind = "POTENTIAL_DUPLICATE" | "REPEAT_ENQUIRY" | "POSSIBLE_MATCH";
export type LeadDuplicateReason = "PHONE" | "EMAIL" | "NAME" | "NAME_AND_COMPANY" | "COMPANY_AND_CITY";

export interface PersonRef {
  id: string;
  fullName: string | null;
}

export interface VisibleCustomerRef {
  hidden?: false;
  id: string;
  customerCode: string;
  customerName: string;
  isActive: boolean;
  mappedTo: PersonRef[];
}
export interface HiddenCustomerRef {
  hidden: true;
  mappedTo: PersonRef[];
}
export type CustomerRef = VisibleCustomerRef | HiddenCustomerRef;

export interface VisibleLeadDuplicate {
  hidden?: false;
  id: string;
  customerName: string;
  companyName: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  sourceName: string | null;
  inventoryItem: { id: string; productName: string | null; sku: string | null } | null;
  assignedTo: PersonRef | null;
  customer: CustomerRef | null;
  relation: "EARLIER" | "LATER" | null;
  strength: DuplicateStrength;
  reasons: LeadDuplicateReason[];
  differentName: boolean;
  kind: EnquiryKind;
  sameProduct: boolean | null;
}

export interface HiddenLeadDuplicate {
  hidden: true;
  strength: DuplicateStrength;
  reasons: LeadDuplicateReason[];
  differentName: boolean;
  kind: EnquiryKind;
  relation: "EARLIER" | "LATER" | null;
  handledBy: PersonRef | null;
}

export type LeadDuplicate = VisibleLeadDuplicate | HiddenLeadDuplicate;

/** LINKED: tied to this lead through one of its opportunities. MATCH: its details match. */
export type CustomerMatchForLead = CustomerRef & {
  link: "LINKED" | "MATCH";
  strength: DuplicateStrength | null;
  reasons: string[];
};

export interface LeadDuplicateResult {
  person: { returning: boolean; previousEnquiries: number };
  leads: LeadDuplicate[];
  customers: CustomerMatchForLead[];
  summary: {
    potentialDuplicates: number;
    repeatEnquiries: number;
    possibleMatches: number;
    linkedCustomers: number;
    matchingCustomers: number;
  };
  productComparison: "available" | "unavailable";
}

export interface LeadDuplicateProbe {
  phone?: string;
  alternatePhone?: string;
  email?: string;
  customerName?: string;
  companyName?: string;
  city?: string;
  gstin?: string;
  inventoryItemId?: string;
}

export const NO_DUPLICATES: LeadDuplicateResult = {
  person: { returning: false, previousEnquiries: 0 },
  leads: [],
  customers: [],
  summary: { potentialDuplicates: 0, repeatEnquiries: 0, possibleMatches: 0, linkedCustomers: 0, matchingCustomers: 0 },
  productComparison: "unavailable",
};

export const DUPLICATE_REASON_LABEL: Record<string, string> = {
  PHONE: "same phone number",
  EMAIL: "same email",
  NAME: "same name",
  NAME_AND_COMPANY: "same name and company",
  COMPANY_AND_CITY: "same company and city",
  COMPANY_NAME: "same company name",
  GSTIN: "same GSTIN",
  PAN: "same PAN",
};

export const ENQUIRY_KIND_LABEL: Record<EnquiryKind, string> = {
  POTENTIAL_DUPLICATE: "Possible duplicate",
  REPEAT_ENQUIRY: "Earlier enquiry",
  POSSIBLE_MATCH: "Possible match",
};
export const ENQUIRY_KIND_GROUP: Record<EnquiryKind, string> = {
  POTENTIAL_DUPLICATE: "Possible duplicates",
  REPEAT_ENQUIRY: "Earlier enquiries from this person",
  POSSIBLE_MATCH: "Possible matches to check",
};

export function isHidden<T extends { hidden?: boolean }>(m: T): m is T & { hidden: true } {
  return m.hidden === true;
}

/** Worth asking the server: a full phone number, an email, a complete GSTIN, or a name with its company. */
export function probeIsWorthChecking(p: LeadDuplicateProbe): boolean {
  const digits = (p.phone ?? "").replace(/\D+/g, "");
  const gstin = (p.gstin ?? "").replace(/[\s./-]+/g, "");
  return digits.length >= 10 || /\S+@\S+\.\S+/.test(p.email ?? "") || gstin.length === 15 || (!!p.customerName?.trim() && !!p.companyName?.trim());
}

/** Plain-language sentence for a set of reasons. */
export function describeReasons(reasons: readonly string[]): string {
  return reasons.map((r) => DUPLICATE_REASON_LABEL[r] ?? r.toLowerCase()).join(", ");
}

/** "Sam Sales" / "Sam Sales and Tara Sales" / "" — who looks after a customer. */
export function namesOf(people: readonly PersonRef[]): string {
  const names = people.map((p) => p.fullName ?? "a former user");
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What to do about a customer the person may not open: route it, never create another. */
export function routingAdvice(mappedTo: readonly PersonRef[]): string {
  const who = namesOf(mappedTo);
  // (a name may end with a full stop, as in "Tara S.")
  return who
    ? `It is looked after by ${who}${who.endsWith(".") ? "" : "."} Pass the enquiry to them, or ask an administrator to assign it - do not create another customer.`
    : "No salesperson is linked to it yet. Ask an administrator how to route the enquiry - do not create another customer.";
}

/** "Salesperson: Sam" / "No salesperson assigned" - who looks after a customer the person may see. */
export function salespersonLine(mappedTo: readonly PersonRef[] | undefined): string {
  return mappedTo?.length ? `Salesperson: ${namesOf(mappedTo)}` : "No salesperson assigned";
}

/** "Created by Asha" / "creator not recorded" - never the same as who looks after it. */
export function creatorLine(createdBy: PersonRef | null | undefined): string {
  return createdBy ? `Created by ${createdBy.fullName ?? "a former user"}` : "Creator not recorded";
}

/** What was (not) done when a duplicate stopped the save. */
export const NOTHING_SAVED = "Nothing was saved: the GST registration was not added, and no customer was created, merged or changed.";

/** The headline of the returning-enquiry check, most important first. */
export function returningHeadline(r: LeadDuplicateResult): string | null {
  if (r.summary.potentialDuplicates > 0) return "This may be an enquiry that is already in RevenueOS.";
  if (r.summary.linkedCustomers > 0 || r.customers.some((c) => c.link === "MATCH" && c.strength !== "POSSIBLE")) return "This enquiry matches an existing customer.";
  if (r.person.returning) return "This person has enquired before.";
  if (r.summary.possibleMatches > 0 || r.customers.length > 0) return "Similar records exist - check whether they are the same person.";
  return null;
}
