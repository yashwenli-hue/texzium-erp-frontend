"use client";

import { Icon } from "./Icon";

/**
 * Compact per-row Call/Email/WhatsApp actions for a contact list — unlike
 * the full QuickActions row (built for a profile header), this only
 * renders the actions a contact actually has data for, per the design
 * review's "don't show a misleading action" rule. Real tel:/mailto:/wa.me
 * links, same as QuickActions — no backend API involved.
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
      {phone && (
        <a
          className="icon-btn sm"
          href={`https://wa.me/${phone.replace(/[^\d]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${name}`}
          title="WhatsApp"
        >
          <Icon name="wa" size={14} />
        </a>
      )}
      {!phone && !email && <span style={{ color: "var(--faint)", fontSize: 12 }}>No contact details</span>}
    </div>
  );
}
