import { all, one } from "./db";
import type { PatternEntry } from "./match";

export interface CaseRow {
  id: number;
  title: string;
  status: string;
  severity: string;
  symptom: string;
  root_cause: string;
  solution: string;
  client_id: number | null;
  client_name: string | null;
  opened_at: number;
  resolved_at: number | null;
  created_at: number;
  updated_at: number;
  vendor_names: string | null;
  vendor_colors: string | null;
  tech_names: string | null;
  tag_names: string | null;
}

export interface EventRow {
  id: number;
  case_id: number;
  kind: string;
  body: string;
  output: string;
  device_label: string;
  vendor_id: number | null;
  vendor_name: string | null;
  vendor_color: string | null;
  created_at: number;
}

export interface VendorRow {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export interface CauseRow {
  id: number;
  error_id: number;
  description: string;
  verify: string;
  fix: string;
  frequency: number;
}

export interface ErrorRow {
  id: number;
  title: string;
  pattern: string;
  pattern_type: string;
  vendor_id: number | null;
  vendor_name: string | null;
  vendor_color: string | null;
  meaning: string;
  kb_links: string;
  created_at: number;
  updated_at: number;
  cause_count?: number;
  case_count?: number;
}

const CASE_SELECT = `
  SELECT c.*, cl.name AS client_name,
    (SELECT GROUP_CONCAT(v.name, '||') FROM case_vendors cv JOIN vendors v ON v.id = cv.vendor_id WHERE cv.case_id = c.id) AS vendor_names,
    (SELECT GROUP_CONCAT(v.color, '||') FROM case_vendors cv JOIN vendors v ON v.id = cv.vendor_id WHERE cv.case_id = c.id) AS vendor_colors,
    (SELECT GROUP_CONCAT(t.name, ', ') FROM case_technologies ct JOIN technologies t ON t.id = ct.technology_id WHERE ct.case_id = c.id) AS tech_names,
    (SELECT GROUP_CONCAT(t.name, ', ') FROM case_tags cg JOIN tags t ON t.id = cg.tag_id WHERE cg.case_id = c.id) AS tag_names
  FROM cases c LEFT JOIN clients cl ON cl.id = c.client_id
`;

export function listCases(filters: {
  status?: string;
  severity?: string;
  vendorId?: number;
  clientId?: number;
  techId?: number;
  q?: string;
}): CaseRow[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    where.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.severity) {
    where.push("c.severity = ?");
    params.push(filters.severity);
  }
  if (filters.clientId) {
    where.push("c.client_id = ?");
    params.push(filters.clientId);
  }
  if (filters.vendorId) {
    where.push("c.id IN (SELECT case_id FROM case_vendors WHERE vendor_id = ?)");
    params.push(filters.vendorId);
  }
  if (filters.techId) {
    where.push("c.id IN (SELECT case_id FROM case_technologies WHERE technology_id = ?)");
    params.push(filters.techId);
  }
  if (filters.q) {
    const like = `%${filters.q}%`;
    where.push(
      "(c.title LIKE ? OR c.symptom LIKE ? OR c.root_cause LIKE ? OR c.solution LIKE ? OR c.id IN (SELECT case_id FROM case_events WHERE body LIKE ? OR output LIKE ?))"
    );
    params.push(like, like, like, like, like, like);
  }
  const sql =
    CASE_SELECT +
    (where.length ? "WHERE " + where.join(" AND ") + " " : "") +
    `ORDER BY CASE c.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END, c.opened_at DESC LIMIT 200`;
  return all<CaseRow>(sql, ...params);
}

export function getCase(id: number): CaseRow | undefined {
  return one<CaseRow>(CASE_SELECT + "WHERE c.id = ?", id);
}

export function getCaseVendors(caseId: number): VendorRow[] {
  return all<VendorRow>(
    "SELECT v.* FROM case_vendors cv JOIN vendors v ON v.id = cv.vendor_id WHERE cv.case_id = ? ORDER BY v.name",
    caseId
  );
}

export function getCaseTechnologies(caseId: number): { id: number; name: string; category: string }[] {
  return all(
    "SELECT t.* FROM case_technologies ct JOIN technologies t ON t.id = ct.technology_id WHERE ct.case_id = ? ORDER BY t.category, t.name",
    caseId
  );
}

export function listVendors(): VendorRow[] {
  return all<VendorRow>("SELECT * FROM vendors ORDER BY name");
}

export function listClients(): { id: number; name: string; notes: string; created_at: number; case_count?: number }[] {
  return all("SELECT cl.*, (SELECT COUNT(*) FROM cases c WHERE c.client_id = cl.id) AS case_count FROM clients cl ORDER BY cl.name");
}

export function listTechnologies(): { id: number; name: string; category: string; case_count?: number }[] {
  return all(
    "SELECT t.*, (SELECT COUNT(*) FROM case_technologies ct WHERE ct.technology_id = t.id) AS case_count FROM technologies t ORDER BY t.category, t.name"
  );
}

export function listTags(): { id: number; name: string; case_count: number }[] {
  return all(
    "SELECT t.*, (SELECT COUNT(*) FROM case_tags cg WHERE cg.tag_id = t.id) AS case_count FROM tags t ORDER BY t.name"
  );
}

export function getEvents(caseId: number): EventRow[] {
  return all<EventRow>(
    `SELECT e.*, v.name AS vendor_name, v.color AS vendor_color
     FROM case_events e LEFT JOIN vendors v ON v.id = e.vendor_id
     WHERE e.case_id = ? ORDER BY e.created_at ASC, e.id ASC`,
    caseId
  );
}

export function getSnapshots(caseId: number) {
  return all<{
    id: number;
    case_id: number;
    kind: string;
    device_label: string;
    vendor_id: number | null;
    vendor_name: string | null;
    filename: string;
    content: string;
    created_at: number;
  }>(
    `SELECT s.*, v.name AS vendor_name FROM snapshots s LEFT JOIN vendors v ON v.id = s.vendor_id
     WHERE s.case_id = ? ORDER BY s.created_at DESC`,
    caseId
  );
}

export function getCaseErrors(caseId: number) {
  return all<{
    id: number;
    case_id: number;
    error_id: number;
    cause_id: number | null;
    note: string;
    created_at: number;
    title: string;
    pattern: string;
    vendor_name: string | null;
    vendor_color: string | null;
  }>(
    `SELECT ce.*, k.title, k.pattern, v.name AS vendor_name, v.color AS vendor_color
     FROM case_errors ce
     JOIN error_kb k ON k.id = ce.error_id
     LEFT JOIN vendors v ON v.id = k.vendor_id
     WHERE ce.case_id = ? ORDER BY ce.created_at DESC`,
    caseId
  );
}

export function listErrors(q?: string): ErrorRow[] {
  const base = `
    SELECT k.*, v.name AS vendor_name, v.color AS vendor_color,
      (SELECT COUNT(*) FROM error_causes c WHERE c.error_id = k.id) AS cause_count,
      (SELECT COUNT(*) FROM case_errors ce WHERE ce.error_id = k.id) AS case_count
    FROM error_kb k LEFT JOIN vendors v ON v.id = k.vendor_id`;
  if (q) {
    return all<ErrorRow>(
      base + " WHERE k.title LIKE ? OR k.pattern LIKE ? OR k.meaning LIKE ? ORDER BY k.title",
      `%${q}%`,
      `%${q}%`,
      `%${q}%`
    );
  }
  return all<ErrorRow>(base + " ORDER BY k.title");
}

export function getError(id: number): ErrorRow | undefined {
  return one<ErrorRow>(
    `SELECT k.*, v.name AS vendor_name, v.color AS vendor_color FROM error_kb k
     LEFT JOIN vendors v ON v.id = k.vendor_id WHERE k.id = ?`,
    id
  );
}

export function getCauses(errorId: number): CauseRow[] {
  return all<CauseRow>(
    "SELECT * FROM error_causes WHERE error_id = ? ORDER BY frequency DESC, id ASC",
    errorId
  );
}

export function getRelatedCases(errorId: number): CaseRow[] {
  return all<CaseRow>(
    CASE_SELECT + "WHERE c.id IN (SELECT case_id FROM case_errors WHERE error_id = ?) ORDER BY c.opened_at DESC LIMIT 20",
    errorId
  );
}

export function getPatternEntries(): PatternEntry[] {
  return all<PatternEntry>(
    "SELECT id, title, pattern, pattern_type, vendor_id FROM error_kb ORDER BY title"
  );
}

export interface CommandRefRow {
  id: number;
  task: string;
  category: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface CommandEntryRow {
  ref_id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_color: string;
  command: string;
}

export function listCommandRefs(filters: { category?: string; vendorId?: number; q?: string } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.category) {
    where.push("r.category = ?");
    params.push(filters.category);
  }
  if (filters.vendorId) {
    where.push("r.id IN (SELECT ref_id FROM command_entries WHERE vendor_id = ?)");
    params.push(filters.vendorId);
  }
  if (filters.q) {
    const like = `%${filters.q}%`;
    where.push(
      "(r.task LIKE ? OR r.notes LIKE ? OR r.id IN (SELECT ref_id FROM command_entries WHERE command LIKE ?))"
    );
    params.push(like, like, like);
  }
  const refs = all<CommandRefRow>(
    `SELECT r.* FROM command_refs r ${where.length ? "WHERE " + where.join(" AND ") + " " : ""}
     ORDER BY r.category, r.task`,
    ...params
  );
  const entries = all<CommandEntryRow>(
    `SELECT e.ref_id, e.vendor_id, v.name AS vendor_name, v.color AS vendor_color, e.command
     FROM command_entries e JOIN vendors v ON v.id = e.vendor_id
     ${filters.vendorId ? "WHERE e.vendor_id = ?" : ""}
     ORDER BY v.name`,
    ...(filters.vendorId ? [filters.vendorId] : [])
  );
  const byRef = new Map<number, CommandEntryRow[]>();
  for (const e of entries) {
    (byRef.get(e.ref_id) ?? byRef.set(e.ref_id, []).get(e.ref_id)!).push(e);
  }
  return { refs, byRef };
}

export function getCommandRef(id: number) {
  const ref = one<CommandRefRow>("SELECT * FROM command_refs WHERE id = ?", id);
  if (!ref) return undefined;
  const entries = all<CommandEntryRow>(
    `SELECT e.ref_id, e.vendor_id, v.name AS vendor_name, v.color AS vendor_color, e.command
     FROM command_entries e JOIN vendors v ON v.id = e.vendor_id
     WHERE e.ref_id = ? ORDER BY v.name`,
    id
  );
  return { ref, entries };
}

export function listCommandCategories(): { category: string; n: number }[] {
  return all(
    "SELECT category, COUNT(*) n FROM command_refs GROUP BY category ORDER BY category"
  );
}

// ---------- Playbooks ----------

export interface PlaybookRow {
  id: number;
  title: string;
  category: string;
  description: string;
  created_at: number;
  updated_at: number;
  step_count?: number;
}

export function listPlaybooks(q?: string): PlaybookRow[] {
  const base = `
    SELECT p.*, (SELECT COUNT(*) FROM playbook_steps s WHERE s.playbook_id = p.id) AS step_count
    FROM playbooks p`;
  if (q) {
    return all<PlaybookRow>(base + " WHERE p.title LIKE ? OR p.description LIKE ? ORDER BY p.category, p.title", `%${q}%`, `%${q}%`);
  }
  return all<PlaybookRow>(base + " ORDER BY p.category, p.title");
}

export interface PlaybookStepRow {
  id: number;
  playbook_id: number;
  position: number;
  kind: string;
  text: string;
  checks: string;
  branches: string;
}

export function getPlaybook(id: number): { playbook: PlaybookRow; steps: PlaybookStepRow[] } | undefined {
  const playbook = one<PlaybookRow>(
    `SELECT p.*, (SELECT COUNT(*) FROM playbook_steps s WHERE s.playbook_id = p.id) AS step_count
     FROM playbooks p WHERE p.id = ?`,
    id
  );
  if (!playbook) return undefined;
  const steps = all<PlaybookStepRow>(
    "SELECT * FROM playbook_steps WHERE playbook_id = ? ORDER BY position ASC, id ASC",
    id
  );
  return { playbook, steps };
}

// ---------- Changes ----------

export interface ChangeRow {
  id: number;
  title: string;
  status: string;
  risk: string;
  client_id: number | null;
  client_name: string | null;
  requested_by: string;
  description: string;
  planned_config: string;
  rollback_plan: string;
  window_start: number | null;
  window_end: number | null;
  created_at: number;
  updated_at: number;
  vendor_names: string | null;
  vendor_colors: string | null;
  tech_names: string | null;
  checklist_total: number;
  checklist_done: number;
}

const CHANGE_SELECT = `
  SELECT ch.*, cl.name AS client_name,
    (SELECT GROUP_CONCAT(v.name, '||') FROM change_vendors cv JOIN vendors v ON v.id = cv.vendor_id WHERE cv.change_id = ch.id) AS vendor_names,
    (SELECT GROUP_CONCAT(v.color, '||') FROM change_vendors cv JOIN vendors v ON v.id = cv.vendor_id WHERE cv.change_id = ch.id) AS vendor_colors,
    (SELECT GROUP_CONCAT(t.name, ', ') FROM change_technologies ct JOIN technologies t ON t.id = ct.technology_id WHERE ct.change_id = ch.id) AS tech_names,
    (SELECT COUNT(*) FROM change_checklist k WHERE k.change_id = ch.id) AS checklist_total,
    (SELECT COUNT(*) FROM change_checklist k WHERE k.change_id = ch.id AND k.done = 1) AS checklist_done
  FROM changes ch LEFT JOIN clients cl ON cl.id = ch.client_id
`;

export function listChanges(filters: { status?: string; clientId?: number; q?: string } = {}): ChangeRow[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    where.push("ch.status = ?");
    params.push(filters.status);
  }
  if (filters.clientId) {
    where.push("ch.client_id = ?");
    params.push(filters.clientId);
  }
  if (filters.q) {
    const like = `%${filters.q}%`;
    where.push("(ch.title LIKE ? OR ch.description LIKE ? OR ch.requested_by LIKE ?)");
    params.push(like, like, like);
  }
  return all<ChangeRow>(
    CHANGE_SELECT +
      (where.length ? "WHERE " + where.join(" AND ") + " " : "") +
      `ORDER BY CASE ch.status WHEN 'draft' THEN 0 WHEN 'approved' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'executed' THEN 3 ELSE 4 END, COALESCE(ch.window_start, ch.created_at) DESC LIMIT 200`,
    ...params
  );
}

export function getChange(id: number): ChangeRow | undefined {
  return one<ChangeRow>(CHANGE_SELECT + "WHERE ch.id = ?", id);
}

export function getChangeVendors(changeId: number): VendorRow[] {
  return all<VendorRow>(
    "SELECT v.* FROM change_vendors cv JOIN vendors v ON v.id = cv.vendor_id WHERE cv.change_id = ? ORDER BY v.name",
    changeId
  );
}

export function getChangeTechnologies(changeId: number) {
  return all<{ id: number; name: string; category: string }>(
    "SELECT t.* FROM change_technologies ct JOIN technologies t ON t.id = ct.technology_id WHERE ct.change_id = ? ORDER BY t.category, t.name",
    changeId
  );
}

export function getChangeChecklist(changeId: number) {
  return all<{ id: number; change_id: number; text: string; command: string; output: string; done: number; created_at: number }>(
    "SELECT * FROM change_checklist WHERE change_id = ? ORDER BY id ASC",
    changeId
  );
}

export function getChangeFiles(changeId: number) {
  return all<{
    id: number;
    change_id: number;
    kind: string;
    device_label: string;
    vendor_id: number | null;
    vendor_name: string | null;
    filename: string;
    content: string;
    created_at: number;
  }>(
    `SELECT f.*, v.name AS vendor_name FROM change_files f LEFT JOIN vendors v ON v.id = f.vendor_id
     WHERE f.change_id = ? ORDER BY f.created_at DESC`,
    changeId
  );
}

export function getChangeCases(changeId: number) {
  return all<{ case_id: number; title: string; status: string; severity: string }>(
    `SELECT cc.case_id, c.title, c.status, c.severity
     FROM change_cases cc JOIN cases c ON c.id = cc.case_id
     WHERE cc.change_id = ? ORDER BY cc.case_id DESC`,
    changeId
  );
}

export function upcomingChanges(limit = 5): ChangeRow[] {
  return all<ChangeRow>(
    CHANGE_SELECT +
      "WHERE ch.status IN ('draft','approved','scheduled') ORDER BY COALESCE(ch.window_start, ch.created_at) ASC LIMIT ?",
    limit
  );
}

export function dashboardData() {
  const open = all<CaseRow>(
    CASE_SELECT + "WHERE c.status IN ('open','in_progress') ORDER BY CASE c.severity WHEN 'P1' THEN 0 WHEN 'P2' THEN 1 WHEN 'P3' THEN 2 ELSE 3 END, c.opened_at DESC LIMIT 10"
  );
  const recentErrors = all<{
    id: number;
    created_at: number;
    case_id: number;
    case_title: string;
    error_id: number;
    title: string;
    vendor_name: string | null;
    vendor_color: string | null;
  }>(
    `SELECT ce.id, ce.created_at, ce.case_id, c.title AS case_title, ce.error_id, k.title, v.name AS vendor_name, v.color AS vendor_color
     FROM case_errors ce
     JOIN error_kb k ON k.id = ce.error_id
     JOIN cases c ON c.id = ce.case_id
     LEFT JOIN vendors v ON v.id = k.vendor_id
     ORDER BY ce.created_at DESC LIMIT 8`
  );
  const stats = one<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    kb: number;
    avg_ttr: number | null;
    changes_active: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM cases) AS total,
      (SELECT COUNT(*) FROM cases WHERE status='open') AS open,
      (SELECT COUNT(*) FROM cases WHERE status='in_progress') AS in_progress,
      (SELECT COUNT(*) FROM cases WHERE status IN ('resolved','closed')) AS resolved,
      (SELECT COUNT(*) FROM error_kb) AS kb,
      (SELECT AVG(resolved_at - opened_at) FROM cases WHERE resolved_at IS NOT NULL) AS avg_ttr,
      (SELECT COUNT(*) FROM changes WHERE status IN ('draft','approved','scheduled')) AS changes_active`
  );
  const upcoming = upcomingChanges(5);
  return {
    open,
    recentErrors,
    upcoming,
    stats: stats ?? { total: 0, open: 0, in_progress: 0, resolved: 0, kb: 0, avg_ttr: null, changes_active: 0 },
  };
}

export interface SearchHit {
  type: "case" | "event" | "error" | "command" | "playbook";
  id: number;
  title: string;
  snippet: string;
  meta: string;
  extra?: string;
}

function ftsTerm(q: string): string | null {
  const tokens = q
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, ""))
    .filter(Boolean)
    .map((t) => `"${t}"*`);
  return tokens.length ? tokens.join(" ") : null;
}

export function searchAll(q: string): {
  cases: SearchHit[];
  events: SearchHit[];
  errors: SearchHit[];
  commands: SearchHit[];
  playbooks: SearchHit[];
} {
  const term = ftsTerm(q);
  if (!term) return { cases: [], events: [], errors: [], commands: [], playbooks: [] };

  const empty = {
    cases: [] as SearchHit[],
    events: [] as SearchHit[],
    errors: [] as SearchHit[],
    commands: [] as SearchHit[],
    playbooks: [] as SearchHit[],
  };
  try {
    const cases = all<{ id: number; title: string; status: string; severity: string; opened_at: number }>(
      `SELECT c.id, c.title, c.status, c.severity, c.opened_at
       FROM fts_cases f JOIN cases c ON c.id = f.rowid
       WHERE fts_cases MATCH ? ORDER BY rank LIMIT 25`,
      term
    ).map<SearchHit>((r) => ({
      type: "case",
      id: r.id,
      title: r.title,
      snippet: "",
      meta: `${r.severity} · ${r.status}`,
      extra: String(r.opened_at),
    }));

    const events = all<{
      id: number;
      case_id: number;
      kind: string;
      body: string;
      output: string;
      created_at: number;
      case_title: string;
    }>(
      `SELECT e.id, e.case_id, e.kind, e.body, e.output, e.created_at, c.title AS case_title
       FROM fts_events f JOIN case_events e ON e.id = f.rowid
       JOIN cases c ON c.id = e.case_id
       WHERE fts_events MATCH ? ORDER BY rank LIMIT 25`,
      term
    ).map<SearchHit>((r) => ({
      type: "event",
      id: r.case_id,
      title: r.case_title,
      snippet: (r.body + " " + r.output).slice(0, 220),
      meta: r.kind,
      extra: String(r.id),
    }));

    const errors = all<{ id: number; title: string; pattern: string; vendor_name: string | null }>(
      `SELECT k.id, k.title, k.pattern, v.name AS vendor_name
       FROM fts_errors f JOIN error_kb k ON k.id = f.rowid
       LEFT JOIN vendors v ON v.id = k.vendor_id
       WHERE fts_errors MATCH ? ORDER BY rank LIMIT 25`,
      term
    ).map<SearchHit>((r) => ({
      type: "error",
      id: r.id,
      title: r.title,
      snippet: r.pattern,
      meta: r.vendor_name ?? "multi-vendor",
    }));

    const commands = all<{ id: number; task: string; category: string }>(
      `SELECT r.id, r.task, r.category
       FROM fts_commands f JOIN command_refs r ON r.id = f.rowid
       WHERE fts_commands MATCH ? ORDER BY rank LIMIT 25`,
      term
    ).map<SearchHit>((r) => ({
      type: "command",
      id: r.id,
      title: r.task,
      snippet: "",
      meta: r.category,
    }));

    const cmdEntries = all<{ ref_id: number; task: string; vendor_name: string | null; command: string }>(
      `SELECT e.ref_id, r.task, v.name AS vendor_name, e.command
       FROM fts_cmd_entries f
       JOIN command_entries e ON e.id = f.rowid
       JOIN command_refs r ON r.id = e.ref_id
       LEFT JOIN vendors v ON v.id = e.vendor_id
       WHERE fts_cmd_entries MATCH ? ORDER BY rank LIMIT 25`,
      term
    ).map<SearchHit>((r) => ({
      type: "command",
      id: r.ref_id,
      title: r.task,
      snippet: r.command,
      meta: r.vendor_name ?? "",
    }));

    const seenCmd = new Set<number>();
    const mergedCommands = [...commands, ...cmdEntries].filter((h) => {
      if (seenCmd.has(h.id)) return false;
      seenCmd.add(h.id);
      return true;
    });

    const playbooks = all<{ id: number; title: string; category: string }>(
      `SELECT p.id, p.title, p.category
       FROM fts_playbooks f JOIN playbooks p ON p.id = f.rowid
       WHERE fts_playbooks MATCH ? ORDER BY rank LIMIT 10`,
      term
    ).map<SearchHit>((r) => ({
      type: "playbook",
      id: r.id,
      title: r.title,
      snippet: "",
      meta: r.category,
    }));

    return { cases, events, errors, commands: mergedCommands, playbooks };
  } catch {
    return empty;
  }
}
