"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createCommandRefAction, updateCommandRefAction } from "@/lib/actions/commands";
import type { FormState } from "@/lib/actions/auth";
import { Field } from "./ui";
import { SubmitButton } from "./submit-button";

export interface VendorField {
  id: number;
  name: string;
  color: string;
  command?: string;
}

export function CommandRefForm({
  mode,
  vendors,
  categories,
  refId,
  task = "",
  category = "",
  notes = "",
}: {
  mode: "create" | "edit";
  vendors: VendorField[];
  categories: string[];
  refId?: number;
  task?: string;
  category?: string;
  notes?: string;
}) {
  const [createState, createAction] = useActionState<FormState, FormData>(createCommandRefAction, {});
  const [, editAction] = useActionState<FormState, FormData>(
    async (_prev, fd) => {
      await updateCommandRefAction(fd);
      return {};
    },
    {}
  );
  const action = mode === "create" ? createAction : editAction;
  const state = mode === "create" ? createState : {};

  return (
    <form action={action} className="space-y-5">
      {refId && <input type="hidden" name="id" value={refId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Task *">
          <input name="task" required defaultValue={task} className="field"
            placeholder="BGP neighbors summary" autoFocus={mode === "create"} />
        </Field>
        <Field label="Category">
          <input name="category" defaultValue={category} className="field" list="cmd-cats"
            placeholder="BGP, VPN, Diagnostics…" />
          <datalist id="cmd-cats">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
      </div>

      <Field label="Notes">
        <input name="notes" defaultValue={notes} className="field" placeholder="Caveats, gotchas (optional)" />
      </Field>

      <div className="space-y-3">
        <span className="label">Vendor commands (empty = no entry)</span>
        {vendors.map((v) => (
          <div key={v.id} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
            <span className="chip" style={{ color: v.color, borderColor: `${v.color}66` }}>{v.name}</span>
            <textarea
              name={`cmd_${v.id}`}
              defaultValue={v.command ?? ""}
              rows={2}
              className="field"
              placeholder={`${v.name} command(s), one per line`}
            />
          </div>
        ))}
      </div>

      {mode === "create" && (
        <p className="text-xs text-dim">
          Tip: placeholders like <code className="font-mono text-accent">&lt;if&gt;</code> or{" "}
          <code className="font-mono text-accent">&lt;ip&gt;</code> are fine — you adapt them when pasting.
        </p>
      )}

      {state.error && <p className="text-sm text-red">{state.error}</p>}

      <div className="flex gap-3">
        <SubmitButton className="btn btn-accent">{mode === "create" ? "Create task" : "Save"}</SubmitButton>
        <Link href="/commands" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
