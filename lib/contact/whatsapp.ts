/**
 * Turning a stored phone number into a WhatsApp link (https://wa.me/<number>), without
 * ever changing the stored number and without guessing.
 *
 * wa.me wants the whole international number, digits only: country code first, no plus.
 * A stored number is often only the national part ("98220 41120"), and a link built
 * from it opens the wrong chat or none. The only way to know what a national number
 * belongs to is a country the person recorded, so:
 *
 *   +… or 00…             already international: used as written (separators removed)
 *   country IN, 10 digits   a national Indian number: 91 is put in front
 *   country IN, 91 + 10     already carries the code: used as written
 *   anything else           refused, with the reason, and no link
 *
 * "Anything else" includes a national number whose lead has no country, or another
 * country than India (this milestone only knows India's rule), and a number for a
 * record that has no country at all (customers and contacts): those must be saved with
 * a "+" and the country code. Nothing is inferred from the number itself. A leading 0
 * (a trunk prefix) is not interpreted: it is refused. Calling (tel:) is not touched by
 * any of this.
 */

export type WhatsAppRefusal = "blank" | "invalid" | "needs-country" | "needs-international";

export type WhatsAppLink =
  | {
      ok: true;
      /** https://wa.me/<digits> */
      url: string;
      /** The international number the link carries: country code first, digits only. */
      digits: string;
      /** How the number was understood. */
      basis: "international" | "india-national" | "india-with-code";
    }
  | { ok: false; reason: WhatsAppRefusal; message: string };

const MESSAGE: Readonly<Record<WhatsAppRefusal, string>> = {
  blank: "No phone number on file for this record",
  invalid: "This phone number can't be used for WhatsApp. Check it and correct it.",
  "needs-country": "Set this lead's country to open WhatsApp. A number without a country code can't be matched to a chat.",
  "needs-international": "Save this number with its country code (for example +44…) to use WhatsApp.",
};

const refuse = (reason: WhatsAppRefusal): WhatsAppLink => ({ ok: false, reason, message: MESSAGE[reason] });

/** Longest and shortest international numbers WhatsApp can address (E.164 allows 15 digits). */
const MIN_INTERNATIONAL_DIGITS = 8;
const MAX_INTERNATIONAL_DIGITS = 15;
const INDIA_CODE = "91";
const INDIA_NATIONAL_DIGITS = 10;

// What may sit between the digits of a written phone number.
const SEPARATORS = /[\s \-.()]/g;

function international(digits: string): WhatsAppLink {
  if (digits.length < MIN_INTERNATIONAL_DIGITS || digits.length > MAX_INTERNATIONAL_DIGITS || digits.startsWith("0")) return refuse("invalid");
  // India's numbers are a fixed length: "+91" followed by anything but 10 digits is a typo, not a number to guess at.
  if (digits.startsWith(INDIA_CODE) && digits.length !== INDIA_CODE.length + INDIA_NATIONAL_DIGITS) return refuse("invalid");
  return { ok: true, url: `https://wa.me/${digits}`, digits, basis: "international" };
}

/**
 * @param phone    the number as stored
 * @param country  the record's country code. `undefined`: this kind of record has no
 *                 country (a customer or a contact). `null`: a lead whose country has
 *                 not been recorded. A code such as "IN": the lead's country.
 */
export function whatsappLink(phone: string | null | undefined, country?: string | null): WhatsAppLink {
  const written = (phone ?? "").trim();
  if (written === "") return refuse("blank");

  const plus = written.startsWith("+");
  const body = (plus ? written.slice(1) : written).replace(SEPARATORS, "");
  // Digits only from here: a letter ("ext", "x"), a slash or a second plus means this is not a plain number.
  if (!/^\d+$/.test(body)) return refuse("invalid");

  if (plus) return international(body);
  if (body.startsWith("00")) return international(body.slice(2));

  // A national number: only a recorded country can say what it belongs to.
  if (country === "IN") {
    if (body.startsWith("0")) return refuse("invalid");
    if (body.length === INDIA_NATIONAL_DIGITS) {
      return { ok: true, url: `https://wa.me/${INDIA_CODE}${body}`, digits: `${INDIA_CODE}${body}`, basis: "india-national" };
    }
    if (body.length === INDIA_CODE.length + INDIA_NATIONAL_DIGITS && body.startsWith(INDIA_CODE)) {
      return { ok: true, url: `https://wa.me/${body}`, digits: body, basis: "india-with-code" };
    }
    return refuse("invalid");
  }
  return refuse(country === undefined ? "needs-international" : country === null ? "needs-country" : "needs-international");
}
