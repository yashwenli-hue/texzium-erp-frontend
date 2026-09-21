import { ID, ListQuery, Page } from "../../types/common";
import { Customer } from "../../types/domain";
import {
  ICustomerRepository,
  CreateCustomerInput,
  CustomerSortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Customer)[] = ["customerName", "customerCode", "industry", "city", "ownerName"];

export class MockCustomerRepository implements ICustomerRepository {
  async list(query?: ListQuery<CustomerSortField>): Promise<Page<Customer>> {
    return delay(applyListQuery(db.customers.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<Customer | null> {
    return delay(db.customers.getById(id) ?? null);
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const now = new Date().toISOString();
    // industry/city/ownerName/lifetimeValue/openOrders/status are UI-assumption
    // fields the VERIFIED CreateCustomerDto doesn't collect (see Customer in
    // lib/types/domain.ts) — defaulted here rather than user-supplied, same
    // pattern as ownerId/openOrders/status/customerSince already were before
    // this migration.
    const customer: Customer = {
      id: mockId("C"),
      customerName: input.customerName,
      customerCode: input.customerCode,
      panNumber: input.panNumber,
      email: input.email,
      phone: input.phone,
      customerType: input.customerType,
      industry: "Not specified",
      city: "Not specified",
      ownerId: mockId("U"),
      ownerName: "Unassigned",
      lifetimeValue: 0,
      openOrders: 0,
      status: "New",
      customerSince: now,
      createdAt: now,
    };
    db.customers.add(customer);
    return delay(customer);
  }
}
