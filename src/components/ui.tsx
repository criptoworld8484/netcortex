import Link from "next/link";
import { SEVERITY_CLASS, STATUS_CLASS, STATUS_LABEL, type Severity, type Status } from "@/lib/constants";

export function Panel({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-edge px-4 py-2.5">
          {title ? <h2 className="label">{title}</h2> : <span />}
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return (
    <span className={`chip ${STATUS_CLASS[s] ?? ""}`}>
      <span className="led bg-current" />
      {STATUS_LABEL[s] ?? status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const s = severity as Severity;
  return <span className={`chip ${SEVERITY_CLASS[s] ?? ""}`}>{severity}</span>;
}

export function VendorChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="chip" style={{ color, borderColor: `${color}66`, backgroundColor: `${color}14` }}>
      {name}
    </span>
  );
}

export function KindTag({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    note: "text-mute border-edge",
    command: "text-accent border-accent/40",
    log: "text-sky border-sky/40",
    status: "text-amber border-amber/40",
    resolution: "text-green border-green/40",
  };
  return <span className={`label chip border ${colors[kind] ?? "text-mute border-edge"}`}>{kind}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-edge px-4 py-8 text-center text-sm text-dim">
      {children}
    </div>
  );
}

export function Tabs({ tabs }: { tabs: { key: string; label: string; href: string; active: boolean; count?: number }[] }) {
  return (
    <nav className="flex gap-1 border-b border-edge">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`-mb-px border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
            t.active
              ? "border-accent text-accent"
              : "border-transparent text-mute hover:border-edge hover:text-fg"
          }`}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 text-dim">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className="label">{label}</div>
      <div className="mt-1 font-mono text-2xl text-fg">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-dim">{hint}</div>}
    </div>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export function DateAgo({ ts }: { ts: number }) {
  // eslint-disable-next-line react-hooks/purity -- page is rendered per request; freshness is acceptable
  const mins = Math.floor((Date.now() - ts) / 60000);
  const text =
    mins < 1
      ? "now"
      : mins < 60
        ? `${mins}m ago`
        : mins < 1440
          ? `${Math.floor(mins / 60)}h ${mins % 60}m ago`
          : `${Math.floor(mins / 1440)}d ago`;
  return <span title={new Date(ts).toISOString()}>{text}</span>;
}
