import { ListQuery, Page, ID } from "../types/common";
import {
  Lead,
  LeadStatus,
  LeadSourceRecord,
  LeadTimelineEntry,
  LeadUIContext,
  Customer,
  Contact,
  Activity,
  ActivityType,
  Task,
  Note,
  Opportunity,
  OpportunityStage,
  Quotation,
  AppNotification,
} from "../types/domain";

/**
 * ============================================================================
 * REPOSITORY INTERFACES
 * ============================================================================
 * UI components and hooks depend ONLY on these interfaces — never on the
 * mock implementation directly. When the real RevenueOS API is ready,
 * implement these same interfaces in lib/repository/real/*.ts (fetch calls
 * against the existing backend) and swap them in RepositoryProvider.
 * No component or hook should need to change.
 * ============================================================================
 */

export type LeadSortField = "customerName" | "lastActivityAt" | "createdAt";
export type CustomerSortField = "name" | "lifetimeValue" | "customerSince";
export type ContactSortField = "name" | "lastContactedAt";
export type OpportunitySortField = "expectedValue" | "probability" | "expectedCloseDate";
export type QuotationSortField = "amount" | "validUntil" | "createdAt";
export type TaskSortField = "dueAt" | "priority" | "createdAt";

// Mirrors the VERIFIED CreateLeadDto field-for-field. No deal value, owner,
// industry or city here — those either don't exist on Lead (backend) or are
// set later through a dedicated action (Assign), not at creation.
export interface CreateLeadInput {
  customerName: string;
  companyName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  sourceId: ID;
  /** MOCK/UI-ONLY extras — kept structurally separate from the DTO fields above. See LeadUIContext. */
  uiContext?: LeadUIContext;
}

// Mirrors the VERIFIED UpdateLeadDto (customerName?, companyName?, email?,
// phone?, alternatePhone?, sourceId?), plus the same separated uiContext
// block used at creation.
export interface UpdateLeadInput {
  customerName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  sourceId?: string;
  uiContext?: LeadUIContext;
}

export interface ILeadRepository {
  list(query?: ListQuery<LeadSortField>): Promise<Page<Lead>>;
  getById(id: ID): Promise<Lead | null>;
  create(input: CreateLeadInput): Promise<Lead>;
  update(id: ID, input: UpdateLeadInput): Promise<Lead>;
  /** Lightweight status movement (New/Contacted) — mirrors the lead-status module. */
  updateStatus(id: ID, status: LeadStatus): Promise<Lead>;
  /** VERIFIED: AssignLeadDto { leadId, assignedToId } — writes PRE_SALES_ASSIGNED. */
  assign(id: ID, assignedToId: ID, assignedToName: string): Promise<Lead>;
  /** VERIFIED: PATCH /:id/qualify — writes LEAD_QUALIFIED. Gated by leads.qualify. */
  qualify(id: ID): Promise<Lead>;
  /** VERIFIED: PATCH /:id/reject — writes LEAD_REJECTED. Gated by leads.reject. */
  reject(id: ID, reason?: string): Promise<Lead>;
  getTimeline(leadId: ID): Promise<LeadTimelineEntry[]>;
  appendTimelineEntry(
    leadId: ID,
    entry: Omit<LeadTimelineEntry, "id" | "leadId">
  ): Promise<LeadTimelineEntry>;
}

export interface ILeadSourceRepository {
  list(): Promise<LeadSourceRecord[]>;
}

export interface CreateCustomerInput {
  name: string;
  industry: string;
  city: string;
  ownerName: string;
  lifetimeValue?: number;
}

export interface ICustomerRepository {
  list(query?: ListQuery<CustomerSortField>): Promise<Page<Customer>>;
  getById(id: ID): Promise<Customer | null>;
  create(input: CreateCustomerInput): Promise<Customer>;
}

export interface CreateContactInput {
  name: string;
  title: string;
  companyName: string;
  companyId?: ID;
  type: Contact["type"];
  email: string;
  phone: string;
  ownerName: string;
}

export interface IContactRepository {
  list(query?: ListQuery<ContactSortField>): Promise<Page<Contact>>;
  create(input: CreateContactInput): Promise<Contact>;
  listByCompanyName(companyName: string): Promise<Contact[]>;
}

export interface CreateActivityInput {
  type: ActivityType;
  relatedType: Activity["relatedType"];
  relatedId: ID;
  relatedName: string;
  ownerName: string;
  note: string;
}

export interface IActivityRepository {
  list(query?: ListQuery): Promise<Page<Activity>>;
  create(input: CreateActivityInput): Promise<Activity>;
  listByRelated(relatedId: ID): Promise<Activity[]>;
}

export interface CreateTaskInput {
  title: string;
  dueAt: string | null;
  priority: Task["priority"];
  linkedType: Task["linkedType"];
  linkedId: ID;
  linkedName: string;
  assigneeName: string;
}

export interface ITaskRepository {
  list(query?: ListQuery<TaskSortField>): Promise<Page<Task>>;
  create(input: CreateTaskInput): Promise<Task>;
  setDone(id: ID, done: boolean): Promise<Task>;
}

export interface CreateNoteInput {
  text: string;
  linkedType: Note["linkedType"];
  linkedId: ID;
  linkedName: string;
  authorName: string;
  pinned?: boolean;
}

export interface UpdateNoteInput {
  text?: string;
  pinned?: boolean;
}

export interface INoteRepository {
  list(query?: ListQuery): Promise<Page<Note>>;
  create(input: CreateNoteInput): Promise<Note>;
  update(id: ID, input: UpdateNoteInput): Promise<Note>;
  listByRelated(linkedId: ID): Promise<Note[]>;
}

// Mirrors the VERIFIED CreateOpportunityDto. No customerName/stage input —
// customer is derived from the linked lead, and new opportunities always
// start at "Qualified" (a lead must already be qualified to spawn one).
export interface CreateOpportunityInput {
  leadId: ID;
  title: string;
  expectedValue: number;
  probability: number;
  expectedCloseDate: string;
}

export interface IOpportunityRepository {
  list(query?: ListQuery<OpportunitySortField>): Promise<Page<Opportunity>>;
  getById(id: ID): Promise<Opportunity | null>;
  create(input: CreateOpportunityInput): Promise<Opportunity>;
  /**
   * UI-ONLY for now: no backend PATCH route for opportunity stage is
   * confirmed yet (docs/backend-ui-contract.md §2 lists only POST/GET for
   * Opportunities). Kept mock-only so the Stage detail page and stepper are
   * ready to wire up the instant a real endpoint is confirmed.
   */
  updateStage(id: ID, stage: OpportunityStage): Promise<Opportunity>;
}

// Simplified mock creation input: an opportunity + a presentation amount.
// The real CreateQuotationDto additionally requires quoteDate,
// inventoryItemId, quantity, unitPrice, sellerGstId, buyerGstId (backend
// computes tax/total from those) — none of which have a UI/master-data
// source yet in this frontend, so quotation creation stays a simplified
// mock stand-in until Quote-to-Cash masters (inventory, GST) are built.
// See docs/backend-ui-contract.md §8. customerName/opportunityName/ownerName
// are always derived from the linked opportunity, mirroring how Opportunity
// derives its own fields from the linked Lead.
export interface CreateQuotationInput {
  opportunityId: ID;
  amount: number;
  validUntil: string | null;
}

export interface IQuotationRepository {
  list(query?: ListQuery<QuotationSortField>): Promise<Page<Quotation>>;
  getById(id: ID): Promise<Quotation | null>;
  create(input: CreateQuotationInput): Promise<Quotation>;
  /** VERIFIED operation (`PATCH /:id/revise` sets REVISED). Version/history trail is mock-only. */
  revise(id: ID, amount: number, note?: string): Promise<Quotation>;
  /** VERIFIED operation (`PATCH /:id/approve` sets APPROVED). */
  approve(id: ID): Promise<Quotation>;
}

export interface INotificationRepository {
  list(): Promise<AppNotification[]>;
  markRead(id: ID): Promise<void>;
  markAllRead(): Promise<void>;
  unreadCount(): Promise<number>;
}

export interface SearchResults {
  leads: Lead[];
  customers: Customer[];
  contacts: Contact[];
  quotations: Quotation[];
  notes: Note[];
}

export interface ISearchRepository {
  search(term: string): Promise<SearchResults>;
}

/** The full set of repositories the app needs. Provided via RepositoryProvider. */
export interface RevenueOSRepository {
  leads: ILeadRepository;
  leadSources: ILeadSourceRepository;
  customers: ICustomerRepository;
  contacts: IContactRepository;
  activities: IActivityRepository;
  tasks: ITaskRepository;
  notes: INoteRepository;
  opportunities: IOpportunityRepository;
  quotations: IQuotationRepository;
  notifications: INotificationRepository;
  search: ISearchRepository;
}
