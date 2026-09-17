import { ID } from "../../types/common";
import { AppNotification } from "../../types/domain";
import { INotificationRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

export class MockNotificationRepository implements INotificationRepository {
  async list(): Promise<AppNotification[]> {
    const sorted = [...db.notifications.getAll()].sort((a, b) =>
      a.occurredAt < b.occurredAt ? 1 : -1
    );
    return delay(sorted);
  }

  async markRead(id: ID): Promise<void> {
    db.notifications.update(id, { unread: false });
    return delay(undefined);
  }

  async markAllRead(): Promise<void> {
    db.notifications.getAll().forEach((n) => {
      if (n.unread) db.notifications.update(n.id, { unread: false });
    });
    return delay(undefined);
  }

  async unreadCount(): Promise<number> {
    return delay(db.notifications.getAll().filter((n) => n.unread).length);
  }
}
