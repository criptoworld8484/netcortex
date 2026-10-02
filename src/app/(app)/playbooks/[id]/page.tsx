import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaybook, listVendors } from "@/lib/queries";
import { serializeBranches, STEP_KIND_CLASS, type StepBranch, type StepCheck } from "@/lib/constants";
import { Empty, Field, Panel } from "@/components/ui";
import { MD } from "@/components/md";
import { CopyButton } from "@/components/copy";
import { SubmitButton } from "@/components/submit-button";
import { Walkthrough } from "@/components/walkthrough";
import {
  addStepAction,
  deletePlaybookAction,
  deleteStepAction,
  moveStepAction,
  updatePlaybookAction,
  updateStepAction,
} from "@/lib/actions/playbooks";

export default async function PlaybookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const pbId = Number(id);
  if (!pbId || Number.isNaN(pbId)) notFound();

  const data = getPlaybook(pbId);
  if (!data) notFound();

  const sp = await searchParams;
  const runMode = sp.mode === "run";
  const vendors = await listVendors();
  const { playbook, steps } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/playbooks" className="btn btn-ghost">← Playbooks</Link>
        <div className="flex items-center gap-2">
          {!runMode && <Link href={`/playbooks/${pbId}?mode=run`} className="btn btn-accent !py-1">▶ Run</Link>}
          <form action={deletePlaybookAction}>
            <input type="hidden" name="id" value={pbId} />
            <SubmitButton className="btn btn-danger !py-1" confirm="Delete this playbook and all its steps?">
              delete
            </SubmitButton>
          </form>
        </div>
      </div>

      {runMode ? (
        <Walkthrough
          playbookId={pbId}
          title={playbook.title}
          vendors={vendors.map((v) => ({ id: v.id, name: v.name, color: v.color }))}
          steps={steps.map((s) => ({
            id: s.id,
            position: s.position,
            kind: s.kind,
            text: s.text,
            checks: safeParse<StepCheck[]>(s.checks) ?? [],
            branches: safeParse<StepBranch[]>(s.branches) ?? [],
          }))}
        />
      ) : (
        <>
          <header className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="text-lg font-semibold">{playbook.title}</h1>
              <span className="chip border-edge text-dim">{playbook.category}</span>
            </div>
            <div className="mt-2">
              <MD>{playbook.description}</MD>
            </div>
          </header>

          <Panel title={`Steps (${steps.length})`}>
            {steps.length === 0 ? (
              <Empty>No steps yet. Add the first one below.</Empty>
            ) : (
              <ol className="space-y-3">
                {steps.map((s) => {
                  const checks = safeParse<StepCheck[]>(s.checks) ?? [];
                  const branches = safeParse<StepBranch[]>(s.branches) ?? [];
                  return (
                    <li key={s.id} className="rounded-md border border-edge/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-dim">#{s.position}</span>
                        <span className={`chip border uppercase ${STEP_KIND_CLASS[s.kind as "action"] ?? "text-mute border-edge"}`}>
                          {s.kind}
                        </span>
                        <div className="ml-auto flex gap-1">
                          <form action={moveStepAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="playbookId" value={pbId} />
                            <input type="hidden" name="dir" value="up" />
                            <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px]" >↑</SubmitButton>
                          </form>
                          <form action={moveStepAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="playbookId" value={pbId} />
                            <input type="hidden" name="dir" value="down" />
                            <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px]">↓</SubmitButton>
                          </form>
                          <form action={deleteStepAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="playbookId" value={pbId} />
                            <SubmitButton className="btn btn-ghost !px-1.5 !py-0 !text-[10px] !text-red" confirm={`Delete step #${s.position}?`}>✕</SubmitButton>
                          </form>
                        </div>
                      </div>
                      <p className="mt-1.5 text-sm text-fg">{s.text}</p>

                      {checks.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {checks.map((c) => {
                            const v = vendors.find((x) => x.id === c.vendor_id);
                            return (
                              <div key={c.vendor_id} className="flex items-start gap-2">
                                {v && <span className="chip shrink-0" style={{ color: v.color, borderColor: `${v.color}66` }}>{v.name}</span>}
                                <div className="mono-block flex min-w-0 flex-1 items-start justify-between gap-2 !py-0.5">
                                  <code className="block text-accent">{c.command}</code>
                                  <CopyButton text={c.command} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {branches.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {branches.map((b, bi) => (
                            <span key={bi} className="chip border-amber/40 text-amber">
                              {b.label} → {b.target === "next" ? "next" : `#${b.target}`}
                            </span>
                          ))}
                        </div>
                      )}

                      <details className="block mt-2">
                        <summary className="label">edit step</summary>
                        <form action={updateStepAction} className="mt-2 space-y-2">
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="playbookId" value={pbId} />
                          <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                            <select name="kind" defaultValue={s.kind} className="field">
                              <option value="action">action</option>
                              <option value="question">question</option>
                              <option value="note">note</option>
                            </select>
                            <textarea name="text" defaultValue={s.text} rows={2} className="field" />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {vendors.map((v) => (
                              <label key={v.id} className="grid grid-cols-[90px_1fr] items-center gap-1.5">
                                <span className="label truncate" style={{ color: v.color }}>{v.name}</span>
                                <input name={`check_${v.id}`} className="field !py-1 !text-xs"
                                  defaultValue={checks.find((c) => c.vendor_id === v.id)?.command ?? ""}
                                  placeholder={`${v.name} check…`} />
                              </label>
                            ))}
                          </div>
                          {s.kind === "question" && (
                            <Field label="Branches (one per line: label => 5  |  label => next)">
                              <textarea name="branches" rows={2} className="field" defaultValue={serializeBranches(branches)}
                                placeholder={"Yes — phase 1 ok => next\nNo — phase 1 issues => 3"} />
                            </Field>
                          )}
                          <SubmitButton className="btn !py-1">Save step</SubmitButton>
                        </form>
                      </details>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <Panel title="Add step">
            <form action={addStepAction} className="space-y-3">
              <input type="hidden" name="playbookId" value={pbId} />
              <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                <Field label="Kind">
                  <select name="kind" className="field" defaultValue="action">
                    <option value="action">action</option>
                    <option value="question">question</option>
                    <option value="note">note</option>
                  </select>
                </Field>
                <Field label="Text">
                  <textarea name="text" rows={2} required className="field" placeholder="What to do or ask…" />
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {vendors.map((v) => (
                  <label key={v.id} className="grid grid-cols-[90px_1fr] items-center gap-1.5">
                    <span className="label truncate" style={{ color: v.color }}>{v.name}</span>
                    <input name={`check_${v.id}`} className="field !py-1 !text-xs" placeholder={`${v.name} check…`} />
                  </label>
                ))}
              </div>
              <Field label="Branches for questions (label => step# | label => next)">
                <textarea name="branches" rows={2} className="field" placeholder={"No — L3 issue => 7\nYes — continue => next"} />
              </Field>
              <SubmitButton className="btn">Add step</SubmitButton>
            </form>
          </Panel>

          <Panel title="Playbook meta">
            <form action={updatePlaybookAction} className="space-y-3">
              <input type="hidden" name="id" value={pbId} />
              <Field label="Title">
                <input name="title" defaultValue={playbook.title} required className="field" />
              </Field>
              <Field label="Category">
                <input name="category" defaultValue={playbook.category} className="field" />
              </Field>
              <Field label="Description (markdown)">
                <textarea name="description" defaultValue={playbook.description} rows={3} className="field" />
              </Field>
              <SubmitButton className="btn btn-accent">Save meta</SubmitButton>
            </form>
          </Panel>
        </>
      )}
    </div>
  );
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
