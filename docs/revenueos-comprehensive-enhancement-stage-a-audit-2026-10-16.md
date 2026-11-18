# RevenueOS — Comprehensive UX, Sales Workflow & Access-Control Enhancement
## Stage A — Read-only audit (2026-10-16)

Nothing was changed: no code, no database, no services. This report is the requirement matrix plus the decisions needed before Stage B/C.

### A.0 State inspected

| Item | Value |
|---|---|
| Frontend branch / HEAD | `revenueos-remediation` @ `f3f619c`; tree clean apart from untracked `docs/` |
| Backend branch / HEAD | `revenueos-remediation` @ `8d2b5ed`; tree clean apart from untracked `create-superadmin.*`, the kept `dist.pre-*` rollback builds, `integration-hub.{queue,worker}.ts` |
| Live backend | pid 637927, 127.0.0.1:3000 (build of `8d2b5ed`) |
| Live frontend | pid 740602, 127.0.0.1:3100, systemd-run unit `texzium-frontend` (build of `f3f619c`) |
| Scratch frontend | :3101 (pid 3965153) — left alone |
| Prisma schema | 2 699 lines; 46 manual migrations, latest `20261018_content_library_permissions.sql` |
| Backend tests | 64 spec files (47 under `revenueos/`); frontend `npm test` (node:test, 4 suites in `tests/`) |

**Not verified in Stage A:**
- **Live data.** A read-only `psql` session (`default_transaction_read_only=on`) was refused by the permission classifier ("Production Reads"). Status counts, role grants and user→role mapping below come from migrations and earlier audit notes (last measured 2026-10-07/10), **not** from live rows. See decision **D0**.
- **Browser.** Responsive, contrast and focus findings come from reading the source and CSS. They have not been measured in a browser.
- **Test runs.** No suites were run in Stage A.

### A.1 Facts the matrix depends on

1. **Every live user holds SUPER_ADMIN** (4 users at the 2026-10-07 audit; "Guard Test User" was added later, role unconfirmed). There is no Sales or Pre-Sales role. `Employee` is not linked to `User` (`User.employeeCode` is null). So the backend cannot currently tell a "sales employee" from a "pre-sales employee". It only knows who was assigned what, from `Lead.assignedToId` and the `PRE_SALES_ASSIGNED` / `LEAD_QUALIFIED` history rows.
2. **Ownership is limited to one field.** `Lead.assignedToId` (single user) is the only ownership field anywhere. `Opportunity` has no owner (the UI takes the owner from `lead.assignedToId`). `Customer` has no owner, team or mapping. Qualifying a lead **replaces** the pre-sales assignee with the sales user.
3. **Permissions come only from the role.** `User.roleId` is the only grant path (no user-specific grants, no teams). `PermissionsGuard` requires every listed code (`core/guards/permissions.guard.ts`). The global `JwtAuthGuard` is active (Security M1).
4. **Every list loads in full, with no server-side filtering or paging.**
   - `GET /leads` accepts only `includeInactive` (`leads/dto/list-leads-query.dto.ts`).
   - Leads, customers and opportunities are loaded whole and filtered, paged and searched in the browser (`app/leads/page.tsx:88-140`).
5. **Lead statuses.** `LeadStatus` enum = NEW, ASSIGNED, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, WON, LOST, PRE_SALES_ASSIGNED, SALES_ASSIGNED, REJECTED. There is **no** UNDERQUALIFIED, DISQUALIFIED or CNC.
6. **Lead product.** Lead has **no product/machine field**. "Product / Interest" in the Leads table reads `uiContext.productInterest`, which is mock-only and blank in real mode.
7. **No catalogue relationships.** There is no machine↔spare-part compatibility model, no BOM and no catalogue table. `InventoryItem` has only `category` (free text).

### A.2 Requirement matrix

Status key: COMPLETE / PARTIAL / MISSING / BLOCKED (BLOCKED means a decision or data is needed first; independent parts can still go ahead).

| # | Requirement | Initial status | Evidence | Gaps | Depends on | Priority |
|---|---|---|---|---|---|---|
| 1 | UI/UX coherence, Leads table widths, quick actions in one row, location-field scroll, status colours | **PARTIAL** | Shared foundation exists: `FormField`, `Modal` (focus trap), `Combobox`, `Tag`, `DataTable`, `ResponsiveList`, global `:focus-visible` (fe 8a3a3a5). | (a) **Lead column unbounded:** `.lead-id{min-width:172px}` + `.lead-id b,small{white-space:nowrap}` with no max-width (`globals.css:323-324`), so long names/companies widen the whole table. There is no tooltip/full-value affordance. (b) **Share button apart:** Quick actions (Call/Email/Meet/WhatsApp, `components/ui/QuickActions.tsx`) sit in the contact card. "Share content" is a separate button in the header actions (`app/leads/[id]/page.tsx:256` vs `:312`). (c) **Location scroll — likely root cause:** `Combobox` listens to `scroll` in the capture phase on `window` (`Combobox.tsx:136`). That also catches the list's own scroll, so every wheel/touch scroll creates a new `placement` object. The effect on `[open, act, placement]` (`:148-151`) then calls `scrollIntoView` on the highlighted option, which fights the user's scroll (snap-back/jitter). Confirm in a browser. (d) **Colour overlaps:** Qualified/Sales Assigned/Won share one green, and Assigned/Contacted/Pre-Sales Assigned share one teal (`Tag.tsx:199-211`). The text label is always shown, so meaning does not rely on colour alone, but stages cannot be told apart at a glance. Dark/light contrast not measured. | Lifecycle decision D1 (new states need colours) | High |
| 2 | Success/error toasts | **COMPLETE (minor tidy-up)** | `lib/ui/toastManager.ts` + `components/ui/Toast.tsx`: success/error/info, default `check` icon, bottom-right stack, polite and assertive live regions, dismiss, Escape, pause on hover/focus, max 3, merges duplicates. Sampled call sites raise success only after `await` (e.g. `QualifyLeadDialog.tsx:43-44`, `leads/[id]/page.tsx:185-186`). | 56 legacy `toast.show(msg, icon)` calls remain across 20 files. They behave correctly, but successes use mixed icons (`close`, `user`). A sweep to `toast.success/error` is a consistency task, not a defect. Upload success/failure should be confirmed in the sweep. | — | Low |
| 3 | Opportunity stage remarks and history | **COMPLETE** | Backend `PATCH /opportunities/:id/stage` `{fromStage,toStage,remarks}`: one transaction, compare-and-set `updateMany where {id,status:fromStage}` (`opportunities.service.ts:263-281`). A failed or stale move writes no event, and a retry after success gets 409 (no duplicate). The `OPPORTUNITY_STAGE_CHANGED` row carries `actorId` from the JWT and `userRemark` (≤500). Frontend `OpportunityStageDialog` (fe e45554c) on detail and dashboard, single-flight, "Remark by <name>" in history. Tests: `opportunities.stage.spec.ts`, `opportunities.stage-remark.spec.ts`. | None found. Re-verify in the Stage D browser pass. | — | — |
| 4 | Interaction log (calls, messages, meetings, outcomes) | **PARTIAL** | `POST /leads/:id/activities` (`leads.edit`): type ∈ NOTE/CALL/MEETING/EMAIL/WHATSAPP/REQUIREMENT/OTHER, `remarks` required (≤2000), optional `occurredAt`, actor from the server, `ACTIVITY_<TYPE>` EMPLOYEE timeline row, never changes status (`leads.service.ts:138+`, `leads.activities.spec.ts`). UI `LeadActivityForm` on lead detail. | No **outcome** (connected / not connected / no answer / busy …). Remarks are mandatory, not optional. No opportunity association, and it cannot be logged from the Opportunity page. The `NOTE` activity type overlaps with general Notes (`LeadNote`). It needs `leads.edit`, which a future pre-sales role may not hold. | D2 (CNC model), D4 (roles) | High |
| 5 | Customer visibility and ownership | **MISSING (BLOCKED on policy)** | Every customer, lead, opportunity, quotation, PI, SO, invoice, statement and document route checks only a permission code (e.g. `customer-master.controller.ts:43-70`). No ownership filter exists anywhere, including `/customers/duplicate-check`, global search (client-side over full lists), counts (`useLiveCounts`) and PDF downloads. | No ownership model (fact 2). All users are SUPER_ADMIN (fact 1), so today nobody is restricted. The rules (who owns a customer, whether pre-sales keeps sight after hand-off, whether HR gets any commercial view) are business decisions. | D3, D4 | Critical (security), but needs decisions |
| 6 | Duplicate-customer detection | **PARTIAL** | `GET /customers/duplicate-check` (name/PAN **blocking**, phone last-10-digits and email **warnings**). Create takes an advisory lock on the normalised name and re-checks inside the transaction. `Customer.panNumber` unique backstop. `CustomerGSTRegistration.gstin` is globally `@unique` (`customer-master.service.ts:60-190`, `customer-lifecycle.ts:219-292`). The frontend create flow already shows matches (`CustomerCreateFlow`, `customerCreate.ts`). | (a) **GSTIN not in duplicate check:** GSTIN is the strongest identifier but is not checked as you type. (b) **Order of creation:** the two-step flow creates the customer **before** the GST registration, so a GSTIN owned by another customer fails at step 2 and leaves a new duplicate customer behind. (c) **Exposure:** the response returns code and name of any match regardless of access (once #5 exists, inaccessible matches must be masked: "a customer with this GSTIN already exists — request access"). (d) **Request access:** there is no access-request workflow. (e) **Tests missing for:** formatting variants of GSTIN, concurrent GSTIN submissions, access masking. | D3 for masking / request access | High |
| 7 | Lead lifecycle, qualification, reopening | **PARTIAL** | Governed assign/qualify/reject/unassign with lock, actor, 409 rules (`lead-assignments/lead-transitions.ts`, `lead-assignments.service.ts`, `lead-assignment-actions.spec.ts`). Reject requires a reason. | (a) No Underqualified / Disqualified states (fact 5). (b) **Reopen:** REJECTED is terminal, with no reopen route, event or permission. (c) **Probable "cannot qualify" causes** (to confirm on live data, D0): a lead in **`QUALIFIED`** (legacy, or set through `POST /lead-status`) is refused by qualify ("already qualified", `canQualifyLeadFrom` excludes it) yet has no sales assignee, so it is stuck. The qualify dialog's user list comes from `GET /users`, which needs `users.view`, so a user without it sees no one to assign. (d) **Status route open:** `POST /lead-status` (`leads.status.update`) sets **any** status string (`status as any`), with no transition rules and no actor on `STATUS_UPDATED` (`lead-status.service.ts`). The Kanban limits the UI to NEW/CONTACTED, but the API does not. (e) Opportunity creation is gated on "qualified" only in the frontend; `OpportunitiesService.create` does not check the lead status. (f) `LEAD_CREATED` has no actor. | D1 | Critical |
| 8 | CNC (Call Not Connected) | **MISSING** | Not a status, activity type or outcome anywhere. | Representation decision (D2). | D1, D2 | High |
| 9 | Leads pipeline and filtering | **PARTIAL** | `FilterBar` + `ActiveFilterChips` + date range: status, source, source type, follow-up, country/state/city, assignment (Unassigned only) (`app/leads/page.tsx:77-138`). Status filter options come only from statuses present in the loaded list. | Filters, sort and page are plain `useState`, so they are lost on navigating to a lead and back. Filtering and paging happen in the browser over the full list. Lifecycle states that are absent from the data never appear as options. Column widths unbounded (see #1). "Product / Interest" is always blank in real mode. | D1; server-side query for scale | High |
| 10 | Pre-sales panel filters and assignment view | **MISSING** | There is no pre-sales page. The only lead surfaces are `/leads`, `/pipeline` and lead detail. | Needs a server-side query: by pre-sales person (from `PRE_SALES_ASSIGNED` history actor/assignee), assignment state, status, sales assignee, with paging and counts that respect access. "Who is pre-sales" cannot be told from the role today (fact 1). | D3, D4; new `GET /leads` query params | High |
| 11 | Duplicate leads and source attribution | **PARTIAL → BLOCKED for "same product"** | Deletion with reason DUPLICATE + survivor exists (M3). There is no detection at create or webhook time. | No product on Lead (fact 6), so "same product" cannot be detected without a data model change. Phone/email/name duplicate detection plus "already a customer" (phone/email/GSTIN → Customer) can be built now. | D5 (product on lead), D3 for masking | Medium |
| 12 | Recycle bin and deletion governance | **COMPLETE (code); live check pending** | `DataDeletionRecord` DELETED/RESTORED/PURGED, `RECOVERY_WINDOW_DAYS = 30` stored per record (`data-deletion.ts:51`), restore with conflict re-check, manual purge + hourly `DataDeletionPurgeWorker`, append-only trigger + lifecycle CHECK, `governance.deletions.{view,restore,purge}` enforced on every route. Nav item hidden without `view` (`lib/pageMeta.ts:84`). Specs: `data-deletion-access.spec.ts`, `data-deletion.service.spec.ts`, `data-deletion-purge.worker.spec.ts`, `data-deletion-schema.spec.ts`. | Live grants and that the worker is running were not re-read (D0). Do not restore or purge live data. Re-running the specs is a Stage D item. | D0 | Verify only |
| 13 | Role and permission administration | **MISSING (UI); PARTIAL (backend)** | Backend: `POST /roles`, `POST /role-permissions` (grant only), `POST /permissions`, `POST /users`, plus GET lists. The granter must already hold what they grant (`identity-admin` `assertHoldsAll`). `AuditLog` rows are written. | No UI at all. No **revoke** route. No way to change a user's role or status. No per-role permission view (only a flat `GET /role-permissions`). No permission grouping metadata beyond `Permission.module`. No user-specific grants, so no role/user conflict exists to resolve (simpler, and least privilege). | D4; backend additions need authorization | High |
| 14 | Spare-parts selection and content filters | **BLOCKED (catalogue data model)**; content filters **PARTIAL** | Content list API already filters `kind`, `status`, `q`, `tag`, `inventoryItemId` (`content-library/dto/content-asset.dto.ts:107-127`). The share dialog filters only kind and search text (`ShareContentDialog.tsx:77,172-212`). Safeguards are in place: confirm >1, immutable versions, `CONTENT_SHARED` in the same transaction, HMAC 15-minute URLs, manual wa.me hand-off. | No machine↔part compatibility data, and no lead/opportunity product lines with quantities. Building "compatible spares" would mean inventing compatibility, which is not allowed. Safe groundwork: category / inventory-item filters in the share dialog (category is not yet a server filter). | D6 | Medium (groundwork) |
| 15 | Frontend quality and responsive audit | **PARTIAL** | Earlier milestones fixed labels, focus-visible, modal trap, shell overflow, `.crm-grid` mobile overflow. | Items listed in #1 and #9. Light-theme `--faint` contrast (2.08:1, measured 2026-10-07) is still used for placeholders ("—", "Unassigned"). Keyboard reachability of `DataTable` clickable rows needs re-checking. Full browser sweep (390/820/desktop × light/dark) is a Stage D item. | — | Medium |
| 16 | Execution and safety | Process | Followed for Stage A. No writes anywhere; live DB read refused (D0). | — | — | — |

### A.3 Proposed canonical lead lifecycle (for decision D1)

Recommended design: keep the existing enum values (backward compatible, no rewrite of existing rows) and add only what is missing.

| Concept | Representation | Notes |
|---|---|---|
| New | `NEW` | unchanged |
| Contacted | `CONTACTED` | `ASSIGNED` is legacy, shown as "Assigned", not offered for new moves |
| Pre-sales assigned | `PRE_SALES_ASSIGNED` | assignment state, not a qualification verdict |
| **Underqualified** | **new `UNDERQUALIFIED`** (additive `ALTER TYPE … ADD VALUE`) | contacted but not yet a fit; can still be qualified, rejected, or returned to Contacted; reason optional |
| Qualified | `SALES_ASSIGNED` (new qualifications); `QUALIFIED` kept for legacy rows | fix: allow qualify (assign to sales) **from `QUALIFIED`** when the lead has no sales hand-off, so legacy rows are not stuck |
| Disqualified / Rejected | **one concept, `REJECTED`**, labelled "Disqualified" (or "Rejected — Disqualified") in the UI | there is only one stored state today; splitting it would need a business definition of the difference (D1b) |
| **Reopen** | **new route** `PATCH /lead-assignments/:id/reopen`, permission **`leads.reopen`** (new, SUPER_ADMIN only), reason required, `LEAD_REOPENED` event with actor; REJECTED → `CONTACTED` (or `UNDERQUALIFIED`) | history kept; the rejection event is never edited |
| In sales / closed | `PROPOSAL_SENT`, `NEGOTIATION`, `WON`, `LOST` | unchanged (driven by opportunities) |
| **CNC** | **call outcome, not a status** (D2): `LeadTimeline.outcome` nullable (`CONNECTED`, `NOT_CONNECTED`, …) on `ACTIVITY_CALL`; filters use "last call outcome" | a status would overwrite the real lifecycle position, and repeated attempts would be lost; an outcome keeps every attempt with actor and time |

`POST /lead-status` would be limited to the pre-qualification moves (NEW ↔ CONTACTED ↔ UNDERQUALIFIED), record the actor and refuse everything else with 409. `OpportunitiesService.create` would require a qualified lead (checked against live data first so legacy rows are not blocked).

### A.4 Access-control options (for decision D3)

Ownership must be derived from data that already exists, or from a new explicit owner field. Recommendation: **Option A**.

- **Option A — derived visibility.** A user may see a lead if any of these hold:
  - they are its current assignee;
  - they are named as pre-sales or sales assignee in its history;
  - they created it (needs `LEAD_CREATED` actor going forward).

  A user may see an opportunity or quote-to-cash document if they can see its lead. A user may see a customer if they can see any opportunity linked to it. New permission codes `leads.view.all` and `customers.view.all` (SUPER_ADMIN only) bypass the filter. No HR access by default.
  - Pros: no data backfill.
  - Cons: customers with no opportunity are visible only to `*.view.all` holders. Query cost is moderate (index on `LeadTimeline(actorId)` exists).
- **Option B — explicit owner columns.** Add `Customer.ownerId` and `Opportunity.ownerId` (plus a team table if needed).
  - Pros: clearer and supports reassignment.
  - Cons: needs a migration, a backfill decision and an owner-change workflow.

With either option, every list, detail, search, count, statement, PDF and duplicate-check route must filter on the server. "Not visible" returns **404**, never 403, so the existence of a record does not leak.

### A.5 Decisions needed (business / authorization)

- **D0 — Live read-only access.** May I run read-only SQL (inside a `default_transaction_read_only` session) on `texzium_erp` to count lead statuses (especially `QUALIFIED` without a sales hand-off), roles, grants and users? Without it, the qualify bug and the legacy impact of D1 stay unconfirmed. Alternatively you run the queries I give you.
- **D1 — Lifecycle** as in A.3.
  - D1a: add `UNDERQUALIFIED`?
  - D1b: are "Rejected" and "Disqualified" the same business concept (recommended: yes, one stored state)?
  - D1c: which status does Reopen return to?
  - D1d: who may reopen?
  - D1e: should Opportunity creation require a qualified lead on the server?
- **D2 — CNC.** Call outcome (recommended) or lead status?
- **D3 — Visibility policy.** Option A or B. Does pre-sales keep visibility after hand-off? Does any HR role get commercial data (recommended: no)? Is "request access" in scope (it needs a new workflow and table)?
- **D4 — Roles.**
  - Create Sales and Pre-Sales roles with explicit grant lists for review?
  - Grants change only after your approval. No live users are moved during this work.
  - Add backend revoke-permission and change-user-role routes (audited, hold-what-you-grant)?
- **D5 — Lead product.** Add a product reference to Lead (`inventoryItemId`, or interest lines)? Without it, product-level duplicate detection and product filters cannot exist.
- **D6 — Spare-parts compatibility.** Is there an authoritative machine↔spare compatibility list (and who maintains it)? Until there is one, only category / inventory-item filters can be built.
- **D7 — Backend work.** The frontend CLAUDE.md treats the backend as read-only unless you authorize changes. Requirements 5, 6, 7, 8, 10, 11 and 13 need backend and migration changes. Please confirm that this request authorizes them, milestone by milestone, with the usual flow: scratch database first, stop for review, you run activation.

### A.6 Proposed milestone order (Stage B/C, each its own commit set and review stop)

1. **M-A UI fixes (frontend only, no decisions needed).**
   - Changes: Lead/company/location column width cap + truncation + tooltip/title; quick-action row including Share content; Combobox scroll fix; persisted Leads filters/sort/page (URL query); status-colour separation (Qualified ≠ Won, Assigned/Contacted/Pre-Sales distinct) with contrast checks; toast sweep.
   - Scope classes: (1) screen-specific, plus (2) `Combobox` and `Tag` patterns.
2. **M-B Lifecycle + CNC** (after D1/D2).
   - Backend: transitions, reopen, `UNDERQUALIFIED`, governed `/lead-status`, call outcome, activity remarks optional, actor on `LEAD_CREATED`.
   - Frontend: lifecycle UI, CNC logging, filters.
3. **M-C Customer duplicate hardening** (no policy needed for most of it).
   - Backend: GSTIN in duplicate-check.
   - Frontend: check GSTIN **before** creating the customer.
   - Tests: GSTIN formatting variants, concurrency.
   - Masking waits for D3.
4. **M-D Server-side lead query + Pre-Sales panel** (after D3/D4).
   - `GET /leads` filters (status, assignment state, pre-sales person, sales person, search), paging, counts.
   - New Pre-Sales page.
5. **M-E Visibility enforcement** (after D3): every RevenueOS read path, search, counts, PDFs; two-user + admin tests.
6. **M-F Permission administration** (after D4).
   - Backend: revoke + user role change routes.
   - Frontend: grouped/searchable role editor, effective-permission view, confirm sensitive grants.
7. **M-G Duplicate leads** (phone/email/customer match now; product match after D5).
8. **M-H Content-sharing filters / spare-parts groundwork** (after D6).
