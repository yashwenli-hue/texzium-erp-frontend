import { DocumentProfile, DocumentProfileFields } from "../../types/domain";
import { IDocumentProfileRepository } from "../interfaces";
import { ApiError, apiFetch } from "../../api/httpClient";

/**
 * VERIFIED (backend 2026-10-15): GET/PUT /document-profile and PUT/DELETE
 * /document-profile/logo, all documents.profile.manage. The backend validates
 * every field (IFSC, account number, UPI id, lengths) and the logo (PNG or
 * JPEG of at most 64 KB, checked by its content) and returns the whole profile.
 */
export class RealDocumentProfileRepository implements IDocumentProfileRepository {
  private async call(path: string, method: "GET" | "PUT" | "DELETE", body?: unknown): Promise<DocumentProfile> {
    try {
      return await apiFetch<DocumentProfile>(path, { method, ...(body !== undefined ? { body } : {}) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) throw new ApiError("You don't have permission to manage the document profile.", 403, err.details);
      throw err;
    }
  }

  get(): Promise<DocumentProfile> {
    return this.call("/document-profile", "GET");
  }

  update(input: Partial<DocumentProfileFields>): Promise<DocumentProfile> {
    return this.call("/document-profile", "PUT", input);
  }

  setLogo(logo: { mimeType: "image/png" | "image/jpeg"; base64: string }): Promise<DocumentProfile> {
    return this.call("/document-profile/logo", "PUT", logo);
  }

  removeLogo(): Promise<DocumentProfile> {
    return this.call("/document-profile/logo", "DELETE");
  }
}
