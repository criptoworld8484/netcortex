"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../auth";
import { run, tx, now } from "../db";
import { findMatches, type PatternEntry } from "../match";
import { all } from "../db";
import type { FormState } from "./auth";

function touch(caseId: number): void {
  run('UPDATE cases SET updated_at = ? WHERE id = ?', now(), caseId);
}

function setLinks(caseId: number, fd: FormData): void {
  run("DELETE FROM case_vendors WHERE case_id = ?", caseId);
  for (const v of fd.getAll("vendors")) {
    const id = Number(v);
    if (id) run("INSERT OR IGNORE INTO case_vendors (case_id, vendor_id) VALUES (?, ?)", caseId, id);
  }
  run("DELETE FROM case_technologies WHERE case_id = ?", caseId);
  for (const t of fd.getAll("techs")) {
    const id = Number(t);
    if (id) run("INSERT OR IGNORE INTO case_technologies (case_id, technology_id) VALUES (?, ?)", caseId, id);
  }
  run("DELETE FROM case_tags WHERE case_id = ?", caseId);
  const raw = String(fd.get("tags") ?? "");
  for (const name of raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    run("INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING", name);
    const tag = all<{ id: number }>("SELECT id FROM tags WHERE name = ?", name)[0];
    if (tag) run("INSERT OR IGNORE INTO case_tags (case_id, tag_id) VALUES (?, ?)", caseId, tag.id);
  }
}

function autoLinkLog(caseId: number, log: string, note: string): void {
  if (!log.trim()) return;
  const entries = all<PatternEntry>("SELECT id, title, pattern, pattern_type, vendor_id FROM error_kb");
  for (const group of findMatches(log, entries)) {
    run(
      "INSERT INTO case_errors (case_id, error_id, note) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM case_errors WHERE case_id = ? AND error_id = ?)",
      caseId, group.entry.id, note, caseId, group.entry.id
    );
  }
}

export async function createCaseAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAuth();
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };
  const mode = String(fd.get("mode") ?? "quick");
  const full = mode === "full";

  const status = full ? (String(fd.get("status") ?? "resolved") || "resolved") : "open";
  const severity = String(fd.get("severity") ?? "P3") || "P3";
  const symptom = String(fd.get("symptom") ?? "");
  const rootCause = full ? String(fd.get("rootCause") ?? "") : "";
  const solution = full ? String(fd.get("solution") ?? "") : "";
  const clientId = Number(fd.get("clientId")) || null;

  let openedAt = now();
  if (full && fd.get("openedAt")) {
    const t = new Date(String(fd.get("openedAt"))).getTime();
    if (!Number.isNaN(t)) openedAt = t;
  }
  let resolvedAt: number | null = null;
  if (full && (status === "resolved" || status === "closed") && fd.get("resolvedAt")) {
    const t = new Date(String(fd.get("resolvedAt"))).getTime();
    if (!Number.isNaN(t)) resolvedAt = t;
  }

  const caseId = tx(() => {
    const r = run(
      "INSERT INTO cases (title, status, severity, symptom, root_cause, solution, client_id, opened_at, resolved_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      title, status, severity, symptom, rootCause, solution, clientId, openedAt, resolvedAt, now(), now()
    );
    const id = r.id;
    setLinks(id, fd);
    const initialLog = String(fd.get("initialLog") ?? "");
    if (initialLog.trim()) {
      run(
        "INSERT INTO case_events (case_id, kind, body, output, device_label, vendor_id, created_at) VALUES (?, 'log', 'Initial log capture', ?, '', ?, ?)",
        id, initialLog, Number(fd.get("logVendor")) || null, openedAt
      );
      autoLinkLog(id, initialLog, "auto-linked from initial log");
    }
    if (full) {
      if (rootCause.trim()) {
        run("INSERT INTO case_events (case_id, kind, body, created_at) VALUES (?, 'resolution', ?, ?)", id, rootCause, resolvedAt ?? now());
      }
    }
    return id;
  });

  revalidatePath("/cases");
  revalidatePath("/");
  redirect(`/cases/${caseId}`);
}

export async function updateCaseMetaAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const title = String(fd.get("title") ?? "").trim();
  if (!id || !title) return;
  const status = String(fd.get("status") ?? "open");
  const resolved = status === "resolved" || status === "closed" ? now() : null;
  tx(() => {
    run(
      "UPDATE cases SET title = ?, severity = ?, status = ?, client_id = ?, resolved_at = COALESCE(?, resolved_at), updated_at = ? WHERE id = ?",
      title, String(fd.get("severity") ?? "P3"), status, Number(fd.get("clientId")) || null, resolved, now(), id
    );
    setLinks(id, fd);
  });
  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  revalidatePath("/");
}

export async function updateNarrativeAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const field = String(fd.get("field"));
  const value = String(fd.get("value") ?? "");
  if (!id || !["root_cause", "solution", "symptom"].includes(field)) return;
  run(`UPDATE cases SET ${field} = ?, updated_at = ? WHERE id = ?`, value, now(), id);
  revalidatePath(`/cases/${id}`);
}

export async function addEventAction(fd: FormData): Promise<void> {
  await requireAuth();
  const caseId = Number(fd.get("caseId"));
  const kind = String(fd.get("kind"));
  const body = String(fd.get("body") ?? "");
  const output = String(fd.get("output") ?? "");
  const device = String(fd.get("device") ?? "");
  const vendorId = Number(fd.get("vendor")) || null;
  if (!caseId || !kind) return;
  if (!body.trim() && !output.trim()) return;

  tx(() => {
    run(
      "INSERT INTO case_events (case_id, kind, body, output, device_label, vendor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      caseId, kind, body, output, device, vendorId, now()
    );
    if (kind === "log") autoLinkLog(caseId, output || body, "auto-linked from log event");
    if (kind === "status" || kind === "resolution") {
      const status = kind === "resolution" ? "resolved" : String(fd.get("status") ?? "in_progress");
      run("UPDATE cases SET status = ?, resolved_at = CASE WHEN ? IN ('resolved','closed') THEN ? ELSE resolved_at END, updated_at = ? WHERE id = ?",
        status, status, now(), now(), caseId);
    }
    touch(caseId);
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
}

export async function deleteEventAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const caseId = Number(fd.get("caseId"));
  if (!id) return;
  run("DELETE FROM case_events WHERE id = ?", id);
  if (caseId) revalidatePath(`/cases/${caseId}`);
}

export async function deleteCaseAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  if (!id) return;
  run("DELETE FROM cases WHERE id = ?", id);
  revalidatePath("/cases");
  revalidatePath("/");
  redirect("/cases");
}

export async function linkErrorAction(fd: FormData): Promise<void> {
  await requireAuth();
  const caseId = Number(fd.get("caseId"));
  const errorId = Number(fd.get("errorId"));
  const note = String(fd.get("note") ?? "");
  if (!caseId || !errorId) return;
  run(
    "INSERT INTO case_errors (case_id, error_id, note) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM case_errors WHERE case_id = ? AND error_id = ?)",
    caseId, errorId, note, caseId, errorId
  );
  touch(caseId);
  revalidatePath(`/cases/${caseId}`);
}

export async function unlinkErrorAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const caseId = Number(fd.get("caseId"));
  if (!id) return;
  run("DELETE FROM case_errors WHERE id = ?", id);
  if (caseId) revalidatePath(`/cases/${caseId}`);
}

export async function markCauseAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const caseId = Number(fd.get("caseId"));
  const causeId = Number(fd.get("causeId"));
  if (!id || !causeId) return;
  tx(() => {
    const prev = all<{ cause_id: number | null }>("SELECT cause_id FROM case_errors WHERE id = ?", id)[0];
    if (prev?.cause_id && prev.cause_id !== causeId) {
      run("UPDATE error_causes SET frequency = frequency - 1 WHERE id = ? AND frequency > 0", prev.cause_id);
    }
    const isNew = !prev?.cause_id;
    run("UPDATE case_errors SET cause_id = ? WHERE id = ?", causeId, id);
    if (isNew || prev?.cause_id !== causeId) {
      run("UPDATE error_causes SET frequency = frequency + 1 WHERE id = ?", causeId);
    }
    touch(caseId);
  });
  if (caseId) revalidatePath(`/cases/${caseId}`);
}

export async function addSnapshotAction(fd: FormData): Promise<void> {
  await requireAuth();
  const caseId = Number(fd.get("caseId"));
  const filename = String(fd.get("filename") ?? "").trim() || "capture.txt";
  const kind = String(fd.get("kind") ?? "other");
  const device = String(fd.get("device") ?? "");
  const vendorId = Number(fd.get("vendor")) || null;
  const content = String(fd.get("content") ?? "");
  if (!caseId || !content.trim()) return;
  run(
    "INSERT INTO snapshots (case_id, kind, device_label, vendor_id, filename, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    caseId, kind, device, vendorId, filename, content, now()
  );
  touch(caseId);
  revalidatePath(`/cases/${caseId}`);
}

export async function deleteSnapshotAction(fd: FormData): Promise<void> {
  await requireAuth();
  const id = Number(fd.get("id"));
  const caseId = Number(fd.get("caseId"));
  if (!id) return;
  run("DELETE FROM snapshots WHERE id = ?", id);
  if (caseId) revalidatePath(`/cases/${caseId}`);
}
