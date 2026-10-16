/**
 * VERIFIED (backend 41f5c2d): GET /leads/duplicate-check and GET /leads/:id/duplicates.
 * EXACT = the same phone number (last 10 digits, phone or alternate) or the same email;
 * POSSIBLE = the same name and company, or the same company in the same city. A match the
 * caller may not see comes back as { hidden, strength, reasons } only. Leads have no
 * product field, so the same product cannot be compared ("unavailable").
 */
export type DuplicateStrength = "EXACT" | "POSSIBLE";
export type LeadDuplicateReason = "PHONE" | "EMAIL" | "NAME_AND_COMPANY" | "COMPANY_AND_CITY";

export interface VisibleLeadDuplicate {
  hidden?: false;
  id: string;
  customerName: string;
  companyName: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  sourceName: string | null;
  relation: "EARLIER" | "LATER" | null;
  strength: DuplicateStrength;
  reasons: LeadDuplicateReason[];
}

export interface HiddenMatch<R extends string> {
  hidden: true;
  strength?: DuplicateStrength;
  reasons: R[];
}

export type LeadDuplicate = VisibleLeadDuplicate | HiddenMatch<LeadDuplicateReason>;

export interface VisibleCustomerMatch {
  hidden?: false;
  id: string;
  customerCode: string;
  customerName: string;
  isActive: boolean;
  reasons: Array<"COMPANY_NAME" | "PHONE" | "EMAIL">;
}

export type CustomerMatchForLead = VisibleCustomerMatch | HiddenMatch<"COMPANY_NAME" | "PHONE" | "EMAIL">;

export interface LeadDuplicateResult {
  leads: LeadDuplicate[];
  customers: CustomerMatchForLead[];
  exact: number;
  possible: number;
  productComparison: "unavailable";
}

export interface LeadDuplicateProbe {
  phone?: string;
  alternatePhone?: string;
  email?: string;
  customerName?: string;
  companyName?: string;
  city?: string;
}

export const NO_DUPLICATES: LeadDuplicateResult = { leads: [], customers: [], exact: 0, possible: 0, productComparison: "unavailable" };

export const DUPLICATE_REASON_LABEL: Record<string, string> = {
  PHONE: "same phone number",
  EMAIL: "same email",
  NAME_AND_COMPANY: "same name and company",
  COMPANY_AND_CITY: "same company and city",
  COMPANY_NAME: "same company name",
};

export function isHidden<T extends { hidden?: boolean }>(m: T): m is T & { hidden: true } {
  return m.hidden === true;
}

/** Worth asking the server: a full phone number, an email, or a name with its company. */
export function probeIsWorthChecking(p: LeadDuplicateProbe): boolean {
  const digits = (p.phone ?? "").replace(/\D+/g, "");
  return digits.length >= 10 || /\S+@\S+\.\S+/.test(p.email ?? "") || (!!p.customerName?.trim() && !!p.companyName?.trim());
}

/** Plain-language sentence for a set of reasons. */
export function describeReasons(reasons: readonly string[]): string {
  return reasons.map((r) => DUPLICATE_REASON_LABEL[r] ?? r.toLowerCase()).join(", ");
}
