import Link from "next/link";
import { listChanges, listClients } from "@/lib/queries";
import { CHANGE_STATUSES, CHANGE_STATUS_CLASS, fmtDT, RISK_CLASS, type ChangeStatus, type Risk } from "@/lib/constants";
import { Empty, VendorChip } from "@/components/ui";

const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  approved: 1,
  scheduled: 2,
  executed: 3,
  successful: 4,
  rolled_back: 4,
  failed: 4,
};

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [rows, clients] = await Promise.all([
    listChanges({
      status: sp.status || undefined,
      clientId: Number(sp.client) || undefined,
      q: sp.q || undefined,
    }),
    listClients(),
  ]);

  const active = rows.filter((r) => STATUS_ORDER[r.status] <= 2);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Changes <span className="text-sm text-dim">({active.length} active / {rows.length} total)</span>
        </h1>
        <Link href="/changes/new" className="btn btn-accent">+ New change</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/changes" className={`chip ${!sp.status ? "border-accent/50 text-accent" : "border-edge text-mute"}`}>all</Link>
        {CHANGE_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/changes?status=${s}`}
            className={`chip ${sp.status === s ? CHANGE_STATUS_CLASS[s] : "border-edge text-mute"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <form method="get" className="panel input-row p-3">
        <input type="hidden" name="status" value={sp.status ?? ""} />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="search changes…" className="field !w-56" />
        <select name="client" defaultValue={sp.client ?? ""} className="field !w-44">
          <option value="">any client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" className="btn">Filter</button>
      </form>

      {rows.length === 0 ? (
        <Empty>No changes registered. Track every client-requested change with its rollback plan here.</Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="label px-3 py-2">Title</th>
                <th className="label px-3 py-2">Client</th>
                <th className="label px-3 py-2">Vendors</th>
                <th className="label px-3 py-2">Risk</th>
                <th className="label px-3 py-2">Window</th>
                <th className="label px-3 py-2">Checklist</th>
                <th className="label px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ch) => (
                <tr key={ch.id} className="border-b border-edge/60 last:border-0 hover:bg-panel2/50">
                  <td className="max-w-md px-3 py-2.5">
                    <Link href={`/changes/${ch.id}`} className="link">{ch.title}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-mute">{ch.client_name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(ch.vendor_names ?? "").split("||").filter(Boolean).map((n, i) => (
                        <VendorChip key={n} name={n} color={(ch.vendor_colors ?? "").split("||")[i] ?? "#38bdf8"} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`chip ${RISK_CLASS[ch.risk as Risk] ?? ""}`}>{ch.risk}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-dim">
                    {ch.window_start ? fmtDT(ch.window_start) : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-mute">
                    {ch.checklist_done}/{ch.checklist_total}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`chip ${CHANGE_STATUS_CLASS[ch.status as ChangeStatus] ?? ""}`}>{ch.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
