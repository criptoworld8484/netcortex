import Link from "next/link";
import { listCommandCategories, listCommandRefs, listVendors } from "@/lib/queries";
import { CopyButton } from "@/components/copy";
import { Empty } from "@/components/ui";

export default async function CommandsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; vendor?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [{ refs, byRef }, vendors, categories] = await Promise.all([
    listCommandRefs({
      category: sp.category || undefined,
      vendorId: Number(sp.vendor) || undefined,
      q: sp.q || undefined,
    }),
    listVendors(),
    listCommandCategories(),
  ]);

  const lastCat = { current: "" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Commands <span className="text-sm text-dim">cross-vendor cheatsheet ({refs.length})</span>
        </h1>
        <Link href="/commands/new" className="btn btn-accent">+ New task</Link>
      </div>

      <form method="get" className="panel input-row p-3">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="search task / command…" className="field !w-64" />
        <select name="category" defaultValue={sp.category ?? ""} className="field !w-44">
          <option value="">all categories</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>{c.category} ({c.n})</option>
          ))}
        </select>
        <select name="vendor" defaultValue={sp.vendor ?? ""} className="field !w-36">
          <option value="">all vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <button type="submit" className="btn">Filter</button>
      </form>

      {refs.length === 0 ? (
        <Empty>No command tasks match. Add the equivalents you use the most.</Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="label sticky left-0 bg-panel px-3 py-2">Task</th>
                {vendors.map((v) => (
                  <th key={v.id} className="label px-3 py-2" style={{ color: v.color }}>{v.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {refs.map((r) => {
                const entries = byRef.get(r.id) ?? [];
                const newCat = r.category !== lastCat.current;
                lastCat.current = r.category;
                return (
                  <tr key={r.id} className="group border-b border-edge/60 align-top last:border-0 hover:bg-panel2/40">
                    <td className="sticky left-0 max-w-[220px] bg-panel px-3 py-2.5 group-hover:bg-panel2/40">
                      {newCat && (
                        <div className="label !text-[9px] !text-accent">{r.category}</div>
                      )}
                      <Link href={`/commands/${r.id}`} className="link">{r.task}</Link>
                    </td>
                    {vendors.map((v) => {
                      const e = entries.find((en) => en.vendor_id === v.id);
                      return (
                        <td key={v.id} className="px-3 py-2.5">
                          {e ? (
                            <div className="flex items-start gap-1.5">
                              <code
                                className="block max-w-[220px] truncate font-mono text-xs text-fg/90"
                                title={e.command}
                              >
                                {e.command.split("\n")[0]}
                              </code>
                              <CopyButton text={e.command} />
                            </div>
                          ) : (
                            <span className="text-dim">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
