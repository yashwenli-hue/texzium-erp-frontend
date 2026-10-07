"use client";

import { ReactNode, useId } from "react";

interface FieldWrapProps {
  label: string;
  required?: boolean;
  error?: string;
  /** Short help shown under the control and announced with it. */
  hint?: string;
  children?: ReactNode;
}

/**
 * The label, the control and the message under it. The label is tied to the
 * control by `id` so a screen reader announces it and clicking it focuses the
 * field; an error (or a hint) is tied to the control with aria-describedby and
 * the control is marked invalid. TextField, TextAreaField and SelectField do
 * the wiring; use FieldWrap directly only for a control they don't cover and
 * pass the same `id` and `describedBy` to it.
 */
export function FieldWrap({
  label,
  required,
  error,
  hint,
  id,
  children,
}: FieldWrapProps & { id?: string }) {
  return (
    <div className={`field ${error ? "has-err" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && (
        <span className="hint" id={id ? `${id}-hint` : undefined}>
          {hint}
        </span>
      )}
      {error && (
        <span className="err" id={id ? `${id}-err` : undefined} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** The ids a control needs: its own, and the aria-describedby that points at its message. */
function controlProps(
  generated: string,
  given: string | undefined,
  describedBy: string | undefined,
  error: string | undefined,
  hint: string | undefined,
  required: boolean | undefined
) {
  const id = given ?? generated;
  const ids = [describedBy, error ? `${id}-err` : hint ? `${id}-hint` : undefined].filter(Boolean).join(" ");
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
    "aria-describedby": ids || undefined,
  } as const;
}

export function TextField({
  label,
  required,
  error,
  hint,
  ...rest
}: FieldWrapProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const { children: _c, id: given, "aria-describedby": describedBy, ...inputProps } = rest as any;
  const props = controlProps(generated, given, describedBy, error, hint, required);
  return (
    <FieldWrap label={label} required={required} error={error} hint={hint} id={props.id}>
      <input {...inputProps} {...props} />
    </FieldWrap>
  );
}

export function TextAreaField({
  label,
  required,
  error,
  hint,
  ...rest
}: FieldWrapProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId();
  const { children: _c, id: given, "aria-describedby": describedBy, ...areaProps } = rest as any;
  const props = controlProps(generated, given, describedBy, error, hint, required);
  return (
    <FieldWrap label={label} required={required} error={error} hint={hint} id={props.id}>
      <textarea {...areaProps} {...props} />
    </FieldWrap>
  );
}

export function SelectField({
  label,
  required,
  error,
  hint,
  options,
  ...rest
}: FieldWrapProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string; disabled?: boolean }[];
  }) {
  const generated = useId();
  const { children: _c, id: given, "aria-describedby": describedBy, ...selectProps } = rest as any;
  const props = controlProps(generated, given, describedBy, error, hint, required);
  return (
    <FieldWrap label={label} required={required} error={error} hint={hint} id={props.id}>
      <select {...selectProps} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>;
}
