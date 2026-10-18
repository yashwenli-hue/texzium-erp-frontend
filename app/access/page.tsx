"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, PageHelp } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Icon } from "../../components/ui/Icon";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { useAsyncList } from "../../lib/hooks/useAsyncList";
import { formatDateTime } from "../../lib/format";
import {
  AccessRole,
  AccessUser,
  AccessUserStatus,
  GATED_PERMISSIONS,
  ROLE_PRESETS,
  RolePermissionChange,
  describeAuditEntry,
  diffCodes,
  groupPermissions,
  holds,
  isSensitive,
  permissionKind,
} from "../../lib/repository/shared/access";

type Tab = "roles" | "users" | "history";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "roles", label: "Roles & permissions" },
  { key: "users", label: "People" },
  { key: "history", label: "History" },
];

/**
 * Access administration (platform-level screen, AdminOS): what each role may do, who holds
 * which role, and every change. Nothing is saved until the exact change is reviewed and
 * confirmed; sensitive permissions need an extra confirmation; the server enforces the
 * rules again (hold what you grant, no lockout, no self change).
 */
export default function AccessPage() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>("roles");

  if (!hasPermission("roles.view")) {
    return (
      <div className="page">
        <PageHeader eyebrow="System · Access" title="Access" subtitle="Roles, the permissions they grant, who holds them, and every change." />
        <Panel title="Access">
          <EmptyState icon="lock" title="You don't have access to this page" body="Viewing roles and permissions needs the roles.view permission." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader eyebrow="System · Access" title="Access" subtitle="Roles, the permissions they grant, who holds them, and every change." />
      <div className="tabs" role="tablist" aria-label="Access">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            className={`tab${tab === t.key ? " on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "roles" && <RolesTab />}
        {tab === "users" && <UsersTab />}
        {tab === "history" && <HistoryTab />}
      </div>
      <PageHelp title="How access works">
        A person can do exactly what their role allows; there are no per-person exceptions,
        so nothing can conflict. Changes apply when the person next signs in (a login lasts one day). You can only
        grant or remove permissions you hold yourself, and RevenueOS refuses any change that would leave nobody able
        to administer access.
      </PageHelp>
    </div>
  );
}

// ---------------------------------------------------------------- roles

function RolesTab() {
  const repo = useRepository();
  const toast = useToast();
  const { user, hasPermission } = useAuth();
  const roles = useAsyncList(() => repo.access.listRoles(), [repo]);
  const perms = useAsyncList(() => repo.access.listPermissions(), [repo]);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [desired, setDesired] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<RolePermissionChange | null>(null);

  const list = roles.data ?? [];
  const role = list.find((r) => r.id === roleId) ?? list[0];
  useEffect(() => {
    if (role) setDesired(new Set(role.permissionCodes));
  }, [role?.id, role?.permissionCodes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => groupPermissions(perms.data ?? [], search), [perms.data, search]);
  const change = role ? diffCodes(role.permissionCodes, desired) : { grant: [], revoke: [] };
  const held = new Set(user?.permissions ?? []);
  const canGrant = hasPermission("roles.permissions.assign");
  const canRevoke = hasPermission("roles.permissions.revoke");

  if (roles.loading && !roles.data) return <div className="skeleton" style={{ height: 300 }} aria-label="Loading roles" />;
  if (roles.error || perms.error) {
    return (
      <Panel title="Roles">
        <EmptyState icon="alert" title="Couldn't load roles" body={(roles.error ?? perms.error)!.message} action={<Button variant="ghost" onClick={() => { roles.refetch(); perms.refetch(); }}>Retry</Button>} />
      </Panel>
    );
  }
  if (!role) return <Panel title="Roles"><EmptyState icon="users" title="No roles yet" /></Panel>;

  const toggle = (code: string) =>
    setDesired((d) => {
      const n = new Set(d);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });
  const why = (code: string): string | undefined => {
    const on = desired.has(code);
    const stored = role.permissionCodes.includes(code);
    if (!holds(held, code)) return "You don't hold this permission, so you can't grant or remove it.";
    if (!stored && !on && !canGrant) return "Granting needs roles.permissions.assign.";
    if (stored && on && !canRevoke) return "Removing needs roles.permissions.revoke.";
    return undefined;
  };

  return (
    <div className="access-grid">
      <Panel title={`Roles · ${list.length}`} flush>
        <ul className="role-list" aria-label="Roles">
          {list.map((r) => (
            <li key={r.id}>
              <button type="button" className={`role-item${r.id === role.id ? " on" : ""}`} aria-current={r.id === role.id} onClick={() => { setRoleId(r.id); setSearch(""); }}>
                <b>{r.name}</b>
                <small>
                  {r.permissionCodes.length} permissions · {r.userCount} {r.userCount === 1 ? "person" : "people"}
                </small>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title={`${role.name} — what this role may do`}
        flush
        extraHead={
          change.grant.length + change.revoke.length > 0 ? (
            <span className="panel-acts">
              <button type="button" className="more" onClick={() => setDesired(new Set(role.permissionCodes))}>Undo changes</button>
              <Button variant="primary" onClick={() => setReview(change)}>
                Review {change.grant.length ? `+${change.grant.length}` : ""} {change.revoke.length ? `−${change.revoke.length}` : ""}
              </Button>
            </span>
          ) : undefined
        }
      >
        <div className="perm-tools">
          <label className="list-search">
            <Icon name="search" size={16} />
            <span className="sr-only">Search permissions</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions (leads, delete, invoices…)" />
          </label>
          {canGrant && (
            <div className="preset-row" aria-label="Start from a preset">
              <span>Start from:</span>
              {ROLE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className="chip"
                  title={`${p.description} Fills in the boxes only; nothing is saved until you review it.`}
                  onClick={() => setDesired(new Set(p.codes.filter((c) => holds(held, c) && !GATED_PERMISSIONS.includes(c))))}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {groups.length === 0 && <p className="form-hint" style={{ padding: "8px 19px" }}>No permission matches.</p>}
        {groups.map((g) => (
          <fieldset className="perm-group" key={g.area}>
            <legend>{g.area}</legend>
            {g.permissions.map((p) => {
              const reason = why(p.code);
              const on = desired.has(p.code);
              const changed = on !== role.permissionCodes.includes(p.code);
              return (
                <label key={p.code} className={`perm${changed ? " changed" : ""}${reason ? " locked" : ""}`} title={reason}>
                  <input type="checkbox" checked={on} disabled={!!reason} onChange={() => toggle(p.code)} aria-describedby={reason ? `why-${p.id}` : undefined} />
                  <span className="perm-main">
                    <code>{p.code}</code>
                    <small>
                      {p.name !== p.code ? `${p.name} · ` : ""}
                      {permissionKind(p.code)}
                    </small>
                  </span>
                  {isSensitive(p.code) && <span className="tag w perm-flag">Sensitive</span>}
                  {GATED_PERMISSIONS.includes(p.code) && <span className="tag b perm-flag">Needs business approval</span>}
                  {reason && <span id={`why-${p.id}`} className="sr-only">{reason}</span>}
                </label>
              );
            })}
          </fieldset>
        ))}
      </Panel>

      {review && (
        <ReviewDialog
          role={role}
          change={review}
          onClose={() => setReview(null)}
          onSave={async (ack) => {
            await repo.access.updateRolePermissions(role.id, review, ack);
            toast.success(`${role.name} updated. People in this role get the change when they next sign in.`);
            setReview(null);
            roles.refetch();
          }}
        />
      )}
    </div>
  );
}

function ReviewDialog({ role, change, onClose, onSave }: { role: AccessRole; change: RolePermissionChange; onClose: () => void; onSave: (acknowledge: boolean) => Promise<void> }) {
  const sensitive = change.grant.filter(isSensitive);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const running = useRef(false);
  async function save() {
    if (running.current) return;
    if (sensitive.length && !ack) {
      setError("Confirm the sensitive permissions first.");
      return;
    }
    running.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave(sensitive.length > 0 && ack);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the change.");
    } finally {
      running.current = false;
      setSaving(false);
    }
  }
  return (
    <Modal
      title={`Change ${role.name}?`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving || (sensitive.length > 0 && !ack)}>
            {saving ? "Saving…" : "Save change"}
          </Button>
        </>
      }
    >
      <p className="form-context">
        {role.userCount} {role.userCount === 1 ? "person has" : "people have"} this role. They get the change when they next sign in.
      </p>
      {change.grant.length > 0 && (
        <>
          <h4 className="review-h">Grant</h4>
          <ul className="review-list">
            {change.grant.map((c) => (
              <li key={c}>
                <code>{c}</code> {isSensitive(c) && <span className="tag w perm-flag">Sensitive</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {change.revoke.length > 0 && (
        <>
          <h4 className="review-h">Remove</h4>
          <ul className="review-list">
            {change.revoke.map((c) => (
              <li key={c}><code>{c}</code></li>
            ))}
          </ul>
        </>
      )}
      {sensitive.length > 0 && (
        <label className="ack">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          I understand that {sensitive.join(", ")} {sensitive.length === 1 ? "opens" : "open"} money, documents, deletion, every record or access itself to everyone in {role.name}.
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

// ---------------------------------------------------------------- people

function UsersTab() {
  const repo = useRepository();
  const toast = useToast();
  const { user: me, hasPermission } = useAuth();
  const users = useAsyncList(() => repo.access.listUsers(), [repo]);
  const roles = useAsyncList(() => repo.access.listRoles(), [repo]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ user: AccessUser; role?: AccessRole; status?: AccessUserStatus } | null>(null);
  const canRole = hasPermission("users.role.assign");
  const canStatus = hasPermission("users.status.manage");

  if (!hasPermission("users.view")) {
    return <Panel title="People"><EmptyState icon="lock" title="Seeing people needs users.view" /></Panel>;
  }
  if (users.loading && !users.data) return <div className="skeleton" style={{ height: 300 }} aria-label="Loading people" />;
  if (users.error) return <Panel title="People"><EmptyState icon="alert" title="Couldn't load people" body={users.error.message} action={<Button variant="ghost" onClick={users.refetch}>Retry</Button>} /></Panel>;

  const roleOf = (id: string) => (roles.data ?? []).find((r) => r.id === id);
  // The dialog shows the backend's refusal itself; success is announced only after the save.
  async function confirmPending(reason?: string) {
    if (!pending) return;
    const { user: u, role: to, status } = pending;
    setBusy(u.id);
    try {
      if (to) await repo.access.changeUserRole(u.id, to.id);
      else if (status) await repo.access.changeUserStatus(u.id, status, reason);
      toast.success(to ? `${u.fullName} now has the role ${to.name}` : `${u.fullName} is now ${status!.toLowerCase()}`);
      users.refetch();
      roles.refetch();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title={`People · ${(users.data ?? []).length}`} flush>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">People and their roles</caption>
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Permissions</th>
            </tr>
          </thead>
          <tbody>
            {(users.data ?? []).map((u) => {
              const self = u.id === me?.id;
              const r = roleOf(u.roleId);
              return [
                <tr key={u.id}>
                  <td>
                    <b>{u.fullName}</b>
                    <br />
                    <small className="cell-none">{u.email}{self ? " · you" : ""}</small>
                  </td>
                  <td>
                    <select
                      aria-label={`Role of ${u.fullName}`}
                      className="inline-select"
                      value={u.roleId}
                      disabled={!canRole || self || busy === u.id}
                      title={self ? "You can't change your own role" : !canRole ? "Needs users.role.assign" : undefined}
                      onChange={(e) => {
                        const to = roleOf(e.target.value);
                        if (to) setPending({ user: u, role: to });
                      }}
                    >
                      {(roles.data ?? []).map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Status of ${u.fullName}`}
                      className="inline-select"
                      value={u.status}
                      disabled={!canStatus || self || busy === u.id}
                      title={self ? "You can't change your own status" : !canStatus ? "Needs users.status.manage" : undefined}
                      onChange={(e) => setPending({ user: u, status: e.target.value as AccessUserStatus })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </td>
                  <td>
                    <button type="button" className="more" aria-expanded={open === u.id} onClick={() => setOpen(open === u.id ? null : u.id)}>
                      {r ? `${r.permissionCodes.length} from ${r.name}` : "—"}
                    </button>
                  </td>
                </tr>,
                open === u.id && r ? (
                  <tr key={`${u.id}-p`}>
                    <td colSpan={4}>
                      <div className="effective">
                        <small>Effective permissions (exactly the role&apos;s; there are no per-person grants):</small>
                        <div className="cell-tags">
                          {r.permissionCodes.map((c) => (
                            <code key={c} className={isSensitive(c) ? "sens" : ""}>{c}</code>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>
      {pending && (
        <ConfirmDialog
          title={pending.role ? `Change ${pending.user.fullName}'s role?` : `Make ${pending.user.fullName} ${pending.status!.toLowerCase()}?`}
          body={
            pending.role
              ? `${pending.user.fullName} moves from ${pending.user.roleName} to ${pending.role.name} and gets its ${pending.role.permissionCodes.length} permissions when they next sign in.`
              : pending.status === "ACTIVE"
                ? `${pending.user.fullName} can sign in again.`
                : `${pending.user.fullName} can no longer sign in or be given leads. A login they already have ends when it expires (within a day).`
          }
          confirmLabel={pending.role ? "Change role" : "Change status"}
          destructive={!!pending.status && pending.status !== "ACTIVE"}
          noteLabel={pending.status && pending.status !== "ACTIVE" ? "Reason (optional, kept in the history)" : undefined}
          onClose={() => setPending(null)}
          onConfirm={(note) => confirmPending(note)}
        />
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------- history

function HistoryTab() {
  const repo = useRepository();
  const audit = useAsyncList(() => repo.access.listAudit(), [repo]);
  if (audit.loading && !audit.data) return <div className="skeleton" style={{ height: 200 }} aria-label="Loading history" />;
  if (audit.error) return <Panel title="History"><EmptyState icon="alert" title="Couldn't load the history" body={audit.error.message} action={<Button variant="ghost" onClick={audit.refetch}>Retry</Button>} /></Panel>;
  const rows = audit.data ?? [];
  return (
    <Panel title="Access changes" flush>
      {rows.length === 0 ? (
        <EmptyState icon="clock" title="No access changes recorded yet" />
      ) : (
        <ul className="audit-list">
          {rows.map((e) => {
            const d = describeAuditEntry(e);
            return (
              <li key={e.id}>
                <b>{d.title}</b> {d.detail && <span>{d.detail}</span>}
                <small>
                  {e.actorName ? `by ${e.actorName} · ` : ""}
                  {formatDateTime(e.createdAt)}
                </small>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
