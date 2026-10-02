import Link from "next/link";
import { listPlaybooks } from "@/lib/queries";
import { Empty } from "@/components/ui";

export default async function PlaybooksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const rows = listPlaybooks(sp.q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Playbooks <span className="text-sm text-dim">({rows.length})</span>
        </h1>
        <Link href="/playbooks/new" className="btn btn-accent">+ New playbook</Link>
      </div>

      <form method="get" className="input-row">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="search playbooks…" className="field !w-80" />
        <button type="submit" className="btn">Search</button>
      </form>

      {rows.length === 0 ? (
        <Empty>No playbooks yet. Codify your methodology: steps, per-vendor checks and decision jumps.</Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <Link key={p.id} href={`/playbooks/${p.id}`} className="panel group p-4 transition-colors hover:border-accent/40">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-fg group-hover:text-accent">{p.title}</span>
                <span className="chip border-edge text-dim">{p.category}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-mute">{p.description || "No description."}</p>
              <div className="mt-2 flex gap-3 font-mono text-xs text-dim">
                <span>{p.step_count} steps</span>
                <Link href={`/playbooks/${p.id}?mode=run`} className="link">▶ run</Link>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
