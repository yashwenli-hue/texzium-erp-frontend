"use client";

import { Icon } from "./Icon";
import { useToast } from "./Toast";

/**
 * Call, Email and WhatsApp use real browser URI schemes (tel:, mailto:,
 * wa.me) — these genuinely hand off to whatever app/service the device has
 * registered for that scheme. Meeting has no equivalent universal browser
 * API without a calendar integration, so per the "don't invent backend
 * integrations, give correct feedback instead" requirement, it surfaces a
 * toast rather than silently doing nothing or pretending to schedule
 * something. See docs/backend-ui-contract.md, item: "Meeting scheduling".
 */
export function QuickActions({
  phone,
  email,
  contactName,
  include = ["call", "email", "meet", "whatsapp"],
}: {
  phone?: string;
  email?: string;
  contactName: string;
  /** Which actions to offer. A customer has no calendar to schedule against, so its row leaves "meet" out. */
  include?: Array<"call" | "email" | "meet" | "whatsapp">;
}) {
  const toast = useToast();

  function call() {
    if (!phone) {
      toast.info("No phone number on file for this record");
      return;
    }
    window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
  }

  function sendEmail() {
    if (!email) {
      toast.info("No email address on file for this record");
      return;
    }
    window.location.href = `mailto:${email}`;
  }

  function whatsapp() {
    if (!phone) {
      toast.info("No phone number on file for this record");
      return;
    }
    const digits = phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  }

  function scheduleMeeting() {
    toast.info("Calendar isn't connected yet — this will open your scheduling tool once integrated.", { icon: "cal" });
  }

  return (
    <div className="qa-row">
      {include.includes("call") && (
        <button className="qa" onClick={call} aria-label={`Call ${contactName}`}>
          <Icon name="phone" size={16} />
          Call
        </button>
      )}
      {include.includes("email") && (
        <button className="qa" onClick={sendEmail} aria-label={`Email ${contactName}`}>
          <Icon name="mail" size={16} />
          Email
        </button>
      )}
      {include.includes("meet") && (
        <button className="qa" onClick={scheduleMeeting} aria-label={`Schedule meeting with ${contactName}`}>
          <Icon name="cal" size={16} />
          Meet
        </button>
      )}
      {include.includes("whatsapp") && (
        <button className="qa" onClick={whatsapp} aria-label={`WhatsApp ${contactName}`}>
          <Icon name="wa" size={16} />
          WhatsApp
        </button>
      )}
    </div>
  );
}
