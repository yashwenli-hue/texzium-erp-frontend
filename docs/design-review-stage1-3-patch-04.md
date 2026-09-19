# RevenueOS Stage 1.3 Patch 04 — Lead Master Final Visual Polish

## Scope

Very small Lead Master visual refinement only.

Work ONLY in `/root/texzium-erp/frontend`.

Backend is READ ONLY. Use `CLAUDE.md` and `docs/backend-ui-contract.md` as governing rules.

Do not invent backend endpoints or fields. Do not reopen unrelated Stage 1.3 work.

## 1. Rebalance Lead Master column widths

The current Lead Master still has too much empty horizontal space between the **Lead** and **Source** columns.

At the same time, the right-most column is being pushed off-screen and requires horizontal scrolling.

### Required outcome

Rebalance the table columns so the available desktop width is used more evenly.

Specifically:

- Reduce the unnecessary width/gap allocated to the Lead column.
- Keep enough room for the lead/customer name plus company/location underneath.
- Move Source closer to Lead.
- Redistribute the recovered width across the remaining columns as appropriate.
- Give the right-most `Last Activity` column enough usable space so it is visible at the normal desktop viewport without unnecessary horizontal scrolling.
- Keep Product/Interest, Score, Status, Follow-up, and Assigned To readable.
- Do not solve this by shrinking text or making the table visually cramped.

The goal is a balanced table where:

- Lead is comfortably readable.
- Source follows naturally.
- Columns are evenly distributed.
- The normal desktop viewport can show the complete table, including Last Activity, without requiring horizontal scrolling.

Use responsive table sizing/min-widths carefully. At genuinely narrow viewport sizes, horizontal scrolling is acceptable.

### Reference

Use the latest provided Lead Master screenshots as the visual reference. The desired result is a clean, evenly distributed table rather than a large blank gap between Lead and Source with Last Activity pushed off-screen.

## 2. Score badge colors — deeper/high-contrast treatment

Change the Lead Score badges so they use a **deeper, more saturated color treatment**, similar in visual strength to the current `Rejected` Status badge.

Desired direction:

- **Hot** → deep/saturated red
- **Warm** → deep/saturated amber/orange
- **Cold** → deep/saturated blue

The Score badges should no longer look like very pale pastel badges.

Keep them clearly distinguishable from Status and Follow-up, while giving Score a stronger visual weight.

Keep text contrast accessible.

Do not change the underlying Score values or data model.

## 3. Status color scheme — Qualified should be green

Adjust the Lead Status color scheme so lifecycle/status meaning is clearer.

At minimum:

- **Qualified → GREEN**
- **Rejected → deep purple/indigo**
- **New → BLUE**
- **Contacted → distinct status color that does not conflict with Score**

Other verified Lead statuses should receive coherent status-specific colors.

The important visual distinction is:

- **Score** = deeper/saturated Hot/Warm/Cold colors
- **Status** = its own lifecycle palette
- **Follow-up** = its own urgency palette

Do not invent new Lead statuses.

Keep status text visible and accessible; do not rely only on color.

## 4. Preserve existing functionality

Do not regress any existing Lead Master functionality, including:

- Search
- Status/source/source-type filters
- Follow-up filter
- City filter
- Assignment filter
- Received date-range filter
- Received date sorting
- Last Activity sorting
- Pagination
- Existing lead/company/location information

Do not remove columns just to make the table fit.

## Validation

Run:

1. Typecheck
2. Lint
3. Production build

Browser verify:

- Lead → Source spacing is reduced.
- Table columns are balanced.
- Last Activity is visible at normal desktop width without unnecessary horizontal scrolling.
- Lead identity remains readable.
- Hot/Warm/Cold Score badges use deeper saturated colors.
- Cold remains blue.
- Qualified is green.
- Rejected remains a clearly distinct deep status color.
- New remains blue.
- Status, Score, and Follow-up remain visually distinguishable.
- Existing filters, date range, sorting, and pagination still work.

Confirm backend remains untouched.

Create ONE small frontend commit.

Suggested commit:

`fix(revenueos): finalize lead master visual hierarchy`

Then stop.
