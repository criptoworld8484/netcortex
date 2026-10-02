"use client";

import { useActionState } from "react";
import { saveAiConfigAction, testAiAction } from "@/lib/actions/settings";
import type { FormState } from "@/lib/actions/auth";
import { Field } from "./ui";
import { SubmitButton } from "./submit-button";

export function AiConfigForm({
  provider,
  model,
  baseUrl,
  hasKey,
}: {
  provider: string;
  model: string;
  baseUrl: string;
  hasKey: boolean;
}) {
  const [saveState, save] = useActionState<FormState, FormData>(saveAiConfigAction, {});
  const [testState, test] = useActionState<FormState, FormData>(testAiAction, {});

  return (
    <div className="space-y-4">
      <form action={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Provider">
            <select name="provider" className="field" defaultValue={provider}>
              <option value="demo">offline demo (nothing sent)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
              <option value="openai-compatible">OpenAI-compatible (custom base URL)</option>
            </select>
          </Field>
          <Field label="Model">
            <input name="model" defaultValue={model} className="field" placeholder="claude-sonnet-4-5 / gpt-4o / …" />
          </Field>
          <Field label="Base URL (optional; required for compatible)">
            <input name="baseUrl" defaultValue={baseUrl} className="field" placeholder="https://api.anthropic.com" />
          </Field>
          <Field label={`API key ${hasKey ? "(set — leave blank to keep)" : ""}`}>
            <input name="apiKey" type="password" className="field" placeholder={hasKey ? "••••••••" : "sk-…"} autoComplete="off" />
          </Field>
        </div>
        {hasKey && (
          <label className="flex items-center gap-2 text-xs text-mute">
            <input type="checkbox" name="clearKey" className="accent-(--color-red)" />
            remove stored API key
          </label>
        )}
        {saveState.error && <p className="text-sm text-red">{saveState.error}</p>}
        {saveState.ok && <p className="text-sm text-green">Saved. Key stored locally in SQLite only.</p>}
        <SubmitButton className="btn btn-accent">Save AI config</SubmitButton>
      </form>

      <form action={test} className="flex items-center gap-3 border-t border-edge pt-3">
        <SubmitButton className="btn">Test connection</SubmitButton>
        {testState.ok && <span className="text-sm text-green">✓ OK</span>}
        {testState.error && <span className="text-sm text-red">{testState.error.slice(0, 160)}</span>}
      </form>

      <p className="text-xs text-dim">
        Privacy: prompts are anonymized before send (IPs/hosts/MACs/users/ASNs → placeholders); the mapping
        to real values never leaves this machine and is only used to restore them in the answer. Your API key
        is stored in the local SQLite file.
      </p>
    </div>
  );
}
