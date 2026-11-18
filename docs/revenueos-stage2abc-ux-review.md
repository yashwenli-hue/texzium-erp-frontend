# RevenueOS — Stage 2A–2C UX Review (Audit Only)

## Purpose

Perform a **read-only UX review** of the completed Version A frontend work through Stage 2C.

Current implementation baseline:

- Stage 2A complete: `c9d639c`
- Stage 2B complete: `bbefc60`
- Stage 2C implementation: `ee5f909`
- Stage 2C mock-detail fix: `f1f1268`

The purpose is to evaluate the actual current frontend after real backend integration, not to redesign or implement anything.

The review must cover the connected workflow:

**Lead → Opportunity → Quotation**

This is an **AUDIT ONLY** task.

---

# 1. Hard constraints

### Read-only

Do NOT:

- modify frontend source files
- modify backend source
- modify database/schema/migrations
- modify seeds
- modify credentials/passwords
- modify configuration
- install dependencies
- create a Git commit
- reset/rebase/amend commits
- start Stage 2D or any later stage

You may run read-only inspection commands and existing validation commands if useful.

Do not "fix" anything discovered during the review.

### Backend remains strictly READ ONLY

The backend may be inspected only to understand the verified contract.

Do not change it.

### No automatic redesign

Do not redesign the UI during this audit.

Do not implement any UX recommendation.

The output is a review report only.

### Version A principle

Use the current Version A visual language as the baseline:

- light theme
- existing sidebar/topbar
- existing typography
- existing spacing system
- existing badges/status language
- existing responsive behavior
- existing navigation patterns

However, do NOT treat Version A as absolutely frozen.

The current project rule is:

> Preserve the Version A visual foundation, but allow purposeful UI/UX changes when the real backend workflow or truthful data behavior makes them necessary or materially improves the workflow.

Identify those cases rather than suppressing them.

Do NOT introduce Version B concepts.

Do NOT review dark mode.

---

# 2. Required reading

Read:

- `CLAUDE.md`
- `docs/backend-ui-contract.md`
- `docs/revenueos-stage2-plan.md`
- `docs/revenueos-stage2a-leads-opportunities.md`
- `docs/revenueos-stage2a-completion-audit.md`
- `docs/revenueos-stage2b-opportunities.md`
- `docs/revenueos-stage2c-quotations.md`

Review the current implementation at:

- `c9d639c`
- `bbefc60`
- `ee5f909`
- `f1f1268`

Do not assume older audit documents describe the current UI perfectly; inspect the current source.

---

# 3. Inspect the actual frontend

Work in:

`/root/texzium-erp/frontend`

Inspect the actual current implementation, including at minimum:

### Shared shell

- sidebar
- topbar
- page headers
- navigation
- global loading/error patterns
- responsive behavior where evident

### Stage 2A — Leads

Inspect:

- Lead Master/list
- Lead filters/search/date controls
- Lead detail
- Create Lead
- Edit Lead
- assignment UI
- qualification/rejection UI
- status UI
- follow-up UI
- timeline/history
- notes
- Lead → Opportunity entry point
- permission-gated actions
- loading/empty/error states

### Stage 2B — Opportunities

Inspect:

- Opportunity list
- Opportunity detail
- Create Opportunity
- Lead → Opportunity flow
- Opportunity pipeline/stage presentation
- backend `OPEN` status presentation
- local-only stage behavior, if still present
- Lead relationship
- expected value/probability/close date presentation
- quotation relationship area
- loading/empty/error states
- permission-gated actions

### Stage 2C — Quotations

Inspect:

- Quotation list
- Quotation detail
- Create Quotation
- Opportunity → Quotation flow
- DRAFT/REVISED/APPROVED/CONVERTED presentation
- Revise action
- Approve action
- Convert action
- quotation form fields
- inventory item selection
- seller GST selection
- buyer GST selection
- quantity/unit price
- backend-calculated totals/tax display
- mock-mode presentation
- revision history
- loading/empty/error states
- backend limitations communicated by the UI

### Cross-workflow

Trace the actual navigation and user journey:

**Lead → Opportunity → Quotation**

Look for:

- broken or awkward transitions
- duplicated information
- missing context
- confusing terminology
- inconsistent actions
- inconsistent status language
- unnecessary navigation
- places where the user loses the parent record context
- places where the UI implies persistence/capability the backend does not provide
- places where backend truth makes the original prototype UX misleading

---

# 4. UX review framework

For each meaningful finding, classify it as one of:

### KEEP

Current UX is appropriate. No change recommended.

### POLISH

Small, low-risk improvement that preserves the existing Version A structure.

Examples:

- clearer label
- better action grouping
- improved empty-state wording
- minor information hierarchy adjustment
- clearer backend-limited messaging

### CHANGE

The real backend workflow/data model makes the current UX materially confusing, misleading, or inefficient.

These findings may justify purposeful UI/UX changes.

### DEFER

A legitimate improvement, but not important enough to interrupt the current functional roadmap.

### VERSION B

A larger conceptual/design change that is better saved for the future independent Version B exploration.

Do NOT use numeric scores or rank findings.

---

# 5. Review dimensions

Evaluate each area against:

## A. Information hierarchy

- Is primary information immediately understandable?
- Are secondary details appropriately subordinate?
- Are important backend-derived fields visible?
- Is the page too dense or too sparse?
- Does the hierarchy fit the actual ERP workflow?

## B. Workflow clarity

- Is the next action obvious?
- Does the UI accurately communicate what the user can and cannot do?
- Are workflow transitions understandable?
- Does Lead → Opportunity → Quotation feel like one connected sales process?

## C. Forms

Review:

- field ordering
- labels
- required/optional clarity
- defaults
- validation messaging
- grouping
- backend-required fields
- action placement

Do not invent new fields.

## D. Statuses and actions

Verify that UI language matches backend truth.

Pay particular attention to:

- Lead lifecycle statuses
- Opportunity `OPEN`
- local-only Opportunity pipeline state
- Quotation DRAFT/REVISED/APPROVED/CONVERTED
- Revise
- Approve
- Convert

Do not recommend pretending unsupported backend transitions are persistent.

## E. Error/empty/loading UX

Check whether the user can distinguish:

- loading
- genuine empty result
- not found
- API failure
- validation failure
- 401
- 403
- backend-limited functionality

## F. Permission UX

Check:

- whether unavailable actions are appropriately hidden/disabled
- whether the UI gives enough context when an action is unavailable
- whether frontend permission checks are consistent

Remember backend permissions remain authoritative.

## G. Mock vs real mode

Check that:

- mock-only behavior is visibly/architecturally isolated
- real mode does not silently fall back to mock data
- mock UI does not pretend to contain backend-derived values it does not actually have
- terminology remains understandable in both modes

## H. Visual consistency

Check:

- spacing
- typography
- cards
- tables
- badges
- buttons
- dialogs
- page headers
- navigation
- responsive behavior

Do not mechanically recommend visual changes just for the sake of change.

---

# 6. Cross-stage workflow review

This section is especially important.

Evaluate whether the following feels coherent:

### Lead

A user identifies and works a lead.

↓

### Opportunity

The user converts/creates an opportunity from the lead and can understand its commercial context.

↓

### Quotation

The user creates a quotation from the opportunity and can clearly understand:

- what opportunity it belongs to
- what item is being quoted
- quantity/unit price
- seller/buyer GST context
- backend-calculated totals
- current quotation status
- available next action

↓

### Conversion boundary

Quotation conversion creates a backend Sales Order as a backend side effect, but Sales Order frontend functionality belongs to a later stage.

The UX review must check whether the current quotation UI communicates this boundary honestly without prematurely implementing Sales Order UX.

---

# 7. Important backend limitations to review explicitly

The review must consider these known limitations:

### Leads

- no arbitrary Lead Note create endpoint
- timeline/history is therefore limited to supported backend events
- `GET /users` is an existing backend security concern and is NOT to be fixed in this review

### Opportunities

- no verified `GET /opportunities/:id`
- no verified Opportunity status/stage mutation endpoint
- backend status is currently `OPEN`
- frontend pipeline/stage behavior must not imply server persistence
- quotation relationship is only shown where actual backend data supports it

### Quotations

- no verified quotation detail endpoint; detail is derived from the list where needed
- quotation routes currently lack verified auth/permission guards
- PATCH status exists but arbitrary status mutation must not be exposed
- Convert has backend side effects creating a Sales Order, but Sales Order UI is later-stage work
- quantity/unitPrice are accepted by the create DTO but are not persisted in the Prisma quotation model
- mock mode does not have real GST-rate data and must not fabricate GST output

Do not propose backend fixes as part of the UX implementation recommendations. If something is backend-limited, classify it accordingly.

---

# 8. Required output

Produce a concise but substantive report:

## Executive Summary

Summarize the overall UX state of the integrated Lead → Opportunity → Quotation workflow.

Do NOT give an overall numeric score, ranking, or winner.

## Stage 2A — Leads

Use:

| Area | Classification | Finding | Recommendation |
|---|---|---|---|

## Stage 2B — Opportunities

Same table.

## Stage 2C — Quotations

Same table.

## Cross-workflow — Lead → Opportunity → Quotation

Same table.

## Backend-driven UX findings

List findings where actual backend behavior should influence UI/UX.

For each:

- backend fact
- current UX implication
- recommended frontend treatment

Do not recommend backend changes.

## Version A vs Version B

Separate:

- changes worth making now in Version A
- ideas better saved for Version B

Do not redesign either one during this task.

## Recommended implementation scope

At the end, produce three buckets:

### Implement before Stage 2D

Only changes that are sufficiently important to improve the current integrated workflow.

### Defer until after more functional integration

Changes that may become clearer after Stages 2D/2E.

### Save for Version B

Larger design/product-direction changes.

Do not rank these within buckets.

## Explicit no-change list

Identify areas that were inspected and should remain unchanged.

This protects against unnecessary redesign.

---

# 9. Evidence standard

Every finding must be grounded in the actual current frontend implementation.

For each finding, provide:

- relevant route/page/component
- relevant behavior
- why it matters

Do not invent problems.

If a potential issue cannot be confirmed from the source, label it as an uncertainty rather than presenting it as a defect.

---

# 10. Validation

This is an audit, not an implementation.

Do NOT modify source.

You may run:

```bash
git status
git log --oneline -8
git diff
```

and read-only source inspection.

If you run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

report the results, but do not make code changes to make validation pass.

Do not reset credentials or attempt authenticated testing if valid credentials remain unavailable.

---

# 11. Git and backend

At the end confirm:

- current HEAD
- no source files modified
- no commit created
- backend HEAD unchanged
- backend working tree unchanged
- no database/credential/config changes
- Stage 2D and later stages NOT started

---

# 12. Final instruction

STOP after producing the UX review report.

Do not implement any recommendation.

Do not create a Git commit.

Wait for review of the findings before making changes.
