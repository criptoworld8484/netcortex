export const SESSION_COOKIE = "nc_session";

export const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  open: "OPEN",
  in_progress: "IN PROGRESS",
  resolved: "RESOLVED",
  closed: "CLOSED",
};

export const STATUS_CLASS: Record<Status, string> = {
  open: "text-red border-red/40 bg-red/10",
  in_progress: "text-amber border-amber/40 bg-amber/10",
  resolved: "text-green border-green/40 bg-green/10",
  closed: "text-mute border-edge bg-panel2",
};

export const SEVERITIES = ["P1", "P2", "P3", "P4"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_CLASS: Record<Severity, string> = {
  P1: "text-red border-red/50 bg-red/10",
  P2: "text-amber border-amber/50 bg-amber/10",
  P3: "text-yellow border-yellow/40 bg-yellow/10",
  P4: "text-mute border-edge bg-panel2",
};

export const EVENT_KINDS = ["note", "command", "log", "status", "resolution"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const KIND_CLASS: Record<EventKind, string> = {
  note: "text-mute border-edge",
  command: "text-accent border-accent/40",
  log: "text-sky border-sky/40",
  status: "text-amber border-amber/40",
  resolution: "text-green border-green/40",
};

export function fmtDT(ts: number | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtTTR(from: number | null | undefined, to: number | null | undefined): string {
  if (!from || !to || to < from) return "—";
  const mins = Math.round((to - from) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function fmtAge(ts: number): string {
  return fmtTTR(ts, Date.now());
}

export const CHANGE_STATUSES = [
  "draft",
  "approved",
  "scheduled",
  "executed",
  "successful",
  "rolled_back",
  "failed",
] as const;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number];

export const CHANGE_STATUS_CLASS: Record<ChangeStatus, string> = {
  draft: "text-mute border-edge bg-panel2",
  approved: "text-sky border-sky/40 bg-sky/10",
  scheduled: "text-amber border-amber/40 bg-amber/10",
  executed: "text-sky border-sky/40 bg-sky/10",
  successful: "text-green border-green/40 bg-green/10",
  rolled_back: "text-yellow border-yellow/40 bg-yellow/10",
  failed: "text-red border-red/40 bg-red/10",
};

export const RISKS = ["low", "medium", "high"] as const;
export type Risk = (typeof RISKS)[number];

export const RISK_CLASS: Record<Risk, string> = {
  low: "text-green border-green/40 bg-green/10",
  medium: "text-yellow border-yellow/40 bg-yellow/10",
  high: "text-red border-red/50 bg-red/10",
};

export const STEP_KINDS = ["action", "question", "note"] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export const STEP_KIND_CLASS: Record<StepKind, string> = {
  action: "text-accent border-accent/40",
  question: "text-amber border-amber/40",
  note: "text-mute border-edge",
};

export interface StepCheck {
  vendor_id: number;
  command: string;
}

export interface StepBranch {
  label: string;
  target: number | "next";
}

export function parseBranches(input: string): StepBranch[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*=>\s*(next|\d+)\s*$/i);
      if (!m) return null;
      return { label: m[1].trim(), target: m[2].toLowerCase() === "next" ? ("next" as const) : Number(m[2]) };
    })
    .filter((b): b is StepBranch => b !== null);
}

export function serializeBranches(branches: StepBranch[]): string {
  return branches.map((b) => `${b.label} => ${b.target}`).join("\n");
}

export function msToLocalInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
