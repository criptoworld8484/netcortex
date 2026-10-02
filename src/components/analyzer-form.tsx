"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { analyzeLogAction, type AnalyzerState } from "@/lib/actions/analyzer";
import { guessVendorSlug } from "@/lib/match";
import { MD } from "./md";
import { Empty } from "./ui";

interface VendorOpt {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export function AnalyzerForm({ vendors }: { vendors: VendorOpt[] }) {
  const [state, action, pending] = useActionState<AnalyzerState, FormData>(analyzeLogAction, {
    groups: [],
    searched: false,
  });
  const [log, setLog] = useState("");
  const [vendor, setVendor] = useState("");
  const [vendorTouched, setVendorTouched] = useState(false);

  const detected =
    !vendorTouched && log.trim().length > 30
      ? (vendors.find((v) => v.slug === guessVendorSlug(log)) ?? null)
      : null;
  const effectiveVendor = vendorTouched ? vendor : detected ? String(detected.id) : "";

  const maxFreq = Math.max(1, ...state.groups.flatMap((g) => g.causes.map((c) => c.frequency)));

  return (
    <div className="space-y-6">
      <form action={action} className="panel space-y-3 p-4">
        <div className="flex items-end gap-3">
          <label className="grow">
            <span className="label mb-1 block">Paste log</span>
            <textarea
              name="log"
              rows={10}
              required
              className="field"
              placeholder="Paste syslog / debug output here…"
              value={log}
              onChange={(e) => setLog(e.target.value)}
            />
          </label>
        </div>
        <div className="flex items-end justify-between gap-3">
          <label className="w-64">
            <span className="label mb-1 block">
              Vendor filter {detected && <span className="!text-accent">(auto-detected: {detected.name})</span>}</span>
            <select
              name="vendor"
              className="field"
              value={effectiveVendor}
              onChange={(e) => {
                setVendor(e.target.value);
                setVendorTouched(true);
              }}
            >
              <option value="">all vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            {log.trim() && (
              <>
                <Link
                  href={`/assistant?log=${encodeURIComponent(log.slice(0, 60000))}`}
                  className="btn"
                  title="Anonymize this log and ask the AI assistant with your KB as context"
                >
                  Ask AI about this log
                </Link>
                <Link
                  href={`/cases/new?log=${encodeURIComponent(log.slice(0, 60000))}&vendor=${effectiveVendor}`}
                  className="btn"
                >
                  Create case from log
                </Link>
              </>
            )}
            <button type="submit" disabled={pending} className="btn btn-accent">
              {pending ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>
      </form>

      {state.error && <p className="text-sm text-red">{state.error}</p>}

      {state.searched && state.groups.length === 0 && !state.error && (
        <Empty>No known error patterns matched. Consider adding the error to the KB once diagnosed.</Empty>
      )}

      {state.groups.map((g) => (
        <article key={g.errorId} className="panel p-4">
          <header className="flex flex-wrap items-center gap-2">
            <Link href={`/errors/${g.errorId}`} className="link font-medium">{g.title}</Link>
            {g.vendorName && g.vendorColor && (
              <span className="chip" style={{ color: g.vendorColor, borderColor: `${g.vendorColor}66` }}>
                {g.vendorName}
              </span>
            )}
            <span className="chip border-edge text-dim">{g.patternType}</span>
            <span className="ml-auto font-mono text-xs text-dim">
              {g.relatedCount} linked case{g.relatedCount === 1 ? "" : "s"}
            </span>
          </header>

          <div className="mt-2">
            <p className="mono-block !text-[11px] text-sky">{g.pattern}</p>
          </div>

          <div className="mt-3 space-y-1">
            {g.lines.map((l) => (
              <div key={l.n} className="flex gap-3 font-mono text-xs">
                <span className="w-10 shrink-0 text-right text-dim">{l.n}</span>
                <span className="text-mute">{l.text}</span>
              </div>
            ))}
          </div>

          {g.meaning && (
            <div className="mt-3 border-t border-edge pt-3">
              <span className="label mb-1 block">Meaning</span>
              <MD>{g.meaning}</MD>
            </div>
          )}

          {g.causes.length > 0 && (
            <div className="mt-3 border-t border-edge pt-3">
              <span className="label mb-2 block">Likely causes (ranked by your own evidence)</span>
              <ol className="space-y-3">
                {g.causes.map((c, i) => (
                  <li key={c.id}>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-dim">{i + 1}.</span>
                      <span className="text-sm text-fg">{c.description}</span>
                      <span className="ml-auto font-mono text-xs text-dim">×{c.frequency}</span>
                    </div>
                    <div className="ml-5 mt-1 h-1 w-64 overflow-hidden rounded bg-panel2">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.max(6, (c.frequency / maxFreq) * 100)}%` }}
                      />
                    </div>
                    {(c.verify || c.fix) && (
                      <details className="block ml-5 mt-1">
                        <summary className="label">verify / fix</summary>
                        <div className="mt-2 space-y-2">
                          {c.verify && (
                            <div>
                              <span className="label">verify</span>
                              <MD>{c.verify}</MD>
                            </div>
                          )}
                          {c.fix && (
                            <div>
                              <span className="label">fix</span>
                              <MD>{c.fix}</MD>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
