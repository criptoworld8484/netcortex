import Link from "next/link";
import { dashboardData } from "@/lib/queries";
import { CHANGE_STATUS_CLASS, fmtDT, fmtTTR, type ChangeStatus } from "@/lib/constants";
import { DateAgo, Empty, Panel, SeverityBadge, StatCard, VendorChip } from "@/components/ui";

export default async function ConsolePage() {
  const { open, recentErrors, upcoming, stats } = dashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Console</h1>
          <p className="text-sm text-dim">Your troubleshooting brain at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/cases/new" className="btn btn-accent">+ New case</Link>
          <Link href="/analyzer" className="btn">Paste log</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Open" value={String(stats.open)} />
        <StatCard label="In progress" value={String(stats.in_progress)} />
        <StatCard label="Resolved" value={String(stats.resolved)} hint={`${stats.total} total cases`} />
        <StatCard label="Avg TTR" value={stats.avg_ttr ? fmtTTR(0, Math.round(stats.avg_ttr)) : "—"} />
        <StatCard label="Error KB" value={String(stats.kb)} hint={`${stats.changes_active} active changes`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Open cases (${open.length})`} actions={<Link href="/cases" className="link text-xs">view all →</Link>}>
          {open.length === 0 ? (
            <Empty>No open cases. Quiet network today.</Empty>
          ) : (
            <ul className="divide-y divide-edge">
              {open.map((c) => (
                <li key={c.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={`/cases/${c.id}`} className="group flex items-center gap-3">
                    <SeverityBadge severity={c.severity} />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg group-hover:text-accent">
                      {c.title}
                    </span>
                    <span className="hidden shrink-0 font-mono text-xs text-dim sm:inline">
                      <DateAgo ts={c.opened_at} />
                    </span>
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-1">
                    {c.client_name && <span className="label !text-[10px]">{c.client_name}</span>}
                    {(c.vendor_names ?? "").split("||").filter(Boolean).map((n, i) => (
                      <VendorChip key={n} name={n} color={(c.vendor_colors ?? "").split("||")[i] ?? "#38bdf8"} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title={`Upcoming changes (${upcoming.length})`} actions={<Link href="/changes" className="link text-xs">view all →</Link>}>
            {upcoming.length === 0 ? (
              <Empty>No active changes. <Link href="/changes/new" className="link">Register one</Link> with its rollback plan before touching production.</Empty>
            ) : (
              <ul className="divide-y divide-edge">
                {upcoming.map((ch) => (
                  <li key={ch.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className={`chip ${CHANGE_STATUS_CLASS[ch.status as ChangeStatus] ?? ""}`}>{ch.status}</span>
                    <Link href={`/changes/${ch.id}`} className="min-w-0 flex-1 truncate text-sm text-fg hover:text-accent">
                      {ch.title}
                    </Link>
                    <span className="shrink-0 font-mono text-xs text-dim">
                      {ch.window_start ? fmtDT(ch.window_start) : "unscheduled"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent error detections">
            {recentErrors.length === 0 ? (
              <Empty>
                No log patterns detected yet. Paste a log in the{" "}
                <Link href="/analyzer" className="link">Analyzer</Link> or add one to a case timeline.
              </Empty>
            ) : (
              <ul className="divide-y divide-edge">
                {recentErrors.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="led shrink-0 bg-amber text-amber" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/errors/${e.error_id}`} className="link text-sm">{e.title}</Link>
                      <div className="text-xs text-dim">
                        case <Link href={`/cases/${e.case_id}`} className="link">{e.case_title}</Link> · {fmtDT(e.created_at)}
                      </div>
                    </div>
                    {e.vendor_name && e.vendor_color && <VendorChip name={e.vendor_name} color={e.vendor_color} />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
