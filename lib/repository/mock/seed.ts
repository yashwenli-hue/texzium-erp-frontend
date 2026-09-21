import {
  Lead,
  LeadTimelineEntry,
  LeadSourceRecord,
  Customer,
  Contact,
  Activity,
  Task,
  Note,
  Opportunity,
  Quotation,
  AppNotification,
} from "../../types/domain";

/**
 * Sample data ported from the RevenueOS HTML prototype. Field values (deal
 * sizes, names, stages) mirror the prototype's fictional data for visual
 * continuity, but timestamps are computed relative to "now" at load time
 * (rather than pinned to a stale hardcoded date) so the demo always looks
 * current. This is a deliberate improvement over the prototype, which used
 * hardcoded relative-time strings like "2 hrs ago" as literal display text.
 * See docs/backend-ui-contract.md, item: "Timestamp source of truth".
 */

const HOUR = 3_600_000;
const DAY = 86_400_000;
const NOW = Date.now();

const hoursAgo = (n: number) => new Date(NOW - n * HOUR).toISOString();
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();
const daysFromNow = (n: number) => new Date(NOW + n * DAY).toISOString();
const monthsAgo = (n: number) => new Date(NOW - n * 30 * DAY).toISOString();

// ---------------------------------------------------------------------------
// LEAD SOURCES — VERIFIED names from database discovery (contract §4).
// `category` is MOCK/UI-ONLY (see LeadSourceRecord) — a rough grouping used
// for source-type filtering; not a confirmed backend field.
// ---------------------------------------------------------------------------
export const SEED_LEAD_SOURCES: LeadSourceRecord[] = [
  { id: "SRC1", name: "Website", category: "Organic" },
  { id: "SRC2", name: "Meta Ads", category: "Paid Ads" },
  { id: "SRC3", name: "Google Ads", category: "Paid Ads" },
  { id: "SRC4", name: "WhatsApp", category: "Messaging" },
  { id: "SRC5", name: "IndiaMART", category: "Marketplace" },
  { id: "SRC6", name: "TradeIndia", category: "Marketplace" },
  { id: "SRC7", name: "ExporterIndia", category: "Marketplace" },
];

// ---------------------------------------------------------------------------
// LEADS
// `uiContext` (productInterest/remarks/city) is MOCK/UI-ONLY — see
// LeadUIContext. Not part of the verified CreateLeadDto.
// ---------------------------------------------------------------------------
export const SEED_LEADS: Lead[] = [
  { id: "L1", customerName: "Sterling Pumps", companyName: "Sterling Pumps Pvt Ltd", sourceId: "SRC2", sourceName: "Meta Ads", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U2", assignedToName: "Rohit M.", phone: "+91 98220 41120", email: "procurement@sterlingpumps.in", createdAt: daysAgo(9), updatedAt: hoursAgo(2), lastActivityAt: hoursAgo(2), uiContext: { productInterest: "Hydraulic Pump Systems", city: "Pune", remarks: "Price-sensitive but values fast delivery — lead with the 2-week dispatch guarantee." } },
  { id: "L2", customerName: "GreenVolt Energy", sourceId: "SRC1", sourceName: "Website", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U1", assignedToName: "Anita S.", phone: "+91 98110 22341", email: "ops@greenvolt.in", createdAt: daysAgo(6), updatedAt: daysAgo(1), lastActivityAt: daysAgo(1), uiContext: { productInterest: "Solar EPC Equipment", city: "Jaipur", remarks: "CFO signs off anything above ₹50L — copy them on proposals." } },
  { id: "L3", customerName: "Apex Controls", sourceId: "SRC6", sourceName: "TradeIndia", status: "CONTACTED", score: "Warm", assignedToId: "U3", assignedToName: "Vikram J.", phone: "+91 90210 88213", email: "info@apexcontrols.com", createdAt: daysAgo(5), updatedAt: daysAgo(3), lastActivityAt: daysAgo(3), uiContext: { productInterest: "Control Panel Components", city: "Delhi", remarks: "Referred by Havells India — mention the relationship." } },
  { id: "L4", customerName: "Nimbus Cold Chain", sourceId: "SRC5", sourceName: "IndiaMART", status: "NEW", score: "Cold", phone: "+91 99870 45210", email: "purchase@nimbuscc.in", createdAt: daysAgo(6), updatedAt: daysAgo(5), lastActivityAt: daysAgo(5), uiContext: { productInterest: "Cold Storage Units", city: "Surat" } },
  { id: "L5", customerName: "Havells India", sourceId: "SRC7", sourceName: "ExporterIndia", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U4", assignedToName: "Priya N.", phone: "+91 98200 55672", email: "vendor.relations@havells.com", createdAt: daysAgo(14), updatedAt: daysAgo(7), lastActivityAt: daysAgo(7), uiContext: { productInterest: "Switchgear", city: "Noida" } },
  { id: "L6", customerName: "JSW Steel", companyName: "JSW Steel Ltd", sourceId: "SRC3", sourceName: "Google Ads", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U2", assignedToName: "Rohit M.", phone: "+91 94220 10981", email: "sourcing@jsw.in", createdAt: daysAgo(8), updatedAt: daysAgo(1), lastActivityAt: daysAgo(1), uiContext: { productInterest: "Factory Automation Hardware", city: "Bellary", remarks: "Decision committee of 3 — procurement, plant head, finance." } },
  { id: "L7", customerName: "L&T Infra", sourceId: "SRC1", sourceName: "Website", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U1", assignedToName: "Anita S.", phone: "+91 93450 12210", email: "procure@lninfra.com", createdAt: daysAgo(7), updatedAt: daysAgo(2), lastActivityAt: daysAgo(2), uiContext: { productInterest: "Control Room Equipment", city: "Chennai" } },
  { id: "L8", customerName: "Adani Green", sourceId: "SRC6", sourceName: "TradeIndia", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U3", assignedToName: "Vikram J.", phone: "+91 98980 44210", email: "vendors@adanigreen.com", createdAt: daysAgo(9), updatedAt: daysAgo(4), lastActivityAt: daysAgo(4), uiContext: { productInterest: "Rooftop Solar Panels", city: "Ahmedabad", remarks: "Open to a phased/pilot order before the full rollout." } },
  { id: "L9", customerName: "Reliance Industries", sourceId: "SRC3", sourceName: "Google Ads", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U1", assignedToName: "Anita S.", phone: "+91 98200 11223", email: "vendor.dev@ril.com", createdAt: daysAgo(10), updatedAt: daysAgo(6), lastActivityAt: daysAgo(6), uiContext: { productInterest: "Bulk Procurement Contract", city: "Mumbai" } },
  { id: "L10", customerName: "Tata Projects", sourceId: "SRC1", sourceName: "Website", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U2", assignedToName: "Rohit M.", phone: "+91 98330 66210", email: "procurement@tataprojects.com", createdAt: daysAgo(11), updatedAt: daysAgo(7), lastActivityAt: daysAgo(7), uiContext: { productInterest: "Warehouse Automation", city: "Mumbai" } },
  { id: "L11", customerName: "Bharat Textiles", sourceId: "SRC4", sourceName: "WhatsApp", status: "REJECTED", score: "Cold", assignedToId: "U3", assignedToName: "Vikram J.", phone: "+91 90000 12345", email: "info@bharattextiles.in", createdAt: daysAgo(12), updatedAt: daysAgo(10), lastActivityAt: daysAgo(10), uiContext: { productInterest: "Textile Machinery Parts", city: "Surat", remarks: "Budget did not match minimum order value." } },
];

export const SEED_LEAD_TIMELINE: LeadTimelineEntry[] = [
  { id: "T1", leadId: "L1", icon: "pulse", title: "STATUS_UPDATED — moved to Qualified", detail: "", actorName: "Rohit M.", occurredAt: hoursAgo(2) },
  { id: "T2", leadId: "L1", icon: "clock", title: "Follow-up call — asked for extended payment terms", detail: "", actorName: "Rohit M.", occurredAt: daysAgo(1) },
  { id: "T3", leadId: "L1", icon: "check", title: "LEAD_QUALIFIED", detail: "Budget and authority confirmed", actorName: "Rohit M.", occurredAt: daysAgo(3) },
  { id: "T4", leadId: "L1", icon: "check", title: "Meeting held — technical requirements finalised", detail: "", actorName: "Rohit M.", occurredAt: daysAgo(5) },
  { id: "T5", leadId: "L1", icon: "user", title: "PRE_SALES_ASSIGNED — assigned to Rohit M.", detail: "", actorName: "Auto-assignment", occurredAt: daysAgo(9) },
  { id: "T5b", leadId: "L1", icon: "funnel", title: "LEAD_CREATED", detail: "", actorName: "System", occurredAt: daysAgo(9) },
  { id: "T6", leadId: "L2", icon: "check", title: "LEAD_QUALIFIED", detail: "", actorName: "Anita S.", occurredAt: daysAgo(1) },
  { id: "T7", leadId: "L2", icon: "clock", title: "Discovery call completed", detail: "", actorName: "Anita S.", occurredAt: daysAgo(4) },
  { id: "T8", leadId: "L2", icon: "funnel", title: "LEAD_CREATED — from website enquiry form", detail: "", actorName: "System", occurredAt: daysAgo(6) },
  { id: "T9", leadId: "L3", icon: "pulse", title: "STATUS_UPDATED — moved to Contacted", detail: "", actorName: "Vikram J.", occurredAt: daysAgo(3) },
  { id: "T10", leadId: "L3", icon: "funnel", title: "LEAD_CREATED", detail: "Referred by existing customer Havells India", actorName: "System", occurredAt: daysAgo(5) },
  { id: "T11", leadId: "L4", icon: "funnel", title: "LEAD_CREATED", detail: "", actorName: "System", occurredAt: daysAgo(6) },
  { id: "T12", leadId: "L11", icon: "close", title: "LEAD_REJECTED", detail: "Budget did not match minimum order value", actorName: "Vikram J.", occurredAt: daysAgo(10) },
  { id: "T13", leadId: "L11", icon: "funnel", title: "LEAD_CREATED", detail: "", actorName: "System", occurredAt: daysAgo(12) },
];

// ---------------------------------------------------------------------------
// CUSTOMERS
// ---------------------------------------------------------------------------
export const SEED_CUSTOMERS: Customer[] = [
  { id: "C1", name: "GreenVolt Energy", industry: "Solar EPC", city: "Jaipur", ownerId: "U1", ownerName: "Anita S.", lifetimeValue: 24_000_000, openOrders: 3, status: "Active", customerSince: monthsAgo(28) },
  { id: "C2", name: "JSW Steel", industry: "Manufacturing", city: "Bellary", ownerId: "U2", ownerName: "Rohit M.", lifetimeValue: 41_000_000, openOrders: 6, status: "Active", customerSince: monthsAgo(42) },
  { id: "C3", name: "Havells India", industry: "Electricals", city: "Noida", ownerId: "U4", ownerName: "Priya N.", lifetimeValue: 9_600_000, openOrders: 2, status: "Active", customerSince: monthsAgo(14), originLeadId: "L5" },
  { id: "C4", name: "Sterling Pumps", industry: "Manufacturing", city: "Pune", ownerId: "U2", ownerName: "Rohit M.", lifetimeValue: 12_000_000, openOrders: 4, status: "At Risk", customerSince: monthsAgo(34) },
  { id: "C5", name: "L&T Infra", industry: "Infrastructure", city: "Chennai", ownerId: "U1", ownerName: "Anita S.", lifetimeValue: 36_000_000, openOrders: 5, status: "Active", customerSince: monthsAgo(45) },
  { id: "C6", name: "Apex Controls", industry: "Trading", city: "Delhi", ownerId: "U3", ownerName: "Vikram J.", lifetimeValue: 1_800_000, openOrders: 1, status: "New", customerSince: monthsAgo(1) },
  { id: "C7", name: "Nimbus Cold Chain", industry: "Cold Storage", city: "Surat", ownerId: "U4", ownerName: "Priya N.", lifetimeValue: 0, openOrders: 0, status: "Churned", customerSince: monthsAgo(18) },
  { id: "C8", name: "Reliance Industries", industry: "Petrochemicals", city: "Mumbai", ownerId: "U1", ownerName: "Anita S.", lifetimeValue: 68_000_000, openOrders: 9, status: "Active", customerSince: monthsAgo(64) },
];

// ---------------------------------------------------------------------------
// CONTACTS
// ---------------------------------------------------------------------------
export const SEED_CONTACTS: Contact[] = [
  { id: "CT1", name: "Karan Mehta", title: "Head of Procurement", companyName: "Sterling Pumps", companyId: "L1", type: "Decision Maker", email: "karan.m@sterlingpumps.in", phone: "+91 98220 41121", lastContactedAt: hoursAgo(2), ownerId: "U2", ownerName: "Rohit M." },
  { id: "CT2", name: "Divya Rao", title: "CEO", companyName: "GreenVolt Energy", companyId: "L2", type: "Decision Maker", email: "divya@greenvolt.in", phone: "+91 98110 22342", lastContactedAt: daysAgo(1), ownerId: "U1", ownerName: "Anita S." },
  { id: "CT3", name: "Suresh Iyer", title: "Plant Manager", companyName: "GreenVolt Energy", companyId: "L2", type: "Champion", email: "suresh@greenvolt.in", phone: "+91 98110 22399", lastContactedAt: daysAgo(3), ownerId: "U1", ownerName: "Anita S." },
  { id: "CT4", name: "Neha Kapoor", title: "Purchase Manager", companyName: "Apex Controls", companyId: "L3", type: "Influencer", email: "neha@apexcontrols.com", phone: "+91 90210 88214", lastContactedAt: daysAgo(3), ownerId: "U3", ownerName: "Vikram J." },
  { id: "CT5", name: "Ramesh Bhatt", title: "VP Operations", companyName: "Nimbus Cold Chain", companyId: "L4", type: "Decision Maker", email: "ramesh@nimbuscc.in", phone: "+91 99870 45211", lastContactedAt: daysAgo(5), ownerId: "U4", ownerName: "Priya N." },
  { id: "CT6", name: "Anjali Menon", title: "Vendor Relations", companyName: "Havells India", companyId: "C3", type: "Champion", email: "anjali@havells.com", phone: "+91 98200 55673", lastContactedAt: daysAgo(7), ownerId: "U4", ownerName: "Priya N." },
  { id: "CT7", name: "Vikas Sharma", title: "Sourcing Head", companyName: "JSW Steel", companyId: "L6", type: "Decision Maker", email: "vikas@jsw.in", phone: "+91 94220 10982", lastContactedAt: daysAgo(1), ownerId: "U2", ownerName: "Rohit M." },
  { id: "CT8", name: "Pooja Desai", title: "Site Engineer", companyName: "L&T Infra", companyId: "L7", type: "Influencer", email: "pooja@lninfra.com", phone: "+91 93450 12211", lastContactedAt: daysAgo(2), ownerId: "U1", ownerName: "Anita S." },
  { id: "CT9", name: "Arjun Nair", title: "Category Manager", companyName: "Adani Green", companyId: "L8", type: "Champion", email: "arjun@adanigreen.com", phone: "+91 98980 44211", lastContactedAt: daysAgo(4), ownerId: "U3", ownerName: "Vikram J." },
  { id: "CT10", name: "Meera Iyer", title: "Vendor Dev. Lead", companyName: "Reliance Industries", companyId: "L9", type: "Decision Maker", email: "meera@ril.com", phone: "+91 98200 11224", lastContactedAt: daysAgo(6), ownerId: "U1", ownerName: "Anita S." },
];

// ---------------------------------------------------------------------------
// ACTIVITIES  (grouping is computed client-side from occurredAt — not stored)
// ---------------------------------------------------------------------------
export const SEED_ACTIVITIES: Activity[] = [
  { id: "A1", type: "Call", relatedType: "Lead", relatedId: "L1", relatedName: "Sterling Pumps", ownerName: "Rohit M.", occurredAt: hoursAgo(1), note: "Discussed extended payment terms; customer wants 45-day credit instead of 30." },
  { id: "A2", type: "Email", relatedType: "Lead", relatedId: "L2", relatedName: "GreenVolt Energy", ownerName: "Anita S.", occurredAt: hoursAgo(3), note: "Sent revised proposal with updated panel specs and pricing." },
  { id: "A3", type: "WhatsApp", relatedType: "Lead", relatedId: "L6", relatedName: "JSW Steel", ownerName: "Rohit M.", occurredAt: hoursAgo(5), note: "Shared quotation PDF and payment link over WhatsApp." },
  { id: "A4", type: "Meeting", relatedType: "Lead", relatedId: "L7", relatedName: "L&T Infra", ownerName: "Anita S.", occurredAt: daysAgo(1), note: "Site visit scheduled for next Tuesday to finalise scope." },
  { id: "A5", type: "Call", relatedType: "Lead", relatedId: "L3", relatedName: "Apex Controls", ownerName: "Vikram J.", occurredAt: hoursAgo(28), note: "Confirmed budget approval; moving to proposal stage." },
  { id: "A6", type: "Email", relatedType: "Lead", relatedId: "L4", relatedName: "Nimbus Cold Chain", ownerName: "Priya N.", occurredAt: hoursAgo(31), note: "Sent brochure and case studies as requested." },
  { id: "A7", type: "Meeting", relatedType: "Lead", relatedId: "L8", relatedName: "Adani Green", ownerName: "Vikram J.", occurredAt: daysAgo(3), note: "Technical discovery call — EPC scope for 5MW rooftop project." },
  { id: "A8", type: "Call", relatedType: "Lead", relatedId: "L9", relatedName: "Reliance Industries", ownerName: "Anita S.", occurredAt: daysAgo(4), note: "Introductory call, gauged interest in bulk procurement contract." },
  { id: "A9", type: "Quotation", relatedType: "Lead", relatedId: "L10", relatedName: "Tata Projects", ownerName: "Rohit M.", occurredAt: daysAgo(5), note: "Quotation QT-3415 generated and shared for review." },
  { id: "A10", type: "Stage Change", relatedType: "Lead", relatedId: "L5", relatedName: "Havells India", ownerName: "System", occurredAt: daysAgo(6), note: "Deal marked Won — sales order SO-4798 auto-created." },
  { id: "A11", type: "Email", relatedType: "Lead", relatedId: "L1", relatedName: "Sterling Pumps", ownerName: "Rohit M.", occurredAt: daysAgo(6), note: "Sent quotation revision v3 with 8% discount approval." },
  { id: "A12", type: "Call", relatedType: "Lead", relatedId: "L2", relatedName: "GreenVolt Energy", ownerName: "Anita S.", occurredAt: daysAgo(6), note: "Discovery call to understand technical requirements." },
];

// ---------------------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------------------
export const SEED_TASKS: Task[] = [
  { id: "TK1", title: "Send revised quotation to Sterling Pumps", dueAt: daysAgo(3), priority: "High", linkedType: "Lead", linkedId: "L1", linkedName: "Sterling Pumps", assigneeName: "Rohit M.", done: false, createdAt: daysAgo(5) },
  { id: "TK2", title: "Follow up on Nimbus Cold Chain brochure request", dueAt: daysAgo(2), priority: "Medium", linkedType: "Lead", linkedId: "L4", linkedName: "Nimbus Cold Chain", assigneeName: "Priya N.", done: false, createdAt: daysAgo(4) },
  { id: "TK3", title: "Call Karan Mehta re: payment terms", dueAt: hoursAgo(-3), priority: "High", linkedType: "Lead", linkedId: "L1", linkedName: "Sterling Pumps", assigneeName: "Rohit M.", done: false, createdAt: daysAgo(1) },
  { id: "TK4", title: "Prepare proposal deck for Adani Green", dueAt: hoursAgo(-8), priority: "High", linkedType: "Lead", linkedId: "L8", linkedName: "Adani Green", assigneeName: "Vikram J.", done: false, createdAt: daysAgo(1) },
  { id: "TK5", title: "Log yesterday's site visit notes", dueAt: hoursAgo(2), priority: "Low", linkedType: "Lead", linkedId: "L7", linkedName: "L&T Infra", assigneeName: "Anita S.", done: true, createdAt: daysAgo(1) },
  { id: "TK6", title: "Schedule technical call with Reliance Industries", dueAt: daysFromNow(5), priority: "Medium", linkedType: "Lead", linkedId: "L9", linkedName: "Reliance Industries", assigneeName: "Anita S.", done: false, createdAt: daysAgo(1) },
  { id: "TK7", title: "Renew AMC discussion with Havells India", dueAt: daysFromNow(7), priority: "Low", linkedType: "Customer", linkedId: "C3", linkedName: "Havells India", assigneeName: "Priya N.", done: false, createdAt: daysAgo(2) },
  { id: "TK8", title: "Quarterly review call with JSW Steel", dueAt: daysFromNow(11), priority: "Medium", linkedType: "Lead", linkedId: "L6", linkedName: "JSW Steel", assigneeName: "Rohit M.", done: false, createdAt: daysAgo(2) },
];

// ---------------------------------------------------------------------------
// NOTES
// ---------------------------------------------------------------------------
export const SEED_NOTES: Note[] = [
  { id: "N1", text: "Customer is price-sensitive but values fast delivery. Lead with our 2-week dispatch guarantee, not the discount.", linkedType: "Lead", linkedId: "L1", linkedName: "Sterling Pumps", authorName: "Rohit M.", createdAt: hoursAgo(2), pinned: true },
  { id: "N2", text: "CEO prefers WhatsApp over email for quick updates. CFO handles final sign-off on anything above ₹50L.", linkedType: "Lead", linkedId: "L2", linkedName: "GreenVolt Energy", authorName: "Anita S.", createdAt: daysAgo(1), pinned: true },
  { id: "N3", text: "Referred by Havells India — mention the existing relationship when following up, builds trust quickly.", linkedType: "Lead", linkedId: "L3", linkedName: "Apex Controls", authorName: "Vikram J.", createdAt: daysAgo(3), pinned: false },
  { id: "N4", text: "Had a bad experience with a competitor's installation delay last year — reassure on our SLA commitments.", linkedType: "Lead", linkedId: "L4", linkedName: "Nimbus Cold Chain", authorName: "Priya N.", createdAt: daysAgo(5), pinned: false },
  { id: "N5", text: "Decision committee includes 3 people — procurement, plant head, and finance. Copy all three on proposals.", linkedType: "Lead", linkedId: "L6", linkedName: "JSW Steel", authorName: "Rohit M.", createdAt: daysAgo(7), pinned: false },
  { id: "N6", text: "Open to a pilot order before committing to the full 5MW rollout. Worth proposing a phased contract.", linkedType: "Lead", linkedId: "L8", linkedName: "Adani Green", authorName: "Vikram J.", createdAt: daysAgo(4), pinned: false },
];

// ---------------------------------------------------------------------------
// OPPORTUNITIES — VERIFIED: always linked to a lead (leadId); a lead must
// already be Qualified before an opportunity is created from it.
// ---------------------------------------------------------------------------
export const SEED_OPPORTUNITIES: Opportunity[] = [
  { id: "O1", leadId: "L2", title: "5MW Rooftop EPC — GreenVolt", customerName: "GreenVolt Energy", stage: "Proposal", expectedValue: 6_400_000, probability: 60, expectedCloseDate: daysFromNow(20), ownerName: "Anita S.", createdAt: daysAgo(5) },
  { id: "O2", leadId: "L1", title: "Hydraulic Systems Upgrade", customerName: "Sterling Pumps", stage: "Negotiation", expectedValue: 1_840_000, probability: 75, expectedCloseDate: daysFromNow(10), ownerName: "Rohit M.", createdAt: daysAgo(8) },
  { id: "O3", leadId: "L6", title: "Factory Automation Retrofit", customerName: "JSW Steel", stage: "Negotiation", expectedValue: 8_800_000, probability: 70, expectedCloseDate: daysFromNow(15), ownerName: "Rohit M.", createdAt: daysAgo(7) },
  { id: "O4", leadId: "L7", title: "Control Room Equipment", customerName: "L&T Infra", stage: "Proposal", expectedValue: 3_600_000, probability: 50, expectedCloseDate: daysFromNow(25), ownerName: "Anita S.", createdAt: daysAgo(6) },
  { id: "O5", leadId: "L8", title: "Rooftop Solar — Phase 1", customerName: "Adani Green", stage: "Proposal", expectedValue: 11_000_000, probability: 55, expectedCloseDate: daysFromNow(30), ownerName: "Vikram J.", createdAt: daysAgo(8) },
  { id: "O6", leadId: "L9", title: "Bulk Procurement Contract", customerName: "Reliance Industries", stage: "Qualified", expectedValue: 4_200_000, probability: 35, expectedCloseDate: daysFromNow(35), ownerName: "Anita S.", createdAt: daysAgo(9) },
  { id: "O7", leadId: "L10", title: "Warehouse Automation", customerName: "Tata Projects", stage: "Qualified", expectedValue: 2_850_000, probability: 35, expectedCloseDate: daysFromNow(38), ownerName: "Rohit M.", createdAt: daysAgo(10) },
  { id: "O8", leadId: "L5", title: "Switchgear Replacement Order", customerName: "Havells India", stage: "Won", expectedValue: 5_200_000, probability: 100, expectedCloseDate: daysAgo(6), ownerName: "Priya N.", createdAt: daysAgo(13) },
];

// ---------------------------------------------------------------------------
// QUOTATIONS
// ---------------------------------------------------------------------------
// Status uses only the VERIFIED lifecycle (Draft/Revised/Approved/Converted
// — see QuotationStatus). `version`/`revisions` are MOCK/UI-ONLY — see
// QuotationRevision. One quotation per opportunity, so every quotation has
// a real, consistent Lead → Opportunity → Quotation chain.
export const SEED_QUOTATIONS: Quotation[] = [
  { id: "Q1", quoteNo: "QT-3398", customerName: "GreenVolt Energy", opportunityId: "O1", opportunityName: "5MW Rooftop EPC — GreenVolt", amount: 6_400_000, status: "DRAFT", validUntil: daysFromNow(20), ownerName: "Anita S.", createdAt: daysAgo(4), version: 1, revisions: [{ version: 1, amount: 6_400_000, createdAt: daysAgo(4) }] },
  { id: "Q2", quoteNo: "QT-3402", customerName: "Sterling Pumps", opportunityId: "O2", opportunityName: "Hydraulic Systems Upgrade", amount: 1_840_000, status: "REVISED", validUntil: daysFromNow(15), ownerName: "Rohit M.", createdAt: daysAgo(6), version: 2, revisions: [
    { version: 1, amount: 2_000_000, createdAt: daysAgo(6) },
    { version: 2, amount: 1_840_000, createdAt: daysAgo(3), note: "8% discount approved to close the deal faster" },
  ] },
  { id: "Q3", quoteNo: "QT-3390", customerName: "JSW Steel", opportunityId: "O3", opportunityName: "Factory Automation Retrofit", amount: 8_500_000, status: "APPROVED", validUntil: daysFromNow(12), ownerName: "Rohit M.", createdAt: daysAgo(5), version: 1, revisions: [{ version: 1, amount: 8_500_000, createdAt: daysAgo(5) }] },
  { id: "Q4", quoteNo: "QT-3379", customerName: "L&T Infra", opportunityId: "O4", opportunityName: "Control Room Equipment", amount: 3_600_000, status: "DRAFT", validUntil: daysFromNow(18), ownerName: "Anita S.", createdAt: daysAgo(1), version: 1, revisions: [{ version: 1, amount: 3_600_000, createdAt: daysAgo(1) }] },
  { id: "Q5", quoteNo: "QT-3406", customerName: "Adani Green", opportunityId: "O5", opportunityName: "Rooftop Solar — Phase 1", amount: 11_000_000, status: "REVISED", validUntil: daysFromNow(25), ownerName: "Vikram J.", createdAt: daysAgo(7), version: 2, revisions: [
    { version: 1, amount: 11_500_000, createdAt: daysAgo(7) },
    { version: 2, amount: 11_000_000, createdAt: daysAgo(2), note: "Scope trimmed to Phase 1 only" },
  ] },
  { id: "Q6", quoteNo: "QT-3371", customerName: "Reliance Industries", opportunityId: "O6", opportunityName: "Bulk Procurement Contract", amount: 4_200_000, status: "DRAFT", validUntil: daysFromNow(30), ownerName: "Anita S.", createdAt: daysAgo(2), version: 1, revisions: [{ version: 1, amount: 4_200_000, createdAt: daysAgo(2) }] },
  { id: "Q7", quoteNo: "QT-3415", customerName: "Tata Projects", opportunityId: "O7", opportunityName: "Warehouse Automation", amount: 2_850_000, status: "APPROVED", validUntil: daysFromNow(22), ownerName: "Rohit M.", createdAt: daysAgo(1), version: 1, revisions: [{ version: 1, amount: 2_850_000, createdAt: daysAgo(1) }] },
  { id: "Q8", quoteNo: "QT-3385", customerName: "Havells India", opportunityId: "O8", opportunityName: "Switchgear Replacement Order", amount: 5_200_000, status: "APPROVED", validUntil: daysAgo(1), ownerName: "Priya N.", createdAt: daysAgo(8), version: 1, revisions: [{ version: 1, amount: 5_200_000, createdAt: daysAgo(8) }] },
];

// ---------------------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------------------
export const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: "NT1", icon: "funnel", text: "Sterling Pumps moved to Negotiation stage", occurredAt: hoursAgo(2), unread: true },
  { id: "NT2", icon: "file", text: "Quotation QT-3398 was viewed by GreenVolt Energy", occurredAt: hoursAgo(3), unread: true },
  { id: "NT3", icon: "checksq", text: "Task overdue: Send revised quotation to Sterling Pumps", occurredAt: hoursAgo(5), unread: true },
  { id: "NT4", icon: "user", text: "New lead assigned to you: Adani Green", occurredAt: hoursAgo(6), unread: false },
  { id: "NT5", icon: "cash", text: "Payment of ₹52.0 L received from Havells India", occurredAt: daysAgo(1), unread: false },
  { id: "NT6", icon: "alert", text: "Quotation QT-3365 expired for Nimbus Cold Chain", occurredAt: daysAgo(1), unread: false },
  { id: "NT7", icon: "check", text: "Deal Won: Havells India — ₹52.0 L", occurredAt: daysAgo(3), unread: false },
  { id: "NT8", icon: "cal", text: "Meeting reminder: Site visit with L&T Infra tomorrow", occurredAt: daysAgo(4), unread: false },
];
