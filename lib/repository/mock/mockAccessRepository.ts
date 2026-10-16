import { ID } from "../../types/common";
import { IAccessRepository } from "../interfaces";
import { delay } from "./queryUtils";
import { mockId } from "./entityStore";
import { MOCK_ASSIGNABLE_USERS } from "./mockUserRepository";
import { ROLE_PRESETS, SENSITIVE_PERMISSIONS, isSensitive } from "../shared/access";
import type { AccessAuditEntry, AccessPermission, AccessRole, AccessUser, AccessUserStatus, RolePermissionChange } from "../shared/access";

// Mock access data with the backend's rules (sensitive acknowledgement, no lockout, no
// self change). The mock user is the administrator and holds everything.
const CODES = [
  ...new Set([
    ...ROLE_PRESETS.flatMap((p) => p.codes),
    ...SENSITIVE_PERMISSIONS,
    "leads.assign", "leads.reopen", "leads.deactivate", "opportunities.edit", "proformas.create", "salesorders.create", "content.manage", "roles.view",
  ]),
].sort();
const permissions: AccessPermission[] = CODES.map((code) => ({ id: `P-${code}`, code, name: code, module: code.split(".")[0] }));
const roles: AccessRole[] = [
  { id: "R-ADMIN", name: "SUPER_ADMIN", description: "Everything", permissionCodes: [...CODES], userCount: 1 },
  { id: "R-SALES", name: "SALES", permissionCodes: [...ROLE_PRESETS.find((p) => p.key === "sales")!.codes], userCount: 0 },
];
const users: AccessUser[] = MOCK_ASSIGNABLE_USERS.map((u, i) => ({
  id: u.id,
  fullName: u.name,
  email: `${u.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.test`,
  status: u.active ? "ACTIVE" : "INACTIVE",
  roleId: i === 0 ? "R-ADMIN" : "R-SALES",
  roleName: i === 0 ? "SUPER_ADMIN" : "SALES",
}));
const audit: AccessAuditEntry[] = [];
const count = () => roles.forEach((r) => (r.userCount = users.filter((u) => u.roleId === r.id).length));
count();
const log = (action: string, data: Record<string, unknown>) => audit.unshift({ id: mockId("A"), action, actorName: "You", createdAt: new Date().toISOString(), data });
const adminRemains = () =>
  users.some((u) => u.status === "ACTIVE" && roles.find((r) => r.id === u.roleId)?.permissionCodes.includes("roles.permissions.assign"));

export class MockAccessRepository implements IAccessRepository {
  async listRoles() {
    return delay(roles.map((r) => ({ ...r, permissionCodes: [...r.permissionCodes] })));
  }
  async listPermissions() {
    return delay([...permissions]);
  }
  async listUsers() {
    return delay(users.map((u) => ({ ...u })));
  }
  async updateRolePermissions(roleId: ID, change: RolePermissionChange, acknowledgeSensitive: boolean) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) throw new Error("Role not found.");
    const sensitive = change.grant.filter(isSensitive);
    if (sensitive.length && !acknowledgeSensitive) throw new Error(`These permissions are sensitive and must be confirmed: ${sensitive.join(", ")}.`);
    const before = [...role.permissionCodes];
    role.permissionCodes = [...new Set([...role.permissionCodes.filter((c) => !change.revoke.includes(c)), ...change.grant])].sort();
    if (!adminRemains()) {
      role.permissionCodes = before;
      throw new Error("This would leave no active user who can assign permissions (roles.permissions.assign), so nobody could administer access any more. Nothing was changed.");
    }
    for (const c of change.grant) log("ROLE_PERMISSION_ASSIGNED", { roleName: role.name, permissionCode: c });
    for (const c of change.revoke) log("ROLE_PERMISSION_REVOKED", { roleName: role.name, permissionCode: c });
    return delay({ ...role, permissionCodes: [...role.permissionCodes] });
  }
  async changeUserRole(userId: ID, roleId: ID) {
    const user = users.find((u) => u.id === userId);
    const role = roles.find((r) => r.id === roleId);
    if (!user || !role) throw new Error("Not found.");
    if (user.id === users[0].id) throw new Error("You cannot change your own role.");
    const from = user.roleName;
    Object.assign(user, { roleId: role.id, roleName: role.name });
    count();
    log("USER_ROLE_CHANGED", { fullName: user.fullName, fromRoleName: from, toRoleName: role.name });
    return delay({ ...user });
  }
  async changeUserStatus(userId: ID, status: AccessUserStatus, reason?: string) {
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error("User not found.");
    if (user.id === users[0].id) throw new Error("You cannot change your own status.");
    const from = user.status;
    user.status = status;
    if (!adminRemains()) {
      user.status = from;
      throw new Error("This would leave no active user who can assign permissions. Nothing was changed.");
    }
    log("USER_STATUS_CHANGED", { fullName: user.fullName, from, to: status, ...(reason ? { reason } : {}) });
    return delay({ ...user });
  }
  async listAudit() {
    return delay([...audit]);
  }
}
