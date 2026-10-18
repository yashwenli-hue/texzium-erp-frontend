import { Icon } from "./Icon";

/** The search box above a list: labelled for assistive technology, with the hint as placeholder. */
export function ListSearch({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder: string }) {
  return (
    <label className="list-search">
      <Icon name="search" size={16} />
      <span className="sr-only">{label}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
