import Link from "next/link";
import { listCases, listClients, listTechnologies, listVendors } from "@/lib/queries";
import { fmtDT, fmtTTR } from "@/lib/constants";
import { Empty, SeverityBadge, StatusBadge, VendorChip } from "@/components/ui";

interface SP {
  status?: string;
  severity?: string;
  vendor?: string;
  client?: string;
  tech?: string;
  q?: string;
}

export default async function CasesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [rows, vendors, clients, techs] = await Promise.all([
    listCases({
      status: sp.status || undefined,
      severity: sp.severity || undefined,
      vendorId: Number(sp.vendor) || undefined,
      clientId: Number(sp.client) || undefined,
      techId: Number(sp.tech) || undefined,
      q: sp.q || undefined,
    }),
    listVendors(),
    listClients(),
    listTechnologies(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Cases <span className="text-sm text-dim">({rows.length})</span></h1>
        <Link href="/cases/new" className="btn btn-accent">+ New case</Link>
      </div>

      <form method="get" className="panel input-row p-3">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="search text…" className="field !w-52" />
        <select name="status" defaultValue={sp.status ?? ""} className="field !w-36">
          <option value="">any status</option>
          <option value="open">open</option>
          <option value="in_progress">in progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
        <select name="severity" defaultValue={sp.severity ?? ""} className="field !w-28">
          <option value="">any sev</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
          <option value="P4">P4</option>
        </select>
        <select name="vendor" defaultValue={sp.vendor ?? ""} className="field !w-36">
          <option value="">any vendor</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select name="client" defaultValue={sp.client ?? ""} className="field !w-40">
          <option value="">any client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="tech" defaultValue={sp.tech ?? ""} className="field !w-40">
          <option value="">any technology</option>
          {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="submit" className="btn">Filter</button>
      </form>

      {rows.length === 0 ? (
        <Empty>No cases match. Register your first incident or import old ones as post-mortems.</Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="label px-3 py-2">Sev</th>
                <th className="label px-3 py-2">Title</th>
                <th className="label px-3 py-2">Client</th>
                <th className="label px-3 py-2">Vendors</th>
                <th className="label px-3 py-2">Status</th>
                <th className="label px-3 py-2">Opened</th>
                <th className="label px-3 py-2">TTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-edge/60 last:border-0 hover:bg-panel2/50">
                  <td className="px-3 py-2.5"><SeverityBadge severity={c.severity} /></td>
                  <td className="max-w-md px-3 py-2.5">
                    <Link href={`/cases/${c.id}`} className="link">{c.title}</Link>
                    {c.tech_names && <div className="mt-0.5 text-xs text-dim">{c.tech_names}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-mute">{c.client_name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(c.vendor_names ?? "").split("||").filter(Boolean).map((n, i) => (
                        <VendorChip key={n} name={n} color={(c.vendor_colors ?? "").split("||")[i] ?? "#38bdf8"} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-dim">{fmtDT(c.opened_at)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-mute">
                    {c.resolved_at ? fmtTTR(c.opened_at, c.resolved_at) : "—"}
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
