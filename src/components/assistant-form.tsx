"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  prepareAssistantAction,
  sendAssistantAction,
  type AssistantAnswer,
  type PreparedDraft,
} from "@/lib/actions/assistant";
import { SubmitButton } from "./submit-button";
import { MD } from "./md";
import { Empty } from "./ui";

type PrepareState = { draft?: PreparedDraft; error?: string };

export function AssistantForm({
  prefillLog = "",
  provider,
  model,
  hasKey,
}: {
  prefillLog?: string;
  provider: string;
  model: string;
  hasKey: boolean;
}) {
  const [prep, prepare, preparing] = useActionState<PrepareState, FormData>(prepareAssistantAction, {});
  const [answer, send, sending] = useActionState<AssistantAnswer | null, FormData>(sendAssistantAction, null);
  const [showRaw, setShowRaw] = useState(false);

  const isDemo = provider === "demo";

  return (
    <div className="space-y-6">
      <form action={prepare} className="panel space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="label mb-1 block">Symptom / question *</span>
            <textarea
              name="question"
              rows={6}
              className="field"
              placeholder="Site-12 backup tunnel doesn't establish after ISP cutover. Phase 1 seems up but no traffic flows…"
            />
          </label>
          <label className="block">
            <span className="label mb-1 block">Log (optional — anonymized automatically)</span>
            <textarea
              name="log"
              rows={6}
              className="field"
              defaultValue={prefillLog}
              placeholder="Paste log lines — IPs, hosts, MACs, users and ASNs are replaced with placeholders before anything leaves this machine."
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-dim">
            provider: <span className={isDemo ? "text-amber" : "text-accent"}>{provider}{model ? ` · ${model}` : ""}</span>
            {!isDemo && !hasKey && <span className="text-red"> — no API key set (Settings → AI Assistant)</span>}
          </span>
          <SubmitButton className="btn btn-accent">{preparing ? "Preparing…" : "1 · Prepare & review"}</SubmitButton>
        </div>
      </form>

      {prep.error && <p className="text-sm text-red">{prep.error}</p>}

      {prep.draft && (
        <div className="panel p-4">
          <h2 className="label mb-3">Review before send — this is exactly what goes out</h2>

          <div className="mb-3 flex flex-wrap gap-2 font-mono text-xs">
            <span className="chip border-accent/40 text-accent">{prep.draft.mappingCount} values anonymized</span>
            {prep.draft.context.cases.length > 0 && (
              <span className="chip border-edge text-mute">{prep.draft.context.cases.length} own cases attached</span>
            )}
            {prep.draft.context.errors.length > 0 && (
              <span className="chip border-edge text-mute">{prep.draft.context.errors.length} KB entries attached</span>
            )}
            {prep.draft.context.commands.length > 0 && (
              <span className="chip border-edge text-mute">{prep.draft.context.commands.length} command tasks attached</span>
            )}
            {prep.draft.keywords.length > 0 && (
              <span className="chip border-edge text-dim">keywords: {prep.draft.keywords.join(", ")}</span>
            )}
          </div>

          {(prep.draft.anonymizedQuestion || prep.draft.anonymizedLog) && (
            <div className="grid gap-3 md:grid-cols-2">
              {prep.draft.anonymizedQuestion && (
                <div>
                  <span className="label">Question</span>
                  <pre className="mono-block mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap">{prep.draft.anonymizedQuestion}</pre>
                </div>
              )}
              {prep.draft.anonymizedLog && (
                <div>
                  <span className="label">Log</span>
                  <pre className="mono-block mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap">{prep.draft.anonymizedLog}</pre>
                </div>
              )}
            </div>
          )}

          {prep.draft.context.cases.length > 0 && (
            <div className="mt-3">
              <span className="label">Context — your cases that will be cited</span>
              <ul className="mt-1 space-y-1 text-sm">
                {prep.draft.context.cases.map((c) => (
                  <li key={c.id} className="text-mute">
                    <Link href={`/cases/${c.id}`} className="link">{c.title}</Link> — {c.rootCause.slice(0, 120) || "no root cause"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details className="block mt-3" open={false}>
            <summary className="label">full prompt</summary>
            <pre className="mono-block mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-xs">{prep.draft.prompt}</pre>
          </details>

          <form action={send} className="mt-4 flex items-center justify-between gap-3 border-t border-edge pt-4">
            <input type="hidden" name="draftId" value={prep.draft.draftId} />
            <span className="text-xs text-dim">
              {isDemo
                ? "Demo mode: canned offline answer, nothing is sent anywhere."
                : "Anonymized prompt will be sent to the provider you configured. The mapping stays local."}
            </span>
            <SubmitButton className="btn btn-accent">
              {sending ? "Asking…" : "2 · Send to AI"}
            </SubmitButton>
          </form>
        </div>
      )}

      {answer && answer.error && (
        <div className="panel border-red/40 p-4">
          <span className="label !text-red">AI error</span>
          <p className="mt-1 text-sm text-red">{answer.error}</p>
        </div>
      )}

      {answer && !answer.error && answer.answer && (
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="label">Analysis — {answer.provider} · {answer.model} · values restored locally</h2>
            <button type="button" className="btn btn-ghost !px-2 !py-0.5 !text-[10px]" onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? "show restored" : "show raw (placeholders)"}
            </button>
          </div>
          {showRaw ? (
            <pre className="mono-block whitespace-pre-wrap text-xs">{answer.rawAnswer}</pre>
          ) : (
            <MD>{answer.answer}</MD>
          )}
        </div>
      )}

      {!prep.draft && !prep.error && (
        <Empty>
          Two steps, no surprises: <strong>Prepare</strong> anonymizes your input and builds context from your own cases,
          then you review the exact prompt before anything is sent.
        </Empty>
      )}
    </div>
  );
}
