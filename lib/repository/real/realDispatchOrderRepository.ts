import { DispatchOrderOption } from "../../types/domain";
import { IDispatchOrderRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendDispatchOrder, mapDispatchOrderOption } from "./mappers";

/**
 * VERIFIED: `GET /dispatch-orders` — read-only lookup, same precedent as
 * Inventory Item / Seller GST / Buyer GST. No Dispatch Order management UI
 * exists in this app (creating/packing/marking dispatched is a separate,
 * unbuilt OperationsOS stage) — this only powers finding an already-
 * DISPATCHED order to reference when creating a Sales Invoice. See the
 * Stage 2F report.
 *
 * SECURITY NOTE (not fixed — backend is read-only): the dispatch-orders
 * controller has no `@UseGuards`/`@Permissions` at all, same as every other
 * Quote-to-Cash controller. Confirmed by reading dispatch-orders.controller.ts
 * directly.
 */
export class RealDispatchOrderRepository implements IDispatchOrderRepository {
  async list(): Promise<DispatchOrderOption[]> {
    const rows = await apiFetch<BackendDispatchOrder[]>("/dispatch-orders");
    return rows.map(mapDispatchOrderOption);
  }
}
