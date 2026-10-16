"use client";

import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { whatsappLink } from "../../lib/contact/whatsapp";

/**
 * Call, Email and WhatsApp use real browser URI schemes (tel:, mailto:,
 * wa.me) — these genuinely hand off to whatever app/service the device has
 * registered for that scheme. The WhatsApp link is built by whatsappLink()
 * (lib/contact/whatsapp.ts) and is never guessed: a national number opens only
 * when the lead's country says what it belongs to, and otherwise the person is
 * told what is missing instead of being sent to a wrong chat. tel: is untouched. Meeting has no equivalent universal browser
 * API without a calendar integration, so per the "don't invent backend
 * integrations, give correct feedback instead" requirement, it surfaces a
 * toast rather than silently doing nothing or pretending to schedule
 * something. See docs/backend-ui-contract.md, item: "Meeting scheduling".
 */
export function QuickActions({
  phone,
  email,
  contactName,
  country,
  include = ["call", "email", "meet", "whatsapp"],
  share,
}: {
  phone?: string;
  email?: string;
  contactName: string;
  /**
   * The record's country code. Pass the lead's (`lead.country ?? null`: null when none
   * was recorded). Leave it out for a record that has no country at all, such as a
   * customer: then only a number written with "+" or "00" can open WhatsApp.
   */
  country?: string | null;
  /** Which actions to offer. A customer has no calendar to schedule against, so its row leaves "meet" out. */
  include?: Array<"call" | "email" | "meet" | "whatsapp">;
  /**
   * A fifth action, "Share", that opens the content-sharing dialog. Leave it out where the
   * person may not share. When sharing is not possible right now, `unavailable` says why:
   * the button stays focusable and says so when pressed, instead of silently doing nothing.
   */
  share?: { onShare: () => void; unavailable?: string };
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
    const link = whatsappLink(phone, country);
    if (!link.ok) {
      toast.info(link.message);
      return;
    }
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  function scheduleMeeting() {
    toast.info("Calendar isn't connected yet — this will open your scheduling tool once integrated.", { icon: "cal" });
  }

  function shareContent() {
    if (!share) return;
    if (share.unavailable) {
      toast.info(share.unavailable);
      return;
    }
    share.onShare();
  }

  // The wrapper is a size container: on a narrow card the five actions become two rows
  // (3 + 2) instead of squeezing their labels.
  return (
    <div className="qa-wrap">
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
      {share && (
        <button
          className="qa"
          onClick={shareContent}
          aria-label={`Share content with ${contactName}`}
          aria-disabled={share.unavailable ? true : undefined}
          title={share.unavailable ?? "Share a catalogue, photo or video from the Content Library"}
        >
          <Icon name="share" size={16} />
          Share
        </button>
      )}
    </div>
    </div>
  );
}
