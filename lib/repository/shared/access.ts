/**
 * Access administration (backend 1c701e3): roles, the permission codes they grant, who
 * holds them, and every change. A person's effective permissions are exactly their role's:
 * there are no per-user grants, so nothing can conflict. Changes are reviewed and applied
 * as one request (PATCH /roles/:id/permissions); the backend enforces hold-what-you-grant,
 * the explicit acknowledgement of sensitive codes, and that someone can always still
 * administer access. Logins carry their permissions until they expire (one day) or the
 * person signs in again.
 */

export interface AccessPermission {
  id: string;
  code: string;
  name: string;
  module: string;
}

export interface AccessRole {
  id: string;
  name: string;
  description?: string;
  permissionCodes: string[];
  userCount: number;
}

export type AccessUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface AccessUser {
  id: string;
  fullName: string;
  email: string;
  status: AccessUserStatus;
  roleId: string;
  roleName: string;
}

export interface AccessAuditEntry {
  id: string;
  action: string;
  actorName: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface RolePermissionChange {
  grant: string[];
  revoke: string[];
}

/** Mirrors SENSITIVE_PERMISSIONS in the backend (identity-admin.ts). Granting one needs an explicit confirmation. */
export const SENSITIVE_PERMISSIONS: readonly string[] = [
  "revenue.view.all",
  "finance.view.all",
  "payments.gateway.manage",
  "invoices.create",
  "invoices.document.view",
  "collections.record",
  "governance.deletions.view",
  "governance.deletions.restore",
  "governance.deletions.purge",
  "leads.delete",
  "customers.delete",
  "permissions.manage",
  "roles.create",
  "roles.permissions.assign",
  "roles.permissions.revoke",
  "users.create",
  "users.view",
  "users.role.assign",
  "users.status.manage",
  "whatsapp.config.view",
  "whatsapp.config.manage",
  "documents.profile.manage",
];

/**
 * A wider code that includes a narrower one (mirrors INCLUDED_BY in the backend): someone
 * holding revenue.view.all may grant finance.view.all without holding it themselves.
 */
export const INCLUDED_BY: Readonly<Record<string, readonly string[]>> = { "finance.view.all": ["revenue.view.all"] };

/** Holds the code itself, or a wider one that includes it. */
export function holds(held: ReadonlySet<string>, code: string): boolean {
  return held.has(code) || (INCLUDED_BY[code] ?? []).some((w) => held.has(w));
}

/** Codes held back by an earlier business decision: never part of a preset. */
export const GATED_PERMISSIONS: readonly string[] = ["invoices.create", "invoices.document.view"];

export const isSensitive = (code: string) => SENSITIVE_PERMISSIONS.includes(code);

/** What a code lets someone do, from its last part: view, create, edit, assign, delete, export, ... */
export function permissionKind(code: string): string {
  const last = code.split(".").pop() ?? "";
  if (code === "finance.view.all") return "See every financial record";
  if (["view", "all"].includes(last)) return code.endsWith("view.all") ? "See every record" : "View";
  if (["create", "record"].includes(last)) return "Create";
  if (["edit", "update", "manage"].includes(last)) return "Edit";
  if (["assign", "revoke", "qualify", "reject", "reopen", "approve", "cancel", "verify", "retract", "share"].includes(last)) return "Act";
  if (["delete", "purge", "deactivate", "restore"].includes(last)) return "Delete / restore";
  if (["export", "download"].includes(last)) return "Export";
  return "Other";
}

/** "leads.followups.create" -> "Leads". The area a code belongs to, for grouping. */
export function permissionArea(code: string): string {
  const first = code.split(".")[0];
  const AREA: Record<string, string> = {
    leads: "Leads",
    opportunities: "Opportunities",
    customers: "Customers",
    quotations: "Quotations",
    proformas: "Proforma Invoices",
    salesorders: "Sales Orders",
    invoices: "Sales Invoices",
    collections: "Collections",
    content: "Content Library",
    revenue: "Record visibility",
    finance: "Record visibility",
    payments: "Payment gateway",
    governance: "Recycle Bin",
    documents: "Documents",
    roles: "Access administration",
    permissions: "Access administration",
    users: "Access administration",
    whatsapp: "WhatsApp",
  };
  return AREA[first] ?? first.charAt(0).toUpperCase() + first.slice(1);
}

export interface PermissionGroup {
  area: string;
  permissions: AccessPermission[];
}

/** Permissions grouped by area (in a stable order), optionally narrowed by a search. */
export function groupPermissions(all: readonly AccessPermission[], search = ""): PermissionGroup[] {
  const q = search.trim().toLowerCase();
  const shown = q ? all.filter((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || permissionArea(p.code).toLowerCase().includes(q)) : [...all];
  const groups = new Map<string, AccessPermission[]>();
  for (const p of shown.sort((a, b) => a.code.localeCompare(b.code))) {
    const area = permissionArea(p.code);
    groups.set(area, [...(groups.get(area) ?? []), p]);
  }
  return [...groups.entries()].map(([area, permissions]) => ({ area, permissions })).sort((a, b) => a.area.localeCompare(b.area));
}

/** What saving would change: codes added and taken away, sorted. */
export function diffCodes(current: readonly string[], desired: ReadonlySet<string> | readonly string[]): RolePermissionChange {
  const want = new Set(desired);
  const have = new Set(current);
  return {
    grant: [...want].filter((c) => !have.has(c)).sort(),
    revoke: [...have].filter((c) => !want.has(c)).sort(),
  };
}

/**
 * Starting points for common jobs. They only fill in the boxes on screen: nothing is saved
 * until the person reviews the exact codes and confirms. None includes a sensitive or gated
 * code. Which jobs exist, and what they need, is a business decision; these are suggestions.
 */
export const ROLE_PRESETS: ReadonlyArray<{ key: string; label: string; description: string; codes: readonly string[] }> = [
  {
    key: "presales",
    label: "Pre-Sales",
    description: "Works new leads: contacts, qualifies or rejects them, logs calls and follow-ups, shares content.",
    codes: ["leads.view", "leads.create", "leads.edit", "leads.status.update", "leads.qualify", "leads.reject", "leads.followups.view", "leads.followups.create", "customers.view", "content.view", "content.share"],
  },
  {
    key: "sales",
    label: "Sales",
    description: "Works qualified leads and their deals: opportunities, customers, quotations.",
    codes: ["leads.view", "leads.edit", "leads.followups.view", "leads.followups.create", "opportunities.view", "opportunities.create", "opportunities.edit", "customers.view", "customers.create", "customers.edit", "quotations.view", "quotations.create", "quotations.edit", "proformas.view", "salesorders.view", "content.view", "content.share"],
  },
  {
    key: "readonly",
    label: "Read only",
    description: "Sees the records they work on; changes nothing.",
    codes: ["leads.view", "leads.followups.view", "opportunities.view", "customers.view", "quotations.view", "proformas.view", "salesorders.view", "content.view"],
  },
];

const AUDIT_LABEL: Record<string, string> = {
  USER_CREATED: "User created",
  ROLE_CREATED: "Role created",
  PERMISSION_CREATED: "Permission created",
  ROLE_PERMISSION_ASSIGNED: "Permission granted",
  ROLE_PERMISSION_REVOKED: "Permission revoked",
  USER_ROLE_CHANGED: "Role changed",
  USER_STATUS_CHANGED: "Status changed",
};

/** One line for an access change, from its recorded data (codes, names and ids only). */
export function describeAuditEntry(e: AccessAuditEntry): { title: string; detail: string } {
  const d = e.data;
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const title = AUDIT_LABEL[e.action] ?? e.action;
  switch (e.action) {
    case "ROLE_PERMISSION_ASSIGNED":
      return { title, detail: `${s("permissionCode")} to ${s("roleName")}` };
    case "ROLE_PERMISSION_REVOKED":
      return { title, detail: `${s("permissionCode")} from ${s("roleName")}` };
    case "USER_ROLE_CHANGED":
      return { title, detail: `${s("fullName")}: ${s("fromRoleName")} → ${s("toRoleName")}` };
    case "USER_STATUS_CHANGED":
      return { title, detail: `${s("fullName")}: ${s("from").toLowerCase()} → ${s("to").toLowerCase()}${s("reason") ? ` (${s("reason")})` : ""}` };
    case "USER_CREATED":
      return { title, detail: `${s("fullName")} as ${s("roleName")}` };
    case "ROLE_CREATED":
      return { title, detail: s("name") };
    default:
      return { title, detail: "" };
  }
}
