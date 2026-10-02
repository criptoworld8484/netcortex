import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCase,
  getCaseErrors,
  getCaseTechnologies,
  getCaseVendors,
  getEvents,
  getSnapshots,
  listClients,
  listErrors,
  listTechnologies,
  listVendors,
} from "@/lib/queries";
import { all } from "@/lib/db";
import { fmtDT, fmtTTR } from "@/lib/constants";
import { Empty, KindTag, Panel, SeverityBadge, StatusBadge, Tabs, VendorChip } from "@/components/ui";
import { MD } from "@/components/md";
import { CmdBlock, LogOutput } from "@/components/copy";
import { QuickAppend } from "@/components/quick-append";
import { EditableMD } from "@/components/editable-md";
import { CaseMetaEdit } from "@/components/case-meta-edit";
import { SubmitButton } from "@/components/submit-button";
import {
  addSnapshotAction,
  deleteCaseAction,
  deleteEventAction,
  deleteSnapshotAction,
  linkErrorAction,
  markCauseAction,
  unlinkErrorAction,
  updateNarrativeAction,
} from "@/lib/actions/cases";

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const caseId = Number(id);
  if (!caseId || Number.isNaN(caseId)) notFound();

  const c = getCase(caseId);
  if (!c) notFound();

  const sp = await searchParams;
  const tab = sp.tab ?? "timeline";

  const [events, vendors, caseVendors, caseTechs, clients, allVendors, allTechs, caseErrors, kbErrors, snapshots] =
    await Promise.all([
      getEvents(caseId),
      listVendors(),
      getCaseVendors(caseId),
      getCaseTechnologies(caseId),
      listClients(),
      listVendors(),
      listTechnologies(),
      getCaseErrors(caseId),
      listErrors(),
      getSnapshots(caseId),
    ]);

  const causeRows = caseErrors.length
    ? all<{ id: number; error_id: number; description: string; frequency: number }>(
        `SELECT id, error_id, description, frequency FROM error_causes WHERE error_id IN (${caseErrors.map(() => "?").join(",")}) ORDER BY frequency DESC`,
        ...caseErrors.map((e) => e.error_id)
      )
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/cases" className="btn btn-ghost">← Cases</Link>
        <form action={deleteCaseAction}>
          <input type="hidden" name="id" value={c.id} />
          <SubmitButton className="btn btn-danger !py-1" confirm={`Delete case #${c.id} and its whole timeline?`}>
            delete case
          </SubmitButton>
        </form>
      </div>

      <header className="panel p-5">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 flex-1 text-lg font-semibold">{c.title}</h1>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={c.severity} />
            <StatusBadge status={c.status} />
            <CaseMetaEdit
              caseData={{
                id: c.id,
                title: c.title,
                status: c.status,
                severity: c.severity,
                client_id: c.client_id,
                vendorIds: caseVendors.map((v) => v.id),
                techIds: caseTechs.map((t) => t.id),
                tags: c.tag_names ?? "",
              }}
              clients={clients.map((cl) => ({ id: cl.id, name: cl.name }))}
              vendors={allVendors.map((v) => ({ id: v.id, name: v.name, color: v.color }))}
              techs={allTechs.map((t) => ({ id: t.id, name: t.name, category: t.category }))}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-dim">
          <span>#{c.id}</span>
          {c.client_name && <span className="text-mute">{c.client_name}</span>}
          <span>opened {fmtDT(c.opened_at)}</span>
          {c.resolved_at && <span>resolved {fmtDT(c.resolved_at)} · TTR {fmtTTR(c.opened_at, c.resolved_at)}</span>}
          {c.tag_names && (
            <span className="flex gap-1">
              {c.tag_names.split(", ").map((t) => (
                <span key={t} className="chip border-edge text-mute">#{t}</span>
              ))}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {caseVendors.map((v) => <VendorChip key={v.id} name={v.name} color={v.color} />)}
          {caseTechs.map((t) => <span key={t.id} className="chip border-edge text-dim">{t.name}</span>)}
        </div>
      </header>

      <Tabs
        tabs={[
          { key: "timeline", label: "Timeline", href: `/cases/${c.id}`, active: tab === "timeline", count: events.length },
          { key: "narrative", label: "Analysis", href: `/cases/${c.id}?tab=narrative`, active: tab === "narrative" },
          { key: "errors", label: "Errors", href: `/cases/${c.id}?tab=errors`, active: tab === "errors", count: caseErrors.length },
          { key: "files", label: "Files", href: `/cases/${c.id}?tab=files`, active: tab === "files", count: snapshots.length },
        ]}
      />

      {tab === "timeline" && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <Empty>No events yet. Capture the troubleshooting flow below as it happens.</Empty>
          ) : (
            <ol className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="panel group px-4 py-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-dim">
                      {new Date(e.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <KindTag kind={e.kind} />
                    {e.device_label && <span className="chip border-edge text-mute">{e.device_label}</span>}
                    {e.vendor_name && e.vendor_color && <VendorChip name={e.vendor_name} color={e.vendor_color} />}
                    <form action={deleteEventAction} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="caseId" value={c.id} />
                      <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px]" confirm="Delete this event?">✕</SubmitButton>
                    </form>
                  </div>

                  {e.kind === "command" ? (
                    <>
                      <CmdBlock cmd={e.body} />
                      {e.output.trim() && (
                        <details className="block mt-2">
                          <summary className="label">output</summary>
                          <div className="mt-2"><LogOutput text={e.output} /></div>
                        </details>
                      )}
                    </>
                  ) : e.kind === "log" ? (
                    <>
                      {e.body.trim() && <p className="mb-2 text-sm text-mute">{e.body}</p>}
                      <details className="block" open={e.output.length < 2500}>
                        <summary className="label">log capture</summary>
                        <div className="mt-2"><LogOutput text={e.output} /></div>
                      </details>
                    </>
                  ) : e.kind === "resolution" ? (
                    <div className="rounded-md border border-green/30 bg-green/5 px-4 py-2">
                      <MD>{e.body}</MD>
                    </div>
                  ) : (
                    <MD>{e.body}</MD>
                  )}
                </li>
              ))}
            </ol>
          )}
          <QuickAppend caseId={c.id} vendors={vendors.map((v) => ({ id: v.id, name: v.name, color: v.color }))} />
        </div>
      )}

      {tab === "narrative" && (
        <div className="space-y-4">
          <Panel title="Symptom">
            <EditableMD entityId={c.id} field="symptom" label="as reported / observed" value={c.symptom}
              placeholder="Describe what is failing, since when, impact…" action={updateNarrativeAction} />
          </Panel>
          <Panel title="Root cause">
            <EditableMD entityId={c.id} field="root_cause" label="what was actually broken" value={c.root_cause}
              placeholder="Fill once diagnosed — this is the knowledge future-you will search for." action={updateNarrativeAction} />
          </Panel>
          <Panel title="Solution">
            <EditableMD entityId={c.id} field="solution" label="how it was fixed" value={c.solution}
              placeholder="Commands applied, changes made, verification steps (markdown)." action={updateNarrativeAction} />
          </Panel>
        </div>
      )}

      {tab === "errors" && (
        <div className="space-y-4">
          <Panel title="Link an error manually">
            <form action={linkErrorAction} className="input-row">
              <input type="hidden" name="caseId" value={c.id} />
              <select name="errorId" className="field !w-96" required defaultValue="">
                <option value="" disabled>select Error KB entry…</option>
                {kbErrors.map((k) => (
                  <option key={k.id} value={k.id}>{k.title}</option>
                ))}
              </select>
              <input name="note" className="field !w-64" placeholder="note (optional)" />
              <SubmitButton className="btn">Link</SubmitButton>
            </form>
          </Panel>

          {caseErrors.length === 0 ? (
            <Empty>No errors linked. Log events matching KB patterns are linked automatically.</Empty>
          ) : (
            <div className="space-y-2">
              {caseErrors.map((ce) => {
                const causes = causeRows.filter((cr) => cr.error_id === ce.error_id);
                return (
                  <div key={ce.id} className="panel px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="led bg-amber text-amber" />
                      <Link href={`/errors/${ce.error_id}`} className="link text-sm font-medium">{ce.title}</Link>
                      {ce.vendor_name && ce.vendor_color && <VendorChip name={ce.vendor_name} color={ce.vendor_color} />}
                      <span className="font-mono text-xs text-dim">linked {fmtDT(ce.created_at)}</span>
                      <form action={unlinkErrorAction} className="ml-auto">
                        <input type="hidden" name="id" value={ce.id} />
                        <input type="hidden" name="caseId" value={c.id} />
                        <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px]" confirm="Unlink this error from the case?">✕</SubmitButton>
                      </form>
                    </div>
                    {ce.note && <p className="mt-1 text-xs text-dim">{ce.note}</p>}

                    {causes.length > 0 && (
                      <form action={markCauseAction} className="input-row mt-2">
                        <input type="hidden" name="id" value={ce.id} />
                        <input type="hidden" name="caseId" value={c.id} />
                        <span className="label pb-1.5">{ce.cause_id ? "actual cause ✓ (counts toward ranking)" : "mark actual cause:"}</span>
                        <select name="causeId" className="field !w-96" defaultValue={ce.cause_id ?? ""}>
                          {causes.map((cr) => (
                            <option key={cr.id} value={cr.id}>{cr.description} (×{cr.frequency})</option>
                          ))}
                        </select>
                        <SubmitButton className="btn !py-1">{ce.cause_id ? "update" : "mark"}</SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "files" && (
        <div className="space-y-4">
          <Panel title="Add capture (paste)">
            <form action={addSnapshotAction} className="space-y-3">
              <input type="hidden" name="caseId" value={c.id} />
              <div className="input-row">
                <input name="filename" className="field !w-56" placeholder="filename e.g. fgw1-config.txt" required />
                <select name="kind" className="field !w-32" defaultValue="config">
                  <option value="pre">pre</option>
                  <option value="post">post</option>
                  <option value="config">config</option>
                  <option value="log">log</option>
                  <option value="other">other</option>
                </select>
                <input name="device" className="field !w-44" placeholder="device label" />
                <select name="vendor" className="field !w-40" defaultValue="">
                  <option value="">vendor…</option>
                  {allVendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <textarea name="content" rows={6} className="field" placeholder="Paste config / capture content…" required />
              <SubmitButton className="btn">Add file</SubmitButton>
            </form>
          </Panel>

          {snapshots.length === 0 ? (
            <Empty>No captures stored. Pre/post configs are gold for post-mortems and rollbacks.</Empty>
          ) : (
            <div className="space-y-2">
              {snapshots.map((s) => (
                <div key={s.id} className="panel px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip border-edge text-accent">{s.kind}</span>
                    <span className="font-mono text-sm text-fg">{s.filename}</span>
                    {s.device_label && <span className="chip border-edge text-mute">{s.device_label}</span>}
                    {s.vendor_name && <span className="chip border-edge text-mute">{s.vendor_name}</span>}
                    <span className="font-mono text-xs text-dim">{fmtDT(s.created_at)}</span>
                    <form action={deleteSnapshotAction} className="ml-auto">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="caseId" value={c.id} />
                      <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px]" confirm="Delete this capture?">✕</SubmitButton>
                    </form>
                  </div>
                  <details className="block mt-2">
                    <summary className="label">content</summary>
                    <div className="mt-2"><LogOutput text={s.content} /></div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
