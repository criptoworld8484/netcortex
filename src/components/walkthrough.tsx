"use client";

import { useState } from "react";
import Link from "next/link";
import type { StepBranch, StepCheck } from "@/lib/constants";
import { CopyButton } from "./copy";

export interface WalkStep {
  id: number;
  position: number;
  kind: string;
  text: string;
  checks: StepCheck[];
  branches: StepBranch[];
}

export interface WalkVendor {
  id: number;
  name: string;
  color: string;
}

export function Walkthrough({
  playbookId,
  title,
  steps,
  vendors,
}: {
  playbookId: number;
  title: string;
  steps: WalkStep[];
  vendors: WalkVendor[];
}) {
  const [idx, setIdx] = useState(0);
  const [visited, setVisited] = useState<number[]>([0]);
  const step = steps[idx];

  if (!step) return null;

  const goTo = (i: number) => {
    if (i < 0 || i >= steps.length) return;
    setIdx(i);
    setVisited((v) => (v.includes(i) ? v : [...v, i]));
  };

  const vendorChecks = step.checks.filter((c) => c.command.trim());
  const checkCount = vendorChecks.length;

  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="font-mono text-xs text-dim">
            Step {idx + 1} of {steps.length}
            {visited.length > 1 && <span> · visited {visited.length}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/cases/new?title=${encodeURIComponent(`[PB] ${title}`)}`} className="btn !py-1">
            Create case from playbook
          </Link>
          <Link href={`/playbooks/${playbookId}`} className="btn btn-ghost !py-1">✎ edit</Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            title={s.text.slice(0, 80)}
            className={`h-1.5 w-6 rounded-full transition-colors ${
              i === idx ? "bg-accent" : visited.includes(i) ? "bg-accent/40" : "bg-panel2 border border-edge"
            }`}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      <div className="mt-5 rounded-md border border-edge bg-ink/60 p-4">
        <div className="flex items-center gap-2">
          <span className={`chip border uppercase ${step.kind === "question" ? "text-amber border-amber/40" : step.kind === "note" ? "text-mute border-edge" : "text-accent border-accent/40"}`}>
            {step.kind}
          </span>
          <span className="font-mono text-xs text-dim">#{step.position}</span>
        </div>
        <p className="mt-2 text-base text-fg">{step.text}</p>

        {checkCount > 0 && (
          <div className="mt-3 space-y-1.5">
            <span className="label">Check on:</span>
            {vendorChecks.map((c) => {
              const v = vendors.find((x) => x.id === c.vendor_id);
              return (
                <div key={c.vendor_id} className="flex items-start gap-2">
                  {v && <span className="chip shrink-0" style={{ color: v.color, borderColor: `${v.color}66` }}>{v.name}</span>}
                  <div className="mono-block flex min-w-0 flex-1 items-start justify-between gap-2 !py-1">
                    <code className="block text-accent">{c.command}</code>
                    <CopyButton text={c.command} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {step.kind === "question" && step.branches.length > 0 ? (
          step.branches.map((b, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-accent"
              onClick={() => (b.target === "next" ? goTo(idx + 1) : goTo(steps.findIndex((s) => s.position === b.target)))}
            >
              {b.label} {b.target === "next" ? "→" : `→ #${b.target}`}
            </button>
          ))
        ) : (
          idx + 1 < steps.length && (
            <button type="button" className="btn btn-accent" onClick={() => goTo(idx + 1)}>
              Next →
            </button>
          )
        )}
        <button type="button" className="btn" onClick={() => goTo(idx - 1)} disabled={idx === 0}>
          ← Back
        </button>
        {idx === steps.length - 1 && (
          <span className="btn border-green/40 bg-green/10 text-green">✓ End of playbook</span>
        )}
      </div>
    </div>
  );
}
