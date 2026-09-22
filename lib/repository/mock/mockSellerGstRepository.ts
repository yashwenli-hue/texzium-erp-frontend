import { GstRegistrationOption } from "../../types/domain";
import { ISellerGstRepository } from "../interfaces";
import { delay } from "./queryUtils";

// UI ASSUMPTION: mock stand-in for the seller/company GST lookup. Real mode
// uses RealSellerGstRepository (GET /company-gst).
const MOCK_SELLER_GST: GstRegistrationOption[] = [
  { id: "SGST1", label: "Texzium Industries Pvt Ltd — 24ABCDE1234F1Z5 (Ahmedabad HO)", stateCode: "24", isActive: true, isDefault: true },
];

export class MockSellerGstRepository implements ISellerGstRepository {
  async list(): Promise<GstRegistrationOption[]> {
    return delay(MOCK_SELLER_GST);
  }
}
