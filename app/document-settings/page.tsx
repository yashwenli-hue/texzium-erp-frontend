"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";
import { FieldRow, TextAreaField, TextField } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../lib/auth/AuthContext";
import { useRepository } from "../../lib/repository/RepositoryProvider";
import { DocumentProfile, DocumentProfileFields } from "../../lib/types/domain";

const LOGO_MAX_BYTES = 64 * 1024;

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

/**
 * What the company prints on its documents besides its master data (VERIFIED:
 * /document-profile, documents.profile.manage). The company name, PAN, CIN,
 * contacts and each GST registration's legal name and address come from the
 * company and GST masters and are shown here read-only. The backend validates
 * every field and the logo; its answer wins.
 */
export default function DocumentSettingsPage() {
  const repo = useRepository();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const allowed = hasPermission("documents.profile.manage");
  const [data, setData] = useState<DocumentProfile | null>(null);
  const [form, setForm] = useState<DocumentProfileFields>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  const load = (d: DocumentProfile) => {
    setData(d);
    const { logo: _logo, updatedAt: _updatedAt, ...fields } = d.profile;
    void _logo;
    void _updatedAt;
    setForm({ ...EMPTY, ...fields });
  };

  useEffect(() => {
    if (!allowed) return;
    repo.documentProfile
      .get()
      .then(load)
      .catch((err) => setError(err instanceof Error ? err.message : "The document profile couldn't be loaded."));
  }, [repo, allowed]);

  if (!allowed) {
    return (
      <div className="page">
        <PageHeader eyebrow="System · Document Settings" title="Document Settings" subtitle="What the company prints on its business documents." />
        <Panel title="Document Settings">
          <EmptyState icon="lock" title="No access" body="You don't have permission to manage the document profile." />
        </Panel>
      </div>
    );
  }

  const set = (key: keyof DocumentProfileFields) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const value = (key: keyof DocumentProfileFields) => form[key] ?? "";

  async function save() {
    setSaving(true);
    setError(null);
    try {
      load(await repo.documentProfile.update(form));
      toast.success("Document settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The document settings couldn't be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      toast.error("Choose a PNG or JPEG image.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("The logo must be 64 KB or smaller.");
      return;
    }
    setLogoBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
        reader.onerror = () => reject(new Error("The file couldn't be read."));
        reader.readAsDataURL(file);
      });
      load(await repo.documentProfile.setLogo({ mimeType: file.type, base64 }));
      toast.success("Logo saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The logo couldn't be saved.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    try {
      load(await repo.documentProfile.removeLogo());
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The logo couldn't be removed.");
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="System · Document Settings"
        title="Document Settings"
        subtitle="What the company prints on its quotations, Proforma Invoices, tax invoices, receipts and statements."
        cta={
          <Button variant="primary" onClick={save} disabled={saving || !data}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        }
      />
      {error && (
        <p role="alert" style={{ color: "var(--bad)", fontSize: 13, margin: "0 0 12px" }}>
          {error}
        </p>
      )}
      {!data ? (
        error ? null : <div className="skeleton" style={{ height: 320 }} />
      ) : (
        <div className="crm-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Panel title="Bank details">
              <FieldRow>
                <TextField label="Account name" value={value("bankAccountName")} onChange={set("bankAccountName")} maxLength={200} />
                <TextField label="Bank" value={value("bankName")} onChange={set("bankName")} maxLength={200} />
              </FieldRow>
              <FieldRow>
                <TextField label="Account number" inputMode="numeric" value={value("bankAccountNumber")} onChange={set("bankAccountNumber")} hint="9 to 18 digits" />
                <TextField label="IFSC" value={value("bankIfsc")} onChange={set("bankIfsc")} hint="e.g. HDFC0001234" />
              </FieldRow>
              <FieldRow>
                <TextField label="Branch" value={value("bankBranch")} onChange={set("bankBranch")} maxLength={200} />
                <TextField label="UPI id" value={value("upiId")} onChange={set("upiId")} hint="e.g. texzium@hdfcbank" />
              </FieldRow>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Printed on Proforma Invoices and tax invoices.</p>
            </Panel>
            <Panel title="Terms and notes">
              <TextAreaField label="Quotation terms" rows={4} value={value("quotationTerms")} onChange={set("quotationTerms")} maxLength={4000} />
              <TextAreaField label="Proforma Invoice terms" rows={4} value={value("proformaTerms")} onChange={set("proformaTerms")} maxLength={4000} />
              <TextAreaField label="Tax invoice terms" rows={4} value={value("invoiceTerms")} onChange={set("invoiceTerms")} maxLength={4000} />
              <TextAreaField label="Receipt note" rows={2} value={value("receiptNote")} onChange={set("receiptNote")} maxLength={1000} />
            </Panel>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Panel title="Company (from the company master)">
              <div className="info-grid" style={{ padding: 0 }}>
                <div className="f"><label>Company</label><div>{data.company.companyName}</div></div>
                <div className="f"><label>PAN</label><div>{data.company.panNumber}</div></div>
                <div className="f"><label>CIN</label><div>{data.company.cinNumber ?? "—"}</div></div>
                <div className="f"><label>Contact</label><div>{[data.company.email, data.company.phone, data.company.website].filter(Boolean).join(" · ") || "—"}</div></div>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>
                Each document prints the legal name, address and GSTIN of the GST registration it was issued under:
                {" "}
                {data.registrations.map((r) => `${r.gstin} (${r.stateName}${r.isDefault ? ", default" : ""})`).join("; ") || "none set up"}.
              </p>
              <TextAreaField label="Registered office address" rows={3} value={value("registeredOfficeAddress")} onChange={set("registeredOfficeAddress")} maxLength={500} />
            </Panel>
            <Panel title="Logo">
              {data.profile.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- a small data URL from the backend, not a remote image
                <img src={`data:${data.profile.logo.mimeType};base64,${data.profile.logo.base64}`} alt="Company logo" style={{ maxWidth: 200, maxHeight: 80, display: "block", marginBottom: 10 }} />
              ) : (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>No logo: documents print the company name only.</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label className="btn ghost" style={{ cursor: logoBusy ? "default" : "pointer" }}>
                  {logoBusy ? "Saving…" : data.profile.logo ? "Replace logo" : "Upload logo"}
                  <input type="file" accept="image/png,image/jpeg" hidden disabled={logoBusy} onChange={(e) => void uploadLogo(e.target.files?.[0])} />
                </label>
                {data.profile.logo && (
                  <Button variant="ghost" onClick={removeLogo} disabled={logoBusy}>
                    Remove logo
                  </Button>
                )}
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>PNG or JPEG, 64 KB or smaller.</p>
            </Panel>
            <Panel title="Authorised signatory">
              <FieldRow>
                <TextField label="Name" value={value("signatoryName")} onChange={set("signatoryName")} maxLength={200} />
                <TextField label="Designation" value={value("signatoryDesignation")} onChange={set("signatoryDesignation")} maxLength={200} />
              </FieldRow>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Printed under the signature box. Documents are computer-generated; nothing is signed automatically.</p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
