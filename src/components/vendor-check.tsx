"use client";

export function VendorCheck({
  id,
  name,
  color,
  defaultChecked = false,
}: {
  id: number;
  name: string;
  color: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-edge px-2.5 py-0.5 font-mono text-xs text-mute transition-colors has-checked:text-(--vc)"
      style={{ ["--vc" as string]: color }}
    >
      <input type="checkbox" name="vendors" value={id} defaultChecked={defaultChecked} className="hidden" />
      <span className="h-1.5 w-1.5 rounded-full has-checked:shadow-current" style={{ backgroundColor: color }} />
      {name}
    </label>
  );
}
