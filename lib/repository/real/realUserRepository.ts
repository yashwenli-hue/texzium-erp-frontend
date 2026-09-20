import { AssignableUser } from "../../types/domain";
import { IUserRepository } from "../interfaces";
import { apiFetch } from "../../api/httpClient";
import { BackendUser, mapAssignableUser } from "./mappers";

/**
 * GET /users — NOT part of the verified RevenueOS contract (it lives in the
 * separate AdminOS/HR module, is unguarded, and returns the full raw User
 * row including passwordHash). No RevenueOS-scoped assignable-user lookup
 * exists, and AssignLeadDto.assignedToId / the qualify salesUserId both
 * require a real User id, so this is the least invasive real option,
 * confirmed with the user during Stage 2A. Only id/fullName are ever read
 * out of the response — see mapAssignableUser. Flagged in the Stage 2A
 * report as a discovered contract gap, not a decision to silently invent.
 */
export class RealUserRepository implements IUserRepository {
  async listAssignable(): Promise<AssignableUser[]> {
    const rows = await apiFetch<BackendUser[]>("/users");
    return rows.map(mapAssignableUser);
  }
}
