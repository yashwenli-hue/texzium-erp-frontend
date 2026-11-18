# RevenueOS Stage 2F — Sales Invoices Integration

## Context

Stages 2A–2E are complete through:

- `bfd9389` — `feat(revenueos): integrate sales orders`
- `57f8afe` — workflow correction: Quotation UI now follows Quotation → Proforma → Sales Order

The intended commercial/operational lifecycle is:

Lead
→ Opportunity
→ Quotation
→ Proforma Invoice
→ Sales Order
→ Dispatch Order
→ Sales Invoice
→ Payment / Collection

Stage 2F now integrates **Sales Invoices** using the actual backend capabilities.

The approved Version A visual language remains the baseline. Small, purposeful UI/UX changes are allowed when required by the real backend workflow, but this is not a redesign milestone.

## Phase 1 — Inspect backend first

Before changing frontend code, inspect the actual backend Sales Invoice implementation.

Verify from source and, where possible, authenticated API calls:

1. Exact Sales Invoice endpoints.
2. Exact DTO/request fields.
3. Exact response fields.
4. Sales Invoice status values.
5. Supported status transitions.
6. Whether invoices are created directly or from Sales Orders/Dispatch Orders.
7. Whether Dispatch Order creates or affects Sales Invoices.
8. Whether Sales Order creation/approval affects Sales Invoices.
9. Whether a Sales Invoice detail endpoint exists.
10. Whether list responses include Sales Order, Dispatch Order, customer, opportunity, or quotation relationships.
11. Line-item behavior.
12. Whether totals/GST are backend-computed or supplied by the client.
13. Invoice numbering behavior.
14. Authentication guards.
15. Permission guards and exact permission strings.
16. Any approval/posting/cancellation/credit-note side effects.
17. Whether this belongs to RevenueOS or a separate module in the backend.

**Backend is strictly read-only.**

Do not modify anything under:

`/root/texzium-erp/backend`

Do not modify, execute, delete, or otherwise touch:

`/root/texzium-erp/backend/create-superadmin.ts`

Use the existing SUPER_ADMIN credentials for authenticated verification.

Before implementation, report the verified Sales Invoice backend surface briefly.

## Important workflow rule

The frontend must represent the intended workflow:

Quotation
→ Proforma Invoice
→ Sales Order
→ Dispatch Order
→ Sales Invoice

Do not introduce a new shortcut such as Quotation → Sales Invoice or Proforma → Sales Invoice unless the backend clearly supports it and the business workflow requires it.

If backend technical capabilities differ from the intended business workflow, preserve backend truth while keeping the normal UI path aligned with the intended lifecycle.

## Functional scope

### 1. Sales Invoice list

Replace any existing Sales Invoice stub/placeholder with a real implementation if supported.

Support:

- loading
- empty state
- backend error
- real data
- truthful status badges
- invoice number/reference
- invoice date
- customer
- Sales Order / Dispatch reference where available
- amount/total where available
- navigation to detail

Do not fabricate invoice numbers or financial fields.

If the backend does not assign an invoice number, use the established honest fallback/reference pattern already used for Quote/Proforma/Sales Order identifiers.

### 2. Sales Invoice detail

Implement real detail retrieval.

If there is no:

`GET /sales-invoices/:id`

or equivalent verified endpoint, use the established list-scan repository pattern only if appropriate.

Distinguish:

- loading
- API/backend error
- not found

Do not collapse backend failures into not-found.

Display real related records where the backend provides them.

### 3. Sales Invoice creation

Determine the actual creation workflow from backend inspection.

Possible sources may include:

- Sales Order
- Dispatch Order
- another verified backend conversion endpoint

Do not assume.

If the backend creates Sales Invoices only from Dispatch Orders, the UI must follow that path.

If creation is direct from Sales Order, implement only if that is the verified backend workflow.

Only expose fields accepted by the real DTO.

Do not frontend-calculate values that the backend calculates.

### 4. Dispatch → Sales Invoice

This is especially important because Dispatch is the stage immediately before Sales Invoice in the intended workflow.

Determine whether:

`Dispatch Order → Sales Invoice`

is a real backend operation.

If the backend supports it:

- expose the appropriate action from the Dispatch workflow if Dispatch UI already exists
- or integrate the supported entry point without creating a fake Dispatch UI
- show a consequential-action confirmation where appropriate
- handle backend errors
- navigate/refresh using actual backend state

If Dispatch frontend functionality has not yet been implemented, do not build the entire Dispatch stage inside 2F. Document the dependency and implement only what can be integrated truthfully.

### 5. Sales Order relationship

If Sales Orders expose a real Sales Invoice relationship:

- show related invoices
- provide appropriate navigation
- preserve the intended Sales Order → Dispatch → Invoice lifecycle

Do not imply that Sales Order directly creates an invoice if backend reality says Dispatch is required.

### 6. Status handling

Use actual backend Sales Invoice statuses.

Only expose verified transitions.

Do not create a frontend-only invoice lifecycle.

If invoice statuses include concepts such as:

- DRAFT
- POSTED
- CANCELLED
- PAID

do not assume those exact values exist. Verify first.

### 7. Permissions

Inspect actual backend Sales Invoice guards.

Use only verified permissions.

Do not invent permission strings such as:

- `sales-invoices.create`
- `sales-invoices.approve`
- `sales-invoices.cancel`

unless those exact permissions exist.

If the controller has no permission guards, do not fabricate frontend authorization.

### 8. Mock / real isolation

Follow the established repository architecture.

Real mode:

- real backend APIs
- real response mapping
- real statuses and relationships

Mock mode:

- isolated mock repository/seed data
- no false claims of persistence

Do not allow mock invoice records to enter real mode.

### 9. UI / UX

Preserve Version A.

Keep:

- page headers
- DataTable
- Panel
- Button
- Tag/badge conventions
- loading/error/empty patterns
- DocumentTrail
- established document styling

Small backend-driven UX changes are allowed.

Examples:

- a clear Dispatch → Invoice action
- an invoice relationship panel
- an explanation when invoice creation is unavailable until Dispatch
- a status/permission limitation
- an explicit financial-document warning

Do not:

- redesign Opportunity Pipeline
- redesign Quotations
- redesign Proformas
- redesign Sales Orders
- start Version B
- introduce dark mode
- refactor unrelated code
- revisit earlier UX decisions unless a real Sales Invoice integration dependency requires it

## Error handling

Every real Sales Invoice API operation must explicitly handle:

- loading
- success
- empty/not found
- backend/API failure
- validation failure
- consequential-action failure

Preserve useful backend errors where safe.

Do not silently swallow errors.

Do not turn API failure into empty state.

Do not navigate as though invoice creation succeeded until the backend confirms it.

## Authenticated verification

Use the existing SUPER_ADMIN credentials.

Perform authenticated API/runtime verification where possible.

At minimum verify:

1. Login succeeds.
2. Sales Invoice list endpoint works.
3. Detail retrieval works if supported.
4. The actual creation/conversion path works if safe and supported.
5. Status behavior matches backend.
6. Relationships to Dispatch/Sales Order are accurate.
7. API errors are surfaced.
8. No duplicate invoice is accidentally created by the frontend workflow.
9. Existing Sales Order and Proforma behavior does not regress.
10. Mock mode remains stable.

If testing creates or changes real database records, report exactly what happened. Do not silently delete or reverse test mutations.

Browser/DOM testing may remain unavailable due to the sandbox browser's localhost limitation. Clearly distinguish API/source verification from browser verification.

## Validation

Run:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Before committing:

- inspect `git diff`
- inspect `git status`
- confirm only intended frontend files are staged
- confirm backend source remains untouched

## Git

Create exactly one commit:

`feat(revenueos): integrate sales invoices`

Do not combine Dispatch, Payments, Collections, unrelated refactors, or backend changes.

Do not start Stage 2G.

## Final report

Report:

### Backend surface verified
- endpoints
- DTOs
- response fields
- statuses
- transitions
- creation/conversion path
- relationships
- permissions
- side effects
- module ownership
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
- API operations tested
- records created/changed during testing
- browser limitations

### Validation
- TypeScript
- lint
- build
- runtime/API checks

### Git
- commit hash
- working-tree status

### Backend safety
Explicitly confirm:

`Backend source was not modified.`

### Remaining limitations
List only verified limitations.

Do not start Stage 2G.
