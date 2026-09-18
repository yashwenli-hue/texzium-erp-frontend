import { ComingSoon } from "../../components/ui/ComingSoon";

export default function ReportsPage() {
  return (
    <ComingSoon
      icon="barChart"
      eyebrow="RevenueOS · Analytics · Reports"
      title="Reports"
      subtitle="Funnel, revenue, conversion, salesperson performance and product reports."
      backendNote="VERIFIED: 11 report endpoints exist (funnel, revenue-summary, customer-revenue, lead-conversion, quotation-conversion, lost-opportunities, salesperson-performance, top-products, product-revenue, product-quantity, hsn-revenue, category-revenue). Note: salesperson-performance is documented as grouping by customer name, not salesperson (docs/backend-ui-contract.md §18). No frontend screen has been built against these yet."
    />
  );
}
