export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Who({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="who">
      <div className="av">{initials(name)}</div>
      <div>
        <b>{name}</b>
        <small>{sub}</small>
      </div>
    </div>
  );
}
