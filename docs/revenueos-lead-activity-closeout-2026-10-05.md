# RevenueOS — Lead Activity milestone close-out

**Closed:** 2026-10-05
**Status:** Complete and verified, with one stated limitation (browser verification, §4).
**Relation to the baseline:** `revenueos-current-state-baseline-2026-09-23.md` describes the committed state at frontend `c869393` / backend `94faa56`. This milestone supersedes parts of it; see §7 for the sections that need a dated addendum. The baseline itself has not been edited.

## 1. What was delivered

Employees can record calls, meetings, emails, WhatsApp, requirements and notes on a lead without changing its status, and the history shows who did what, when. System lifecycle events and employee activity are kept distinct on one timeline.

- Single employee write path: `POST /leads/:id/activities` (`leads.edit`). Actor comes from the authenticated user only; action code is server-assigned (`ACTIVITY_<TYPE>`); remarks trimmed, max 2000; `occurredAt` may be back-dated, never future.
- `LeadTimeline` extended (additive): `source` (SYSTEM|EMPLOYEE, default SYSTEM), `activityType`, `actorId`, `occurredAt`.
- Deterministic history order on `GET /leads/:id` and `GET /opportunities/:id` (occurredAt, createdAt, id). Actor exposed as `{id, fullName}` only.
- Follow-ups stay in `LeadFollowup`. `LeadNote` stays for webhook-imported text and is read-only in the UI.
- Frontend: Log Activity form (connected and mock), one chronological history with System/Employee labelling, shared by Lead detail and Opportunity detail. The Edit Lead remarks workaround was removed.

## 2. Commits (branch `revenueos-remediation` in each repo; not merged)

| Repo | Commit | Message |
|---|---|---|
| backend | `e163b42` | fix(backend): fix TypeScript build root include |
| backend | `7944e46` | feat(revenueos): add opportunity detail endpoint |
| backend | `66343c6` | feat(revenueos): complete attributed lead activity history |
| backend | `8921600` | fix(backend): make incremental builds reliable |
| frontend | `f8ce0e5` | feat(revenueos): add opportunity detail endpoint |
| frontend | `aefedbd` | feat(revenueos): complete attributed lead activity history |

Rollback points: backend `94faa56`, frontend `c869393` (pre-milestone); `7944e46` / `f8ce0e5` (before the activity commit).

## 3. Database

`prisma/manual-migrations/20261005_crm_lead_timeline_attributed_activity.sql` was verified on a scratch database cloned from the live schema (forward, rollback, re-apply, double-apply, FK behaviour, deleted author), then applied to the real development database `texzium_erp` on 2026-10-05 with explicit approval. All 32 historical rows were preserved as `SYSTEM`, `occurredAt = createdAt`. The `Call / Test activity from Pre-Sales` row was deliberately left unclassified. The migration is not recorded in `_prisma_migrations` (manual-migration convention); `prisma migrate status` still reports up to date.

## 4. Verification, and what was NOT verified

Verified:
- Migration on scratch (all structure/data checks) and on the real database (structure, historical rows, no unrelated schema changes).
- Backend: typecheck, Jest 26/26, integration 42/42 on a migrated scratch database (actor attribution, impersonation and forged-system-action rejection, validation, permissions, ordering, historical rows, deleted author), and 34/34 write-rejecting checks on the real database with a Prisma write-blocker.
- Frontend: typecheck, lint, build; 34/34 mapper/repository/validation/render checks; 28/28 checks feeding the real API payloads for the real lead and opportunity through the real repositories, mappers and the `LeadHistoryTimeline` component, including a second fetch to represent a refresh.
- The two existing employee activities on lead `4b76382e-8fd1-4754-bc39-01ee27ef4fa8` ("Test Check for the Remarks and History Timeline"): WhatsApp (2026-10-05 16:03:01.919 UTC) and Meeting (16:07:25.919 UTC), both attributed to "Texzium ERP Super Admin", lead status `SALES_ASSIGNED` unchanged.

**Browser verification limitation.** The final check was not performed in a browser against a running connected stack. The browser tool drives the user's Windows machine, so `localhost` there cannot reach servers started on this Linux host; nothing was running; and a connected login needs credentials that were not available (and must not be guessed or forged). Instead, the real stored records were read through the real backend code and database with writes blocked, and the resulting payloads were run through the real frontend data layer and the real timeline component. This does **not** cover: visual styling, the Next.js page wiring and hooks in a real browser, or the login/session path.

Related observation (not a verification by the assistant): the two employee activities above exist with a real actor and correct type, created between sessions by someone using the connected stack. That indicates the connected write path worked, but it was not witnessed.

To close the gap, either open the lead and its opportunity in the connected app and look at Activity & History / Pre-Sales History, or provide a tunnel from the Windows machine to a server started here and log in personally in that tab (read-only navigation only).

## 5. Known remaining items (carried forward, none introduced here)

- `GET /leads/:id` (and other lead endpoints, and `GET /users`) still return the assignee's full user record including `passwordHash`. Opportunity detail does not.
- `opportunities.view` alone can read a lead's notes, timelines and follow-ups via opportunity detail.
- Activity logging reuses `leads.edit`. The permission codes `leads.notes.create` and `leads.timeline.view` already exist as data in the dev database (held by SUPER_ADMIN only) but no code uses them; wiring a dedicated permission is an open decision, not a data gap.
- Activity entries cannot be edited or deleted. System events (assign/qualify/reject) still record no actor. Entries from before attribution have no author.
- The create-lead form's Remarks field is still dropped in connected mode.
- Test rows in the dev database: the `Call` row (SYSTEM) and an older `LeadNote` "TEST — Pre-Sales remark persistence".
- Deferred by decision: 17 of 22 RevenueOS controllers unguarded (SEC-1), Next.js upgrade, Marketing/Telecalling providers, payment gateway, e-invoice/e-way bill, HRMS integration.
- Repo hygiene, untouched: untracked `create-superadmin.*`, untracked `integration-hub.queue.ts` / `.worker.ts`, untracked `docs/`, `lib/types/domain.ts.save*`, modified `tsconfig.tsbuildinfo`; pre-existing schema drift (`InventoryBalance` index, `LeadFollowup` indexes/default).
- Build: with the fix in `8921600`, `nest build` is a full emit every time (no incremental reuse).
- Branches `revenueos-remediation` are unmerged.

## 6. Working agreements observed

One logical milestone per commit; stop and wait for review; backend changes only on explicit instruction; schema changes verified on a scratch database before any approved apply to the real database; no Co-Authored-By lines or AI authorship in commit messages.

## 7. Baseline addendum required (not yet written)

Dated addendum for: §A and Appendix 1 (drift is now committed work); §B and §C (CRMOS and OpportunityOS rows); §E (frontend backend-blocked list); §F (BUG-1 resolved; opportunity detail and lead note/timeline write gaps closed; passwordHash still open); §H (answers 2, 4, 5, 6, 7 changed); §I (opportunity `getById` no longer scans the list); §K (rows 1–4 and 8).
