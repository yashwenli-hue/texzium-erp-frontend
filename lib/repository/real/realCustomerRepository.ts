import { ID, ListQuery, Page } from "../../types/common";
import { Customer, CustomerDuplicateCheck, CustomerEvent, CustomerOverview } from "../../types/domain";
import {
  CreateCustomerInput,
  CustomerDuplicateQuery,
  CustomerSortField,
  ICustomerRepository,
  UpdateCustomerInput,
} from "../interfaces";
import { ApiError, apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import {
  CUSTOMER_REASON_MAX_LENGTH,
  CustomerConflictError,
  cleanCustomerText,
  validateCustomerFields,
} from "../shared/customerLifecycle";
import {
  BackendCustomer,
  BackendCustomerEvent,
  BackendCustomerOverview,
  BackendDuplicateMatch,
  mapCustomer,
  mapCustomerEvent,
  mapCustomerOverview,
  mapDuplicateCheck,
} from "./mappers";

const SEARCHABLE: (keyof Customer)[] = ["customerName", "customerCode", "email", "phone", "panNumber"];

/**
 * A 409 is a refusal the person should read (a duplicate, an inactive customer,
 * a state that moved on): raised as CustomerConflictError with the backend's
 * message, its code and the record that blocks it. A 403 gets a message that
 * says what was refused. Anything else passes through.
 */
export function toCustomerError(err: unknown, forbidden: string): unknown {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      const d = (err.details ?? {}) as { code?: string; existing?: CustomerConflictError["existing"] };
      return new CustomerConflictError(err.message, d.code, d.existing);
    }
    if (err.status === 403) return new ApiError(forbidden, 403, err.details);
  }
  return err;
}

/**
 * VERIFIED routes (backend bb9f81f + 7c10ab0): GET /customers (every customer,
 * registrations nested, default first), GET /customers/:id, POST /customers
 * (the server assigns the code), PATCH /customers/:id, PATCH /:id/deactivate
 * and /reactivate, GET /duplicate-check, GET /:id/events and GET /:id/overview.
 * Every route needs a signed-in user and one customers.* permission.
 *
 * There is no server-side search or paging, so list() filters in the browser.
 */
export class RealCustomerRepository implements ICustomerRepository {
  private async fetchAll(): Promise<Customer[]> {
    const rows = await apiFetch<BackendCustomer[]>("/customers");
    return rows.map(mapCustomer);
  }

  async list(query?: ListQuery<CustomerSortField>): Promise<Page<Customer>> {
    const all = await this.fetchAll();
    return applyListQuery(all, query, SEARCHABLE);
  }

  async getById(id: ID): Promise<Customer | null> {
    try {
      const raw = await apiFetch<BackendCustomer>(`/customers/${encodeURIComponent(id)}`);
      return mapCustomer(raw);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const errors = validateCustomerFields(input);
    const first = Object.values(errors)[0];
    if (first) throw new Error(first);

    const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);
    try {
      const raw = await apiFetch<BackendCustomer>("/customers", {
        method: "POST",
        body: {
          customerName: input.customerName.trim(),
          customerType: clean(input.customerType),
          panNumber: clean(input.panNumber)?.toUpperCase(),
          email: clean(input.email),
          phone: clean(input.phone),
          ...(input.gstRegistration ? { gstRegistration: input.gstRegistration } : {}),
        },
      });
      return mapCustomer(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to create customers.");
    }
  }

  async update(id: ID, input: UpdateCustomerInput): Promise<Customer> {
    const errors = validateCustomerFields({ customerName: input.customerName ?? "x", customerType: input.customerType ?? "", panNumber: input.panNumber ?? "", email: input.email ?? "", phone: input.phone ?? "" });
    const first = Object.values(errors)[0];
    if (first) throw new Error(first);

    // Only what the caller named goes over the wire; null clears an optional field.
    const body: Record<string, string | null> = {};
    if (input.customerName !== undefined) body.customerName = input.customerName.trim();
    for (const key of ["customerType", "panNumber", "email", "phone"] as const) {
      const v = input[key];
      if (v === undefined) continue;
      body[key] = v === null || v.trim() === "" ? null : key === "panNumber" ? v.trim().toUpperCase() : v.trim();
    }

    try {
      const raw = await apiFetch<BackendCustomer>(`/customers/${encodeURIComponent(id)}`, { method: "PATCH", body });
      return mapCustomer(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to edit customers.");
    }
  }

  async deactivate(id: ID, reason: string): Promise<Customer> {
    // Refused before any request: the backend requires a reason.
    const clean = cleanCustomerText(reason, CUSTOMER_REASON_MAX_LENGTH, true, "A reason");
    try {
      const raw = await apiFetch<BackendCustomer>(`/customers/${encodeURIComponent(id)}/deactivate`, { method: "PATCH", body: { reason: clean } });
      return mapCustomer(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to deactivate customers.");
    }
  }

  async reactivate(id: ID, remarks?: string): Promise<Customer> {
    const note = cleanCustomerText(remarks, CUSTOMER_REASON_MAX_LENGTH, false, "Remarks");
    try {
      const raw = await apiFetch<BackendCustomer>(`/customers/${encodeURIComponent(id)}/reactivate`, { method: "PATCH", body: note ? { remarks: note } : {} });
      return mapCustomer(raw);
    } catch (err) {
      throw toCustomerError(err, "You don't have permission to reactivate customers.");
    }
  }

  async listEvents(id: ID): Promise<CustomerEvent[]> {
    const rows = await apiFetch<BackendCustomerEvent[]>(`/customers/${encodeURIComponent(id)}/events`);
    return rows.map(mapCustomerEvent);
  }

  async getOverview(id: ID): Promise<CustomerOverview> {
    const raw = await apiFetch<BackendCustomerOverview>(`/customers/${encodeURIComponent(id)}/overview`);
    return mapCustomerOverview(raw);
  }

  async duplicateCheck(query: CustomerDuplicateQuery): Promise<CustomerDuplicateCheck> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    if ([...params.keys()].every((k) => k === "excludeCustomerId")) return { blocking: [], warnings: [] };
    const raw = await apiFetch<{ blocking: BackendDuplicateMatch[]; warnings: BackendDuplicateMatch[] }>(`/customers/duplicate-check?${params.toString()}`);
    return mapDuplicateCheck(raw);
  }
}
