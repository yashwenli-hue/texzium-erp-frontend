import { GstRegistrationOption } from "../../types/domain";
import { ISellerGstRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendGstRegistration, mapGstRegistration } from "./mappers";

/**
 * GET /company-gst — the seller/own-company GST registration list, lives in
 * ComplianceOS, not RevenueOS. No RevenueOS-scoped seller-GST lookup exists;
 * CreateQuotationDto.sellerGstId requires a real registration id. Same
 * least-invasive-real-option precedent as RealUserRepository. See
 * docs/backend-ui-contract.md §8, §21, Stage 2C report.
 */
export class RealSellerGstRepository implements ISellerGstRepository {
  async list(): Promise<GstRegistrationOption[]> {
    const rows = await apiFetch<BackendGstRegistration[]>("/company-gst");
    return rows.map(mapGstRegistration);
  }
}
