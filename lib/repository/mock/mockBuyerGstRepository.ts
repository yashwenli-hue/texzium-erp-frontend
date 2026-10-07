import { GstRegistrationOption } from "../../types/domain";
import { IBuyerGstRepository } from "../interfaces";
import { db } from "./db";
import { delay } from "./queryUtils";
import { registrationLabel } from "../shared/customerLifecycle";

// The mock's stand-in for GET /customer-gst: every registration of every customer.
// (The quotation form itself uses the opportunity's own customer's registrations.)
export class MockBuyerGstRepository implements IBuyerGstRepository {
  async list(): Promise<GstRegistrationOption[]> {
    return delay(
      db.customers.getAll().flatMap((c) =>
        c.gstRegistrations.map((g) => ({ id: g.id, label: registrationLabel(g), stateCode: g.stateCode, isActive: g.isActive, isDefault: g.isDefault }))
      )
    );
  }
}
