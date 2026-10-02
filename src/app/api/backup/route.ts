import { NextResponse, type NextRequest } from "next/server";
import fs from "node:fs";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  "vendors",
  "clients",
  "technologies",
  "tags",
  "cases",
  "case_vendors",
  "case_technologies",
  "case_tags",
  "case_events",
  "snapshots",
  "error_kb",
  "error_causes",
  "case_errors",
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
] as const;

export async function GET(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "json";
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  if (type === "db") {
    const db = getDb();
    db.pragma("wal_checkpoint(TRUNCATE)");
    const path = db.name;
    const buf = fs.readFileSync(path);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="netcortex-${stamp}.db"`,
      },
    });
  }

  const data: Record<string, unknown[]> = { version: [1] } as unknown as Record<string, unknown[]>;
  for (const t of TABLES) {
    data[t] = getDb().prepare(`SELECT * FROM ${t}`).all();
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="netcortex-backup-${stamp}.json"`,
    },
  });
}
