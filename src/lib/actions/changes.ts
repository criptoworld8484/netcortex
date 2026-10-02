"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../auth";
import { run, tx, now } from "../db";
import type { FormState } from "./auth";

function touch(changeId: number): void {
  run("UPDATE changes SET updated_at = ? WHERE id = ?", now(), changeId);
}

function setLinks(changeId: number, fd: FormData): void {
  run("DELETE FROM change_vendors WHERE change_id = ?", changeId);
  for (const v of fd.getAll("vendors")) {
    const id = Number(v);
    if (id) run("INSERT OR IGNORE INTO change_vendors (change_id, vendor_id) VALUES (?, ?)", changeId, id);
  }
  run("DELETE FROM change_technologies WHERE change_id = ?", changeId);
  for (const t of fd.getAll("techs")) {
    const id = Number(t);
    if (id) run("INSERT OR IGNORE INTO change_technologies (change_id, technology_id) VALUES (?, ?)", changeId, id);
  }
}

function dtToMs(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "");
  if (!s) return null;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? null : t;
}

export async function createChangeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const id = tx(() => {
    const r = run(
      `INSERT INTO changes (title, status, risk, client_id, requested_by, description, planned_config, rollback_plan, window_start, window_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      title,
      String(fd.get("status") ?? "draft") || "draft",
      String(fd.get("risk") ?? "medium"),
      Number(fd.get("clientId")) || null,
      String(fd.get("requestedBy") ?? ""),
      String(fd.get("description") ?? ""),
      String(fd.get("plannedConfig") ?? ""),
      String(fd.get("rollbackPlan") ?? ""),
      dtToMs(fd.get("windowStart")),
      dtToMs(fd.get("windowEnd")),
      now(),
      now()
    );
    setLinks(r.id, fd);
    return r.id;
  });

  revalidatePath("/changes");
  revalidatePath("/");
  redirect(`/changes/${id}`);
}

export async function updateChangeMetaAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const title = String(fd.get("title") ?? "").trim();
  if (!id || !title) return;
  tx(() => {
    run(
      `UPDATE changes SET title = ?, risk = ?, status = ?, client_id = ?, requested_by = ?, window_start = ?, window_end = ?, updated_at = ? WHERE id = ?`,
      title,
      String(fd.get("risk") ?? "medium"),
      String(fd.get("status") ?? "draft"),
      Number(fd.get("clientId")) || null,
      String(fd.get("requestedBy") ?? ""),
      dtToMs(fd.get("windowStart")),
      dtToMs(fd.get("windowEnd")),
      now(),
      id
    );
    setLinks(id, fd);
  });
  revalidatePath(`/changes/${id}`);
  revalidatePath("/changes");
  revalidatePath("/");
}

export async function updateChangeNarrativeAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const field = String(fd.get("field"));
  const value = String(fd.get("value") ?? "");
  if (!id || !["description", "planned_config", "rollback_plan"].includes(field)) return;
  run(`UPDATE changes SET ${field} = ?, updated_at = ? WHERE id = ?`, value, now(), id);
  revalidatePath(`/changes/${id}`);
}

export async function deleteChangeAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM changes WHERE id = ?", id);
  revalidatePath("/changes");
  revalidatePath("/");
  redirect("/changes");
}

export async function setChangeStatusAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const status = String(fd.get("status") ?? "");
  if (!id || !status) return;
  run("UPDATE changes SET status = ?, updated_at = ? WHERE id = ?", status, now(), id);
  revalidatePath(`/changes/${id}`);
  revalidatePath("/changes");
  revalidatePath("/");
}

export async function addChecklistItemAction(fd: FormData): Promise<void> {
  await requireAuth();
  const changeId = Number(fd.get("changeId"));
  const text = String(fd.get("text") ?? "").trim();
  if (!changeId || !text) return;
  run(
    "INSERT INTO change_checklist (change_id, text, command) VALUES (?, ?, ?)",
    changeId, text, String(fd.get("command") ?? "")
  );
  touch(changeId);
  revalidatePath(`/changes/${changeId}`);
}

export async function toggleChecklistItemAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const changeId = Number(fd.get("changeId"));
  if (!id) return;
  run("UPDATE change_checklist SET done = 1 - done WHERE id = ?", id);
  if (changeId) revalidatePath(`/changes/${changeId}`);
}

export async function saveChecklistOutputAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const changeId = Number(fd.get("changeId"));
  if (!id) return;
  run("UPDATE change_checklist SET output = ? WHERE id = ?", String(fd.get("output") ?? ""), id);
  if (changeId) revalidatePath(`/changes/${changeId}`);
}

export async function deleteChecklistItemAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const changeId = Number(fd.get("changeId"));
  if (!id) return;
  run("DELETE FROM change_checklist WHERE id = ?", id);
  if (changeId) revalidatePath(`/changes/${changeId}`);
}

export async function addChangeFileAction(fd: FormData): Promise<void> {
  await requireAuth();
  const changeId = Number(fd.get("changeId"));
  const filename = String(fd.get("filename") ?? "").trim() || "capture.txt";
  const content = String(fd.get("content") ?? "");
  if (!changeId || !content.trim()) return;
  run(
    "INSERT INTO change_files (change_id, kind, device_label, vendor_id, filename, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    changeId, String(fd.get("kind") ?? "other"), String(fd.get("device") ?? ""),
    Number(fd.get("vendor")) || null, filename, content, now()
  );
  touch(changeId);
  revalidatePath(`/changes/${changeId}`);
}

export async function deleteChangeFileAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const changeId = Number(fd.get("changeId"));
  if (!id) return;
  run("DELETE FROM change_files WHERE id = ?", id);
  if (changeId) revalidatePath(`/changes/${changeId}`);
}

export async function linkCaseAction(fd: FormData): Promise<void> {
  await requireAuth();
  const changeId = Number(fd.get("changeId"));
  const caseId = Number(fd.get("caseId"));
  if (!changeId || !caseId) return;
  run("INSERT OR IGNORE INTO change_cases (change_id, case_id) VALUES (?, ?)", changeId, caseId);
  touch(changeId);
  revalidatePath(`/changes/${changeId}`);
}

export async function unlinkCaseAction(fd: FormData): Promise<void> {
  await requireAuth();
  const changeId = Number(fd.get("changeId"));
  const caseId = Number(fd.get("caseId"));
  if (!changeId || !caseId) return;
  run("DELETE FROM change_cases WHERE change_id = ? AND case_id = ?", changeId, caseId);
  revalidatePath(`/changes/${changeId}`);
}
