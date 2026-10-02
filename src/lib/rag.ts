import { all } from "./db";

export interface RagContext {
  cases: { id: number; title: string; severity: string; ttr: string; rootCause: string; solution: string }[];
  errors: { id: number; title: string; meaning: string; topCause: string | null; verify: string | null }[];
  commands: { id: number; task: string; commands: string }[];
  keywords: string[];
}

const STOP = new Set([
  "the", "and", "for", "with", "from", "this", "that", "not", "after", "before",
  "down", "up", "tunnel", "vpn", "error", "failed", "failure", "interface",
  "neighbor", "session", "policy", "when", "some", "have", "has", "its",
  "into", "over", "only", "very", "will", "can", "does",
]);

function keywordsFrom(q: string, log: string): string[] {
  const words = (q + " " + log)
    .toLowerCase()
    .split(/[^a-z0-9.:-]+/)
    .filter((w) => w.length >= 4 && w.length <= 30 && !STOP.has(w));
  return [...new Set(words)].slice(0, 12);
}

function ftsTerm(words: string[]): string | null {
  const t = words.map((w) => `"${w.replace(/["*]/g, "")}"*`).join(" ");
  return t || null;
}

/** Keyword-based retrieval over the local knowledge base (FTS5). */
export function buildRagContext(question: string, log: string): RagContext {
  const keywords = keywordsFrom(question, log);
  const term = ftsTerm(keywords);
  const ctx: RagContext = { cases: [], errors: [], commands: [], keywords };

  if (!term) return ctx;

  try {
    ctx.cases = all<{ id: number; title: string; severity: string; ttr: string; root_cause: string; solution: string; opened_at: number; resolved_at: number }>(
      `SELECT c.id, c.title, c.severity, c.root_cause, c.solution, c.opened_at, c.resolved_at
       FROM fts_cases f JOIN cases c ON c.id = f.rowid
       WHERE fts_cases MATCH ? AND c.status IN ('resolved','closed')
       ORDER BY rank LIMIT 3`,
      term
    ).map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      ttr: r.resolved_at ? `${Math.max(1, Math.round((r.resolved_at - r.opened_at) / 60000))}m` : "?",
      rootCause: r.root_cause.slice(0, 500),
      solution: r.solution.slice(0, 500),
    }));
  } catch { /* fts syntax */ }

  try {
    ctx.errors = all<{ id: number; title: string; meaning: string; topCause: string | null; verify: string | null }>(
      `SELECT k.id, k.title, k.meaning,
         (SELECT description FROM error_causes ec WHERE ec.error_id = k.id ORDER BY frequency DESC, id LIMIT 1) AS topCause,
         (SELECT verify FROM error_causes ec WHERE ec.error_id = k.id ORDER BY frequency DESC, id LIMIT 1) AS verify
       FROM fts_errors f JOIN error_kb k ON k.id = f.rowid
       WHERE fts_errors MATCH ? ORDER BY rank LIMIT 3`,
      term
    ).map((r) => ({
      id: r.id,
      title: r.title,
      meaning: r.meaning.slice(0, 400),
      topCause: r.topCause?.slice(0, 300) ?? null,
      verify: r.verify?.slice(0, 300) ?? null,
    }));
  } catch { /* fts syntax */ }

  try {
    ctx.commands = all<{ id: number; task: string; command: string }>(
      `SELECT r.id, r.task, e.command
       FROM fts_cmd_entries f
       JOIN command_entries e ON e.id = f.rowid
       JOIN command_refs r ON r.id = e.ref_id
       WHERE fts_cmd_entries MATCH ?
       GROUP BY r.id ORDER BY min(f.rank) LIMIT 4`,
      term
    ).map((r) => ({ id: r.id, task: r.task, commands: r.command.slice(0, 200) }));
  } catch { /* fts syntax */ }

  return ctx;
}

export function renderContextForPrompt(ctx: RagContext): string {
  const parts: string[] = [];
  if (ctx.cases.length) {
    parts.push(
      "### Similar resolved cases (from my own history)\n" +
        ctx.cases
          .map(
            (c) =>
              `- "${c.title}" (${c.severity}, TTR ${c.ttr})\n  root cause: ${c.rootCause || "n/a"}\n  solution: ${c.solution || "n/a"}`
          )
          .join("\n")
    );
  }
  if (ctx.errors.length) {
    parts.push(
      "### Known error patterns (my KB)\n" +
        ctx.errors
          .map(
            (e) =>
              `- ${e.title}: ${e.meaning}${e.topCause ? `\n  top cause (my evidence): ${e.topCause}` : ""}${e.verify ? `\n  verify: ${e.verify}` : ""}`
          )
          .join("\n")
    );
  }
  if (ctx.commands.length) {
    parts.push(
      "### Relevant commands\n" + ctx.commands.map((c) => `- ${c.task}: ${c.commands}`).join("\n")
    );
  }
  return parts.join("\n\n");
}
