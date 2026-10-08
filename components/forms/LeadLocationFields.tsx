"use client";

import { KeyboardEvent, useId, useRef } from "react";
import { ComboboxField } from "../ui/Combobox";
import { TextField, FieldRow } from "../ui/FormField";
import { ComboOption } from "../../lib/ui/comboboxSearch";
import { INTERNATIONAL_COUNTRIES, INDIA_STATES_SORTED, DraftErrors, LEAD_CITY_MAX_LENGTH, LocationDraft, LocationScope, withScope } from "../../lib/geo/leadLocation";

const STATE_OPTIONS: readonly ComboOption[] = INDIA_STATES_SORTED.map((name) => ({ value: name, label: name }));

const COUNTRY_OPTIONS: readonly ComboOption[] = INTERNATIONAL_COUNTRIES.map((c) => ({
  value: c.code,
  label: c.name,
  hint: `+${c.dial}`,
  keywords: [...(c.aliases ?? []), `+${c.dial}`],
}));

const SCOPES: { value: Exclude<LocationScope, "">; label: string }[] = [
  { value: "india", label: "India" },
  { value: "international", label: "International" },
];

/**
 * The Location section of the lead forms: India or International, then a searchable
 * state (India) or country (International), then a free-text city or specific location.
 * There is no default choice: the person says which, because a default would be a guess
 * about where the lead is. Moving between the two drops the state or the country that
 * no longer applies and keeps the city. The rules it is held to are in
 * lib/geo/leadLocation.ts.
 */
export function LeadLocationFields({
  draft,
  onChange,
  errors,
  note,
  required = true,
}: {
  draft: LocationDraft;
  onChange: (next: LocationDraft) => void;
  errors: DraftErrors;
  /** False while the location is genuinely optional (an edit of a lead that has none, until the section is touched). */
  required?: boolean;
  /** Shown under the choice while nothing is chosen (the edit form says an untouched lead keeps having no location). */
  note?: string;
}) {
  const groupId = useId();
  const labelId = `${groupId}-label`;
  const errId = `${groupId}-err`;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function pick(scope: Exclude<LocationScope, "">) {
    onChange(withScope(draft, scope));
  }

  // A radio group: the arrows move between the two and choose, and only one is a Tab stop.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, at: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (at + step + SCOPES.length) % SCOPES.length;
    pick(SCOPES[next].value);
    refs.current[next]?.focus();
  }

  const tabStop = Math.max(0, SCOPES.findIndex((s) => s.value === draft.scope));

  return (
    <>
      <div className={`field ${errors.scope ? "has-err" : ""}`}>
        <span id={labelId} className="flabel">
          Location
          {required && <span className="req" aria-hidden="true">*</span>}
          {required && <span className="sr-only"> (required)</span>}
        </span>
        <div className="loc-scope" role="radiogroup" aria-labelledby={labelId} aria-required={required ? true : undefined} aria-invalid={errors.scope ? true : undefined} aria-describedby={errors.scope ? errId : undefined}>
          {SCOPES.map((s, i) => (
            <button
              key={s.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={draft.scope === s.value}
              tabIndex={i === tabStop ? 0 : -1}
              onClick={() => pick(s.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {errors.scope && (
          <span className="err" id={errId} role="alert">
            {errors.scope}
          </span>
        )}
        {!errors.scope && draft.scope === "" && note && <span className="hint">{note}</span>}
      </div>

      {draft.scope === "india" && (
        <FieldRow>
          <ComboboxField label="State" required options={STATE_OPTIONS} value={draft.state} onChange={(state) => onChange({ ...draft, state })} placeholder="Search states" error={errors.state} />
          <TextField label="City / location" value={draft.city} onChange={(e) => onChange({ ...draft, city: e.target.value })} placeholder="Optional" hint={`Up to ${LEAD_CITY_MAX_LENGTH} characters`} error={errors.city} autoComplete="address-level2" />
        </FieldRow>
      )}
      {draft.scope === "international" && (
        <FieldRow>
          <ComboboxField label="Country" required options={COUNTRY_OPTIONS} value={draft.country} onChange={(country) => onChange({ ...draft, country })} placeholder="Search countries" error={errors.country} noMatchText="No matching country" />
          <TextField label="City / location" value={draft.city} onChange={(e) => onChange({ ...draft, city: e.target.value })} placeholder="Optional" hint={`Up to ${LEAD_CITY_MAX_LENGTH} characters`} error={errors.city} autoComplete="address-level2" />
        </FieldRow>
      )}
    </>
  );
}
