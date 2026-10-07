import { ActionMenu, MenuItem } from "../ui/ActionMenu";
import { Icon } from "../ui/Icon";
import { CustomerStatusTag, Tag } from "../ui/Tag";
import { initials } from "../ui/Who";
import type { Customer } from "../../lib/types/domain";

/**
 * Who this customer is, in the first lines of the page: name, code, type and PAN;
 * whether it is active and whether it can be quoted; how to reach it (the email and
 * phone are links); and the actions behind one "⋯" button. The one thing to do next
 * is not here: it is the "Next up" strip right under it, so it is never offered
 * twice. An action that is not available stays in the menu with its reason.
 */
export function CustomerHeader({ customer, quotable, menu }: { customer: Customer; quotable: boolean; menu: MenuItem[] }) {
  return (
    <div className="card panel cust-head" data-testid="customer-header">
      <div className="ch-top">
        <div className="av-lg" aria-hidden="true">
          {initials(customer.customerName)}
        </div>
        <div className="ch-id">
          <h1>{customer.customerName}</h1>
          <div className="co">
            {customer.customerCode}
            {customer.customerType ? ` · ${customer.customerType}` : ""}
            {customer.panNumber ? ` · PAN ${customer.panNumber}` : ""}
          </div>
          <div className="statusrow">
            <CustomerStatusTag isActive={customer.isActive} />
            {customer.isActive && (quotable ? <Tag color="g">Ready to quote</Tag> : <Tag color="w">Can&apos;t be quoted yet</Tag>)}
            {customer.linkedVendorId && <Tag color="i">Also a vendor</Tag>}
          </div>
        </div>
        <ActionMenu items={menu} label={`Actions for ${customer.customerName}`} />
      </div>
      {(customer.email || customer.phone) && (
        <p className="ch-contact" data-testid="contact-line">
          {customer.email && (
            <a href={`mailto:${customer.email}`}>
              <Icon name="mail" size={14} />
              {customer.email}
            </a>
          )}
          {customer.phone && (
            <a href={`tel:${customer.phone.replace(/\s+/g, "")}`}>
              <Icon name="phone" size={14} />
              {customer.phone}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
