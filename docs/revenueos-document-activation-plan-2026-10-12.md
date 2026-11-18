# RevenueOS document standardization — activation plan and legacy-order assessment

Prepared 2026-10-12. Read-only preparation: no migration applied, no service
restarted, no permission or business record changed.

Code to activate: backend `ca28847 … 38c5609` (8 commits on top of the live
`587fbcb`), frontend `2b9c95e` (on top of the live `be44e88`). Accountant
checklist: https://claude.ai/artifact/WCUkm7SQCwc9BjETkZZMC9 (private).

## 1. Legacy orders that can no longer be invoiced

All three are OPEN, were created straight from a quotation (the pre-lifecycle
path), carry no seller or buyer GST registration, tax type, place of supply or
inventory item, have no dispatch order, payment terms or advance receipt, and
belong to the opportunity "Industrial Pump Supply Deal" (now linked to
CUST001).

| Order | Total | Quotation | What the quotation recorded | Siblings already invoiced |
|---|---|---|---|---|
| `6842c6b7` (24 Jun) | 2,50,000 | `8f537145` APPROVED | total 2,50,000 only: taxable 0, GST % 0, GST 0, no tax type, no registrations, no lines | 3 orders through its Proforma: 4 posted invoices of 2,95,000 (= 2,50,000 + 18% added by the old code), total 11,80,000, plus 1 draft. One order (`b0a2e67c`) has 3 posted invoices. |
| `726391a5` (28 Jun) | 2,75,000 | `892634d1` APPROVED | total 2,75,000 only, same gaps | order `830080bc`: 1 posted invoice of 3,24,500 (2,75,000 + 18% added). A Proforma-based order `d674765a` is CANCELLED. |
| `b73265ec` (21 Sep) | 2,75,000 | `892634d1` (same) | same | same as above |

`6842c6b7` also holds a stock reservation (RESERVED, 10 × PUMP-001, since
24 Jun).

**What is missing:** the quotations stored only a total. Whether 2,50,000 /
2,75,000 was the taxable value or the tax-inclusive price is not recorded
(the old invoicing code assumed taxable and added 18%; the new rules refuse to
assume). No quantity, rate, HSN or registrations exist for these orders.

**Assessment:** each blocked order duplicates a quotation that has already been
invoiced at least once (quotation `8f537145` five times over). Invoicing any of
them would add a further invoice for the same quotation. The dates and
references (e.g. the 21 Sep `STAGE2G-VERIFY-001` payment on the sibling
invoice) suggest test activity.

**Proposed remediation (each needs your decision; nothing is changed now):**

1. Confirm with sales/accounts whether each order is a real, separate supply.
2. If it is a duplicate or test order (expected for all three): leave its
   amounts and quotation untouched and close the order out of the invoicing
   path. RevenueOS has no route to cancel an OPEN legacy order (cancellation
   accepts only the governed statuses), so this needs either
   a. no action: it stays OPEN and simply cannot be invoiced (safe, visible
      clutter), or
   b. an approved, reviewed one-off data correction that sets status
      CANCELLED with a recorded SalesOrderEvent, run on a scratch copy first;
      for `6842c6b7` the stock reservation is released through OperationsOS.
3. If it is a real supply: create a new governed quotation for the
   opportunity (item, quantity, unit rate, seller and buyer registrations;
   the accountant confirms whether the old figure was taxable or
   tax-inclusive), then Proforma → Sales Order → invoice. The legacy order is
   then closed as in 2. The legacy quotation is never edited.
4. Separately, the accountant reviews the already-posted duplicate invoices
   (Q13 of the checklist) and decides on correcting entries (credit notes). No
   invoice, receivable or ledger row is changed by this work.

## 2. Which documents may be released before the e-invoicing gate

| Document / function | Before the gate | Why |
|---|---|---|
| Customer ledger statement PDF | Release (already live; layout and IST days change) | not a GST document |
| Quotation PDF | Release | commercial offer, not a GST document |
| Proforma Invoice PDF | Release | titled and noted "not a tax invoice" |
| Payment receipt PDF | Release | commercial receipt; marked "not a GST receipt voucher" (wording: checklist Q10) |
| Document settings | Release | needed to fill the documents |
| Receipt generation guard, idempotency, RC numbering | Release | security fix |
| Quotation lines, unit-rate revision, QT/PI numbering | Release | commercial documents |
| Invoice amounts fix (no GST twice), once-per-order, invoice permissions | Release **after Q3 (number format) is approved** | stops wrong invoices; issues permanent statutory numbers |
| **Tax-invoice PDF** | **Must stay unavailable** | Q1 (e-invoicing), and Q4–Q6 (signature, copies, delivery address) |
| E-invoice IRN / QR | Unavailable | placeholders only; never printed |
| Advance receipt vouchers, credit/debit note documents | Unavailable | not built (Q9, Q11) |

**The committed code cannot hold back the tax-invoice PDF on its own**: the
route uses `invoices.view`, which the invoice list also needs. Proposed small
pre-activation change (needs your approval, scratch-tested, separate
commits):

- Backend: the PDF route requires an additional permission
  `invoices.document.view`, created by the invoice permissions migration but
  **granted to no role**. Until it is granted, every request is refused (403)
  and nothing else about invoices changes. Releasing it later is a one-line,
  reversible grant migration.
- Frontend: the "Download tax invoice (PDF)" action is shown only with
  `invoices.document.view`; otherwise the invoice page says tax-invoice
  printing is not enabled yet.

## 3. Production activation plan

Operator: the restart and deploy stages are run by you, as before. Every stage
is a script with a preflight gate and stops on any unexpected result; nothing
rolls back automatically except the frontend's restore of its previous build
when a build fails.

### Stage 0 — preflight (read-only)
- Backend HEAD `38c5609` (or the commit with the gate change), frontend HEAD
  `2b9c95e` (or its successor); tracked trees clean; preserved untracked files
  present (create-superadmin.*, integration-hub queue/worker, every
  `dist.pre-*` build, frontend `docs/`).
- Running: backend pid 183733 on 127.0.0.1:3000 from the loopback wrapper,
  frontend pid 191910 on 127.0.0.1:3100, scratch frontend 3965153 on :3101.
- The running backend build is `587fbcb`'s (statement routes present, no
  document routes); the running frontend BUILD_ID is `MECExTFdpeL6JpGc8yV48`.
- `assets/fonts` checksums match `assets/fonts/README.md`.
- None of the new tables or permissions exists yet; the expected numbers:
  quotations 4, Proforma Invoices 3, orders 8, invoices 6, receipts 3.
- Google Fonts reachable (frontend build); ≥ 2 GB free; live fingerprint taken.

### Stage 1 — backups (verified)
- `pg_dump` (custom) and schema-only dump of `texzium_erp`; restore of that
  exact dump into a scratch database; per-table fingerprint identical to live;
  scratch database dropped.
- Archive of the running backend `dist` and of `node_modules/.prisma/client`
  (the generated client is replaced in Stage 4); archive of the running
  frontend `.next` (cache excluded). SHA-256 checksums recorded; each archive
  extracted and compared byte for byte.

### Stage 2 — staged builds (no live change)
- Backend compiled into `dist.docstd-next`; expected runtime differences
  listed (new modules, removed `receipt-pdf`), no spec files; the running
  `dist` untouched.
- The full backend test suite runs once more against the exact commit.

### Stage 3 — migrations (one transaction each, in order)
1. `20261015_document_number_counter.sql`
2. `20261015_receipt_voucher_governance.sql`
3. `20261015_quotation_proforma_lines.sql`
4. `20261015_sales_invoice_lines.sql`
5. `20261015_sales_invoice_permissions.sql`
6. `20261015_company_document_profile.sql`
7. `20261015_company_document_profile_permissions.sql`

After each: fingerprint diff shows only the expected tables changed
(new tables, `Permission`, `RolePermission`, constraint-only changes on
`ReceiptVoucher`, `Quotation`, `ProformaInvoice`, `SalesInvoice`,
`SalesInvoiceItem`); no existing row's content changes; grants only to
SUPER_ADMIN. The running (old) backend is compatible with the migrated schema
(all changes additive), so the window between Stage 3 and Stage 4 is safe.

### Stage 4 — backend restart (you run it)
Stop pid 183733 → regenerate the Prisma client in `node_modules` (only while
no backend runs) → swap `dist` (old one kept as `dist.pre-docstd-<ts>`) →
start with the same loopback wrapper. Checks: 346 routes mapped, the new
document and profile routes present, `/receipt-pdf` absent, no ERROR lines,
listening on 127.0.0.1 only.

### Stage 5 — backend verification (reads only)
With in-memory 120 s tokens, against 127.0.0.1:3000 only:
- 401 without a token and 403 without the permission on every new route;
  `/receipt-pdf/*` 404.
- `GET /document-profile` 200; quotation and Proforma PDFs of existing records
  open with the "not numbered / lines not recorded" notices; statement PDF for
  CUST001 shows the same closing balance as the statement API; receipt PDF for
  RCPT-263459.
- Tax-invoice PDF refused (403 while `invoices.document.view` is ungranted;
  409 for every existing unnumbered invoice regardless).
- No server path in any PDF, nothing written to `uploads/`, database
  fingerprint unchanged by the checks, audit rows unchanged.
- Regression: the earlier security checks (WhatsApp, DocumentOS, statement).

### Stage 6 — sessions
Super Admin signs out and in again (new permissions are carried in the login
token). Until then the invoice screens show "no access".

### Stage 7 — frontend deploy (you run it)
In-place build of the approved frontend commit with automatic restore of the
previous build on failure; checks: new BUILD_ID served, code markers present,
`/document-settings`, `/quotations/<id>`, `/sales-invoices` return 200, proxy
refuses anonymous document requests (401), :3101 and the backend untouched.

### Stage 8 — browser and PDF acceptance (you)
1. Document Settings: enter the registered office, bank details, terms and
   signatory; upload the logo; a wrong IFSC is refused.
2. Quotation: create one through the governed flow → it gets `QT24/26-27/…`
   and shows its line; revise by unit rate; download the PDF (logo, company
   block, line, totals, amount in words, terms, DRAFT watermark before
   approval, none after).
3. Proforma: create from the approved quotation → `PI24/26-27/…`, lines
   copied; PDF says "not a tax invoice", shows bank details.
4. Payment receipt: open an invoice with a payment, download its receipt PDF
   (balances before/after); generate a receipt for a payment without one.
5. Statement: CUST001 statement PDF matches the screen.
6. Invoice: the invoice page shows lines (new invoices) and no tax-invoice
   download; issuing an invoice on a test governed order — **only after Q3 is
   approved**, since it consumes the first real invoice number.
7. Phone width: the line tables stack; the settings page fits.

## 4. Rollback

- **Code (preferred):** restore the archived backend `dist` and the Prisma
  client archive, restart; restore the kept frontend `.next`. The migrated
  schema stays (additive): the old code runs on it, documents numbered
  meanwhile keep their numbers.
- **Data (only if required, before any new numbered document exists):** the
  rollback blocks of migrations 7 → 1, in reverse order, each in one
  transaction; then the old Prisma client. After documents have been
  numbered, dropping `DocumentNumberCounter` would restart numbering at 1:
  do not roll it back then.
- Kept: `dist.pre-docstd-<ts>`, the backend and frontend archives, the
  database dump and schema dump, every earlier rollback build and archive.

## 5. Open items before activation

1. Your approval of the tax-invoice PDF gate change (section 2) — or explicit
   acceptance that the PDF route is live but must not be used.
2. Accountant answer to Q3 (number format) before the first invoice is issued.
3. Decision on the three legacy orders (section 1) — not blocking activation.
