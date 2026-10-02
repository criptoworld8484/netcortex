"use client";

import { useActionState } from "react";
import { loginAction, setupAction, type FormState } from "@/lib/actions/auth";
import { SubmitButton } from "./submit-button";

function ErrorLine({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red">{error}</p>;
}

export function SetupForm() {
  const [state, action] = useActionState<FormState, FormData>(setupAction, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label mb-1 block">Create password *</span>
        <input type="password" name="password" required minLength={8} className="field" autoFocus />
      </label>
      <label className="block">
        <span className="label mb-1 block">Confirm password *</span>
        <input type="password" name="confirm" required minLength={8} className="field" />
      </label>
      <ErrorLine error={state.error} />
      <SubmitButton className="btn btn-accent w-full justify-center">Initialize</SubmitButton>
    </form>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label mb-1 block">Password</span>
        <input type="password" name="password" required className="field" autoFocus />
      </label>
      <ErrorLine error={state.error} />
      <SubmitButton className="btn btn-accent w-full justify-center">Unlock</SubmitButton>
    </form>
  );
}
