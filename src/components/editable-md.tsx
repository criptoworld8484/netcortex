"use client";

import { useState } from "react";
import { MD } from "./md";

export function EditableMD({
  entityId,
  field,
  label,
  value,
  placeholder,
  action,
}: {
  entityId: number;
  field: string;
  label: string;
  value: string;
  placeholder: string;
  action: (fd: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="label mb-2 block">{label}</span>
          <button type="button" className="btn btn-ghost !px-2 !py-0.5 !text-[10px]" onClick={() => setEditing(true)}>
            edit
          </button>
        </div>
        {value.trim() ? (
          <MD>{value}</MD>
        ) : (
          <p className="text-sm italic text-dim">{placeholder}</p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={entityId} />
      <input type="hidden" name="field" value={field} />
      <span className="label mb-1 block">{label}</span>
      <textarea
        name="value"
        defaultValue={value}
        rows={8}
        className="field"
        placeholder="Markdown supported…"
        autoFocus
      />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-accent">Save</button>
        <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>
  );
}
