import { DocumentProfile, DocumentProfileFields } from "../../types/domain";
import { IDocumentProfileRepository } from "../interfaces";
import { ApiError } from "../../api/httpClient";
import { delay } from "./queryUtils";

const EMPTY: DocumentProfileFields = {
  registeredOfficeAddress: null,
  bankAccountName: null,
  bankName: null,
  bankAccountNumber: null,
  bankIfsc: null,
  bankBranch: null,
  upiId: null,
  quotationTerms: null,
  proformaTerms: null,
  invoiceTerms: null,
  receiptNote: null,
  signatoryName: null,
  signatoryDesignation: null,
};

// Mock-mode document profile, kept in memory. Validates like the backend.
const state: DocumentProfile = {
  company: { id: "CO1", companyCode: "TX001", companyName: "Texzium Industries Private Limited (mock)", panNumber: "AAACT1234A" },
  registrations: [{ id: "SG1", gstin: "24AAACT1234A1Z5", legalName: "Texzium Industries Private Limited", stateCode: "24", stateName: "Gujarat", isDefault: true, isActive: true }],
  profile: { ...EMPTY, logo: null },
};

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT = /^\d{9,18}$/;
const UPI = /^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$/;

export class MockDocumentProfileRepository implements IDocumentProfileRepository {
  async get(): Promise<DocumentProfile> {
    return delay(structuredClone(state));
  }

  async update(input: Partial<DocumentProfileFields>): Promise<DocumentProfile> {
    const next = { ...state.profile };
    for (const [key, raw] of Object.entries(input) as Array<[keyof DocumentProfileFields, string | null | undefined]>) {
      if (raw === undefined) continue;
      let value = raw === null ? null : raw.trim() || null;
      if (value && key === "bankIfsc") value = value.toUpperCase();
      if (value && key === "bankAccountNumber") value = value.replace(/\s+/g, "");
      if (value && key === "bankIfsc" && !IFSC.test(value)) throw new ApiError("bankIfsc must be an IFSC code (e.g. HDFC0001234)", 400);
      if (value && key === "bankAccountNumber" && !ACCOUNT.test(value)) throw new ApiError("bankAccountNumber must be 9 to 18 digits", 400);
      if (value && key === "upiId" && !UPI.test(value)) throw new ApiError("upiId must be a UPI id (e.g. texzium@hdfcbank)", 400);
      next[key] = value;
    }
    state.profile = next;
    return this.get();
  }

  async setLogo(logo: { mimeType: "image/png" | "image/jpeg"; base64: string }): Promise<DocumentProfile> {
    if (Math.floor((logo.base64.length * 3) / 4) > 64 * 1024) throw new ApiError("The logo was refused: it is larger than 64 KB.", 400);
    state.profile = { ...state.profile, logo };
    return this.get();
  }

  async removeLogo(): Promise<DocumentProfile> {
    state.profile = { ...state.profile, logo: null };
    return this.get();
  }
}
