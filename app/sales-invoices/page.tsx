import { ComingSoon } from "../../components/ui/ComingSoon";

export default function SalesInvoicesPage() {
  return (
    <ComingSoon
      icon="file"
      eyebrow="RevenueOS · Quote to Cash · Sales Invoices"
      title="Sales Invoices"
      subtitle="Raised once a sales order reaches DISPATCHED — backend owns the accounting effects."
      backendNote="VERIFIED: sales invoice creation requires a dispatched order and a valid sales order; the backend performs receivable, ledger and journal-entry creation itself (docs/backend-ui-contract.md §13). No frontend screen has been built against it yet."
    />
  );
}
