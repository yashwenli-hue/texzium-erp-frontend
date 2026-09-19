# RevenueOS Stage 1.3.2 — Lead Master Quick Polish

## Scope

This is a small final Lead Master polish pass before moving to the next stage.

Work ONLY in `/root/texzium-erp/frontend`.

Backend is READ ONLY. Use `CLAUDE.md` and `docs/backend-ui-contract.md` as governing rules. Do not invent backend endpoints or fields.

Do not redesign unrelated RevenueOS screens or revisit completed Stage 1.3 work.

---

## 1. Lead Master — fix cramped lead identity / table spacing

The current Lead Master table has the lead/customer identity column too narrow.

In the current layout, names such as:
- Sterling Pumps
- GreenVolt Energy
- JSW Steel

are wrapping/cramming unnecessarily because the identity column does not have enough horizontal space.

### Required outcome

Make the Lead Master table feel clean, spacious, and easy to scan.

Adjust column widths/order as appropriate.

Priorities:
1. Give the Lead identity column enough width for a readable company/customer name.
2. Keep company/business name and city/location underneath the main name.
3. Prevent awkward word-by-word wrapping where practical.
4. Keep Source, Received, Product/Interest, Score, Status, Follow-up, Assigned To, and Last Activity usable.
5. Preserve horizontal responsiveness; if the table needs horizontal scrolling at narrower widths, that is preferable to severely cramped columns.
6. Do not remove useful information merely to force everything into the viewport.

The screenshot should be treated as the visual reference: the table should look deliberate and balanced rather than having the Lead column squeezed between the sidebar and the other columns.

Use sensible minimum widths and table layout behavior. Avoid hard-coded widths that break other screen sizes.

---

## 2. Lead Master — date-range filter

Add a filter that allows the user to select a **date range from a calendar** and see leads within that date range.

### Preferred behavior

Add a compact filter control alongside the existing Lead Master filters, for example:

`Received date`

Clicking it opens a calendar/date-range picker where the user can choose:
- Start date
- End date

The selected range should then filter the Lead Master list.

Examples:
- 1 Sep 2026 → 10 Sep 2026
- Today
- This week
- This month

Quick presets are optional; the important requirement is custom start/end date selection.

### Which date to filter

The current Lead Master already displays a `Received` date column.

Use the actual existing/supported `Received` date field for this filter if that is the field currently powering the table.

Do NOT invent a new backend date field.

If the current data source uses another verified date field internally, use that same field consistently for:
- the Received column
- sorting
- date-range filtering

### Interaction requirements

- Date range should be easy to see after selection.
- User should be able to clear/reset the date filter.
- Existing filters must continue working together with the date range.
- Date filtering should combine with search, status, source, follow-up, city, assignment, etc.
- Do not replace the existing filters.
- Keep the filter area compact; the new date filter should not make the filter row excessively wide.

### Backend constraint

Do not create a backend endpoint just for this.

If the Lead Master is currently operating on the existing frontend/mock dataset, implement the date filtering in the same frontend filtering layer.

If the existing backend query already supports a date field/filter, use only the verified contract. Do not invent query parameters.

---

## 3. Validation

Run:
1. Typecheck
2. Lint
3. Production build

Browser verify:
- Lead names have comfortable spacing.
- Company/location hierarchy remains readable.
- Table remains usable at the normal desktop width.
- Date range picker opens correctly.
- Selecting a date range filters the visible leads.
- Clearing the date range restores the full list.
- Date range works together with the existing filters.
- Existing Lead Master sorting still works.

Confirm backend remains untouched.

Create ONE small frontend commit.

Suggested commit:

`fix(revenueos): polish lead master layout and date filter`

Then stop.
