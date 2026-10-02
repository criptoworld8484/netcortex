"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createChangeAction } from "@/lib/actions/changes";
import { msToLocalInput } from "@/lib/constants";
import type { FormState } from "@/lib/actions/auth";
import { Field } from "./ui";
import { VendorCheck } from "./vendor-check";

interface Opt {
  id: number;
  name: string;
  slug?: string;
  color?: string;
  category?: string;
}

export function ChangeForm({
  clients,
  vendors,
  techs,
}: {
  clients: Opt[];
  vendors: Opt[];
  techs: Opt[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createChangeAction, {});
  // eslint-disable-next-line react-hooks/purity -- sensible default for a new form
  const nowLocal = msToLocalInput(Date.now());

  const techsByCat = techs.reduce<Record<string, Opt[]>>((acc, t) => {
    (acc[t.category ?? "General"] ??= []).push(t);
    return acc;
  }, {});

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title *" className="md:col-span-2">
          <input name="title" required className="field" placeholder="Add firewall policy for new branch subnet" autoFocus />
        </Field>
        <Field label="Status">
          <select name="status" className="field" defaultValue="draft">
            <option value="draft">draft</option>
            <option value="approved">approved</option>
            <option value="scheduled">scheduled</option>
          </select>
        </Field>
        <Field label="Risk">
          <select name="risk" className="field" defaultValue="medium">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </Field>
        <Field label="Client">
          <select name="clientId" className="field" defaultValue="">
            <option value="">— none —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Requested by">
          <input name="requestedBy" className="field" placeholder="client contact / ticket" />
        </Field>
        <Field label="Maintenance window start">
          <input type="datetime-local" name="windowStart" className="field" defaultValue={nowLocal} />
        </Field>
        <Field label="Maintenance window end">
          <input type="datetime-local" name="windowEnd" className="field" />
        </Field>
      </div>

      <div>
        <span className="label mb-1.5 block">Vendors</span>
        <div className="flex flex-wrap gap-2">
          {vendors.map((v) => (
            <VendorCheck key={v.id} id={v.id} name={v.name} color={v.color ?? "#38bdf8"} />
          ))}
        </div>
      </div>

      <div>
        <span className="label mb-1.5 block">Technologies</span>
        <div className="space-y-2">
          {Object.entries(techsByCat).map(([cat, list]) => (
            <div key={cat} className="flex flex-wrap items-center gap-1.5">
              <span className="label w-28 shrink-0">{cat}</span>
              {list.map((t) => (
                <label key={t.id} className="chip cursor-pointer border-edge text-mute has-checked:border-accent/50 has-checked:text-accent">
                  <input type="checkbox" name="techs" value={t.id} className="accent-(--color-accent)" />
                  {t.name}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Field label="Description / change plan (markdown)">
        <textarea name="description" rows={3} className="field" placeholder="What changes, why, expected impact…" />
      </Field>
      <Field label="Planned config (markdown)">
        <textarea name="plannedConfig" rows={4} className="field" placeholder="Commands / config to apply, in order" />
      </Field>
      <Field label="Rollback plan (markdown)">
        <textarea name="rollbackPlan" rows={3} className="field" placeholder="How to revert if it goes wrong — BEFORE touching anything" />
      </Field>

      {state.error && <p className="text-sm text-red">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-accent">
          {pending ? "Saving…" : "Create change"}
        </button>
        <Link href="/changes" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
