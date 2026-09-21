import { GstRegistrationOption } from "../../types/domain";
import { IBuyerGstRepository } from "../interfaces";
import { delay } from "./queryUtils";

// UI ASSUMPTION: mock stand-in for the buyer/customer GST lookup. Real mode
// uses RealBuyerGstRepository (GET /customer-gst).
const MOCK_BUYER_GST: GstRegistrationOption[] = [
  { id: "BGST1", label: "Raj Traders — 24XYZAB1234K1Z1", stateCode: "24" },
  { id: "BGST2", label: "Sterling Pumps Pvt Ltd — 27PQRSX5678M1Z2", stateCode: "27" },
];

export class MockBuyerGstRepository implements IBuyerGstRepository {
  async list(): Promise<GstRegistrationOption[]> {
    return delay(MOCK_BUYER_GST);
  }
}
