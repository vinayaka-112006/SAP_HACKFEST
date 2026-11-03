# ToolSathi V2.3

ToolSathi is a shop-floor incident intelligence application for a simulated brake-assembly plant. It turns a
worker's voice or typed observation into a confirmed incident, runs a reviewed repair workflow, traces which
production units may be associated with the faulty tool, and keeps an append-only application audit history for
every decision.

V2.3 keeps the complete V2.2 capability set — four role dashboards, one central Issues module, the reviewed
Manager → Technician → Verifier lifecycle, automatic/manual workforce allocation, deterministic exposure tracing —
and rebuilds the entire user-facing application on a single enterprise design system: a premium landing page, a
real multistep registration flow with protected certificate uploads, four distinct dashboards, a readable issue
register and detail view, an exposure dashboard with PDF/CSV/HTML reports, a floating grounded assistant and a
dark-glass industrial robotics identity. There is one canonical implementation of every feature; the retired
V2.1 routes redirect into the new screens instead of duplicating them.

The active database remains **SQLite only**; the HANA integration code is preserved but inactive (see
[Historical HANA integration](#historical-hana-integration)).

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
| `/worker` | Worker | Greeting and shift, live equipment selector (QR payload or register ID), the conversational intake panel, photographic evidence, my submitted issues, notifications, temporary reassignment notices. |
| `/manager` | Manager | Ten live KPIs, the actionable incident queue, severity chart and production-recovery progress, association count from the latest traces, station demand table, links into workforce allocation and issue review. |
| `/technician` | Technician | Pending acceptance, active repairs, parts blockers, repairs awaiting review, closed repairs and the work-order table. Work orders open their own repair workspace; incident IDs never have to be typed. |
| `/verifier` | Verifier / Assigner | Independent capability chips (assignment vs verification), assignment queue, verification queue, completion-review and evidence-return counters, work-order audit activity. |

Shared operational routes:

| Route | Purpose |
|---|---|
| `/` | Premium landing page: robotic hero, problem statement, three response pillars, implemented lifecycle, CTA into reporting and the role dashboard. |
| `/login` | Sign-in. In development it exposes a searchable, role-filtered, grouped account selector with a current-identity summary; production uses the identity provider. |
| `/register` | Five-step onboarding wizard: personal details, requested role cards, skills and protected documents, review, live approval status. |
| `/issues` | Issue register: status summary cards, compact grouped filters (search, status, severity, urgency, work centre, equipment, technician, date range, sort), clear-filters, pagination and a light data table. |
| `/issues/:incidentId` | One incident with Overview, Conversation, Duplicates, Assignment, Repair, Exposure, Workforce, Approvals and Audit sections, plus photo evidence. |
| `/equipment` | Equipment register with lifecycle state, last-verified-good and the stored tool history behind traceability. |
| `/workforce` | Workforce allocation for managers: pick the downtime incident, then use the existing automatic/manual module. |
| `/exposure/:incidentId` | Exposure dashboard: window selector, tier/location/ batch/serial filters, unit table, association chart, evidence gaps, PDF/CSV/HTML downloads. |
| `/notifications` | Real notification rows for the signed-in identity, unread filter, persisted read state. |
| `/profile` | Identity, approved profile, language and display-name preferences, onboarding status summary. |
| `/admin` | Administrator-only onboarding review queue, invitations and scoped operational grants. |
| `/worker/manual` | The full QR/typed intake form (reused, not duplicated) for reporting without the conversational panel. |

Retired V2.1 entry points redirect instead of duplicating functionality: `/console` → `/issues`,
`/workspace` → `/admin`, `/history` → `/equipment`, `/kitchen` → `/`, and `/dashboard` → the dashboard for the
current role. No page is reachable only through an old route.

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

### Registration, skills and protected documents (V2.3)

`/register` is a five-step wizard backed by `/v2/onboarding`:

1. **Personal information** — full name, e-mail, optional phone and employee ID, preferred language (English,
   Kannada, Hindi), department, work centre, shift and reviewer notes (`PUT /v2/onboarding/me`).
2. **Requested role** — Worker, Manager, Technician or Verifier/Assigner cards with responsibilities. The request is
   recorded only; it creates no profile and grants nothing.
3. **Skills and documents** — declared skills (name, category, level, years, equipment specialisation, work centre,
   certification, issuer, validity, notes) via `POST /v2/onboarding/me/skills`, plus certificate/résumé/identity
   uploads via `POST /v2/onboarding/me/documents`.
4. **Review** — a summary of the exact record that will be sent for review, with blockers listed.
5. **Status** — Submitted → Under review → Approved (role recorded by the reviewer) or Rejected with a reason,
   refreshed from the server.

Qualification review is separate from role approval and is performed by an administrator in `/admin`
(`POST /v2/onboarding/:id/review`). Approving records the granted role and can verify declared skills; a requested
role can never become an approved one without that decision. Approving an operational role still does not grant
assignment or verification capability — that needs a separate `UserAuthorization` grant with explicit work centres
and an expiry.

Upload security (implemented in `backend/srv/lib/uploads.js`):

- allowed types are checked against both the declared MIME type and the file's magic bytes (PDF, PNG, JPEG, WEBP);
  executable and script extensions are rejected outright, and a disguised file fails with
  `DOCUMENT_CONTENT_MISMATCH`;
- size limit is 5 MB; file names are sanitised and stored under a random UUID outside the web root
  (`backend/uploads/`, git-ignored), with mode `0600`;
- SQLite stores only metadata plus the random storage name; downloads go through
  `GET /v2/documents/:id/download`, which checks ownership, Administrator/Quality, or an incident-scoped
  Manager/Verifier before streaming with `Cache-Control: private, no-store` and `nosniff`;
- incident photos use the same protected store (`POST /v2/incidents/:id/photos`) and are attached as evidence;
- no document is sent to an external AI provider. Only text-based providers are configured, so automated certificate
  extraction is **not** offered rather than pretending a vision model is available.

Registration itself (`POST /v2/register`) still stores user ID, display name, preferred language, work center, team,
shift and status; role upgrades require an administrator-issued invitation and, for operational scope, an approved
`UserAuthorization` record. Local demo identity switching is clearly labelled as a development simulation.

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

## Interface and design system (V2.3)

- One design system ([frontend/src/styles/v23.css](frontend/src/styles/v23.css)) with semantic tokens: deep
  navy/charcoal foundations, electric cyan and teal accents, frosted panels, soft glows, refined shadows, one focus
  ring, consistent spacing and status colours.
- Data-dense tables and forms use a **light surface with dark ink**; every text/background pair was chosen for
  practical WCAG AA contrast. The browser suite measures the ratio of rendered issue-table text (currently > 7:1).
  Placeholders, labels, disabled states and links are all distinguishable.
- Landing page: gradient headline, animated 3D CSS robot arm with rotating rings and floating data chips. Motion is
  pure CSS (no WebGL canvas), stops under `prefers-reduced-motion`, and never sits behind data tables.
- Shell: persistent desktop sidebar, sticky top bar with breadcrumbs, language selector, notification badge and
  account menu; a drawer replaces the sidebar under 1024 px. One navigation system — the competing floating dock was
  removed.
- Shared primitives live in [frontend/src/components/ui.jsx](frontend/src/components/ui.jsx) (Card, Stat, Chip,
  Field, Table styling, Empty, Loading skeleton, ErrorNote, Avatar, Progress, Bars, Icon).
- Kn, hi and en strings come from the existing locale layer; machine identifiers and stored evidence are never
  translated.
- The assistant is a compact glass dock (bottom-right) that stays inside the viewport at 375 px and never covers
  page controls.

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
- Onboarding: `GET|PUT /v2/onboarding/me`, `POST /v2/onboarding/me/submit`, `POST|DELETE /v2/onboarding/me/skills[/{id}]`,
  `POST|DELETE /v2/onboarding/me/documents[/{id}]`, `GET /v2/documents/{id}/download`,
  `GET /v2/onboarding` and `POST /v2/onboarding/{id}/review` (Administrator), `POST /v2/incidents/{id}/photos`
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

Verified on 2026-11-03 with the SQLite V2.3 configuration:

| Check | Result |
|---|---|
| Backend Jest suite | **306 passed / 306**, 40 suites (includes `onboarding`, `schema-migration`, `sqlite-config`, `v22-seed`, `operations`, `exposure-report`, `trace`, `allocation`, `contract`, `deployment`) |
| Frontend unit tests | **35 passed / 35** |
| Browser integration (Playwright, isolated SQLite, V2.3 suite) | **14 passed / 14** — landing + sign-in identity pairing, worker reporting surface, multistep registration with certificate upload and administrator approval, issue register contrast and filters, issue detail tabs and eligibility reasons, technician work orders, verifier capability chips, exposure determinism + PDF/CSV downloads, workforce module, notification read persistence, assistant dock, Kannada/Hindi switching, 375/768/1440 layouts, zero uncaught page errors |
| API smoke (isolated server) | PASSED — real backend steps, simulated SAP actions correctly rejected without approval, no remaining stubs, trace 35/100/160 |
| CAP production build | PASSED |
| Packaged runtime verification | PASSED (`npm run verify:package`) |
| Provider check | Groq connected (`openai/gpt-oss-120b`, schema valid); Sarvam TTS+STT returned non-empty transcripts for `en`, `kn`, `hi`; microphone not exercised |
| SQLite persistence | Incident created through the API is readable after restarting the launcher; the seed does not replay |
| Additive migration | The running demo database gained the three V2.3 onboarding tables with **1310 existing records preserved** and a verified backup (`db-pre-v22-2026-11-03T04-16-56-941Z-e95ff4b5.sqlite`); re-running is a no-op |
| Protected uploads | A real PNG certificate uploaded and listed for the applicant; a text file declared as `image/png` rejected with `DOCUMENT_CONTENT_MISMATCH` |
| Onboarding gate | Applicant requesting **Manager** approved as **Worker**: `/v2/me` reports `role: Worker`, and claiming the Manager header afterwards returns `403 PROFILE_INACTIVE` |
| Frontend/backend production builds | `vite build` and `npm run build` (backend) both PASSED after the redesign |

## Demo walkthrough

1. `npm run dev:v22`, open `http://localhost:5173` — the landing page describes the implemented lifecycle.
2. Open **Sign in** and pick a Worker account (`V22-20261103-WORKER-01`); `/worker` selects registered equipment,
   then the conversational panel (or typed fallback) collects the report. Attach an optional photo, confirm, and the
   issue appears under *My submitted issues*.
3. Switch identity (account menu → sign out → **Sign in**), choose a Manager (`V22-20261103-MANAGER-01`), open
   `/manager`, review the new report in the queue, triage it, open **Assignment**, load eligible technicians and
   assign `V22-20261103-TECH-01`. Ineligible technicians stay disabled with their recorded reason.
4. Switch to that **Technician**, open `/technician`, accept the work order, request repair guidance, reserve a
   part, record readings and submit completion evidence.
5. Switch back to **Manager**, review the completion, then switch to **Verifier** (`V22-20261103-VERIFIER-01`)
   and pass independent verification; the equipment returns to service and the incident can be closed.
6. Open `/issues` → pick an incident → **Exposure** → choose the window, then download the PDF, CSV or executive
   report. Downloads always come from a stored snapshot, never from an unsaved screen.
7. Use `/workforce` (manager) to preview automatic allocation for a restricted machine, confirm it, then
   acknowledge or return the worker; `/register` shows the applicant flow, and `/admin` the review queue.

The seeded incidents are already spread across the workflow, so every dashboard shows real data before you do
anything: `/issues` lists closed and open work, `/equipment` shows the register, `/notifications` is per identity.

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
- The V2.3 browser suite runs with AI disabled (`VITE_AI_ENABLED=false`), so it verifies the typed fallback and the
  honest provider messaging; the Groq/Sarvam round-trip is checked separately by `npm run ai:verify`.
- Uploaded files live on the local disk next to the SQLite file; there is no object storage, virus scanning or
  retention scheduler. Nothing is uploaded to a third party and no AI service reads the files.
- The reference 35/100/160 Tool B totals are fixture- and clock-dependent; they are asserted by the backend trace
  tests. The browser suite asserts determinism, monotonicity, tier reconciliation and download row counts instead
  of hardcoding today's numbers.
- HANA deployment, HDI container management and the MTA build are **not** part of V2.3 and are not exercised.

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

## V2.3 changelog

- Replaced the old navigation (ribbon + top bar + floating dock + operational nav) with one application shell:
  sidebar, sticky breadcrumb bar, language selector, notification badge, account menu and a mobile drawer.
- Added a premium landing page and a five-step registration wizard; removed the huge native account dropdown from
  sign-in in favour of searchable, role-filtered, grouped account cards (development only).
- Added the onboarding backend: `OnboardingApplication`, `ApplicantSkill` and `UploadedDocument` entities,
  protected upload storage, administrator review and the nine `/v2/onboarding` endpoints (documented in OpenAPI).
- Rebuilt all four dashboards, the issue register, issue detail, equipment, workforce host, notifications, profile
  and administrator pages on one design system; fixed the low-contrast issue table (now measured > 7:1).
- Added the exposure dashboard with meaningful charts, gaps and PDF/CSV/HTML downloads, and the floating grounded
  assistant dock.
- Kept every backend workflow and reused the existing feature modules (triage, assignment, repair, parts,
  duplicates, workforce, chat, exposure) instead of re-implementing them.
- Replaced the obsolete V2.1 browser suite, which asserted the retired chrome, with a V2.3 suite covering the new
  information architecture end to end (14 checks).

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
