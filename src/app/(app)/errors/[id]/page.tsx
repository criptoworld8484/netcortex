import Link from "next/link";
import { notFound } from "next/navigation";
import { getCauses, getError, getRelatedCases, listVendors } from "@/lib/queries";
import { fmtDT, fmtTTR } from "@/lib/constants";
import { Empty, Field, Panel, SeverityBadge, VendorChip } from "@/components/ui";
import { MD } from "@/components/md";
import { SubmitButton } from "@/components/submit-button";
import { addCauseAction, deleteCauseAction, deleteErrorAction, updateCauseAction, updateErrorAction } from "@/lib/actions/errors";

export default async function ErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const errorId = Number(id);
  if (!errorId || Number.isNaN(errorId)) notFound();

  const k = getError(errorId);
  if (!k) notFound();

  const [causes, related, vendors] = await Promise.all([
    getCauses(errorId),
    getRelatedCases(errorId),
    listVendors(),
  ]);

  const links: string[] = (() => {
    try {
      return JSON.parse(k.kb_links || "[]") as string[];
    } catch {
      return [];
    }
  })();

  const maxFreq = Math.max(1, ...causes.map((c) => c.frequency));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/errors" className="btn btn-ghost">← Error KB</Link>
        <form action={deleteErrorAction}>
          <input type="hidden" name="id" value={k.id} />
          <SubmitButton className="btn btn-danger !py-1" confirm="Delete this KB entry, its causes and case links?">
            delete entry
          </SubmitButton>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Entry">
            <form action={updateErrorAction} className="space-y-4">
              <input type="hidden" name="id" value={k.id} />
              <Field label="Title">
                <input name="title" defaultValue={k.title} required className="field" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Pattern" className="sm:col-span-2">
                  <input name="pattern" defaultValue={k.pattern} required className="field font-mono" />
                </Field>
                <Field label="Type">
                  <select name="patternType" defaultValue={k.pattern_type} className="field">
                    <option value="exact">exact</option>
                    <option value="regex">regex</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Vendor scope">
                  <select name="vendor" defaultValue={k.vendor_id ?? ""} className="field">
                    <option value="">multi-vendor</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </Field>
                <Field label="Vendor KB links (one URL per line)" className="sm:col-span-2">
                  <textarea name="kbLinks" rows={2} className="field" defaultValue={links.join("\n")} />
                </Field>
              </div>
              <Field label="Meaning (markdown)">
                <textarea name="meaning" rows={5} className="field" defaultValue={k.meaning} />
              </Field>
              <SubmitButton className="btn btn-accent">Save entry</SubmitButton>
            </form>
          </Panel>

          <Panel title={`Causes (${causes.length}) — ranked by your evidence`}>
            {causes.length === 0 ? (
              <Empty>No causes registered yet.</Empty>
            ) : (
              <ol className="space-y-3">
                {causes.map((c, i) => (
                  <li key={c.id} className="rounded-md border border-edge/70 p-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-dim">{i + 1}.</span>
                      <span className="text-sm font-medium">{c.description}</span>
                      <span className="ml-auto font-mono text-xs text-accent">×{c.frequency}</span>
                    </div>
                    <div className="ml-5 mt-1.5 h-1 w-72 overflow-hidden rounded bg-panel2">
                      <div className="h-full bg-accent" style={{ width: `${Math.max(4, (c.frequency / maxFreq) * 100)}%` }} />
                    </div>
                    {(c.verify.trim() || c.fix.trim()) && (
                      <div className="ml-5 mt-2 space-y-2">
                        {c.verify.trim() && (
                          <div>
                            <span className="label">verify</span>
                            <MD>{c.verify}</MD>
                          </div>
                        )}
                        {c.fix.trim() && (
                          <div>
                            <span className="label">fix</span>
                            <MD>{c.fix}</MD>
                          </div>
                        )}
                      </div>
                    )}
                    <details className="block ml-5 mt-2">
                      <summary className="label">edit</summary>
                      <form action={updateCauseAction} className="mt-2 space-y-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="errorId" value={k.id} />
                        <input name="description" defaultValue={c.description} className="field" />
                        <textarea name="verify" defaultValue={c.verify} rows={4} className="field" placeholder="verify (markdown)" />
                        <textarea name="fix" defaultValue={c.fix} rows={3} className="field" placeholder="fix (markdown)" />
                        <SubmitButton className="btn !py-1">Save cause</SubmitButton>
                      </form>
                    </details>
                    <form action={deleteCauseAction} className="ml-5 mt-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="errorId" value={k.id} />
                      <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px] !text-red" confirm="Delete this cause?">
                        delete cause
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Add cause">
            <form action={addCauseAction} className="space-y-3">
              <input type="hidden" name="errorId" value={k.id} />
              <Field label="Description *">
                <input name="description" required className="field" placeholder="Mismatched PFS group on peers" />
              </Field>
              <Field label="How to verify (markdown)">
                <textarea name="verify" rows={4} className="field" placeholder="**FortiGate:** `get vpn ipsec phase2 detail`…" />
              </Field>
              <Field label="Fix (markdown)">
                <textarea name="fix" rows={3} className="field" />
              </Field>
              <SubmitButton className="btn">Add cause</SubmitButton>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Detection">
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-dim">pattern</span><span className="text-sky">{k.pattern}</span></div>
              <div className="flex justify-between"><span className="text-dim">type</span><span>{k.pattern_type}</span></div>
              <div className="flex justify-between">
                <span className="text-dim">vendor</span>
                {k.vendor_name && k.vendor_color
                  ? <VendorChip name={k.vendor_name} color={k.vendor_color} />
                  : <span className="text-mute">multi-vendor</span>}
              </div>
              <div className="flex justify-between"><span className="text-dim">updated</span><span>{fmtDT(k.updated_at)}</span></div>
            </div>
            {links.length > 0 && (
              <div className="mt-3 border-t border-edge pt-3">
                <span className="label mb-1 block">Vendor KB</span>
                <ul className="space-y-1 text-sm">
                  {links.map((l) => (
                    <li key={l}><a href={l} target="_blank" rel="noreferrer" className="link break-all">{l}</a></li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title={`Related cases (${related.length})`}>
            {related.length === 0 ? (
              <p className="text-sm text-dim">No cases linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {related.map((c) => (
                  <li key={c.id}>
                    <Link href={`/cases/${c.id}`} className="link text-sm">{c.title}</Link>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-dim">
                      <SeverityBadge severity={c.severity} />
                      {c.resolved_at ? <span>TTR {fmtTTR(c.opened_at, c.resolved_at)}</span> : <span className="text-amber">unresolved</span>}
                    </div>
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
