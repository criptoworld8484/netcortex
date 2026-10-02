"use client";

import { useActionState } from "react";
import { changePasswordAction, importJsonAction } from "@/lib/actions/settings";
import type { FormState } from "@/lib/actions/auth";
import { SubmitButton } from "./submit-button";

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState & { ok?: boolean }, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label mb-1 block">Current</span>
          <input type="password" name="current" required className="field" />
        </label>
        <label className="block">
          <span className="label mb-1 block">New (min 8)</span>
          <input type="password" name="next" required minLength={8} className="field" />
        </label>
        <label className="block">
          <span className="label mb-1 block">Confirm</span>
          <input type="password" name="confirm" required minLength={8} className="field" />
        </label>
      </div>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.ok && <p className="text-sm text-green">Password updated.</p>}
      <SubmitButton className="btn">Change password</SubmitButton>
    </form>
  );
}

export function ImportForm() {
  const [state, action] = useActionState<FormState & { ok?: boolean }, FormData>(importJsonAction, {});
  return (
    <form action={action} className="space-y-3">
      <textarea
        name="json"
        rows={5}
        className="field"
        placeholder="Paste the contents of a netcortex-backup-*.json file. This REPLACES all current data."
      />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.ok && <p className="text-sm text-green">Import complete.</p>}
      <SubmitButton className="btn btn-danger" confirm="This deletes ALL current data and imports the backup. Continue?">
        Import (destructive)
      </SubmitButton>
    </form>
  );
}
