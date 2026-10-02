"use server";

import { requireAuth } from "../auth";
import { all } from "../db";
import { findMatches, type PatternEntry } from "../match";

export interface AnalyzerCause {
  id: number;
  description: string;
  verify: string;
  fix: string;
  frequency: number;
}

export interface AnalyzerGroup {
  errorId: number;
  title: string;
  meaning: string;
  vendorName: string | null;
  vendorColor: string | null;
  pattern: string;
  patternType: string;
  lines: { n: number; text: string }[];
  causes: AnalyzerCause[];
  relatedCount: number;
}

export interface AnalyzerState {
  groups: AnalyzerGroup[];
  error?: string;
  searched: boolean;
}

export async function analyzeLogAction(_prev: AnalyzerState, fd: FormData): Promise<AnalyzerState> {
  await requireAuth();
  const log = String(fd.get("log") ?? "");
  const vendorFilter = Number(fd.get("vendor")) || null;
  if (!log.trim()) return { groups: [], error: "Paste a log first.", searched: false };

  const entries = all<PatternEntry>("SELECT id, title, pattern, pattern_type, vendor_id FROM error_kb");
  const groups = findMatches(log, entries, vendorFilter);

  const hydrated: AnalyzerGroup[] = groups.map((g) => {
    const kb = all<{ title: string; meaning: string; vendor_name: string | null; vendor_color: string | null }>(
      `SELECT k.title, k.meaning, v.name AS vendor_name, v.color AS vendor_color
       FROM error_kb k LEFT JOIN vendors v ON v.id = k.vendor_id WHERE k.id = ?`,
      g.entry.id
    )[0];
    const causes = all<AnalyzerCause>("SELECT id, description, verify, fix, frequency FROM error_causes WHERE error_id = ? ORDER BY frequency DESC, id", g.entry.id);
    const rel = all<{ n: number }>("SELECT COUNT(*) n FROM case_errors WHERE error_id = ?", g.entry.id)[0];
    return {
      errorId: g.entry.id,
      title: kb?.title ?? g.entry.title,
      meaning: kb?.meaning ?? "",
      vendorName: kb?.vendor_name ?? null,
      vendorColor: kb?.vendor_color ?? null,
      pattern: g.entry.pattern,
      patternType: g.entry.pattern_type,
      lines: g.lines,
      causes,
      relatedCount: rel?.n ?? 0,
    };
  });

  return { groups: hydrated, searched: true };
}
