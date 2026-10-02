"use client";

import { useState } from "react";
import { updateCaseMetaAction } from "@/lib/actions/cases";
import { VendorCheck } from "./vendor-check";
import { Field } from "./ui";

interface Opt {
  id: number;
  name: string;
  color?: string;
  category?: string;
}

export function CaseMetaEdit({
  caseData,
  clients,
  vendors,
  techs,
}: {
  caseData: {
    id: number;
    title: string;
    status: string;
    severity: string;
    client_id: number | null;
    vendorIds: number[];
    techIds: number[];
    tags: string;
  };
  clients: Opt[];
  vendors: Opt[];
  techs: Opt[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost !px-2 !py-1 !text-[10px]" onClick={() => setOpen(true)}>
        edit
      </button>
    );
  }

  const techsByCat = techs.reduce<Record<string, Opt[]>>((acc, t) => {
    (acc[t.category ?? "General"] ??= []).push(t);
    return acc;
  }, {});

  return (
    <form action={updateCaseMetaAction} className="mt-4 space-y-4 border-t border-edge pt-4 text-left">
      <input type="hidden" name="id" value={caseData.id} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Title" className="sm:col-span-2">
          <input name="title" defaultValue={caseData.title} required className="field" />
        </Field>
        <Field label="Severity">
          <select name="severity" defaultValue={caseData.severity} className="field">
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={caseData.status} className="field">
            <option value="open">open</option>
            <option value="in_progress">in progress</option>
            <option value="resolved">resolved</option>
            <option value="closed">closed</option>
          </select>
        </Field>
        <Field label="Client">
          <select name="clientId" defaultValue={caseData.client_id ?? ""} className="field">
            <option value="">— none —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Tags (comma-separated)">
          <input name="tags" defaultValue={caseData.tags} className="field" />
        </Field>
      </div>

      <div>
        <span className="label mb-1.5 block">Vendors</span>
        <div className="flex flex-wrap gap-2">
          {vendors.map((v) => (
            <VendorCheck key={v.id} id={v.id} name={v.name} color={v.color ?? "#38bdf8"}
              defaultChecked={caseData.vendorIds.includes(v.id)} />
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
                  <input type="checkbox" name="techs" value={t.id} className="accent-(--color-accent)"
                    defaultChecked={caseData.techIds.includes(t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-accent">Save</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
