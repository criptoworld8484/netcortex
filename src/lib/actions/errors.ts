"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../auth";
import { run, now } from "../db";
import type { FormState } from "./auth";

export async function createErrorAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const title = String(fd.get("title") ?? "").trim();
  const pattern = String(fd.get("pattern") ?? "").trim();
  if (!title || !pattern) return { error: "Title and pattern are required." };
  const patternType = String(fd.get("patternType") ?? "exact");
  const vendorId = Number(fd.get("vendor")) || null;
  const meaning = String(fd.get("meaning") ?? "");

  const id = run(
    "INSERT INTO error_kb (title, pattern, pattern_type, vendor_id, meaning, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    title, pattern, patternType, vendorId, meaning, now(), now()
  ).id;

  const desc = String(fd.get("causeDescription") ?? "").trim();
  if (desc) {
    run(
      "INSERT INTO error_causes (error_id, description, verify, fix) VALUES (?, ?, ?, ?)",
      id, desc, String(fd.get("causeVerify") ?? ""), String(fd.get("causeFix") ?? "")
    );
  }
  revalidatePath("/errors");
  redirect(`/errors/${id}`);
}

export async function updateErrorAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const title = String(fd.get("title") ?? "").trim();
  const pattern = String(fd.get("pattern") ?? "").trim();
  if (!id || !title || !pattern) return;
  const links = String(fd.get("kbLinks") ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  run(
    "UPDATE error_kb SET title = ?, pattern = ?, pattern_type = ?, vendor_id = ?, meaning = ?, kb_links = ?, updated_at = ? WHERE id = ?",
    title, pattern, String(fd.get("patternType") ?? "exact"), Number(fd.get("vendor")) || null,
    String(fd.get("meaning") ?? ""), JSON.stringify(links), now(), id
  );
  revalidatePath("/errors");
  revalidatePath(`/errors/${id}`);
}

export async function deleteErrorAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM error_kb WHERE id = ?", id);
  revalidatePath("/errors");
  redirect("/errors");
}

export async function addCauseAction(fd: FormData): Promise<void> {
  await requireAuth();
  const errorId = Number(fd.get("errorId"));
  const description = String(fd.get("description") ?? "").trim();
  if (!errorId || !description) return;
  run(
    "INSERT INTO error_causes (error_id, description, verify, fix) VALUES (?, ?, ?, ?)",
    errorId, description, String(fd.get("verify") ?? ""), String(fd.get("fix") ?? "")
  );
  run("UPDATE error_kb SET updated_at = ? WHERE id = ?", now(), errorId);
  revalidatePath(`/errors/${errorId}`);
}

export async function updateCauseAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const errorId = Number(fd.get("errorId"));
  const description = String(fd.get("description") ?? "").trim();
  if (!id || !description) return;
  run(
    "UPDATE error_causes SET description = ?, verify = ?, fix = ? WHERE id = ?",
    description, String(fd.get("verify") ?? ""), String(fd.get("fix") ?? ""), id
  );
  run("UPDATE error_kb SET updated_at = ? WHERE id = ?", now(), errorId);
  revalidatePath(`/errors/${errorId}`);
}

export async function deleteCauseAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const errorId = Number(fd.get("errorId"));
  if (!id) return;
  run("UPDATE case_errors SET cause_id = NULL WHERE cause_id = ?", id);
  run("DELETE FROM error_causes WHERE id = ?", id);
  revalidatePath(`/errors/${errorId}`);
}
