import { ReactNode } from "react";

interface FieldWrapProps {
  label: string;
  required?: boolean;
  error?: string;
  children?: ReactNode;
}

export function FieldWrap({ label, required, error, children }: FieldWrapProps) {
  return (
    <div className={`field ${error ? "has-err" : ""}`}>
      <label>
        {label}
        {required && <span className="req">*</span>}
      </label>
      {children}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

export function TextField({
  label,
  required,
  error,
  ...rest
}: FieldWrapProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const { children: _c, ...inputProps } = rest as any;
  return (
    <FieldWrap label={label} required={required} error={error}>
      <input {...inputProps} />
    </FieldWrap>
  );
}

export function TextAreaField({
  label,
  required,
  error,
  ...rest
}: FieldWrapProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { children: _c, ...areaProps } = rest as any;
  return (
    <FieldWrap label={label} required={required} error={error}>
      <textarea {...areaProps} />
    </FieldWrap>
  );
}

export function SelectField({
  label,
  required,
  error,
  options,
  ...rest
}: FieldWrapProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
  }) {
  const { children: _c, ...selectProps } = rest as any;
  return (
    <FieldWrap label={label} required={required} error={error}>
      <select {...selectProps}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
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
