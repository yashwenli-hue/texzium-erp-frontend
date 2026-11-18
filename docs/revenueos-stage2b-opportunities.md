# RevenueOS Stage 2B — Opportunities Integration

## Purpose

Implement **Stage 2B — Opportunities** of the RevenueOS Version A functional integration.

This is a **frontend-only implementation milestone** against the existing backend.

The approved Version A UI/UX is frozen. Do not redesign it.

## Required reading

Before changing code, read:

- `CLAUDE.md`
- `docs/backend-ui-contract.md`
- `docs/revenueos-stage2-plan.md`
- `docs/revenueos-stage2a-leads-opportunities.md`
- `docs/revenueos-stage2a-completion-audit.md`

Also inspect the current implementation at:

- `c9d639c` — `fix(revenueos): complete stage 2a error and permission handling`

Treat the master Stage 2 plan and verified backend contract as authoritative.

## Hard constraints

### Frontend only

Do not modify backend source, database, Prisma schema, migrations, seed data, credentials/passwords, or backend configuration.

### Do not start later stages

Do not implement Quotations, Proforma Invoices, Sales Orders, Dispatch, Sales Invoices, Payments, Customers/GST, or Reports/analytics.

### UI/UX freeze

Preserve the approved Version A design. Do not redesign pages, change Lead Master spacing, introduce dark mode, introduce Version B concepts, perform broad visual refactors, or change established navigation unless required for Opportunity functionality.

### Backend truth

Do not invent backend capabilities.

In particular:
- do not invent `GET /opportunities/:id` if it is not verified
- do not invent opportunity stage/status mutation endpoints
- do not claim stage changes are persisted server-side if the backend does not support that mutation

## Stage 2B scope

Implement real backend integration for:

1. Opportunity list
2. Opportunity creation
3. Lead → Opportunity relationship
4. Expected value
5. Probability
6. Expected close date
7. Opportunity status
8. Related quotation information only where actually supported
9. Loading states
10. Empty states
11. Fetch/API error states
12. Validation/API error display
13. Permission-aware actions
14. Real/mock repository isolation

Replace existing mock Opportunity behavior wherever the backend actually supports the capability.

## Step 1 — Audit current Opportunity implementation

Before changing code:

- Locate Opportunity pages, components, hooks, repositories, mock data, and types.
- Determine which fields are currently UI-only/mock.
- Trace all current Opportunity reads/writes.
- Determine whether an Opportunity detail page exists.
- Identify existing pipeline/stage UI.
- Trace current Opportunity repository methods.
- Compare every field against the verified backend DTO/schema.

Do not assume the mock model matches the backend.

## Step 2 — Verify backend contract

Using the existing verified contract and read-only backend inspection where necessary, verify:

- `POST /opportunities`
- `GET /opportunities`
- exact request DTO fields
- exact response fields
- exact status enum values
- exact permission strings
- lead relationship fields
- expected value field/type
- probability field/type
- expected close date field/type
- quotation relationship fields, if any

Do not modify the backend.

If a capability is unavailable, adapt the frontend rather than fabricating it.

## Step 3 — Repository architecture

Follow the repository architecture established in Stage 2A.

The real Opportunity repository must:

- call only verified backend endpoints
- send only verified DTO fields
- map backend responses explicitly
- preserve backend enum values
- surface `ApiError` messages
- never send mock-only fields

Keep mock repositories separate. Do not mix mock data into real Opportunity responses.

## Step 4 — Opportunity list

Connect the Opportunity list to `GET /opportunities`.

Requirements:

- real data by default in real mode
- loading state
- genuine zero-result empty state
- fetch/API error state distinct from empty state
- retry/refetch where appropriate
- accurate backend values
- no fabricated opportunities

Preserve the approved Version A visual language.

## Step 5 — Opportunity creation

Connect creation to `POST /opportunities`.

The form must:

- send only verified backend DTO fields
- validate required fields appropriately
- support Lead → Opportunity relationship where supported
- support expected value where supported
- support probability where supported
- support expected close date where supported
- support status only according to the verified contract
- display real backend validation/API errors
- never silently discard `ApiError`
- never fabricate success

After successful creation, refresh/update the list through the existing repository architecture.

## Step 6 — Lead → Opportunity relationship

If the backend exposes a verified lead relationship:

- allow creating an Opportunity from a Lead where appropriate
- preserve the relationship in the real request
- display the related Lead in Opportunity UI

Do not invent a relationship endpoint.

If creating from a Lead is supported but the current UI has no entry point, add the smallest consistent UI entry point needed.

## Step 7 — Opportunity status / stage

Use only status values actually supported by the backend.

If the backend does **not** expose a status/stage mutation endpoint:

- do not create fake persistence
- do not send invented PATCH/POST requests
- do not imply drag/drop changes are saved server-side
- if existing UI has client-side stage movement, clearly keep it local/mock-only
- real backend status remains authoritative

If the backend supports only creation/listing of status, do not expand it into a server-side workflow.

## Step 8 — Opportunity detail

Only implement real Opportunity detail if a verified backend endpoint supports it.

If `GET /opportunities/:id` is not verified:

- do not invent it
- do not create a fake detail API
- do not make a detail page appear to be backed by real data

Use the list response for whatever summary/detail interaction can truthfully be supported, or retain an existing mock-only detail path clearly separated from real mode.

## Step 9 — Related quotations

Only display quotation information if the backend actually exposes the relationship/data needed.

Do not implement quotation creation/editing in Stage 2B. Do not start Stage 2C.

If quotation data is unavailable, leave it out rather than fabricating it.

## Step 10 — Permissions

Use the existing `AuthContext.hasPermission()` approach established in Stage 2A.

Use only verified Opportunity permission strings.

Where appropriate:

- hide or disable Create Opportunity
- hide/disable other Opportunity mutations that actually exist
- retain server-side enforcement
- retain reactive 401/403 handling

## Step 11 — Error handling

Follow the Stage 2A standard.

Every real Opportunity fetch/mutation must distinguish:

- loading
- genuine empty/not-found state
- API error
- validation error
- permission error

Never turn an API failure into an empty state.

Never swallow backend messages.

Never show fake success.

## Step 12 — Mock isolation

Audit all existing Opportunity mock behavior.

Classify each item as:

- real backend supported
- backend-limited
- mock-only
- out of Stage 2B scope

Real mode must not silently fall back to mock Opportunity data.

Mock-only behavior may remain where appropriate, but must stay clearly separated using the existing repository architecture.

## Step 13 — Visual regression

Do a lightweight visual review of Opportunity screens.

Do not redesign.

Confirm:

- approved Version A styling remains intact
- no Lead Master regression
- no navigation regression
- no unexpected spacing/layout changes
- loading/error/empty states fit the existing design language

Do not attempt authenticated browser testing if valid credentials remain unavailable.

Do not reset, guess, brute-force, or create credentials.

## Validation

Before committing, run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

If `npm run build` corrupts the concurrently running Next dev cache, stop/restart the frontend dev server cleanly and verify it responds. Do not interpret `.next` churn as source changes.

Do not modify backend code or backend data during validation.

## Git

Stage 2B is one milestone and must produce exactly one implementation commit.

Suggested commit message:

```text
feat(revenueos): integrate opportunities
```

Before committing:

- confirm frontend working tree contains only intended Stage 2B changes
- confirm backend remains untouched
- confirm no credentials/database/seed changes
- confirm validation passes

After committing, report:

- commit hash
- working-tree status
- backend status
- files changed
- real backend capabilities integrated
- backend limitations
- remaining mock-only Opportunity behavior
- confirmation that Stage 2C was NOT started

## Stop condition

STOP after the Stage 2B implementation commit.

Do not begin Stage 2C, implement Quotations, perform unrelated cleanup, redesign Version A, or modify backend.

Wait for further instructions.
