import { ID } from "../../types/common";
import { AppNotification } from "../../types/domain";
import { INotificationRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { getCurrentUserId } from "../../auth/tokenStorage";
import { BackendNotification, mapNotification } from "./mappers";

/**
 * VERIFIED: core/notifications is a real, fully wired backend module —
 * GET/POST /notifications, PATCH /notifications/:id/read, PATCH
 * /notifications/:id/delivered (confirmed by reading
 * notification.controller.ts directly). It was previously left on
 * MockNotificationRepository even in connected mode, which was a mistake,
 * not a genuine backend gap — this replaces that.
 *
 * No `@UseGuards` on any route, and GET /notifications returns every
 * notification in the system rather than filtering by the caller's
 * identity — this repository filters client-side to the current user's id
 * (decoded from the same JWT apiFetch() already sends) so connected mode
 * shows "your" notifications, not everyone's.
 *
 * There is no bulk mark-all-read route and no dedicated unread-count route:
 * markAllRead() issues one PATCH per unread notification, and
 * unreadCount() is derived from list() — the same derivation
 * MockNotificationRepository already uses.
 */
export class RealNotificationRepository implements INotificationRepository {
  private async fetchAll(): Promise<AppNotification[]> {
    const rows = await apiFetch<BackendNotification[]>("/notifications");
    const uid = getCurrentUserId();
    const scoped = uid ? rows.filter((r) => r.userId === uid) : rows;
    return scoped.map(mapNotification).sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }

  async list(): Promise<AppNotification[]> {
    return this.fetchAll();
  }

  async markRead(id: ID): Promise<void> {
    await apiFetch<unknown>(`/notifications/${id}/read`, { method: "PATCH" });
  }

  async markAllRead(): Promise<void> {
    const all = await this.fetchAll();
    await Promise.all(all.filter((n) => n.unread).map((n) => this.markRead(n.id)));
  }

  async unreadCount(): Promise<number> {
    const all = await this.fetchAll();
    return all.filter((n) => n.unread).length;
  }
}
