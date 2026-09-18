import { ComingSoon } from "../../components/ui/ComingSoon";

export default function SalesOrdersPage() {
  return (
    <ComingSoon
      icon="cart"
      eyebrow="RevenueOS · Quote to Cash · Sales Orders"
      title="Sales Orders"
      subtitle="Multi-gate approval workflow — store approval, advance receipt, accounts approval."
      backendNote="VERIFIED: the backend confirms a multi-stage lifecycle (PENDING_STORE_APPROVAL → PENDING_ACCOUNTS_APPROVAL → READY_FOR_DISPATCH_ORDER) plus payment terms and advance receipts (docs/backend-ui-contract.md §10–12). No frontend screen has been built against it yet."
    />
  );
}
