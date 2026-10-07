import { ID } from "../../types/common";
import { CustomerGstRegistration } from "../../types/domain";
import { CreateGstRegistrationInput, IGstRegistrationRepository, UpdateGstRegistrationInput } from "../interfaces";
import { ApiError } from "../../api/httpClient";
import { db } from "./db";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";
import { recordMockCustomerEvent, requireMockCustomer, saveMockRegistration } from "./customerRules";
import {
  CUSTOMER_INACTIVE_GST_MESSAGE,
  CustomerConflictError,
  GST_ALREADY_ACTIVE_MESSAGE,
  GST_ALREADY_INACTIVE_MESSAGE,
  GST_INACTIVE_DEFAULT_MESSAGE,
  GST_INACTIVE_EDIT_MESSAGE,
  GST_IS_DEFAULT_MESSAGE,
  GST_NOT_FOUND_MESSAGE,
  GST_REASON_MAX_LENGTH,
  cleanCustomerText,
  duplicateGstinMessage,
  gstinMatchesPan,
  gstinState,
  normalizeGstin,
  validateGstFields,
} from "../shared/customerLifecycle";

const EDITABLE = ["legalName", "tradeName", "branchName", "addressLine1", "addressLine2", "city", "pincode"] as const;

function find(id: ID): { customerId: ID; registration: CustomerGstRegistration } {
  for (const c of db.customers.getAll()) {
    const registration = c.gstRegistrations.find((g) => g.id === id);
    if (registration) return { customerId: c.id, registration };
  }
  throw new Error(GST_NOT_FOUND_MESSAGE);
}

/** Every change to a customer's registrations needs the customer to be active, like the backend. */
function activeOwner(customerId: ID) {
  const customer = requireMockCustomer(customerId);
  if (!customer.isActive) throw new CustomerConflictError(CUSTOMER_INACTIVE_GST_MESSAGE, "CUSTOMER_INACTIVE");
  return customer;
}

/**
 * The in-memory GST registrations of a customer, following the backend
 * (customer-gst.service.ts): the state comes from the GSTIN, the GSTIN carries
 * the customer's PAN, a GSTIN belongs to one customer, the first registration is
 * the default, the default cannot be deactivated while another is active, and
 * every change is recorded in the customer's history.
 */
export class MockCustomerGstRepository implements IGstRegistrationRepository {
  async create(input: CreateGstRegistrationInput): Promise<CustomerGstRegistration> {
    const customer = activeOwner(input.customerId);
    const first = Object.values(validateGstFields(input))[0];
    if (first) throw new Error(first);

    const gstin = normalizeGstin(input.gstin);
    const state = gstinState(gstin)!;
    // The backend answers with a 400 and this wording when the PAN inside the GSTIN is not the customer's.
    if (!gstinMatchesPan(gstin, customer.panNumber)) {
      throw new ApiError(`The GSTIN ${gstin} carries a different PAN from this customer's (${customer.panNumber}).`, 400);
    }

    for (const c of db.customers.getAll()) {
      const taken = c.gstRegistrations.find((g) => g.gstin === gstin);
      if (taken) {
        throw new CustomerConflictError(duplicateGstinMessage(gstin, c.customerName, c.customerCode), "DUPLICATE_GSTIN", {
          id: taken.id,
          gstin,
          customerCode: c.customerCode,
          customerName: c.customerName,
        });
      }
    }

    const currentDefault = customer.gstRegistrations.find((g) => g.isActive && g.isDefault);
    const makeDefault = !currentDefault || input.isDefault === true;
    const now = new Date().toISOString();
    const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

    const registration: CustomerGstRegistration = {
      id: mockId("G"),
      customerId: customer.id,
      gstin,
      legalName: input.legalName.trim(),
      tradeName: clean(input.tradeName),
      branchName: clean(input.branchName),
      stateCode: state.stateCode,
      stateName: state.stateName,
      addressLine1: input.addressLine1.trim(),
      addressLine2: clean(input.addressLine2),
      city: input.city.trim(),
      pincode: input.pincode.trim(),
      isDefault: makeDefault,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const others = customer.gstRegistrations.map((g) => (makeDefault && g.id === currentDefault?.id ? { ...g, isDefault: false, updatedAt: now } : g));
    db.customers.update(customer.id, { gstRegistrations: [...others, registration], updatedAt: now });
    recordMockCustomerEvent({ customerId: customer.id, action: "GST_ADDED", toStatus: "ACTIVE", gstRegistration: { id: registration.id, gstin, branchName: registration.branchName, legalName: registration.legalName } });
    if (makeDefault && currentDefault) {
      recordMockCustomerEvent({
        customerId: customer.id,
        action: "GST_DEFAULT_CHANGED",
        changes: { defaultGstin: { from: currentDefault.gstin, to: gstin } },
        gstRegistration: { id: registration.id, gstin, branchName: registration.branchName, legalName: registration.legalName },
      });
    }
    return delay(registration);
  }

  async update(id: ID, input: UpdateGstRegistrationInput): Promise<CustomerGstRegistration> {
    const { customerId, registration } = find(id);
    activeOwner(customerId);
    if (!registration.isActive) throw new CustomerConflictError(GST_INACTIVE_EDIT_MESSAGE, "GST_INACTIVE");
    const first = Object.values(
      validateGstFields({ legalName: input.legalName ?? "x", addressLine1: input.addressLine1 ?? "x", city: input.city ?? "x", pincode: input.pincode ?? "400001", tradeName: input.tradeName ?? "", branchName: input.branchName ?? "", addressLine2: input.addressLine2 ?? "" }, { forEdit: true })
    )[0];
    if (first) throw new Error(first);

    const changes: Record<string, { from: string | null; to: string | null }> = {};
    const patch: Record<string, string | undefined> = {};
    for (const key of EDITABLE) {
      const raw = input[key];
      if (raw === undefined) continue;
      const next = raw === null || raw.trim() === "" ? null : raw.trim();
      const before = (registration[key] as string | undefined) ?? null;
      if (next !== before) {
        changes[key] = { from: before, to: next };
        patch[key] = next ?? undefined;
      }
    }
    if (Object.keys(changes).length === 0) return delay(registration);

    const saved = { ...registration, ...patch } as CustomerGstRegistration;
    saveMockRegistration(customerId, saved);
    recordMockCustomerEvent({ customerId, action: "GST_UPDATED", fromStatus: "ACTIVE", toStatus: "ACTIVE", changes, gstRegistration: { id, gstin: registration.gstin, branchName: saved.branchName, legalName: saved.legalName } });
    return delay(find(id).registration);
  }

  async deactivate(id: ID, reason: string): Promise<CustomerGstRegistration> {
    const text = cleanCustomerText(reason, GST_REASON_MAX_LENGTH, true, "A reason");
    const { customerId, registration } = find(id);
    const customer = activeOwner(customerId);
    if (!registration.isActive) throw new CustomerConflictError(GST_ALREADY_INACTIVE_MESSAGE, "GST_ALREADY_INACTIVE");
    if (registration.isDefault && customer.gstRegistrations.some((g) => g.isActive && g.id !== id)) {
      throw new CustomerConflictError(GST_IS_DEFAULT_MESSAGE, "GST_IS_DEFAULT");
    }
    saveMockRegistration(customerId, { ...registration, isActive: false, isDefault: false });
    recordMockCustomerEvent({ customerId, action: "GST_DEACTIVATED", fromStatus: "ACTIVE", toStatus: "INACTIVE", remarks: text, gstRegistration: { id, gstin: registration.gstin, branchName: registration.branchName, legalName: registration.legalName } });
    return delay(find(id).registration);
  }

  async reactivate(id: ID, remarks?: string): Promise<CustomerGstRegistration> {
    const note = cleanCustomerText(remarks, GST_REASON_MAX_LENGTH, false, "Remarks");
    const { customerId, registration } = find(id);
    const customer = activeOwner(customerId);
    if (registration.isActive) throw new CustomerConflictError(GST_ALREADY_ACTIVE_MESSAGE, "GST_ALREADY_ACTIVE");
    if (!gstinMatchesPan(registration.gstin, customer.panNumber)) {
      throw new ApiError(`The GSTIN ${registration.gstin} carries a different PAN from this customer's (${customer.panNumber}).`, 400);
    }
    const becomesDefault = !customer.gstRegistrations.some((g) => g.isActive && g.isDefault);
    saveMockRegistration(customerId, { ...registration, isActive: true, isDefault: becomesDefault });
    const ref = { id, gstin: registration.gstin, branchName: registration.branchName, legalName: registration.legalName };
    recordMockCustomerEvent({ customerId, action: "GST_REACTIVATED", fromStatus: "INACTIVE", toStatus: "ACTIVE", remarks: note, gstRegistration: ref });
    if (becomesDefault) {
      recordMockCustomerEvent({ customerId, action: "GST_DEFAULT_CHANGED", changes: { defaultGstin: { from: null, to: registration.gstin } }, gstRegistration: ref });
    }
    return delay(find(id).registration);
  }

  async setDefault(id: ID): Promise<CustomerGstRegistration> {
    const { customerId, registration } = find(id);
    const customer = activeOwner(customerId);
    if (!registration.isActive) throw new CustomerConflictError(GST_INACTIVE_DEFAULT_MESSAGE, "GST_INACTIVE");
    if (registration.isDefault) return delay(registration);

    const previous = customer.gstRegistrations.find((g) => g.isActive && g.isDefault);
    const now = new Date().toISOString();
    db.customers.update(customerId, {
      gstRegistrations: customer.gstRegistrations.map((g) => (g.id === id ? { ...g, isDefault: true, updatedAt: now } : g.id === previous?.id ? { ...g, isDefault: false, updatedAt: now } : g)),
      updatedAt: now,
    });
    recordMockCustomerEvent({
      customerId,
      action: "GST_DEFAULT_CHANGED",
      changes: { defaultGstin: { from: previous?.gstin ?? null, to: registration.gstin } },
      gstRegistration: { id, gstin: registration.gstin, branchName: registration.branchName, legalName: registration.legalName },
    });
    return delay(find(id).registration);
  }
}
