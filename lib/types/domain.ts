import { ID } from "./common";

/**
 * ============================================================================
 * DOMAIN TYPES — RevenueOS
 * ============================================================================
 * These types describe the shape the UI needs. They are NOT confirmed against
 * the real backend schema yet. Every field with an open question is flagged
 * inline with `// @backend-verify:` and mirrored in docs/backend-ui-contract.md.
 * Do not treat these as a source of truth for Prisma models or API contracts —
 * they are a frontend-side working assumption only.
 * ============================================================================
 */

export type LeadStage =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export const LEAD_STAGES: LeadStage[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

export type LeadScore = "Hot" | "Warm" | "Cold";

// @backend-verify: lead sources are open-text in this mock. Confirm whether
// the backend enforces an enum/lookup table for sources.
export type LeadSource = string;

export interface Lead {
  id: ID;
  name: string; // company / lead name
  industry: string;
  city: string;
  source: LeadSource;
  stage: LeadStage;
  score: LeadScore;
  value: number; // INR, whole rupees. @backend-verify: currency + unit.
  ownerId: ID;
  ownerName: string;
  phone: string;
  email: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
}

export interface LeadTimelineEntry {
  id: ID;
  leadId: ID;
  icon: string; // maps to an icon key in the icon set
  title: string;
  detail: string;
  actorName: string;
  occurredAt: string; // ISO 8601
}

export type CustomerStatus = "Active" | "At Risk" | "New" | "Churned";

export interface Customer {
  id: ID;
  name: string;
  industry: string;
  city: string;
  ownerId: ID;
  ownerName: string;
  lifetimeValue: number; // INR
  openOrders: number;
  status: CustomerStatus;
  customerSince: string; // ISO 8601
  // @backend-verify: is contactsCount derived server-side or computed
  // client-side from the Contacts collection? Currently computed client-side.
  originLeadId?: ID;
}

export type ContactType = "Decision Maker" | "Champion" | "Influencer";

export interface Contact {
  id: ID;
  name: string;
  title: string;
  companyName: string; // denormalized for display
  companyId?: ID; // links to Customer or Lead — @backend-verify: relationship model
  type: ContactType;
  email: string;
  phone: string;
  lastContactedAt: string | null; // ISO 8601
  ownerId: ID;
  ownerName: string;
}

export type ActivityType =
  | "Call"
  | "Email"
  | "Meeting"
  | "WhatsApp"
  | "Quotation"
  | "Stage Change"
  | "Note";

export type RelatedRecordType = "Lead" | "Customer";

export interface Activity {
  id: ID;
  type: ActivityType;
  relatedType: RelatedRecordType;
  relatedId: ID;
  relatedName: string; // denormalized for display
  ownerName: string;
  occurredAt: string; // ISO 8601
  note: string;
}

export type TaskPriority = "High" | "Medium" | "Low";

export interface Task {
  id: ID;
  title: string;
  dueAt: string | null; // ISO 8601, null = no due date
  priority: TaskPriority;
  linkedType: RelatedRecordType;
  linkedId: ID;
  linkedName: string;
  assigneeName: string;
  done: boolean;
  createdAt: string;
}

export interface Note {
  id: ID;
  text: string;
  linkedType: RelatedRecordType;
  linkedId: ID;
  linkedName: string;
  authorName: string;
  createdAt: string;
  pinned: boolean;
}

export type OpportunityStage =
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export interface Opportunity {
  id: ID;
  name: string;
  customerId?: ID;
  customerName: string;
  stage: OpportunityStage;
  amount: number; // INR
  probability: number; // 0-100
  expectedCloseAt: string; // ISO 8601
  ownerName: string;
  // @backend-verify: is there a 1:1 link from Opportunity back to the
  // originating Lead? Mock keeps them independent-but-related by customer name.
  sourceLeadId?: ID;
}

export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Rejected"
  | "Expired";

export interface Quotation {
  id: ID;
  quoteNo: string;
  customerId?: ID;
  customerName: string;
  opportunityId?: ID;
  opportunityName: string;
  amount: number;
  status: QuotationStatus;
  validUntil: string | null; // ISO 8601
  ownerName: string;
  createdAt: string;
}

export type NotificationIcon =
  | "funnel"
  | "file"
  | "checksq"
  | "user"
  | "cash"
  | "alert"
  | "check"
  | "cal";

export interface AppNotification {
  id: ID;
  icon: NotificationIcon;
  text: string;
  occurredAt: string; // ISO 8601
  unread: boolean;
}
