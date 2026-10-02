"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, setPassword, verifyPassword } from "../auth";
import { one, run, tx } from "../db";
import { testConnection, AiError, type AiConfig } from "../ai";
import type { FormState } from "./auth";

function setSetting(key: string, value: string): void {
  run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
}

export async function saveAiConfigAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const provider = String(fd.get("provider") ?? "demo");
  if (!["demo", "anthropic", "openai", "openai-compatible"].includes(provider)) {
    return { error: "Unknown provider." };
  }
  setSetting("ai_provider", provider);
  setSetting("ai_model", String(fd.get("model") ?? "").trim());
  setSetting("ai_base_url", String(fd.get("baseUrl") ?? "").trim());

  const key = String(fd.get("apiKey") ?? "").trim();
  if (key) setSetting("ai_key", key);
  if (fd.get("clearKey") === "on") run("DELETE FROM settings WHERE key = 'ai_key'");

  revalidatePath("/settings");
  return { ok: true };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function testAiAction(_prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAuth();
  const get = (k: string) => one<{ value: string }>("SELECT value FROM settings WHERE key = ?", k)?.value ?? "";
  const cfg: AiConfig = {
    provider: get("ai_provider") || "demo",
    model: get("ai_model"),
    apiKey: get("ai_key"),
    baseUrl: get("ai_base_url"),
  };
  try {
    await testConnection(cfg);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof AiError ? e.message : e instanceof Error ? e.message : "Unknown error";
    return { error: msg };
  }
}

export async function clientCreateAction(fd: FormData): Promise<void> {
  await requireAuth();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  run("INSERT INTO clients (name, notes) VALUES (?, ?)", name, String(fd.get("notes") ?? ""));
  revalidatePath("/settings");
}

export async function clientDeleteAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM clients WHERE id = ?", id);
  revalidatePath("/settings");
}

export async function techCreateAction(fd: FormData): Promise<void> {
  await requireAuth();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;
  run("INSERT INTO technologies (name, category) VALUES (?, ?)", name, String(fd.get("category") ?? "General"));
  revalidatePath("/settings");
}

export async function techDeleteAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM technologies WHERE id = ?", id);
  revalidatePath("/settings");
}

export async function tagDeleteAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM tags WHERE id = ?", id);
  revalidatePath("/settings");
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (!verifyPassword(current)) return { error: "Current password is incorrect." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "Passwords do not match." };
  await setPassword(next);
  return { ok: true };
}

interface BackupShape {
  vendors?: unknown[];
  clients?: unknown[];
  technologies?: unknown[];
  tags?: unknown[];
  cases?: unknown[];
  case_vendors?: unknown[];
  case_technologies?: unknown[];
  case_tags?: unknown[];
  case_events?: unknown[];
  snapshots?: unknown[];
  error_kb?: unknown[];
  error_causes?: unknown[];
  case_errors?: unknown[];
  command_entries?: unknown[];
  command_refs?: unknown[];
  playbook_steps?: unknown[];
  playbooks?: unknown[];
  change_checklist?: unknown[];
  change_files?: unknown[];
  change_cases?: unknown[];
  change_vendors?: unknown[];
  change_technologies?: unknown[];
  changes?: unknown[];
}

const TABLES = [
  "case_errors",
  "error_causes",
  "error_kb",
  "command_entries",
  "command_refs",
  "playbook_steps",
  "playbooks",
  "change_checklist",
  "change_files",
  "change_cases",
  "change_vendors",
  "change_technologies",
  "changes",
  "snapshots",
  "case_events",
  "case_tags",
  "case_technologies",
  "case_vendors",
  "cases",
  "tags",
  "technologies",
  "clients",
  "vendors",
] as const;

const IMPORT_ORDER = [...TABLES].reverse();

export async function importJsonAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const raw = String(fd.get("json") ?? "");
  let data: BackupShape;
  try {
    data = JSON.parse(raw) as BackupShape;
  } catch {
    return { error: "Invalid JSON." };
  }
  if (!data || typeof data !== "object") return { error: "Invalid backup file." };

  const cols = (rows: unknown[]): string[] => (rows.length ? Object.keys(rows[0] as object) : []);

  tx(() => {
    for (const t of TABLES) run(`DELETE FROM ${t}`);
    for (const t of IMPORT_ORDER) {
      const rows = (data[t] ?? []) as Record<string, unknown>[];
      if (!rows.length) continue;
      const c = cols(rows);
      const ph = c.map(() => "?").join(", ");
      const stmt = `INSERT INTO ${t} (${c.join(", ")}) VALUES (${ph})`;
      for (const row of rows) run(stmt, ...c.map((k) => row[k] ?? null));
    }
  });

  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath("/errors");
  revalidatePath("/settings");
  return { ok: true };
}
