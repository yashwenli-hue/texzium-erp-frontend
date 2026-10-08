import { GST_STATES } from "../repository/shared/customerLifecycle";
import { COUNTRIES, countryByCode, countryName } from "./countries";

/**
 * Where a Lead is: three optional, persisted fields on the Lead (country, state, city),
 * the same ones the backend validates (the backend's leads/lead-location.ts is the
 * authority; this file mirrors it so the form, the mock and the real client refuse the
 * same inputs with the same words).
 *
 *   country  ISO 3166-1 alpha-2 code. "IN" is the domestic case.
 *   state    a state or union territory of India, only when the country is "IN".
 *   city     free text: the city or the specific location. At most 100 characters.
 *
 * All three are empty for a Lead that was recorded without a location (every lead that
 * existed before this, and leads created by the WhatsApp bot or a webhook). Nothing in
 * this file infers a country from a phone number, a name or a source, and nothing fills
 * a location in for a lead that has none.
 */

export const LEAD_COUNTRY_INDIA = "IN";
export const LEAD_CITY_MAX_LENGTH = 100;

/** India's states and union territories, in the order the backend lists them: the names customer GST registrations use, without code 97 ("Other Territory"), which is not a place. */
export const INDIA_STATES: readonly string[] = Object.entries(GST_STATES)
  .filter(([code]) => code !== "97")
  .map(([, name]) => name);

/** The same states, for a picker: alphabetical. */
export const INDIA_STATES_SORTED: readonly string[] = [...INDIA_STATES].sort((a, b) => a.localeCompare(b, "en"));

/** The countries a person can pick under "International": all of them except India, which has its own choice. */
export const INTERNATIONAL_COUNTRIES = COUNTRIES.filter((c) => c.code !== LEAD_COUNTRY_INDIA);

/** The backend's messages, word for word. */
export const LEAD_LOCATION_MESSAGE = {
  COUNTRY_UNKNOWN: "country must be a valid ISO 3166-1 alpha-2 country code.",
  COUNTRY_REQUIRED: "A location needs a country.",
  STATE_REQUIRED: "A state is required for a lead in India.",
  STATE_UNKNOWN: "state must be a state or union territory of India.",
  STATE_ONLY_IN_INDIA: "A state can only be recorded for a lead in India.",
  CITY_TOO_LONG: `city must be at most ${LEAD_CITY_MAX_LENGTH} characters.`,
} as const;

/** What a request may say about a location. A field left out keeps what is stored; null clears it. */
export interface LeadLocationFields {
  country?: string | null;
  state?: string | null;
  city?: string | null;
}

/** A location as it is stored: every field is a value or null. */
export interface StoredLeadLocation {
  country: string | null;
  state: string | null;
  city: string | null;
}

// ---------------------------------------------------------------------------
// Normalising, the way the backend does before it validates
// ---------------------------------------------------------------------------

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && countryByCode(value) !== undefined;
}

/** The canonical spelling of an Indian state, or null when it is not one. Case and surrounding spaces are ignored; the stored value never is. */
export function canonicalIndiaState(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const wanted = value.trim().toLowerCase();
  return INDIA_STATES.find((s) => s.toLowerCase() === wanted) ?? null;
}

/** A blank value means "no value" (null); a country is upper-cased. Anything that is not a string is left for the validators to refuse. */
export function normalizeCountry(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim().toUpperCase();
  return t === "" ? null : t;
}

export function normalizeState(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  return t === "" ? null : (canonicalIndiaState(t) ?? t);
}

export function normalizeCity(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  return t === "" ? null : t;
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

export interface LocationProblem {
  field: "country" | "state" | "city";
  message: string;
}

/** The rules applied to a whole location (never to one field alone). Empty when the location is acceptable. */
export function locationProblems(location: StoredLeadLocation): LocationProblem[] {
  const { country, state, city } = location;
  const out: LocationProblem[] = [];

  if (city !== null && city.length > LEAD_CITY_MAX_LENGTH) out.push({ field: "city", message: LEAD_LOCATION_MESSAGE.CITY_TOO_LONG });

  if (country === null) {
    if (state !== null || city !== null) out.push({ field: "country", message: LEAD_LOCATION_MESSAGE.COUNTRY_REQUIRED });
    return out;
  }
  if (!isCountryCode(country)) {
    out.push({ field: "country", message: LEAD_LOCATION_MESSAGE.COUNTRY_UNKNOWN });
    return out;
  }
  if (country === LEAD_COUNTRY_INDIA) {
    if (state === null) out.push({ field: "state", message: LEAD_LOCATION_MESSAGE.STATE_REQUIRED });
    else if (canonicalIndiaState(state) !== state) out.push({ field: "state", message: LEAD_LOCATION_MESSAGE.STATE_UNKNOWN });
    return out;
  }
  if (state !== null) out.push({ field: "state", message: LEAD_LOCATION_MESSAGE.STATE_ONLY_IN_INDIA });
  return out;
}

/** The location a lead would have after a change: a field left out (undefined) keeps, null clears. */
export function mergeLocation(existing: StoredLeadLocation, change: LeadLocationFields): StoredLeadLocation {
  return {
    country: change.country === undefined ? existing.country : change.country,
    state: change.state === undefined ? existing.state : change.state,
    city: change.city === undefined ? existing.city : change.city,
  };
}

/** Reads the three request fields into a stored location, keeping "not mentioned" as undefined. */
export function normalizeChange(change: LeadLocationFields): LeadLocationFields {
  const out: LeadLocationFields = {};
  if (change.country !== undefined) out.country = normalizeCountry(change.country) as string | null;
  if (change.state !== undefined) out.state = normalizeState(change.state) as string | null;
  if (change.city !== undefined) out.city = normalizeCity(change.city) as string | null;
  return out;
}

export const EMPTY_STORED_LOCATION: StoredLeadLocation = { country: null, state: null, city: null };

/** The location a Lead has, as stored. */
export function storedLocationOf(lead: { country?: string; state?: string; city?: string }): StoredLeadLocation {
  return { country: lead.country ?? null, state: lead.state ?? null, city: lead.city ?? null };
}

// ---------------------------------------------------------------------------
// Showing it
// ---------------------------------------------------------------------------

/** "Pune, Maharashtra, India" or "Dubai, United Arab Emirates"; "" when the lead has no location. A code that is not one of the 249 is shown as stored. */
export function formatLeadLocation(lead: { country?: string; state?: string; city?: string }): string {
  if (!lead.country) return "";
  return [lead.city, lead.state, countryName(lead.country)].filter(Boolean).join(", ");
}

/** One short phrase for a list row or a header: the city, else the state, else the country. For another country the country name follows the city: "Dubai · United Arab Emirates". */
export function formatLeadLocationShort(lead: { country?: string; state?: string; city?: string }): string {
  if (!lead.country) return "";
  if (lead.country === LEAD_COUNTRY_INDIA) return lead.city || lead.state || countryName(lead.country);
  return lead.city ? `${lead.city}, ${countryName(lead.country)}` : countryName(lead.country);
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

/** Which of the two the person chose. "" is "not chosen yet": there is deliberately no default. */
export type LocationScope = "" | "india" | "international";

export interface LocationDraft {
  scope: LocationScope;
  /** A state name from the India list, or "". */
  state: string;
  /** A country code (never India), or "". */
  country: string;
  city: string;
}

export const EMPTY_LOCATION_DRAFT: LocationDraft = { scope: "", state: "", country: "", city: "" };

/** What the form starts from for a lead: its stored location, or nothing at all. */
export function draftFromLead(lead: { country?: string; state?: string; city?: string }): LocationDraft {
  if (!lead.country) return { ...EMPTY_LOCATION_DRAFT };
  if (lead.country === LEAD_COUNTRY_INDIA) return { scope: "india", state: lead.state ?? "", country: "", city: lead.city ?? "" };
  return { scope: "international", state: "", country: lead.country, city: lead.city ?? "" };
}

/**
 * Moving between India and International. The state belongs to India and the country to
 * International, so the one that no longer applies is dropped; the city is kept.
 */
export function withScope(draft: LocationDraft, scope: Exclude<LocationScope, "">): LocationDraft {
  if (draft.scope === scope) return draft;
  return scope === "india" ? { ...draft, scope, country: "" } : { ...draft, scope, state: "" };
}

export function sameDraft(a: LocationDraft, b: LocationDraft): boolean {
  return a.scope === b.scope && a.state === b.state && a.country === b.country && a.city.trim() === b.city.trim();
}

/** The location the draft stands for, as stored. A draft that has not been given a scope has no country, whatever else it holds. */
export function storedFromDraft(draft: LocationDraft): StoredLeadLocation {
  const city = draft.city.trim() || null;
  if (draft.scope === "india") return { country: LEAD_COUNTRY_INDIA, state: draft.state || null, city };
  if (draft.scope === "international") return { country: draft.country || null, state: null, city };
  return { country: null, state: null, city };
}

export interface DraftErrors {
  scope?: string;
  state?: string;
  country?: string;
  city?: string;
}

/** What is wrong with the draft, in the form's own words. A manual create always needs a location, so the draft must be complete. */
export function draftErrors(draft: LocationDraft): DraftErrors {
  const e: DraftErrors = {};
  if (draft.scope === "") {
    e.scope = "Choose India or International";
    return e;
  }
  if (draft.scope === "india" && !draft.state) e.state = "Select a state";
  if (draft.scope === "international" && !draft.country) e.country = "Select a country";
  if (draft.city.trim().length > LEAD_CITY_MAX_LENGTH) e.city = `City / location must be at most ${LEAD_CITY_MAX_LENGTH} characters`;
  return e;
}

/** The request fields for a new lead. Blank city and the state of another country are left out. */
export function createFieldsFromDraft(draft: LocationDraft): { country: string; state?: string; city?: string } {
  const s = storedFromDraft(draft);
  return {
    country: s.country as string,
    ...(s.state ? { state: s.state } : {}),
    ...(s.city ? { city: s.city } : {}),
  };
}

/**
 * The location part of an edit. A lead that has no location and whose location was not
 * touched is saved as it is: nothing is sent, nothing is required. Once the section is
 * touched the whole location is checked like a new lead's, and all three fields are sent
 * (null clears), so moving a lead out of India clears its state in the same request.
 */
export type LocationEdit =
  | { kind: "unchanged" }
  | { kind: "invalid"; errors: DraftErrors }
  | { kind: "change"; fields: { country: string; state: string | null; city: string | null } };

export function planLocationEdit(initial: LocationDraft, draft: LocationDraft): LocationEdit {
  if (sameDraft(initial, draft)) return { kind: "unchanged" };
  const errors = draftErrors(draft);
  if (Object.keys(errors).length > 0) return { kind: "invalid", errors };
  const s = storedFromDraft(draft);
  return { kind: "change", fields: { country: s.country as string, state: s.state, city: s.city } };
}

/** For a filter or a search: the words a lead's location answers to. */
export function locationSearchText(lead: { country?: string; state?: string; city?: string }): string {
  if (!lead.country) return "";
  return [lead.city, lead.state, countryName(lead.country), lead.country].filter(Boolean).join(" ").toLowerCase();
}

// ---------------------------------------------------------------------------
// Checking a request before it is sent or stored
// ---------------------------------------------------------------------------

/**
 * What is wrong with a location *change* on its own, without knowing what the lead
 * already has (the real client cannot see that; the backend does the whole-location
 * check). A field that is not mentioned is not checked against the others.
 */
export function locationChangeProblems(change: LeadLocationFields): LocationProblem[] {
  const c = normalizeChange(change);
  const out: LocationProblem[] = [];
  if (typeof c.city === "string" && c.city.length > LEAD_CITY_MAX_LENGTH) out.push({ field: "city", message: LEAD_LOCATION_MESSAGE.CITY_TOO_LONG });
  if (typeof c.country === "string" && !isCountryCode(c.country)) out.push({ field: "country", message: LEAD_LOCATION_MESSAGE.COUNTRY_UNKNOWN });
  if (typeof c.state === "string" && canonicalIndiaState(c.state) !== c.state) out.push({ field: "state", message: LEAD_LOCATION_MESSAGE.STATE_UNKNOWN });
  if (typeof c.state === "string" && c.country === null) out.push({ field: "country", message: LEAD_LOCATION_MESSAGE.COUNTRY_REQUIRED });
  if (typeof c.state === "string" && typeof c.country === "string" && c.country !== LEAD_COUNTRY_INDIA) out.push({ field: "state", message: LEAD_LOCATION_MESSAGE.STATE_ONLY_IN_INDIA });
  if (c.country === LEAD_COUNTRY_INDIA && c.state === null) out.push({ field: "state", message: LEAD_LOCATION_MESSAGE.STATE_REQUIRED });
  return out;
}

/** The request fields of a location change, normalised (country upper case, state canonical, city trimmed, blank as null). */
export function normalizedLocationFields(change: LeadLocationFields): LeadLocationFields {
  return normalizeChange(change);
}
