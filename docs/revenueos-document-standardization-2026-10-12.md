# RevenueOS document standardization — implementation handover (2026-10-12)

Status: **implemented and verified in scratch; NOT activated.** Nothing in this
work has touched the live database, live services or live builds.

## Commits

Backend (`revenueos-remediation`, on top of `587fbcb`):

| Commit | What |
|---|---|
| `ca28847` | Consecutive document numbers per series and financial year (`DocumentNumberCounter`, IST dates) |
| `9fc87cf` | Disk-writing receipt PDF retired; receipt generation guarded, idempotent, numbered |
| `b2f3ef3` | Priced lines and numbers on quotations and Proforma Invoices; unit-rate revision |
| `3816353` | Sales invoice: amounts from the Quotation (no double GST), split, numbering, once per order, permissions |
| `2bde54f` | Shared PDF layout with Noto fonts; company document profile |
| `c13b5e6` | Ledger statement on the shared layout, IST calendar days |
| `96c9bd6` | Quotation, Proforma Invoice, tax invoice and receipt PDFs |
| `38c5609` | Test: paisa rounding of fractional quantities |

Frontend (`revenueos-remediation`, on top of `be44e88`): `2b9c95e`.

## Schema changes (manual migrations, apply in this order)

1. `20261015_document_number_counter.sql` — `DocumentNumberCounter` table.
2. `20261015_receipt_voucher_governance.sql` — FK, one receipt per payment, unique receipt numbers (pre-checked).
3. `20261015_quotation_proforma_lines.sql` — `QuotationLine`, `ProformaInvoiceLine`; unique quotation / Proforma numbers.
4. `20261015_sales_invoice_lines.sql` — line columns on `SalesInvoiceItem`; unique invoice numbers.
5. `20261015_sales_invoice_permissions.sql` — `invoices.view`, `invoices.create` → SUPER_ADMIN.
6. `20261015_company_document_profile.sql` — `CompanyDocumentProfile` (logo ≤ 64 KB check).
7. `20261015_company_document_profile_permissions.sql` — `documents.profile.manage` → SUPER_ADMIN.

All are additive and idempotent (each applied twice in scratch), pre-check
existing data where a constraint is added, and change no existing row. Each
file carries its rollback.

**The backend must not run without migrations 1–7**: it reads the new tables
and the invoice routes require the new permissions. Apply the migrations
before (or in the same window as) the backend restart, then the frontend.

## Backfill plan

No backfill. Existing quotations (4), Proforma Invoices (3) and sales invoices
(6) keep no number and no lines: their quantity, rate and item were never
stored, so nothing is reconstructed. Their documents say so (quotation and
Proforma PDFs carry a notice; a tax-invoice PDF is refused for an unnumbered
invoice with the reason). New documents are numbered and lined from
activation on. Existing receipts keep their `RCPT-…` numbers.

Impact found in scratch (copy of live): the three open legacy orders
(`6842c6b7`, `726391a5`, `b73265ec`) can no longer be invoiced, because their
Quotations have no tax breakdown and the old code would have charged an
assumed 18% on top. A business decision is needed for them (re-quote through
the governed flow, or an accountant-approved manual route).

## APIs and permissions

| Route | Permission |
|---|---|
| `GET /quotations/:id/document.pdf` | quotations.view |
| `GET /proforma-invoices/:id/document.pdf` | proformas.view |
| `GET /sales-invoices`, `GET /sales-invoices/:id/document.pdf` | invoices.view (new) |
| `POST /sales-invoices`, `POST /sales-invoice-items` | invoices.create (new) |
| `POST /receipt-vouchers/:paymentCollectionId/generate` | collections.record (was open) |
| `GET /receipt-vouchers?salesInvoiceId=`, `GET /receipt-vouchers/:id/document.pdf` | collections.view |
| `GET/PUT /document-profile`, `PUT/DELETE /document-profile/logo` | documents.profile.manage (new) |
| removed: `GET /receipt-pdf/:id` | — |

`PATCH /quotations/:id/revise` now takes `unitPrice` for a quotation with a
line (`taxableAmount` for an older one). `POST /sales-invoices` takes the
invoice date as a calendar day (`YYYY-MM-DD`), not after today (IST);
`customerName` is optional and must match the customer record when sent.

Route count: 338 → 346.

## Statutory requirements

Verified against the rule / notification text (secondary sources quoting it;
confirm against the official CBIC text):

- GST Rule 46 tax invoice particulars: supplier name, address, GSTIN;
  consecutive serial number ≤ 16 characters (letters, digits, `-`, `/`),
  unique per financial year; date; recipient name, address, GSTIN; HSN,
  description, quantity, taxable value, rate and tax; place of supply (state
  name and code) for inter-state supplies; delivery address if different;
  whether reverse charge applies; signature or digital signature (not
  required for an electronic invoice issued under the IT Act, 2000).
- Notification 78/2020: 4-digit HSN up to ₹5 crore turnover (B2B), 6-digit
  above.
- Rule 50 receipt voucher for advances: supplier, serial number, date,
  recipient, description, advance amount, rate and tax, place of supply,
  reverse charge, signature.
- E-invoicing (Rule 48(4)/(5)): mandatory for B2B invoices above ₹5 crore
  aggregate turnover (PAN-wide, any year since 2017-18) from 01-08-2023; an
  invoice that needs an IRN but lacks one is invalid.
- Companies Act s.12(3)(c): name, registered office address, CIN, phone,
  e-mail, website on business letters, bill heads, letter papers and official
  publications (invoices covered on the prudent reading).

What the documents implement: the Rule 46 particulars the records hold (no
delivery address: none is stored), "Reverse charge: No" (the system supports
no reverse-charge supply), consecutive per-registration numbers
(`SI24/26-27/00001`, 16 characters), CIN/PAN/registered office/contacts from
the company master and document profile, a signature box. The simulated IRN,
acknowledgement and e-way bill values are never printed.

**Needs the accountant / legal advisor before the tax-invoice PDF is used as
the legal invoice (release gate):**

1. Previous-year aggregate turnover band. **If above ₹5 crore, B2B invoices
   must be e-invoices with a real IRN and QR from the IRP; the current
   e-invoice module is simulated, so the PDF must not be issued as the legal
   tax invoice until a real IRP integration exists.** Also decides 4- vs
   6-digit HSN.
2. Invoice number format and series (`SI<state>/<FY>/<5 digits>`, one series
   per GST registration, numbers in date order).
3. Signature: computer-generated PDF with a signature box vs digital signature.
4. Copy labels (original / duplicate / triplicate for goods).
5. Delivery address / ship-to (not stored today).
6. Whether Rule 50 receipt vouchers are needed for advances on goods; credit
   and debit note format (Rule 53) — not implemented.
7. Rounding policy (amounts are rounded to the paisa per line; no
   whole-rupee rounding line is printed).
8. Wording of the Proforma Invoice ("not a tax invoice"), quotation and
   payment receipt ("not a GST receipt voucher").

## Verification (scratch only)

- Backend: 58 suites / 1,984 tests; typecheck clean; ESLint clean on all 55
  changed source files (`app.module.ts` findings identical to the baseline).
- Mutation checks: 19 / 19 caught by failing tests.
- Real PostgreSQL (scratch copy of live, dummy secrets): numbering race
  (40 transactions, 10 rolled back → numbers 1..30, no gap/duplicate),
  receipt race (10 concurrent → 1 receipt), quotation → revision → approval →
  Proforma → invoice flow, invoice race (2 concurrent → 1 invoice).
- End-to-end HTTP against a scratch backend (real guards): 33 / 33, including
  every route's 401/403, PDF headers and safe file names, PDF text read back
  and compared with the stored values, no simulated IRN printed, no server
  path in any PDF, no file written, and downloading every document changes
  no table.
- Frontend: typecheck, lint and production build clean (isolated copy); real
  repositories against the scratch backend and mock rules: 25 / 25.
- Live database fingerprint unchanged before/after; live services untouched.

## Known limitations

- A quotation has one priced line (creation takes one item); the model holds
  several, multi-line creation needs a UI/API change.
- Existing records have no numbers or lines (no backfill, by design).
- Invoice posting still writes the receivable, ledger and journal after the
  invoice transaction (unchanged behaviour); a failure there leaves an
  invoice without them, as before.
- One company only: the document profile refuses to guess between several.
- PDFs: Latin, Greek, Cyrillic and Devanagari; other Indian scripts print "?".
  No PDF rasteriser on the server, so layout was verified by text extraction;
  visual review is part of browser acceptance.
- Dates: documents and numbering use IST calendar days.
- Payslip (HRMS) and commissioning certificate (OperationsOS) PDF generators
  still write to `uploads/` — out of scope, follow-up.

## Activation sequence (to be approved separately)

1. Preflight (read-only), backup with restore rehearsal, archive the running
   backend build and frontend build.
2. Apply migrations 1–7 (one transaction each).
3. Build the backend (assets/fonts must be present beside `dist`, i.e. the
   repository's `assets/` folder), restart; verify 346 routes and the checks
   above against live (reads only).
4. Super Admin signs in again (new permissions are in the token).
5. Deploy the frontend; browser acceptance (document settings, each PDF,
   unit-rate revision, invoice issuing on a governed order, receipts).

## Rollback

Code: restore the archived backend `dist` and frontend `.next`. Data: each
migration file has its rollback block (drop the new tables/columns/indexes,
remove the new permissions); numbers already issued stay on their documents.
