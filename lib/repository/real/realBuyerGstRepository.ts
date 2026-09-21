import { GstRegistrationOption } from "../../types/domain";
import { IBuyerGstRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendGstRegistration, mapGstRegistration } from "./mappers";

/**
 * VERIFIED: GET /customer-gst — see docs/backend-ui-contract.md §2, §6.
 * CreateQuotationDto.buyerGstId requires a real CustomerGSTRegistration id.
 */
export class RealBuyerGstRepository implements IBuyerGstRepository {
  async list(): Promise<GstRegistrationOption[]> {
    const rows = await apiFetch<BackendGstRegistration[]>("/customer-gst");
    return rows.map(mapGstRegistration);
  }
}
