"use client";

import { Icon } from "./Icon";
import { whatsappLink } from "../../lib/contact/whatsapp";

/**
 * Compact per-row Call/Email/WhatsApp actions for a contact list — unlike
 * the full QuickActions row (built for a profile header), this only
 * renders the actions a contact actually has data for, per the design
 * review's "don't show a misleading action" rule. Real tel:/mailto:/wa.me
 * links, same as QuickActions — no backend API involved. A contact has no
 * country, so WhatsApp opens only for a number written with "+" or "00"; for any
 * other the WhatsApp control stays, disabled, and says why.
 */
export function ContactRowActions({
  phone,
  email,
  name,
}: {
  phone?: string | null;
  email?: string | null;
  name: string;
}) {
  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }
  const wa = whatsappLink(phone);

  return (
    <div className="contact-row-actions" onClick={stop}>
      {phone && (
        <a className="icon-btn sm" href={`tel:${phone.replace(/\s+/g, "")}`} aria-label={`Call ${name}`} title="Call">
          <Icon name="phone" size={14} />
        </a>
      )}
      {email && (
        <a className="icon-btn sm" href={`mailto:${email}`} aria-label={`Email ${name}`} title="Email">
          <Icon name="mail" size={14} />
        </a>
      )}
      {phone && wa.ok && (
        <a className="icon-btn sm" href={wa.url} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${name}`} title="WhatsApp">
          <Icon name="wa" size={14} />
        </a>
      )}
      {phone && !wa.ok && (
        <button type="button" className="icon-btn sm" aria-disabled="true" aria-label={`WhatsApp ${name} (unavailable): ${wa.message}`} title={wa.message} style={{ opacity: 0.45, cursor: "not-allowed" }}>
          <Icon name="wa" size={14} />
        </button>
      )}
      {!phone && !email && <span style={{ color: "var(--faint-text)", fontSize: 12 }}>No contact details</span>}
    </div>
  );
}
