# RevenueOS Stage 2C UX Polish — Opportunity Stage Persistence + Pipeline Permission Clarity

## Context

Stage 2A–2C functional integration is complete through commit `f1f1268`.

A read-only cross-stage UX audit found two small, purposeful UX gaps worth fixing before Stage 2D:

1. The Opportunity stage stepper visually suggests persisted workflow progress even though stage changes are local-only in the frontend and the backend Opportunity status remains `OPEN`.
2. The Opportunity Pipeline can become non-draggable when the existing permission check denies stage/status changes, but the disabled state does not explain why.

This is a **tiny UX-polish milestone**, not a redesign.

## Goal

Make those two states explicit while preserving the approved Version A visual language and all existing backend/mock behavior.

### Required change 1 — Opportunity stage stepper

Add a small, persistent visual marker directly on or immediately adjacent to the existing Opportunity stage stepper communicating that the displayed stage progress is **not saved to the backend**.

Acceptable wording examples:

- `Not saved to backend`
- `Local progress`
- `Local only`

Choose the wording that fits the existing Version A UI best.

Requirements:

- Keep the existing stepper structure and interaction unchanged.
- Do not redesign the stepper.
- Do not change localStorage behavior.
- Do not add or invent a backend stage/status mutation.
- Do not imply that the backend Opportunity status has changed.
- The marker should be visible whenever the stepper is showing the local-only stage state in the real Opportunity workflow.
- Keep the treatment subtle and consistent with existing Version A badges/notes/panels.

### Required change 2 — Opportunity Pipeline permission clarity

When the existing Opportunity Pipeline drag/stage-change interaction is disabled because the current permission check does not allow the operation, make that state explainable to the user.

Requirements:

- Preserve the existing permission check and permission string(s). **Do not invent a new permission.**
- Inspect the current code and use whatever verified permission logic is already responsible for enabling/disabling Pipeline stage changes.
- Keep the existing disabled behavior.
- Add a concise accessible explanation such as:
  `You don't have permission to update opportunity stages.`
- Prefer an accessible existing UI mechanism already used elsewhere in Version A (for example, an explanatory tooltip or inline helper text) rather than relying only on a browser `title` attribute.
- Make the disabled/non-draggable state visually understandable without changing the Pipeline layout.
- Do not redesign the Pipeline.
- Do not change authorization behavior.

## Explicitly out of scope

Do **not** change:

- Lead Master layout, spacing, or table behavior
- Lead Detail structure
- Lead forms
- Follow-up structure
- Opportunity list/detail structure beyond the two requested UX clarifications
- Quotation list/detail/form structure
- Quotation status badges
- Quotation conversion behavior
- DocumentTrail
- loading/error/empty patterns
- mock/real repository architecture
- auth/session behavior
- backend code
- backend permissions
- Stage 2D Proforma work
- Stage 2E Sales Orders work
- any broad shared permission-component refactor
- any Version B redesign work

## Important backend constraint

Backend is **strictly read-only** for this milestone.

Do not modify files under `/root/texzium-erp/backend`.

The frontend must continue to represent the backend truth honestly:
- Opportunity stage progress is local-only.
- Backend Opportunity status remains whatever the existing API returns (currently `OPEN`).
- Do not fake persistence.

## Implementation guidance

Before editing:

1. Inspect the current Opportunity stage stepper implementation.
2. Inspect the Opportunity Pipeline permission/drag logic.
3. Reuse existing Version A UI primitives and patterns.
4. Reuse existing permission checks exactly as implemented.
5. Keep the diff minimal and focused.

Avoid introducing a new abstraction unless the existing code makes the two changes impossible without one.

## Validation

Run:

- TypeScript check
- ESLint
- Production build

Also perform focused verification for:

1. Opportunity detail still renders correctly in real mode.
2. The local-only stage marker is visible and does not claim backend persistence.
3. Pipeline drag/stage update remains disabled when permission is unavailable.
4. The disabled Pipeline state visibly/ accessibly explains why.
5. Existing enabled Pipeline behavior is unchanged.
6. No quotation behavior regresses.
7. No backend files changed.

Inspect `git diff` and `git status` before committing.

## Commit

Create exactly one commit for this milestone:

`fix(revenueos): clarify opportunity stage persistence`

Do not combine this with Stage 2D or any unrelated cleanup.

## Final report

Report:

- files changed
- exact UX changes made
- validation results
- commit hash
- confirmation that backend remained untouched
- any limitation or follow-up that remains
