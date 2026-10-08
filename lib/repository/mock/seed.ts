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
  QuotationEvent,
  ProformaEvent,
  ProformaInvoice,
  SalesOrder,
  SalesInvoice,
  DispatchOrderOption,
  AccountsReceivable,
  PaymentCollectionRecord,
  PaymentCollectionEvent,
  CustomerStatementEntry,
  AppNotification,
  CustomerEvent,
  CustomerGstRegistration,
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
// `uiContext` (productInterest/remarks) is MOCK/UI-ONLY — see LeadUIContext.
// Not part of the verified CreateLeadDto. country/state/city are real Lead fields;
// like the real data, some leads (L4, L11) were recorded without a location, and one
// (L10) is international.
// ---------------------------------------------------------------------------
export const SEED_LEADS: Lead[] = [
  { id: "L1", isActive: true, customerName: "Sterling Pumps", companyName: "Sterling Pumps Pvt Ltd", sourceId: "SRC2", sourceName: "Meta Ads", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U2", assignedToName: "Rohit M.", phone: "+91 98220 41120", email: "procurement@sterlingpumps.in", createdAt: daysAgo(9), updatedAt: hoursAgo(2), lastActivityAt: hoursAgo(2), country: "IN", state: "Maharashtra", city: "Pune", uiContext: { productInterest: "Hydraulic Pump Systems", remarks: "Price-sensitive but values fast delivery — lead with the 2-week dispatch guarantee." } },
  { id: "L2", isActive: true, customerName: "GreenVolt Energy", sourceId: "SRC1", sourceName: "Website", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U1", assignedToName: "Anita S.", phone: "+91 98110 22341", email: "ops@greenvolt.in", createdAt: daysAgo(6), updatedAt: daysAgo(1), lastActivityAt: daysAgo(1), country: "IN", state: "Rajasthan", city: "Jaipur", uiContext: { productInterest: "Solar EPC Equipment", remarks: "CFO signs off anything above ₹50L — copy them on proposals." } },
  { id: "L3", isActive: true, customerName: "Apex Controls", sourceId: "SRC6", sourceName: "TradeIndia", status: "CONTACTED", score: "Warm", assignedToId: "U3", assignedToName: "Vikram J.", phone: "+91 90210 88213", email: "info@apexcontrols.com", createdAt: daysAgo(5), updatedAt: daysAgo(3), lastActivityAt: daysAgo(3), country: "IN", state: "Delhi", city: "Delhi", uiContext: { productInterest: "Control Panel Components", remarks: "Referred by Havells India — mention the relationship." } },
  { id: "L4", isActive: true, customerName: "Nimbus Cold Chain", sourceId: "SRC5", sourceName: "IndiaMART", status: "NEW", score: "Cold", phone: "+91 99870 45210", email: "purchase@nimbuscc.in", createdAt: daysAgo(6), updatedAt: daysAgo(5), lastActivityAt: daysAgo(5), uiContext: { productInterest: "Cold Storage Units" } },
  { id: "L5", isActive: true, customerName: "Havells India", sourceId: "SRC7", sourceName: "ExporterIndia", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U4", assignedToName: "Priya N.", phone: "+91 98200 55672", email: "vendor.relations@havells.com", createdAt: daysAgo(14), updatedAt: daysAgo(7), lastActivityAt: daysAgo(7), country: "IN", state: "Uttar Pradesh", city: "Noida", uiContext: { productInterest: "Switchgear" } },
  { id: "L6", isActive: true, customerName: "JSW Steel", companyName: "JSW Steel Ltd", sourceId: "SRC3", sourceName: "Google Ads", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U2", assignedToName: "Rohit M.", phone: "+91 94220 10981", email: "sourcing@jsw.in", createdAt: daysAgo(8), updatedAt: daysAgo(1), lastActivityAt: daysAgo(1), country: "IN", state: "Karnataka", city: "Bellary", uiContext: { productInterest: "Factory Automation Hardware", remarks: "Decision committee of 3 — procurement, plant head, finance." } },
  { id: "L7", isActive: true, customerName: "L&T Infra", sourceId: "SRC1", sourceName: "Website", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U1", assignedToName: "Anita S.", phone: "+91 93450 12210", email: "procure@lninfra.com", createdAt: daysAgo(7), updatedAt: daysAgo(2), lastActivityAt: daysAgo(2), country: "IN", state: "Tamil Nadu", city: "Chennai", uiContext: { productInterest: "Control Room Equipment" } },
  { id: "L8", isActive: true, customerName: "Adani Green", sourceId: "SRC6", sourceName: "TradeIndia", status: "SALES_ASSIGNED", score: "Hot", assignedToId: "U3", assignedToName: "Vikram J.", phone: "+91 98980 44210", email: "vendors@adanigreen.com", createdAt: daysAgo(9), updatedAt: daysAgo(4), lastActivityAt: daysAgo(4), country: "IN", state: "Gujarat", city: "Ahmedabad", uiContext: { productInterest: "Rooftop Solar Panels", remarks: "Open to a phased/pilot order before the full rollout." } },
  { id: "L9", isActive: true, customerName: "Reliance Industries", sourceId: "SRC3", sourceName: "Google Ads", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U1", assignedToName: "Anita S.", phone: "+91 98200 11223", email: "vendor.dev@ril.com", createdAt: daysAgo(10), updatedAt: daysAgo(6), lastActivityAt: daysAgo(6), country: "IN", state: "Maharashtra", city: "Mumbai", uiContext: { productInterest: "Bulk Procurement Contract" } },
  { id: "L10", isActive: true, customerName: "Tata Projects", sourceId: "SRC1", sourceName: "Website", status: "SALES_ASSIGNED", score: "Warm", assignedToId: "U2", assignedToName: "Rohit M.", phone: "+91 98330 66210", email: "procurement@tataprojects.com", createdAt: daysAgo(11), updatedAt: daysAgo(7), lastActivityAt: daysAgo(7), country: "AE", city: "Dubai", uiContext: { productInterest: "Warehouse Automation" } },
  { id: "L11", isActive: true, customerName: "Bharat Textiles", sourceId: "SRC4", sourceName: "WhatsApp", status: "REJECTED", score: "Cold", assignedToId: "U3", assignedToName: "Vikram J.", phone: "+91 90000 12345", email: "info@bharattextiles.in", createdAt: daysAgo(12), updatedAt: daysAgo(10), lastActivityAt: daysAgo(10), uiContext: { productInterest: "Textile Machinery Parts", remarks: "Budget did not match minimum order value." } },
  { id: "L12", isActive: false, deactivatedAt: daysAgo(14), deactivatedById: "U1", deactivatedByName: "Anita S.", deactivationReason: "Duplicate of the Sterling Pumps lead that is already being worked.", customerName: "Sterling Pumps (second entry)", sourceId: "SRC1", sourceName: "Website", status: "NEW", score: "Cold", phone: "+91 98220 41121", email: "karan.m@sterlingpumps.in", createdAt: daysAgo(20), updatedAt: daysAgo(14), lastActivityAt: daysAgo(14), country: "IN", state: "Maharashtra", city: "Pune", uiContext: { productInterest: "Hydraulic Pump Systems" } },
];

export const SEED_LEAD_TIMELINE: LeadTimelineEntry[] = [
  { source: "SYSTEM", id: "T1", leadId: "L1", icon: "pulse", title: "STATUS_UPDATED — moved to Qualified", detail: "", actorName: "Rohit M.", occurredAt: hoursAgo(2) },
  { source: "EMPLOYEE", activityType: "CALL", id: "T2", leadId: "L1", icon: "phone", title: "Call", detail: "Follow-up call — asked for extended payment terms", actorName: "Rohit M.", occurredAt: daysAgo(1) },
  { source: "SYSTEM", id: "T3", leadId: "L1", icon: "check", title: "LEAD_QUALIFIED", detail: "Budget and authority confirmed", actorName: "Rohit M.", occurredAt: daysAgo(3) },
  { source: "EMPLOYEE", activityType: "MEETING", id: "T4", leadId: "L1", icon: "cal", title: "Meeting", detail: "Meeting held — technical requirements finalised", actorName: "Rohit M.", occurredAt: daysAgo(5) },
  { source: "SYSTEM", id: "T5", leadId: "L1", icon: "user", title: "PRE_SALES_ASSIGNED — assigned to Rohit M.", detail: "", actorName: "Auto-assignment", occurredAt: daysAgo(9) },
  { source: "SYSTEM", id: "T5b", leadId: "L1", icon: "funnel", title: "LEAD_CREATED", detail: "", actorName: "System", occurredAt: daysAgo(9) },
  { source: "SYSTEM", id: "T6", leadId: "L2", icon: "check", title: "LEAD_QUALIFIED", detail: "", actorName: "Anita S.", occurredAt: daysAgo(1) },
  { source: "EMPLOYEE", activityType: "CALL", id: "T7", leadId: "L2", icon: "phone", title: "Call", detail: "Discovery call completed", actorName: "Anita S.", occurredAt: daysAgo(4) },
  { source: "SYSTEM", id: "T8", leadId: "L2", icon: "funnel", title: "LEAD_CREATED — from website enquiry form", detail: "", actorName: "System", occurredAt: daysAgo(6) },
  { source: "SYSTEM", id: "T9", leadId: "L3", icon: "pulse", title: "STATUS_UPDATED — moved to Contacted", detail: "", actorName: "Vikram J.", occurredAt: daysAgo(3) },
  { source: "SYSTEM", id: "T10", leadId: "L3", icon: "funnel", title: "LEAD_CREATED", detail: "Referred by existing customer Havells India", actorName: "System", occurredAt: daysAgo(5) },
  { source: "SYSTEM", id: "T11", leadId: "L4", icon: "funnel", title: "LEAD_CREATED", detail: "", actorName: "System", occurredAt: daysAgo(6) },
  { source: "SYSTEM", id: "T12", leadId: "L11", icon: "close", title: "LEAD_REJECTED", detail: "Budget did not match minimum order value", actorName: "Vikram J.", occurredAt: daysAgo(10) },
  { source: "SYSTEM", id: "T13", leadId: "L11", icon: "funnel", title: "LEAD_CREATED", detail: "", actorName: "System", occurredAt: daysAgo(12) },
  { source: "SYSTEM", id: "T14", leadId: "L12", icon: "alert", title: "Lead Deactivated", detail: "Duplicate of the Sterling Pumps lead that is already being worked.", actorName: "Anita S.", occurredAt: daysAgo(14) },
  { source: "SYSTEM", id: "T15", leadId: "L12", icon: "funnel", title: "LEAD_CREATED", detail: "", actorName: "System", occurredAt: daysAgo(20) },
];

// ---------------------------------------------------------------------------
// CUSTOMERS
// ---------------------------------------------------------------------------
// Customers follow the real contract: a server-style code, PAN and contact
// details, GST registrations (the default first) and a history. C6 has no GST
// registration, so it can't be quoted yet; C7 is inactive (with its reason); C3's
// second registration is inactive. Customers C2-C8 predate the history (they
// have no events) except where a change since is recorded, like the real
// customers that existed before it.
const reg = (id: string, customerId: string, gstin: string, legalName: string, stateCode: string, stateName: string, city: string, pincode: string, over: Partial<CustomerGstRegistration> = {}): CustomerGstRegistration => ({
  id, customerId, gstin, legalName, stateCode, stateName, addressLine1: "Plot 12, Industrial Estate", city, pincode, isDefault: false, isActive: true, createdAt: monthsAgo(20), updatedAt: monthsAgo(20), ...over,
});
export const SEED_CUSTOMERS: Customer[] = [
  { id: "C1", customerCode: "CUST-000001", customerName: "GreenVolt Energy", panNumber: "AABCG1234A", email: "accounts@greenvolt.in", phone: "+91 98110 22341", customerType: "B2B", isActive: true, isVendor: false, gstRegistrations: [reg("G1", "C1", "08AABCG1234A1Z5", "GreenVolt Energy Pvt Ltd", "08", "Rajasthan", "Jaipur", "302001", { isDefault: true, branchName: "Jaipur HQ" })], createdAt: monthsAgo(6), updatedAt: monthsAgo(6) },
  { id: "C2", customerCode: "CUST-1002", customerName: "JSW Steel", panNumber: "AAACJ4323K", email: "sourcing@jsw.in", phone: "+91 94220 10981", customerType: "B2B", isActive: true, isVendor: false, gstRegistrations: [reg("G2", "C2", "29AAACJ4323K1Z7", "JSW Steel Ltd", "29", "Karnataka", "Bellary", "583275", { isDefault: true, branchName: "Vijayanagar Works" }), reg("G3", "C2", "27AAACJ4323K1Z2", "JSW Steel Ltd", "27", "Maharashtra", "Mumbai", "400051", { branchName: "Mumbai Office" })], createdAt: monthsAgo(42), updatedAt: monthsAgo(42) },
  { id: "C3", customerCode: "CUST-1003", customerName: "Havells India", panNumber: "AAACH0897M", email: "vendor.relations@havells.com", phone: "+91 98200 55672", customerType: "B2B", isActive: true, isVendor: false, gstRegistrations: [reg("G4", "C3", "09AAACH0897M1Z6", "Havells India Ltd", "09", "Uttar Pradesh", "Noida", "201301", { isDefault: true }), reg("G5", "C3", "07AAACH0897M1Z0", "Havells India Ltd", "07", "Delhi", "New Delhi", "110001", { isActive: false, branchName: "Delhi (closed)" })], createdAt: monthsAgo(14), updatedAt: monthsAgo(14) },
  { id: "C4", customerCode: "CUST-1004", customerName: "Sterling Pumps", panNumber: "AAFCS5521D", email: "procurement@sterlingpumps.in", phone: "+91 98220 41120", customerType: "B2B", isActive: true, isVendor: false, gstRegistrations: [reg("G6", "C4", "27AAFCS5521D1ZX", "Sterling Pumps Pvt Ltd", "27", "Maharashtra", "Pune", "411019", { isDefault: true })], createdAt: monthsAgo(34), updatedAt: monthsAgo(34) },
  { id: "C5", customerCode: "CUST-1005", customerName: "L&T Infra", panNumber: "AAACL0140P", email: "procure@lninfra.com", phone: "+91 93450 12210", customerType: "B2B", isActive: true, isVendor: false, gstRegistrations: [reg("G7", "C5", "33AAACL0140P1ZM", "Larsen & Toubro Infra", "33", "Tamil Nadu", "Chennai", "600089", { isDefault: true })], createdAt: monthsAgo(45), updatedAt: monthsAgo(45) },
  { id: "C6", customerCode: "CUST-1006", customerName: "Apex Controls", panNumber: "AAHFA7788C", email: "info@apexcontrols.com", phone: "+91 90210 88213", customerType: "B2B", isActive: true, isVendor: false, gstRegistrations: [], createdAt: monthsAgo(1), updatedAt: monthsAgo(1) },
  { id: "C7", customerCode: "CUST-1007", customerName: "Nimbus Cold Chain", panNumber: "AAECN3344B", email: "purchase@nimbuscc.in", phone: "+91 99870 45210", customerType: "B2B", isActive: false, isVendor: false, gstRegistrations: [reg("G8", "C7", "24AAECN3344B1Z9", "Nimbus Cold Chain LLP", "24", "Gujarat", "Surat", "395003", { isActive: false })], deactivatedAt: daysAgo(30), deactivatedById: "U1", deactivatedByName: "Anita S.", deactivationReason: "Ceased trading; account closed.", createdAt: monthsAgo(18), updatedAt: daysAgo(30) },
  { id: "C8", customerCode: "CUST-1008", customerName: "Reliance Industries", panNumber: "AAACR5055K", email: "vendor.dev@ril.com", phone: "+91 98200 11223", customerType: "B2B", isActive: true, isVendor: true, linkedVendorId: "V1", gstRegistrations: [reg("G9", "C8", "27AAACR5055K1Z8", "Reliance Industries Ltd", "27", "Maharashtra", "Mumbai", "400021", { isDefault: true })], createdAt: monthsAgo(64), updatedAt: monthsAgo(64) },
];

// History as the backend would hold it: only C1 was created after the history
// existed, and C7's deactivation was recorded.
export const SEED_CUSTOMER_EVENTS: CustomerEvent[] = [
  { id: "CE1", customerId: "C1", action: "CUSTOMER_CREATED", toStatus: "ACTIVE", actorName: "Anita S.", occurredAt: monthsAgo(6) },
  { id: "CE2", customerId: "C1", action: "GST_ADDED", toStatus: "ACTIVE", gstRegistration: { id: "G1", gstin: "08AABCG1234A1Z5", branchName: "Jaipur HQ", legalName: "GreenVolt Energy Pvt Ltd" }, actorName: "Anita S.", occurredAt: monthsAgo(6) },
  { id: "CE3", customerId: "C1", action: "OPPORTUNITY_LINKED", opportunityId: "O1", remarks: "5MW Rooftop EPC — GreenVolt", actorName: "Anita S.", occurredAt: daysAgo(5) },
  { id: "CE4", customerId: "C7", action: "CUSTOMER_DEACTIVATED", fromStatus: "ACTIVE", toStatus: "INACTIVE", remarks: "Ceased trading; account closed.", actorName: "Anita S.", occurredAt: daysAgo(30) },
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
  { id: "O1", leadId: "L2", title: "5MW Rooftop EPC — GreenVolt", customerName: "GreenVolt Energy", stage: "PROPOSAL", expectedValue: 6_400_000, probability: 60, expectedCloseDate: daysFromNow(20), ownerName: "Anita S.", createdAt: daysAgo(5), customerId: "C1", customer: { id: "C1", customerCode: "CUST-000001", customerName: "GreenVolt Energy", isActive: true } },
  { id: "O2", leadId: "L1", title: "Hydraulic Systems Upgrade", customerName: "Sterling Pumps", stage: "NEGOTIATION", expectedValue: 1_840_000, probability: 75, expectedCloseDate: daysFromNow(10), ownerName: "Rohit M.", createdAt: daysAgo(8), customerId: "C4", customer: { id: "C4", customerCode: "CUST-1004", customerName: "Sterling Pumps", isActive: true } },
  { id: "O3", leadId: "L6", title: "Factory Automation Retrofit", customerName: "JSW Steel", stage: "NEGOTIATION", expectedValue: 8_800_000, probability: 70, expectedCloseDate: daysFromNow(15), ownerName: "Rohit M.", createdAt: daysAgo(7), customerId: "C2", customer: { id: "C2", customerCode: "CUST-1002", customerName: "JSW Steel", isActive: true } },
  { id: "O4", leadId: "L7", title: "Control Room Equipment", customerName: "L&T Infra", stage: "PROPOSAL", expectedValue: 3_600_000, probability: 50, expectedCloseDate: daysFromNow(25), ownerName: "Anita S.", createdAt: daysAgo(6) },
  { id: "O5", leadId: "L8", title: "Rooftop Solar — Phase 1", customerName: "Adani Green", stage: "PROPOSAL", expectedValue: 11_000_000, probability: 55, expectedCloseDate: daysFromNow(30), ownerName: "Vikram J.", createdAt: daysAgo(8) },
  { id: "O6", leadId: "L9", title: "Bulk Procurement Contract", customerName: "Reliance Industries", stage: "QUALIFIED", expectedValue: 4_200_000, probability: 35, expectedCloseDate: daysFromNow(35), ownerName: "Anita S.", createdAt: daysAgo(9), customerId: "C8", customer: { id: "C8", customerCode: "CUST-1008", customerName: "Reliance Industries", isActive: true } },
  { id: "O7", leadId: "L10", title: "Warehouse Automation", customerName: "Tata Projects", stage: "QUALIFIED", expectedValue: 2_850_000, probability: 35, expectedCloseDate: daysFromNow(38), ownerName: "Rohit M.", createdAt: daysAgo(10) },
  { id: "O8", leadId: "L5", title: "Switchgear Replacement Order", customerName: "Havells India", stage: "WON", expectedValue: 5_200_000, probability: 100, expectedCloseDate: daysAgo(6), ownerName: "Priya N.", createdAt: daysAgo(13), customerId: "C3", customer: { id: "C3", customerCode: "CUST-1003", customerName: "Havells India", isActive: true } },
];

// ---------------------------------------------------------------------------
// QUOTATIONS
// ---------------------------------------------------------------------------
// QUOTATIONS
// Statuses follow the backend lifecycle (DRAFT, REVISED, APPROVED, REJECTED).
// Amounts follow the backend's rules with a stand-in 18% GST rate (the mock has
// no HSN master): GST = taxable x 18%, total = taxable + GST. Q8 is a LEGACY
// quotation, approved before the lifecycle existed with no stored tax breakdown
// (taxable and GST are 0 while the total is not); the backend will not revise or
// approve such a row, and it has no lifecycle history. Q9 is approved with only
// a cancelled Proforma behind it, so a new Proforma can be created. Q10 is
// approved with an old Proforma that has since expired.
// ---------------------------------------------------------------------------
const gst18 = (taxable: number) => ({ taxableAmount: taxable, gstPercent: 18, gstAmount: Math.round(taxable * 18) / 100, totalAmount: taxable + Math.round(taxable * 18) / 100 });
export const SEED_QUOTATIONS: Quotation[] = [
  { id: "Q1", quoteNo: "QT-3398", customerName: "GreenVolt Energy", opportunityId: "O1", opportunityName: "5MW Rooftop EPC — GreenVolt", amount: 5_900_000, ...gst18(5_000_000), taxType: "IGST", status: "DRAFT", ownerName: "Anita S.", createdAt: daysAgo(4), quoteDate: daysAgo(4) },
  { id: "Q2", quoteNo: "QT-3402", customerName: "Sterling Pumps", opportunityId: "O2", opportunityName: "Hydraulic Systems Upgrade", amount: 1_770_000, ...gst18(1_500_000), taxType: "CGST_SGST", status: "REVISED", ownerName: "Rohit M.", createdAt: daysAgo(6), quoteDate: daysAgo(6) },
  { id: "Q3", quoteNo: "QT-3390", customerName: "JSW Steel", opportunityId: "O3", opportunityName: "Factory Automation Retrofit", amount: 8_496_000, ...gst18(7_200_000), taxType: "IGST", status: "APPROVED", ownerName: "Rohit M.", createdAt: daysAgo(5), quoteDate: daysAgo(5) },
  { id: "Q4", quoteNo: "QT-3379", customerName: "L&T Infra", opportunityId: "O4", opportunityName: "Control Room Equipment", amount: 3_540_000, ...gst18(3_000_000), taxType: "IGST", status: "DRAFT", ownerName: "Anita S.", createdAt: daysAgo(1), quoteDate: daysAgo(1) },
  { id: "Q5", quoteNo: "QT-3406", customerName: "Adani Green", opportunityId: "O5", opportunityName: "Rooftop Solar — Phase 1", amount: 10_620_000, ...gst18(9_000_000), taxType: "IGST", status: "REVISED", ownerName: "Vikram J.", createdAt: daysAgo(7), quoteDate: daysAgo(7) },
  { id: "Q6", quoteNo: "QT-3371", customerName: "Reliance Industries", opportunityId: "O6", opportunityName: "Bulk Procurement Contract", amount: 4_248_000, ...gst18(3_600_000), taxType: "IGST", status: "REJECTED", ownerName: "Anita S.", createdAt: daysAgo(9), quoteDate: daysAgo(9) },
  { id: "Q7", quoteNo: "QT-3415", customerName: "Tata Projects", opportunityId: "O7", opportunityName: "Warehouse Automation", amount: 2_832_000, ...gst18(2_400_000), taxType: "CGST_SGST", status: "APPROVED", ownerName: "Rohit M.", createdAt: daysAgo(1), quoteDate: daysAgo(1) },
  { id: "Q8", quoteNo: "QT-3385", customerName: "Havells India", opportunityId: "O8", opportunityName: "Switchgear Replacement Order", amount: 5_200_000, taxableAmount: 0, gstPercent: 0, gstAmount: 0, totalAmount: 5_200_000, status: "APPROVED", ownerName: "Priya N.", createdAt: daysAgo(8), quoteDate: daysAgo(8) },
  { id: "Q9", quoteNo: "QT-3410", customerName: "Sterling Pumps", opportunityId: "O2", opportunityName: "Hydraulic Systems Upgrade", amount: 1_180_000, ...gst18(1_000_000), taxType: "CGST_SGST", status: "APPROVED", ownerName: "Rohit M.", createdAt: daysAgo(12), quoteDate: daysAgo(12) },
  { id: "Q10", quoteNo: "QT-3377", customerName: "Reliance Industries", opportunityId: "O6", opportunityName: "Bulk Procurement Contract", amount: 2_360_000, ...gst18(2_000_000), taxType: "IGST", status: "APPROVED", ownerName: "Anita S.", createdAt: daysAgo(20), quoteDate: daysAgo(20) },
];

// Lifecycle history, as the backend would hold it for quotations created after
// the lifecycle existed. Q8 (a legacy row) deliberately has none.
export const SEED_QUOTATION_EVENTS: QuotationEvent[] = [
  { id: "QE1", quotationId: "Q1", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 5_000_000, newTotalAmount: 5_900_000, actorName: "Anita S.", occurredAt: daysAgo(4) },
  { id: "QE2", quotationId: "Q2", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 1_600_000, newTotalAmount: 1_888_000, actorName: "Rohit M.", occurredAt: daysAgo(6) },
  { id: "QE3", quotationId: "Q2", action: "QUOTATION_REVISED", fromStatus: "DRAFT", toStatus: "REVISED", remarks: "8% discount approved to close the deal faster", previousTaxableAmount: 1_600_000, newTaxableAmount: 1_500_000, previousTotalAmount: 1_888_000, newTotalAmount: 1_770_000, actorName: "Rohit M.", occurredAt: daysAgo(3) },
  { id: "QE4", quotationId: "Q3", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 7_200_000, newTotalAmount: 8_496_000, actorName: "Rohit M.", occurredAt: daysAgo(5) },
  { id: "QE5", quotationId: "Q3", action: "QUOTATION_APPROVED", fromStatus: "DRAFT", toStatus: "APPROVED", remarks: "Commercials agreed with the customer", actorName: "Meera K.", occurredAt: daysAgo(4) },
  { id: "QE6", quotationId: "Q4", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 3_000_000, newTotalAmount: 3_540_000, actorName: "Anita S.", occurredAt: daysAgo(1) },
  { id: "QE7", quotationId: "Q5", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 9_500_000, newTotalAmount: 11_210_000, actorName: "Vikram J.", occurredAt: daysAgo(7) },
  { id: "QE8", quotationId: "Q5", action: "QUOTATION_REVISED", fromStatus: "DRAFT", toStatus: "REVISED", remarks: "Scope trimmed to Phase 1 only", previousTaxableAmount: 9_500_000, newTaxableAmount: 9_000_000, previousTotalAmount: 11_210_000, newTotalAmount: 10_620_000, actorName: "Vikram J.", occurredAt: daysAgo(2) },
  { id: "QE9", quotationId: "Q6", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 3_600_000, newTotalAmount: 4_248_000, actorName: "Anita S.", occurredAt: daysAgo(9) },
  { id: "QE10", quotationId: "Q6", action: "QUOTATION_REJECTED", fromStatus: "DRAFT", toStatus: "REJECTED", remarks: "Customer went with another vendor", actorName: "Meera K.", occurredAt: daysAgo(6) },
  { id: "QE11", quotationId: "Q7", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 2_400_000, newTotalAmount: 2_832_000, actorName: "Rohit M.", occurredAt: daysAgo(1) },
  { id: "QE12", quotationId: "Q7", action: "QUOTATION_APPROVED", fromStatus: "DRAFT", toStatus: "APPROVED", actorName: "Meera K.", occurredAt: daysAgo(1) },
  { id: "QE13", quotationId: "Q9", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 1_000_000, newTotalAmount: 1_180_000, actorName: "Rohit M.", occurredAt: daysAgo(12) },
  { id: "QE14", quotationId: "Q9", action: "QUOTATION_APPROVED", fromStatus: "DRAFT", toStatus: "APPROVED", actorName: "Meera K.", occurredAt: daysAgo(11) },
  { id: "QE15", quotationId: "Q10", action: "QUOTATION_CREATED", toStatus: "DRAFT", newTaxableAmount: 2_000_000, newTotalAmount: 2_360_000, actorName: "Anita S.", occurredAt: daysAgo(20) },
  { id: "QE16", quotationId: "Q10", action: "QUOTATION_APPROVED", fromStatus: "DRAFT", toStatus: "APPROVED", actorName: "Meera K.", occurredAt: daysAgo(19) },
];

// ---------------------------------------------------------------------------
// PROFORMA INVOICES
// One active (not cancelled) Proforma per quotation, always at the quotation's
// total. PF1 approved (with a Sales Order behind it), PF2 pending, PF3 cancelled
// (so Q9 can get a new one), PF4 an old approved Proforma that has expired and
// has no history or order (a legacy row; it can still be cancelled). Q8, a
// legacy quotation, has no Proforma at all: its only downstream document is the
// legacy order SO2.
// ---------------------------------------------------------------------------
export const SEED_PROFORMA_INVOICES: ProformaInvoice[] = [
  { id: "PF1", proformaNumber: "PI-1042", quotationId: "Q3", quoteNo: "QT-3390", customerName: "JSW Steel", opportunityId: "O3", opportunityName: "Factory Automation Retrofit", issueDate: daysAgo(4), totalAmount: 8_496_000, status: "APPROVED", validityDate: daysFromNow(10), isExpired: false, remarks: "Final commercial confirmation before Sales Order.", ownerName: "Rohit M.", createdAt: daysAgo(4) },
  { id: "PF2", proformaNumber: "PI-1058", quotationId: "Q7", quoteNo: "QT-3415", customerName: "Tata Projects", opportunityId: "O7", opportunityName: "Warehouse Automation", issueDate: daysAgo(1), totalAmount: 2_832_000, status: "PENDING", validityDate: daysFromNow(20), isExpired: false, ownerName: "Rohit M.", createdAt: daysAgo(1) },
  { id: "PF3", proformaNumber: "PI-1031", quotationId: "Q9", quoteNo: "QT-3410", customerName: "Sterling Pumps", opportunityId: "O2", opportunityName: "Hydraulic Systems Upgrade", issueDate: daysAgo(10), totalAmount: 1_180_000, status: "CANCELLED", validityDate: daysFromNow(5), isExpired: false, remarks: "Issued with the wrong delivery terms.", ownerName: "Rohit M.", createdAt: daysAgo(10) },
  { id: "PF4", proformaNumber: "PI-1019", quotationId: "Q10", quoteNo: "QT-3377", customerName: "Reliance Industries", opportunityId: "O6", opportunityName: "Bulk Procurement Contract", issueDate: daysAgo(19), totalAmount: 2_360_000, status: "APPROVED", validityDate: daysAgo(5), isExpired: true, ownerName: "Anita S.", createdAt: daysAgo(19) },
];

// PF4 predates the lifecycle, so it has no history.
export const SEED_PROFORMA_EVENTS: ProformaEvent[] = [
  { id: "PE1", proformaInvoiceId: "PF1", action: "PROFORMA_CREATED", toStatus: "PENDING", actorName: "Rohit M.", occurredAt: daysAgo(4) },
  { id: "PE2", proformaInvoiceId: "PF1", action: "PROFORMA_APPROVED", fromStatus: "PENDING", toStatus: "APPROVED", remarks: "Customer signed the Proforma", actorName: "Meera K.", occurredAt: daysAgo(3) },
  { id: "PE3", proformaInvoiceId: "PF2", action: "PROFORMA_CREATED", toStatus: "PENDING", actorName: "Rohit M.", occurredAt: daysAgo(1) },
  { id: "PE4", proformaInvoiceId: "PF3", action: "PROFORMA_CREATED", toStatus: "PENDING", actorName: "Rohit M.", occurredAt: daysAgo(10) },
  { id: "PE5", proformaInvoiceId: "PF3", action: "PROFORMA_CANCELLED", fromStatus: "PENDING", toStatus: "CANCELLED", remarks: "Wrong delivery terms; re-issuing", actorName: "Meera K.", occurredAt: daysAgo(9) },
];

// ---------------------------------------------------------------------------
// SALES ORDERS
// SO1 comes from the approved PF1 (POST /sales-orders, the only way an order is
// created today). SO2 is a LEGACY order: it was created straight from the
// approved quotation Q8 by the retired conversion (status OPEN, quotationId only,
// no Proforma). It is left as it is; it still counts as a live order against Q8.
// ---------------------------------------------------------------------------
export const SEED_SALES_ORDERS: SalesOrder[] = [
  {
    id: "SO1",
    salesOrderCode: "SO-5201",
    orderDate: daysAgo(3),
    totalAmount: 8_496_000,
    status: "PENDING_STORE_APPROVAL",
    proformaInvoiceId: "PF1",
    proformaNumber: "PI-1042",
    quotationId: "Q3",
    quoteNo: "QT-3390",
    opportunityId: "O3",
    opportunityName: "Factory Automation Retrofit",
    customerName: "JSW Steel",
    ownerName: "Rohit M.",
    createdAt: daysAgo(3),
  },
  {
    id: "SO2",
    salesOrderCode: "SO-5187",
    orderDate: daysAgo(6),
    totalAmount: 5_200_000,
    status: "OPEN",
    quotationId: "Q8",
    quoteNo: "QT-3385",
    opportunityId: "O8",
    opportunityName: "Switchgear Replacement Order",
    customerName: "Havells India",
    ownerName: "Priya N.",
    createdAt: daysAgo(6),
  },
  // SO3/SO4 model the READY_FOR_INVOICING status the real Dispatch Orders
  // service writes once its markDispatched() runs — see SEED_DISPATCH_ORDERS
  // below. SO3 has no invoice yet (exercises the Create Sales Invoice flow
  // from a clean state); SO4 already has one (SEED_SALES_INVOICES) to
  // demonstrate the Related Sales Invoices panel with real-shaped data.
  {
    id: "SO3",
    salesOrderCode: "SO-5299",
    orderDate: daysAgo(10),
    totalAmount: 2_850_000,
    status: "READY_FOR_INVOICING",
    quotationId: "Q7",
    quoteNo: "QT-3415",
    opportunityId: "O7",
    opportunityName: "Warehouse Automation",
    customerName: "Tata Projects",
    ownerName: "Rohit M.",
    createdAt: daysAgo(10),
  },
  {
    id: "SO4",
    salesOrderCode: "SO-5240",
    orderDate: daysAgo(12),
    totalAmount: 11_000_000,
    status: "READY_FOR_INVOICING",
    quotationId: "Q5",
    quoteNo: "QT-3406",
    opportunityId: "O5",
    opportunityName: "Rooftop Solar — Phase 1",
    customerName: "Adani Green",
    ownerName: "Vikram J.",
    createdAt: daysAgo(12),
  },
];

// ---------------------------------------------------------------------------
// DISPATCH ORDERS
// Read-only lookup data (see DispatchOrderOption) — no mock Dispatch Order
// management exists, only enough to power the "pick a DISPATCHED order"
// step of Sales Invoice creation. DO3 models a not-yet-dispatched order so
// the create action's gating has a real negative case to exercise too.
// ---------------------------------------------------------------------------
export const SEED_DISPATCH_ORDERS: DispatchOrderOption[] = [
  {
    id: "DO1",
    dispatchOrderNo: "DO-88031",
    status: "DISPATCHED",
    salesOrderId: "SO3",
    dispatchDate: daysAgo(2),
    transportName: "Shree Cargo Movers",
    vehicleNumber: "GJ01AB4321",
    driverName: "Manoj Patel",
    lrNumber: "LR-99201",
    destination: "Vadodara",
    expectedDelivery: daysAgo(0),
  },
  {
    id: "DO2",
    dispatchOrderNo: "DO-88022",
    status: "DISPATCHED",
    salesOrderId: "SO4",
    dispatchDate: daysAgo(5),
    transportName: "VRL Logistics",
    vehicleNumber: "MH12CD8890",
    driverName: "Suresh Yadav",
    lrNumber: "LR-99187",
    destination: "Pune",
    expectedDelivery: daysAgo(2),
  },
  { id: "DO3", dispatchOrderNo: "DO-88040", status: "LOGISTICS_PREPARING", salesOrderId: "SO1", dispatchDate: null },
];

// ---------------------------------------------------------------------------
// SALES INVOICES
// Only SO4/DO2 has one seeded — SO3/DO1 are intentionally left uninvoiced so
// Create Sales Invoice has a real empty case to exercise from Sales Order
// Detail. Mirrors the real backend's flat 18% GST assumption (taxableAmount
// is the sales order's own totalAmount, not a real HSN-rate calculation).
// ---------------------------------------------------------------------------
export const SEED_SALES_INVOICES: SalesInvoice[] = [
  {
    id: "SI1",
    invoiceNumber: "SI-7701",
    salesOrderId: "SO4",
    salesOrderCode: "SO-5240",
    quotationId: "Q5",
    quoteNo: "QT-3406",
    opportunityId: "O5",
    opportunityName: "Rooftop Solar — Phase 1",
    dispatchOrderId: "DO2",
    dispatchOrderNo: "DO-88022",
    dispatchStatus: "DISPATCHED",
    dispatchTransportName: "VRL Logistics",
    dispatchVehicleNumber: "MH12CD8890",
    dispatchDriverName: "Suresh Yadav",
    dispatchLrNumber: "LR-99187",
    dispatchDestination: "Pune",
    dispatchExpectedDelivery: daysAgo(2),
    customerName: "Adani Green",
    ownerName: "Vikram J.",
    invoiceDate: daysAgo(4),
    taxableAmount: 11_000_000,
    gstAmount: 1_980_000,
    totalAmount: 12_980_000,
    status: "POSTED",
    paymentStatus: "PENDING",
    remarks: "Final invoice after dispatch confirmation.",
    createdAt: daysAgo(4),
  },
  // DEMO DATA for the Collections screens (mock mode only, clearly not real records). They are
  // attached to existing mock orders so the cockpit finds them; the amounts are made up.
  // SI1 above belongs to a deal with no customer linked (the "not linked" case).
  ...[
    { id: "SI2", so: "SO2", code: "SO-5288", opp: "O8", oppName: "Switchgear Replacement Order", name: "Havells India", owner: "Priya N.", ago: 45, taxable: 5_200_000 },
    { id: "SI3", so: "SO1", code: "SO-5276", opp: "O3", oppName: "Factory Automation Retrofit", name: "JSW Steel", owner: "Rohit M.", ago: 1, taxable: 1_000_000 },
    { id: "SI4", so: "SO2", code: "SO-5288", opp: "O8", oppName: "Switchgear Replacement Order", name: "Havells India", owner: "Priya N.", ago: 20, taxable: 500_000 },
    { id: "SI5", so: "SO1", code: "SO-5276", opp: "O3", oppName: "Factory Automation Retrofit", name: "JSW Steel", owner: "Rohit M.", ago: 70, taxable: 200_000 },
    { id: "SI6", so: "SO1", code: "SO-5276", opp: "O3", oppName: "Factory Automation Retrofit", name: "JSW Steel", owner: "Rohit M.", ago: 10, taxable: 423_729 },
  ].map(
    (d): SalesInvoice => ({
      id: d.id,
      invoiceNumber: `SI-77${d.id.slice(2)}0`,
      salesOrderId: d.so,
      salesOrderCode: d.code,
      opportunityId: d.opp,
      opportunityName: d.oppName,
      customerName: d.name,
      invoiceCustomerName: d.name,
      ownerName: d.owner,
      invoiceDate: daysAgo(d.ago),
      taxableAmount: d.taxable,
      gstAmount: Math.round(d.taxable * 0.18),
      totalAmount: Math.round(d.taxable * 1.18),
      status: "POSTED",
      paymentStatus: "PENDING",
      createdAt: daysAgo(d.ago),
    })
  ),
];

// ---------------------------------------------------------------------------
// ACCOUNTS RECEIVABLE & CUSTOMER LEDGER
// One AR record for SI1 (created alongside it, same as the real backend's
// sales-invoices.service.ts side effect), left fully PENDING/unpaid so
// Record Payment has a real, exercisable starting state. One matching
// ledger "Sales invoice posted" entry mirrors the real backend's own
// customerLedgerEntries side effect — Record Payment appends a "Payment
// received" credit entry on top of this, same pattern as the real
// MockPaymentCollectionRepository.
// ---------------------------------------------------------------------------
export const SEED_ACCOUNTS_RECEIVABLE: AccountsReceivable[] = [
  {
    id: "AR1",
    salesInvoiceId: "SI1",
    invoiceNumber: "SI-7701",
    customerName: "Adani Green",
    dueDate: daysFromNow(20),
    outstandingAmount: 12_980_000,
    paidAmount: 0,
    balanceAmount: 12_980_000,
    paymentStatus: "PENDING",
    createdAt: daysAgo(4),
  },
  // DEMO receivables for the Collections screens. Like the real ones, a receivable created with an
  // invoice has its due date set to the invoice's own date (SI2, SI4, SI5), which is why
  // SI2 shows as long overdue; SI3 and SI6 have a later due date.
  { id: "AR2", salesInvoiceId: "SI2", invoiceNumber: "SI-77200", customerName: "Havells India", dueDate: daysAgo(45), outstandingAmount: 6_136_000, paidAmount: 2_000_000, balanceAmount: 4_136_000, paymentStatus: "PARTIAL", createdAt: daysAgo(45) },
  { id: "AR3", salesInvoiceId: "SI3", invoiceNumber: "SI-77300", customerName: "JSW Steel", dueDate: daysFromNow(2), outstandingAmount: 1_180_000, paidAmount: 0, balanceAmount: 1_180_000, paymentStatus: "PENDING", createdAt: daysAgo(1) },
  { id: "AR4", salesInvoiceId: "SI4", invoiceNumber: "SI-77400", customerName: "Havells India", dueDate: daysAgo(20), outstandingAmount: 590_000, paidAmount: 590_000, balanceAmount: 0, paymentStatus: "PAID", createdAt: daysAgo(20) },
  { id: "AR5", salesInvoiceId: "SI5", invoiceNumber: "SI-77500", customerName: "JSW Steel", dueDate: daysAgo(70), outstandingAmount: 236_000, paidAmount: 0, balanceAmount: 0, paymentStatus: "WRITTEN_OFF", createdAt: daysAgo(70) },
  // The receivable's own figures disagree with themselves and with its payments: a case for "Needs review".
  { id: "AR6", salesInvoiceId: "SI6", invoiceNumber: "SI-77600", customerName: "JSW Steel", dueDate: daysFromNow(15), outstandingAmount: 500_000, paidAmount: 100_000, balanceAmount: 300_000, paymentStatus: "PENDING", createdAt: daysAgo(10) },
];

// DEMO payment collections and their events. The 2,000,000 on AR2 was recorded after payments were
// tracked (it has a recorder and an event); the one on AR4 predates that (no recorder, no event).
export const SEED_PAYMENT_COLLECTIONS: PaymentCollectionRecord[] = [
  { id: "PC-D1", accountsReceivableId: "AR2", paymentDate: daysAgo(30), amount: 2_000_000, paymentMode: "BANK_TRANSFER", referenceNumber: "UTR-DEMO-1", createdAt: daysAgo(30), recordedById: "mock-user", recordedByName: "Priya N." },
  { id: "PC-D2", accountsReceivableId: "AR4", paymentDate: daysAgo(18), amount: 590_000, paymentMode: "Bank Transfer", referenceNumber: "UTR-DEMO-2", remarks: "Customer payment received", createdAt: daysAgo(18) },
];

export const SEED_PAYMENT_EVENTS: PaymentCollectionEvent[] = [
  { id: "PE-D1", paymentCollectionId: "PC-D1", accountsReceivableId: "AR2", salesInvoiceId: "SI2", action: "PAYMENT_RECORDED", amount: 2_000_000, balanceBefore: 6_136_000, balanceAfter: 4_136_000, fromStatus: "PENDING", toStatus: "PARTIAL", actorId: "mock-user", actorName: "Priya N.", occurredAt: daysAgo(30) },
];

export const SEED_CUSTOMER_LEDGER: CustomerStatementEntry[] = [
  {
    id: "CL1",
    customerName: "Adani Green",
    salesInvoiceId: "SI1",
    debitAmount: 12_980_000,
    creditAmount: 0,
    balanceAmount: 12_980_000,
    entryDate: daysAgo(4),
    remarks: "Sales invoice posted SI1",
    createdAt: daysAgo(4),
  },
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
