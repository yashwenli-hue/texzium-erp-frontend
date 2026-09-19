# RevenueOS Stage 1.3 Patch 05 — Lead Master Badge Visual Refinement

## Scope

This is a visual-only refinement of the Lead Master badges.

IMPORTANT:
- The current table spacing/layout is now approved. **Do not change the column widths, spacing, table layout, or horizontal scrolling behavior.**
- Only refine the visual treatment of Score and Status badges.
- Work ONLY in `/root/texzium-erp/frontend`.
- Backend is READ ONLY.
- Use `CLAUDE.md` and `docs/backend-ui-contract.md`.
- Do not invent backend fields, statuses, or APIs.
- Preserve all existing Lead Master functionality.

## 1. Keep the current Lead Master spacing exactly as-is

The current screenshot shows the Lead Master table spacing in a good state.

Do NOT:
- widen/narrow the Lead column
- move Source
- change column ordering
- change table width behavior
- change pagination
- change the date filter
- change sorting
- change the existing row spacing

Treat the current table layout as approved.

Only the badge colors/styles need refinement.

---

## 2. Redesign Score badges

The current Hot/Warm/Cold badges are visually too heavy and unattractive.

Do NOT use the current saturated solid-fill treatment.

The desired direction is a **clean, premium, subtle badge style**:
- light tinted background
- darker readable text
- small colored dot/indicator
- restrained border if useful
- compact pill shape
- no large saturated block of color

### Score colors

Keep these meanings:

- **Hot** → red/rose family
- **Warm** → amber/orange family
- **Cold** → blue family

But use **soft/tinted backgrounds with darker text**, rather than the current strong solid colors.

Example visual direction:

- Hot → very light rose/red background + dark red text/dot
- Warm → very light amber background + dark amber/brown text/dot
- Cold → very light blue background + dark blue text/dot

The three Score badges should feel like one coherent design system.

They should be visually distinguishable from Status and Follow-up, but should NOT dominate the table.

---

## 3. Redesign Status badges

The current Status badges also feel too strong and visually inconsistent.

Use a separate, softer lifecycle palette.

### Required meanings

- **Qualified → green**
- **New → blue**
- **Contacted → teal/cyan**
- **Rejected → purple/indigo**
- Other verified Lead statuses → appropriate distinct lifecycle colors

Use the same general badge construction:
- light tinted background
- darker text
- small colored dot
- restrained border if useful

Do not use large solid saturated fills.

### Important distinction

The user should be able to tell at a glance:

**Score**
- Hot
- Warm
- Cold

is one visual category,

while:

**Status**
- New
- Contacted
- Qualified
- Rejected
- etc.

is a separate visual category.

And:

**Follow-up**
- Overdue
- Due today
- Upcoming
- No follow-up

remains its own category.

Do not make all three categories use identical colors.

---

## 4. Visual quality target

The overall Lead Master should feel:
- clean
- modern
- professional
- restrained
- easy to scan
- consistent with the light RevenueOS interface

Avoid:
- neon-looking colors
- overly saturated pills
- large blocks of color
- too many competing strong colors
- excessive borders
- badges that attract more attention than the lead/company names

The badge should communicate meaning without becoming the main visual element of the row.

Keep the existing dot + label pattern where appropriate.

## 5. Preserve functionality

Do not change:
- Score values
- Status values
- Follow-up values
- filters
- date-range filter
- sorting
- pagination
- Lead Master spacing/layout
- backend data or APIs

## Validation

Run:
1. Typecheck
2. Lint
3. Production build

Browser verify:
- Score badges look lighter and more refined.
- Hot/Warm/Cold are clearly distinguishable.
- Status badges have a separate lifecycle palette.
- Qualified is green.
- New is blue.
- Contacted is teal/cyan.
- Rejected is purple/indigo.
- Follow-up badges remain distinct.
- Current approved table spacing is unchanged.
- Existing filters, sorting, date range, and pagination still work.

Confirm backend remains untouched.

Create ONE small frontend commit.

Suggested commit:

`fix(revenueos): refine lead badge visual system`

Then stop.
