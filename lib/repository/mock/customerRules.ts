import { Customer, CustomerEvent, CustomerGstRegistration, CustomerMatchReason } from "../../types/domain";
import {
  CUSTOMER_NOT_FOUND_MESSAGE,
  normalizeCustomerName,
  normalizeEmail,
  normalizePan,
  samePhone,
  sortRegistrations,
} from "../shared/customerLifecycle";
import { db } from "./db";
import { mockId } from "./entityStore";

/**
 * Shared by the mock customer, GST registration and opportunity repositories:
 * the same bookkeeping the backend does (find the customer, keep its
 * registrations in order, record who did what, find lookalikes).
 */

export function requireMockCustomer(id: string): Customer {
  const customer = db.customers.getById(id);
  if (!customer) throw new Error(CUSTOMER_NOT_FOUND_MESSAGE);
  return { ...customer, gstRegistrations: sortRegistrations(customer.gstRegistrations) };
}

/** Saves a customer, keeping its registrations in the backend's order. */
export function saveMockCustomer(id: string, patch: Partial<Customer>): Customer {
  const next = db.customers.update(id, { ...patch, updatedAt: new Date().toISOString() });
  if (!next) throw new Error(CUSTOMER_NOT_FOUND_MESSAGE);
  return { ...next, gstRegistrations: sortRegistrations(next.gstRegistrations) };
}

/** Replaces one registration of a customer (and bumps its updatedAt). */
export function saveMockRegistration(customerId: string, registration: CustomerGstRegistration): void {
  const customer = db.customers.getById(customerId);
  if (!customer) throw new Error(CUSTOMER_NOT_FOUND_MESSAGE);
  const now = new Date().toISOString();
  const next = { ...registration, updatedAt: now };
  db.customers.update(customerId, {
    gstRegistrations: customer.gstRegistrations.map((g) => (g.id === registration.id ? next : g)),
  });
}

export function recordMockCustomerEvent(event: Omit<CustomerEvent, "id" | "actorName" | "occurredAt">): void {
  db.customerEvents.add({ id: mockId("CE"), actorName: "You", occurredAt: new Date().toISOString(), ...event });
}

export interface MockMatch {
  customer: Customer;
  reasons: CustomerMatchReason[];
}

/** Customers that look like the one described, compared the way the backend does. */
export function findMockMatches(probe: { name?: string; pan?: string; phone?: string; email?: string; excludeId?: string }): MockMatch[] {
  const out: MockMatch[] = [];
  for (const c of db.customers.getAll()) {
    if (probe.excludeId && c.id === probe.excludeId) continue;
    const reasons: CustomerMatchReason[] = [];
    if (probe.pan && c.panNumber && normalizePan(c.panNumber) === normalizePan(probe.pan)) reasons.push("PAN");
    if (probe.name && normalizeCustomerName(c.customerName) === normalizeCustomerName(probe.name)) reasons.push("NAME");
    if (probe.phone && c.phone && samePhone(c.phone, probe.phone)) reasons.push("PHONE");
    if (probe.email && c.email && normalizeEmail(c.email) === normalizeEmail(probe.email)) reasons.push("EMAIL");
    if (reasons.length) out.push({ customer: c, reasons });
  }
  const rank = (m: MockMatch) => (m.reasons.includes("PAN") ? 0 : m.reasons.includes("NAME") ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || a.customer.customerCode.localeCompare(b.customer.customerCode));
}

let codeSequence = 0;
/** The next customer code, from a counter like the backend's sequence. */
export function nextMockCustomerCode(): string {
  codeSequence += 1;
  return `CUST-${String(codeSequence).padStart(6, "0")}`;
}
