export interface NavItem {
  href: string;
  label: string;
  icon: string;
  countKey?: "leadsCount" | "openTasksCount" | "unreadNotificationsCount" | "opportunitiesCount" | "quotationsCount" | "customersCount" | "contactsCount" | "notesCount";
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Regrouped around the revenue process rather than a flat module list:
 * Pipeline (winning the deal) is now separate from Quote to Cash
 * (fulfilling it) — Quotations moves into the latter as the first of
 * several document stages that later stages will add (Proforma Invoices,
 * Sales Orders, Sales Invoices, Payments). Nothing here is a route that
 * doesn't already exist; this is a labeling/grouping change only.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "chart" }],
  },
  {
    label: "Pipeline",
    items: [
      { href: "/leads", label: "Leads", icon: "funnel", countKey: "leadsCount" },
      { href: "/pipeline", label: "Lead Pipeline", icon: "target" },
      { href: "/opportunities", label: "Opportunities", icon: "brief", countKey: "opportunitiesCount" },
    ],
  },
  {
    label: "Quote to Cash",
    items: [
      { href: "/quotations", label: "Quotations", icon: "file", countKey: "quotationsCount" },
      { href: "/proforma-invoices", label: "Proforma Invoices", icon: "receipt" },
      { href: "/sales-orders", label: "Sales Orders", icon: "cart" },
      { href: "/sales-invoices", label: "Sales Invoices", icon: "file" },
      { href: "/payments", label: "Payments", icon: "cash" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { href: "/customers", label: "Customers", icon: "building", countKey: "customersCount" },
      { href: "/contacts", label: "Contacts", icon: "users", countKey: "contactsCount" },
    ],
  },
  {
    label: "Activity",
    items: [
      { href: "/activities", label: "Activities", icon: "pulse" },
      { href: "/tasks", label: "Tasks", icon: "checksq", countKey: "openTasksCount" },
      { href: "/notes", label: "Notes", icon: "notepad", countKey: "notesCount" },
    ],
  },
  {
    label: "Analytics",
    items: [{ href: "/reports", label: "Reports", icon: "barChart" }],
  },
  {
    label: "System",
    items: [
      { href: "/notifications", label: "Notifications", icon: "bell", countKey: "unreadNotificationsCount" },
      { href: "/search", label: "Search", icon: "search" },
    ],
  },
];

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your pipeline, today\u2019s activity and what needs attention across RevenueOS.",
  },
  leads: { title: "Leads", subtitle: "Every inbound and outbound lead, from first contact to qualification." },
  pipeline: { title: "Lead Pipeline", subtitle: "Visual, stage-by-stage view of every open deal in motion." },
  customers: { title: "Customers", subtitle: "Converted accounts — lifetime value, order history and account health." },
  contacts: { title: "Contacts", subtitle: "Every individual you deal with, across leads and customer accounts." },
  activities: { title: "Activities", subtitle: "A unified log of every call, email, meeting and message across RevenueOS." },
  tasks: { title: "Follow-ups / Tasks", subtitle: "What needs doing, grouped by urgency, so nothing slips through." },
  notes: { title: "Notes", subtitle: "Context and institutional memory attached to leads and accounts." },
  opportunities: { title: "Opportunities", subtitle: "Qualified, forecastable deals — value, probability and expected close." },
  quotations: { title: "Quotations", subtitle: "Every quote sent, its status, and how close it is to becoming revenue." },
  notifications: { title: "Notifications", subtitle: "Everything that needs your attention, in one feed." },
  search: { title: "Search", subtitle: "Find any lead, customer, contact, quotation or note in RevenueOS." },
  "proforma-invoices": { title: "Proforma Invoices", subtitle: "Generated from approved quotations, ahead of a sales order." },
  "sales-orders": { title: "Sales Orders", subtitle: "Multi-gate approval workflow." },
  "sales-invoices": { title: "Sales Invoices", subtitle: "Raised once a sales order is dispatched." },
  payments: { title: "Payments", subtitle: "Payment collections and collection reminders." },
  reports: { title: "Reports", subtitle: "Funnel, revenue, conversion and performance reports." },
};
