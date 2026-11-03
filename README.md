# ToolSathi V2.2

ToolSathi is a shop-floor incident intelligence application for a simulated brake-assembly plant. It turns a
worker's voice or typed observation into a confirmed incident, runs a reviewed repair workflow, traces which
production units may be associated with the faulty tool, and keeps an append-only application audit history for
every decision.

V2.2 unifies the earlier features (QR intake, multilingual voice, SAP CAP backend, deterministic trace, executive
reports) into **four role dashboards**, one **central Issues module**, a **reviewed Manager → Technician → Verifier**
repair lifecycle, and **automatic / manual workforce allocation**. The active database for V2.2 development is
**SQLite only**; the HANA integration code is preserved but inactive (see [Historical HANA integration](#historical-hana-integration)).

- Backend: SAP CAP (Node.js) with plain Express routers mounted under `/api`
- Frontend: React 18, Vite, React Router, Framer Motion
- Database: one persistent SQLite file — `backend/db.sqlite`
- AI: Sarvam (speech in/out), Groq (reasoning, retrieval-grounded answers, repair guidance)
- Trace engine: deterministic code, **no AI in the trace**

## Quick start

Requirements: Node.js 20 or newer (verified on Node 24.11.0), npm, and two free ports (4004 and 5173 by default).

```bash
cd SAP_HACKFEST
npm --prefix backend ci
npm --prefix frontend ci
npm run dev:v22
```

`npm run dev:v22` starts CAP on `http://localhost:4004/api` and Vite on `http://localhost:5173`, selects the
persistent SQLite file, enables the V2/V2.2 workflows and proxies `/api` to the backend. Ctrl+C stops both
processes. The launcher prints the exact database file it is using.

The first start on an older database applies an **additive, backed-up schema migration** automatically; later
starts reuse the same file and never reset, re-seed or overwrite records.

Other scripts (repository root):

| Command | Purpose |
|---|---|
| `npm run dev:v22` | The supported V2.2 development launcher (persistent SQLite). |
| `npm run dev:v22:fresh` | Throwaway isolated SQLite demo (temporary file, deleted-work safe). Never touches `backend/db.sqlite`. |
| `npm run dev:local` | SQLite launcher without the V2.2 synthetic scenario flags. |
| `npm run demo:v22:preview` | Read-only preview of the synthetic V2.2 scenario against the persistent database. |
| `npm run demo:v22:seed` | Idempotent, transactional seed of missing V2.2 synthetic records. |
| `npm run dev:backend` / `npm run dev:frontend` | Start one process only. |
| `npm run test:backend` | Full backend suite (Jest, isolated in-memory SQLite). |
| `npm run build:backend` / `npm run build:frontend` | CAP production build / Vite production build. |

## Four operational dashboards

| Route | Dashboard | Main content |
|---|---|---|
| `/worker` | Worker | Assigned equipment and work center, current shift, QR scan, voice AI agent, typed reporting, my incidents and status, assigned work, temporary reassignment notices. |
| `/manager` | Manager | New reports, pending reviews, active faults, downtime/restricted equipment, eligible technicians, repair progress, repairs awaiting manager review, associated units in the latest traces, worker availability, automatic and manual workforce allocation, production demand, notifications. |
| `/technician` | Technician | Assigned work orders, acceptance, repairs in progress, equipment history, Groq repair assistance, available spare parts, findings, parts usage, completion evidence, repairs awaiting verification. |
| `/verifier` | Verifier / Assigner | Assignment queue, technician eligibility, authorized assignment decisions, repair evidence, equipment restrictions, verification checklist, inspection results, return-to-service decisions, spare-parts availability, audit timeline. |

Shared operational routes:

| Route | Purpose |
|---|---|
| `/` | System overview with direct links to the four dashboards plus Issues, Notifications, Profile, Sign-in. |
| `/issues` | Central Issues module: search, status/severity/urgency/work-center/shift/equipment/date filters, pagination. |
| `/issues/:incidentId` | One incident with Overview, Conversation, Duplicates, Assignment, Repair, Exposure reports, Approvals, Workforce allocation and Application audit history sections. |
| `/exposure/:incidentId` | Exposure investigation: time windows, tiers, batches, serials, stock/shipment evidence, gaps, quality score, PDF/CSV downloads. |
| `/notifications` | Real notification rows for the signed-in identity with links to valid routes; marking read is persisted. |
| `/profile`, `/register`, `/login` | Profile, role onboarding request, and development identity selection. |

Legacy routes remain reachable for backward compatibility: `/console` (Evidence Control Console), `/worker`
also hosts the legacy shop-floor terminal sections, `/history` (asset lifecycle and telemetry), `/workspace`
and `/kitchen` (design system). `/dashboard` redirects to the dashboard for the current role.

## Roles, permissions and onboarding

Application roles: `Worker`, `Manager`, `Technician`, `Verifier`, `Quality`, `Administrator`.

| Capability | Worker | Technician | Manager | Verifier | Quality | Administrator |
|---|---|---|---|---|---|---|
| Report/confirm own incident | ✅ | — | — | — | — | — |
| Review/triage report | — | — | ✅ | — | ✅ (read) | — |
| Assign technician | — | — | ✅ | only with an approved `canAssign` grant | — | — |
| Accept / progress repair | — | assigned work only | — | — | — | — |
| Review repair completion | — | — | ✅ | — | — | — |
| Independent verification / return to service | — | — | — | only with an approved `canVerify` grant | — | — |
| Workforce allocation | — | — | ✅ | — | — | — |
| Exposure reports and downloads | — | — | ✅ | ✅ | ✅ | — |
| Approve authorizations, qualifications, parts, invitations | — | — | — | — | — | ✅ |

Registration (`POST /v2/register`) stores user ID, display name, preferred language, work center, team, shift and
status; role upgrades require an administrator-issued invitation and, for operational scope, an approved
`UserAuthorization` record with explicit work centers and an expiry. Selecting a role in a dropdown never grants
a role. Local demo identity switching is clearly labelled as a development simulation in the header.

In local development the frontend sends `x-demo-user` / `x-demo-role` headers. Choosing a role pairs it with that
role's seeded account, so the displayed role and user ID never disagree. Production uses `@sap/xssec` with a
real identity provider; the header path is disabled outside development.

## Incident lifecycle

1. Worker selects or scans equipment and reports by voice or text (English, Kannada, Hindi).
2. The AI intake asks the next relevant question; the worker reviews and explicitly confirms a structured draft.
3. Manager reviews the confirmed incident (duplicates, history, exposure, required skills, eligible technicians).
4. A Manager — or a Verifier/Assigner holding an approved `canAssign` grant — assigns a qualified technician.
   Eligibility (specialization, skills, certification, safety authorization, work center, shift, workload) is
   computed by the backend and every rejection states its reason. Duplicate primary assignments are prevented;
   reassignment is an explicit, audited action.
5. Technician accepts, reviews history, requests grounded Groq repair guidance, reserves parts, records findings
   and measurements, and submits completion evidence.
6. Manager reviews the completion; then an independent Verifier checks the required evidence.
7. Failed verification keeps the equipment restricted. Only a passing verification permits return to service, and
   the incident can only be closed once every condition is met. Product-quality holds are tracked separately from
   equipment repair completion.
8. Every transition writes an append-only application audit entry and notifies the next actor.

Invalid transitions, stale manager decisions (`409 STALE_REVIEW`), duplicate confirmations, double assignments and
double parts reservations are rejected by the backend, not just by the UI.

## Voice and typed reporting

- Push-to-talk is used deliberately; there is no claim of continuous hands-free conversation.
- Sarvam TTS speaks the question, Sarvam STT transcribes the answer, the transcript can be corrected, and Groq
  generates the next question from the full session context.
- Typed reporting works when AI services are unavailable; a provider failure never fabricates a transcript.
- Session state is versioned: stale submissions are rejected and conversations persist in `ConversationSession`.
- Microphone capture itself is **not** part of automated verification (no physical microphone was exercised); the
  provider speech round-trip is verified by `npm run ai:verify`.

## AI, RAG and the website assistant

- Groq performs conversational reasoning and repair guidance; the chat answers only from authorized records and
  cites the retrieved evidence. Role checks are enforced server-side per tool.
- Repair guidance cites stored or explicitly labelled illustrative documents and never invents official SOPs or
  safety tolerances.
- One floating assistant (`WebsiteAssistant`) is available on every route, stays inside the viewport, keeps chat
  history and responds in English, Kannada and Hindi.
- The assistant cannot perform assignments, approvals or verifications.

## Workforce allocation

- **Automatic:** identify affected workers and eligible destination stations, check skills, certification,
  remaining shift, equipment/material availability, production demand and capacity, then present a deterministic
  plan with excluded workers, reasons and estimated production impact. Execution requires an explicit Manager
  confirmation unless an approved bounded `AllocationPolicy` permits the exact scope.
- **Manual:** Manager selects worker, destination station, start/end and reason; the backend re-checks every
  eligibility and scheduling constraint before persisting.
- **Return:** when equipment is restored, workers are returned to their original station through a reviewed,
  audited action. Overlapping assignments and double booking are rejected.
- The seeded V2.2 scenario uses a versioned, date-explicit timeline (`2026-11-03T06:00Z` start, 36-hour shift,
  certificates valid to 2027) so the demo is repeatable instead of relying on expired 2026 shifts.

## Product exposure tracing and reports

The trace engine is deterministic code. For the reference Tool B fixture it returns **35 / 100 / 160** units for
24 h / 72 h / 168 h, tier split `35/90+4+6/146+8+6` and association range `35 / 154 / 6`. These values are asserted
by `tests/trace.test.js` and `tests/exposure-report.test.js`; they are never hardcoded for unrelated incidents.

Reports are generated on the backend from persisted snapshots and downloaded from `/api`:

- `POST /v2/incidents/{id}/exposure-reports` creates the snapshot (window + filters).
- `GET /v2/exposure-reports/{id}` returns the stored report with digest integrity checking.
- `GET /v2/exposure-reports/{id}/download?format=pdf` — paginated PDF with embedded multilingual fonts.
- `GET /v2/exposure-reports/{id}/download?format=csv` — serial-level CSV with spreadsheet-formula escaping.

Downloads are limited to scoped Manager/Quality/Verifier identities and are audited. Reports describe
**potentially associated** units, never "defective" units, and state record gaps explicitly.

The executive HTML/JSON evidence report (`GET /incidents/{id}/executive-report`) is unchanged.

## SQLite-only V2.2 database

- **Active file:** `backend/db.sqlite` (one documented persistent database; override with `SQLITE_FILE`).
- Local `.env` bindings and `DATABASE_MODE=hana` are ignored: every environment selects SQLite and discards stale
  HANA credentials. Explicit remote commands fail with `DATABASE_MODE_UNSUPPORTED` **before** connecting.
- No HANA connection, health check, query, seed, migration or export is performed by the V2.2 profile.
- `npm run dev:v22` preserves the database. It never resets it and never overwrites seeded records.
- Tests always use isolated SQLite (`:memory:` for Jest, temporary files for launcher/browser tests).

### Additive schema migration

On startup the backend compares the CDS model with `sqlite_master`/`PRAGMA table_info` and:

1. stops if the database cannot be inspected;
2. writes a consistent snapshot to `backup/db-pre-v22-<timestamp>-<id>.sqlite` using `VACUUM INTO` (WAL-safe);
3. verifies the snapshot's table row counts;
4. creates only missing tables/indices and adds only missing nullable columns;
5. re-reads every table count and aborts if any existing row count changed;
6. writes a receipt to `backup/v22-migration-<timestamp>.json`.

It never uses a full `cds deploy` against an existing database (CAP would recreate tables and re-run CSV initial
data). An empty database still uses the standard initial deployment so the baseline fixtures are loaded.

### Safe synthetic seeding

```bash
npm run demo:v22:preview   # read-only plan: what would be inserted
npm run demo:v22:seed      # transactional insert of missing records only
```

The seed is namespaced (`V22-20261103-…`), validates its manifest, skips identical rows, and **refuses**
conflicting rows rather than overwriting them. On the current database the second run reports
`inserted: 0, skipped: 738, conflicting: 0`. `dev:v22` applies the scenario once (guarded by an audit marker) and
never replays it, so reported work survives restarts.

### Seeded V2.2 dataset (SQLite)

| Records | Count |
|---|---|
| Synthetic workers | 20 |
| Synthetic managers | 10 |
| Synthetic technicians | 15 |
| Verifier / Assigner profiles | 5 (1 also `canAssign`, all `canVerify`) |
| Quality / Administrator demo profiles | 1 + 1 |
| Identities exposed by `/v2/demo-identities` | 52 |
| Completed, independently verified incidents | 5 |
| Unresolved incidents in distinct workflow states | 5 (awaiting review, assigner escalation, repair in progress, parts blocker, awaiting verification) |
| Total scenario records | 738 |

Supporting records include equipment, work centers, skills, certifications, shifts, production demand, equipment
restrictions, spare parts, repair history, duplicate examples and worker reassignment examples. The scenario does
not modify counters, baseline equipment, production, serial, shipment or trace records.

## API overview

All paths are relative to `http://localhost:4004/api`. The full contract is in
[docs/v2-api-contract.md](docs/v2-api-contract.md) and [backend/docs/openapi.yaml](backend/docs/openapi.yaml).

- Identity/profile: `GET /v2/me`, `POST /v2/register`, `PUT /v2/profile`, `GET /v2/demo-identities` (development only),
  `POST /v2/invitations`, `PUT /v2/authorizations/{userId}`
- Dashboards and issues: `GET /v2/dashboard`, `GET /v2/issues`, `GET /v2/issues/{id}`,
  `GET /v2/notifications`, `POST /v2/notifications/{id}/read`
- Intake: `POST /incidents`, `POST /incidents/{id}/confirm`, `POST /v2/conversations`,
  `POST /v2/conversations/{id}/messages|readback|submit`, `POST /v2/chat`
- Review and duplicates: `POST /v2/incidents/{id}/triage`, `GET /v2/incidents/{id}/duplicates`,
  `POST /v2/incidents/{id}/relationship`, `POST /v2/incidents/{id}/information-request`
- Repair: `GET /v2/incidents/{id}/technicians`, `POST /v2/incidents/{id}/assign`, `POST /v2/incidents/{id}/work`,
  `POST /v2/incidents/{id}/repairs`, `POST /repairs/{id}/complete`, `POST /v2/incidents/{id}/parts`,
  `POST /v2/incidents/{id}/repair-guidance`, `POST /v2/incidents/{id}/verify-return`, `POST /incidents/{id}/close`
- Workforce: `GET /v2/incidents/{id}/workforce`, `POST /v2/incidents/{id}/workforce/plan`,
  `POST /v2/workforce/plans/{id}/execute`, `POST /v2/incidents/{id}/workforce/assign`,
  `POST /v2/workforce/{id}/acknowledge`, `POST /v2/workforce/{id}/return`, `GET|PUT /v2/workforce/policies`
- Trace and reports: `GET /incidents/{id}/trace?window=24|72|168`, `POST /v2/incidents/{id}/exposure-reports`,
  `GET /v2/exposure-reports/{id}`, `GET /v2/exposure-reports/{id}/download?format=pdf|csv`,
  `GET /incidents/{id}/executive-report`, `GET /audit?incident={id}`

Errors: `400` validation, `401` authentication, `403` role/scope/ownership, `404` missing record,
`409` state conflict/retry, `429` rate limit, `500` internal. Successful responses carry `_label: SIMULATED`.

## Testing and recorded results

```bash
npm --prefix backend test        # Jest backend suite
npm --prefix frontend test       # frontend unit tests
npm --prefix frontend run test:e2e   # Playwright browser integration
npm --prefix backend run smoke   # API smoke against a running server (BASE_URL)
npm --prefix backend run build   # CAP production build
npm --prefix backend run verify:package
npm --prefix backend run ai:verify   # Groq/Sarvam provider check (no remote writes)
```

Verified on 2026-11-03 with the SQLite V2.2 configuration:

| Check | Result |
|---|---|
| Backend Jest suite | **302 passed / 302**, 39 suites (includes `schema-migration`, `sqlite-config`, `v22-seed`, `operations`, `exposure-report`, `allocation`) |
| Frontend unit tests | **35 passed / 35** |
| Browser integration (Playwright, isolated SQLite) | **19 passed / 19**, including four dashboards, role switching, issue detail, PDF/CSV downloads, automatic allocation, assistant viewport and multilingual responsive checks |
| API smoke (isolated server) | PASSED — real backend steps, simulated SAP actions correctly rejected without approval, no remaining stubs, trace 35/100/160 |
| CAP production build | PASSED |
| Packaged runtime verification | PASSED (`npm run verify:package`) |
| Provider check | Groq connected (`openai/gpt-oss-120b`, schema valid); Sarvam TTS+STT returned non-empty transcripts for `en`, `kn`, `hi`; microphone not exercised |
| SQLite persistence | Incident created through the API is readable after restarting the launcher; the seed does not replay |
| Additive migration | Legacy database migrated with 508 records preserved and a verified backup; re-running is a no-op |

## Demo walkthrough

1. `npm run dev:v22`, open `http://localhost:5173`.
2. Open the header **DEV** panel, choose **Worker** → identity `V22-20261103-WORKER-01`; open `/worker`, select
   `V22-20261103-TOOL-1`, use the voice agent (or type), review and confirm the draft.
3. Switch to **Manager** (`V22-20261103-MANAGER-01`), open `/manager`, review the new report, triage it, check
   duplicates and eligible technicians, then assign `V22-20261103-TECH-01`.
4. Switch to that **Technician**, open `/technician`, accept the work order, request repair guidance, reserve a
   part, record readings and submit completion evidence.
5. Switch back to **Manager**, review the completion, then switch to **Verifier** (`V22-20261103-VERIFIER-01`)
   and pass independent verification; the equipment returns to service and the incident can be closed.
6. Open `/issues` → pick an incident → **Exposure reports** → download the PDF and CSV.
7. On a Manager dashboard use **Workforce allocation** to preview automatic allocation, confirm it, then acknowledge
   it (worker taste) or return the worker after restoration.

The seeded incidents are already spread across the workflow, so every dashboard shows real data before you do
anything: `/issues` lists both closed and open work.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Port 4004 is occupied` | Another ToolSathi server is running. Stop it before using the combined launcher. |
| `SQLite database is in use by a ToolSathi server` | A stale `.lock` file remained. Stop the server; the lock is cleared automatically when its process is gone. |
| `V22_SCHEMA_REQUIRED` | The additive V2.2 tables are missing. Restart with `npm run dev:v22` (the migration runs at startup) and check the log line `Applied additive V2.2 SQLite schema`. |
| Voice button disabled | AI is disabled (`VITE_AI_ENABLED=false`) or the role has no speech permission. Typed reporting still works. |
| `401` locally | Send both `x-demo-user` and one valid `x-demo-role`; these are development headers, not verified identity. |
| Exposure totals differ from 35/100/160 | The reference totals belong to the reference fixture. A previously mutated demo database (other fault times, other last-verified-good values) yields different, correctly computed numbers. |

## Limitations and production boundary

- Data and external manufacturing systems are synthetic; SAP S/4HANA and Digital Manufacturing interactions are
  simulations labelled `SIMULATED`.
- The demo database is a single local SQLite file with no concurrency beyond one server process.
- Production authentication (`@sap/xssec`, XSUAA) is wired and unit-tested but has not been verified against a live
  identity provider in this environment; header identity is development-only.
- Automated tests do not exercise a physical microphone, telephony or a real plant network.
- HANA deployment, HDI container management and the MTA build are **not** part of V2.2 and are not exercised.

## Historical HANA integration

The V2.1 line of this project ran against SAP HANA Cloud. Those modules remain in the repository, inactive:

- `backend/srv/lib/database-config.js` still contains the SQLite-only selector; remote modes now fail with
  `DATABASE_MODE_UNSUPPORTED` before any socket is opened.
- `backend/srv/lib/hana-operations.js`, `backend/scripts/hana.js`, `backend/scripts/hana-integration.js`,
  `backend/scripts/v21-hana-verify.js`, `backend/scripts/v21-backup.js`, `backend/scripts/v22-demo.js` (HANA
  `--hana-apply` path) and the `.hdbtrigger`/`.hdbindex` artifacts in `backend/db/src` are preserved for a future
  deployment.
- The original deployment assets are archived in [backend/docs/archive/mta-hana.yaml](backend/docs/archive/mta-hana.yaml);
  earlier HANA commands remain documented in [backend/docs](backend/docs) for historical reference.
- HANA-specific environment variables in `backend/.env` are ignored by the V2.2 profile and are never printed.

## V2.2 development changelog (after the interrupted session)

- Recovered the interrupted SQLite work instead of restarting the specification.
- Completed SQLite-only selection: every environment discards HANA credentials and explicit remote commands fail
  safely before connecting.
- Replaced the destructive `cds deploy`-on-startup path with a compiled-DDL **additive migration** that backs up,
  verifies and refuses data loss (this is what removed the Notifications `V22_SCHEMA_REQUIRED` warning).
- Unified the persistent database on `backend/db.sqlite`; the launcher no longer created a second, undocumented file.
- Added explicit `demo:v22:preview` / `demo:v22:seed` commands with conflict detection and idempotent reporting.
- Fixed the demo role/user mismatch: role selection now pairs the role with that role's seeded account.
- Removed the competing floating navigation dock, added four dashboard entry points and bottom padding so content
  is never covered; demo identity controls are compact and marked as development-only.
- Fixed the packaged build (duplicate CDS model from the copied `db/` folder) and the browser harness
  (Vite ANSI colour codes broke the startup-line match).
- Added `tests/schema-migration.test.js` covering additive creation, column addition, backup verification,
  record preservation and idempotency.

## Further documentation

- [docs/v2-api-contract.md](docs/v2-api-contract.md) — V2/V2.2 endpoint authority and bodies
- [backend/docs/openapi.yaml](backend/docs/openapi.yaml) — generated OpenAPI description
- [backend/docs/backend-handover.md](backend/docs/backend-handover.md) — backend ownership and handover notes
- [backend/docs/run-local.md](backend/docs/run-local.md) — local run notes (SQLite + demo headers)
- [AGENTS.md](AGENTS.md) — repository rules, ownership map and hard invariants
