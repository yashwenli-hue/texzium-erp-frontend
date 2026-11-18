# M1 CP3 — Real-DB activation and runtime verification: the plan

Status: READ-ONLY PLANNING, 2026-10-08. Nothing in the real database, the live backend (`:3000`), the live frontend (`:3100`), the repositories' history or any migration was changed while preparing this. Backend `1a27b1e` (CP1) and frontend `de67e48` (CP2) are the code under activation.

Evidence in this document comes from (a) read-only queries against the real database, (b) a **fresh full clone of the real database** (`rev_cp3_rehearsal`, scratch only; real password hashes replaced) on which both migrations and a dress rehearsal of the runtime were run with the CP1 code and a regenerated client.

---

## 1. What is live now, and what CP1 + CP2 need

| | Live now | After CP3 |
|---|---|---|
| Real DB (`texzium_erp`, PG 16.14) | none of the M1 objects | CP1 schema + permissions |
| Backend `:3000` (pid 3596957, `node -r bind_loopback.js dist/main`, started 7 Oct 21:56) | `dist` built before CP1; its `payment-collections` controller has **no** `collections.*` permission, no actor, no events | CP1 build |
| Prisma client (`backend/node_modules/.prisma/client`, 7 Oct 21:34) | generated from `7c10ab0`; has no `recordedById`, no `PaymentCollectionEvent` | regenerated from `1a27b1e` |
| Frontend `:3100` (pid 3668301, `.next` built 8 Oct 10:35) | pre-CP2 build | CP2 build (`de67e48`) |

Proven today: compiling the backend at HEAD against the current client fails with **7 type errors, all in `payment-collections.service.ts`** (`recordedBy`, `PaymentCollectionEventInclude`, `paymentCollectionEvent`…). So regenerating the client is a hard prerequisite of the build, not an optional step. A trial compile into a scratch directory (live `dist` untouched) differs from the live `dist` by exactly two new files, both in `payment-collections/` (`payment-collection-values.js`, `dto/list-payment-collections-query.dto.js`) plus the changed controller/service/DTO. The untracked WIP in `src/modules/adminos/integration-hub/` (queue/worker) is already compiled into the live `dist` and is unreferenced; the build changes nothing about it.

Backend changes since the live build are confined to `payment-collections/`, `schema.prisma` and the two migrations (13 files; no FinanceOS file).

## 2. The migrations (exactly two, both already in the backend repo, both idempotent, both applied with `psql`)

Files, applied in this order:

1. `backend/prisma/manual-migrations/20261009_crm_payment_collection_governance.sql` (schema)
2. `backend/prisma/manual-migrations/20261009_crm_payment_collection_permissions.sql` (data)

Nothing else is pending: the real DB already has `Opportunity.customerId`, `CustomerEvent`, `Quotation/Proforma/SalesOrderEvent`, and `customers.*` permissions, so every earlier manual migration is in place. Like all earlier manual migrations these are **not** recorded in `_prisma_migrations` (39 rows, last 2026-08-17); no `prisma migrate` is used.

### Exact schema changes (taken from a DDL diff on the clone of the real DB)
- `PaymentCollection`: `ADD COLUMN "recordedById" TEXT` (nullable, FK → `User(id)` `ON DELETE SET NULL`), `CHECK ("amount" > 0)`, indexes `(accountsReceivableId, paymentDate)` and `(recordedById)`.
- New table `PaymentCollectionEvent` (id, paymentCollectionId, accountsReceivableId, salesInvoiceId, action, amount, balanceBefore, balanceAfter, fromStatus, toStatus, remarks, actorId, occurredAt, createdAt), 3 FKs (`ON DELETE RESTRICT`), 4 indexes. Zero rows on creation: no event is invented for the 4 legacy collections.
- `AccountsReceivable`: `CHECK ("paidAmount" >= 0)` and **unique index `AccountsReceivable_salesInvoiceId_key`** (SQL only; deliberately not in `schema.prisma`).
- `PaymentCollection`: partial unique index `PaymentCollection_receivable_reference_key` on `("accountsReceivableId", lower(btrim("referenceNumber")))` where the reference is non-blank.
- Deliberately **no** check on `balanceAmount` (the legacy written-off receivable carries −117,700).
- Nothing in `AccountsReceivable`, `SalesInvoice`, `CustomerLedger`, `ReceiptVoucher`, journal or GL tables is touched.

### Exact permission changes
- `INSERT` `collections.view` ("View Payment Collections") and `collections.record` ("Record Payment Collections"), module `RevenueOS`, ids from `gen_random_uuid()`, `ON CONFLICT DO NOTHING`. Real DB has 0 such rows today (Permission 51 → 53).
- Grant both to `SUPER_ADMIN` only (RolePermission 46 → 48). `FINANCE_MANAGER` (1 permission) and `HR_MANAGER` (1) get nothing. All four real users (`admin@`, `guardtest@`, `superadmin@`, `yash@texzium.com`) are `SUPER_ADMIN`.
- Permissions are copied into the login token: **every currently signed-in session keeps its old token and gets 403 on Collections until the user logs out and in again.**

## 3. Reconciliation against the real DB (read-only, today)

| Check | Real DB | Migration pre-flight needs |
|---|---|---|
| Whole-DB fingerprint vs the CP1/CP2 baseline | **identical** (twice today) | — |
| Receivables / invoices | 6 / 6, exactly one each, no orphans, none missing | no invoice with >1 receivable |
| `PaymentCollection.amount <= 0` | 0 | 0 |
| `AccountsReceivable.paidAmount < 0` | 0 | 0 |
| Duplicate reference per receivable (case-insensitive, trimmed) | 0 | 0 |
| Orphan collections | 0 | — |
| `collections.*` permissions already present | 0 | idempotent either way |
| Open transactions on the DB | 0 | — |
| DB size / free disk | 14 MB / 183 GB free | — |

The real DB is **not** identical to the scratch DB that CP1/CP2 were verified on, in these ways: it has 4 users (no scratch users), `FINANCE_MANAGER` has no collections permission, no governed customer link exists on any receivable chain, and it holds 2 `ReceiptVoucher` rows. It is identical to the clone built today (all tables except `User`, whose hashes were neutralised in the clone).

### Legacy data the activation must leave exactly as it is
| Receivable | Invoice | State | Why it matters |
|---|---|---|---|
| `a280772a` | DRAFT, no number/customer name | AR `PAID`, 295,000 paid, 2 collections (UTR-10001, UTR-10002) | `INVOICE_NOT_POSTED` anomaly; cannot take a payment |
| `9919b19c`, `6ddbbf83`, `7d87d922` | Raj Traders, POSTED | `PENDING`, 295,000 each, due 30 Jun 2026 (= invoice date) | open, overdue by the recorded due date |
| `9e4f394d` | Raj Traders, POSTED | `WRITTEN_OFF`, paid 345,000 vs 1 payment of 50,000, balance −117,700 | negative balance and paid-mismatch anomalies; closed |
| `fb72c6f5` | Tata Projects, POSTED | `PARTIAL`, paid 100,000 (`STAGE2G-VERIFY-001`, receipt RCPT-427650), balance 224,500, due 21 Sep 2026 | the only receivable whose customer ledger agrees with it (ledger balance 224,500) |

Raj's ledger runs 817,300 while its receivables net to 767,300 — a 50,000 legacy drift that the delta-based command preserves and CP3 must not "fix". None of the 6 receivables has a governed customer (no deal on these chains is linked to a customer; `CUST001` has 0 deals): **the real Collections page will show every group as "name on invoice (not verified)"** and the Customer Collections Statement of CUST001 will be empty. That is data, not a defect; linking Raj's deal to CUST001 is a separate customer-link action and is out of CP3.

Predicted real Collections figures (from SQL; to be confirmed against the clone before activation): to collect 4 open invoices ₹11,09,500; overdue 4; paid 1; written off 1; needs review ≥ 2 (the DRAFT-invoice receivable and the written-off one); collected last 30 days ₹1,00,000 (1 payment); due soon 0.

## 4. Dress rehearsal on the clone (done, scratch only)

Clone `rev_cp3_rehearsal` = whole real DB (pg_dump, read-only session), hashes neutralised. Then:

- **Migrations**: both applied cleanly. Changed tables: `PaymentCollection` (column added), `PaymentCollectionEvent` (new, 0 rows), `Permission` (+2), `RolePermission` (+2). Every other table's row count and content hash identical.
- **CP1 code + regenerated client, real data, guards phase — 28/28, clone fingerprint identical before/after (no mutation):** 401 without a token; 403 for a token without `collections.*` (the existing-session case); admin token built from the role's real permissions; reads of all 6 invoice histories; 409 `OVERPAYMENT` (224,500.01 on Tata), 409 `DUPLICATE_REFERENCE` (legacy reference in other case and padded), 409 `RECEIVABLE_CLOSED` (written-off), 409 `INVOICE_NOT_POSTED` (DRAFT invoice); 400 for zero, negative, sub-paisa, future-dated, missing reference, unknown mode, unknown field; 404 unknown invoice; the three database rules (second receivable, zero amount, case-variant duplicate by raw SQL) refuse.
- **Pay phase — 8/8:** two simultaneous identical ₹1.00 requests on Tata: exactly one 201 and one 409 `DUPLICATE_REFERENCE`; repeat after commit 409; history 2 collections + 1 event.
- **Old (live) build against the migrated clone:** the live `dist` with its old client still lists collections and still records a payment (recorder null, no event), so restoring the old code after the migration is safe.
- **Exact mutation set of that one payment (clone):** 4 tables, 4 row-level effects, nothing else:

| Table | Effect |
|---|---|
| `PaymentCollection` | +1 row: ₹1.00, `BANK_TRANSFER`, ref `CP3-VERIFY-001`, remarks, `recordedById` = acting user |
| `PaymentCollectionEvent` | +1 row: `PAYMENT_RECORDED`, 224,500 → 224,499, `PARTIAL` → `PARTIAL`, actor |
| `AccountsReceivable` `fb72c6f5` | `paidAmount` 100,000 → 100,001, `balanceAmount` 224,500 → 224,499, `paymentStatus` stays `PARTIAL`, `updatedAt` bumped; `outstandingAmount` (324,500) untouched |
| `CustomerLedger` | +1 credit row for "Tata Projects": credit 1.00, running balance 224,499, remarks "Payment received CP3-VERIFY-001" |

`SalesInvoice` (including its `paymentStatus`), `JournalEntry` (9 → 9), `ReceiptVoucher`, every GL/credit-note/debit-note/write-off table: unchanged.

## 5. Recommendation on a real payment

**Recommended: one controlled ₹1.00 payment, only with your explicit go, on the Tata Projects receivable `fb72c6f5` (invoice `523eddb0-27fc-4277-933e-f0ed25b66f97`).**

Why it is appropriate: it is the only way to prove, on the real DB, the regenerated client, the new columns and unique indexes, the permission grant in a real login token, the ledger advisory lock and the event write together. Tata is the right receivable because it is the invoice Stage 2G already used for its own verification payment (`STAGE2G-VERIFY-001`, receipt RCPT-427650), it is a single-invoice customer whose ledger (224,500) agrees with the receivable, and ₹1.00 keeps it `PARTIAL`, so no status change.

Why it needs your decision: it is a permanent financial row in a customer ledger. RevenueOS has no reversal, FinanceOS has none, and CP3 adds none. The real DB's contents (UTR-10001…, STAGE2G-VERIFY-001) look like test data, but only you can say that.

**Fallback if you say no:** CP3 still runs the whole refused-write matrix, the reads and the permission checks on the real DB (zero mutation by design), and the success path stays proven only by the clone dress rehearsal and the earlier 142 + 49 scratch checks. I would then mark CP3 "activated, success path not exercised on the real DB".

**Receipts: no receipt is generated on the real DB in CP3.** `POST /receipt-vouchers/:id/generate` is a FinanceOS route with no guard (no login needed), a random `RCPT-` number, no uniqueness and no link back, so every call adds a voucher. The UI behaviour (button only with `collections.record`, explicit confirmation, warning) was verified on scratch. A real receipt for the ₹1.00 payment would add one `ReceiptVoucher` row and is not recommended; say so if you want it.

## 6. Activation procedure (needs your approval; every step stops on any surprise)

**A. Before anything (read-only or file-only)**
1. Re-run the read-only fingerprint of the real DB (`fp_real.sh`); it must equal `fp_before.txt`. Re-run the pre-flight SELECTs of §3; every count must be as listed. Confirm no open transactions and `git status` clean for tracked files in both repos (HEAD `1a27b1e` backend, `de67e48` frontend).
2. Backups (new files only): `pg_dump -Fc` of `texzium_erp` to `/root/backups/texzium_erp_pre_m1cp3_<timestamp>.dump` (mode 600, verified with `pg_restore -l`); schema-only dump for the DDL diff; `cp -a backend/dist backend/dist.pre-m1cp3`; `cp -a backend/node_modules/.prisma/client backend/.prisma-client.pre-m1cp3`; copy of `frontend/.next` to `.next.pre-m1cp3`; the live backend's environment saved to a 600 file (never printed).
3. Confirm the browser path to `:3100` works (the scratch ports did) and that you can log in; you will type the password yourself.

**B. Activation (one maintenance window of a few minutes; signed-in users are logged out in effect)**
1. Stop the live frontend (3100) and the live backend (3000) **by PID from `ss -ltnp`** (never `pkill -f`).
2. Apply `…_governance.sql` then `…_permissions.sql` with `psql -v ON_ERROR_STOP=1` as the DB owner. Their own pre-flight guards abort with nothing created if the data disagrees.
3. Fingerprint the real DB. **Expected diff:** exactly `PaymentCollection` (new column in the row text; the old-column projection must be identical), `PaymentCollectionEvent` (new, 0), `Permission` (+2), `RolePermission` (+2). Anything else → stop and roll back (§8).
4. `npx prisma generate` in the backend (no DB connection), then `npm run build` (`nest build -p tsconfig.build.json`).
5. Start the backend exactly as before (same environment, `bind_loopback.js`, loopback only), then check the log shows the new routes mapped.
6. Frontend: `env -u NEXT_PUBLIC_USE_MOCK npm run build` in `frontend/` (touches the untracked `.next` only), start `next start -H 127.0.0.1 -p 3100`.

**C. Verification** — the matrix in §7.

**D. Close-out**: final fingerprint and diff against the expected mutation set, report, then stop. Nothing is committed in CP3 unless a defect needs a fix; the plan document stays untracked.

## 7. Runtime test matrix (real stack)

| # | Check | How | Expected | Mutation |
|---|---|---|---|---|
| R1 | Backend up, new routes mapped | log | `payment-collections` routes incl. `invoices/:id` | none |
| R2 | No token | `GET`/`POST /payment-collections` | 401 | none |
| R3 | Old session (no `collections.*`) | your open tab, before re-login | 403; Collections page shows "You can't view collections"; **no** receivable/payment request made by the page | none |
| R4 | Re-login (you) | UI | new token carries `collections.view` + `collections.record` | none |
| R5 | Collections, read-only | UI + network | page renders the 6 real receivables; figures as predicted in §3; groups "name on invoice (not verified)"; all requests 200; no console errors | none |
| R6 | Grouped/flat toggle, filters, search, sort, per-invoice history | UI | as on scratch; legacy collections show without a recorder and without events | none |
| R7 | Invoice panel + Customer Collections Statement (CUST001) | UI | panel as built; statement empty-state for an unlinked customer; legacy anomalies shown plainly | none |
| R8 | Responsive/theme spot check | desktop + 390 px, light/dark | no overflow | none |
| R9 | Refused writes (the 4 × 409 and the 400/404 cases of §4) against the real receivables | UI dialog + in-page fetch | same codes/messages as the clone; Record Payment dialog shows the live balance | **none** (fingerprint before = after) |
| R10 | Permission variants | R2/R3 above plus the 49 HTTP checks (view-only, record-only, none) already run on scratch | see note | none |
| R11 | **One ₹1.00 payment (only if approved)** on Tata `fb72c6f5`, ref `CP3-VERIFY-001`, via the dialog; immediately the same reference again from a second request | UI, then in-page fetch | 201; second 409 `DUPLICATE_REFERENCE`; balance 224,499, `PARTIAL`; history shows 2 collections + 1 event with your name | the 4-row set in §4, nothing else |
| R12 | Overpayment / closed receivable after R11 | dialog | 409 messages | none |
| R13 | Receipt generation | not run on the real DB | — | none |
| R14 | FinanceOS boundary | SQL | `JournalEntry` 9, `SalesInvoice`, `ReceiptVoucher` 2, GL, credit/debit-note and write-off tables unchanged; `AccountsReceivable` differs only in `fb72c6f5` paid/balance/updatedAt (if R11) | proves no unrelated change |

Note on R10: the real DB has no non-admin user and creating one is a real mutation (`User`/`Role`/`RolePermission`), so real-DB permission variants are limited to *none* (401), *old token* (403) and *SUPER_ADMIN* (allowed). The view-only, record-only and customers-only variants stay proven on scratch (49 HTTP checks, 105 UI checks, and the browser pass). If you want a real restricted-role check, that is an extra, separately approved mutation; I recommend against it.

Concurrency: the real run does not race real payments. The race (two identical requests, one winner) is part of R11 and costs no extra mutation; the heavier concurrency matrix (parallel different payments, lock timeout, CAS backstop) was proven on scratch (142 integration checks) and is not repeated on real data.

## 8. Rollback procedure

| Situation | Action | Data effect |
|---|---|---|
| Pre-flight shows a surprise | stop; nothing was changed | none |
| Migration aborts on its own guard | nothing was created (the file is one transaction) | none |
| Fingerprint after migration is wrong | stop backend/frontend if running; run the rollback blocks (permissions first, then governance; both are in the files and were rehearsed to restore schema and data byte-identical) | restores pre-migration state (no events exist yet) |
| Build/start fails, no payment made | stop; restore `dist.pre-m1cp3` and `.prisma-client.pre-m1cp3`, restore `.next.pre-m1cp3`; restart old processes. The migrated DB can stay: the old build ignores the new column/table (proven on the clone) | none |
| Runtime defect found in R5–R10 | same as above; or fix forward if small | none |
| After R11 (a real payment exists) | **do not run the schema rollback** (it would drop the event and recorder). Keep the schema; restore old code only if needed. Reversing the ₹1.00 itself is a separate, explicitly approved compensating transaction using the pre-image captured just before R11 (delete the event and collection, delete the one ledger row, restore the receivable's two figures, with exact-row predicates) | removes our own test row only |

Full-disaster option: `pg_restore` of the pre-activation dump into a new DB and compare; the live DB is never dropped or replaced without a separate approval.

## 9. Safety stop conditions (any one stops CP3 immediately and reports)

- The real fingerprint at the start differs from the baseline, or any pre-flight count differs from §3.
- Any open transaction or unknown writer on the real DB.
- The migration prints an error, or the post-migration fingerprint shows any table other than the four expected, or the `PaymentCollection` old columns' hash changes.
- `prisma generate` or `nest build` fails, or the build contains a file other than the expected delta.
- The backend does not start, or any route other than the expected set changes behaviour.
- R9 changes anything (fingerprint before ≠ after), or R2/R3 return anything but 401/403.
- Any mention of a payment other than the approved ₹1.00 row, a second payment row, a `ReceiptVoucher`, a `JournalEntry` or any GL/ledger change beyond the one credit row.
- A need to change FinanceOS code, correct legacy data, fix a due date, add GL/reversal/refund/write-off, or activate any unrelated RevenueOS feature.
- You decline R11: CP3 continues as read-only + refused-write verification only.

## 10. Known risks and open items

1. **Forced re-login** for every signed-in user, by design of the login token.
2. **Maintenance window**: backend and frontend are stopped for the migration and builds (a few minutes).
3. **The ₹1.00 payment is permanent** (no reversal exists anywhere).
4. **No governed customer link** on the real receivables, so the Customer Collections Statement and customer grouping cannot be shown on real data without a separate customer-link change by you.
5. **FinanceOS defects stay**: `POST /accounts-receivable` returns 500 on a duplicate once the unique index exists; due dates equal invoice dates (so most open invoices read as overdue); the receipt route, `POST /accounts-receivable` and many FinanceOS reads are unguarded; Raj's ledger drifts 50,000 from its receivables. None is touched.
6. **Other writers do not take the collection lock** (bad-debt write-off, credit/debit notes): documented in `revenueos-m1-financeos-ar-boundary.md`; the command detects an interleaved change and refuses with `RECEIVABLE_CHANGED` rather than overwrite it.
7. **Build includes untracked WIP** in `backend/src/modules/adminos/integration-hub/` exactly as the live build already does; and the untracked `create-superadmin.*` files in the backend root are not touched.
8. **Scratch leftovers**: DBs `rev_coll_verify` and `rev_cp3_rehearsal` (the latter is a full copy of real business data with passwords neutralised) should be dropped after CP3; `rev_cp3_rehearsal` is kept until then as the predicted-fingerprint reference.
