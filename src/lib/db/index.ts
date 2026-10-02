import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty, seedCommandsIfEmpty, seedPlaybooksIfEmpty } from "./seed";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "netcortex.db");

const TS_DEFAULT = "DEFAULT (CAST(strftime('%s','now') AS INTEGER)*1000)";

const DDL = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendors (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  slug  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#38bdf8'
);

CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  notes      TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS technologies (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General'
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cases (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','in_progress','resolved','closed')),
  severity    TEXT NOT NULL DEFAULT 'P3'
              CHECK (severity IN ('P1','P2','P3','P4')),
  symptom     TEXT NOT NULL DEFAULT '',
  root_cause  TEXT NOT NULL DEFAULT '',
  solution    TEXT NOT NULL DEFAULT '',
  client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  opened_at   INTEGER NOT NULL ${TS_DEFAULT},
  resolved_at INTEGER,
  created_at  INTEGER NOT NULL ${TS_DEFAULT},
  updated_at  INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS case_vendors (
  case_id   INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS case_technologies (
  case_id       INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  technology_id INTEGER NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, technology_id)
);

CREATE TABLE IF NOT EXISTS case_tags (
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, tag_id)
);

CREATE TABLE IF NOT EXISTS case_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('note','command','log','status','resolution')),
  body         TEXT NOT NULL DEFAULT '',
  output       TEXT NOT NULL DEFAULT '',
  device_label TEXT NOT NULL DEFAULT '',
  vendor_id    INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  created_at   INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id      INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'other',
  device_label TEXT NOT NULL DEFAULT '',
  vendor_id    INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  filename     TEXT NOT NULL DEFAULT 'capture.txt',
  content      TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS error_kb (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  pattern      TEXT NOT NULL,
  pattern_type TEXT NOT NULL DEFAULT 'exact' CHECK (pattern_type IN ('exact','regex')),
  vendor_id    INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  meaning      TEXT NOT NULL DEFAULT '',
  kb_links     TEXT NOT NULL DEFAULT '[]',
  created_at   INTEGER NOT NULL ${TS_DEFAULT},
  updated_at   INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS error_causes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  error_id    INTEGER NOT NULL REFERENCES error_kb(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  verify      TEXT NOT NULL DEFAULT '',
  fix         TEXT NOT NULL DEFAULT '',
  frequency   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS case_errors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id    INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  error_id   INTEGER NOT NULL REFERENCES error_kb(id) ON DELETE CASCADE,
  cause_id   INTEGER REFERENCES error_causes(id) ON DELETE SET NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS command_refs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'General',
  notes      TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL ${TS_DEFAULT},
  updated_at INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS command_entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_id    INTEGER NOT NULL REFERENCES command_refs(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  command   TEXT NOT NULL,
  UNIQUE (ref_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS playbooks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL ${TS_DEFAULT},
  updated_at  INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS playbook_steps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  playbook_id INTEGER NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  kind        TEXT NOT NULL DEFAULT 'action' CHECK (kind IN ('action','question','note')),
  text        TEXT NOT NULL,
  checks      TEXT NOT NULL DEFAULT '[]',
  branches    TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS changes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','approved','scheduled','executed','successful','rolled_back','failed')),
  risk          TEXT NOT NULL DEFAULT 'medium' CHECK (risk IN ('low','medium','high')),
  client_id     INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  requested_by  TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  planned_config TEXT NOT NULL DEFAULT '',
  rollback_plan TEXT NOT NULL DEFAULT '',
  window_start  INTEGER,
  window_end    INTEGER,
  created_at    INTEGER NOT NULL ${TS_DEFAULT},
  updated_at    INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS change_vendors (
  change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  PRIMARY KEY (change_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS change_technologies (
  change_id      INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  technology_id  INTEGER NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  PRIMARY KEY (change_id, technology_id)
);

CREATE TABLE IF NOT EXISTS change_checklist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  change_id  INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  command    TEXT NOT NULL DEFAULT '',
  output     TEXT NOT NULL DEFAULT '',
  done       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS change_files (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  change_id    INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'other',
  device_label TEXT NOT NULL DEFAULT '',
  vendor_id    INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  filename     TEXT NOT NULL DEFAULT 'capture.txt',
  content      TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE TABLE IF NOT EXISTS change_cases (
  change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
  case_id   INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  PRIMARY KEY (change_id, case_id)
);

CREATE TABLE IF NOT EXISTS assistant_drafts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  question   TEXT NOT NULL DEFAULT '',
  log        TEXT NOT NULL DEFAULT '',
  mapping    TEXT NOT NULL DEFAULT '{}',
  prompt     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL ${TS_DEFAULT}
);

CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_case   ON snapshots(case_id);
CREATE INDEX IF NOT EXISTS idx_case_errors_case ON case_errors(case_id);
CREATE INDEX IF NOT EXISTS idx_case_errors_err  ON case_errors(error_id);
CREATE INDEX IF NOT EXISTS idx_causes_error     ON error_causes(error_id);
CREATE INDEX IF NOT EXISTS idx_cases_status     ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_client     ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cmd_entries_ref  ON command_entries(ref_id);
CREATE INDEX IF NOT EXISTS idx_playbook_steps   ON playbook_steps(playbook_id, position);
CREATE INDEX IF NOT EXISTS idx_change_checklist ON change_checklist(change_id);
CREATE INDEX IF NOT EXISTS idx_change_files     ON change_files(change_id);
CREATE INDEX IF NOT EXISTS idx_changes_status   ON changes(status);

-- Full-text search (FTS5, external content tables kept in sync by triggers)
CREATE VIRTUAL TABLE IF NOT EXISTS fts_cases USING fts5(
  title, symptom, root_cause, solution, content='cases', content_rowid='id'
);
CREATE VIRTUAL TABLE IF NOT EXISTS fts_events USING fts5(
  body, output, content='case_events', content_rowid='id'
);
CREATE VIRTUAL TABLE IF NOT EXISTS fts_errors USING fts5(
  title, pattern, meaning, content='error_kb', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS cases_fts_ai AFTER INSERT ON cases BEGIN
  INSERT INTO fts_cases(rowid, title, symptom, root_cause, solution)
  VALUES (new.id, new.title, new.symptom, new.root_cause, new.solution);
END;
CREATE TRIGGER IF NOT EXISTS cases_fts_ad AFTER DELETE ON cases BEGIN
  INSERT INTO fts_cases(fts_cases, rowid, title, symptom, root_cause, solution)
  VALUES ('delete', old.id, old.title, old.symptom, old.root_cause, old.solution);
END;
CREATE TRIGGER IF NOT EXISTS cases_fts_au AFTER UPDATE OF title, symptom, root_cause, solution ON cases BEGIN
  INSERT INTO fts_cases(fts_cases, rowid, title, symptom, root_cause, solution)
  VALUES ('delete', old.id, old.title, old.symptom, old.root_cause, old.solution);
  INSERT INTO fts_cases(rowid, title, symptom, root_cause, solution)
  VALUES (new.id, new.title, new.symptom, new.root_cause, new.solution);
END;

CREATE TRIGGER IF NOT EXISTS events_fts_ai AFTER INSERT ON case_events BEGIN
  INSERT INTO fts_events(rowid, body, output) VALUES (new.id, new.body, new.output);
END;
CREATE TRIGGER IF NOT EXISTS events_fts_ad AFTER DELETE ON case_events BEGIN
  INSERT INTO fts_events(fts_events, rowid, body, output) VALUES ('delete', old.id, old.body, old.output);
END;
CREATE TRIGGER IF NOT EXISTS events_fts_au AFTER UPDATE OF body, output ON case_events BEGIN
  INSERT INTO fts_events(fts_events, rowid, body, output) VALUES ('delete', old.id, old.body, old.output);
  INSERT INTO fts_events(rowid, body, output) VALUES (new.id, new.body, new.output);
END;

CREATE TRIGGER IF NOT EXISTS errors_fts_ai AFTER INSERT ON error_kb BEGIN
  INSERT INTO fts_errors(rowid, title, pattern, meaning) VALUES (new.id, new.title, new.pattern, new.meaning);
END;
CREATE TRIGGER IF NOT EXISTS errors_fts_ad AFTER DELETE ON error_kb BEGIN
  INSERT INTO fts_errors(fts_errors, rowid, title, pattern, meaning) VALUES ('delete', old.id, old.title, old.pattern, old.meaning);
END;
CREATE TRIGGER IF NOT EXISTS errors_fts_au AFTER UPDATE OF title, pattern, meaning ON error_kb BEGIN
  INSERT INTO fts_errors(fts_errors, rowid, title, pattern, meaning) VALUES ('delete', old.id, old.title, old.pattern, old.meaning);
  INSERT INTO fts_errors(rowid, title, pattern, meaning) VALUES (new.id, new.title, new.pattern, new.meaning);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS fts_commands USING fts5(
  task, notes, content='command_refs', content_rowid='id'
);
CREATE VIRTUAL TABLE IF NOT EXISTS fts_cmd_entries USING fts5(
  command, content='command_entries', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS commands_fts_ai AFTER INSERT ON command_refs BEGIN
  INSERT INTO fts_commands(rowid, task, notes) VALUES (new.id, new.task, new.notes);
END;
CREATE TRIGGER IF NOT EXISTS commands_fts_ad AFTER DELETE ON command_refs BEGIN
  INSERT INTO fts_commands(fts_commands, rowid, task, notes) VALUES ('delete', old.id, old.task, old.notes);
END;
CREATE TRIGGER IF NOT EXISTS commands_fts_au AFTER UPDATE OF task, notes ON command_refs BEGIN
  INSERT INTO fts_commands(fts_commands, rowid, task, notes) VALUES ('delete', old.id, old.task, old.notes);
  INSERT INTO fts_commands(rowid, task, notes) VALUES (new.id, new.task, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS cmd_entries_fts_ai AFTER INSERT ON command_entries BEGIN
  INSERT INTO fts_cmd_entries(rowid, command) VALUES (new.id, new.command);
END;
CREATE TRIGGER IF NOT EXISTS cmd_entries_fts_ad AFTER DELETE ON command_entries BEGIN
  INSERT INTO fts_cmd_entries(fts_cmd_entries, rowid, command) VALUES ('delete', old.id, old.command);
END;
CREATE TRIGGER IF NOT EXISTS cmd_entries_fts_au AFTER UPDATE OF command ON command_entries BEGIN
  INSERT INTO fts_cmd_entries(fts_cmd_entries, rowid, command) VALUES ('delete', old.id, old.command);
  INSERT INTO fts_cmd_entries(rowid, command) VALUES (new.id, new.command);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS fts_playbooks USING fts5(
  title, description, content='playbooks', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS playbooks_fts_ai AFTER INSERT ON playbooks BEGIN
  INSERT INTO fts_playbooks(rowid, title, description) VALUES (new.id, new.title, new.description);
END;
CREATE TRIGGER IF NOT EXISTS playbooks_fts_ad AFTER DELETE ON playbooks BEGIN
  INSERT INTO fts_playbooks(fts_playbooks, rowid, title, description) VALUES ('delete', old.id, old.title, old.description);
END;
CREATE TRIGGER IF NOT EXISTS playbooks_fts_au AFTER UPDATE OF title, description ON playbooks BEGIN
  INSERT INTO fts_playbooks(fts_playbooks, rowid, title, description) VALUES ('delete', old.id, old.title, old.description);
  INSERT INTO fts_playbooks(rowid, title, description) VALUES (new.id, new.title, new.description);
END;
`;

type GlobalWithDb = typeof globalThis & { __ncSqlite?: Database.Database };
const g = globalThis as GlobalWithDb;

function createDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);
  seedIfEmpty(sqlite);
  seedCommandsIfEmpty(sqlite);
  seedPlaybooksIfEmpty(sqlite);
  return sqlite;
}

let _db: Database.Database | undefined;

/** Lazy singleton: the database is created/seeded on first actual use, never at
 *  module import (keeps `next build` workers from racing on the file). */
export function getDb(): Database.Database {
  if (g.__ncSqlite) return g.__ncSqlite;
  if (!_db) _db = createDb();
  g.__ncSqlite = _db;
  return _db;
}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function one<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, ...params: unknown[]): { changes: number; id: number } {
  const r = getDb().prepare(sql).run(...params);
  return { changes: r.changes, id: Number(r.lastInsertRowid) };
}

export function tx<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}

export const now = (): number => Date.now();
