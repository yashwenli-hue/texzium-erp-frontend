import { ComingSoon } from "../../components/ui/ComingSoon";

export default function ProformaInvoicesPage() {
  return (
    <ComingSoon
      icon="receipt"
      eyebrow="RevenueOS · Quote to Cash · Proforma Invoices"
      title="Proforma Invoices"
      subtitle="Generated from approved quotations, ahead of a sales order."
      backendNote="VERIFIED: the backend confirms POST /, GET / and a PATCH /:id/approve route, originating from quotations (docs/backend-ui-contract.md §9). No frontend screen has been built against it yet."
    />
  );
}
