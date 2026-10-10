import { AssignableUser } from "../../types/domain";
import { IUserRepository } from "../interfaces";
import { delay } from "./queryUtils";

// UI ASSUMPTION: no Users/assignable-staff endpoint is confirmed within
// RevenueOS itself (docs/backend-ui-contract.md §21). This mock roster
// stands in for it in mock mode; real mode uses RealUserRepository (GET
// /users) instead — see docs/revenueos-stage2a-leads-opportunities.md §9.
// U5 is inactive, as a real roster can have: listed (names still resolve) but not
// offered as an assignee, and refused by the mock lead repository like the backend.
export const MOCK_ASSIGNABLE_USERS: AssignableUser[] = [
  { id: "U1", name: "Anita S.", active: true },
  { id: "U2", name: "Rohit M.", active: true },
  { id: "U3", name: "Vikram J.", active: true },
  { id: "U4", name: "Priya N.", active: true },
  { id: "U5", name: "Deepak R.", active: false },
];

export class MockUserRepository implements IUserRepository {
  async listAssignable(): Promise<AssignableUser[]> {
    return delay(MOCK_ASSIGNABLE_USERS);
  }
}
