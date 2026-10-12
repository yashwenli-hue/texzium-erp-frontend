import { InventoryItemOption } from "../../types/domain";
import { IInventoryItemRepository } from "../interfaces";
import { delay } from "./queryUtils";

// UI ASSUMPTION: no RevenueOS-scoped inventory-item lookup is confirmed
// (docs/backend-ui-contract.md §21). This mock roster stands in for it in
// mock mode; real mode uses RealInventoryItemRepository (GET /inventory).
export const MOCK_INVENTORY_ITEMS: InventoryItemOption[] = [
  { id: "INV1", name: "Industrial Pump GST Mapped (PUMP-HSN-001)", stockQty: 100, availableQty: 100 },
  { id: "INV2", name: "Hydraulic Cylinder Assembly (HYD-CYL-014)", stockQty: 12, availableQty: 8 },
  // 0 available models a real backend possibility — the backend permits
  // ordering past available stock and auto-raises a Purchase Requisition for
  // the shortfall (see sales-orders.service.ts), so this is left selectable
  // here rather than disabled.
  { id: "INV3", name: "Control Panel Unit (CTRL-PNL-007)", stockQty: 0, availableQty: 0 },
];

export class MockInventoryItemRepository implements IInventoryItemRepository {
  async list(): Promise<InventoryItemOption[]> {
    return delay(MOCK_INVENTORY_ITEMS);
  }
}
