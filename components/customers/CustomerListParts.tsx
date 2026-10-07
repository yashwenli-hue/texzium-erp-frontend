import { Tag } from "../ui/Tag";
import { Customer } from "../../lib/types/domain";
import { READINESS_LABEL, Readiness, customerReadiness, gstStateSummary } from "../../lib/repository/shared/customerList";

const READINESS_TAG: Record<Readiness, "g" | "w" | "n"> = { READY: "g", NEEDS_GST: "w", INACTIVE: "n" };

/** One word for where a customer stands: Ready to quote, Needs GST (active, no active registration) or Inactive. */
export function ReadinessPill({ customer }: { customer: Pick<Customer, "isActive" | "gstRegistrations"> }) {
  const r = customerReadiness(customer);
  return (
    <span data-readiness={r}>
      <Tag color={READINESS_TAG[r]}>{READINESS_LABEL[r]}</Tag>
    </span>
  );
}

/**
 * The states a customer can be quoted in: its default registration's state first, then the
 * other active ones, a count for the rest. These are the states of the registrations as
 * entered and format-checked, not checked with the tax authority.
 */
export function GstStateChips({ customer }: { customer: Pick<Customer, "gstRegistrations"> }) {
  const s = gstStateSummary(customer);
  if (s.states.length === 0) return <span className="gst-none">{s.allInactive ? "None active" : "None"}</span>;
  return (
    <span className="gst-chips">
      {s.states.map((n) => (
        <Tag key={n} color="i">
          {n}
        </Tag>
      ))}
      {s.more > 0 && <span className="gst-more">+{s.more}</span>}
    </span>
  );
}
