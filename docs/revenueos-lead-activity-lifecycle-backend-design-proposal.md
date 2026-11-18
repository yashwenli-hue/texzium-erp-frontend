# RevenueOS — Lead Activity + Safe Lead Lifecycle: Backend Design Proposal

Status: **PROPOSAL ONLY — not implemented, not approved.** No backend or frontend files
have been changed. This document exists so the backend team (or whoever approves
backend changes) can review before any code is written.

This proposal exists because the audit in
[revenueos-lead-activity-lifecycle-brief.md](./revenueos-lead-activity-lifecycle-brief.md)
found the backend has **zero capability** for employee-authored Lead activity and
**zero capability** for any form of Lead removal/deactivation. Building either on the
frontend alone would mean fabricating data or fake persistence, which is explicitly
disallowed. This document specifies the backend work required to close both gaps
safely, following the backend's own existing conventions rather than inventing new
ones.

---

## 0. Re-verification pass (entire backend, not just RevenueOS)

Before designing anything, the full backend was re-audited a second time, specifically
looking for a differently-named implementation of this functionality:

- Every one of the ~95 Prisma models was enumerated (`grep '^model '` /
  `grep '^enum '` against the full `schema.prisma`). No `Comment`, `Activity`,
  `LeadActivity`, `History`, `Log` model exists anywhere except `LeadNote`,
  `LeadTimeline`, `AuditLog` (referenced nowhere in `src/`), `ConnectorLog`,
  `EmailLog`, `AuditLog` — none of which fit.
- Every controller in `src/modules/**` was checked for a `@Delete` decorator. There is
  exactly **one** in the entire backend: `adminos/document-number-series`. Its service
  does not delete a row — it sets `isActive: false`. This is the only real precedent
  for "removal" anywhere in this codebase.
- `isActive Boolean @default(true)` is used on 14 other models (`Customer`, `Vendor`,
  `Company`, `CompanyGSTRegistration`, `CustomerGSTRegistration`,
  `PaymentGatewayConfig`, `WhatsAppConfig`, `WhatsAppBotConfig`,
  `WhatsAppDepartmentRoute`, `DepartmentEmail`, `ChartOfAccount`, `Warehouse`, plus
  `DocumentNumberSeries`). No model anywhere uses `deletedAt` or a `DELETED`/`ARCHIVED`
  enum value. **The established backend lifecycle convention is a boolean soft-flag,
  not hard delete and not an enum state.**
- Confirmed no generic polymorphic note/activity system exists that Leads could hook
  into (checked `ServiceTicket`/`EngineerVisit`/`Project`/`AMC` — each domain that
  needs a work log defines its own dedicated model, e.g. `EngineerVisit` for service
  tickets). This backend's convention is one dedicated child table per domain, which
  is what's proposed below for Leads too.
- Confirmed how authorization actually resolves end-to-end: `AuthService.login()`
  joins `User → Role → RolePermission → Permission` and embeds
  `permissions: role.permissions.map(rp => rp.permission.code)` directly into the JWT;
  `JwtStrategy.validate()` passes it through unchanged; `PermissionsGuard` does a
  plain `.every(p => user.permissions.includes(p))`. There is **no SUPER_ADMIN
  bypass** — even the seeded superadmin only works if `RolePermission` rows exist for
  its role. `Permission` and `RolePermission` are ordinary CRUD tables managed via
  `POST /permissions` and `POST /role-permissions` (`adminos/permissions`,
  `adminos/role-permissions` — both currently unguarded, bootstrap-style endpoints),
  not seeded anywhere in `prisma/seeds/`. This means any new permission codes this
  proposal introduces must be created through those endpoints (or a follow-up seed
  script) and assigned to the relevant roles before anyone — including
  superadmin — can use the new endpoints.
- Confirmed actor-capture precedent: `lead-followups.controller.ts` is the only place
  in the whole backend that reads `req.user.id` and threads it into a service call
  (`completeFollowup(id, req.user.id)`), which is stored as `LeadFollowup.completedById
  → User`. This is the pattern to copy for who performed a Lead activity — never a
  client-supplied field.
- Confirmed there is no tracked migration for any Lead-related table — only 3
  migrations exist in `prisma/migrations/`, all recent and inventory-related. The
  Leads/RevenueOS schema predates tracked migration history (very likely provisioned
  via `prisma db push` against a live database rather than `prisma migrate`). This is
  a genuine operational risk for whoever implements this proposal (see §5) and is
  flagged, not solved, here.

Nothing in this pass changed the conclusions from the earlier audit. The gaps are real
and the backend genuinely needs new work to close them.

---

## 1. Schema design

### 1.1 New model: `LeadActivity`

A dedicated child table, following the same shape as `LeadFollowup` (own table,
FK to `Lead`, FK to the acting `User`) rather than reusing/overloading `LeadTimeline`
(which must stay 100% system-generated per the brief's explicit separation
requirement).

```prisma
enum LeadActivityType {
  CALL
  EMAIL
  MEETING
  WHATSAPP
  SITE_VISIT
  VIDEO_CALL
  FOLLOW_UP
  OTHER
}

model LeadActivity {
  id String @id @default(uuid())

  leadId String
  lead   Lead   @relation(fields: [leadId], references: [id])

  type LeadActivityType

  remarks    String   // what happened — required, this is the substance of the entry
  outcome    String?  // free text, e.g. "Connected — interested", "No answer"
  nextAction String?  // free text, mirrors EngineerVisit.nextAction naming

  occurredAt DateTime @default(now()) // when the interaction happened (may be logged after the fact)

  createdById String
  createdBy   User   @relation("LeadActivityCreatedBy", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([leadId])
  @@index([createdById])
}
```

Add the inverse relations:

```prisma
model Lead {
  // ...existing fields...
  activities LeadActivity[]   // new
}

model User {
  // ...existing fields...
  leadActivities LeadActivity[] @relation("LeadActivityCreatedBy")   // new
}
```

**Design choices and why:**
- `type` is a real enum (matches `LeadStatus`/`LeadFollowupStatus` convention),
  values taken directly from the brief's own list ("calls, emails, meetings, WhatsApp
  interactions, site visits, video calls, or follow-ups") plus `OTHER` as an escape
  hatch.
- `remarks` required, `outcome`/`nextAction` optional free text — mirrors
  `EngineerVisit.findings`/`EngineerVisit.nextAction`, the closest existing precedent
  in the whole schema for "what happened / what's next" on a logged interaction. No
  enum for outcome — nothing else in the schema enumerates call outcomes, and
  constraining it now would be guessing at a taxonomy nobody has specified.
- `createdById` is a **required** FK, not nullable and never client-writable — every
  activity must have a real author, matching the brief's explicit requirement for a
  "real backend-supported author/employee." The controller derives it from
  `req.user.id`, exactly like `lead-followups.controller.ts` does today.
- `occurredAt` defaults to now but is overridable at create time, so a rep who forgot
  to log this morning's call can backdate it — same reasoning as
  `EngineerVisit.visitDate` and `LeadFollowup.followupDate` being explicit fields
  rather than relying on `createdAt`.
- No `update`/`delete` capability in this proposal (see §2.1) — kept out of MVP scope
  deliberately; flagged as an open question, not silently omitted.

### 1.2 Lead lifecycle: add `isActive`

```prisma
model Lead {
  // ...existing fields...
  isActive Boolean @default(true)   // new
}
```

**Design choice and why:** this reuses the exact convention already used by 14 other
models and the one real `@Delete` precedent in the codebase
(`document-number-series`). No hard delete is proposed (see §4 for why), and no new
`LeadStatus` enum value is proposed either — `isActive` is deliberately a separate
axis from `status`. A `REJECTED` lead is a real, closed-out business outcome that
should stay fully visible; `isActive: false` is for "this record itself shouldn't
exist as an active record" (duplicate entry, mistaken creation) — the two concepts
must not be conflated. A lead can be `REJECTED` and still `isActive: true` (normal
case), or `isActive: false` regardless of its `status` (duplicate cleanup).

### 1.3 What is deliberately NOT changed

- `LeadNote` — out of scope for this proposal. The brief's Audit C confirmed Notes
  should stay conceptually separate from Activities, and the user's current ask is
  Activity + lifecycle only. Notes still has no create endpoint; that's a separate,
  smaller follow-up if wanted later (a `POST /lead-notes` mirroring `LeadActivity`'s
  actor-capture pattern would be a natural companion, but is not part of this
  proposal).
- `LeadTimeline` — unchanged in shape. Two new system actions are appended to it by
  the lifecycle endpoints in §2.2 (`LEAD_DEACTIVATED`, `LEAD_REACTIVATED`), following
  the exact pattern every other lifecycle action already uses
  (`STATUS_UPDATED`, `LEAD_QUALIFIED`, etc.) — no schema change needed for this, it's
  additive `action` string values.
- `Opportunity`, `Quotation`, `SalesOrder`, etc. — untouched. No cascade behavior
  changes because hard delete is not being proposed (§4).

---

## 2. Endpoints

### 2.1 Lead Activities — new module `lead-activities` (mirrors `lead-followups`)

```
POST   /lead-activities
GET    /lead-activities/:leadId
```

**`POST /lead-activities`** — `CreateLeadActivityDto`:
```ts
class CreateLeadActivityDto {
  @IsUUID() leadId: string;
  @IsEnum(LeadActivityType) type: LeadActivityType;
  @IsString() remarks: string;
  @IsOptional() @IsString() outcome?: string;
  @IsOptional() @IsString() nextAction?: string;
  @IsOptional() @IsDateString() occurredAt?: string; // defaults to now() if omitted
}
```
Server-side, `createdById` is set from `req.user.id` — **the DTO must not accept it
from the client.** Response: the created `LeadActivity` row (optionally with
`createdBy` selected down to `{ id, employeeCode, fullName, email }`, matching the
`completedBy` selection pattern already used in `lead-followups.service.ts`).

**`GET /lead-activities/:leadId`** — same shape as
`LeadFollowupsService.findByLead()`: 404 if the lead doesn't exist, otherwise all
activities for that lead ordered `occurredAt: 'desc'`.

No update or delete endpoint in this proposal. Rationale: the brief's own scope is
"record and later see the work," not "edit history after the fact" — and allowing
edits to a work log raises its own integrity questions (should an edited activity
still show original timestamps? is that itself worth its own audit trail?) that are
better decided deliberately later rather than bundled into this milestone. If edit/
delete turns out to be needed, it's a small additive follow-up, not a redesign.

Also add `activities` to the existing `GET /leads/:id` include, exactly like
`notes`/`timelines`/`followups` are already included in `leads.service.ts:findOne()`:
```ts
include: {
  source: true, assignedTo: true, notes: true,
  timelines: { orderBy: { createdAt: 'desc' } },
  followups: { orderBy: { followupDate: 'asc' } },
  activities: { orderBy: { occurredAt: 'desc' } },  // new
  opportunities: true,
}
```

### 2.2 Lead lifecycle — extend the existing `leads` controller

```
PATCH  /leads/:id/deactivate
PATCH  /leads/:id/reactivate
```

Chosen over hard `DELETE /leads/:id` — see §4 for the full reasoning. Chosen to live
in `leads.controller.ts` rather than a new module, because — unlike assign/qualify/
reject, which are genuine multi-field business workflows — this is a single boolean
flip on the Lead resource itself, same shape as the existing `update()` action already
in that controller. (If the team prefers strict parity with how assign/qualify/reject
each got their own module, splitting this into a `lead-lifecycle` module is a
reasonable alternative — flagged as an open choice, not a strong opinion.)

**`PATCH /leads/:id/deactivate`** — no body required. Service:
```ts
async deactivate(id: string) {
  const lead = await this.prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundException('Lead not found.');
  if (!lead.isActive) throw new BadRequestException('Lead is already deactivated.');

  const updated = await this.prisma.lead.update({
    where: { id },
    data: { isActive: false },
  });

  await this.prisma.leadTimeline.create({
    data: { leadId: id, action: 'LEAD_DEACTIVATED', remarks: 'Lead deactivated.' },
  });

  return updated;
}
```

**`PATCH /leads/:id/reactivate`** — symmetric, `isActive: true`,
`action: 'LEAD_REACTIVATED'`, 400 if already active.

Both endpoints write a `LeadTimeline` row, consistent with every other lifecycle
action in the codebase — this is exactly the "Stage & Status History" audit trail the
brief wants, and it comes for free from the existing pattern.

No request body is strictly required, but consider accepting an optional
`{ reason?: string }` (used as the timeline `remarks` instead of the generic string)
so a "why was this deactivated" note survives in the existing timeline, mirroring how
`reject` already takes a `reason`.

### 2.3 `GET /leads` behavior change

`LeadsService.findAll()` should default to `where: { isActive: true }`, matching how a
soft-deleted/deactivated record normally behaves elsewhere in ERPs — deactivated
leads shouldn't clutter the working list. Add an explicit opt-in for anyone who needs
to see them (reporting, undo flows):

```ts
async findAll(includeInactive = false) {
  return this.prisma.lead.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { source: true, assignedTo: true, followups: true, opportunities: true },
    orderBy: { createdAt: 'desc' },
  });
}
```
wired to `GET /leads?includeInactive=true`.

**`GET /leads/:id` should NOT filter by `isActive`** — a direct link/bookmark to a
deactivated lead should still resolve (frontend then shows a clear "Deactivated"
state), not silently 404. This mirrors how `REJECTED` leads remain fully viewable
today.

---

## 3. Authorization

New permission codes (created via the existing `POST /permissions` +
`POST /role-permissions` endpoints — see §0, no schema change required for this part):

| Code | Module | Gates |
|---|---|---|
| `leads.activities.create` | `REVENUEOS` | `POST /lead-activities` |
| `leads.activities.view` | `REVENUEOS` | `GET /lead-activities/:leadId` (also gates the activities panel showing on Lead Detail) |
| `leads.deactivate` | `REVENUEOS` | `PATCH /leads/:id/deactivate` and `PATCH /leads/:id/reactivate` |

Naming follows the existing `leads.followups.create`/`leads.followups.view` and
`leads.assign`/`leads.qualify`/`leads.reject` pairs exactly. A single
`leads.deactivate` permission is proposed to gate both directions of the toggle
(deactivate and reactivate are the same sensitivity level — someone who can hide a
lead should be able to unhide it); split into two if the team wants finer control.

Both new controllers use the same guard stack every other Leads controller already
uses:
```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
```

`lead-activities.controller.ts` needs `req` injected to read `req.user.id` for
`createdById`, exactly like `lead-followups.controller.ts` already does for
`completedById` — copy that pattern directly, do not accept an actor id from the
client under any circumstance.

**Operational step, not code**: after this ships, whoever manages roles needs to
create these 3 `Permission` rows and assign them to the appropriate roles (at minimum
whatever role currently holds `leads.followups.create`/`leads.edit`) via the existing
AdminOS endpoints, or the new endpoints will 403 for everyone, including superadmin,
per the "no wildcard bypass" finding in §0.

---

## 4. Relationships and why hard delete is not proposed

Every one of `Opportunity.leadId`, `LeadNote.leadId`, `LeadTimeline.leadId`,
`LeadFollowup.leadId`, and (once added) `LeadActivity.leadId` is a **required**
foreign key. No relation anywhere in the schema declares an explicit `onDelete`
action, and `relationMode` is unset (defaults to native Postgres foreign keys). Prisma
generates `ON DELETE RESTRICT` for required relations without an explicit action —
meaning a real `DELETE FROM "Lead"` would already fail at the database level for any
lead with even one `LEAD_CREATED` timeline row, i.e. **every lead that has ever gone
through `create()`**, since that itself writes a `LeadTimeline` row. Hard delete is
therefore not just risky, it's close to universally impossible without also cascading
through Opportunity → Quotation → ProformaInvoice/SalesOrder → SalesInvoice, which is
real financial data and must never silently disappear.

This proposal deliberately does not implement `DELETE /leads/:id` at all, and
recommends the team not add one. `isActive: false` (§1.2, §2.2) achieves the actual
business need described in the brief — "an accidental duplicate can be safely
removed" — without deleting anything, without touching any downstream relation, and
without needing any cascade logic at all. It is trivially reversible
(`reactivate`), which a real delete never would be.

If a true hard-delete is wanted later for leads with **zero** downstream records
(no opportunities, no activities beyond the auto `LEAD_CREATED` entry, no notes, no
followups), that would need an explicit pre-delete guard service that checks all four
relations and 400s if any exist — a meaningfully bigger and riskier piece of work than
this proposal, and not something recommended as part of this milestone.

**Downstream relationship risk summary if this proposal is implemented as written:**
none. `isActive: false` changes zero other rows. `Opportunity`/`Quotation`/etc. keep
functioning exactly as today whether their parent Lead is active or not — nothing
in this proposal reads `Lead.isActive` from any other module's queries.

---

## 5. Migration impact

Two additive schema changes, both fully backward-compatible:

1. `ALTER TABLE "Lead" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;` — every
   existing row gets `true` automatically; no data migration needed; no existing query
   breaks (nothing currently filters on it).
2. `CREATE TYPE "LeadActivityType" AS ENUM (...)` and `CREATE TABLE "LeadActivity"
   (...)` with FKs to `Lead` and `User` — a brand new table, zero impact on any
   existing table or query.

Should be authored as a single `prisma migrate dev --name
add_lead_activity_and_lead_lifecycle` migration, consistent with the 3 migrations
already tracked in `prisma/migrations/`.

**Genuine operational risk, flagged per §0**: since no Lead-related table has a
tracked migration (they predate the current migration history, most likely created
via `prisma db push`), running `prisma migrate dev` for the first time against this
schema risks Prisma detecting "drift" between the live database and the migration
history baseline, which can prompt a reset in dev or fail in a way that needs a
baselining step (`prisma migrate resolve --applied`) before this migration can be
generated cleanly. This should be dry-run against a staging copy of the real database
before running anywhere near production data — it is not a normal "just add a
column" migration in terms of tooling risk, even though the SQL itself is trivial and
safe.

`LeadsService.findAll()`'s new default filter (§2.3) is a **behavior change**, not
just an additive one — existing frontend code calling `GET /leads` will stop seeing
deactivated leads once any exist. Not a breaking schema/contract change (the response
shape is identical), but worth calling out explicitly since it changes what data a
previously-working query returns.

---

## 6. Frontend contract (for when this is approved and built)

This section specifies the contract precisely so a future implementation session
doesn't have to guess. Nothing here is implemented.

### New response shapes

```ts
// GET /lead-activities/:leadId, and embedded as `activities` on GET /leads/:id
interface BackendLeadActivity {
  id: string;
  leadId: string;
  type: "CALL" | "EMAIL" | "MEETING" | "WHATSAPP" | "SITE_VISIT" | "VIDEO_CALL" | "FOLLOW_UP" | "OTHER";
  remarks: string;
  outcome?: string | null;
  nextAction?: string | null;
  occurredAt: string;   // ISO 8601
  createdById: string;
  createdBy?: { id: string; fullName?: string; email?: string } | null;
  createdAt: string;
  updatedAt: string;
}
```

```ts
// POST /lead-activities request body
interface CreateLeadActivityInput {
  leadId: string;
  type: BackendLeadActivity["type"];
  remarks: string;
  outcome?: string;
  nextAction?: string;
  occurredAt?: string; // omit to default to now() server-side
}
// createdById is NEVER sent by the client — the backend derives it from the auth token.
```

```ts
// Lead now additionally carries:
interface BackendLead {
  // ...existing fields (unchanged)...
  isActive: boolean;               // new
  activities?: BackendLeadActivity[]; // new
}
```

### New endpoints to wire into `RealLeadRepository`/a new `ILeadActivityRepository`

- `getActivities(leadId): Promise<LeadActivityEntry[]>` → `GET /lead-activities/:leadId`
- `createActivity(input): Promise<LeadActivityEntry>` → `POST /lead-activities`
- `deactivate(id): Promise<Lead>` → `PATCH /leads/:id/deactivate`
- `reactivate(id): Promise<Lead>` → `PATCH /leads/:id/reactivate`

This replaces the current `appendTimelineEntry()` stub in `realLeadRepository.ts`,
which today unconditionally throws — once this backend work lands, that method should
be removed/replaced rather than kept as dead code, and the "Log Activity" gating
(`!isReal` in `app/leads/[id]/page.tsx`) can be removed for the real repository.

### Frontend domain type changes anticipated (not made now)

- `lib/types/domain.ts`: new `LeadActivity`/`LeadActivityEntry` type, new
  `LeadActivityType` union, `Lead.isActive: boolean` (real field, not
  `uiContext`-style mock-only), `Lead.activities?: LeadActivityEntry[]`.
- `lib/repository/real/mappers.ts`: `mapLeadActivity()` following the exact pattern
  of `mapLeadFollowup()`/`mapLeadTimeline()`.
- `lib/repository/interfaces.ts`: extend `ILeadRepository` with `deactivate`/
  `reactivate`, and either extend it further or add a sibling
  `ILeadActivityRepository` for the activities CRUD — `ILeadFollowupRepository`
  already sets the precedent for a sibling interface rather than overloading
  `ILeadRepository`.
- Permission gating on the frontend (`hasPermission("leads.activities.create")`,
  `hasPermission("leads.deactivate")`) mirroring how `leads.assign`/`leads.qualify`/
  `leads.reject` are already checked in `app/leads/[id]/page.tsx`.
- The "Activity & History" panel would then genuinely split into two, as the original
  brief asked: a "Activity & Remarks" panel from `lead.activities` (employee work,
  with real author), and the existing timeline panel renamed to make clear it's
  system/status history only (`lead.timelines`, unchanged).

None of this is implemented. This section exists so that once the backend proposal
above is approved and built, the frontend milestone from
[revenueos-lead-activity-lifecycle-brief.md](./revenueos-lead-activity-lifecycle-brief.md)
can actually be completed for real, instead of staying gated behind `!isReal`.

---

## 7. Open questions for the backend/product owner

1. Should `LeadActivity` support edit/delete at all, or is append-only correct for an
   audit-flavored work log? (Proposal above: no, ship append-only first.)
2. Should `leads.deactivate` be one permission or split into
   `leads.deactivate`/`leads.reactivate`?
3. Should `PATCH /leads/:id/deactivate` require a reason, like `reject` does? (Proposal
   above: optional.)
4. Is a true hard-delete-when-zero-downstream-records ever wanted, or is soft
   deactivate sufficient indefinitely? (Proposal above: skip it; revisit only if a
   real need shows up.)
5. Who owns creating/assigning the 3 new `Permission` rows post-merge, given there's no
   seed script for permissions in this codebase today?
