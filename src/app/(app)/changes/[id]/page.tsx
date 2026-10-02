import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getChange,
  getChangeCases,
  getChangeChecklist,
  getChangeFiles,
  getChangeTechnologies,
  getChangeVendors,
  listCases,
  listClients,
  listTechnologies,
  listVendors,
} from "@/lib/queries";
import {
  CHANGE_STATUSES,
  CHANGE_STATUS_CLASS,
  fmtDT,
  RISK_CLASS,
  msToLocalInput,
  type ChangeStatus,
  type Risk,
} from "@/lib/constants";
import { Empty, Field, Panel, Tabs, VendorChip } from "@/components/ui";
import { CmdBlock, LogOutput } from "@/components/copy";
import { EditableMD } from "@/components/editable-md";
import { SubmitButton } from "@/components/submit-button";
import { VendorCheck } from "@/components/vendor-check";
import {
  addChangeFileAction,
  addChecklistItemAction,
  deleteChangeAction,
  deleteChangeFileAction,
  deleteChecklistItemAction,
  linkCaseAction,
  saveChecklistOutputAction,
  toggleChecklistItemAction,
  setChangeStatusAction,
  unlinkCaseAction,
  updateChangeMetaAction,
  updateChangeNarrativeAction,
} from "@/lib/actions/changes";

export default async function ChangeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const changeId = Number(id);
  if (!changeId || Number.isNaN(changeId)) notFound();

  const ch = getChange(changeId);
  if (!ch) notFound();

  const sp = await searchParams;
  const tab = sp.tab ?? "plan";

  const [vendors, changeVendors, changeTechs, checklist, files, linkedCases, allClients, allVendors, allTechs, caseOptions] =
    await Promise.all([
      listVendors(),
      getChangeVendors(changeId),
      getChangeTechnologies(changeId),
      getChangeChecklist(changeId),
      getChangeFiles(changeId),
      getChangeCases(changeId),
      listClients(),
      listVendors(),
      listTechnologies(),
      listCases({}),
    ]);

  const linkedIds = new Set(linkedCases.map((c) => c.case_id));
  const doneCount = checklist.filter((k) => k.done).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/changes" className="btn btn-ghost">← Changes</Link>
        <form action={deleteChangeAction}>
          <input type="hidden" name="id" value={ch.id} />
          <SubmitButton className="btn btn-danger !py-1" confirm="Delete this change and all its data?">
            delete change
          </SubmitButton>
        </form>
      </div>

      <header className="panel p-5">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 flex-1 text-lg font-semibold">{ch.title}</h1>
          <span className={`chip ${RISK_CLASS[ch.risk as Risk] ?? ""}`}>{ch.risk} risk</span>
          <span className={`chip ${CHANGE_STATUS_CLASS[ch.status as ChangeStatus] ?? ""}`}>
            <span className="led bg-current" />
            {ch.status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-dim">
          <span>#{ch.id}</span>
          {ch.client_name && <span className="text-mute">{ch.client_name}</span>}
          {ch.requested_by && <span>req: {ch.requested_by}</span>}
          {ch.window_start && (
            <span>
              window {fmtDT(ch.window_start)} → {ch.window_end ? fmtDT(ch.window_end) : "…"}
            </span>
          )}
          <span>created {fmtDT(ch.created_at)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {changeVendors.map((v) => <VendorChip key={v.id} name={v.name} color={v.color} />)}
          {changeTechs.map((t) => <span key={t.id} className="chip border-edge text-dim">{t.name}</span>)}
        </div>

        <form action={setChangeStatusAction} className="input-row mt-4 border-t border-edge pt-3">
          <input type="hidden" name="id" value={ch.id} />
          <span className="label pb-1.5">Move to:</span>
          <select name="status" className="field !w-44" defaultValue={ch.status}>
            {CHANGE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <SubmitButton className="btn !py-1">Update status</SubmitButton>
        </form>
      </header>

      <Tabs
        tabs={[
          { key: "plan", label: "Plan", href: `/changes/${ch.id}`, active: tab === "plan" },
          { key: "checklist", label: "Checklist", href: `/changes/${ch.id}?tab=checklist`, active: tab === "checklist", count: checklist.length },
          { key: "files", label: "Files", href: `/changes/${ch.id}?tab=files`, active: tab === "files", count: files.length },
          { key: "cases", label: "Cases", href: `/changes/${ch.id}?tab=cases`, active: tab === "cases", count: linkedCases.length },
        ]}
      />

      {tab === "plan" && (
        <div className="space-y-4">
          <Panel title="Description">
            <EditableMD entityId={ch.id} field="description" label="what & why" value={ch.description}
              placeholder="What changes, why, expected impact…" action={updateChangeNarrativeAction} />
          </Panel>
          <Panel title="Planned config">
            <EditableMD entityId={ch.id} field="planned_config" label="commands to apply, in order" value={ch.planned_config}
              placeholder="The exact commands/config that will be applied (markdown)." action={updateChangeNarrativeAction} />
          </Panel>
          <Panel title="Rollback plan">
            <EditableMD entityId={ch.id} field="rollback_plan" label="how to revert" value={ch.rollback_plan}
              placeholder="Write this BEFORE touching anything." action={updateChangeNarrativeAction} />
          </Panel>
          <Panel title="Edit metadata">
            <form action={updateChangeMetaAction} className="space-y-3">
              <input type="hidden" name="id" value={ch.id} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Title" className="sm:col-span-2">
                  <input name="title" defaultValue={ch.title} required className="field" />
                </Field>
                <Field label="Risk">
                  <select name="risk" defaultValue={ch.risk} className="field">
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select name="status" defaultValue={ch.status} className="field">
                    {CHANGE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Client">
                  <select name="clientId" defaultValue={ch.client_id ?? ""} className="field">
                    <option value="">— none —</option>
                    {allClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Requested by">
                  <input name="requestedBy" defaultValue={ch.requested_by} className="field" />
                </Field>
                <Field label="Window start">
                  <input type="datetime-local" name="windowStart" className="field" defaultValue={msToLocalInput(ch.window_start)} />
                </Field>
                <Field label="Window end">
                  <input type="datetime-local" name="windowEnd" className="field" defaultValue={msToLocalInput(ch.window_end)} />
                </Field>
              </div>
              <div>
                <span className="label mb-1.5 block">Vendors</span>
                <div className="flex flex-wrap gap-2">
                  {allVendors.map((v) => (
                    <VendorCheck key={v.id} id={v.id} name={v.name} color={v.color}
                      defaultChecked={changeVendors.some((cv) => cv.id === v.id)} />
                  ))}
                </div>
              </div>
              <div>
                <span className="label mb-1.5 block">Technologies</span>
                <div className="flex flex-wrap gap-1.5">
                  {allTechs.map((t) => (
                    <label key={t.id} className="chip cursor-pointer border-edge text-mute has-checked:border-accent/50 has-checked:text-accent">
                      <input type="checkbox" name="techs" value={t.id} className="accent-(--color-accent)"
                        defaultChecked={changeTechs.some((ct) => ct.id === t.id)} />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton className="btn btn-accent">Save metadata</SubmitButton>
            </form>
          </Panel>
        </div>
      )}

      {tab === "checklist" && (
        <div className="space-y-4">
          {checklist.length > 0 && (
            <p className="font-mono text-xs text-dim">
              {doneCount}/{checklist.length} done — {doneCount === checklist.length && checklist.length > 0 ? "all checks passed ✓" : "pending verification"}
            </p>
          )}
          {checklist.length === 0 ? (
            <Empty>No verification steps yet. Define what proves the change worked BEFORE executing it.</Empty>
          ) : (
            <ol className="space-y-2">
              {checklist.map((k) => (
                <li key={k.id} className={`panel px-4 py-3 ${k.done ? "border-green/30" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={toggleChecklistItemAction}>
                      <input type="hidden" name="id" value={k.id} />
                      <input type="hidden" name="changeId" value={ch.id} />
                      <SubmitButton className={`btn !px-2 !py-0.5 ${k.done ? "btn-accent" : ""}`}>
                        {k.done ? "✓" : "○"}
                      </SubmitButton>
                    </form>
                    <span className={`text-sm ${k.done ? "text-mute line-through" : "text-fg"}`}>{k.text}</span>
                    <form action={deleteChecklistItemAction} className="ml-auto">
                      <input type="hidden" name="id" value={k.id} />
                      <input type="hidden" name="changeId" value={ch.id} />
                      <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px] !text-red" confirm="Delete this check?">✕</SubmitButton>
                    </form>
                  </div>
                  {k.command && <div className="mt-2"><CmdBlock cmd={k.command} /></div>}
                  {(k.output || true) && (
                    <details className="block mt-1" open={!!k.output}>
                      <summary className="label">evidence / output</summary>
                      <form action={saveChecklistOutputAction} className="mt-2 space-y-2">
                        <input type="hidden" name="id" value={k.id} />
                        <input type="hidden" name="changeId" value={ch.id} />
                        <textarea name="output" defaultValue={k.output} rows={3} className="field" placeholder="Paste the verification output here…" />
                        <SubmitButton className="btn !py-1">Save output</SubmitButton>
                      </form>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}
          <Panel title="Add verification step">
            <form action={addChecklistItemAction} className="space-y-3">
              <input type="hidden" name="changeId" value={ch.id} />
              <Field label="What to verify *">
                <input name="text" required className="field" placeholder="Tunnel up and traffic flowing through new policy" />
              </Field>
              <Field label="Command (optional)">
                <input name="command" className="field font-mono" placeholder="diag vpn tunnel list" />
              </Field>
              <SubmitButton className="btn">Add check</SubmitButton>
            </form>
          </Panel>
        </div>
      )}

      {tab === "files" && (
        <div className="space-y-4">
          <Panel title="Add capture (paste)">
            <form action={addChangeFileAction} className="space-y-3">
              <input type="hidden" name="changeId" value={ch.id} />
              <div className="input-row">
                <input name="filename" className="field !w-56" placeholder="filename e.g. pre-fw-policy.txt" required />
                <select name="kind" className="field !w-32" defaultValue="pre">
                  <option value="pre">pre</option>
                  <option value="post">post</option>
                  <option value="config">config</option>
                  <option value="other">other</option>
                </select>
                <input name="device" className="field !w-44" placeholder="device label" />
                <select name="vendor" className="field !w-40" defaultValue="">
                  <option value="">vendor…</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <textarea name="content" rows={6} className="field" placeholder="Paste pre/post config or evidence…" required />
              <SubmitButton className="btn">Add file</SubmitButton>
            </form>
          </Panel>

          {files.length === 0 ? (
            <Empty>No captures. Pre/post config pairs make rollbacks and post-mortems painless.</Empty>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="panel px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip border ${f.kind === "pre" ? "text-amber border-amber/40" : f.kind === "post" ? "text-green border-green/40" : "text-accent border-accent/40"}`}>{f.kind}</span>
                    <span className="font-mono text-sm text-fg">{f.filename}</span>
                    {f.device_label && <span className="chip border-edge text-mute">{f.device_label}</span>}
                    {f.vendor_name && <span className="chip border-edge text-mute">{f.vendor_name}</span>}
                    <span className="font-mono text-xs text-dim">{fmtDT(f.created_at)}</span>
                    <form action={deleteChangeFileAction} className="ml-auto">
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="changeId" value={ch.id} />
                      <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px]" confirm="Delete this capture?">✕</SubmitButton>
                    </form>
                  </div>
                  <details className="block mt-2">
                    <summary className="label">content</summary>
                    <div className="mt-2"><LogOutput text={f.content} /></div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "cases" && (
        <div className="space-y-4">
          <Panel title="Link a case">
            <form action={linkCaseAction} className="input-row">
              <input type="hidden" name="changeId" value={ch.id} />
              <select name="caseId" className="field !w-96" required defaultValue="">
                <option value="" disabled>select case…</option>
                {caseOptions
                  .filter((c) => !linkedIds.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>#{c.id} · {c.title}</option>
                  ))}
              </select>
              <SubmitButton className="btn">Link</SubmitButton>
            </form>
          </Panel>

          {linkedCases.length === 0 ? (
            <Empty>No linked cases. Link incidents caused or related to this change.</Empty>
          ) : (
            <div className="space-y-2">
              {linkedCases.map((c) => (
                <div key={c.case_id} className="panel flex flex-wrap items-center gap-3 px-4 py-3">
                  <Link href={`/cases/${c.case_id}`} className="link text-sm">#{c.case_id} · {c.title}</Link>
                  <span className="chip border-edge text-dim">{c.status}</span>
                  <span className="chip border-edge text-dim">{c.severity}</span>
                  <form action={unlinkCaseAction} className="ml-auto">
                    <input type="hidden" name="changeId" value={ch.id} />
                    <input type="hidden" name="caseId" value={c.case_id} />
                    <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px]" confirm="Unlink this case?">✕</SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
