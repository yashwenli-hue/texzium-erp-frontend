import Link from "next/link";
import { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * A record named inline as a link: an icon, its name, its code and, when it matters,
 * its state. It is how one record points at another ("this deal is for Raj Traders")
 * so that people can move between them without going back to a list.
 */
export function EntityChip({ href, label, code, status, icon, title }: { href: string; label: string; code?: string; status?: ReactNode; icon: string; title?: string }) {
  return (
    <Link href={href} className="entity-chip" title={title}>
      <Icon name={icon} size={13} />
      <span className="ec-label">{label}</span>
      {code && <span className="ec-code">{code}</span>}
      {status}
    </Link>
  );
}

/** The customer a document or deal belongs to. An inactive customer says so; it is still a link. */
export function CustomerChip({ customer }: { customer: { id: string; customerName: string; customerCode: string; isActive: boolean } }) {
  return (
    <EntityChip
      href={`/customers/${customer.id}`}
      icon="building"
      label={customer.customerName}
      code={customer.customerCode}
      status={customer.isActive ? undefined : <span className="ec-state">Inactive</span>}
      title={`Open ${customer.customerName}`}
    />
  );
}
