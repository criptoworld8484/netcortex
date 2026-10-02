# IT-Network Brain — Design Spec & Roadmap

> Personal knowledge base + troubleshooting assistant for a multi-vendor network
> engineer (Cisco, Juniper, FortiGate, Palo Alto, Check Point).
> Status: **ALL 4 PHASES COMPLETE & verified.** Maintenance/enhancement mode.

---

## 1. Locked decisions

| Decision | Choice |
|---|---|
| Language | All English (UI + content) |
| Format | Web app, self-hosted |
| Access | Multi-device via Tailscale + HTTPS reverse proxy (Caddy) |
| Stack | Next.js (App Router) + TypeScript + Tailwind CSS |
| DB | SQLite (better-sqlite3 + Drizzle query layer) + FTS5 full-text search |
| Auth | Single user, password (bcrypt) + signed session cookie (JWT/jose) |
| Severity | `P1–P4` |
| Playbooks v1 | Linear checklists with "if → jump" links (trees later) |
| Case entry | Dual: live timeline capture **and** post-mortem bulk form |
| Vendor auto-detect from logs | Nice-to-have, phase 2+ |
| AI | External API (Claude/GPT) + anonymizer layer, **phase 4** |

## 2. Data model (Phase 1 scope)

```
vendors(id, name, slug, color)          — seeded: Cisco, Juniper, FortiGate, Palo Alto, Check Point
clients(id, name, notes, createdAt)
technologies(id, name, category)        — Routing, Switching, Security, VPN, Infrastructure, HA...
tags(id, name)                          — free-form, via case_tags

cases(id, title, status, severity, symptom, rootCause, solution,
      clientId, openedAt, resolvedAt, createdAt, updatedAt)
  status: open | in_progress | resolved | closed
  M2M: case_vendors, case_technologies, case_tags

case_events(id, caseId, kind, body, output, deviceLabel, vendorId, createdAt)
  kind: note | command | log | status | resolution
  → the case TIMELINE. Capture-while-troubleshooting is the core workflow.

snapshots(id, caseId, kind, deviceLabel, vendorId, filename, content, createdAt)
  kind: pre | post | config | log | other

error_kb(id, title, pattern, patternType, vendorId, meaning, kbLinks, createdAt, updatedAt)
  patternType: exact (substring, case-insensitive) | regex
  vendorId nullable → null = multi-vendor pattern

error_causes(id, errorId, description, verify, fix, frequency)
  frequency auto-increments when a resolved case marks this cause as the real one.

case_errors(id, caseId, errorId, causeId, note, createdAt)
  auto-created when a pasted log matches a pattern; manual linking also possible.

settings(key, value)  — password hash, auth secret

FTS5: fts_cases / fts_events / fts_errors (external content tables + triggers)
```

Deliberately excluded (future): formal Device inventory (free-text `deviceLabel`
covers it), multi-user, and all Phase 2–4 entities.

## 3. Screens (Phase 1)

1. **Dashboard `/`** — open cases, recent detected errors, quick actions
   (New Case, Paste Log), global search box
2. **Login `/login`** + **first-run `/setup`** (create password)
3. **Case List `/cases`** — filters: status, severity, vendor, client,
   technology, full-text
4. **New Case `/cases/new`** — two tabs: *Quick capture* (symptom-first, log
   optional) and *Post-mortem* (full form incl. rootCause, solution, dates for TTR)
5. **Case Detail `/cases/[id]`** — tabs:
   - **Timeline**: chronological events; quick-append bar
     `[+ note] [+ command] [+ log] [+ status] [+ resolution]`;
     command events = command + output + device + vendor; log events are
     auto-analyzed → matched ErrorKB patterns linked automatically
   - **Root Cause & Solution**: markdown editors
   - **Errors**: linked ErrorKB entries; on resolution, mark the actual cause
     (feeds `frequency`)
   - **Files**: snapshots (paste-based: filename + content + kind + device)
6. **Error KB `/errors`** — list/detail/edit; causes with frequency bars,
   verify commands, related cases
7. **Analyzer `/analyzer`** — paste log → vendor optional → matched patterns
   (line numbers), causes ranked by empirical frequency, related cases,
   "Create case from this log"
8. **Settings `/settings`** — manage clients/technologies/tags, change password,
   JSON export/import, `.db` backup download
9. **Search `/search`** — grouped FTS results (Cases / Timeline events / Error KB)

Design: dark, terminal/network-ops aesthetic. Monospace for commands/logs.
Per-vendor accent colors. Severity P1 red → P4 slate; status color badges.

## 4. Phase 1 — COMPLETE (build order as executed)

1. Scaffold Next.js 16 + SQLite + Docker skeleton ✔
2. Auth (setup/login/proxy.ts) ✔
3. Seed: 5 vendors, 19 technologies, 12 starter ErrorKB entries (editable) ✔
4. Cases (list, quick capture, post-mortem, detail + timeline) ✔
5. Error KB CRUD + causes + frequency ✔
6. Analyzer + auto-link on case log events ✔
7. Settings (manage lists, backup/export/import) ✔
8. Dashboard + global search (FTS5) ✔
9. Docker + Caddy + docs ✔ — verified: prod build, image, container smoke test

Notes from verification: use `docker-compose` (standalone) if the compose
plugin is absent; `.dockerignore` is mandatory (local node_modules ABI mismatch).

## 5. Backlog (phases 2–4)

- **Phase 2: COMPLETE** — CommandRef cross-vendor matrix (`/commands`, 17 seeded
  tasks × 5 vendors, category filters, copy-per-cell, full CRUD); vendor
  auto-detection from pasted logs (analyzer + new-case form, respects manual
  selection); commands integrated into global FTS search and backup/import.
- **Phase 3: COMPLETE** — Playbooks v1 (`/playbooks`): linear steps
  (action/question/note), per-vendor check commands, branch jumps
  (`label => step#`), interactive walkthrough mode with progress dots,
  "create case from playbook"; 2 seeded playbooks (VPN down, BGP flapping).
  Change management (`/changes`): pipeline draft→approved→scheduled→executed
  →successful/rolled_back/failed, risk levels, maintenance windows,
  planned-config & rollback-plan editors, verification checklist with evidence
  output, pre/post file captures, two-way case linking; dashboard
  "Upcoming changes" panel. All new tables in FTS search + backup/import.
- **Phase 4: COMPLETE** — AI Assistant (`/assistant`): two-step flow
  (Prepare → review exact prompt → Send). Local anonymizer (IPv4/IPv6, MACs,
  FQDNs, emails, `user=`/prose usernames with stopword guard, ASNs) with typed
  placeholders and consistent numbering; mapping kept server-side only
  (`assistant_drafts`), used to restore real values in the answer locally.
  RAG context via FTS5 keywords: top resolved cases (root cause + solution),
  KB entries (with evidence-ranked top cause), matching command tasks.
  Providers: Anthropic (Claude), OpenAI, OpenAI-compatible (custom base URL),
  and an offline demo mode. API key stored locally (Settings → AI Assistant),
  masked in UI, testable ("Test connection"). Analyzer has "Ask AI about this
  log" prefill.
- Later ideas: formal device inventory, TOTP 2FA, tree-based playbooks,
  mobile PWA capture, embeddings-based RAG, assistant conversation mode

## 6. Deployment notes

- `Dockerfile` (multi-stage, Next standalone output, node:22-bookworm-slim)
- `docker-compose.yml` with `./data` volume → the SQLite file lives there;
  backup = download `.db` from Settings
- `Caddyfile.example` + Tailscale recommendation (never expose publicly)

## 7. Resolved questions

- Severity scheme: P1–P4 ✔
- Playbooks v1 linear ✔ (trees deferred)
- Post-mortem bulk form: yes ✔
- Vendor auto-detect: nice-to-have ✔
- Starter ErrorKB content: yes, ~12 seeded entries refined by real experience ✔
