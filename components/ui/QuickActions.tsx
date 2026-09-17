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
}: {
  phone?: string;
  email?: string;
  contactName: string;
}) {
  const toast = useToast();

  function call() {
    if (!phone) {
      toast.show("No phone number on file for this record", "alert");
      return;
    }
    window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
  }

  function sendEmail() {
    if (!email) {
      toast.show("No email address on file for this record", "alert");
      return;
    }
    window.location.href = `mailto:${email}`;
  }

  function whatsapp() {
    if (!phone) {
      toast.show("No phone number on file for this record", "alert");
      return;
    }
    const digits = phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  }

  function scheduleMeeting() {
    toast.show(
      "Calendar isn't connected yet — this will open your scheduling tool once integrated.",
      "cal"
    );
  }

  return (
    <div className="qa-row">
      <button className="qa" onClick={call} aria-label={`Call ${contactName}`}>
        <Icon name="phone" size={16} />
        Call
      </button>
      <button className="qa" onClick={sendEmail} aria-label={`Email ${contactName}`}>
        <Icon name="mail" size={16} />
        Email
      </button>
      <button className="qa" onClick={scheduleMeeting} aria-label={`Schedule meeting with ${contactName}`}>
        <Icon name="cal" size={16} />
        Meet
      </button>
      <button className="qa" onClick={whatsapp} aria-label={`WhatsApp ${contactName}`}>
        <Icon name="wa" size={16} />
        WhatsApp
      </button>
    </div>
  );
}
