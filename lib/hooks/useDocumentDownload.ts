"use client";

import { useCallback, useState } from "react";
import { saveDownloadedFile, DownloadedFile } from "../api/httpClient";
import { useToast } from "../../components/ui/Toast";

/**
 * Downloads a document the backend builds (quotation, Proforma Invoice, tax
 * invoice, receipt) and saves it. While one is being prepared `downloading`
 * is true; a refusal (403, or 409 with the backend's reason) is shown as a
 * toast and nothing is saved.
 */
export function useDocumentDownload() {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const download = useCallback(
    async (fetchFile: () => Promise<DownloadedFile>, done: string) => {
      setDownloading(true);
      try {
        saveDownloadedFile(await fetchFile());
        toast.success(done);
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : "The document could not be downloaded.");
      } finally {
        setDownloading(false);
      }
    },
    [toast]
  );
  return { downloading, download };
}
