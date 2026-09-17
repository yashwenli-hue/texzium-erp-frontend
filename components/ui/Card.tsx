import { ReactNode } from "react";
import { Sparkline } from "./Sparkline";
import { Icon } from "./Icon";

export function StatCard({
  label,
  value,
  delta,
  dir,
  note,
}: {
  label: string;
  value: string;
  delta?: string | null;
  dir?: "up" | "down" | "flat";
  note?: string;
}) {
  return (
    <div className="card stat">
      <div className="top">
        <div className="k">{label}</div>
        <div className="spark">
          <Sparkline dir={dir ?? "flat"} />
        </div>
      </div>
      <div className="v tnum">{value}</div>
      {delta ? (
        <div className={`d ${dir ?? "flat"}`}>
          <span className="pill">{delta}</span>
          <span>{note}</span>
        </div>
      ) : (
        <div className="d flat">
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid stat-row">{children}</div>;
}

export function Panel({
  title,
  more,
  extraHead,
  flush,
  children,
}: {
  title: string;
  more?: { label: string; onClick?: () => void };
  extraHead?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="card panel">
      <div className="panel-head">
        <h3>{title}</h3>
        {extraHead}
        {more && (
          <a className="more" href="#" onClick={(e) => { e.preventDefault(); more.onClick?.(); }}>
            {more.label} <Icon name="arrow" size={14} />
          </a>
        )}
      </div>
      <div className={`panel-body ${flush ? "flush" : ""}`}>{children}</div>
    </div>
  );
}

export function Cols({ children, even }: { children: ReactNode; even?: boolean }) {
  return <div className={`cols ${even ? "even" : ""}`}>{children}</div>;
}
