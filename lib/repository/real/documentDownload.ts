import { ApiError, apiDownload, DownloadedFile } from "../../api/httpClient";

/**
 * Downloads a business document the backend builds in memory (VERIFIED:
 * GET .../document.pdf routes, backend 2026-10-15). A 403 gets a plain message;
 * a 409 (e.g. an invoice that cannot be printed as a tax invoice) keeps the
 * backend's reason.
 */
export async function downloadDocument(path: string, fallbackName: string, forbidden: string): Promise<DownloadedFile> {
  try {
    return await apiDownload(path, "application/pdf", fallbackName);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) throw new ApiError(forbidden, 403, err.details);
    throw err;
  }
}
