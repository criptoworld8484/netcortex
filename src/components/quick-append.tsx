"use client";

import { useRef, useState } from "react";
import { addEventAction } from "@/lib/actions/cases";
import type { EventKind } from "@/lib/constants";

interface VendorOpt {
  id: number;
  name: string;
  color: string;
}

const KIND_BUTTONS: { kind: EventKind; label: string }[] = [
  { kind: "note", label: "+ note" },
  { kind: "command", label: "+ command" },
  { kind: "log", label: "+ log" },
  { kind: "status", label: "+ status" },
  { kind: "resolution", label: "+ resolution" },
];

export function QuickAppend({ caseId, vendors }: { caseId: number; vendors: VendorOpt[] }) {
  const [kind, setKind] = useState<EventKind | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = async (fd: FormData) => {
    await addEventAction(fd);
    formRef.current?.reset();
    setKind(null);
  };

  return (
    <div className="panel p-3">
      <div className="flex flex-wrap gap-2">
        {KIND_BUTTONS.map((b) => (
          <button
            key={b.kind}
            type="button"
            className={`btn !py-1 ${kind === b.kind ? "btn-accent" : ""}`}
            onClick={() => setKind(kind === b.kind ? null : b.kind)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {kind && (
        <form ref={formRef} action={submit} className="mt-3 space-y-2 border-t border-edge pt-3">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="kind" value={kind} />

          {kind === "note" && (
            <textarea name="body" rows={3} className="field" placeholder="Observation, hypothesis, context…" autoFocus />
          )}

          {kind === "command" && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <input name="body" className="field" placeholder="command (e.g. get vpn tunnel list)" autoFocus />
                <input name="device" className="field" placeholder="device label (optional)" />
                <select name="vendor" className="field" defaultValue="">
                  <option value="">vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <textarea name="output" rows={6} className="field" placeholder="command output (paste here)" />
            </>
          )}

          {kind === "log" && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <input name="body" className="field" placeholder="what this log is (optional)" autoFocus />
                <input name="device" className="field" placeholder="device label (optional)" />
                <select name="vendor" className="field" defaultValue="">
                  <option value="">vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <textarea name="output" rows={8} className="field" placeholder="paste the log — known error patterns are matched automatically on save" />
            </>
          )}

          {kind === "status" && (
            <>
              <select name="status" className="field !w-56" defaultValue="in_progress" autoFocus>
                <option value="open">open</option>
                <option value="in_progress">in progress</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
              </select>
              <input name="body" className="field" placeholder="context (optional)" />
            </>
          )}

          {kind === "resolution" && (
            <textarea name="body" rows={5} className="field" placeholder="Root cause found and fix applied. (Also sets the case to resolved)" autoFocus />
          )}

          <div>
            <button type="submit" className="btn btn-accent">Add to timeline</button>
          </div>
        </form>
      )}
    </div>
  );
}
