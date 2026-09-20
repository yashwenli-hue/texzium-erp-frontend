import { RevenueOSRepository } from "../interfaces";
import { RealLeadRepository } from "./realLeadRepository";
import { RealLeadSourceRepository } from "./realLeadSourceRepository";
import { RealOpportunityRepository } from "./realOpportunityRepository";
import { RealLeadFollowupRepository } from "./realLeadFollowupRepository";
import { RealUserRepository } from "./realUserRepository";
import { MockCustomerRepository } from "../mock/mockCustomerRepository";
import { MockContactRepository } from "../mock/mockContactRepository";
import { MockActivityRepository } from "../mock/mockActivityRepository";
import { MockTaskRepository } from "../mock/mockTaskRepository";
import { MockNoteRepository } from "../mock/mockNoteRepository";
import { MockQuotationRepository } from "../mock/mockQuotationRepository";
import { MockNotificationRepository } from "../mock/mockNotificationRepository";
import { MockSearchRepository } from "../mock/mockSearchRepository";

/**
 * Stage 2A wires up Leads and Opportunities (+ their supporting LeadSources,
 * LeadFollowups and the assignable-Users lookup) against the real backend.
 * Everything else (Customers, Contacts, Activities, Tasks, Notes,
 * Quotations, Notifications, Search) is out of this milestone's scope
 * (docs/revenueos-stage2a-leads-opportunities.md §24) and stays on the mock
 * implementation — same pattern as createMockRepository(), just per-entity.
 */
export function createRealRepository(): RevenueOSRepository {
  const users = new RealUserRepository();
  return {
    kind: "real",
    leads: new RealLeadRepository(),
    leadSources: new RealLeadSourceRepository(),
    leadFollowups: new RealLeadFollowupRepository(),
    users,
    opportunities: new RealOpportunityRepository(users),
    customers: new MockCustomerRepository(),
    contacts: new MockContactRepository(),
    activities: new MockActivityRepository(),
    tasks: new MockTaskRepository(),
    notes: new MockNoteRepository(),
    quotations: new MockQuotationRepository(),
    notifications: new MockNotificationRepository(),
    search: new MockSearchRepository(),
  };
}
