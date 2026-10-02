import Link from "next/link";
import { searchAll } from "@/lib/queries";
import { Empty, Panel } from "@/components/ui";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const r = q
    ? searchAll(q)
    : { cases: [], events: [], errors: [], commands: [], playbooks: [] };
  const { cases, events, errors, commands, playbooks } = r;
  const total = cases.length + events.length + errors.length + commands.length + playbooks.length;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        Search {q && <span className="font-mono text-sm text-accent">“{q}”</span>}
      </h1>

      <form method="get" className="input-row">
        <input name="q" defaultValue={q} placeholder="cases, timeline entries, error KB…" className="field !w-96" autoFocus />
        <button type="submit" className="btn">Search</button>
      </form>

      {!q ? (
        <Empty>Type a query. Full-text search covers case titles/analysis, every timeline event, and the Error KB.</Empty>
      ) : total === 0 ? (
        <Empty>No results for “{q}”.</Empty>
      ) : (
        <div className="space-y-4">
          {cases.length > 0 && (
            <Panel title={`Cases (${cases.length})`}>
              <ul className="divide-y divide-edge">
                {cases.map((h) => (
                  <li key={h.id} className="py-2 first:pt-0 last:pb-0">
                    <Link href={`/cases/${h.id}`} className="link text-sm">{h.title}</Link>
                    <span className="ml-2 font-mono text-xs text-dim">{h.meta}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {events.length > 0 && (
            <Panel title={`Timeline events (${events.length})`}>
              <ul className="divide-y divide-edge">
                {events.map((h) => (
                  <li key={h.extra} className="py-2 first:pt-0 last:pb-0">
                    <Link href={`/cases/${h.id}`} className="link text-sm">{h.title}</Link>
                    <span className="ml-2 chip border-edge text-dim">{h.meta}</span>
                    <p className="mt-0.5 truncate font-mono text-xs text-mute">{h.snippet}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {errors.length > 0 && (
            <Panel title={`Error KB (${errors.length})`}>
              <ul className="divide-y divide-edge">
                {errors.map((h) => (
                  <li key={h.id} className="py-2 first:pt-0 last:pb-0">
                    <Link href={`/errors/${h.id}`} className="link text-sm">{h.title}</Link>
                    <span className="ml-2 font-mono text-xs text-dim">{h.meta} · {h.snippet}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {commands.length > 0 && (
            <Panel title={`Commands (${commands.length})`}>
              <ul className="divide-y divide-edge">
                {commands.map((h) => (
                  <li key={h.id} className="py-2 first:pt-0 last:pb-0">
                    <Link href={`/commands/${h.id}`} className="link text-sm">{h.title}</Link>
                    {h.snippet && <span className="ml-2 font-mono text-xs text-dim">{h.snippet.split("\n")[0]}</span>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {playbooks.length > 0 && (
            <Panel title={`Playbooks (${playbooks.length})`}>
              <ul className="divide-y divide-edge">
                {playbooks.map((h) => (
                  <li key={h.id} className="py-2 first:pt-0 last:pb-0">
                    <Link href={`/playbooks/${h.id}`} className="link text-sm">▶ {h.title}</Link>
                    <span className="ml-2 font-mono text-xs text-dim">{h.meta}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
