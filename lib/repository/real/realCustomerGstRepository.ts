import { ID } from "../../types/common";
import { CustomerGstRegistration } from "../../types/domain";
import { CreateGstRegistrationInput, IGstRegistrationRepository, UpdateGstRegistrationInput } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { GST_REASON_MAX_LENGTH, cleanCustomerText, normalizeGstin, validateGstFields } from "../shared/customerLifecycle";
import { BackendCustomerGstRegistration, mapCustomerGstRegistration } from "./mappers";
import { toCustomerError } from "./realCustomerRepository";

const clean = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

/**
 * VERIFIED routes (backend 70a8609): POST /customer-gst (body carries
 * customerId), PATCH /customer-gst/:id, PATCH /:id/deactivate (reason),
 * /reactivate and /default, all needing customers.gst.manage. The server reads
 * the state from the GSTIN, so no state is sent; the GSTIN and the state can
 * never be edited. A registration is never deleted.
 */
export class RealCustomerGstRepository implements IGstRegistrationRepository {
  async create(input: CreateGstRegistrationInput): Promise<CustomerGstRegistration> {
    const first = Object.values(validateGstFields(input))[0];
    if (first) throw new Error(first);

    try {
      const raw = await apiFetch<BackendCustomerGstRegistration>("/customer-gst", {
        method: "POST",
        body: {
          customerId: input.customerId,
          gstin: normalizeGstin(input.gstin),
          legalName: input.legalName.trim(),
          tradeName: clean(input.tradeName),
          branchName: clean(input.branchName),
          addressLine1: input.addressLine1.trim(),
          addressLine2: clean(input.addressLine2),
          city: input.city.trim(),
          pincode: input.pincode.trim(),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
      });
      return mapCustomerGstRegistration(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to manage GST registrations.");
    }
  }

  async update(id: ID, input: UpdateGstRegistrationInput): Promise<CustomerGstRegistration> {
    const first = Object.values(validateGstFields({ legalName: input.legalName ?? "x", addressLine1: input.addressLine1 ?? "x", city: input.city ?? "x", pincode: input.pincode ?? "400001", tradeName: input.tradeName ?? "", branchName: input.branchName ?? "", addressLine2: input.addressLine2 ?? "" }, { forEdit: true }))[0];
    if (first) throw new Error(first);

    // Only what the caller named goes over the wire; null clears an optional field.
    const body: Record<string, string | null> = {};
    for (const key of ["legalName", "addressLine1", "city", "pincode"] as const) {
      if (input[key] !== undefined) body[key] = input[key]!.trim();
    }
    for (const key of ["tradeName", "branchName", "addressLine2"] as const) {
      const v = input[key];
      if (v === undefined) continue;
      body[key] = v === null || v.trim() === "" ? null : v.trim();
    }

    try {
      const raw = await apiFetch<BackendCustomerGstRegistration>(`/customer-gst/${encodeURIComponent(id)}`, { method: "PATCH", body });
      return mapCustomerGstRegistration(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to manage GST registrations.");
    }
  }

  async deactivate(id: ID, reason: string): Promise<CustomerGstRegistration> {
    const text = cleanCustomerText(reason, GST_REASON_MAX_LENGTH, true, "A reason");
    try {
      const raw = await apiFetch<BackendCustomerGstRegistration>(`/customer-gst/${encodeURIComponent(id)}/deactivate`, { method: "PATCH", body: { reason: text } });
      return mapCustomerGstRegistration(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to manage GST registrations.");
    }
  }

  async reactivate(id: ID, remarks?: string): Promise<CustomerGstRegistration> {
    const note = cleanCustomerText(remarks, GST_REASON_MAX_LENGTH, false, "Remarks");
    try {
      const raw = await apiFetch<BackendCustomerGstRegistration>(`/customer-gst/${encodeURIComponent(id)}/reactivate`, { method: "PATCH", body: note ? { remarks: note } : {} });
      return mapCustomerGstRegistration(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to manage GST registrations.");
    }
  }

  async setDefault(id: ID): Promise<CustomerGstRegistration> {
    try {
      const raw = await apiFetch<BackendCustomerGstRegistration>(`/customer-gst/${encodeURIComponent(id)}/default`, { method: "PATCH" });
      return mapCustomerGstRegistration(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to manage GST registrations.");
    }
  }
}
