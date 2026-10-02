"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPlaybookAction } from "@/lib/actions/playbooks";
import type { FormState } from "@/lib/actions/auth";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function NewPlaybookForm() {
  const [state, action] = useActionState<FormState, FormData>(createPlaybookAction, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Title *">
        <input name="title" required className="field" placeholder="Site-to-site IPsec VPN tunnel down" autoFocus />
      </Field>
      <Field label="Category">
        <input name="category" className="field" placeholder="VPN, BGP, HA…" />
      </Field>
      <Field label="Description (markdown)">
        <textarea name="description" rows={3} className="field" placeholder="When to use this playbook…" />
      </Field>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      <div className="flex gap-3">
        <SubmitButton className="btn btn-accent">Create playbook</SubmitButton>
        <Link href="/playbooks" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
