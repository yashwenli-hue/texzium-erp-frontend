import { ListQuery, Page } from "../../types/common";
import { Contact } from "../../types/domain";
import {
  IContactRepository,
  CreateContactInput,
  ContactSortField,
} from "../interfaces";
import { db } from "./db";
import { delay, applyListQuery } from "./queryUtils";
import { mockId } from "./entityStore";

const SEARCHABLE: (keyof Contact)[] = ["name", "companyName", "title", "email", "phone"];

export class MockContactRepository implements IContactRepository {
  async list(query?: ListQuery<ContactSortField>): Promise<Page<Contact>> {
    return delay(applyListQuery(db.contacts.getAll(), query, SEARCHABLE));
  }

  async create(input: CreateContactInput): Promise<Contact> {
    const contact: Contact = {
      id: mockId("CT"),
      name: input.name,
      title: input.title,
      companyName: input.companyName,
      companyId: input.companyId,
      type: input.type,
      email: input.email,
      phone: input.phone,
      lastContactedAt: null,
      ownerId: mockId("U"),
      ownerName: input.ownerName,
    };
    db.contacts.add(contact);
    return delay(contact);
  }

  async listByCompanyName(companyName: string): Promise<Contact[]> {
    return delay(db.contacts.getAll().filter((c) => c.companyName === companyName));
  }
}
