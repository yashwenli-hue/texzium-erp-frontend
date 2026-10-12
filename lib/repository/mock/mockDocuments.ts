import { DownloadedFile } from "../../api/httpClient";
import { DocumentLine } from "../../types/domain";
import { computeQuotationAmounts, roundMoney } from "../shared/quotationLifecycle";
import { delay } from "./queryUtils";

/**
 * Mock-mode stand-ins for the backend's document rules (backend 2026-10-15):
 * a priced line worked out the way the backend does (taxable = quantity x
 * rate to the paisa, GST at the line's rate, split into CGST + SGST or IGST),
 * and a plain-text stand-in for a PDF, named as such (mock mode has no PDF
 * renderer).
 */
export function mockPricedLine(input: { lineNumber: number; description: string; hsnCode?: string; quantity: number; unitRate: number; gstRate: number; taxType?: string }): DocumentLine {
  const a = computeQuotationAmounts(input.quantity * input.unitRate, input.gstRate);
  const intra = input.taxType === "CGST_SGST";
  const cgst = intra ? roundMoney(a.gstAmount / 2) : 0;
  return {
    lineNumber: input.lineNumber,
    description: input.description,
    hsnCode: input.hsnCode,
    quantity: input.quantity,
    unitRate: input.unitRate,
    gstRate: input.gstRate,
    taxableAmount: a.taxableAmount,
    gstAmount: a.gstAmount,
    totalAmount: a.totalAmount,
    cgstAmount: cgst,
    sgstAmount: intra ? roundMoney(a.gstAmount - cgst) : 0,
    igstAmount: intra ? 0 : a.gstAmount,
  };
}

export function mockPdf(title: string, lines: string[], fileName: string): Promise<DownloadedFile> {
  const text = [`${title} (mock document)`, ...lines].join("\n");
  return delay({ blob: new Blob([text], { type: "text/plain" }), fileName: `${fileName.replace(/[^A-Za-z0-9._-]/g, "_")}-mock.txt` });
}
