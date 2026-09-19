# RevenueOS Stage 1.2 — Design Refinement Brief

## Governing rules

- Work ONLY in `/root/texzium-erp/frontend`.
- RevenueOS frontend only.
- Backend is READ ONLY. Do not modify backend files, Prisma schema, backend APIs, DTOs, migrations, or backend Git state.
- Use `CLAUDE.md` and `docs/backend-ui-contract.md` as the governing project rules.
- Backend behavior/contracts are authoritative. Do not invent backend endpoints.
- Prototype/mock behavior may be changed or extended on the frontend when backend support does not exist.
- Preserve all working RevenueOS functionality unless this brief explicitly changes it.
- Commit the completed milestone to the frontend Git repository.
- Stop after implementation + validation + commit.

## Objective

Refine the current RevenueOS frontend based on the latest design review. This is a frontend UX/UI refinement pass; do not start Quote-to-Cash work unless it is already required for an item below.

## 1. Lead Master — identity information

Update the Lead Master table/list so each lead clearly shows:

- Customer/lead name as the primary identity.
- Company/business name underneath.
- Location/city underneath or alongside the company information, following the existing visual language.

Keep the hierarchy visually clear and compact. Do not invent backend fields. If company/location values are mock-only, keep them explicitly frontend/mock data.

## 2. Lead Master — source platform branding

Show the actual representative platform logo/icon next to the lead source where appropriate, for example:

- Google
- Meta
- IndiaMART
- TradeIndia
- Other existing source platforms

Use local/static assets or lightweight existing icon facilities where possible. Do not introduce a large dependency just for logos.

Each source must remain understandable without relying on color alone; include accessible labels/tooltips where useful.

## 2.1 Lead Master — Score + Status/Stage

Add two visible columns/fields:

### Score
Use the existing frontend/mock scoring concept:

- HOT
- WARM
- COLD

Color-code these consistently.

If Score is not supported by the backend, it MUST remain frontend/mock-only. Do not add or change a backend field.

### Status / Stage
Show the real Lead lifecycle status supported by the backend/UI contract.

Color-code statuses consistently.

Do not invent `Won`/`Lost` lead statuses if they are not part of the verified Lead lifecycle.

## 3. Dashboard — pipeline drag persistence

Fix the current Opportunity pipeline behavior so moving an Opportunity card to another status/stage persists across:

- Dashboard refresh
- Navigation away and back
- Returning to the Opportunities view during the same frontend session

Use frontend/mock persistence if there is no verified backend endpoint for this behavior.

Important:

- Do NOT invent a backend status-update endpoint.
- Do NOT modify the backend.
- Dashboard and Opportunities should read from the same frontend state/source so the change is consistent.
- Prefer the simplest reliable persistence mechanism already compatible with the project (for example existing state/store/localStorage patterns).

## 3.1 Dashboard — remove Recent Leads

Remove the `Recent Leads` dashboard section.

Rebalance the dashboard layout so the removal does not leave an awkward empty area.

## 3.2 Dashboard — Lead Source Breakdown

Replace the current Lead Source Breakdown visualization with a donut/ring chart.

Requirements:

- Total lead count displayed in the center.
- Legend showing each source.
- Legend should show percentage and count.
- Preserve the existing source data; this is a visualization change.
- Keep it responsive and readable.

Use an existing chart library if the project already has one. Do not add a heavy dependency unnecessarily.

## 3.3 Dashboard — Today’s Focus

Rename:

`What Needs Your Attention`

to:

`Today’s Focus`

Add a `View all` action/link where appropriate.

The items should visually communicate:

- Time
- Activity/type icon
- Activity title
- Customer/company
- Arrow/action affordance

Keep the section compact and actionable.

## 4. Remove Search from sidebar

Remove the dedicated `Search` item from the sidebar navigation.

The global search bar in the topbar remains the primary search entry point.

Do not remove or break the topbar search.

## 5. Light sidebar

Change the sidebar from the current dark/black treatment to a light sidebar that belongs to the same visual theme as the rest of the RevenueOS application.

Requirements:

- Maintain existing navigation hierarchy.
- Maintain active-state clarity.
- Preserve collapse/expand behavior.
- Preserve tooltips when collapsed.
- Preserve responsive/mobile behavior.
- Ensure text/icon contrast remains accessible.

Do not redesign the entire application theme; this is specifically a sidebar treatment change.

## 6. Logged-in user/profile menu

Make the logged-in user/profile area at the bottom of the sidebar clickable.

On click, show an account/profile menu containing appropriate frontend actions such as:

- View Profile
- Account / Settings
- Sign Out

If real backend functionality does not exist for an action, make it an explicit frontend placeholder/mock interaction rather than inventing an API.

The menu should:

- Open reliably from the sidebar user area.
- Close on outside click / escape where consistent with existing UI patterns.
- Work with the collapsed sidebar state.
- Work responsively.

## Visual consistency

Reuse the existing RevenueOS design system, components, spacing, typography, buttons, dropdowns, cards, tables, and interaction patterns wherever practical.

Avoid unnecessary rewrites.

## Validation

Before finishing:

1. Run TypeScript/typecheck.
2. Run lint.
3. Run production build.
4. Verify the main affected screens in the browser:
   - Dashboard
   - Leads / Lead Master
   - Lead detail if affected
   - Opportunities
   - Sidebar/profile interaction
5. Confirm the frontend Git working tree is clean after the milestone commit.
6. Confirm no backend files were modified.

## Git

Create one meaningful frontend milestone commit after the complete Stage 1.2 implementation and validation.

Suggested commit message:

`feat(revenueos): refine lead master and dashboard ux`

Then stop.
