# RevenueOS — Enhancement Backlog: consolidated handover (2026-10-17, revision 2)

Programme: "Comprehensive UX, Sales Workflow and Access-Control Enhancement" (16 requirements), the two
additions (phone-number lead search; pre-sales employee historical filter), the **confirmed D3 visibility
and customer-ownership policy**, and the **returning leads / repeat enquiries** requirement. Revision 2
supersedes the first revision of this document. Updated 2026-10-17: section 0 records the completed
Prisma-client restore.

Final code: backend **c75e04e**, frontend **c7e6c37**, both on branch `revenueos-remediation`.
**Nothing is deployed or activated.**

---

## 0. Incident: live Prisma client overwritten — RESTORED and verified (2026-10-17 16:48:57 IST)

On 2026-10-17 at **13:36:04 IST** I ran `prisma generate` inside a scratch export whose `node_modules` was a
**symlink to the live backend's `node_modules`**. It overwrote the live backend's generated Prisma client
(`/root/texzium-erp/backend/node_modules/.prisma/client`) with the client of the new, unactivated schema
(c75e04e). That was a write to production I had no approval for; it should not have happened.

**While it was overwritten (13:36:04 – 16:48:57):**
- The running backend (pid 637927, since Oct 13) kept running on the client it loaded at start.
- Anonymous `GET /users` returned 401, login validation returned 400, and the hourly purge worker ran at 13:36:42 and finished normally.
- The query-engine library stayed byte-identical; seven JS, type and schema files differed.
- Nothing else under the live backend changed (no other path under `node_modules` newer than Oct 13 11:35).
- The risk was a restart: it would have loaded a client expecting columns the live database does not have.

**Restore:** my own attempt was refused by the auto-mode classifier (production change), correctly. You
reviewed and ran the prepared script yourself:
```bash
bash /tmp/claude-0/-root-texzium-erp-frontend/f32ab950-ef09-46af-9275-443a808a204d/scratchpad/act/restore_live_prisma_client.sh
```
It swapped the directory at **16:48:57** and printed four `PASS` lines. The original it restored from is
`scratchpad/act/live_prisma_client_original_8d2b5ed/client` (12 files, checksummed). That copy was taken
from live at about 13:32 for the rehearsal, and I re-checked it before the run: it is byte-identical to the
rehearsal's checksummed archive (13:33:20), and its schema is the 8d2b5ed schema.

**Evidence (the script's checks, and my read-only re-check afterwards):**
- The live Prisma client matches the verified original byte for byte; the original Oct 13 11:30 timestamps are back.
- Its schema matches backend commit `8d2b5ed`, and it still reads `backend/.env`. These are the two client checks the activation preflight makes; the preflight itself was not run.
- Backend pid **637927** is unchanged (running since Oct 13); anonymous `GET /users` returns **401**.
- Frontend `:3100` `/login` returns **200**.
- The overwritten client is preserved at `scratchpad/act/overwritten_live_client_20261017_164857`.
- No leftover staging or overwritten folder in `node_modules/.prisma/`; the older `client.pre-*` / `client.p1-failed-*` recovery folders are untouched. The only other change under `node_modules` is the `.prisma` folder's own timestamp, from the rename.
- **No migration, deployment, permission change or service restart occurred.**

**Cause and prevention:**
- The activation script's reference compile also symlinks `node_modules`, but it only runs `tsc` and never `prisma generate`.
- From now on, any export that generates a client gets a real copy of `node_modules`, as the build stage already does.

---

## 1. Production state (read-only checks)

| Component | State | Changed by this work? |
|---|---|---|
| Live backend `:3000` | pid **637927**, started Tue Oct 13 11:33:26, `node -r /root/backups/bind_loopback_20261008_165548.js dist/main`, build **8d2b5ed**, loopback only | Prisma client files on disk: overwritten by mistake at 13:36:04, **restored and verified at 16:48:57** (section 0). Process, dist, `.env`, database: no |
| Live frontend `:3100` | pid **950046**, unit `texzium-frontend`, build **941ztr-XbOT2HcaZHtZMe** (b9a0aa5) | No |
| Scratch frontend `:3101` | pid 3965153 | No |
| Live database | not read (D0); not written | No (scratch databases only) |
| Live roles and grants | not changed | No |

**Other findings about production:**
- **Live `dist/` rewritten on 2026-10-16 15:33**, outside every Claude session. Its content equals a clean 8d2b5ed compile, plus the two `integration-hub` queue/worker files from untracked live sources. The activation preflight compares content, not modification times. Please check who ran a build there.
- **Connection-pool headroom (pre-existing).** Four core modules (auth, email, notifications, WhatsApp) each provide their own `PrismaService` besides the global one. So the live backend can open up to five pools of 9 connections each (45), on a Postgres cluster with `max_connections=100` shared with the scratch databases. It holds 9 today. Recommended as a separate fix: use the global DatabaseModule in those modules.
- **Integration-test connection pile-up (found and fixed in this run).** Before the fix, the suite's finished pools stayed open: the scratch database peaked at 65 connections. While that lasted, a live backend that needed a new connection could have been refused. Live held its full pool of 9 throughout, so it did not need one. Fixed in the harness (c75e04e^): peak is now 23.
- **Formatter slip on two live-only files (corrected).** A formatting pass rewrote the untracked live-only files `src/modules/adminos/integration-hub/integration-hub.{queue,worker}.ts`. I restored them byte for byte, with their original Sep 23 timestamps, from six identical earlier snapshots. Those snapshots compile to exactly the live `dist` output. Source files only; nothing was rebuilt or restarted.

---

## 2. Requirements: initial → final

Initial statuses are from the Stage A audit. "Final" means at c75e04e / c7e6c37, verified in scratch only.

| # | Requirement | Initial | Final | Notes |
|---|---|---|---|---|
| 1 | UI/UX coherence, widths, quick actions, location scroll, status colours | PARTIAL | **COMPLETE** (browser check pending) | 845489f |
| 2 | Success/error toasts | COMPLETE (tidy) | **COMPLETE** | sweep done |
| 3 | Opportunity stage remarks | COMPLETE | **COMPLETE** | unchanged |
| 4 | Interaction log, outcomes | PARTIAL | **COMPLETE, notes** | CONNECTED / NOT_CONNECTED; more outcomes need a business list. Interactions, general Notes and stage-transition remarks stay distinct (separate lists and events) |
| 5 | Customer visibility and ownership | MISSING | **COMPLETE per confirmed D3** | §3 |
| 6 | Duplicate customers | PARTIAL | **COMPLETE** | GSTIN check; atomic create; masked matches name who looks after the customer; weak phone/email matches need an explicit "different business" confirmation |
| 7 | Lead lifecycle, reopen | PARTIAL | **COMPLETE** | |
| 8 | CNC | MISSING | **COMPLETE** | call outcome |
| 9 | Leads filtering | PARTIAL | **COMPLETE** | plus a lifecycle **stage** filter and a **product** filter |
| 10 | Pre-sales panel | MISSING | **COMPLETE** | source-based pools: see limitations |
| 11 | Duplicate leads and attribution | PARTIAL → BLOCKED (product) | **COMPLETE** | returning-enquiry classification; product now recorded per enquiry (§4) |
| 12 | Recycle bin | COMPLETE | **COMPLETE** | also keeps the lead's product; a restore is refused if the product no longer exists |
| 13 | Permission administration | MISSING / PARTIAL | **COMPLETE** | knows finance.view.all (delegable by revenue.view.all holders) |
| 14 | Spare parts / content filters | BLOCKED / PARTIAL | **Spare parts BLOCKED (D6); content category filter COMPLETE** | no compatibility data invented |
| 15 | Frontend quality | PARTIAL | **PARTIAL** | `--faint` placeholder contrast open; real-browser sweep not done |
| 16 | Execution and safety | — | **Followed, with three incidents** | §0 and §1: the client overwrite (restored and verified 16:48:57), the formatter slip (corrected), the connection pile-up (fixed) |
| A1 | Phone-number lead search | — | **COMPLETE** | |
| A2 | Pre-sales historical filter | — | **COMPLETE** | |
| D3 | Confirmed visibility / ownership policy | — | **COMPLETE** (§3) | |
| RL | Returning leads / repeat enquiries | — | **COMPLETE** (§4) | product match available for enquiries that record a product |

---

## 3. Confirmed D3 policy — how it is implemented

Two checks on every request, enforced in the backend: the **permission code** of the route, AND the **record
scope**. A record outside the scope answers **404**. Company-wide totals need **finance visibility** (403 otherwise).

### 3.1 Role / permission matrix (as tested; no live role exists except SUPER_ADMIN, none created)

| | Super Admin | Pre-Sales | Sales | Finance | HR / other |
|---|---|---|---|---|---|
| Codes held (tested sets) | everything granted today + the six new codes | leads.view/create/edit/status.update/qualify/reject, leads.followups.view/create, customers.view | Pre-Sales + opportunities.view, customers.create/edit/gst.manage, quotations/proformas/salesorders.view, invoices.view, collections.view | invoices.view, collections.view/record, salesorders.advancereceipts.view, **finance.view.all** | none of RevenueOS |
| Record scope | `revenue.view.all`: everything | assigned + any lead in whose history they appear (kept after hand-off and reassignment) | same rule; the deals, customers and documents under those leads; customers they created or edited | **finance scope**: every invoice, receivable, payment, advance receipt, receipt voucher and customer statement; no leads, opportunities, quotations or customer master | — |
| Company-wide totals (FinanceOS, BI, GST) | yes | no (403) | no (403) | yes | no (403) |
| Customer of another salesperson | sees it | no details; told it exists and who looks after it | no details; told who looks after it; creating it again is refused | statement and financial documents only | — |
| Payment-gateway settings | `payments.gateway.manage` | no | no | no | no |

- A Finance clerk **without** finance.view.all sees only financial records of leads they worked on (in practice none) and no totals (tested).
- **No commercial codes for Pre-Sales:** the codes, not the lead's visibility, decide that invoices and payments stay closed (tested: 403).

### 3.2 Ownership ("mapped to a salesperson")
There is no owner field. A customer's salesperson is derived from existing data: the active user each lead
behind one of its opportunities is assigned to, most recent opportunity first (`customer-relationship.ts`).
Limited disclosure: id and name of the salesperson only, also for a customer the caller may not open. Knowing
who looks after it gives no access to it. Ownership is never changed.

### 3.3 Affected routes

**Newly behind finance visibility** (they needed only a login before; 53 routes):
- **Dashboards and analytics:**
  - `/collections-dashboard/*` (6), `/cashflow-dashboard/summary`, `/profitability-dashboard/summary`, `/customer-profitability/summary`, `/payables-dashboard/*` (4);
  - `/executive-dashboard`, `/ai-business-advisor`, `/forecasting-engine`, `/kpi-intelligence`;
  - `/vendor-analytics/*` (3).
- **Accounting:**
  - `/customer-ledgers` (GET, POST), `/vendor-ledgers` (GET, POST);
  - `/journal` (GET, POST), `/journal-engine` (GET, POST create);
  - `/trial-balance`, `/profit-loss`, `/balance-sheet`;
  - `/chart-of-accounts` (GET, POST), `/account-groups` (GET, POST), `/financial-years` (GET, POST, PATCH close).
- **Notes, vouchers and payables:**
  - `POST /credit-notes/generate`, `POST /debit-notes/generate`, `POST /refund-vouchers/generate`, `POST /bad-debt-writeoff/generate`;
  - `POST /vendor-payables/create`, `POST /vendor-payments`.
- **E-invoicing and GST:**
  - `/e-invoice/:salesInvoiceId/generate-irn`, `/e-invoice-irn` (GET, POST generate), `/e-way-bill` (GET, POST generate);
  - `/gst-returns/gstr1|gstr3b|hsn-summary`, `/gst-reconciliation`.

**Finance-scoped or newly scoped:**
- `GET /accounts-receivable` (now also needs invoices.view), and `POST /accounts-receivable` (finance visibility);
- `/receipt-vouchers` list, generate and PDF (record scope);
- sales-invoice list and create, payment-collection list, advance-receipt list and create;
- `/customers/:id/statement` and `/statement.pdf`;
- collection reminders (unmounted): finance visibility instead of revenue.view.all.

**Gateway:** `/payment-gateway-config` (GET, POST, GET active) needs `payments.gateway.manage`. Before this change, any signed-in user could read the bank account or **create and activate** a gateway; the key and secret were already redacted. The account number is now masked.

**Responses extended:**
- `GET /customers/duplicate-check` matches gain `mappedTo`; a masked 409 on create gains `mappedTo`.
- `GET /leads/duplicate-check` gains `gstin` and `inventoryItemId` parameters; it and `GET /leads/:id/duplicates` return the returning-enquiry shape (§4).
- `GET /leads/search` gains `stage` and `product` filters and facets.
- `POST /leads` and `PATCH /leads/:id` accept `inventoryItemId`; leads include `inventoryItem`.

### 3.4 Historical participation
Visibility through history is cumulative: someone who worked on a lead keeps it, and the deal under it, after
reassignment or hand-off (tested). Revocation or time-limited history access is a documented follow-up; nothing
was removed or rewritten.

---

## 4. Returning leads and repeat enquiries — how it is implemented

Built on the existing duplicate check, lead history, customer link and record scope; no new history system.

- **Five concepts, never mixed:**
  - *returning person* (`person.returning`);
  - *repeat enquiry* (`REPEAT_ENQUIRY`);
  - *potential duplicate* (`POTENTIAL_DUPLICATE`);
  - *existing customer* (`MATCH`);
  - *linked customer* (`LINKED`, through the lead's opportunities).
- **Person-match strength:**
  - EXACT: phone or email AND the same name, or phone AND email;
  - STRONG: email alone, or phone with the same company;
  - POSSIBLE: phone alone with another name (flagged "may be a different person"), name + company, or company + city;
  - only EXACT and STRONG count as the same person.
- **Kind of each other enquiry:**
  - potential duplicate: open, and the same product or a product not recorded;
  - repeat enquiry: another product, or the earlier one won, lost, rejected or deactivated.
- **Product per enquiry:** `Lead.inventoryItemId`, pointing at an existing inventory item, optional. Old leads stay "not recorded"; nothing is inferred. A later enquiry never changes an earlier one's source, product, ownership or history.
- **Cases A–D:**
  - A, linked customer: shown, with its salesperson.
  - B, earlier enquiries without a customer: shown; the new enquiry is recorded normally.
  - C, a match the person may not open: only that it exists and who looks after it, with "pass it to them, or ask an administrator".
  - D, possible duplicate: why it looks similar (source, date, product, status, who handles it); nothing merged, deleted, rejected or suppressed.
- **Never blocked:** two identical enquiries submitted at once are both kept and flag each other; a customer is created only once (advisory lock).
- **The GSTIN field on the new-lead form** is only used for the check. It is not stored, because a lead has no GSTIN column.

---

## 5. Commits

**Backend** (`revenueos-remediation`), 8d2b5ed → **c75e04e**: 14 commits; 155 files; +7,775 / −192; no dependency or config change.
- **Revision 1:** 3881bcc, 6291c94, 44bca2b, c57aec3, 3dacde9, 81bea43, 1c701e3, 41f5c2d, 8ca8dbd, a2ce0d5.
- **Revision 2:**
  - `5bedc80` feat: finance visibility, and company-wide financial routes behind it.
  - `89a3138` feat: returning enquiries, an enquiry's product, and who looks after a customer.
  - `0012a64` test: the D3 policy per role and the returning-enquiry scenarios on a real database (also the harness connection fix).
  - `c75e04e` test: the receipt-versus-cancellation race test ordered by events, not 20 ms sleeps. It was failing intermittently under load (1/2089 in the build stage); now 9/9 including 4 parallel runs.

**Frontend** (`revenueos-remediation`), served b9a0aa5 → **c7e6c37**: f3f619c, 845489f, 65e68f4, 9141463, **c7e6c37** (returning-enquiry panel, routing to the customer's salesperson, product field, stage and product filters, weak-match confirmation, dashboard totals by permission, Access knows the new codes). 83 files; +4,316 / −666.

---

## 6. Migrations (manual SQL, additive, idempotent; in this order)

| File | sha256 prefix | Effect |
|---|---|---|
| 20261019_crm_lead_lifecycle_v2.sql | b2fbb2f747630935 | UNDERQUALIFIED; LeadTimeline.outcome (+CHECK), subjectUserId (+FK, index) |
| 20261019_crm_lead_reopen_permission.sql | e7c9ebfca0e81d03 | leads.reopen → SUPER_ADMIN |
| 20261020_crm_record_visibility_permission.sql | c1f28e1391ed5c8e | revenue.view.all → SUPER_ADMIN |
| 20261020_identity_admin_v2_permissions.sql | 137f4cc29c22a1e2 | roles.permissions.revoke, users.role.assign, users.status.manage → SUPER_ADMIN |
| 20261021_finance_visibility_and_gateway_permissions.sql | 6c3bb23ecc3e14ac | finance.view.all (**granted to nobody**); payments.gateway.manage → SUPER_ADMIN |
| 20261021_crm_lead_product_interest.sql | c82b355b8dc4436d | Lead.inventoryItemId (nullable, FK ON DELETE SET NULL, index) |

Seven new codes: six to SUPER_ADMIN, finance.view.all to nobody. No existing value changes. This is proved at
activation: every pre-existing table is hashed over its pre-existing columns before and after. Re-applying all
six changes nothing (rehearsed).

---

## 7. Test results (exact)

| Suite | Result |
|---|---|
| Backend unit, clean `git archive c75e04e` export (activation build stage, rehearsal pass 7) | **2089 / 2089, 66 / 66 suites** |
| Backend integration, real AppModule and Postgres, scratch DB | **93 / 93, 10 / 10 suites**: lead-lifecycle 14, customer-duplicates 9, record-visibility 12, lead-search 11, identity-admin 11, lead-duplicates 6, content-filters 3, recycle-bin 2, **d3-policy 15**, **returning-leads 10**. Peak connections 23 |
| Frontend tests (`npm test`) | **68 / 68** |
| Frontend typecheck / lint / production build (scratch copy) | **clean / no warnings or errors / success** |
| E2E: real frontend repositories → scratch proxy → scratch backend | **8 / 8**, backend log errors 0 |
| Scratch page sweep, 20 pages and every asset | **20 / 20** |
| Activation rehearsal on a replica of live (both scripts, pass 7) | **65 / 65** |
| Real-browser pass | **not performed** (browser tunnel to the scratch ports down) |

**The nine returning-lead scenarios** are each a named test in `returning-leads.int-spec.ts`. **The D3 roles** are in `d3-policy.int-spec.ts`. That suite covers:
- Super Admin;
- Pre-Sales, including hand-off history and reassignment;
- Sales: stage and status filters, customers and statements of others, receivables, company routes, GSTIN routing, concurrent create;
- Finance, with and without finance visibility, and delegating finance.view.all;
- HR;
- the gateway.

---

## 8. Activation rehearsal (pass 7, scratch replica of live)

- **Replica:**
  - an 8d2b5ed `dist` and Prisma client copied from live;
  - settings only from the replica's own `.env`, with a scratch secret and scratch content directory;
  - started like live on 127.0.0.1:3003;
  - database `rev_enh_rehearsal`: the 8d2b5ed schema, its manual migrations, the permission codes its controllers use, and a minimal seed;
  - frontend: b9a0aa5 built in place on 127.0.0.1:3104, then HEAD c7e6c37.
- **Checks, all passed:**
  - 13 guards refused targets pointing at live;
  - stage-order gates; partial migrations refused; a database changed since preflight refused; frontend deploy refused before the backend; **backend rollback refused while a lead is UNDERQUALIFIED**;
  - backup restored identical; archives identical;
  - build: 2089/2089 unit tests; 369 routes matched the expected set; 0 ERROR lines;
  - **downtime: backend 2.6 s, frontend 41 s**; verify: backend 26 checks, frontend 40.
- **Signed-in behaviour (all passed):**
  - SUPER_ADMIN sees all; SALES is scoped (404 outside the scope); an INACTIVE user cannot sign in;
  - a login from before migrate is scoped until re-login;
  - company totals: admin 200, Sales 403; gateway settings: admin 200, Sales 403;
  - a lead with a product is created;
  - after rollback, the old backend serves the migrated database, including that lead.
- **Build reproducibility:** the staged `dist` tree hash differs per build because source maps record the build path. The **JavaScript-only** hash is reproducible: `b03ecf01cf4c97602f1c68a7e5385c2401abff3adcc0451e0eb340815a80b168`, confirmed by an independent compile of c75e04e.

---

## 9. Activation, verification, rollback (only after explicit approval; you run them)

0. The Prisma-client restore in section 0 is done (16:48:57); nothing else is needed before preflight.
1. **Backend:**
   ```bash
   B=/tmp/claude-0/-root-texzium-erp-frontend/f32ab950-ef09-46af-9275-443a808a204d/scratchpad/act/activate_enh_be.sh
   bash $B preflight     # read the IMPACT block first
   bash $B backup
   bash $B archive
   bash $B build
   bash $B migrate
   bash $B restart
   bash $B verify
   ```
2. **Frontend:**
   ```bash
   F=/tmp/claude-0/-root-texzium-erp-frontend/f32ab950-ef09-46af-9275-443a808a204d/scratchpad/act/activate_enh_fe.sh
   bash $F preflight
   bash $F archive
   bash $F deploy
   bash $F verify
   ```
3. **Rollback, frontend first, then backend (code only; the migrations stay):**
   ```bash
   bash $F rollback
   bash $B rollback
   ```
   The backend rollback refuses while any lead is UNDERQUALIFIED.

**Downtime:** backend about 3 s, frontend about 40–90 s.

**After activation:**
- Everyone signs out and in again. A login from before the migrate stage lacks the new codes, so a SUPER_ADMIN on one sees only their own records and no finance pages.
- Every non-SUPER_ADMIN user becomes record-scoped and loses FinanceOS/BI/GST routes (403) unless granted finance.view.all. That grant is a separate decision, made on `/access`.
- Non-ACTIVE users can no longer sign in.

---

## 10. Remaining limitations and follow-ups

| Item | Status |
|---|---|
| Source-based Pre-Sales pools ("panel based on the lead's source") | Not built: there is no source-to-person or source-to-team mapping in the data. Pre-Sales sees assigned and historical leads. Needs a mapping decision |
| Request-access / administrator-assisted routing workflow | Not built: the UI names the salesperson and says to ask an administrator. A workflow needs a table and a design |
| Revoking historical visibility | Documented follow-up (§3.4) |
| More call outcomes (busy, no answer…) | Needs a business list |
| Spare-part compatibility (D6) | Blocked: no authoritative data |
| ERP-wide authorization gaps outside RevenueOS policy | Still login-only: `POST/GET /inventory` (OperationsOS; anyone signed in can create inventory items), ProjectOS routes, company master, company GST, HSN master, GST engine, vendor bills. A separate authorization milestone is recommended |
| JWTs keep permissions for a day; status changes don't end sessions; `jwt.strategy` fallback secret | Pre-existing, documented |
| Live connection-pool headroom (five pools) | Pre-existing, documented (§1) |
| `--faint` placeholder contrast; real-browser acceptance | Open |
| Who rebuilt live `dist/` on 2026-10-16 15:33 | Please confirm |

---

## 11. Artifacts

Directory **`/root/backups/revenueos_enh_artifacts_20261017/`** (new; `sha256sum -c SHA256SUMS.txt`):
- both activation scripts, the rehearsal and its pass-7 output, `expected_routes.txt`;
- the six migrations;
- `git archive` of backend c75e04e and frontend c7e6c37;
- the 2089-test unit log;
- the Prisma-client restore script and the kept original 8d2b5ed client (with its checksums);
- `MANIFEST.txt` and this report.

`revenueos_enh_artifacts_20261016/` (revision 1) is superseded and left as it is. No pre-existing backup was touched.

## 12. Scratch resources

Units `texzium-enh-scratch-be` (127.0.0.1:3002, `rev_enh_verify`) and `texzium-enh-scratch-fe` (127.0.0.1:3102)
are still running, loopback only, scratch data only. Stop them with `systemctl stop texzium-enh-scratch-be texzium-enh-scratch-fe`.
The rehearsal replica (`rev_enh_rehearsal`, :3003/:3104) was stopped and dropped by the rehearsal.

---

## 13. Revision 3 addendum (2026-10-17 17:20 IST)

- **Code:** backend **b237f99** (money reports behind finance visibility, pipeline reports behind revenue.view.all; route-inventory and policy unit tests), frontend **a2c4b44** (`--faint-text` ≥ 4.5:1 for hint/placeholder text in both themes; dashboard revenue totals for finance visibility). No new migrations or permission codes; route set unchanged (369).
- **Note:** granting `revenue.view.all` to Finance would also expose every lead and customer; use `finance.view.all` for Finance.
- **Tests:** backend unit **2095/2095** (67 suites); integration **93/93** (10 suites, peak 22 connections, live stayed at 9); frontend **70/70**, typecheck and lint clean, production build OK; E2E **8/8**; page sweep **20/20**; rehearsal pass 8 **65/65** (backend downtime 2.6 s, frontend 67 s). Browser: still not possible (the connected Chrome is on your PC; `localhost:3102` there is an error page).
- **Live preflight (read-only, 16:59:51):** passed. SUPER_ADMIN ACTIVE 4 (no other roles with users); 0 non-active users; 0 QUALIFIED without hand-off; leads CONTACTED 1, NEW 6, REJECTED 1, SALES_ASSIGNED 6; migrations none; 120 tables; running build 8d2b5ed pid 637927. Live Prisma client unchanged by it.
- **Hardening:** the preflight's reference compile and the rehearsal now use real copies of `node_modules` (no symlinks to live). Live `node_modules` checked unchanged after every step.
- **M-A:** all of `revenueos_ma_wip_20261016_170913` is contained in 845489f (patch reverse-applies cleanly; backup checksums verify).
- **Artifacts:** `/root/backups/revenueos_enh_artifacts_20261017_r3/` supersedes `_20261017` for activation. Commands are as in §9 (the scripts now target b237f99 / a2c4b44).
- **No production change** in this revision.

## 14. Revision 4 addendum (2026-10-17 22:35 IST) — customer duplicate-GST workflow

- **Code:** backend **bab2c96** (149f858 + one reliable salesperson), frontend **5114eb9** (b4bca6b + "Mapped salesperson" / "not clearly assigned" and lead routing). No migrations or permission codes added; routes unchanged (369).
- **Salesperson rule:** reliable only when every assigned lead behind the customer's opportunities has the same, active assignee → "Mapped salesperson: …". Otherwise "Salesperson not clearly assigned—contact an authorized administrator." (no deal, inactive, or several people). "Created by" (the CUSTOMER_CREATED actor) stays separate and is shown only for customers the person may see.
- **Lead routing:** on a lead's page, "Assign lead to …" with a confirmation, through the existing assignment (leads.assign, scope, active assignee; history appended). Only before qualification. A lead already with sales cannot be reassigned by the existing rules, so it goes to an administrator (gap: no sales-reassignment route).
- **Tests:** backend unit 2095/2095; integration 106/106 (11 suites); frontend 73/73; build OK; rehearsal pass 9 65/65 (downtime: backend 3.3 s, frontend 49 s).
- **Artifacts:** `/root/backups/revenueos_enh_artifacts_20261017_r4/` supersedes `_r3`. No production change.

## 15. Revision 5 addendum (2026-10-17 23:25 IST) — activation in progress

- **Activation so far (run 20261017_230407, run by you):** `preflight` OK, `backup` verified (dump sha256 `fa2bb203…`, restore identical, 120 tables), `archive` verified. No migration, restart or deployment has happened.
- **`build` stopped at its unit-test gate** (1 of 2095): "an upload refused by validation leaves no temporary file behind". Cause: the upload cleanup deletes the temp file after sending the 400 (fire-and-forget), and the test listed the directory straight away; under the full run's load it lost the race. Shown by delaying the removal 100 ms (old assertion fails, new passes); not a product defect. The test used its own temp directory; the live content `tmp` stayed empty. Live was verified untouched after the failure (same pids, Prisma client hash, no new files).
- **Fix:** backend **d9fc0c5** (test only; the runtime code is identical to bab2c96). The scripts now target d9fc0c5 / 5114eb9. The stale scratch export left by the failed build was removed (scratch only). Backup and archive remain valid and are not redone.
- **Verified:** content-library suite 71/71 (10 runs, 4 in parallel); rehearsal pass 11 **65/65** (unit 2095/2095, 369 routes, backend downtime 2.1 s); live untouched throughout.
- **Artifacts:** `/root/backups/revenueos_enh_artifacts_20261017_r5/` supersedes `_r4`.
- **Next:** rerun `build`, then `migrate`, `restart`, `verify`, and the frontend stages as in §9.

## 16. Activation record (2026-10-17 / 18) — ACTIVE; browser acceptance pending

Run by the user with the checksummed scripts (`activate_enh_be.sh`, `activate_enh_fe.sh`); every stage's output was checked.

| Stage | Result |
|---|---|
| Backend preflight (23:04) | OK: 4 users, all SUPER_ADMIN ACTIVE; 0 non-active; 0 QUALIFIED without hand-off; 14 leads (CONTACTED 1, NEW 6, REJECTED 1, SALES_ASSIGNED 6); no migrations; 120 tables |
| Backend backup / archive | Verified: dump sha256 `fa2bb203…`, restore identical (120 tables); `dist` and Prisma-client archives byte-identical |
| Backend build | First attempt stopped at the unit gate (test race, fixed in d9fc0c5, §15); second: 2095/2095, staged build OK (14 new, 95 changed files; JavaScript hash equal to the rehearsal's) |
| Backend migrate | 6 migrations applied; all 120 tables identical over their pre-existing columns; Permission 71→78, RolePermission 67→73; Lead/LeadTimeline row counts unchanged |
| Backend restart (23:37) | pid 637927 → **1198136**, 369 routes, 0 errors, downtime ~2.6 s |
| Backend verify | 27/27 |
| Frontend preflight / archive | OK (73 tests); archive `frontend_next_pre_enh_20261018_001010.tar.gz` verified |
| Frontend deploy (00:12) | pid 950046 → **1202663**, build 941ztr-XbOT2HcaZHtZMe → **JOnUv4aCQzMpztv4Kiwfr**, outage ~39 s |
| Frontend verify | 40/40 |

**Production now:** backend `d9fc0c5` (pid 1198136); frontend `5114eb9` (pid 1202663, unit `texzium-frontend`, no restart policy). Seven new permission codes: six on SUPER_ADMIN, `finance.view.all` on nobody.

**Rollback material (keep; nothing to be deleted without approval):** `/root/backups/texzium_erp_pre_enh_20261017_230407.{dump,schema.sql}`, `backend_dist_pre_enh_…`, `backend_prisma_client_pre_enh_…`, `SHA256SUMS_pre_enh_20261017_230407.txt`, `frontend_next_pre_enh_20261018_001010.{tar.gz,kept}`, `SHA256SUMS_frontend_pre_enh_20261018_001010.txt`; in the backend directory `dist.pre-enh-20261017_230407` and `node_modules/.prisma/client.pre-enh-20261017_230407`. Rollback: `bash $F rollback`, then `bash $B rollback` (code only; the migrations stay; refused while any lead is UNDERQUALIFIED).

**Open:** everyone signs out and in again; browser acceptance (leads list, filters, phone search; lead Reopen / Log CNC / status move; Pre-Sales; Access (look only); new-customer GSTIN duplicate warning and routing; finance pages). The business and security decisions in §10 remain open. Scratch units `texzium-enh-scratch-be` / `-fe` (127.0.0.1:3002/3102) are still running.
