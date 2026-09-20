import {
  Lead,
  LeadFollowup,
  LeadFollowupStatus,
  LeadNoteEntry,
  LeadSourceRecord,
  LeadStatus,
  LeadTimelineEntry,
  AssignableUser,
  titleCaseFromConstant,
} from "../../types/domain";

/**
 * Raw shapes as the backend actually returns them (Stage 2A discovery
 * report / docs/backend-ui-contract.md). Deliberately loose (fields
 * optional/unknown where the backend's own typing is loose) — these map
 * verified backend field names into the frontend's own domain types, never
 * the other way around.
 */
export interface BackendUser {
  id: string;
  fullName?: string;
  email?: string;
  [key: string]: unknown; // e.g. passwordHash — never read past id/fullName below.
}

export interface BackendLeadSource {
  id: string;
  name: string;
  description?: string | null;
}

export interface BackendLeadNote {
  id: string;
  leadId: string;
  note: string;
  createdAt: string;
}

export interface BackendLeadTimeline {
  id: string;
  leadId: string;
  action: string;
  remarks?: string | null;
  createdAt: string;
}

export interface BackendLeadFollowup {
  id: string;
  leadId: string;
  followupDate: string;
  remarks?: string | null;
  status: LeadFollowupStatus;
  completedAt?: string | null;
  completedById?: string | null;
  completedBy?: BackendUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendLead {
  id: string;
  customerName: string;
  companyName?: string | null;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  sourceId: string;
  source?: BackendLeadSource | null;
  status: string;
  assignedToId?: string | null;
  assignedTo?: BackendUser | null;
  createdAt: string;
  updatedAt: string;
  notes?: BackendLeadNote[];
  timelines?: BackendLeadTimeline[];
  followups?: BackendLeadFollowup[];
}

export interface BackendOpportunity {
  id: string;
  opportunityCode?: string | null;
  leadId: string;
  title: string;
  expectedValue: number;
  probability: number;
  expectedCloseDate: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  lead?: { id: string; customerName: string; assignedToId?: string | null } | null;
}

export function mapLeadSource(raw: BackendLeadSource): LeadSourceRecord {
  return { id: raw.id, name: raw.name, description: raw.description ?? undefined };
}

export function mapAssignableUser(raw: BackendUser): AssignableUser {
  return { id: raw.id, name: raw.fullName || raw.email || raw.id };
}

export function mapLeadNote(raw: BackendLeadNote): LeadNoteEntry {
  return { id: raw.id, leadId: raw.leadId, note: raw.note, createdAt: raw.createdAt };
}

const TIMELINE_ICON_BY_ACTION: Record<string, string> = {
  LEAD_CREATED: "funnel",
  LEAD_UPDATED: "pulse",
  PRE_SALES_ASSIGNED: "user",
  LEAD_QUALIFIED: "check",
  LEAD_REJECTED: "close",
  STATUS_UPDATED: "pulse",
  FOLLOWUP_CREATED: "cal",
  FOLLOWUP_COMPLETED: "checksq",
  FOLLOWUP_RESCHEDULED: "clock",
  FOLLOWUP_CANCELLED: "close",
  OPPORTUNITY_CREATED: "brief",
};

/**
 * Maps the real LeadTimeline { action, remarks?, createdAt } into the shape
 * the existing Lead Detail timeline UI already renders. actorName is left
 * empty — the backend timeline entry has no actor/user relation at all
 * (confirmed against leadTimeline.create() call sites) — never fabricate a
 * name for it.
 */
export function mapLeadTimeline(raw: BackendLeadTimeline): LeadTimelineEntry {
  return {
    id: raw.id,
    leadId: raw.leadId,
    icon: TIMELINE_ICON_BY_ACTION[raw.action] ?? "pulse",
    title: titleCaseFromConstant(raw.action),
    detail: raw.remarks ?? "",
    actorName: "",
    occurredAt: raw.createdAt,
  };
}

export function mapLeadFollowup(raw: BackendLeadFollowup): LeadFollowup {
  return {
    id: raw.id,
    leadId: raw.leadId,
    followupDate: raw.followupDate,
    remarks: raw.remarks ?? undefined,
    status: raw.status,
    completedAt: raw.completedAt ?? null,
    completedByName: raw.completedBy?.fullName ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function mapLead(raw: BackendLead): Lead {
  return {
    id: raw.id,
    customerName: raw.customerName,
    companyName: raw.companyName ?? undefined,
    email: raw.email ?? undefined,
    phone: raw.phone,
    alternatePhone: raw.alternatePhone ?? undefined,
    sourceId: raw.sourceId ?? raw.source?.id ?? "",
    sourceName: raw.source?.name ?? "Unknown source",
    status: raw.status as LeadStatus,
    assignedToId: raw.assignedToId ?? undefined,
    assignedToName: raw.assignedTo?.fullName ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    lastActivityAt: raw.updatedAt,
    followups: raw.followups?.map(mapLeadFollowup),
    notes: raw.notes?.map(mapLeadNote),
  };
}
