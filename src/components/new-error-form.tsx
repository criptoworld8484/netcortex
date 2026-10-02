"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createErrorAction } from "@/lib/actions/errors";
import type { FormState } from "@/lib/actions/auth";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default function NewErrorForm({ vendors }: { vendors: { id: number; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(createErrorAction, {});

  return (
    <form action={action} className="space-y-5">
      <Field label="Title *">
        <input name="title" required className="field" placeholder="IKE: No proposal chosen" autoFocus />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Pattern *" className="sm:col-span-2">
          <input name="pattern" required className="field font-mono" placeholder="no proposal chosen" />
        </Field>
        <Field label="Type">
          <select name="patternType" className="field" defaultValue="exact">
            <option value="exact">exact (substring)</option>
            <option value="regex">regex</option>
          </select>
        </Field>
      </div>

      <Field label="Vendor scope" >
        <select name="vendor" className="field" defaultValue="">
          <option value="">multi-vendor</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </Field>

      <Field label="Meaning (markdown)">
        <textarea name="meaning" rows={4} className="field" placeholder="What this message actually means…" />
      </Field>

      <div className="panel p-4">
        <span className="label mb-3 block">First cause (optional — add more later)</span>
        <div className="space-y-3">
          <Field label="Description">
            <input name="causeDescription" className="field" placeholder="Proposal parameter mismatch" />
          </Field>
          <Field label="How to verify (markdown, per-vendor commands)">
            <textarea name="causeVerify" rows={4} className="field" placeholder="**Cisco:** `show crypto isakmp policy`…" />
          </Field>
          <Field label="Fix (markdown)">
            <textarea name="causeFix" rows={3} className="field" placeholder="Align proposals on both peers…" />
          </Field>
        </div>
      </div>

      {state.error && <p className="text-sm text-red">{state.error}</p>}

      <div className="flex gap-3">
        <SubmitButton className="btn btn-accent">Create entry</SubmitButton>
        <Link href="/errors" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
