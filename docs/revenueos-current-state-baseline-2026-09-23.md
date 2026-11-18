# RevenueOS — Authoritative Current-State Baseline

**Audit date:** 2026-09-23
**Document status:** Authoritative baseline for the RevenueOS remediation program. Documentation only — no application code, backend code, schema, or `create-superadmin.ts` was modified in producing the audit or this document.
**Scope:** RevenueOS (ERP Module 1) frontend at `/root/texzium-erp/frontend` and the read-only backend at `/root/texzium-erp/backend`.
**Method:** Read-only inspection of both repositories (code, Prisma schema, controllers, DTOs, git history) plus direct execution of the frontend `typecheck`/`lint`/`build` and the backend `nest build`. `create-superadmin.ts` was never opened or executed. Backend `lint` was deliberately not run because its script passes `--fix`.

This document supersedes the per-milestone briefs in `docs/` as the statement of *current truth*. Those briefs remain valid *historical* records (see §K).

---

## Status vocabulary

| Label | Meaning |
|---|---|
| **DONE** | Implemented and working against the real backend contract |
| **PARTIALLY DONE** | Some of the intended scope works; the rest is listed explicitly |
| **FRONTEND GAP** | Backend capability exists but the frontend does not expose it |
| **BACKEND GAP** | Capability does not exist in the backend |
| **INTEGRATION GAP** | Two pieces exist (or are expected) but are not connected |
| **DEFERRED** | Known, understood, and intentionally postponed — *not forgotten* |
| **INTENTIONAL BOUNDARY** | A deliberate OS-ownership or scope limit; do not change |
| **BLOCKED** | Cannot proceed until another party/side changes |
| **OBSOLETE** | Superseded or discarded; kept only as history |
| **NEEDS ARCHITECTURAL DECISION** | Ownership or design is ambiguous and must be decided, not assumed |

Finding categories used in §F: BACKEND BUG, BACKEND MISSING CAPABILITY, INTEGRATION GAP, SECURITY ISSUE, ARCHITECTURAL DUPLICATION, DEFERRED.

---

## A. Repository checkpoint (as audited, 2026-09-23)

| | Frontend | Backend |
|---|---|---|
| Path | `/root/texzium-erp/frontend` | `/root/texzium-erp/backend` |
| Branch | `revenueos-design-prototype` | `revenueos-ui-v1` |
| HEAD | `c86939382679aabb65c87619aa6560ce23ce6f78` — `c869393` "fix(revenueos): rename Dark V4 theme label to just Dark" | `94faa5676f7a6ff4cb356860fa44ceb80fe4b460` — `94faa56` "feat(crm): complete lead followup lifecycle" |
| Working tree at audit time | Not clean: modified `tsconfig.tsbuildinfo` (build artifact); untracked: 17 files in `docs/`, `lib/types/domain.ts.save`, `lib/types/domain.ts.save.1` | Not clean: untracked `create-superadmin.ts` (never opened), untracked `tsconfig.build.tsbuildinfo` |

**Recent frontend commits (most recent first):**
`c869393` rename Dark V4 label to "Dark" · `4214f5e` polish Version A light theme · `e993c16` remove Dark V1/V2/V3, keep V4 · `bc61a21` Lead Funnel flagged-stage contrast fix · `61099e0` add Dark V4 (Graphite & Emerald) · `83d3593` Dark V3 · `8045a6e` restore light theme · `66138bb` Dark variant 2 · `f326db0` Dark variant 1 · `45decaa` dedupe concurrent in-flight GET requests · `89ea312` fail-closed notification scoping, sales-invoice status filter, mock-page disclosures · `3fe185f` breadcrumb trail, badge coverage, honest reports copy (the previous formal audit checkpoint) · `cd8dac4` pagination + baseline filtering for quote-to-cash lists · `3c92a76` proforma invoices in search · `eff81d8` wire real notifications.

**Recent backend commits:** `94faa56` complete lead followup lifecycle, followed by a long run of unrelated OperationsOS inventory/dispatch concurrency-locking commits (`e57df87` … `a522b19`).

**Versions:**

| | Frontend | Backend |
|---|---|---|
| Framework | Next.js `^14.2.5` (lockfile resolves `14.2.35`) | NestJS `^11.0.1` |
| UI / ORM | React / React-DOM `^18.3.1` | Prisma + `@prisma/client` `^5.22.0` |
| TypeScript | `^5.5.3` | `^5.7.3` |
| Node (runtime) | `v22.23.0` | — |

**Check results at audit time:**

| Check | Result |
|---|---|
| Frontend `npm run typecheck` (`tsc --noEmit`) | **Pass** — 0 errors |
| Frontend `npm run lint` (`next lint`) | **Pass** — 0 warnings/errors |
| Frontend `npm run build` (`next build`) | **Pass** — 22 routes compiled |
| Backend `npm run build` (`nest build`) | **FAIL** — `TS6059: File '/root/texzium-erp/backend/create-superadmin.ts' is not under 'rootDir' '/root/texzium-erp/backend/src'` (file swept in by the default `**/*` include) |
| Backend `npm run lint` | **Not run** — script uses `eslint --fix`, which would mutate backend files |

Frontend routes compiled: `/`, `/activities`, `/contacts`, `/customers`, `/customers/[id]`, `/dashboard`, `/leads`, `/leads/[id]`, `/login`, `/notes`, `/notifications`, `/opportunities`, `/opportunities/[id]`, `/payments`, `/pipeline`, `/proforma-invoices`, `/proforma-invoices/[id]`, `/quotations`, `/quotations/[id]`, `/reports`, `/sales-invoices`, `/sales-invoices/[id]`, `/sales-orders`, `/sales-orders/[id]`, `/search`, `/tasks`.

> **Post-audit drift:** between the audit and the creation of this document, uncommitted changes appeared in both working trees. HEADs did not move. They are described in **Appendix 1** and are **not** part of this baseline.

---

## B. Executive current-state summary

**Complete (frontend wired to a verified backend contract) — DONE**
Lead list/detail/CRUD, assignment, qualification/rejection, follow-up lifecycle (create/complete/reschedule/cancel); Opportunity create + list; Quotation create/revise/approve/convert; Proforma Invoice create/approve; Sales Order create; Sales Invoice create, payment recording, payment-link generation, receipt voucher; Customer create/list/detail with nested GST registrations; Dashboard revenue/collections summary; Reports page (deliberately near-empty with documented rationale); in-flight GET deduplication; two-theme (Light/Dark) system with anti-FOUC handling.

**Partially complete — PARTIALLY DONE**
Opportunity pipeline (Kanban stage is `localStorage`-only); Sales Order lifecycle (create only — no UI for payment terms, advance receipt, commercial approval although backend endpoints exist); Customer/GST (frontend wired; backend DTOs lack validation and create is reportedly broken); Lead "Activity & History" (real backend timeline is a system event log only).

**Remaining**
MarketingOS and TelecallingOS are effectively unbuilt on both sides. Lead scoring/BANT is a frontend-only, disclosed, non-authoritative heuristic. A true employee-authored Lead activity log and a safe Lead archive/deactivate mechanism were designed on paper (`docs/revenueos-lead-activity-lifecycle-*.md`) but not implemented at the audited HEADs.

**Blocked**
Lead activity/lifecycle work (no `LeadActivity` model, no `Lead.isActive`); Opportunity stage persistence (no mutation endpoint); several Customer/GST operations (missing endpoints/validation); quotation-detail endpoint.

**Intentionally outside RevenueOS**
Dispatch/Inventory/Production (OperationsOS); General Ledger / journal posting (FinanceOS); GST e-invoice / e-way-bill generation (ComplianceOS); KPI / incentives (HRMS). The frontend respects all four boundaries. The backend blurs the first two via shared-table coupling (§F, §G).

**Most consequential finding — DEFERRED, tracked, not forgotten**
17 of the 22 RevenueOS backend controllers have no authentication/authorization guards (§F, SEC-1). Deferred to the remediation program; it is a backend change and outside this frontend engagement's write scope.

---

## C. RevenueOS Module 1 compliance matrix

| # | Sub-module | Frontend | Backend | Integrations | End-to-end? | Classification |
|---|---|---|---|---|---|---|
| 1 | **CRMOS** | Lead master list/detail, assignment UI, timeline render (`app/leads/*`) | `Lead`, `LeadSource`; generic `Connector`/`ConnectorMapping`/`ConnectorLog` + `POST /webhooks/:platform` (adminos) | Generic platform-agnostic webhook mapper only; no Meta/Google/WhatsApp-specific ingestion | Lead create + generic webhook import: yes. Calls/meetings/emails/WhatsApp timeline: no | **PARTIALLY DONE**; activity timeline is a **BACKEND GAP** (§H) |
| 2 | **Lead ManagementOS** | Full lifecycle UI: status, assign, qualify, reject, follow-ups | `LeadStatus` enum (11 values); `lead-assignments`, `lead-status`, `lead-followups` (guarded, transactional, state-machine-checked) | n/a | Yes | **DONE** (enum differs from aspirational pipeline; no lead scoring in backend) |
| 3 | **MarketingOS** | None — Meta/Google Ads exist only as lead-source labels (`components/ui/SourceBadge.tsx`) | Generic connector models only; no campaign/CPL/ROI | None | No | **BACKEND GAP + FRONTEND GAP** |
| 4 | **TelecallingOS** | None | None | None (no Exotel/Knowlarity/Twilio) | No | **BACKEND GAP + FRONTEND GAP** |
| 5 | **OpportunityOS** | List, detail, Kanban (`app/opportunities`, `app/pipeline`) | `Opportunity` create + list only; no status mutation; no `competition` field | n/a | Create/list yes; stage movement local-only | **PARTIALLY DONE**; mutation endpoint is a **BACKEND GAP**; frontend honesty marker is **DONE** |
| 6 | **QuotationOS** | Create/revise/approve/convert (`app/quotations`) | DRAFT→REVISED→APPROVED→CONVERTED; server-computed tax on create; `revise` takes raw client `totalAmount`; no line-item model; no revision history | n/a | Yes, with tax-authority inconsistency | **DONE** with **BACKEND BUG** |
| 7 | **Sales OrderOS** | Create + detail only | Full chain exists: `sales-orders` → `sales-order-advance-receipt` → `accounts-commercial-approval`, driving free-text `status` | Direct writes to OperationsOS tables via shared Prisma | Backend chain yes; frontend first step only | **FRONTEND GAP** |
| 8 | **Customer ManagementOS** | List/detail/create + nested GST table | Client-supplied unique `customerCode`; DTOs have no validation decorators; no GSTIN checksum/verification | No GSTN verification | Read: yes. Create: backend-broken | **PARTIALLY DONE**; **BACKEND GAP** |
| 9 | **Payment CollectionOS** | Payment record, payment link, receipt voucher (on Sales Invoice detail); AR list (`/payments`) | `PaymentCollection` real; `PaymentLink` has **no Prisma model** (URL string fabricated); `collection-reminders` stateless, no persistence, no send | `PaymentGatewayConfig` table only; no gateway SDK | Collections yes; links/reminders stubs | **PARTIALLY DONE**; **BACKEND MISSING CAPABILITY** |
| 10 | **Revenue IntelligenceOS** | Not a screen of its own; folded into Dashboard/Reports | Several `sales-reports` endpoints structurally misleading | n/a | Frontend excludes the misleading ones | **DONE** (frontend) / **BACKEND BUG** (report definitions) |
| 11 | **Revenue AnalyticsOS** | Dashboard revenue/collections panel | `revenue-summary`, `customer-revenue`, `lead-conversion`, `quotation-conversion`; **no** sales-cycle-length, **no** average-deal-size | n/a | Implemented subset yes | **PARTIALLY DONE**; **BACKEND GAP** (2 metrics) |

### Per-module detail

**1. CRMOS.** Frontend: `app/leads/page.tsx`, `app/leads/[id]/page.tsx`; `RealLeadRepository`. Backend: `src/modules/revenueos/leads/`, `Lead` (schema.prisma:205), `LeadSource`. Lead creation requires `customerName`, `phone`, and a valid `sourceId` (UUID FK to `LeadSource`, 404 if absent); optional `leadCode`, `companyName`, `email`, `alternatePhone`. `Contacts`, `Activities`, `Tasks`, `Notes` frontend screens have **no backend module** and remain on mock repositories even in real mode (`lib/repository/real/realRepository.ts`) — deliberate and disclosed. Webhook ingestion (`src/modules/adminos/webhooks/`) is a generic connector mapper, unguarded by design (external receiver); it creates `Lead` + `LeadNote` + `LeadTimeline("LEAD_IMPORTED")` + `ConnectorLog`.

**2. Lead ManagementOS.** `LeadStatus` (schema.prisma:180): `NEW, ASSIGNED, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, WON, LOST, PRE_SALES_ASSIGNED, SALES_ASSIGNED, REJECTED`. There is **no "Meeting Scheduled"** stage; "Proposal Shared" maps to `PROPOSAL_SENT`; `PRE_SALES_ASSIGNED`/`SALES_ASSIGNED` implement a two-stage (pre-sales → sales) assignment; `REJECTED` is distinct from `LOST`. `lead-status.service.ts` casts the incoming string `as any` into the enum without validating it. No BANT/Hot-Warm-Cold in the backend (grep of whole repo). Frontend `LeadScore = "Hot"|"Warm"|"Cold"` (`lib/types/domain.ts:74`) is a **frontend-only presentation heuristic**, explicitly commented as non-authoritative; `mapLead` never sets it, so real leads always have `score: undefined`. No BANT anywhere.

**3–4. MarketingOS / TelecallingOS.** No campaign, CPL, ROI, call-log, recording, or telephony code in either repo. `src/integrations/` is an empty directory. **NEEDS ARCHITECTURAL DECISION** on scope, providers, and data model before any work.

**5. OpportunityOS.** `Opportunity` (schema.prisma:340): `leadId, title, expectedValue (Float), probability (Int), expectedCloseDate, status (String, default "OPEN")`. Endpoints: `POST /opportunities` (`opportunities.create`), `GET /opportunities` (`opportunities.view`, includes `lead`). No `GET /:id`, no status update, no pipeline/group-by endpoint at the audited HEAD. `sales-reports.lost-opportunities` queries `status='LOST'`, which nothing can set. Frontend stage lives in `localStorage` key `revenueos.real.opportunityStage` (`realOpportunityRepository.ts`), with an explicit "not saved to backend" marker (commit `aec58b9`).

**6. QuotationOS.** `Quotation` (schema.prisma:356), controller **unguarded**. `CreateQuotationDto`: `opportunityId, quoteDate, inventoryItemId, quantity, unitPrice, sellerGstId, buyerGstId`; validates Opportunity → InventoryItem (with `hsnMaster`) → seller `CompanyGSTRegistration` → buyer `CustomerGSTRegistration`. Server computes `taxableAmount = qty × unitPrice`, `taxType` (`CGST_SGST` if state codes match else `IGST`), `gstAmount = taxable × hsn.gstRate / 100`, `totalAmount`. `inventoryItemId`, `quantity`, `unitPrice` are **not persisted** — no line-item model. `PATCH /:id/status` is free-text. `PATCH /:id/revise` accepts a raw client `totalAmount`. `PATCH /:id/approve`. `POST /:id/convert` creates a `SalesOrder` (status `OPEN`). Frontend `quoteNo` falls back to a truncated id when `quotationCode` is unset.

**7. Sales OrderOS.** `sales-orders` (unguarded): requires `ProformaInvoice.customerStatus === 'APPROVED'`; validates inventory and GST registrations; if `inventory.availableQty < orderQty` **auto-creates a `PurchaseRequisition`**; initial `status='PENDING_STORE_APPROVAL'`. An `updateStatus` method exists but is not exposed by any route (dead code). `sales-order-payment-terms` (unguarded passthrough). `sales-order-advance-receipt` (unguarded; `PATCH :id/verify` pushes the order to `PENDING_ACCOUNTS_APPROVAL`). `accounts-commercial-approval` (unguarded; requires `PENDING_ACCOUNTS_APPROVAL`, then advances to `READY_FOR_DISPATCH_ORDER`). `SalesOrder.status` is a free `String`, so the chain is convention, not DB-enforced. Frontend (`app/sales-orders/[id]/page.tsx`) explicitly states there is no verified action to move an order through its own status and that store approval/advance receipt/accounts approval have no confirmed screen.

**8. Customer ManagementOS.** `Customer.customerCode` is `String @unique`, required, **not auto-generated**. Also `panNumber, email, phone, customerType, isActive (default true), isVendor, linkedVendorId`. `CustomerGSTRegistration`: `customerId, gstin (unique), legalName, tradeName?, branchName?, stateCode, stateName, addressLine1, addressLine2?, city, pincode, isDefault?, isActive`. `customer-master` and `customer-gst` controllers and DTOs are unguarded and carry no class-validator decorators; per the Stage 2H brief, `POST /customers` and `POST /customer-gst` are broken against the global `whitelist:true, forbidNonWhitelisted:true` pipe. No `GET /customers/:id`, update, delete, deactivate, search, or pagination. No GSTIN checksum or live verification. `customer-statements` and `statement-pdf` are keyed by `customerName`.

**9. Payment CollectionOS.** `payment-collections` (unguarded): `POST` finds `AccountsReceivable` by `salesInvoiceId`, creates `PaymentCollection`, updates `paidAmount/balanceAmount/paymentStatus`, appends a credit `CustomerLedger` entry (keyed by `customerName`). `SalesInvoice.paymentStatus` is stale/non-authoritative — the authoritative chain is `SalesInvoice → AccountsReceivable → PaymentCollection[]`. No `GET /payment-collections` list endpoint exists. `payment-links`: no `PaymentLink` model; `POST /payment-links/:salesInvoiceId/generate` reads `PaymentGatewayConfig` and, if an active gateway exists, **fabricates** `https://pay.${gatewayName}.com/${invoiceId}` (nothing persisted, no gateway call); otherwise returns raw bank/UPI config as "MANUAL". `collection-reminders`: only `GET /collection-reminders/check-due`, an in-memory UPCOMING/DUE_TODAY/OVERDUE calculation over `AccountsReceivable` — no model, no dispatch. Frontend has no Payment Links list and no Collection Reminders UI; link generation is per-invoice only.

**10–11. Revenue Intelligence / Analytics.** `sales-reports` (unguarded) endpoints: `funnel`, `revenue-summary`, `customer-revenue`, `lead-conversion`, `quotation-conversion` (returns naive ratios, observed 200%), `lost-opportunities` (always empty), `salesperson-performance` (byte-identical to `customer-revenue`; groups by `customerName`; no salesperson attribution on `SalesInvoice`), `top-products`/`product-revenue`/`product-quantity`, `hsn-revenue`/`category-revenue`. Not implemented: sales-cycle-length, average-deal-size. Frontend Dashboard uses `useFinancialSummary` (real `revenue-summary` + 4 `collections-dashboard/*` endpoints). `app/reports/page.tsx` is intentionally near-empty with a `DesignNote` documenting why the other endpoints were rejected. No report numbers are fabricated.

---

## D. RevenueOS workflow status

```
Lead Generated ── DONE ─ manual + generic webhook import (no Meta/Google-specific ingestion)
   ▼
Lead Assigned ── DONE ─ lead-assignments: PRE_SALES_ASSIGNED → SALES_ASSIGNED (guarded)
   ▼
Follow-Up ── DONE ─ lead-followups create/complete/reschedule/cancel; only place an actor is recorded (completedById)
   ▼
Meeting ── BACKEND GAP ─ no meeting/call/email/WhatsApp activity model; "Meeting Scheduled" is not a LeadStatus
   ▼
Opportunity ── PARTIALLY DONE ─ create/list real; stage progression frontend-local; no backend mutation endpoint
   ▼
Quotation ── DONE ─ tax computed server-side on create; BACKEND BUG on revise
   ▼
Approval ── DONE ─ Proforma approve (customerStatus='APPROVED') gates Sales Order creation
   ▼
Sales Order ── PARTIALLY DONE ─ backend approval chain exists; frontend exposes creation only (FRONTEND GAP)
   │
   ├─▶ OperationsOS takes over: inventory, purchase requisition, pick/pack/dispatch.
   │    RevenueOS frontend treats Dispatch as read-only/external (INTENTIONAL BOUNDARY).
   │    Backend writes OperationsOS tables directly (ARCHITECTURAL DUPLICATION).
   ▼
Sales Invoice ── DONE ─ gated on DispatchOrder.status === 'DISPATCHED'; tax hardcoded 18% (BACKEND BUG)
   │
   ├─▶ FinanceOS takes over: receivable, journal, GL.
   │    Backend posts JournalEntry/JournalLine/CustomerLedger in the same request (ARCHITECTURAL DUPLICATION).
   ▼
Payment / Revenue ── PARTIALLY DONE ─ PaymentCollection real; PaymentLink / CollectionReminder are stubs
```

**Ownership summary:** RevenueOS owns Lead → Opportunity → Quotation → Proforma → Sales Order creation → Sales Invoice creation → Payment Collection. OperationsOS owns everything from stock reservation through dispatch. FinanceOS owns accounting after invoice. ComplianceOS owns GST validation/e-invoice/e-way-bill (not connected to RevenueOS). HRMS owns KPI/incentives (not connected, and no such concept exists in HRMS yet).

---

## E. Remaining frontend issues

**Must fix** — None blocking. Typecheck, lint, and build are clean at the audited HEAD, and every identified gap is a disclosed adaptation to a backend limitation.

**Should fix**
- `lib/types/domain.ts.save` (478 lines) and `lib/types/domain.ts.save.1` (554 lines): untracked, unreferenced, stale snapshots of `domain.ts` (currently 833 lines). Dead weight.
- No shared `TimelineItem`: the Follow-ups panel and Activity & History panel in `app/leads/[id]/page.tsx` each hand-roll `.tl` / `.tl-item` / `.dot` markup.
- `FilterButton` is used only on the Leads list. Every other list page uses a simpler inline chip filter; most have no free-text search (only Leads and `/search`).
- Loading states are a hand-rolled `<div className="skeleton" style={{height:…}} />` repeated 32 times across `app/**/page.tsx`; no shared `<Skeleton>`.
- `components/ui/Button.tsx` bundles `Button`, `EmptyState`, `Pagination`, and `paginate()` in one file.
- Customer statements are surfaced from the Sales Invoice detail page, not the Customer detail page.

**Later optimization** — see §I.

**Backend-blocked**
- Real-mode Lead Activity & History (§H).
- Opportunity Kanban stage persistence.
- Customer/GST create reliability.
- Payment Links / Collection Reminders as real, persisted features.
- Sales Order payment-terms / advance-receipt / commercial-approval UI is *not* backend-blocked (endpoints exist) — it is a **FRONTEND GAP** awaiting prioritization, with the caveat that those endpoints are unguarded (SEC-1).

**Connected-mode disclosures already in place (working as intended):** Reports `DesignNote`; Sales Order "no verified action" notice; real-mode Lead Activity hides "Log Activity" instead of faking it; Opportunity stage stepper "not saved to backend" marker.

**Mock-only behavior in "real" mode (deliberate, disclosed):** Contacts, Activities, Tasks, Notes. Notifications were previously left on mock "by mistake in earlier stages" and were wired to real in `eff81d8`.

**Theme/accessibility:** no unintentional hardcoded colors or static contrast defects found (§J). Not a rendered contrast measurement.

---

## F. Remaining backend / integration issues

Identifiers are provided so the remediation program can reference them.

### SECURITY ISSUE

**SEC-1 — 17 of 22 RevenueOS controllers have no guards — DEFERRED.**
Only `leads`, `lead-status`, `lead-assignments`, `lead-followups`, and `opportunities` use `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions(...)`. The following **17** have no `@UseGuards` at all and are reachable without authentication:

`proforma-invoices`, `quotations`, `sales-orders`, `sales-order-payment-terms`, `sales-order-advance-receipt`, `accounts-commercial-approval`, `sales-invoices`, `sales-invoice-items`, `payment-collections`, `payment-links`, `collection-reminders`, `customer-master`, `customer-gst`, `customer-statements`, `statement-pdf`, `lead-sources`, `sales-reports`.

`complianceos/gst-engine` is also unguarded. `adminos/webhooks` is intentionally public (external receiver).

- **Status: DEFERRED — tracked, not forgotten.** It is a backend change; the frontend engagement is bound to a read-only backend, and per `CLAUDE.md` §17 a backend modification requires the user's explicit decision.
- **Impact:** every revenue-critical write path after the lead stage — quotations, sales orders, invoices, payments, commercial approvals, customer master — is unauthenticated at the API. Frontend permission gating on those screens has no server-side enforcement behind it.
- **Remediation shape (not implemented):** apply the existing `JwtAuthGuard` + `PermissionsGuard` + `@Permissions('resource.action')` pattern consistently. Note `PermissionsGuard` returns `true` when no `@Permissions` metadata is set, so `JwtAuthGuard` is what enforces authentication, and every route needs an explicit permission.
- **Related:** the Stage 2A audit flagged an undocumented `GET /users` (used for assignment lookup) that reportedly returns raw `passwordHash`. **STILL OPEN**; no commit addresses it.

### BACKEND BUG

- **BUG-1 — Backend build fails (`TS6059`).** Untracked `create-superadmin.ts` at the repo root is outside `rootDir: src` and is swept in by the default `**/*` include. Not touched by this audit, per instruction. Requires the user's direct decision. *(See Appendix 1: an uncommitted change appears to address this.)*
- **BUG-2 — `Quotation.revise` takes a raw client `totalAmount`** with no recompute from quantity/rate/HSN and no revision history, inconsistent with `create`.
- **BUG-3 — `SalesInvoice` tax hardcoded to 18%** (code comment: "Assume 18% based on sales order flow"), ignoring HSN rate and the quotation's `gstPercent`.
- **BUG-4 — `customer-statements` / `statement-pdf` keyed by `customerName`, and `CustomerLedger.customerName` is a plain string**, not an FK. Collides or breaks on duplicate or edited names.
- **BUG-5 — `statement-pdf` writes to `uploads/statements/<name>_statement.pdf` on local disk with no download route or static-file server.** The frontend cannot fetch the file.
- **BUG-6 — `proforma-invoices` accepts client `totalAmount`** rather than deriving it from the linked quotation; it can diverge. `sales-invoice-items` likewise accepts client-supplied `taxableAmount/gstAmount/totalAmount` with no recomputation.
- **BUG-7 — `lead-status` casts input `as any` into `LeadStatus`** without validating enum membership.
- **BUG-8 — Misleading report definitions:** `quotation-conversion` naive ratio (200% observed), `lost-opportunities` structurally always empty, `salesperson-performance` identical to `customer-revenue`, `kpi-intelligence.inventoryUtilization` observed returning `NaN%` (Stage 2I brief).
- **BUG-9 — `POST /customers` and `POST /customer-gst` fail the global validation pipe** (no class-validator decorators), per the Stage 2H investigation.

### BACKEND MISSING CAPABILITY

- Opportunity status-mutation endpoint, `GET /opportunities/:id`, pipeline/group-by endpoint, and `competition` field (at the audited HEAD).
- Quotation detail endpoint; persisted line items; revision history.
- Dedicated `/leads/:id/timeline` endpoint (timeline appears only nested in `GET /leads/:id`).
- Any `LeadActivity` / employee-authored activity model; any lead delete/archive/deactivate/restore (§H).
- `PaymentLink` model and a real gateway call; `CollectionReminder` model and any actual reminder dispatch.
- `GET /payment-collections` list; sales-cycle-length and average-deal-size reports.
- GSTIN checksum/format validation and live verification.
- `sales-orders.service.ts` `updateStatus` is implemented but unrouted (dead code).

### INTEGRATION GAP

- `src/integrations/` is an empty directory: no payment-gateway, telephony, or ad-platform SDKs.
- A functioning WhatsApp module exists at `src/core/whatsapp/` (config, conversation, inquiry models; `axios` sender; webhook verify/receive) with **zero references** from `src/modules/revenueos`. It is disconnected from the Lead/CRM flow.
- `complianceos/gst-engine` (`POST /gst-engine/:salesInvoiceId/generate-irn`, `PATCH /gst-engine/:gstRegistryId/generate-eway`) is **fully simulated** — IRN, ack number, QR code, signed invoice, and e-way-bill number are `Date.now()`-based strings; no GSTN/NIC call. It is never called from `revenueos`. `EInvoice` (schema.prisma:1706) is entirely unused; `EWayBill` (schema.prisma:1718) is unused directly.
- No Meta/Google-Ads-specific code; only the generic connector mapper.
- No telecalling code of any kind.

### ARCHITECTURAL DUPLICATION / TIGHT COUPLING

- RevenueOS services reach into **OperationsOS-owned tables** (`InventoryItem`, `PurchaseRequisition`, `DispatchOrder`) and **FinanceOS-owned tables** (`JournalEntry`, `JournalLine`, `ChartOfAccount`, `CustomerLedger`, open `FinancialYear`) through the shared Prisma client, with **zero NestJS cross-module imports** (verified: no `revenueos` ↔ `operationsos`, `revenueos` ↔ `financeos`, `revenueos` ↔ `complianceos`, `revenueos` ↔ `hrms` imports in either direction). `sales-invoices.service.ts` looks up chart-of-account codes `1101`/`3001`/`5002` hard-coded and throws "Finance master setup incomplete" if missing. This is a backend-wide pattern, not something the frontend caused or can fix. **NEEDS ARCHITECTURAL DECISION** (§G).

### DEFERRED

- SEC-1 (above).
- Dispatch frontend UI (OperationsOS-owned; read-only reference only).
- Payment Collection master-list UI (no list endpoint to build against).
- 10 of 11 `sales-reports` endpoints excluded from the Reports page.
- Next.js upgrade (§I note, §M).

---

## G. Intentional OS boundaries — DO NOT CHANGE

### OperationsOS (Production / Inventory / Dispatch)
- **RevenueOS responsibility:** initiate a Sales Order; read Dispatch status to gate Sales Invoice creation.
- **OperationsOS responsibility:** inventory reservation, purchase requisition, pick/pack/dispatch execution, concurrency locking (see the long inventory/dispatch commit run on the backend).
- **RevenueOS may display/read:** `DispatchOrder.status`; inventory availability for quotation/sales-order item dropdowns. `lib/types/domain.ts` labels `DispatchOrderOption` "an OperationsOS resource… read-only here".
- **RevenueOS must NOT duplicate:** Dispatch, pick/pack, inventory adjustment, production scheduling UI. None exists in the frontend; none should be added.
- **Evidence (frontend respects boundary):** `app/sales-orders/[id]/page.tsx` frames dispatch as "an OperationsOS action outside this app"; no `app/dispatch` directory.
- **Evidence (backend blurs boundary):** `sales-orders.service.ts` reads/writes `InventoryItem` and creates `PurchaseRequisition`; `sales-invoices.service.ts` reads `DispatchOrder` — all via shared Prisma, no service import.

### FinanceOS (Sales Invoice → Receivable / Accounting / GL)
- **RevenueOS responsibility:** create the Sales Invoice; record customer payment collections.
- **FinanceOS responsibility:** journal posting, chart of accounts, financial-year management, GL.
- **RevenueOS may display/read:** `AccountsReceivable` balance/status (Payments page); collections dashboard summaries.
- **RevenueOS must NOT duplicate:** GL, journal-entry, chart-of-accounts, trial-balance, P&L UI. None exists in the frontend; none should be added.
- **Evidence (backend blurs boundary):** `sales-invoices.service.ts` posts `JournalEntry` / `JournalLine` and appends `CustomerLedger` in the same request that creates the invoice.
- **Ambiguity to decide:** whether invoice-to-journal posting should remain inside the invoice request or move behind a FinanceOS service boundary.

### ComplianceOS (GST validation / e-invoice / e-way-bill)
- **RevenueOS responsibility:** none for e-invoice/e-way-bill. GST registrations (`CompanyGSTRegistration`, `CustomerGSTRegistration`) are read to drive tax type/rate at quotation/invoice time.
- **ComplianceOS responsibility:** GSTN/NIC submission (currently simulated only).
- **RevenueOS may display/read:** registration records; eventually an IRN/e-way-bill status, if ComplianceOS exposes a real one.
- **RevenueOS must NOT duplicate:** IRN/e-way-bill generation. None exists in the frontend.
- **Ambiguity to decide:** where GSTIN verification lives (customer master vs ComplianceOS).

### HRMS (KPI / Incentives / Performance)
- **RevenueOS responsibility:** none currently. No `revenueos` ↔ `hrms` references in either direction; HRMS has no KPI/incentive concept (keyword search returned zero hits).
- **HRMS responsibility:** KPI, incentives, performance.
- **RevenueOS may display/read:** nothing today.
- **RevenueOS must NOT duplicate:** KPI/incentive computation. `sales-reports.salesperson-performance` is a mislabeled customer-revenue grouping, **not** an HRMS integration — a RevenueOS-internal data/naming defect.
- **Ambiguity to decide:** push (RevenueOS emits sales events) vs pull (HRMS reads RevenueOS data).

### RevenueOS-internal boundary decisions already in force
- Frontend never fabricates persistence for Opportunity stage; it labels it local-only.
- Frontend never presents misleading `sales-reports` figures as authoritative.
- Frontend never adds a Quotation → Sales Invoice shortcut; the order is Quotation → Proforma → Sales Order → (Dispatch, external) → Sales Invoice.
- `SalesInvoice.paymentStatus` is not used; `AccountsReceivable` is the source of truth for balances.
- Customer creation is never routed through `/vendors` as a workaround.

---

## H. Lead Activity / Remarks / Pre-Sales History findings (as of the audited HEADs)

**Context.** The Lead "Activity & History" panel was found not to be equivalent to a real employee activity log. A backend design proposal (`docs/revenueos-lead-activity-lifecycle-backend-design-proposal.md`) and a brief (`…-brief.md`) exist. Neither is implemented at the audited HEADs. No commit implements any part.

### What exists

| Concern | Reality at audited HEADs |
|---|---|
| `LeadTimeline` (schema.prisma:243) | Fields `id, leadId, action (String), remarks (String?), createdAt`. **No actor.** Written only as a side effect of other operations: `LEAD_CREATED`, `LEAD_UPDATED`, `STATUS_UPDATED`, `PRE_SALES_ASSIGNED`, `LEAD_QUALIFIED`, `LEAD_REJECTED`, `OPPORTUNITY_CREATED`, `FOLLOWUP_CREATED/COMPLETED/RESCHEDULED/CANCELLED`, `LEAD_IMPORTED`. No endpoint creates or lists it directly; it is `include`d on `GET /leads/:id` (ordered `createdAt desc`). |
| `LeadNote` (schema.prisma:232) | Fields `id, leadId, note (String), createdAt`. **No actor.** **No controller/service/DTO.** The only write path is the webhook importer (`adminos/webhooks/webhooks.service.ts`), which stores an inbound "requirement" string. Not a working notes feature. |
| `LeadFollowup` (schema.prisma:261) | Statuses `PENDING, COMPLETED, CANCELLED`. `POST /lead-followups`, `GET /lead-followups`, `GET /lead-followups/:leadId`, `PATCH /:id/complete`, `/:id/reschedule`, `/:id/cancel`. Guarded, transactional, state-machine-checked. **The only place an actor is persisted** (`completedById` from `req.user.id`). Reschedule reuses `PENDING`; there is no `RESCHEDULED` value. |
| Pre-sales history | Captured only as `LeadTimeline` rows (`PRE_SALES_ASSIGNED`, `LEAD_QUALIFIED`, `LEAD_REJECTED`) and `Lead.status` (`PRE_SALES_ASSIGNED` → `SALES_ASSIGNED`/`REJECTED`) with `Lead.assignedToId`. No record of **who** assigned, qualified, or rejected, and no pre-sales remarks distinct from the system event text. |
| Calls / meetings / emails / WhatsApp | No model or endpoint in `revenueos`. A WhatsApp module exists in `src/core/whatsapp/` but is disconnected from leads. |
| Tasks linked to leads | No lead-linked task model. |
| Frontend real mode | `RealLeadRepository.appendTimelineEntry()` throws "Activity logging isn't available yet for the connected backend." "Log Activity" is hidden (`extraHead` conditional on `!isReal`, `app/leads/[id]/page.tsx:364`). `mapLeadTimeline` hardcodes `actorName: ""` ("the backend timeline entry has no actor/user relation at all"). Real notes render `authorName: ""` and note creation UI is hidden. |
| Frontend mock mode | `ActivityForm` supports Call/Email/Meeting/WhatsApp with free text and an owner name. This works **only** against the in-memory mock; it does not reflect backend capability. |

### Direct answers

1. **What does `LeadTimeline` represent?** A system-generated event log with no actor.
2. **What does `LeadNote` represent?** An orphaned model with no API, written only by the webhook importer, no actor.
3. **Is there a true employee-authored activity model/API?** No.
4. **Can an employee record a call/meeting/email/WhatsApp interaction?** No, against the real backend.
5. **Can an employee record a remark without changing Lead stage/status?** No. Every `LeadTimeline`/`LeadNote` write at the audited HEAD is a side effect of a state-changing operation or the webhook import.
6. **Can we identify who performed an activity?** Only for follow-up completion (`completedById`). Not for timeline entries, notes, assignment, qualification, or rejection.
7. **Can we retrieve a chronological work history?** Only implicitly, via `LeadTimeline` nested in `GET /leads/:id`. No dedicated timeline endpoint.
8. **What does TelecallingOS provide?** Nothing.
9. **What should RevenueOS own versus consume?** Proposed (not decided): RevenueOS owns an employee-authored `LeadActivity` record modelled on `LeadFollowup` (actor, timestamp, outcome, next action), separate from the system `LeadTimeline`. WhatsApp (`src/core/whatsapp/`) and any future telephony are candidates to **consume from**, not reimplement. **NEEDS ARCHITECTURAL DECISION.**
10. **What backend changes would be required?** Per the proposal: a `LeadActivity` model; `Lead.isActive` with `PATCH /leads/:id/deactivate|reactivate`; new permissions; actor wiring from `req.user`. See the proposal document for the full contract. **BACKEND GAP / BLOCKED** until approved.

### Lead lifecycle — create / edit / assign / qualify / reject / follow-up / delete / archive

| Operation | State |
|---|---|
| Create (`POST /leads`) | **DONE** — requires `customerName`, `phone`, valid `sourceId` |
| Edit (`PATCH /leads/:id`) | **DONE** — `leads.edit` |
| Assign (`POST /lead-assignments`) | **DONE** — `leads.assign`; sets `PRE_SALES_ASSIGNED` |
| Qualify (`PATCH /lead-assignments/:id/qualify`) | **DONE** — `leads.qualify`; sets `SALES_ASSIGNED` |
| Reject (`PATCH /lead-assignments/:id/reject`) | **DONE** — `leads.reject`; sets `REJECTED` |
| Status (`POST /lead-status`) | **DONE** — `leads.status.update`; unvalidated enum cast (BUG-7) |
| Follow-up lifecycle | **DONE** |
| Duplicate handling | **BACKEND GAP** — no duplicate detection found |
| Delete / archive / deactivate / restore | **BACKEND GAP** — no endpoint; no `isActive`/`deletedAt` on `Lead` |

**Foreign keys into `Lead`:** `LeadNote.leadId`, `LeadTimeline.leadId`, `LeadFollowup.leadId`, `Opportunity.leadId`. No `onDelete` is declared anywhere in `schema.prisma` (zero matches), so Prisma's default referential action applies. Downstream chain: `Opportunity → Quotation → ProformaInvoice → SalesOrder → SalesInvoice → AccountsReceivable → PaymentCollection`.

**Safe lifecycle position.** Hard deletion is **not** recommended: a delete endpoint does not exist, cascade/restrict semantics are undefined, and the downstream chain includes financial records. The proposal's soft-flag approach (`Lead.isActive`, following the existing soft-flag convention used by ~14 models, with deactivate/reactivate) is the documented safe option. The proposal also flags a migration risk: lead tables were likely provisioned via `prisma db push`, not tracked migrations. **DEFERRED — nothing implemented.**

---

## I. Performance / request efficiency findings

### Already fixed — DONE
**In-flight GET deduplication** (`lib/api/httpClient.ts`, commit `45decaa`). Module-level `Map<string, Promise<unknown>>` keyed by request **path** only; a concurrent GET to the same path returns the same promise, removed the instant it settles (no TTL, not a cache). Covers every real repository (all use `apiFetch`). Mutations always fire fresh. Mock repositories do not use `apiFetch`. Verified safe only because no current GET uses a query string (the key ignores query strings).

### Still open — not addressed by the dedup work
1. **`getById` via `fetchAll()` + `.find()`.** Quotations, Opportunities, Sales Invoices have no per-id backend route (backend limitation), so detail loads pull entire tables. `RealQuotationRepository.getById` (`realQuotationRepository.ts:45-48`), `RealSalesInvoiceRepository.getById` (`realSalesInvoiceRepository.ts:49-52`).
2. **Nested fetch chains.** Quotation detail → `/quotations` + `/opportunities` + `/users`. Sales Invoice detail → `/sales-invoices` + `/sales-orders` + `/quotations` + `/opportunities` + `/users`. `RealOpportunityRepository.fetchAll` (`realOpportunityRepository.ts:42-69`) also fetches `/users` on every call.
3. **Sequential waterfall (frontend-fixable).** `useQuotationDetail` (`lib/hooks/useQuotations.ts:34-45`) fetches the quotation, then — only once set — makes a second call `repo.opportunities.getById(quotation.opportunityId)`, which re-runs `fetchAll()` for data the first call already resolved.
4. **`useLiveCounts`** (`lib/hooks/useLiveCounts.ts`) lives in the persistent shell and re-fires seven full-table list calls (leads, opportunities, quotations, proforma invoices, sales orders, sales invoices, customers) plus `notifications.unreadCount()` in real mode, as separate `.then()` chains (not `Promise.all`) on **every route change** (`pathname` is a dependency, line 76). Highest-frequency cost in the app. Dedup only collapses *concurrent* identical paths; it does not stop the repeated sequential refetch.
5. **`RealSearchRepository`** (`realSearchRepository.ts`) fires seven full-table `list()` calls per search term with naive client-side substring matching, each paying the nested-fetch cost above. Contacts/Notes always return empty.
6. **Client-side filter/sort/paginate** over fully fetched arrays (`lib/repository/shared/listQuery.ts`; e.g. `app/quotations/page.tsx:19-42`). Mirrors the backend's lack of query params on those routes, but ships full datasets to the browser regardless of page size.
7. **Repeated skeleton markup** (32 sites) — maintainability, not performance.

**Not observed in this audit:** no bundle-size problem (shared First Load JS 87.3 kB; largest route `/leads/[id]` 134 kB First Load), no obviously expensive render component. No profiling was performed.

**Next.js note (informational).** Next.js `14.2.35` / React `18.3.1`. No current frontend issue found that *requires* the Next.js upgrade. Upgrade was deliberately deferred. `AGENTS.md` states the installed Next.js has breaking changes versus common knowledge and directs consulting `node_modules/next/dist/docs/` before framework-level changes. Performance optimization of the data-fetching issues above is independent of the framework version; whether to optimize before or after any upgrade is a sequencing decision for the remediation program. **DEFERRED.**

---

## J. Version A theme / UI status

- **Themes:** exactly two — `light` (default, no `data-theme` attribute) and `dark-v4` (UI label "Dark" since `c869393`). `lib/theme/ThemeContext.tsx`: `ThemeName = "light" | "dark-v4"`. `components/shell/ThemeToggle.tsx`: two options, "Light" and "Dark".
- **Dark V1/V2/V3:** fully removed (`e993c16`). A case-insensitive repo-wide search for `warm.?ledger|dark.?v[123]|light.?v2` outside `docs/` returns zero source hits; the only mentions are explanatory comments referencing git history.
- **Warm Ledger / Light V2:** never shipped. Exists only as a discarded proposal (`docs/revenueos-version-a-light-mode-warm-ledger-proposed.md`). **OBSOLETE.** The light theme retains its cool-gray palette (`--canvas:#F4F5F7`, `--m:#059669`), contrast-polished in `4214f5e`.
- **Dark V4 ("Graphite & Emerald"):** `app/globals.css` has a single `:root[data-theme="dark-v4"]` block (`--canvas:#0A0A0C`, `--m:#10B981`, `--stage-violet:#9F7AEA`, `--surface-rail:#0A0A0C`). Spec in `docs/revenueos-version-a-dark-mode-v4.md` matches the implementation.
- **Persistence:** `localStorage` key `revenueos.theme`.
- **Anti-flash:** `THEME_INIT_SCRIPT` (`ThemeContext.tsx`) rendered as a blocking inline `<script>` in `app/layout.tsx` `<head>`; sets `data-theme` before first paint.
- **Hardcoded colors (reviewed, both intentional):** `components/ui/Funnel.tsx:69` `color: flagged ? "#fff" : ramp.txt` (flagged stage always sits on solid `--bad`; documented); `components/ui/SourceBadge.tsx:73-76` Google brand colors (`#4285F4`, `#EA4335`, `#FBBC05`, `#34A853`). No others outside `globals.css` and SVG icon markup.
- **Known contrast defects:** Lead Funnel flagged-stage text/background clash fixed in `bc61a21`. Light-theme near-invisible canvas/row-hover/label contrast (~1.03–1.04:1) fixed in `4214f5e`.
- **Limitation:** static code review only. No rendered contrast measurement and no live visual check was performed.

---

## K. Historical reconciliation

Sources: the 17 untracked `docs/revenueos-*.md` briefs cross-checked against `git log` and current code. Most are task briefs; where a brief's prescribed commit message matches a real commit, that stage was executed as specified. Commit hashes below were verified against `git log`.

| # | Finding / proposal (source) | Status |
|---|---|---|
| 1 | Backend lacks employee-authored Lead activity; needs `LeadActivity` model + endpoints (lead-activity backend design proposal) | **STILL OPEN** |
| 2 | Backend lacks Lead removal/deactivation; proposed `Lead.isActive` + `PATCH /leads/:id/deactivate\|reactivate` (same) | **STILL OPEN** |
| 3 | "Activity & History" panel conflates system timeline with nonexistent employee activity; needs split (lead-activity brief) | **BACKEND BLOCKED** |
| 4 | Safe duplicate-Lead removal workflow (same) | **BACKEND BLOCKED** |
| 5 | `GET /users` undocumented and reportedly leaks `passwordHash` (stage2a-completion-audit) | **STILL OPEN** |
| 6 | Stage 2A Lead lifecycle (stage2a-completion-audit) | **DONE** — `232f829`, `c9d639c` |
| 7 | Opportunity stepper implies persistence; Pipeline disabled state unexplained (stage2abc-ux-review, stage2c-ux-polish) | **DONE** — `aec58b9` |
| 8 | No verified `GET /opportunities/:id` or stage-mutation endpoint (stage2abc-ux-review, stage2b) | **INTENTIONAL BOUNDARY** (frontend does not fake it) |
| 9 | No quotation detail endpoint; qty/unitPrice accepted but not persisted (stage2abc-ux-review) | **BACKEND BLOCKED** |
| 10 | Stage 2B Opportunities (stage2b) | **DONE** — `bbefc60` |
| 11 | Stage 2C Quotations (stage2c) | **DONE** — `ee5f909`, `f1f1268` |
| 12 | Stage 2D Proforma Invoices (stage2d) | **DONE** — `1da8308`; ordering corrected by `57f8afe` |
| 13 | Stage 2E Sales Orders (stage2e) | **DONE** — `bfd9389` |
| 14 | Stage 2F Sales Invoices, no shortcut path (stage2f) | **PARTIALLY DONE** — `3112370`; no Dispatch frontend stage (OperationsOS-owned) |
| 15 | Stage 2G Payments & Collections, AR as source of truth (stage2g) | **DONE** — `4c32f23` |
| 16 | `SalesInvoice.paymentStatus` stale; no `GET /payment-collections`; no guards (stage2g) | **BACKEND BLOCKED / INTENTIONAL BOUNDARY** |
| 17 | Stage 2H Customers & GST (stage2h) | **DONE** — `29b5990`, `198411d` |
| 18 | `POST /customers`, `POST /customer-gst` broken; no CRUD/search/guards (stage2h) | **BACKEND BLOCKED** (reconfirmed in this audit) |
| 19 | Stage 2I Dashboard & Analytics; fix stale badge counts (stage2i) | **DONE** — `2e29b44` |
| 20 | Misleading backend analytics: quotation conversion 200%, lost-opps empty, salesperson = customer revenue, hardcoded forecasting multipliers, `NaN%` (stage2i) | **INTENTIONAL BOUNDARY** (excluded rather than surfaced) |
| 21 | Dark A/B experiment: V1 Navy Purple, V2 Navy + Semantic (dark-mode-ab-brief) | **OBSOLETE** — shipped `f326db0`, `66138bb`; removed `e993c16` |
| 22 | Dark V3 proposal (dark-mode-v3-proposed) | **OBSOLETE / SUPERSEDED** — shipped `83d3593`, removed `e993c16`; ideas live on in V4 |
| 23 | Dark V4 Graphite & Emerald (dark-mode-v4) | **DONE** — `61099e0`; sole dark theme; relabeled by `c869393` |
| 24 | Light "Warm Ledger" (light-mode-warm-ledger-proposed) | **OBSOLETE / DISCARDED** |
| 25 | Funnel flagged-stage contrast bug (found via Warm Ledger review) | **DONE** — `bc61a21` |
| 26 | Light theme contrast polish | **DONE** — `4214f5e` |

**Changes since the previous formal checkpoint `3fe185f`:** `cd8dac4` pagination/baseline filtering; `eff81d8` real notifications; `89ea312` fail-closed notification scoping, sales-invoice status filter, mock-page disclosures; `45decaa` GET dedup; theme sequence `f326db0` → `66138bb` → `8045a6e` → `83d3593` → `61099e0` → `bc61a21` → `e993c16` → `4214f5e` → `c869393`.

**Theme decision sequence:** V1 → V2 → light restored → V3 → **V4 selected** → Funnel fix → V1/V2/V3 removed → light polish → V4 relabeled "Dark" (HEAD).

**Not carried forward blindly:** old audit items already closed (notification mock-by-mistake, stale sidebar badge counts, missing pagination on quote-to-cash lists, misleading Reports copy) are DONE and are not re-listed as open.

---

## L. Next milestone options

*Options only. No option is selected, and none is implemented by this document.*

| # | Milestone | Objective | Side | Depends on | Architectural decision needed | Risks / blockers |
|---|---|---|---|---|---|---|
| 1 | **Auth-guard remediation (SEC-1)** | Close the 17/22 gap; add `@UseGuards(JwtAuthGuard, PermissionsGuard)` + explicit `@Permissions` everywhere | Backend | Explicit user approval to modify the backend; a defined permission-string catalogue | Permission naming for each revenue route; whether `lead-sources`, `sales-reports`, `gst-engine` need distinct permissions | Frontend permission gating must be audited against the new strings; unauthenticated callers (if any internal tooling) will break |
| 2 | **Lead Activity / Remarks / Lifecycle** | Employee-authored `LeadActivity` with actor, outcome, next action; `Lead.isActive` deactivate/reactivate; wire real-mode UI | Both (backend first) | Approval of the design proposal; migration strategy (`db push` vs tracked migrations) | Own vs consume (WhatsApp/telephony); whether remarks live on `LeadActivity` or `LeadNote`; actor on assign/qualify/reject | Backend schema change; migration risk; permission design |
| 3 | **Sales Order lifecycle UI** | Surface payment terms, advance receipt, commercial approval | Frontend | SEC-1 ideally first (endpoints are unguarded) | Whether store approval is RevenueOS or OperationsOS-owned | Free-text `status` has no enum; UI would encode convention |
| 4 | **Backend build blocker** | Make `nest build` pass | Backend | User decision on `create-superadmin.ts` handling | Exclude via tsconfig vs relocate vs ignore | `create-superadmin.ts` is off-limits to this program |
| 5 | **Backend data-integrity fixes** | Server-side tax on revise; HSN-based invoice tax; ID-keyed statements; validate `LeadStatus`; derive proforma total | Backend | Backend write approval | Whether proforma/invoice totals are always derived | Behavior change on existing records; reporting discontinuity |
| 6 | **Real Payment Links / Collection Reminders** | Persisted models, a real gateway call, a reminder dispatch channel | Backend + Frontend | Gateway vendor; notification channel | Vendor choice; whether WhatsApp (`src/core/whatsapp/`) is the channel; FinanceOS vs RevenueOS ownership of reminders | Largest backend scope in the quote-to-cash area |
| 7 | **MarketingOS / TelecallingOS** | Campaign/CPL/ROI; call logs/recording | Both | Provider selection | Ad platforms, telephony provider, campaign data model, ownership vs a future shared integration layer | Greenfield; `src/integrations/` is empty |
| 8 | **Request-efficiency pass** | Fix waterfall in `useQuotationDetail`; reduce `useLiveCounts` fan-out; batch/cached search | Frontend (backend per-id routes would help) | None for frontend-only parts | Cache/TTL policy vs strictly no-cache dedup | Risk of stale counts if caching is introduced |
| 9 | **Frontend hygiene** | Delete `.save` files; shared `TimelineItem`/`Skeleton`/search | Frontend | None | None | Low |
| 10 | **Opportunity persistence** | Real stage/status mutation + detail endpoint | Both | Backend approval | Stage vocabulary (`status` is a free string) | `localStorage` stages become obsolete; migration of local state |
| 11 | **Customer/GST repair** | Validators on DTOs; create/update/search | Backend + Frontend | Backend approval | Customer-code generation vs client-supplied; GSTIN verification ownership | Existing unvalidated data |
| 12 | **ComplianceOS integration** | Real IRN/e-way-bill; surface status read-only | Backend (ComplianceOS) + Frontend (read-only) | A real GSTN/NIC provider | Which OS calls the provider; trigger point | Current engine is simulated |

---

## M. Baseline recommendation

This file is the authoritative current-state baseline: `docs/revenueos-current-state-baseline-2026-09-23.md`. Future audits should add a new dated file rather than editing this one, so the remediation program can diff states. The per-milestone briefs in `docs/` remain historical records (§K).

---

## Appendix 1 — Post-audit working-tree drift (observed 2026-10-05; NOT part of the baseline)

Between the audit (2026-09-23) and the creation of this document, uncommitted changes appeared in both working trees. **Neither HEAD moved** (`c869393` frontend, `94faa56` backend). These changes were not authored by the audit. They were observed by `git status` and read via `git diff` only; they have **not** been reviewed, built, tested, or committed. They must be reconciled before the remediation program treats any baseline finding as still true.

**Backend uncommitted changes (tracked):**
- `package.json`: `"build": "nest build"` → `"nest build -p tsconfig.build.json"`.
- `tsconfig.build.json`: adds `"include": ["src/**/*.ts"]`. Together these appear to address **BUG-1** (the `TS6059` build failure) without touching `create-superadmin.ts`. Not re-verified by running the build.
- `src/modules/revenueos/leads/leads.controller.ts` and `leads.service.ts`: adds `POST /leads/:id/notes` (`CreateLeadNoteDto { note }`) and `POST /leads/:id/timeline` (`CreateLeadTimelineDto { action, remarks }`), both `@Permissions('leads.edit')`. They insert into `LeadNote` / `LeadTimeline` after a lead-existence check. **They pass no user/actor**, so rows still carry no author. If committed, this would change §H answers 2, 4, and 5 (a remark can be recorded without a status change, but still with no identified actor) and would supersede part of BACKEND MISSING CAPABILITY. It would **not** deliver the proposal's `LeadActivity` model, outcome/next-action fields, actor identity, or `Lead.isActive`.
- `src/modules/revenueos/opportunities/opportunities.controller.ts` and `opportunities.service.ts`: adds `GET /opportunities/:id` (`opportunities.view`) returning the opportunity with `lead` including `source`, `assignedTo`, `notes`, `timelines`, `followups`. If committed, it would close the "no `GET /opportunities/:id`" gap (it would not add stage/status mutation). The `assignedTo: true` include would serialize the full `User` relation; whether that exposes sensitive fields (compare the open `GET /users` `passwordHash` concern) has **not** been checked.

**Backend uncommitted changes (untracked):** `src/modules/revenueos/leads/dto/create-lead-note.dto.ts`, `create-lead-timeline.dto.ts`, `src/modules/adminos/integration-hub/integration-hub.queue.ts`, `integration-hub.worker.ts`, and `create-superadmin.d.ts`, `create-superadmin.js`, `create-superadmin.js.map` (alongside the already-known `create-superadmin.ts` and `tsconfig.build.tsbuildinfo`). The `create-superadmin.*` files were not opened.

**Frontend uncommitted changes (tracked):** `app/opportunities/[id]/page.tsx`, `lib/hooks/useLeads.ts`, `lib/hooks/useOpportunities.ts`, `lib/repository/interfaces.ts`, `lib/repository/mock/mockLeadRepository.ts`, `lib/repository/real/mappers.ts`, `lib/repository/real/realLeadRepository.ts`, `lib/repository/real/realOpportunityRepository.ts`, `lib/types/domain.ts` (9 files, +186/−18). By file name and timing these correspond to the backend changes above (lead notes/timeline and opportunity detail). They were not read, typechecked, or built after the audit. Their effect on §E, §H, and §I (e.g. `appendTimelineEntry()` throwing, `getById` via `fetchAll()`) is unknown.

**Audit-caused artifacts:** running `npm run typecheck`/`build` modifies `tsconfig.tsbuildinfo` (a tracked build artifact; already shown modified in the pre-audit `git status`), and `nest build` emits to a gitignored `dist/`.

**Required before remediation:** decide whether the uncommitted work is (a) intended and to be committed, in which case this baseline needs a dated addendum or a superseding baseline; or (b) discarded. Until then, this document describes committed state at `c869393` / `94faa56`.

---

*End of baseline.*
