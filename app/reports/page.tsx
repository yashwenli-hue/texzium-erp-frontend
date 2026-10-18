"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthContext";
import { PageHeader } from "../../components/ui/PageHeader";
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
  const { hasPermission } = useAuth();
  // The Dashboard's revenue totals are company-wide, so they need finance visibility.
  const seesTotals = hasPermission("revenue.view.all") || hasPermission("finance.view.all");

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
          title="Reports aren't available yet"
          body={
            seesTotals
              ? "Company revenue and collection totals are on the Dashboard. Funnel, conversion and performance reports will be added once their figures can be trusted; RevenueOS does not show numbers it cannot stand behind."
              : "Funnel, conversion and performance reports will be added once their figures can be trusted; RevenueOS does not show numbers it cannot stand behind. Company-wide totals need finance visibility; ask an administrator if you need them."
          }
          action={
            seesTotals ? (
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            ) : undefined
          }
        />
      </Panel>

    </div>
  );
}
