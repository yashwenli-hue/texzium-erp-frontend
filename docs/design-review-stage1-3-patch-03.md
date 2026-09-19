# RevenueOS Stage 1.3.3 — Lead Master Final Micro-Polish

## Scope

Two very small Lead Master UI fixes only.

Work ONLY in `/root/texzium-erp/frontend`.

Backend is READ ONLY. Use `CLAUDE.md` and `docs/backend-ui-contract.md`. Do not invent backend endpoints or fields.

Do not reopen or redesign unrelated Stage 1.3 work.

## 1. Reduce unnecessary gap between Lead and Source

The current Lead Master table has too much horizontal whitespace between the **Lead** column and the **Source** column.

The Lead identity still needs enough room for:
- Main lead/customer name
- Company/business name
- City/location

However, the current Lead column is wider than necessary and creates a large empty gap before Source.

### Required outcome

Tighten the Lead column so the table fits more naturally within the normal desktop viewport **before horizontal scrolling is required**.

Use sensible table sizing:
- Keep enough width for readable lead names.
- Keep company + city/location readable.
- Reduce excess minimum width/padding on the Lead column.
- Let Source move closer to Lead.
- Keep the remaining columns usable.
- Do not make the Lead identity cramped again.

Prefer adjusting the column sizing/layout rather than reducing font sizes.

If the complete table cannot fit at smaller viewport widths, normal horizontal scrolling is still acceptable. The goal is specifically to eliminate the unnecessary large gap at the normal desktop width shown in the screenshot.

## 2. Make Lead Status badges visually distinct from the other badge groups

The current Status badges are using a color family that makes them too visually similar to Score and Follow-up.

Give **Status** its own clearly distinguishable color family so the user can immediately tell:

- Score = one visual system
- Status = a different visual system
- Follow-up = another visual system

### Requirements

- Keep the actual verified backend Lead statuses unchanged.
- Do not invent new statuses.
- Change only the visual treatment.
- Use a consistent status palette across Lead Master and Lead Detail.
- Status should remain readable and accessible.
- Do not rely on color alone; retain the status text.
- Make the Status badges visually distinct from Hot/Warm/Cold score badges and Overdue/Due/Upcoming follow-up badges.

For example, a blue/indigo family can be used for status if that fits the existing RevenueOS theme, while preserving the existing score and follow-up colors.

Do not make every status the same color if the current design already distinguishes lifecycle states; use a coherent status-specific palette.

## Validation

Run:
1. Typecheck
2. Lint
3. Production build

Browser verify:
- Lead column no longer has an excessive gap before Source.
- Lead name/company/city remains readable.
- Normal desktop viewport does not unnecessarily require horizontal scrolling.
- Status badges are clearly distinguishable from Score and Follow-up.
- Lead Detail status badges remain consistent.

Confirm backend remains untouched.

Create ONE small frontend commit.

Suggested commit:

`fix(revenueos): refine lead master spacing and status colors`

Then stop.
