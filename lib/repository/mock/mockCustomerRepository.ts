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

const SEARCHABLE: (keyof Customer)[] = ["name", "industry", "city", "ownerName"];

export class MockCustomerRepository implements ICustomerRepository {
  async list(query?: ListQuery<CustomerSortField>): Promise<Page<Customer>> {
    return delay(applyListQuery(db.customers.getAll(), query, SEARCHABLE));
  }

  async getById(id: ID): Promise<Customer | null> {
    return delay(db.customers.getById(id) ?? null);
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const customer: Customer = {
      id: mockId("C"),
      name: input.name,
      industry: input.industry,
      city: input.city,
      ownerId: mockId("U"),
      ownerName: input.ownerName,
      lifetimeValue: input.lifetimeValue ?? 0,
      openOrders: 0,
      status: "New",
      customerSince: new Date().toISOString(),
    };
    db.customers.add(customer);
    return delay(customer);
  }
}
