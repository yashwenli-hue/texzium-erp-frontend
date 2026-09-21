import { DispatchOrderOption } from "../../types/domain";
import { IDispatchOrderRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";

/** Read-only — see IDispatchOrderRepository. No mock Dispatch Order management exists, only seed data to pick from. */
export class MockDispatchOrderRepository implements IDispatchOrderRepository {
  async list(): Promise<DispatchOrderOption[]> {
    return delay(db.dispatchOrders.getAll());
  }
}
