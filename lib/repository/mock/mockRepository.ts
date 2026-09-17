import { RevenueOSRepository } from "../interfaces";
import { MockLeadRepository } from "./mockLeadRepository";
import { MockLeadSourceRepository } from "./mockLeadSourceRepository";
import { MockCustomerRepository } from "./mockCustomerRepository";
import { MockContactRepository } from "./mockContactRepository";
import { MockActivityRepository } from "./mockActivityRepository";
import { MockTaskRepository } from "./mockTaskRepository";
import { MockNoteRepository } from "./mockNoteRepository";
import { MockOpportunityRepository } from "./mockOpportunityRepository";
import { MockQuotationRepository } from "./mockQuotationRepository";
import { MockNotificationRepository } from "./mockNotificationRepository";
import { MockSearchRepository } from "./mockSearchRepository";

/**
 * The temporary, fully in-memory implementation of RevenueOSRepository.
 * This is what RepositoryProvider wires up today. When the real backend
 * integration begins, create lib/repository/real/realRepository.ts
 * implementing the same RevenueOSRepository interface (backed by fetch
 * calls to the existing API) and swap ONE line in RepositoryProvider.tsx.
 */
export function createMockRepository(): RevenueOSRepository {
  return {
    leads: new MockLeadRepository(),
    leadSources: new MockLeadSourceRepository(),
    customers: new MockCustomerRepository(),
    contacts: new MockContactRepository(),
    activities: new MockActivityRepository(),
    tasks: new MockTaskRepository(),
    notes: new MockNoteRepository(),
    opportunities: new MockOpportunityRepository(),
    quotations: new MockQuotationRepository(),
    notifications: new MockNotificationRepository(),
    search: new MockSearchRepository(),
  };
}
