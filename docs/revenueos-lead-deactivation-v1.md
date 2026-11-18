# RevenueOS — Lead Deactivate / Reactivate V1

## Product definition

> Deactivation is the safe way to remove an erroneous, duplicate, junk, test, or otherwise invalid Lead from active sales without deleting its historical record. It is not a substitute for correcting valid Lead information.

| Situation | What to do |
|---|---|
| Duplicate, erroneous, test, junk or otherwise invalid lead | **Deactivate** |
| Real lead with incorrect details | **Edit** the lead and correct it |
| Lead that is real but not a fit | **Reject** (it stays in the pipeline as rejected) |

Deactivation is never presented as a replacement for editing valid lead data. Nothing is deleted: the lead, its notes, activities, follow-ups and history stay on record, and it can be reactivated.

## Rules (enforced by the backend, commit `9e938da`)

- A lead with **any opportunity** cannot be deactivated.
- A lead with **any pending follow-up** cannot be deactivated. Follow-ups are never cancelled or changed automatically.
- A reason is required (trimmed, up to 500 characters).
- A deactivated lead takes no normal sales writes: edit, log activity, assign, qualify, reject, status change, create follow-up, create opportunity. These return a 409 ("This lead is deactivated. Reactivate it to make changes.").
- Reactivation only restores the lead to active. It does not reopen opportunities or touch follow-ups, and it clears who/when/why. The permanent record is the timeline.
- Both actions need the single permission `leads.deactivate` (SUPER_ADMIN initially; users must sign in again after it is granted).
- Each action writes `LEAD_DEACTIVATED` / `LEAD_REACTIVATED` to the lead timeline as a **system** event with the person as actor ("by <name>"). They are not employee activities.
- Normal lead lists hide deactivated leads; `GET /leads?includeInactive=true` includes them.

## UI behaviour (frontend commit)

- **Lead detail:** a Deactivate action (needs `leads.deactivate`) opens a dialog that explains what deactivation is for, points to Edit for incorrect details, says nothing is deleted, and requires a reason. If the lead has opportunities or pending follow-ups, the dialog says so plainly and the action is unavailable; if the backend refuses anyway, its message is shown.
- A deactivated lead shows a banner with who deactivated it, when, and why, plus Reactivate. Edit, Log Activity, Schedule follow-up, Assign, Qualify, Reject and Convert are unavailable until it is reactivated.
- **Lead list:** deactivated leads are hidden by default. "Show deactivated" brings them in, marked with a Deactivated tag.
- **History:** the two lifecycle events appear on the lead and opportunity history as system events, "by <name>".
- Dashboard, pipeline, global search, sidebar counts and the opportunity/note lead pickers use the normal list, so they leave deactivated leads out.
- Mock mode follows the same rules and wording, and includes one deactivated demo lead.

## Applying it (not yet done)

Neither SQL file has been applied to the real development database. In order:

1. `prisma/manual-migrations/20261005_crm_lead_soft_deactivation.sql`
2. `prisma/manual-migrations/20261005_crm_lead_deactivate_permission.sql`
3. `npx prisma generate` in the backend, then build.

## Verification and limits

Verified on a scratch database (backend) and against the real frontend modules with stubbed network (frontend). No connected browser flow for deactivation has been run: the migration is not applied, and the browser cannot reach the host (see the Lead Activity close-out for that limitation).

Known limits: the Reactivate action and the Deactivate dialog's blocker hint use the opportunity and follow-up data the page already loads; the backend remains the authority. The BusinessIntelligenceOS `kpi-intelligence` report still counts inactive leads. `GET /leads/:id` still returns the assignee's password hash (unrelated, pre-existing).
