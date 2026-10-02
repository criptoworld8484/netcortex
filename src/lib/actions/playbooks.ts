"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../auth";
import { all, run, tx, now } from "../db";
import { parseBranches, type StepCheck } from "../constants";
import type { FormState } from "./auth";

function parseChecks(fd: FormData, vendors: { id: number }[]): StepCheck[] {
  const checks: StepCheck[] = [];
  for (const v of vendors) {
    const cmd = String(fd.get(`check_${v.id}`) ?? "").trim();
    if (cmd) checks.push({ vendor_id: v.id, command: cmd });
  }
  return checks;
}

function saveStepsRefresh(pbId: number): void {
  const ids = all<{ id: number }>("SELECT id FROM playbook_steps WHERE playbook_id = ? ORDER BY position ASC, id ASC", pbId);
  ids.forEach((row, i) => {
    run("UPDATE playbook_steps SET position = ? WHERE id = ?", i + 1, row.id);
  });
}

export async function createPlaybookAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };
  const r = run(
    "INSERT INTO playbooks (title, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    title, String(fd.get("category") ?? "General") || "General", String(fd.get("description") ?? ""), now(), now()
  );
  revalidatePath("/playbooks");
  redirect(`/playbooks/${r.id}`);
}

export async function updatePlaybookAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const title = String(fd.get("title") ?? "").trim();
  if (!id || !title) return;
  run(
    "UPDATE playbooks SET title = ?, category = ?, description = ?, updated_at = ? WHERE id = ?",
    title, String(fd.get("category") ?? "General"), String(fd.get("description") ?? ""), now(), id
  );
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${id}`);
}

export async function deletePlaybookAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM playbooks WHERE id = ?", id);
  revalidatePath("/playbooks");
  redirect("/playbooks");
}

export async function addStepAction(fd: FormData): Promise<void> {
  await requireAuth();
  const pbId = Number(fd.get("playbookId"));
  const text = String(fd.get("text") ?? "").trim();
  if (!pbId || !text) return;
  const vendors = all<{ id: number }>("SELECT id FROM vendors ORDER BY name");
  const maxPos = all<{ m: number }>("SELECT COALESCE(MAX(position), 0) m FROM playbook_steps WHERE playbook_id = ?", pbId)[0];
  tx(() => {
    run(
      "INSERT INTO playbook_steps (playbook_id, position, kind, text, checks, branches) VALUES (?, ?, ?, ?, ?, ?)",
      pbId, (maxPos?.m ?? 0) + 1,
      String(fd.get("kind") ?? "action"),
      text,
      JSON.stringify(parseChecks(fd, vendors)),
      JSON.stringify(parseBranches(String(fd.get("branches") ?? "")))
    );
    run("UPDATE playbooks SET updated_at = ? WHERE id = ?", now(), pbId);
  });
  revalidatePath(`/playbooks/${pbId}`);
}

export async function updateStepAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const pbId = Number(fd.get("playbookId"));
  const text = String(fd.get("text") ?? "").trim();
  if (!id || !text) return;
  const vendors = all<{ id: number }>("SELECT id FROM vendors ORDER BY name");
  tx(() => {
    run(
      "UPDATE playbook_steps SET kind = ?, text = ?, checks = ?, branches = ? WHERE id = ?",
      String(fd.get("kind") ?? "action"), text,
      JSON.stringify(parseChecks(fd, vendors)),
      JSON.stringify(parseBranches(String(fd.get("branches") ?? ""))),
      id
    );
    run("UPDATE playbooks SET updated_at = ? WHERE id = ?", now(), pbId);
  });
  revalidatePath(`/playbooks/${pbId}`);
}

export async function deleteStepAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const pbId = Number(fd.get("playbookId"));
  if (!id) return;
  tx(() => {
    run("DELETE FROM playbook_steps WHERE id = ?", id);
    if (pbId) saveStepsRefresh(pbId);
  });
  revalidatePath(`/playbooks/${pbId}`);
}

export async function moveStepAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const pbId = Number(fd.get("playbookId"));
  const dir = String(fd.get("dir") ?? "up");
  if (!id || !pbId) return;
  tx(() => {
    const steps = all<{ id: number; position: number }>(
      "SELECT id, position FROM playbook_steps WHERE playbook_id = ? ORDER BY position ASC, id ASC",
      pbId
    );
    const idx = steps.findIndex((s) => s.id === id);
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= steps.length) return;
    const a = steps[idx];
    const b = steps[swapWith];
    run("UPDATE playbook_steps SET position = ? WHERE id = ?", b.position, a.id);
    run("UPDATE playbook_steps SET position = ? WHERE id = ?", a.position, b.id);
    run("UPDATE playbooks SET updated_at = ? WHERE id = ?", now(), pbId);
  });
  revalidatePath(`/playbooks/${pbId}`);
}
