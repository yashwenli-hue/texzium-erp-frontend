import { AssignableUser } from "../../types/domain";
import { IUserRepository } from "../interfaces";
import { delay } from "./queryUtils";

// UI ASSUMPTION: no Users/assignable-staff endpoint is confirmed within
// RevenueOS itself (docs/backend-ui-contract.md §21). This mock roster
// stands in for it in mock mode; real mode uses RealUserRepository (GET
// /users) instead — see docs/revenueos-stage2a-leads-opportunities.md §9.
const MOCK_ASSIGNABLE_USERS: AssignableUser[] = [
  { id: "U1", name: "Anita S." },
  { id: "U2", name: "Rohit M." },
  { id: "U3", name: "Vikram J." },
  { id: "U4", name: "Priya N." },
];

export class MockUserRepository implements IUserRepository {
  async listAssignable(): Promise<AssignableUser[]> {
    return delay(MOCK_ASSIGNABLE_USERS);
  }
}
