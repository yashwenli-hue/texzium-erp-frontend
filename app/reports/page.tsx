"use client";

import { useRouter } from "next/navigation";
import { PageHeader, DesignNote } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Card";
import { Button, EmptyState } from "../../components/ui/Button";

/**
 * Deliberately NOT the shared ComingSoon component — this isn't a screen
 * that's simply "next in line to be built." The one report endpoint found
 * trustworthy (revenue-summary) is already surfaced on the Dashboard's
 * Revenue & Collections panel; the other 10 sales-reports endpoints were
 * each investigated (Stage 2I) and found unsuitable to present as real
 * analytics. No further Reports screen is planned against them unless the
 * backend queries themselves change. See ISalesReportsRepository in
 * lib/repository/interfaces.ts for the same finding in code.
 */
export default function ReportsPage() {
  const router = useRouter();

  return (
    <div className="page">
      <PageHeader
        eyebrow="RevenueOS · Analytics · Reports"
        title="Reports"
        subtitle="Revenue, funnel, conversion and performance reporting."
      />

      <Panel title="Reports">
        <EmptyState
          icon="barChart"
          title="Revenue reporting already lives on the Dashboard"
          body="The one report figure verified trustworthy — revenue-summary — is already shown on the Dashboard's Revenue & Collections panel, all-time and backend-sourced. The other 10 report endpoints this backend exposes were each investigated and found unsuitable to present as real analytics, so no screen has been built against them here."
          action={
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          }
        />
      </Panel>

      <DesignNote>
        <b>Design note.</b> <code>quotation-conversion</code>/<code>lead-conversion</code> and{" "}
        <code>funnel</code> produce naive ratios with no cohort or time basis (one was observed
        returning a 200% conversion rate); <code>customer-ranking</code> sums a running
        CustomerLedger balance column into a mathematically inflated total;{" "}
        <code>salesperson-performance</code> is byte-for-byte identical to{" "}
        <code>customer-revenue</code> — it groups by customer name, not salesperson, despite the
        name; <code>lost-opportunities</code> can never reflect real lost deals because Opportunity
        stage is local-only (see the Dashboard&apos;s own design note) and the backend Opportunity
        status never actually changes. The remaining endpoints (<code>top-products</code>,{" "}
        <code>product-revenue</code>, <code>product-quantity</code>, <code>hsn-revenue</code>,{" "}
        <code>category-revenue</code>) were each investigated and found to be a naive ratio, an
        always-empty list, or a mislabeled/duplicate metric. This isn&apos;t a coverage gap waiting on
        frontend work — it&apos;s a deliberate decision not to present misleading analytics as real
        ones.
      </DesignNote>
    </div>
  );
}
