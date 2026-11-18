# RevenueOS documents — phased activation plan

Prepared 2026-10-12 for review; updated the same day for decision D1-a and the
Phase 1 verification. Nothing here has been applied: live backend (`587fbcb`,
pid 183733) and frontend (`be44e88`, pid 191910) are unchanged.
Every phase starts with the verified-backup and archive stages of
`revenueos-document-activation-plan-2026-10-12.md` (dump + restore rehearsal,
build archives, Prisma client archive) and ends with read-only verification.
Restarts and deploys are run by you.

## Commit line (backend, in order)

| # | Commit | Content |
|---|---|---|
| 1 | `ca28847` | document number counter |
| 2 | `9fc87cf` | receipt PDF retired; receipt generation guarded, idempotent, numbered |
| 3 | `b2f3ef3` | quotation / Proforma lines and numbers, unit-rate revision |
| 4 | `3816353` | invoice amounts from the Quotation, numbering, once per order, invoice permissions |
| 5 | `2bde54f` | shared PDF layout, Noto fonts, document profile |
| 6 | `c13b5e6` | statement on the shared layout, IST days |
| 7 | `96c9bd6` | quotation, Proforma, tax-invoice, receipt PDFs |
| 8 | `38c5609` | test only |
| 9 | `a3448bf` | tax-invoice PDF gate (`invoices.document.view`, ungranted) |
| 10 | `eef8a47` | D1-a: M5 grants `invoices.view` only; `invoices.create` granted by M9 |

Frontend: `2b9c95e` (documents), `ad992a0` (gate). The history is linear, so a
phase deploys everything up to a commit; a later feature cannot go live
without the earlier ones.

## Migrations

| # | File | Phase |
|---|---|---|
| M1 | `20261015_document_number_counter.sql` | 1 |
| M2 | `20261015_receipt_voucher_governance.sql` | 1 |
| M3 | `20261015_quotation_proforma_lines.sql` | 2 |
| M4 | `20261015_sales_invoice_lines.sql` | 2 |
| M5 | `20261015_sales_invoice_permissions.sql` (creates `invoices.view` and `invoices.create`; grants **only** `invoices.view` → SUPER_ADMIN, since `eef8a47`) | 2 |
| M6 | `20261015_company_document_profile.sql` | 2 |
| M7 | `20261015_company_document_profile_permissions.sql` | 2 |
| M8 | `20261016_tax_invoice_document_permission.sql` (created, **granted to nobody**) | 2 |
| M9 | `20261017_sales_invoice_create_grant.sql` (`invoices.create` → SUPER_ADMIN; refuses to run before M5) | 3 |

## Phase 1 — receipt security (no accountant dependency)

Approved for activation planning (2026-10-12). Not applied.

- Backend: build of `9fc87cf` (commits 1–2) from a clean `git archive` export
  (never the working tree), with its own node_modules copy. Migrations M1, M2
  before the restart, while the old build runs.
- **Prisma client: must be regenerated** (correction to the earlier plan):
  `9fc87cf` changes `schema.prisma` (unique receipt columns, the receipt ↔
  payment relation, `DocumentNumberCounter`) and the receipt service looks a
  receipt up by its payment, which the old client cannot do. The client is
  generated in the export and swapped into the live `node_modules/.prisma/client`
  only while the backend is stopped; the old client is archived and kept.
- Frontend: unchanged (`be44e88` only calls the receipt generate route, now
  guarded by `collections.record`, which SUPER_ADMIN has; verified by running
  the exported `be44e88` repositories against the Phase 1 scratch backend).
- Effect: the disk-writing `GET /receipt-pdf/:id` disappears (removes server
  path exposure); receipt generation needs `collections.record`, is one per
  payment (asking again returns the existing receipt), new receipts numbered
  `RC/26-27/00001`; `GET /receipt-vouchers?salesInvoiceId=` (needs
  `collections.view`). Invoices, quotations, statement: unchanged.
- Routes: 338 → 338 (−`GET /receipt-pdf/:receiptVoucherId`, +`GET /receipt-vouchers`).

### Does `9fc87cf` keep every live fix? (verified 2026-10-12, read-only on live)

- Live runs `587fbcb` exactly: every runtime `.js` in the running `dist` is
  byte-identical to a clean build of `587fbcb`; the only extra files are
  `integration-hub.queue.js` / `.worker.js`, compiled from the preserved
  untracked sources, which nothing loads. The live Prisma client is generated
  from the `587fbcb` schema. `dist` has not changed since the process started.
- `587fbcb` is an ancestor of `9fc87cf`, so every live fix (Security M1–M3,
  lead unassign and actor tracking, DocumentOS, the statement) is in it.
- A clean `9fc87cf` build differs from the clean `587fbcb` build in exactly 3
  changed (`app.module`, receipt-vouchers controller and service), 3 new (IST
  dates, document numbering, receipt list DTO) and 3 removed (receipt-pdf)
  runtime files; all other 569 runtime files are byte-identical. No package or
  build configuration change.
- Scratch rehearsal (fresh copy of live, dummy secrets), the same checks used
  at each earlier activation, on the live-equivalent build and on `9fc87cf`
  + M1, M2: Security M2 (27), M3/WhatsApp (21), DocumentOS (12), lead actor
  (12), statement (40) — 112/112 pass on both; the 338-route bad-token sweep
  (8 token variants) is identical (335 routes 401, the same 3 public ones);
  18/18 receipt checks; full backend suite on the exact export 1,909/1,909.
- Conclusion: no live behaviour is rolled back; a forward-only alternative is
  not needed.

### Activation (script `activate_p1_be.sh`, stages; you run `restart`)

preflight → backup (dump + restore rehearsal) → archive (running `dist` and
Prisma client) → build (export, full tests, staged `dist.p1-next` checked file
by file against the running build and the rehearsed build) → migrate (M1, M2;
only change allowed: the new empty `DocumentNumberCounter`) → **restart**
(stop → swap `dist` and client → start; 338 routes, receipt list mapped,
receipt-pdf absent) → verify (reads only; Phase 1, M2, M3, DocumentOS, lead
actor and statement checks with 120 s in-memory tokens on 127.0.0.1:3000;
fingerprint, AuditLog, uploads/ unchanged; no ERROR in the log).

### Attempt 1 — 2026-10-12 15:57 (rolled back)

- preflight, verified backup (`texzium_erp_pre_p1_20261012_155715.dump`,
  restore rehearsal identical), dist and Prisma-client archives, build (1,909
  tests; staged build identical to the rehearsed one) and **migrations 1–2:
  applied and kept** (only the new empty `DocumentNumberCounter` table).
- restart failed: the staged client had been generated in the clean export,
  which has no `.env`, so it lacked the `.env` lookup (`schemaEnvPath
  ../../../.env`) through which the live backend reads `DATABASE_URL`.
  Backend down 15:58:31–16:05:21 (≈7 min). The rehearsal had missed it because
  it passed `DATABASE_URL` to the scratch backend directly.
- On your instruction, code rollback: running `dist` and client byte-identical
  to the archives, 338 routes, 112/112 security and statement checks, database
  identical to the post-migration snapshot. Live pid 329176.
- Fixed in the script: the client is generated with a placeholder `.env` and
  must look up `.env` exactly as the running client does; preflight accepts
  migrations 1–2 already applied (counter must be empty) and stops on a
  partial state; the rehearsal now passes settings only through `.env`.
  Rehearsal 2: 29/29.
- Kept: `dist.pre-p1-20261012_155715`, `dist.p1-failed-20261012_155715`,
  `node_modules/.prisma/client.pre-p1-…`, `client.p1-failed-…`, all archives.

### Attempt 2 — 2026-10-12 16:33: ACTIVE

Backend `9fc87cf` running since 16:35:08 (pid 343403, 338 routes, ≈2 s
restart). Migrations 1–2 re-run as a verified no-op. Staged client identical to
the rehearsed one apart from its generation-path metadata, `.env` lookup equal
to the old live client. Verify: 112/112 regression checks + 12 receipt checks,
database identical to the preflight snapshot (fingerprint `cfcb0a41…`),
frontend untouched. Backups `*_pre_p1_20261012_163343*`. Code rollback:
`activate_p1_be.sh rollback` (restores `587fbcb`).

### Rollback

- Code (preferred): the script's `rollback` stage restores the archived `dist`
  and Prisma client and restarts. M1 and M2 stay: the old build runs on them
  (rehearsed: 112/112 checks, same 338 routes). One difference while rolled
  back: the old code's receipt generation for a payment that already has a
  receipt now fails (500) instead of creating a duplicate.
- Data (only if needed): M2's rollback block (drops the two unique indexes and
  the foreign key) is safe at any time; M1's (drops the counter) only while no
  `RC/…` receipt exists. Both were rehearsed: schema and data return to the
  exact pre-migration state.
- Kept: `dist.pre-p1-<ts>`, `node_modules/.prisma/client.pre-p1-<ts>`, the dump,
  schema dump, dist and client archives with checksums, every earlier build
  and archive. `uploads/receipts/` (files written by the retired route) is not
  touched.

## Phase 2 — safe documents (D1-a)

### Phase 2 activation scripts (prepared and rehearsed 2026-10-12; NOT activated)

Scripts in the scratchpad `p2/act/`: `activate_p2_be.sh` (preflight → backup →
archive → build → migrate → restart → verify; rollback) and `activate_p2_fe.sh`
(preflight → archive → deploy → verify; rollback). Order: backend, then frontend;
roll back frontend first.

- Backend gates: running build is exactly the 9fc87cf build; live client reads
  `<backend>/.env`; committed fonts present; Phase 1 migrations in place;
  migrations 3–8 none or all applied (partial stops); `invoices.create` and
  `invoices.document.view` not granted. Staged client generated with the `.env`
  placeholder and checked against the running client; staged build identical
  to the reference build (18 changed, 19 new runtime files, none removed).
- Migrate: every pre-existing value preserved (each table hashed over its
  pre-existing columns), only the three new empty tables, +4 permissions, +2
  grants (`invoices.view`, `documents.profile.manage` → SUPER_ADMIN), new empty
  `SalesInvoiceItem` columns; stops if the database changed since preflight.
- Restart: mapped routes must equal the rehearsed set (338 + 8 document routes).
- Verify (reads only): Phase 2 checks (32: new routes 401/403; issuing refused;
  tax-invoice PDF 403; a legacy invoice 409 even with the ungranted
  permission in an in-memory token; quotation, Proforma, receipt PDFs with safe
  headers, no server path, no IRN/e-way-bill text; no number consumed; nothing
  written) + Phase 1 receipt checks + the 112 regression checks.
- Frontend: refuses to deploy until the Phase 2 backend runs; in-place build of
  `ad992a0` with automatic restore of the previous build on failure.
- Rehearsal (live copy, settings only from `.env`): 40/40, including full tests
  1,997/1,997, backend restart and verify, frontend deploy (≈37 s down) and
  verify (21), frontend and backend rollback, and 9fc87cf on the
  Phase-2-migrated database (124 checks).
- After activation: Super Admin signs out and in again.


- Backend: build of `eef8a47` (commits 3–10). Migrations M3–M8 before the
  restart; regenerate the Prisma client while no backend runs.
- Frontend: deploy `ad992a0`.
- Super Admin signs in again (new permissions are in the login token).
- Released: quotation PDF, Proforma PDF ("not a tax invoice"), payment receipt
  PDF, statement on the new layout (IST days), Document Settings, quotation
  lines and unit-rate revision, quotation / Proforma numbering, invoice pages
  with lines, invoice correction (amounts from the Quotation, no GST twice,
  once per order, invoice permissions).
- Held: the tax-invoice PDF (`invoices.document.view` granted to nobody; the
  invoice page says printing is not enabled).
- Routes: 338 → 346.
- Checks (reads only, short-lived tokens, loopback): every new route's 401 and
  403; the tax-invoice PDF 403 for the signed-in Super Admin; quotation,
  Proforma, statement and receipt PDFs open for existing records with the
  "not numbered / lines not recorded" notices; nothing written to `uploads/`;
  fingerprint unchanged by the checks; earlier security regression checks.
- Browser acceptance: Document Settings (registered office, bank details,
  logo, terms, signatory), a governed quotation → Proforma with PDFs, a receipt
  PDF, the statement PDF, the invoice page showing "printing not enabled",
  phone width.
- Note: the three legacy orders (`6842c6b7`, `726391a5`, `b73265ec`) cannot be
  invoiced from Phase 2 on (their quotations have no tax breakdown). They are
  not modified.
- Rollback: restore the archived `dist`, Prisma client and frontend `.next`;
  migrations stay (additive). Undoing M3–M8 is only safe before any new
  numbered quotation or Proforma exists.

**Decision D1: D1-a chosen (2026-10-12).** M5 now creates both invoice
permissions but grants only `invoices.view` (`eef8a47`). After Phase 2,
invoices can be read but not issued: issuing, and adding items to an invoice,
answer 403 and the order page says "You don't have permission to issue
invoices." Scratch-tested on a fresh copy of live with M1–M8: the signed-in
Super Admin holds `invoices.view` only; issuing is refused and takes no number;
quotation, Proforma and statement PDFs work; the 112 regression checks and the
346-route sweep pass; full backend suite 1,997/1,997.

### Phase 2 ACTIVE — 2026-10-12 17:04

Backend `eef8a47` pid 360833 (since 17:04:41, ≈2 s down); frontend `ad992a0`
build `GFGYpZdIUFb4eGfzL3VO7` pid 361704 (since 17:05:50, ≈47 s down).
Migrations 3–8 applied; `invoices.create` and `invoices.document.view`
ungranted; counter empty. Verify: Phase 2 32/32, receipts 12/12, regression
112/112, frontend 23/23. Database fingerprint `9d714e1b…` (117 tables).
Backups `*_pre_p2_20261012_170311*`, frontend `*_pre_p2_20261012_170500*`.
Rollback: `activate_p2_fe.sh rollback`, then `activate_p2_be.sh rollback`.

Permanent numbering formats (accountant review, checklist Q3): one series per
seller GST registration and financial year (IST), allocated inside the
creating transaction, consecutive, 5 digits:
`QT<state>/<yy-yy>/<nnnnn>` (quotations), `PI<state>/<yy-yy>/<nnnnn>`
(Proformas), `SI<state>/<yy-yy>/<nnnnn>` (sales invoices, Phase 3 only), and
company-wide `RC/<yy-yy>/<nnnnn>` (payment receipts). Two registrations exist
(state 24, default; state 27), so e.g. `QT24/26-27/00001` and
`QT27/26-27/00001` are separate series. The 4 existing quotations and 3
Proformas stay unnumbered.

## Phase 3 — invoicing on (after checklist Q3)

Apply M9 `20261017_sales_invoice_create_grant.sql` (one data-only transaction:
one `RolePermission` row); Super Admin signs in again (a token from before the
grant is still refused). First invoice issued on a governed order is checked in
the browser (number, amounts, lines). No deploy. Scratch-tested: M9 refuses to
run before M5; it is idempotent; re-running M5 afterwards keeps the grant;
after a new sign-in the first invoice is `SI<state>/26-27/00001` and the
tax-invoice PDF stays refused; its rollback block removes the grant and issuing
is refused again.

## Phase 4 — tax-invoice PDF (after checklist Q1, Q4, Q5, Q6)

If e-invoicing applies, a real IRP integration (IRN, acknowledgement, signed
QR printed on the invoice) must be built, reviewed and activated first: not
started. Then grant `invoices.document.view` to the agreed roles (one
data-only transaction, reversible), sign in again, and run the tax-invoice PDF
acceptance with the accountant. Copy labels (Q5), delivery address (Q6) and
round-off (Q8) may need code changes before this phase.

## Blocked or not built (accountant decisions)

| Item | Waiting for |
|---|---|
| Invoice number format / first numbered invoice | Q3 (Phase 3, M9) |
| Tax-invoice PDF | Q1 e-invoicing (+ IRP integration if applicable), Q4 signature, Q5 copies, Q6 delivery address |
| E-invoice IRN / QR | Q1; placeholders only today, never printed |
| HSN digits printed | Q2 (full stored code printed today) |
| Round-off to the rupee | Q8 |
| Advance receipt vouchers (Rule 50) | Q9; not built |
| Payment receipt wording | Q10 (released with current wording "not a GST receipt voucher") |
| Credit / debit note documents | Q11; not built |
| Registered office address entry | Q12 (Document Settings, Phase 2) |
| Legacy duplicate invoices and the three blocked orders | Q13 |
