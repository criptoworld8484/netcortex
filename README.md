# NetCortex

Personal network-troubleshooting brain: incident timeline capture, a known-error
knowledge base ranked by your own evidence, and a log analyzer — for Cisco,
Juniper, FortiGate, Palo Alto and Check Point work.

## Features (Phase 1)

- **Cases** — live timeline capture (note / command / log / status / resolution)
  plus a post-mortem bulk form for older incidents.
- **Error KB** — known log patterns with meaning, causes, verify commands and
  fixes. Causes are ranked by *your* confirmed resolutions.
- **Commands** — cross-vendor cheatsheet matrix (task × Cisco/Juniper/FortiGate/
  Palo Alto/Check Point), seeded with 17 daily-driver tasks; copy any cell.
- **Playbooks** — linear troubleshooting checklists with decision jumps and
  per-vendor check commands; interactive run mode. Two seeded: VPN tunnel
  down, BGP neighbor flapping.
- **Changes** — change management pipeline (draft → … → successful/rolled
  back), risk levels, maintenance windows, planned config + rollback plan,
  verification checklist with evidence, pre/post captures, linked cases.
- **Log Analyzer** — paste a log, get matched patterns, likely causes and
  related cases; vendor auto-detected from content; create a case straight
  from the log.
- **AI Assistant** — your knowledge base + the incident, anonymized locally
  (IPs/hosts/MACs/users/ASNs → placeholders), reviewed by you before send,
  then analyzed by Claude/OpenAI with your own past cases as context. Values
  are restored in the answer locally; the mapping never leaves the machine.
  Works out of the box in offline demo mode.
- **Full-text search** across cases, timeline events and the Error KB.
- **Settings** — clients/technologies/tags, JSON export, SQLite backup, restore.
- Single user, password login, self-hosted. SQLite, zero external services.

Full roadmap in [`docs/PLAN.md`](docs/PLAN.md). **User guide (Spanish, all
sections + recommended workflows): [`docs/GUIDE.md`](docs/GUIDE.md).**

## Quick start (local)

```bash
npm install
cp .env.example .env   # optional
npm run dev
```

Open http://localhost:3000 → first-run screen creates your admin password.
Database file lives in `data/netcortex.db` (backup = copy the file, or
Settings → Download).

## Docker (self-hosted)

```bash
docker compose up -d --build    # or: docker-compose up -d --build
```

App listens on `:3000`; SQLite persists in `./data`. Put it behind Caddy on
your Tailnet — see `Caddyfile.example`. **Do not expose it to the public
internet.**

## Security notes

- Session: signed JWT cookie (30 days), httpOnly. Signature is verified on
  every request server-side; the proxy only does an optimistic cookie check.
- All data stays local: SQLite file + JSON exports on your disk.
- Logs/configs of your clients live here — keep the host and backups private.
