# RevenueOS Version A — Dark Mode A/B Visual Experiment

## Objective

Create **two controlled dark-mode variants** of the existing RevenueOS Version A frontend so we can compare them on the real product before selecting the final Version A dark theme.

This is a **frontend-only visual experiment**.

The two variants must use the **same existing Version A layout, components, spacing, typography, information architecture, workflows, and data behavior**.

Only the dark-theme visual treatment should differ.

### Core principle

**Do not redesign RevenueOS. Theme RevenueOS.**

The result must remain:

**clean + easy to scan + premium + modern + enterprise**

Usability and readability take priority over visual effects.

---

# 1. References

Two supplied images are the visual references.

### Reference 1 — Primary: Nexora ERP

Use the supplied **Nexora ERP dark dashboard image** as the primary visual reference for Variant 1.

It provides the desired direction for:

- deep navy / blue-black foundation;
- dark layered surfaces;
- restrained purple accent;
- subtle gradients;
- dark sidebar/topbar;
- polished enterprise/CRM feel;
- clear KPI cards;
- subtle borders;
- bright primary text;
- muted secondary text;
- clean chart presentation.

### Reference 2 — Secondary: NAQIX ERP

Use the supplied **NAQIX ERP dark dashboard image** as the secondary visual reference for Variant 2.

It provides additional inspiration for:

- stronger semantic color differentiation;
- colorful KPI accents;
- cyan/blue/green/amber financial and operational indicators;
- dark surfaces;
- strong visual hierarchy;
- dashboard readability.

### Important

Do not copy either reference's:

- layout;
- navigation;
- wording;
- metrics;
- charts;
- branding;
- exact colors;
- exact gradients;
- component arrangement.

The existing RevenueOS Version A implementation remains the source of truth for structure.

---

# 2. Variant 1 — Restrained Navy Purple

Variant 1 should be based primarily on the Nexora reference.

Target character:

- deep navy / blue-black foundation;
- dark elevated surfaces;
- restrained borders;
- purple as the dominant brand/accent color;
- subtle purple highlights;
- minimal gradients;
- semantic colors used sparingly;
- strong white/light primary text;
- cool muted secondary text;
- calm, premium, clean appearance.

Purple should be used for:

- active navigation;
- primary actions;
- selected states;
- important interactive states;
- key highlights;
- appropriate charts/focus states.

Do not make every element purple.

Avoid:

- neon;
- excessive glow;
- excessive gradients;
- colorful cards everywhere;
- decorative effects that compete with content.

Variant 1 should feel like a **restrained premium enterprise application**.

---

# 3. Variant 2 — Navy + Semantic Color

Variant 2 should start from Variant 1's foundation and introduce the additional color hierarchy suggested by the NAQIX reference.

Keep:

- the same deep navy/blue-black foundation;
- the same dark surfaces;
- the same Version A layout;
- the same spacing and typography;
- purple as the primary brand/interaction accent.

Add restrained semantic color differentiation:

- purple = primary/brand;
- cyan/blue = informational;
- green = positive/success;
- amber/orange = financial/warning/attention;
- red = genuine negative/error conditions.

Use stronger color accents particularly where they improve KPI and data scanning.

Do NOT turn the UI into a wall of brightly colored cards.

The semantic colors must remain restrained and purposeful.

Variant 2 should feel **more expressive than Variant 1 while remaining clean and easy to scan**.

---

# 4. A/B Experiment Rules

The comparison must be meaningful.

Both variants must keep identical:

- page layouts;
- component hierarchy;
- spacing;
- typography;
- navigation;
- tables;
- forms;
- workflows;
- data;
- repository behavior;
- API behavior;
- permissions;
- mock/real behavior.

Only visual theme tokens/treatment should differ.

Do not use the A/B experiment as an opportunity to redesign any page.

---

# 5. Implementation Architecture

Before coding:

1. Inspect the existing theme/color/token architecture.
2. Identify existing CSS variables/tokens.
3. Identify hardcoded colors.
4. Determine the cleanest way to support two theme variants without introducing unnecessary complexity.

Prefer the existing CSS/custom-property architecture.

Do not introduce Tailwind or a large UI framework solely for this experiment.

A practical implementation may use:

- shared base dark tokens;
- Variant 1 token set;
- Variant 2 token set;
- a simple theme/variant selector or route/build mechanism suitable for comparison.

Keep the implementation lightweight.

The final selected variant can later become the official Version A dark theme.

---

# 6. Known Hardcoded Color Areas

The previous audit identified hardcoded colors in at least:

- `components/ui/SourceBadge.tsx`
- `components/ui/Tag.tsx`
- `components/ui/Funnel.tsx`

Inspect these and other hardcoded background, foreground, border, shadow, and accent colors.

Convert theme-dependent values to appropriate tokens.

Preserve intentionally semantic colors where they carry business meaning.

---

# 7. Surfaces to Verify

Verify both variants across:

### Application shell
- sidebar;
- topbar;
- breadcrumbs;
- user/profile menu;
- global search;
- active/hover/focus navigation.

### Dashboard
- KPI/stat cards;
- charts;
- funnel;
- opportunity pipeline;
- Today's Focus;
- revenue/collections panels;
- disclosure labels.

### Leads / Opportunities
- Lead Master;
- Lead detail;
- Lead Pipeline;
- Opportunity list/detail;
- opportunity pipeline/stepper.

### Quote-to-Cash
- Quotations;
- Quotation detail/forms;
- Proforma Invoices;
- Proforma detail/forms;
- Sales Orders;
- Sales Order detail;
- Sales Invoices;
- Sales Invoice detail;
- Payments/Collections.

### Customers / GST
- Customer list/detail;
- GST panels/selectors;
- inactive GST warnings;
- disabled GST options.

### Supporting surfaces
- Notifications;
- Search;
- Reports;
- Contacts;
- Tasks;
- Notes;
- Activities;
- empty/loading/error states;
- dialogs/modals;
- pagination;
- filters;
- tables;
- badges/tags;
- form controls.

---

# 8. Interaction States

Both variants must correctly support:

- hover;
- focus;
- active;
- selected;
- disabled;
- loading;
- error;
- success;
- warning;
- empty;
- expanded/collapsed;
- pagination;
- table row hover;
- input focus;
- dropdown/select open;
- modal overlays.

Pay particular attention to muted and disabled text so it remains intentionally visible.

---

# 9. Tables

RevenueOS is table-heavy.

Both variants must preserve:

- readable table headers;
- readable rows;
- clear hierarchy;
- subtle separators;
- useful hover states;
- readable badges;
- clear selected/filtered states;
- distinction between table surface and page background.

Do not change table density or spacing.

---

# 10. Charts

Both variants must keep charts readable in dark mode.

Check:

- axes;
- grid lines;
- legends;
- labels;
- tooltips;
- funnel labels;
- line/bar/area visibility;
- semantic colors.

Do not change chart data or analytics logic.

---

# 11. Forms / Native Controls

Check:

- inputs;
- textareas;
- selects;
- date controls;
- buttons;
- dropdowns;
- validation;
- helper text;
- placeholders;
- disabled controls;
- native control appearance.

No light-mode controls should remain visually disconnected from the dark theme.

---

# 12. Cleanliness / Usability Rule

This is a primary acceptance criterion.

If a visual effect makes the UI:

- harder to scan;
- harder to read;
- visually noisy;
- too colorful;
- too neon;
- too decorative;
- less enterprise/professional;

remove or reduce it.

When choosing between:

**more visually impressive**

and

**simpler and clearer**

choose **simpler and clearer**.

The references are inspiration, not instructions to add effects.

---

# 13. Version A Preservation

Do NOT:

- redesign the dashboard;
- rearrange cards;
- change navigation;
- change table spacing;
- change typography;
- introduce glassmorphism;
- introduce excessive gradients;
- add decorative neon effects;
- change workflows;
- add new business interactions;
- change repository/API behavior;
- change analytics;
- replace components wholesale.

The result must remain unmistakably **RevenueOS Version A**.

---

# 14. Backend Safety

This experiment is frontend-only.

Do not:

- modify backend files;
- change backend contracts;
- change database schema;
- change API behavior;
- change permissions;
- change business logic.

Do not modify, execute, inspect, or change:

`create-superadmin.ts`

---

# 15. Git Strategy

Implement Variant 1 first.

Create exactly one commit:

`feat(revenueos): add Version A dark mode variant 1`

Then create Variant 2 from the same baseline/Variant 1 implementation and create exactly one commit:

`feat(revenueos): add Version A dark mode variant 2`

No `Co-Authored-By` trailer.

Do not mix unrelated cleanup into either commit.

If separate branches are practical, use:

- `dark-mode/variant-1-navy-purple`
- `dark-mode/variant-2-navy-semantic`

Keep the commits easy to compare and easy to discard.

Do not merge either variant into the final production/default theme yet.

---

# 16. Validation

For each variant run:

- TypeScript;
- lint;
- production build;
- existing relevant tests/checks;
- route compilation checks if available.

Review both variants for:

- contrast;
- readability;
- hardcoded light colors;
- inconsistent surfaces;
- borders;
- disabled states;
- focus states;
- chart readability;
- semantic color clarity;
- purple overuse;
- visual noise.

If browser testing is available, inspect representative Version A pages in both variants.

If browser testing is unavailable, clearly state that limitation and do not claim browser validation.

---

# 17. Final Report

After Variant 1, report:

- commit hash;
- files changed;
- theme architecture;
- validation results;
- browser/runtime testing status;
- known issues.

Then implement Variant 2 and report the same.

Finally provide a neutral A/B comparison describing:

- visual character;
- readability;
- information hierarchy;
- semantic color usage;
- where each variant differs;
- any implementation tradeoffs.

Do **not** automatically select a winner.

Stop after both variants are committed.

Do not proceed to Phase 2 backend work.
