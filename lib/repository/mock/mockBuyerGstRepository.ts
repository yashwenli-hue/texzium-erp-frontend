import { GstRegistrationOption } from "../../types/domain";
import { IBuyerGstRepository } from "../interfaces";
import { delay } from "./queryUtils";

// UI ASSUMPTION: mock stand-in for the buyer/customer GST lookup. Real mode
// uses RealBuyerGstRepository (GET /customer-gst).
const MOCK_BUYER_GST: GstRegistrationOption[] = [
  { id: "BGST1", label: "Raj Traders — 24XYZAB1234K1Z1", stateCode: "24", isActive: true, isDefault: true },
  { id: "BGST2", label: "Sterling Pumps Pvt Ltd — 27PQRSX5678M1Z2", stateCode: "27", isActive: true, isDefault: true },
  // Models a real backend possibility (isActive:false is returned unfiltered by GET
  // /customer-gst, confirmed by reading customer-gst.service.ts) so the inactive-
  // registration warning has a real case to exercise in mock mode too.
  { id: "BGST3", label: "Kavya Exports — 29LMNOP9876Q1Z4", stateCode: "29", isActive: false, isDefault: false },
];

export class MockBuyerGstRepository implements IBuyerGstRepository {
  async list(): Promise<GstRegistrationOption[]> {
    return delay(MOCK_BUYER_GST);
  }
}
