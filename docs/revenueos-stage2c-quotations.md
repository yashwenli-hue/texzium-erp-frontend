# RevenueOS Stage 2C — Quotations Integration

## Purpose

Implement **Stage 2C — Quotations** of the RevenueOS Version A functional integration.

This is a **frontend-only implementation milestone** against the existing backend.

Version A UI/UX is frozen. Do not redesign it.

The authoritative workflow for this milestone is:

**Opportunity → Quotation → Revise → Approve → Convert**

Quotation statuses are:

**DRAFT → REVISED → APPROVED → CONVERTED**

Do not start Proforma Invoices or any later stage.

## Required reading

Before changing code, read:

- `CLAUDE.md`
- `docs/backend-ui-contract.md`
- `docs/revenueos-stage2-plan.md`
- `docs/revenueos-stage2a-leads-opportunities.md`
- `docs/revenueos-stage2a-completion-audit.md`
- `docs/revenueos-stage2b-opportunities.md`

Inspect the current implementation at:

- `c9d639c` — Stage 2A complete
- `bbefc60` — Stage 2B complete

Treat the master Stage 2 plan and verified backend contract as authoritative.

---

# Hard constraints

### Frontend only

Do not modify:

- backend source
- database
- Prisma schema
- migrations
- seed data
- credentials/passwords
- backend configuration

Do not change the backend to accommodate the frontend.

### Do not start later stages

Do not implement:

- Proforma Invoices
- Sales Orders
- Dispatch
- Sales Invoices
- Payments
- Customers/GST
- Reports/analytics

In particular, **do not implement Stage 2D** during this milestone.

### UI/UX freeze

Preserve approved Version A design.

Do not:

- redesign pages
- redesign quotation screens
- introduce dark mode
- introduce Version B concepts
- perform broad visual refactors
- change Lead Master spacing
- alter established navigation except where required for the quotation workflow

Make the smallest reasonable UI additions/changes.

### Backend truth

Do not invent quotation capabilities.

Before implementation, verify the exact quotation routes, DTOs, response fields, status values, permissions, and available mutations from the verified contract and read-only backend inspection.

If a workflow step is not actually supported by the backend, do not fabricate it.

---

# Stage 2C scope

Implement the verified real-backend quotation workflow:

1. Opportunity → Quotation relationship
2. Quotation creation
3. Quotation list
4. Quotation detail, only if backend supports a truthful detail path
5. Quotation statuses
6. Revise
7. Approve
8. Convert
9. Loading states
10. Genuine empty states
11. Fetch/API error states
12. Validation/API error display
13. Permission-aware actions
14. Real/mock repository isolation
15. Appropriate Opportunity/Quotation navigation and entry points

The exact supported subset must be determined from the backend contract before coding.

---

# Step 1 — Audit current quotation implementation

Before changing code:

- Locate quotation pages.
- Locate quotation forms/dialogs.
- Locate quotation repositories.
- Locate quotation hooks.
- Locate quotation types.
- Locate mock quotation data.
- Locate any existing quotation dialogs referenced from Opportunity screens.
- Trace every current quotation read/write.
- Identify which parts are currently mock-only.
- Compare current frontend quotation models with backend DTOs.

Do not assume the current mock quotation model matches the backend.

Document mismatches internally before implementation.

---

# Step 2 — Verify backend quotation contract

Using `docs/backend-ui-contract.md` plus read-only backend inspection, verify the exact:

- quotation list route
- quotation creation route
- quotation detail route, if any
- quotation revision route
- quotation approval route
- quotation conversion route
- request DTOs
- response DTOs
- quotation status enum
- permission strings
- Opportunity relationship field
- customer/lead relationship fields, if present
- quotation item fields
- pricing/amount fields
- validity date, issue date, remarks, or other fields only if actually supported

Do not invent:

- endpoint paths
- HTTP methods
- DTO fields
- status values
- permission strings
- quotation item structure
- calculation behavior

Backend-owned pricing/tax/accounting calculations must remain backend-owned where the contract says so.

---

# Step 3 — Repository architecture

Follow the repository architecture established in Stages 2A and 2B.

The real quotation repository must:

- call only verified endpoints
- send only verified DTO fields
- explicitly map backend responses
- preserve backend status values
- surface `ApiError`
- never send mock-only fields
- never silently fall back to mock quotation data in real mode

Keep mock quotation behavior isolated.

If the existing repository architecture already has quotation methods, audit and reuse them where correct rather than rewriting working code.

---

# Step 4 — Quotation creation

Implement the verified quotation creation workflow.

The creation UI must:

- be reachable from an appropriate Opportunity context if supported
- preserve the Opportunity relationship where supported
- use only verified DTO fields
- use only verified item/product fields
- display backend validation/API errors
- never silently discard backend messages
- never fabricate successful creation
- refresh/update quotation data after success using the existing repository architecture

Do not implement fields merely because they exist in the mock UI.

---

# Step 5 — Quotation list

Connect quotation list behavior to the real backend where supported.

Requirements:

- real data by default in real mode
- loading state
- genuine zero-result empty state
- fetch/API error state distinct from empty state
- retry/refetch where appropriate
- accurate status display
- accurate amounts/dates/relationships
- no fabricated quotation records

Preserve Version A styling.

---

# Step 6 — Quotation detail

Only implement real detail if the backend provides a truthful detail route or an existing verified pattern that can safely provide the data.

If no dedicated quotation detail endpoint exists:

- do not invent one
- do not make a fake detail request
- use only an explicitly supported list/full-response path if appropriate
- clearly preserve real/mock separation

Do not create a fake server-side quotation detail workflow.

---

# Step 7 — Revise

Implement the backend-supported revision workflow.

Requirements:

- use the exact verified revision endpoint/method
- use the exact verified DTO
- preserve the backend status transition
- display backend validation/API errors
- prevent fake local-only revision success
- refresh quotation data after success

The UI must accurately reflect the backend's status after revision.

Do not invent additional revision states.

---

# Step 8 — Approve

Implement the backend-supported approval workflow.

Requirements:

- exact verified endpoint/method
- exact verified payload, if any
- correct permission gating
- backend status remains authoritative
- clear success/failure feedback
- no fake approval state
- refresh quotation data after success

Do not add commercial approval rules that belong to later Sales Order stages.

---

# Step 9 — Convert

Implement the backend-supported quotation conversion workflow.

Requirements:

- exact verified endpoint/method
- exact verified payload, if any
- correct permission gating
- backend status remains authoritative
- clear success/failure feedback
- refresh quotation data after success

Important:

**Conversion must stop at the backend-supported quotation conversion boundary.**

Do not automatically create Proforma Invoices, Sales Orders, Dispatch Orders, Sales Invoices, or any later-stage records unless the verified backend explicitly defines that behavior as part of the quotation conversion endpoint. If the backend conversion endpoint only changes quotation status or returns a conversion result, reflect exactly that and stop.

---

# Step 10 — Status handling

Use only verified backend quotation status values.

Expected workflow terminology from the master plan:

- `DRAFT`
- `REVISED`
- `APPROVED`
- `CONVERTED`

However, verify the actual backend enum before coding.

Do not:

- invent additional statuses
- fake status persistence
- use localStorage as a substitute for backend quotation status
- allow UI transitions that the backend does not support

Backend status is authoritative.

---

# Step 11 — Permissions

Use the existing `AuthContext.hasPermission()` approach.

Verify exact quotation permission strings from the backend contract.

Gate appropriate actions such as:

- Create quotation
- Revise
- Approve
- Convert

Do not invent permission names.

Keep reactive 401/403 handling intact.

---

# Step 12 — Error handling

Follow the Stage 2A/2B standard.

Every real quotation fetch/mutation must distinguish:

- loading
- genuine empty/not-found
- API error
- validation error
- permission error

Never turn a failed request into an empty state.

Never swallow backend messages.

Never show fake success.

Mutation actions must have visible failure feedback.

---

# Step 13 — Mock isolation

Audit all quotation mock behavior.

Classify each item:

- real backend supported
- backend-limited
- mock-only
- later-stage/out-of-scope

In real mode:

- never silently display mock quotations
- never expose mock quotation creation as if it were real
- never mix mock quotation items with real quotation data

Mock mode may retain appropriate prototype behavior.

---

# Step 14 — Opportunity integration

Update Opportunity screens only where required for the verified quotation workflow.

Examples:

- Create Quotation entry point
- Related Quotations display
- quotation status
- quotation navigation

Do not redesign the Opportunity screen.

Do not rework completed Stage 2B behavior unnecessarily.

---

# Step 15 — Visual regression

Perform a lightweight visual review.

Confirm:

- Version A visual language remains intact
- existing Lead screens remain unchanged
- existing Opportunity screens retain their approved structure
- quotation screens fit the existing design system
- loading/error/empty states are consistent
- no dark mode work
- no Version B work

Do not attempt authenticated browser testing if valid credentials remain unavailable.

Do not reset, guess, brute-force, or create credentials.

---

# Validation

Before committing:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

If `npm run build` corrupts the concurrently running Next dev cache:

1. stop/restart the frontend dev server cleanly
2. verify the dev server responds
3. ensure `.next` churn is not treated as source changes

Do not modify backend code or backend data.

---

# Git

Stage 2C is one milestone and must produce exactly one implementation commit.

Suggested commit message:

```text
feat(revenueos): integrate quotations
```

Before committing:

- confirm frontend working tree contains only intended Stage 2C changes
- confirm backend remains untouched
- confirm credentials/database/seed data remain untouched
- confirm typecheck/lint/build pass

After committing, report:

- commit hash
- working-tree status
- backend status
- files changed
- verified quotation endpoints integrated
- verified quotation statuses
- verified permissions
- backend limitations
- remaining mock-only behavior
- confirmation that Stage 2D was NOT started

---

# Stop condition

STOP after the Stage 2C implementation commit.

Do not start Proforma Invoices.
Do not implement Sales Orders.
Do not implement Dispatch.
Do not implement Sales Invoices.
Do not implement Payments.
Do not implement Customers/GST.
Do not implement Reports.
Do not redesign Version A.

Wait for further instructions.
