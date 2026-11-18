# RevenueOS — Lead Activity & Record Lifecycle Milestone

## Purpose

Close two Lead workflow gaps without redesigning Version A:

1. Employees need an obvious, persistent way to record and later see the work they performed on a Lead, even when the Lead's status/stage does not change.
2. Users need a safe way to deal with duplicate or mistakenly created Leads, subject to the real backend lifecycle contract.

This is a focused workflow-completeness milestone, not a visual redesign.

## Business distinction

Keep **human work/activity** clearly separate from **system stage/status history**.

### Activity / Remarks

These describe work performed by an employee against a Lead, such as calls, emails, meetings, WhatsApp interactions, site visits, video calls, or follow-ups.

Each activity should make its remarks/update obvious, with the real backend-supported author/employee and timestamp where available.

The existing product/design direction distinguishes:

- **Activity remarks:** tied to a specific interaction and describe what happened.
- **Notes:** general customer/party context that remains useful across activities.

Do NOT merge general Notes and activity remarks into one undifferentiated history.

### Stage / Status history

This is system/business-state history such as stage changes, status changes, or assignment changes.

Do not present this as though it were an employee work log.

The Lead detail experience should answer both:

> What is the current state of this Lead?

and:

> What has actually happened/worked on this Lead so far?

## Phase 1 — Audit the real contract first

The older RevenueOS backlog describes:

- `leads` with a `Remarks` field and CRUD APIs including `DELETE /leads/{id}`.
- Activity Management using `lead_activities`.
- Activity fields including Activity Date, Activity Type, Remarks, Outcome, and Next Action.
- Activity APIs: `POST /activities`, `GET /activities`.
- Activity Timeline and Activity History screens.

The current frontend audit also identified that Activities and Lead Timeline may currently be separate collections and that this relationship must be verified against the real API.

The current design documentation says Notes and activity remarks should remain separate.

Treat the **actual current backend implementation** as authoritative over older planning documents. Do not assume an endpoint exists merely because an older document lists it.

### Audit A — Lead remarks

Verify:

- Does the current Lead API persist `remarks`?
- Can existing Lead remarks be retrieved on Lead detail?
- Is the Lead-level `remarks` field a general/current Lead remark, or is it actually an activity log?
- Do not repurpose it into a timeline unless the backend contract supports that meaning.

### Audit B — Activities

Identify the real current Activity endpoints/models/repositories.

Verify:

- activity ↔ Lead relationship
- activity type
- remarks
- outcome
- next action
- activity/occurred date
- author/employee/assigned user
- created timestamp
- update support
- delete support
- filtering by Lead
- pagination
- authentication/authorization

Determine whether a Lead Activity Timeline can be built entirely from existing backend data.

### Audit C — Notes

Verify the current Notes model/API and Lead relationship.

Confirm that general Notes remain distinct from activity remarks.

### Audit D — Stage/status history

Determine whether the backend exposes actual Lead stage/status history or audit events.

If it does not, do NOT fabricate historical events on the frontend.

### Audit E — Lead deletion/removal

Audit the actual Lead lifecycle:

- Is `DELETE /leads/{id}` implemented?
- Is it authorized?
- What happens to related Activities, Notes, Opportunities, quotations, etc.?
- Are there foreign-key/business-rule constraints?
- Is hard deletion appropriate?
- Does the backend instead support archive/deactivate/close?
- What does the API return on attempted deletion?
- Are there safeguards for Leads already used downstream?

Do not invent an archive mechanism if the backend does not support one.

## Phase 2 — Implement only what the real contract supports

### Lead Detail — Activity & Remarks

Make employee work updates obvious on Lead detail.

Preferred structure:

**Activity & Remarks**
- prominent section heading
- obvious existing/new Add Activity action
- chronological activity entries
- activity type
- date/time
- employee/author when available
- remarks/update text
- outcome/next action when supported

Example presentation:

> **18 Sep, 3:40 PM · Rahul · Call**  
> Spoke with customer. They confirmed the requirement and are waiting for procurement approval.

Do not fabricate data. If the API does not provide author/timestamp/etc., show only what is genuinely available.

### Separate Notes

Keep general Notes visually and conceptually separate.

Example:

**Notes**

> Customer prefers email communication and normally responds after procurement review.

Do not make a general Note look like an activity.

### Stage / Status History

If a real backend history endpoint exists, expose it separately:

**Stage & Status History**

If no real history endpoint exists, do not create fake history from current state snapshots.

## Lead removal workflow

If the backend supports safe deletion:

- Add the action in the existing Lead Actions area.
- Use clear destructive styling.
- Require explicit confirmation.
- Explain permanence if it really is permanent.
- Refresh/remove the record after successful deletion.
- Surface backend errors clearly.
- Do not silently swallow failures.

If the backend supports archive/deactivation instead:

- use that backend-supported lifecycle operation.
- label it accurately.
- preserve history.

If neither is supported:

- do NOT create a fake frontend-only delete/archive.
- Report the backend gap and stop that part of the milestone.

## Duplicate Lead considerations

Do not implement automatic merge/deduplication in this milestone.

The immediate requirement is that an accidental duplicate can be safely removed/archived when the backend supports it.

If deletion of a Lead with downstream relationships is unsafe, enforce the backend's actual rule and communicate the reason to the user.

## UX constraints

Preserve Version A.

Allowed:

- adding the missing Activity/Remarks section
- making existing activity actions more discoverable
- adding a Lead action for backend-supported removal/archive
- small spacing, hierarchy, or visibility adjustments required by the workflow

Not allowed:

- wholesale Lead detail redesign
- new visual theme
- new navigation architecture
- invented backend data
- frontend-only persistence that pretends to be real ERP history

Activity remarks must be visually obvious enough that a user can distinguish them from stage/status changes at a glance.

## Technical constraints

- Frontend repo: `/root/texzium-erp/frontend`
- Backend repo: `/root/texzium-erp/backend`
- Current frontend theme checkpoint: `4214f5e`
- Preserve existing Version A light/dark behavior.
- Backend is the source of truth.
- Do not touch `create-superadmin.ts`.
- Do not modify unrelated modules.
- Do not start Phase 2 backend remediation as part of this milestone.
- One focused milestone, one commit.
- No Co-Authored-By.

## Validation

Before committing:

1. TypeScript passes.
2. Lint passes.
3. Production build passes.
4. Verify Lead detail with no activities, one activity, and multiple activities.
5. Verify activities can be visible even when status/stage does not change.
6. Verify multiple employees if real data supports it.
7. Verify long remarks.
8. Verify Notes remain separate.
9. Verify stage/status history is not fabricated.
10. Verify deletion/archive against an appropriate disposable/test Lead only if the backend operation is actually supported.
11. Verify failed destructive operations are handled correctly.
12. Verify both Light and Dark themes.
13. Confirm no unrelated files changed.

## Commit

Use one focused commit only after validation.

Suggested message:

`feat(revenueos): complete lead activity and lifecycle workflow`

Before committing, report:

- what the backend actually supports
- what was implemented
- any backend gaps left intentionally untouched
- validation results
- exact files changed

Then commit only the intended changes and report the commit hash plus clean working-tree status.
