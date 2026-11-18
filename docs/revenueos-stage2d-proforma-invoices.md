# RevenueOS Stage 2D — Proforma Invoices Integration

## Context

Stages 2A–2C are complete through:

`aec58b9` — `fix(revenueos): clarify opportunity stage persistence`

Current functional flow:

Lead → Opportunity → Quotation

Stage 2D now extends the real workflow into **Proforma Invoices**.

The approved Version A visual language remains the baseline. Small, purposeful UI/UX changes are allowed when the real backend workflow requires them, but this is **not a redesign milestone**.

## Primary objective

Integrate the existing Proforma Invoice backend capabilities into the RevenueOS frontend while keeping the UI honest about:

- what the backend actually persists
- what endpoints actually exist
- what status transitions are actually supported
- what permissions are actually available
- what remains frontend/mock-only

Do not invent API endpoints, DTO fields, permissions, persistence behavior, or status transitions.

---

# Phase 1 — Inspect before editing

Before writing frontend code:

1. Inspect the current frontend architecture and existing quotation implementation.
2. Inspect the backend Proforma Invoice routes/controllers/services/DTOs/models.
3. Determine the exact backend API surface for Proforma Invoices.
4. Determine the exact request/response fields.
5. Determine how a Proforma relates to a Quotation, Opportunity, Customer, or Sales Order.
6. Determine all supported status values and real backend transitions.
7. Determine whether Proforma endpoints have authentication/permission guards.
8. Determine whether a Proforma detail endpoint exists.
9. Determine whether list responses include the related quotation/customer/opportunity data needed by the UI.
10. Determine whether totals, GST, line items, numbering, dates, etc. are backend-computed or frontend-supplied.

**Backend is strictly read-only.**

Do not modify anything under:

`/root/texzium-erp/backend`

If the backend does not support something that the existing UI might suggest, adapt the frontend rather than inventing behavior.

Before implementation, briefly report the verified backend Proforma surface you found.

---

# Functional scope

Implement only the Proforma Invoice functionality supported by the verified backend.

At minimum, investigate and implement where supported:

## 1. Proforma list

Create/use the real Proforma repository and integrate the list page.

Support:

- loading state
- empty state
- backend error state
- successful real data
- appropriate navigation to detail
- truthful status display
- real identifiers/number/date/customer/amount fields where available

Do not display fabricated values when the backend does not provide them.

If the backend has no dedicated Proforma list endpoint, use the smallest truthful alternative supported by the existing API architecture. Do not invent an endpoint.

---

## 2. Proforma detail

Implement real detail retrieval where supported.

If there is no:

`GET /proforma-invoices/:id`

or equivalent verified detail endpoint, follow the established repository pattern used in Opportunities/Quotations only if appropriate (for example, list scan), and document the limitation.

The detail page should distinguish:

- backend error
- record not found
- loading

Do not collapse backend failures into “not found.”

---

## 3. Proforma creation

Determine the real creation workflow from the backend.

If Proformas are created from an approved Quotation, preserve that relationship.

Only expose fields that the verified backend DTO accepts.

Do not send frontend-calculated totals/GST if the backend calculates them.

If the backend requires seller/customer GST, inventory, addresses, line items, etc., use the existing verified master repositories/hooks where appropriate rather than duplicating mock data.

If the backend does not support a requested field, do not add fake persistence for it.

---

## 4. Quotation → Proforma workflow

If the backend supports creation/conversion from a Quotation:

- add the appropriate real action from Quotation Detail
- respect whatever backend status/precondition is actually required
- show a clear confirmation where the action is consequential
- refresh/navigate using real backend state
- handle API errors explicitly

Do not assume that every Approved quotation can create a Proforma unless the backend actually enforces/supports that.

If the backend conversion endpoint has side effects, document them and keep the frontend action aligned with the backend contract.

---

# Status handling

Verify the actual Proforma status enum and transitions from the backend.

Use only real backend statuses.

Do not create a frontend-only status lifecycle unless the backend has no status support and the distinction is explicitly local-only.

If a backend status exists but some documented roadmap status is not actually reachable, follow the same honesty pattern already used for Quotations:

- do not fake the unreachable status
- do not display a transition that the backend cannot perform
- document the limitation

---

# Permissions

Inspect the actual backend guards/permission checks.

Only gate Proforma actions using permissions that are actually verified in the backend or already established as valid frontend session permissions.

Do **not** invent permissions such as:

- `proforma.create`
- `proforma.edit`
- `proforma.approve`

unless those exact permissions are verified.

If the backend Proforma controller has no permission guards, do not fabricate frontend authorization.

In that case, preserve correct functional behavior and document the backend limitation.

---

# Mock / real isolation

Follow the existing repository architecture.

Real mode must use the real backend.

Mock mode may continue to provide a demo-safe Proforma experience where necessary.

Never make mock behavior look like backend persistence.

If mock-only features are retained, label or structure them consistently with the existing Version A conventions.

Do not allow mock-created records to accidentally enter the real-mode rendering path.

---

# UI / UX requirements

Keep the approved Version A visual language.

Preserve:

- page headers
- panels
- DataTable conventions
- buttons
- badges
- loading/error/empty patterns
- DocumentTrail
- existing quotation styling
- existing terminology unless backend reality requires a correction

Small purposeful UX changes are allowed if needed for the real Proforma workflow.

Examples of acceptable changes:

- adding a clear “Create Proforma” action to an existing Quotation detail
- adding a backend-driven status explanation
- adjusting a form field because the real DTO requires it
- adding a relationship/reference panel when the backend provides meaningful data
- clarifying an unavailable action

Do **not**:

- redesign the application
- redesign the Quotation page
- redesign the Opportunity Pipeline
- start Version B
- introduce dark mode
- refactor unrelated components
- create a new shared design system
- change unrelated Stage 2A–2C behavior

---

# Error handling

Every real Proforma API operation must have explicit handling for:

- loading
- success
- empty/not found where applicable
- backend/API failure
- validation failure
- consequential action failure

Preserve useful backend error messages where safe.

Do not silently discard API errors.

Do not convert a backend failure into an empty state.

---

# Navigation

Keep navigation coherent with the existing workflow.

Where supported, the expected relationship is approximately:

Lead
→ Opportunity
→ Quotation
→ Proforma

Do not add links to stages that have not yet been implemented.

Stage 2E Sales Orders is **not part of this milestone**.

If a backend Proforma action creates or affects a Sales Order as a side effect, do not build Sales Order UI for it yet. Document the side effect only.

---

# Important boundaries

Do NOT implement:

- Sales Orders
- Sales Order approval gates
- Dispatch
- Sales Invoices
- Payments
- Collections
- Customers/GST redesign
- Dashboard/analytics redesign
- Opportunity Pipeline redesign
- Version B
- dark mode
- backend fixes
- backend security fixes
- new backend endpoints
- new backend permissions

If backend limitations prevent part of the intended Proforma workflow, stop short of inventing a frontend workaround and document the limitation.

---

# Validation

Before committing:

1. Run TypeScript:
   `npx tsc --noEmit`

2. Run lint:
   `npm run lint`

3. Run production build:
   `npm run build`

4. Perform focused browser/runtime verification where possible:
   - Proforma list loads
   - loading state appears
   - empty state works
   - backend error state works
   - Proforma detail works
   - not-found vs API error are distinct
   - creation works against the real backend if credentials/session permit
   - Quotation → Proforma action works if supported
   - status display reflects backend truth
   - API validation errors are visible
   - mock mode remains stable
   - existing quotation behavior does not regress

5. Inspect:
   `git diff`
   `git status`

6. Verify no backend files changed.

Authentication/browser limitations should be reported separately from code-level validation. Do not claim authenticated testing if credentials are unavailable.

---

# Commit

Create exactly one commit for the completed Stage 2D milestone:

`feat(revenueos): integrate proforma invoices`

Do not combine Stage 2E or unrelated cleanup.

If implementation is blocked by a genuine backend limitation, do not create fake functionality merely to complete the milestone. Implement the supported subset, document the limitation, and report it before committing if the limitation materially prevents Stage 2D completion.

---

# Final report

Report:

## Backend surface verified
- exact Proforma endpoints
- DTO/request fields
- response fields
- statuses/transitions
- permissions/guards
- relevant relationships
- notable backend limitations

## Frontend changes
- files changed
- repository/hooks/types added or modified
- pages/actions implemented
- navigation changes
- UX changes, if any

## Mock vs real
- what is real
- what remains mock-only
- any local-only behavior

## Validation
- TypeScript
- lint
- build
- browser/runtime checks
- auth limitations, if any

## Git
- commit hash
- working-tree status

## Backend safety
Explicitly confirm:

`Backend source was not modified.`

## Remaining limitations
List only verified limitations; do not speculate.

Do not start Stage 2E.
