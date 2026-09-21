import { ID, ListQuery, Page } from "../../types/common";
import { Customer } from "../../types/domain";
import { CreateCustomerInput, CustomerSortField, ICustomerRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { applyListQuery } from "../shared/listQuery";
import { BackendCustomer, mapCustomer } from "./mappers";

const SEARCHABLE: (keyof Customer)[] = ["customerName", "customerCode", "email", "phone"];

/**
 * VERIFIED: `GET /customers` (with nested `gstRegistrations`) and
 * `POST /customers` only — no `GET /:id`, no search/filter/sort/pagination
 * query params, no PATCH/PUT/DELETE, no activate/deactivate. getById()
 * list-scans, same pattern as every other "no detail endpoint" resource in
 * this app.
 *
 * IMPORTANT: `POST /customers` is VERIFIED but currently broken for every
 * payload — `CreateCustomerDto` has no class-validator decorators, and the
 * global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
 * rejects every field as "should not exist" regardless of what's sent
 * (confirmed empirically with both an empty and a partial body — identical
 * 400 either way). create() is still implemented honestly against the real
 * endpoint (so it starts working the moment the backend fixes this, with no
 * frontend change needed) — the UI deliberately does not call it in
 * connected mode; see app/customers/page.tsx. See the Stage 2H report.
 *
 * SECURITY NOTE (not fixed — backend is read-only): no `@UseGuards` on this
 * controller. Confirmed by reading customer-master.controller.ts directly.
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
    const all = await this.fetchAll();
    return all.find((c) => c.id === id) ?? null;
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const raw = await apiFetch<BackendCustomer>("/customers", {
      method: "POST",
      body: {
        customerCode: input.customerCode,
        customerName: input.customerName,
        panNumber: input.panNumber,
        email: input.email,
        phone: input.phone,
        customerType: input.customerType,
      },
    });
    return mapCustomer(raw);
  }
}
