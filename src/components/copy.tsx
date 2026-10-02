"use client";

import { useState } from "react";

export function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost !px-2 !py-0.5 !text-[10px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? "✓ copied" : label}
    </button>
  );
}

export function CmdBlock({ cmd }: { cmd: string }) {
  return (
    <div className="mono-block flex items-start justify-between gap-3 !py-1.5">
      <code className="block !py-1 text-accent">{cmd}</code>
      <CopyButton text={cmd} />
    </div>
  );
}

export function LogOutput({ text }: { text: string }) {
  return (
    <div className="relative">
      <pre className="mono-block max-h-96 overflow-y-auto text-mute">{text}</pre>
      <div className="absolute right-2 top-2">
        <CopyButton text={text} />
      </div>
    </div>
  );
}
