import { ID } from "../../types/common";
import { IAccessRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import type { AccessAuditEntry, AccessPermission, AccessRole, AccessUser, AccessUserStatus, RolePermissionChange } from "../shared/access";

type BackendRole = {
  id: string;
  name: string;
  description?: string | null;
  userCount?: number;
  permissions?: Array<{ permission: { code: string } }>;
};
type BackendDirectoryUser = {
  id: string;
  fullName: string;
  email: string;
  status: AccessUserStatus;
  roleId: string;
  role?: { id: string; name: string } | null;
};

const mapRole = (r: BackendRole): AccessRole => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  permissionCodes: (r.permissions ?? []).map((p) => p.permission.code).sort(),
  userCount: r.userCount ?? 0,
});
const mapUser = (u: BackendDirectoryUser): AccessUser => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  status: u.status,
  roleId: u.roleId,
  roleName: u.role?.name ?? "",
});

export class RealAccessRepository implements IAccessRepository {
  async listRoles(): Promise<AccessRole[]> {
    return (await apiFetch<BackendRole[]>("/roles")).map(mapRole);
  }

  async listPermissions(): Promise<AccessPermission[]> {
    return apiFetch<AccessPermission[]>("/permissions");
  }

  async listUsers(): Promise<AccessUser[]> {
    return (await apiFetch<BackendDirectoryUser[]>("/users")).map(mapUser);
  }

  async updateRolePermissions(roleId: ID, change: RolePermissionChange, acknowledgeSensitive: boolean): Promise<AccessRole> {
    const res = await apiFetch<{ role: BackendRole }>(`/roles/${roleId}/permissions`, {
      method: "PATCH",
      body: {
        ...(change.grant.length ? { grant: change.grant } : {}),
        ...(change.revoke.length ? { revoke: change.revoke } : {}),
        ...(acknowledgeSensitive ? { acknowledgeSensitive: true } : {}),
      },
    });
    return mapRole(res.role);
  }

  async changeUserRole(userId: ID, roleId: ID): Promise<AccessUser> {
    return mapUser(await apiFetch<BackendDirectoryUser>(`/users/${userId}/role`, { method: "PATCH", body: { roleId } }));
  }

  async changeUserStatus(userId: ID, status: AccessUserStatus, reason?: string): Promise<AccessUser> {
    const r = reason?.trim();
    return mapUser(await apiFetch<BackendDirectoryUser>(`/users/${userId}/status`, { method: "PATCH", body: { status, ...(r ? { reason: r } : {}) } }));
  }

  async listAudit(before?: string): Promise<AccessAuditEntry[]> {
    const rows = await apiFetch<Array<{ id: string; action: string; createdAt: string; newData?: Record<string, unknown> | null; user?: { fullName?: string | null } | null }>>(
      `/identity-audit?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`,
    );
    return rows.map((r) => ({ id: r.id, action: r.action, createdAt: r.createdAt, actorName: r.user?.fullName ?? "", data: r.newData ?? {} }));
  }
}
