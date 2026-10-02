"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createCaseAction } from "@/lib/actions/cases";
import { guessVendorSlug } from "@/lib/match";
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

function localNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function CaseForm({
  clients,
  vendors,
  techs,
  prefillLog = "",
  prefillVendor = "",
  prefillTitle = "",
}: {
  clients: Opt[];
  vendors: Opt[];
  techs: Opt[];
  prefillLog?: string;
  prefillVendor?: string;
  prefillTitle?: string;
}) {
  const [mode, setMode] = useState<"quick" | "full">(prefillLog ? "quick" : "quick");
  const [state, action, pending] = useActionState<FormState, FormData>(createCaseAction, {});
  const [logVendor, setLogVendor] = useState(prefillVendor);
  const [logVendorTouched, setLogVendorTouched] = useState(false);
  const [logText, setLogText] = useState(prefillLog);

  const techsByCat = techs.reduce<Record<string, Opt[]>>((acc, t) => {
    (acc[t.category ?? "General"] ??= []).push(t);
    return acc;
  }, {});

  const detectedVendorOpt =
    !logVendorTouched && logText.trim().length > 30
      ? (vendors.find((v) => v.slug === guessVendorSlug(logText)) ?? null)
      : null;
  const effectiveLogVendor = logVendorTouched
    ? logVendor
    : detectedVendorOpt
      ? String(detectedVendorOpt.id)
      : logVendor;
  const detectedVendor = detectedVendorOpt ? detectedVendorOpt.name : null;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-edge">
        {(["quick", "full"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`-mb-px border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-wider ${
              mode === m ? "border-accent text-accent" : "border-transparent text-mute hover:text-fg"
            }`}
          >
            {m === "quick" ? "Quick capture" : "Post-mortem"}
          </button>
        ))}
      </div>

      <form action={action} className="space-y-5">
        <input type="hidden" name="mode" value={mode} />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Title *" className="md:col-span-2">
            <input name="title" required className="field" defaultValue={prefillTitle}
              placeholder="VPN tunnel down after ISP change" />
          </Field>

          <Field label="Severity">
            <select name="severity" className="field" defaultValue="P3">
              <option value="P1">P1 — critical</option>
              <option value="P2">P2 — high</option>
              <option value="P3">P3 — medium</option>
              <option value="P4">P4 — low</option>
            </select>
          </Field>

          {mode === "full" ? (
            <Field label="Status">
              <select name="status" className="field" defaultValue="resolved">
                <option value="open">open</option>
                <option value="in_progress">in progress</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
              </select>
            </Field>
          ) : (
            <Field label="Client">
              <select name="clientId" className="field" defaultValue="">
                <option value="">— none —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}

          {mode === "full" && (
            <Field label="Client">
              <select name="clientId" className="field" defaultValue="">
                <option value="">— none —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}

          {mode === "full" && <Field label="Opened at"><input type="datetime-local" name="openedAt" className="field" defaultValue={localNow()} /></Field>}
          {mode === "full" && <Field label="Resolved at"><input type="datetime-local" name="resolvedAt" className="field" /></Field>}
        </div>

        <Field label="Symptom (as reported / observed)">
          <textarea name="symptom" rows={3} className="field" placeholder="What is failing, since when, who reported it, impact…" />
        </Field>

        <div>
          <span className="label mb-1.5 block">Vendors involved</span>
          <div className="flex flex-wrap gap-2">
            {vendors.map((v) => (
              <VendorCheck key={v.id} id={v.id} name={v.name} color={v.color ?? "#38bdf8"}
                defaultChecked={String(v.id) === prefillVendor} />
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

        <Field label="Tags (comma-separated)">
          <input name="tags" className="field" placeholder="s2s, isp, rma" />
        </Field>

        {mode === "quick" && (
          <div className="panel p-4">
            <Field label="Initial log (optional — matched against Error KB on save)">
              <textarea name="initialLog" rows={6} className="field" value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Paste relevant log lines now, add more to the timeline later" />
            </Field>
            <div className="mt-3 max-w-xs">
              <Field label={`Log vendor${detectedVendor ? " (auto-detected)" : ""}`}>
                <select
                  name="logVendor"
                  className="field"
                  value={effectiveLogVendor}
                  onChange={(e) => {
                    setLogVendor(e.target.value);
                    setLogVendorTouched(true);
                  }}
                >
                  <option value="">—</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {mode === "full" && (
          <>
            <Field label="Root cause">
              <textarea name="rootCause" rows={4} className="field" placeholder="What was actually broken and why (markdown)" />
            </Field>
            <Field label="Solution">
              <textarea name="solution" rows={4} className="field" placeholder="How it was fixed, commands applied (markdown)" />
            </Field>
          </>
        )}

        {state.error && <p className="text-sm text-red">{state.error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn btn-accent">
            {pending ? "Saving…" : mode === "quick" ? "Create case" : "Register case"}
          </button>
          <Link href="/cases" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
