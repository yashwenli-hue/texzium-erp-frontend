# RevenueOS Stage 2I — Dashboard & Analytics

## Objective

Implement Stage 2I of RevenueOS: Dashboard & Analytics.

This is the final functional frontend milestone before the broader Version A Completion Audit.

Backend must remain strictly read-only during this stage.

The objective is to replace misleading/mock dashboard signals with truthful real data where the backend supports it, bring Quote-to-Cash visibility into the dashboard, integrate authoritative AR/collections metrics, and preserve clear boundaries where backend analytics are incomplete or misleading.

Do not repair backend defects in this stage. Backend gaps will be addressed separately after all functional frontend stages are complete.

---

# 1. Backend truth already verified

Backend HEAD at investigation:

`94faa5676f7a6ff4cb356860fa44ceb80fe4b460`

All investigation requests were GET-only. No backend mutation occurred.

## Live RevenueOS reporting endpoints

Verified live:

- `GET /sales-reports/funnel`
- `GET /sales-reports/revenue-summary`
- `GET /sales-reports/customer-revenue`
- `GET /sales-reports/lead-conversion`
- `GET /sales-reports/quotation-conversion`
- `GET /sales-reports/lost-opportunities`
- `GET /sales-reports/salesperson-performance`
- product/HSN/category reporting endpoints

FinanceOS collection analytics:

- `GET /collections-dashboard/summary`
- `GET /collections-dashboard/aging`
- `GET /collections-dashboard/high-risk`
- `GET /collections-dashboard/recovery-rate`
- `GET /collections-dashboard/customer-ranking`
- `GET /collections-dashboard/efficiency`

Cross-module endpoints also exist:

- `GET /executive-dashboard`
- `GET /kpi-intelligence`
- `GET /forecasting-engine`

Do NOT treat the cross-module executive/KPI endpoints as the primary RevenueOS dashboard source because they mix unrelated modules and have known data-quality/runtime problems.

## Important analytics limitations

Do not surface the following as authoritative analytics without explicitly changing their meaning or excluding them:

### Opportunity Won Value / Opportunity Pipeline

Opportunity stage is frontend/localStorage-only.

The backend Opportunity `status` remains OPEN and has no stage mutation endpoint.

Therefore:

- Opportunity Pipeline Kanban stage is not backend-persisted.
- Won Value currently depends on browser-local stage state.
- Do not present local Opportunity stage totals as authoritative backend analytics.

### Today's Focus

Current dashboard task/follow-up prioritization is mock/seed data.

There is no real Task backend supporting this dashboard concept.

Keep it mocked if retained, but make the boundary clear.

### Quotation conversion

`GET /sales-reports/quotation-conversion` currently produces a naive total-count ratio and returned `200%` in the investigation.

Do not present it as a true cohort conversion rate.

### Lost opportunities

The endpoint currently returns an empty list because Opportunity status does not transition through a backend workflow.

Do not imply that zero means there were no lost opportunities in the business.

### Salesperson performance

The endpoint is effectively identical to customer revenue and there is no SalesInvoice salesperson/owner field.

Do not present it as salesperson performance.

### Customer ranking

`collections-dashboard/customer-ranking` sums running CustomerLedger balance values and produced misleading results.

Do NOT surface this endpoint as-is.

### Forecasting

`forecasting-engine` uses hardcoded growth multipliers rather than a genuine predictive model.

Do NOT present it as predictive forecasting.

### Cross-module dashboards

`executive-dashboard` and `kpi-intelligence` combine unrelated modules and should not become the primary RevenueOS dashboard source.

`kpi-intelligence.inventoryUtilization` was observed returning `NaN%`.

Do not surface this broken metric.

---

# 2. Current dashboard defects to fix

The current dashboard has:

- real Lead metrics;
- real-derived Lead qualification/source/funnel data;
- local-only Opportunity stage/won values;
- mock Today's Focus;
- an Opportunity Kanban based on localStorage;
- stale mock-store sidebar badge counts for Quotations and Customers.

The Quotation and Customer sidebar badge counts must be corrected because those entities are now real-backed.

Do not read `db.quotations` or `db.customers` directly in connected mode.

Use the established repository/hooks architecture.

---

# 3. Required Stage 2I implementation

## A. Preserve truthful existing Lead analytics

Keep the useful existing real/derived Lead dashboard elements:

- Open Leads
- Qualification Rate
- Leads by Source
- Lead Qualification Funnel

Continue deriving these from real Lead data where already implemented.

Do not unnecessarily redesign these components.

## B. Replace misleading Opportunity dashboard metrics

The dashboard must no longer present localStorage-only Opportunity stage state as backend truth.

At minimum:

- remove or clearly relabel `Won Value`;
- remove or clearly relabel any Opportunity Pipeline value roll-up that depends on local stage;
- make it obvious that Opportunity stage changes are not persisted to the backend.

If the existing Opportunity Pipeline Kanban is retained in this stage, it must carry the same honest local-only treatment already established elsewhere in the frontend.

Do not invent a backend Opportunity stage endpoint.

A small UI change is allowed if necessary to make this truthful.

## C. Add real Quote-to-Cash visibility

The dashboard currently stops effectively at Leads/Opportunities/Quotations.

Add a compact real-data Quote-to-Cash summary covering the downstream lifecycle where the existing repositories support it:

- Quotations
- Proforma Invoices
- Sales Orders
- Dispatch Orders
- Sales Invoices

Use existing real repositories/hooks and their list endpoints.

The purpose is operational visibility, not a fabricated conversion funnel.

Use simple counts and, where clearly meaningful and already authoritative, amount totals.

Do not imply that these counts represent cohort conversion rates.

Do not invent relationships between stages beyond those already established by the actual backend/frontend workflow.

## D. Add real financial / collection summary

Add a useful compact AR/collections dashboard section using the authoritative existing endpoints.

Preferred real metrics:

- Total invoiced/revenue amount where appropriate from `sales-reports/revenue-summary`
- Outstanding AR
- Collected amount
- Collection/recovery rate
- AR status distribution or aging summary
- Invoice count if useful

For AR/payment state:

**AccountsReceivable is authoritative.**

Do not use `SalesInvoice.paymentStatus` as the authoritative collection state.

Existing Stage 2G rules remain in force.

Good sources include:

- `/sales-reports/revenue-summary`
- `/collections-dashboard/summary`
- `/collections-dashboard/aging`
- `/collections-dashboard/efficiency`
- `/collections-dashboard/recovery-rate`

Do not surface `collections-dashboard/customer-ranking`.

Do not add a payment-collection list because no GET `/payment-collections` endpoint exists.

## E. Customer visibility

Add a simple real Customer count if it improves the dashboard.

Source:

`GET /customers`

Do not fabricate customer-to-invoice/AR relationships.

The existing backend links many Quote-to-Cash records through customer-name strings, not Customer foreign keys.

## F. Fix stale sidebar counts

Correct the existing Quotation and Customer badge counts.

They must no longer read the mock singleton store unconditionally.

Use the real repository/hooks in connected mode and preserve mock behavior in mock mode.

This is an important functional correctness fix, not a redesign.

---

# 4. Date ranges

Do NOT build a fake server-side date-range system.

The verified analytics endpoints accept no period query parameters and aggregate all-time.

Do not present dashboard figures as "this month", "this week", "today", etc. unless they are genuinely calculated from fetched records.

If a simple date filter can safely be derived client-side from real entity `createdAt` values, it may be implemented, but it is optional and should not become a major dashboard redesign.

Do not invent period-over-period comparisons.

---

# 5. Analytics architecture

There is currently no dedicated analytics repository/hook layer.

For Stage 2I, establish a clean lightweight analytics data-access structure rather than scattering direct fetches throughout dashboard components.

Follow the established repository architecture:

- domain types
- repository interfaces
- real repositories
- mock repositories where needed
- hooks
- mappers

Keep real and mock modes separate.

Do not bypass the repository layer from UI components.

Prefer small, composable dashboard/analytics hooks over one giant dashboard fetch abstraction if that fits the existing architecture.

---

# 6. Loading/error behavior

Each newly integrated dashboard data group must handle:

- loading
- error
- empty/zero state

Do not let one failed analytics endpoint blank the entire dashboard.

For example:

- Lead analytics can still render if collection analytics fail.
- AR summary can show an honest error state if its endpoint fails.
- Quote-to-Cash counts can independently show their state.

Do not substitute mock numbers when a real endpoint fails in connected mode.

---

# 7. Mock mode

Mock mode must remain coherent.

The dashboard should still render useful demonstration data.

Where new real metrics are added:

- provide appropriate mock values/repository implementations;
- keep them clearly separate from real data;
- do not make mock values appear to be backend facts.

The existing mock Opportunity stage behavior may remain for demonstration, but the UI must clearly distinguish it from persisted backend state.

---

# 8. Visual / UX requirements

Version A visual language remains the baseline.

Allowed:

- compact new dashboard cards/sections;
- small layout adjustments;
- clear source/authority labels where useful;
- honest local-only/backend limitation markers;
- responsive grouping of the expanded dashboard;
- improved error/empty states.

Avoid:

- wholesale redesign;
- new visual system;
- dark mode;
- unrelated navigation changes;
- speculative analytics;
- decorative charts with no authoritative data source.

The dashboard should remain readable even after adding downstream Quote-to-Cash and AR visibility.

Use existing UI primitives and visual patterns where possible.

---

# 9. What is explicitly OUT OF SCOPE for this stage

Do NOT implement:

- backend changes;
- new analytics endpoints;
- backend date-range support;
- true cohort conversion analytics;
- salesperson analytics;
- true predictive forecasting;
- customer ranking from the misleading endpoint;
- payment collection list/detail;
- Opportunity backend stage persistence;
- new permissions;
- Customer/Quote-to-Cash foreign keys;
- backend data cleanup;
- modifications to `create-superadmin.ts`.

Do not attempt to fix backend defects with frontend workarounds.

---

# 10. Backend gaps to document for the post-2I audit

Keep a clear list of unresolved backend capabilities:

1. Opportunity stage persistence is missing.
2. True period-based analytics are missing.
3. True cohort conversion analytics are missing.
4. Salesperson ownership/performance data is missing.
5. Forecasting endpoint is not a genuine predictive model.
6. Customer ranking endpoint is mathematically misleading.
7. Customer identity across Quote-to-Cash remains largely name-string based.
8. Backend analytics contain additional data-quality issues identified during investigation.

These will be addressed separately after all functional stages are complete.

---

# 11. Validation

Before commit:

Run:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Perform reasonable read-only runtime/API verification.

Do NOT create/update/delete any backend data.

Use GET requests only for backend verification.

Browser/DOM testing may remain unavailable because the sandbox browser cannot reach the environment's localhost. Report this honestly if still true.

Verify both:

- real/connected mode
- mock mode

Pay particular attention to:

- dashboard route
- sidebar badge counts
- AR/collection section
- Quote-to-Cash counts
- Opportunity local-only labeling
- independent error states

---

# 12. Git / commit discipline

One milestone = one commit.

Before staging:

- inspect git status;
- inspect exact diff;
- ensure only Stage 2I source changes are staged;
- do not stage docs;
- do not stage `.save` files;
- do not stage `tsconfig.tsbuildinfo`;
- do not stage unrelated concurrent work.

Backend must remain completely uninvolved.

Commit exactly:

`feat(revenueos): integrate dashboard and analytics`

Do NOT add:

`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`

After committing, report:

1. commit hash
2. exact committed file list
3. validation results
4. real-mode behavior
5. mock-mode behavior
6. analytics sources used
7. intentionally excluded/misleading analytics
8. backend HEAD/status confirmation
9. confirmation create-superadmin.ts was untouched
10. browser-testing limitation, if applicable

STOP after the commit.

Do not begin the post-2I Version A Completion Audit automatically.
