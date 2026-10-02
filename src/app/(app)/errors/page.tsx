import Link from "next/link";
import { listErrors } from "@/lib/queries";
import { Empty, VendorChip } from "@/components/ui";

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const rows = listErrors(sp.q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Error KB <span className="text-sm text-dim">({rows.length})</span></h1>
        <Link href="/errors/new" className="btn btn-accent">+ New error</Link>
      </div>

      <form method="get" className="input-row">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="search title / pattern / meaning…" className="field !w-96" />
        <button type="submit" className="btn">Search</button>
      </form>

      {rows.length === 0 ? (
        <Empty>No entries. Register the errors you meet repeatedly — with causes ranked by your own evidence.</Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="label px-3 py-2">Title</th>
                <th className="label px-3 py-2">Pattern</th>
                <th className="label px-3 py-2">Vendor</th>
                <th className="label px-3 py-2 text-right">Causes</th>
                <th className="label px-3 py-2 text-right">Cases</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="border-b border-edge/60 last:border-0 hover:bg-panel2/50">
                  <td className="px-3 py-2.5"><Link href={`/errors/${k.id}`} className="link">{k.title}</Link></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-sky">{k.pattern}</td>
                  <td className="px-3 py-2.5">
                    {k.vendor_name && k.vendor_color
                      ? <VendorChip name={k.vendor_name} color={k.vendor_color} />
                      : <span className="text-dim">multi</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-mute">{k.cause_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-mute">{k.case_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
