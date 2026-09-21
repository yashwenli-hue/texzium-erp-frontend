import { InventoryItemOption } from "../../types/domain";
import { IInventoryItemRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendInventoryItem, mapInventoryItem } from "./mappers";

/**
 * GET /inventory — lives in OperationsOS, not RevenueOS. No RevenueOS-scoped
 * inventory-item lookup exists, and CreateQuotationDto.inventoryItemId
 * requires a real InventoryItem id, so this is the least invasive real
 * option — same precedent as RealUserRepository (GET /users). Only id/
 * productName/sku are ever read out of the response. See
 * docs/backend-ui-contract.md §21, Stage 2C report.
 */
export class RealInventoryItemRepository implements IInventoryItemRepository {
  async list(): Promise<InventoryItemOption[]> {
    const rows = await apiFetch<BackendInventoryItem[]>("/inventory");
    return rows.map(mapInventoryItem);
  }
}
