# ToolSathi backend handover

Paths and npm commands in this document are relative to the `backend/` CAP project unless stated otherwise. Repository-wide backups live in `../backup/`.

All manufacturing data is synthetic. Real HANA Cloud persistence is now verified: 394 existing records migrated across 21 tables, actual incident/trace/audit writes and restart persistence, and append-only database protections. S/4HANA/DM behavior remains SIMULATED. BTP deployment, real identity provider, approved ground-truth sign-off and teammate workflow integration remain unverified.

Current integration handover: [local demo readiness](../../docs/local-demo-readiness.md). Root `npm run dev` follows private backend configuration, currently HANA; `dev:local` and `dev:fresh` explicitly select SQLite. Latest results: 101 backend tests, 17 frontend client tests, 8 isolated browser checks, 11 live HANA backend checks and 7 live HANA browser checks, with zero failures/skips. Earlier SQLite-only counts below describe prior phases.

## Delivered architecture and files

The existing CAP/Express architecture is retained. `srv/server.js` bootstraps JSON/CORS, discovers direct Express router exports, installs database protection and safe errors. Source CDS is loaded locally; compiled CSN is loaded in the packaged runtime. SQLite is persisted in db.sqlite and initializes only when absent. Tests use independent in-memory databases; reliability tests use unique ignored SQLite files.

| Area | Files |
|---|---|
| Data model | db/schema.cds, db/init.js, db/src/*.hdbindex plus HDI configuration |
| Construction seed | db/seed/plan.js, generate.js, verify.js; db/data/*.csv; docs/demo-incidents.json |
| Candidate ground truth | tests/ground-truth.candidate.json (provisional, generated independently of trace) |
| API | srv/routes/incident.router.js, tools.router.js, audit.router.js, trace.router.js, mock-s4.router.js, mock-dm.router.js, health.router.js |
| Shared platform | srv/lib/audit.js, history.js, ids.js, db.js, http.js, errors.js, auth.js, rules-adapter.js, tool-state.js, approvals-check.js, mock-actions.js, trace-engine.js, db-protection.js, local-lock.js, router-loader.js |
| Operations/build | scripts/backup-db.js, restore-db.js, reset-db.js, checkpoint-db.js, database-files.js, paths.js, build.js, verify-package.js, smoke.js, verify-stubs.js, update-contract.js |
| Deployment | backend-local package.json/lock, .cdsrc.json, mta.yaml, xs-security.json; repository .gitignore/.gitattributes |
| Tests/evidence | tests/*.test.js, results-reporter.js, jest.config.js, tests/results/* |
| Docs | api-contract.md, openapi.yaml, examples/*.json, decisions.md, seed-and-ground-truth.md, mock-mapping.md, run-local.md, deploy-btp.md, btp-readiness.md, btp-build-results.md, troubleshooting.md, team-integration.md, backend-progress.md |

No teammate-owned source or approved tests/ground-truth.json was created or overwritten. Old Phase 0 results remain as historical evidence only.

## Model and relationships

21 entities cover Tool, ToolUseEvent, ProductionRun, Batch, Unit, InventoryStock, Shipment, Dealer, Incident, IncidentEvidence, TraceResult, Proposal, Approval, RepairLog, CalibrationRecord, ToolHistoryEvent, AuditLog, NcCode, SopDoc, MockDocument and Counter. Explicit scalar foreign identifiers keep the REST seam stable; unmanaged CDS associations provide navigation. JSON is LargeString and decoded consistently on output. The generator verifies every non-null required scalar relationship. Runtime services validate their references in transactions; physical foreign-key constraints are not claimed. Missing trace records are deliberately representable and surfaced as gaps.

The seed contains exactly 300 assemblies on three work centers, 18 batches/runs, source-link anomalies, dealer shipments, stock, prior incident TS-0001, repair/calibration/history and a historical-import audit. No Proposal or Approval is seeded. The historical imported Closed incident is not presented as a sequence of executed workflow approvals.

## Incident lifecycle and audit

Creation validates required identities/report text/language and optional structured fields, atomically increments Counter, writes Reported incident, photo evidence, audit and history. rawText is preserved exactly. Missing reportedAt becomes SERVER_RECEIVED with a warning. Confirmation permits only Reported -> Confirmed, uses the rules adapter, records before/after values and both histories when toolId is corrected. Detail returns stored evidence, latest five audit entries and actual persisted trace summaries.

Shared mutation helpers take an optional CAP transaction last. Always pass it across workflow/database/action/audit changes so all operations roll back together. Audit/history UUIDs are stable identifiers; incident and simulated document counters allocate sequential IDs atomically. Audit orders timestamp then auditId; history orders timestamp/eventId descending. Every state change and successful consequential action writes application audit history. HTTP identity/approval rejections write separate rejection entries, linked to an existing incident when available. SQLite rejects UPDATE and DELETE against AuditLog via database triggers installed at deploy and startup. This is application audit history, not a stronger integrity guarantee. HANA protection is deployment work still requiring verification.

## Deterministic trace and uncertainty

The anchor is the incident's reportedAt, with 24/72/168-hour nested scopes. No AI or LLM participates. Tool-use links connect runs, batches and serials. Work-center runs with no use record for any tool yield Unknown candidates rather than a fabricated association. Duplicate source links retain both evidence IDs and count each serial once. Lists are stably sorted.

Confirmed means Record-linked association from valid source intervals. Probable means a link exists with missing end or conflicting timestamps. Unknown means required association evidence is missing. These are investigation associations, not findings about product quality. Location (stock/shipped/unknown) and stale-record flags remain separate from the tier. Conflicting stock/shipment evidence yields an unknown location; shipment evidence prevents factory stock blocking.

**Scope assumption requiring team review:** a missing-end tool-use record is bounded by a valid linked production run's end. If that run has conflicting timestamps, run start anchors its window membership. Unbounded historic missing-end events would otherwise overlap every later window and contradict the specified exact totals. The assumption is explicit in reasons and decisions.md; change it together with reviewed ground truth, never silently.

Data quality starts at 100 and deducts 40*unknown/total + 20*probable/total + 5*stale shipment records + 10*conflict runs, floors zero and rounds half up. Empty result scores 100. Deductions are visible. Scope value sums INR 3200 synthetic unit values and is labelled ESTIMATE_SYNTHETIC, not actual loss. Exposure range always evaluates all windows: low is confirmed 24h, high is confirmed+probable 168h, Unknown separate; it is not a statistical confidence interval.

| B window | Units | Confirmed | Probable | Unknown | Stock | X | Y | Score | Synthetic INR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 24 | 35 | 35 | 0 | 0 | 35 | 0 | 0 | 100 | 112000 |
| 72 | 100 | 90 | 4 | 6 | 40 | 35 | 25 | 82 | 320000 |
| 168 | 160 | 146 | 8 | 6 | 50 | 55 | 55 | 83 | 512000 |

Executed exact serial/classification tests match these provisional expectations. Range: 35/154/6. Tool A: 5/15/50; Tool C: 0/0/0. Trace request timing includes database persistence/audit; actual local measurements are recorded in tests/results/trace-results.md and remain below the illustrative 500ms target on the tested Node 24 machine.

Every trace GET stores a new TraceResult version, audit and history. The incident row serializes version allocation. Membership/evidence/counts are deterministic; generatedAt/version change on repeat.

## Simulated adapters and approval enforcement

Four shared action functions model maintenance notification, quality notification, stock block and tool restriction. They use transactions, persist MockDocuments, audit and history, and return SIMULATED/_shapedLike fields. SAP-flavoured names/codes are illustrative and need official API/tenant verification. No external HTTP SAP calls occur.

Approval must exist, be APPROVED with the required role and named decider/timestamp, link to the same incident's proposal, match action type and bind the requested resource/data scope. Proposal payload fields are listed in team-integration.md. Batch requests may be a subset of approved batchIds. Neither external x-system-call nor an unapproved role can authorize an action. Notification replay returns its existing document with replay audit/history. Stock repeats return alreadyBlocked and a new operation document; already-shipped goods are skipped. Repeated restriction rejects an invalid transition. Tool-state helper independently gates restriction and the fallback rules require Verifier plus verified=true for return; Jamuna must validate repair evidence before invoking that trusted seam.

Development bypass requires both explicit flags and is labelled/warned; it is unavailable in production and defaults off. Never enable it for the demo. Approval record creation, decision authorization and verified-return business logic remain Jamuna's responsibility; no competing workflow was built.

## Authentication and integration

Local x-demo-user/x-demo-role are explicitly demo identity, not verification. Production uses @sap/xssec XsuaaService/createSecurityContext and maps local application scopes only after SDK validation. Tests cover fail-closed behavior and mocked SDK plumbing; no real binding/token was verified. All protected roles and common errors have API tests. No raw token or report body is request-logged.

The loader preserves `{mount,router,owner}` and replaces only corresponding stubs. Duplicate method/path registrations fail startup; parameter names normalize. Missing rules modules log a default fallback; broken present modules do not silently fall back. Five endpoints remain stubs: AI structure, duplicates, proposals, approval decision and verify-return. The smoke report explicitly separates them from real backend checks.

Shashank supplies the AI router/adapter and reviewed NC list. Vinayaka supplies the UI using the tools envelope, authentication headers/tokens and uncertainty labels. Jamuna supplies state-machine/approval exports, four workflow routers and reviewed frozen ground truth. See team-integration.md for exact signatures and payload fields. Source branches were unavailable; no teammate integration or merge is claimed.

## Running, testing and recovery

Use Node 24.11+ (the tested driver/runtime; package engines pins major 24). Install once with npm ci; then seed, start and tests work offline. `npm run seed` generates files only. `npm run start:local` initializes an absent db.sqlite and preserves an existing one. Base URL is localhost:4004/api. `npm test` runs Jest/cds.test and writes genuine results; `npm run smoke` uses the running server and mutates it with a new synthetic incident. `--fresh` asserts TS-0002 and requires a fresh reset. `npm run verify:stubs` checks health plus five remaining fixtures and does not claim business completion.

With all writers stopped, `npm run backup:db`, `npm run db:reset` and `npm run restore:db -- ../backup/<file>.sqlite` provide offline recovery. Reset/restore back up existing state first. Local server locks prevent maintenance against a live ToolSathi process; a nonempty WAL refuses file copying. After abnormal termination, stop all writers and run `npm run db:checkpoint`. Graceful shutdown explicitly closes SQLite before exit. External SQLite tools must also be stopped.

`npm run build` creates HANA and Node deployment artifacts and copies public stub fixtures. `npm run verify:package` starts the compiled runtime on isolated seeded SQLite and verifies its health, five stubs and queries. These are local package checks, not HANA deployment evidence. See deploy-btp.md for authorized deployment commands/prerequisites; cf/mbt were unavailable in PATH and no archive/cloud deployment was performed.

## Known limits and external blockers

- Jamuna has not signed off ground truth. Candidate results remain provisional; any supplied frozen-file difference fails.
- The missing-end window assumption needs team review before treating the data contract as frozen.
- Five teammate routes remain fixed stubs. Full proposal/approval/repair workflow remains pending. The supported frontend reporting/confirmation/trace/history/audit/document path is now integrated and browser-tested.
- HANA/XSUAA/MTA are prepared and locally compiled; real entitlement, binding, token, MTAR and deployment checks remain unverified. HANA audit UPDATE/DELETE rejection must be provisioned and tested before claiming it in cloud.
- Trace joins load the small synthetic dataset in memory. This is a 300-unit prototype, not a production-scale performance claim.
- Physical referential constraints, migration lifecycle, production monitoring and real SAP API mapping are not claimed. Local services and construction checks enforce required links within this scope.
- Runtime npm audit is clean. Current development/build tooling reports 21 advisories (3 low, 16 moderate, 2 high); compatible fixes were applied earlier, forced breaking downgrades were not. Review development tooling before adopting this beyond the prototype.
- Node native SQLite emits an experimental API warning in the tested environment; Node 24 is pinned for repeatability.

Final executed counts are in tests/results/summary.json. No tests are disabled to pass; unexecuted external checks are listed separately from Jest skipped tests. No push, force-push or merge into main was performed. Phase commits remain separate and Phase 0 history was not rewritten.

Final local verification: 61 tests passed in 12 suites; zero failed or skipped. Ground-truth CSV verification, production CAP build, standalone API smoke, live health/stub checks and compiled-runtime checks passed. External checks listed above were not executed. The exercised local database was backed up and reset; next incident is TS-0002.

## Repository organization update

The complete CAP project now lives in backend/. Its package/lock and .cdsrc.json are the dependency/configuration source of truth; source behavior and all 18 API paths are preserved. Root docs/ provides navigation and ownership, deploy/ links to the backend-local deployment descriptors, and frontend/ remains unchanged. The existing closed database was relocated to backend/db.sqlite after integrity-checked backup; repository backup/ retains prior state. Root wrappers use npm --prefix backend, so they cannot create a second root CAP database. See [restructuring inventory](repository-restructure.md) and [repository architecture](../../docs/architecture/overview.md).

Frontend integration update: [current UI/API handover](../../docs/frontend-backend-integration.md) supersedes earlier statements that the UI was unavailable. Backend source/schema/approval gates were not changed; the normal demo database was preserved and browser tests used isolated data.

## HANA support continuation

The same backend now has explicit HANA/SQLite selection, verified-TLS credential mapping, dedicated-target guards, create-only HANA DDL/HDI audit artifacts and transactional migration of every existing SQLite table. HANA connectivity and writes remain blocked by absent .env/binding credentials; no remote success is claimed. The default suite is pinned offline. See [HANA integration](hana-cloud-integration.md) and tests/results/hana-results.json for current capability and execution status.
