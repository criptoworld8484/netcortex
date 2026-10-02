"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../auth";
import { all, run, tx, now } from "../db";
import type { FormState } from "./auth";

function saveEntries(refId: number, fd: FormData, vendors: { id: number; slug: string }[]): void {
  run("DELETE FROM command_entries WHERE ref_id = ?", refId);
  for (const v of vendors) {
    const cmd = String(fd.get(`cmd_${v.id}`) ?? "").trim();
    if (cmd) run("INSERT INTO command_entries (ref_id, vendor_id, command) VALUES (?, ?, ?)", refId, v.id, cmd);
  }
}

export async function createCommandRefAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const task = String(fd.get("task") ?? "").trim();
  if (!task) return { error: "Task is required." };
  const category = String(fd.get("category") ?? "").trim() || "General";
  const notes = String(fd.get("notes") ?? "");

  const vendors = all<{ id: number; slug: string }>("SELECT id, slug FROM vendors ORDER BY name");
  const hasAny = vendors.some((v) => String(fd.get(`cmd_${v.id}`) ?? "").trim());
  if (!hasAny) return { error: "Add at least one vendor command." };

  const id = tx(() => {
    const r = run(
      "INSERT INTO command_refs (task, category, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      task, category, notes, now(), now()
    );
    saveEntries(r.id, fd, vendors);
    return r.id;
  });

  revalidatePath("/commands");
  redirect(`/commands/${id}`);
}

export async function updateCommandRefAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const task = String(fd.get("task") ?? "").trim();
  if (!id || !task) return;
  const vendors = all<{ id: number; slug: string }>("SELECT id, slug FROM vendors ORDER BY name");
  tx(() => {
    run(
      "UPDATE command_refs SET task = ?, category = ?, notes = ?, updated_at = ? WHERE id = ?",
      task, String(fd.get("category") ?? "General"), String(fd.get("notes") ?? ""), now(), id
    );
    saveEntries(id, fd, vendors);
  });
  revalidatePath("/commands");
  revalidatePath(`/commands/${id}`);
}

export async function deleteCommandRefAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM command_refs WHERE id = ?", id);
  revalidatePath("/commands");
  redirect("/commands");
}
