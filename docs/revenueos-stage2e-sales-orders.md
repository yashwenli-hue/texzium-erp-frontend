# RevenueOS Stage 2E — Sales Orders & Approval Gates

## Context

Stages 2A–2D are complete through `1da8308` — `feat(revenueos): integrate proforma invoices`.

Authenticated verification has now been performed with a working SUPER_ADMIN session.

The real workflow currently verified is:

Lead → Opportunity → Quotation → Proforma

Stage 2E extends the frontend into Sales Orders and their approval workflow, using only backend capabilities that actually exist.

The approved Version A visual language remains the baseline. Small, purposeful UI/UX changes are allowed when required by the real backend workflow, but this is not a redesign milestone.

## Phase 1 — Inspect backend first

Before changing frontend code, inspect the actual backend Sales Order implementation.

Verify from source and, where possible, authenticated API calls:

1. Exact Sales Order endpoints.
2. Exact DTO/request fields.
3. Exact response fields.
4. Sales Order status values.
5. Supported status transitions.
6. Approval/rejection endpoints and preconditions.
7. Whether Sales Orders can be created directly.
8. Whether they are created through Quotation conversion.
9. Whether Quotation conversion creates a Sales Order automatically.
10. Whether Proforma creation/approval affects Sales Orders.
11. Whether a Sales Order detail endpoint exists.
12. Whether list responses include quotation/opportunity/customer information.
13. Line-item behavior and whether totals/GST are backend-computed or supplied.
14. Numbering behavior.
15. Authentication guards.
16. Permission guards and exact permission strings.
17. Side effects on related records.

**Backend is strictly read-only.** Do not modify anything under `/root/texzium-erp/backend`.

If backend behavior differs from assumptions in this brief, follow the verified backend contract.

Before implementation, briefly report the verified Sales Order surface.

## Functional scope

### 1. Sales Order list

Replace any existing Sales Order stub/placeholder with a real implementation if supported.

Support:

- loading
- empty
- backend error
- real data
- status badges
- meaningful identifiers/number/date/customer/amount fields where available
- navigation to detail

Do not fabricate fields.

### 2. Sales Order detail

Implement real detail retrieval.

If there is no `GET /sales-orders/:id` or equivalent, use the established list-scan repository pattern only if appropriate.

Distinguish:

- loading
- backend/API error
- not found

Display real related information where provided.

### 3. Quotation → Sales Order

This is critical.

Verify directly against the current backend the behavior previously discovered during Stage 2C: Quotation conversion may create a Sales Order as a backend side effect.

If supported:

- expose the appropriate conversion action
- clearly explain consequential effects
- call only the verified endpoint
- refresh/navigate from actual backend state
- handle API errors
- do not fabricate a Sales Order record

If conversion already creates the Sales Order, do not introduce a second creation path or duplicate.

### 4. Proforma → Sales Order relationship

Determine whether the backend actually connects Proforma approval to Sales Order creation.

Do not assume it does.

If Proforma approval does not create/mutate a Sales Order, preserve that behavior.

Only implement a real Proforma → Sales Order operation if it exists and belongs to the verified Stage 2E backend contract.

### 5. Sales Order approval gates

Inspect the actual backend workflow.

If supported, implement only verified transitions such as:

- approve
- reject
- cancel
- submit
- confirm
- status update

For consequential actions:

- confirmation where appropriate
- show actual persisted status
- explicit API error handling
- no optimistic fake status

If the UI provides a safeguard not enforced by backend, document it as a frontend safeguard rather than backend authorization.

Do not invent approval gates.

### 6. Permissions

Inspect actual Sales Order guards.

Use only verified permissions.

Do not invent permission strings such as `sales-orders.create`, `sales-orders.approve`, or `sales-orders.edit` unless verified.

If the controller has no permission guards, do not fabricate frontend authorization. Document the limitation.

If permissions exist, reuse the established `hasPermission()` pattern.

### 7. Status handling

Use actual backend status vocabulary and verified transitions.

Do not create a frontend-only Sales Order lifecycle.

If statuses are plain strings, document observed values and expose only verified transitions.

Do not fake unreachable roadmap statuses.

### 8. Mock / real isolation

Follow the existing repository architecture.

Real mode uses real APIs and real response mapping.

Mock mode uses isolated mock repository/seed data.

Do not allow mock Sales Orders to leak into real mode.

Do not simulate unsupported real operations.

### 9. UI / UX

Preserve Version A:

- page headers
- DataTable
- Panel
- Button
- Tag/badge conventions
- loading/error/empty states
- DocumentTrail
- quotation/proforma styling
- existing terminology unless backend reality requires correction

Small backend-driven UX changes are allowed, such as conversion confirmation, approval explanation, relationship panels, or limitation messaging.

Do not:

- redesign Opportunity Pipeline
- redesign Quotations
- redesign Proformas
- start Version B
- introduce dark mode
- refactor unrelated code
- alter Stage 2A–2D behavior unless genuinely required by Sales Order integration

### 10. Navigation and document lifecycle

The conceptual chain is becoming:

Lead → Opportunity → Quotation → Proforma → Sales Order

But backend reality takes precedence.

If the backend creates Sales Orders directly from Quotation conversion, represent that accurately.

If Proforma is not part of Sales Order creation, do not imply that it is.

Add DocumentTrail relationships only where IDs/data are verified.

Do not add future links to Dispatch, Sales Invoice, or Payments.

## Error handling

Every real Sales Order API operation must explicitly handle:

- loading
- success
- empty/not found
- API/backend failure
- validation failure
- consequential-action failure

Preserve useful backend errors where safe.

Do not swallow errors or turn API failure into empty state.

Do not navigate as though conversion succeeded until backend confirms it.

## Authenticated testing

Valid SUPER_ADMIN credentials are now available.

Use them for authenticated API/runtime verification.

Do not modify, execute, delete, or otherwise touch:

`/root/texzium-erp/backend/create-superadmin.ts`

Use the existing credentials only.

Verify JWT/session permissions relevant to Sales Orders.

If browser/DOM testing remains unavailable because the sandbox browser cannot reach localhost, clearly distinguish API-level, source-level, and browser-level verification.

## Validation

Run:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`

Then perform focused authenticated verification:

1. Login succeeds.
2. Sales Order list endpoint works.
3. Detail path works if supported.
4. Quotation conversion creates exactly one Sales Order if that is backend behavior.
5. Converted Sales Order is retrievable through the frontend repository.
6. Approval/status transitions behave exactly as backend supports.
7. API errors are surfaced.
8. Related quotation/opportunity/proforma references are accurate.
9. Existing Quotation and Proforma behavior does not regress.
10. No duplicate Sales Orders are created.
11. Mock mode remains stable.
12. Backend remains untouched.

If testing mutates database state, report exactly what record was created/changed. Do not silently clean it up.

## Git / commit

Create exactly one commit:

`feat(revenueos): integrate sales orders`

Do not combine Dispatch, Sales Invoices, Payments, unrelated refactors, or backend changes.

Before committing:

- inspect `git diff`
- inspect `git status`
- confirm only intended frontend files are staged
- confirm backend source is untouched

## Final report

Report:

### Backend surface verified
- endpoints
- DTOs
- response fields
- statuses
- transitions
- permissions
- relationships
- side effects
- backend limitations

### Frontend changes
- files changed
- repositories/hooks/types
- pages/actions
- navigation
- UX changes

### Mock vs real
- real functionality
- mock-only functionality
- local-only behavior, if any

### Authenticated verification
- login result
- JWT/permission findings
- API operations tested
- database records created/changed

### Validation
- TypeScript
- lint
- build
- API/runtime checks
- browser limitations

### Git
- commit hash
- working-tree status

### Backend safety
Explicitly confirm:

`Backend source was not modified.`

### Remaining limitations
List only verified limitations.

Do not start Stage 2F.
