import { ComingSoon } from "../../components/ui/ComingSoon";

export default function PaymentsPage() {
  return (
    <ComingSoon
      icon="cash"
      eyebrow="RevenueOS · Quote to Cash · Payments"
      title="Payments & Collections"
      subtitle="Payment collections against sales invoices, payment links, and collection reminders."
      backendNote="VERIFIED: payment collections operate against invoice receivables and the backend updates paid/balance/status; collection reminders classify UPCOMING/DUE_TODAY/OVERDUE (docs/backend-ui-contract.md §15–16). No frontend screen has been built against it yet."
    />
  );
}
