import { InventoryItemOption } from "../../types/domain";
import { IInventoryItemRepository } from "../interfaces";
import { delay } from "./queryUtils";

// UI ASSUMPTION: no RevenueOS-scoped inventory-item lookup is confirmed
// (docs/backend-ui-contract.md §21). This mock roster stands in for it in
// mock mode; real mode uses RealInventoryItemRepository (GET /inventory).
const MOCK_INVENTORY_ITEMS: InventoryItemOption[] = [
  { id: "INV1", name: "Industrial Pump GST Mapped (PUMP-HSN-001)" },
  { id: "INV2", name: "Hydraulic Cylinder Assembly (HYD-CYL-014)" },
  { id: "INV3", name: "Control Panel Unit (CTRL-PNL-007)" },
];

export class MockInventoryItemRepository implements IInventoryItemRepository {
  async list(): Promise<InventoryItemOption[]> {
    return delay(MOCK_INVENTORY_ITEMS);
  }
}
