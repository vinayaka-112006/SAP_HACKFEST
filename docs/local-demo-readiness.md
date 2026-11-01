# ToolSathi local demo readiness

## Current result and scope

The user's later instruction, **Use HANA; migrate existing data and test the application**, supersedes the earlier SQLite-only plan. The Windows-hosted frontend/backend now use real SAP HANA Cloud persistence. All 394 existing SQLite records across 21 modeled tables were copied and verified transactionally. A repeat import before application activity inserted zero rows and recognized all 394 identical rows. The original SQLite database and a verified ignored backup remain intact.

The earlier HANA_AUTH_FAILED result is historical. A subsequent real SQL check succeeded with the supplied private configuration; the precise account-side correction between attempts was not observed. No password change, permission grant, schema creation or TLS weakening was performed by this integration work. Only the confirmed application schema received the reviewed 21 tables, two audit triggers and authorized records.

This is a local demo with synthetic manufacturing data and local demo identity. S/4HANA and Digital Manufacturing actions remain SIMULATED. No BTP/Cloud Foundry deployment, productive SAP action, real XSUAA login or completed teammate approval workflow is claimed.

## Directory structure and Windows startup

```text
SAP_HACKFEST/
  backend/   sole CAP project, CDS model, routes, database adapters, tests, docs
  frontend/  React/Vite application and browser verification
  scripts/   lightweight combined local launcher
  docs/      integration handover and reviewed results
  deploy/    deployment navigation
  backup/    ignored backups, exports and isolated SQLite files
```

Use Node 24.11+ (major 24). From PowerShell:

```powershell
cd C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST
npm --prefix backend ci
npm --prefix frontend ci
npm run dev
```

Open http://localhost:5173. The API is http://localhost:4004/api; Vite proxies relative `/api` requests. Root dependency installation is unnecessary. The launcher follows ignored `backend/.env`, currently `DATABASE_MODE=hana`, `HANA_CONNECTION=direct`, with the confirmed target and TLS/certificate validation enabled. Credentials stay in the backend. Environment variables already set in the shell take precedence over `.env`; the backend logs its selected database kind.

Ctrl+C stops both owned service processes. The launcher refuses occupied ports without killing existing listeners. Optional `TOOLSATHI_BACKEND_PORT` and `TOOLSATHI_FRONTEND_PORT` select other ports and update the Vite proxy. Startup never resets a database, deploys HANA objects or imports records.

Independent terminals: `npm --prefix backend run start:hana` and `npm --prefix frontend run dev`. For read-only connectivity verification, run `npm --prefix backend run hana:check`; it explicitly selects HANA even when `DATABASE_MODE=sqlite`. It must complete a real SQL query to pass.

## Explicit SQLite fallback, fresh demos and backups

Stop the running application before switching modes:

```powershell
npm run dev:local
```

This forces SQLite and uses the original `backend/db.sqlite`, even with private HANA settings present. `npm --prefix backend run start:local` does the same for the backend alone. Relative database paths resolve from `backend/` regardless of the launch working directory. SQLite mode needs no HANA credentials and does not fall through to HANA.

```powershell
npm run dev:fresh
```

Each invocation creates a new `backup/demo-<unique-id>.sqlite` with the existing deterministic seed. Stop and invoke it again for a fresh demo; it never deletes previous files or resets the main database. Browser and packaged-runtime tests use their own isolated SQLite files. Default backend tests use isolated SQLite even when `.env` or the inherited environment selects HANA.

For a main SQLite backup: `npm --prefix backend run backup:db`. Retain the resulting ignored backup and manifest. To restore an explicitly selected backup, stop the backend and follow [recovery instructions](../backend/docs/run-local.md); avoid resetting the main database just to refresh a demonstration. Database files, exports, private `.env` and browser screenshots are excluded from Git. Before this work, an online backup was verified against all 21 source-table manifests; the final source comparison still reports 394 unchanged records.

## Working screens and API boundary

| Screen | Verified behavior |
|---|---|
| `/` | Existing navigation and visibly local demo identities |
| `/worker` | Real tool register/manual code fallback; typed report, editable manual fields, one save and separate worker confirmation |
| `/console` | Stored incident, actual 24/72/168h trace, uncertainty/evidence/gaps, stock/dealer distribution, read-only audit and persisted SIMULATED documents |
| `/history` | Real tool history, previous TS-0001 incident, repair and calibration records |
| `/kitchen` | Labelled design examples; no operational approval execution |

Thirteen implemented routes: GET `/api/health`; POST `/api/incidents`; POST `/api/incidents/:id/confirm`; GET `/api/incidents/:id`; GET `/api/tools`; GET `/api/tools/:id/history`; GET `/api/incidents/:id/trace`; GET `/api/audit`; GET `/api/mock/documents`; POST `/api/mock/s4/maintenance-notifications`, `/api/mock/s4/quality-notifications`, `/api/mock/s4/stock-blocks`, and `/api/mock/dm/tool-restrictions`.

The four action routes implement persisted simulations with authorization, action/resource-bound approvals, replay checks and transactions. Regression tests verify successful approved execution on isolated data. All four reject missing approvals in the live HANA verification. The UI cannot generate approvals through pending workflow endpoints; those controls remain unavailable. Empty documents are shown honestly when no action has created any.

Five routes remain explicit stubs: AI structuring (Shashank), duplicate evaluation, proposals, approval decision and verified return (Jamuna's workflow/rules integration). See [exact API contract](../backend/docs/api-contract.md) and [ownership](../backend/docs/team-integration.md). No new AI adapter or competing rules implementation was added. Jamuna's ground-truth sign-off is still pending.

## Repeatable demonstration

1. Open `/worker`, select Worker local demo role and Tool B from the real register. Confirm the tool and continue to reporting. Manual tool/code entry is available without a camera.
2. Choose **Load synthetic demo report** to use the deliberate scenario anchor `2026-11-04T05:12:00.000Z`. Enter the reporter and review the manual incident card. Sample input does not represent an AI result.
3. Save once. Observe the returned real incident ID and Reported state. Click the separate **Confirm Incident** action. A second click on Save cannot create another report.
4. Choose Manager and open `/console` using that ID. The latest fully verified report is **TS-0007**; existing **TS-0001** remains historical. Select each trace window and inspect evidence, missing association records, timestamp conflict, stale shipment warnings and the read-only audit.
5. At 72h, inspect factory stock 40, Dealer X 35, Dealer Y 25; five stale location records; exposure range low 35 / high 154 / Unknown separately 6. These are potential record associations, not proven defects or a finding that Unknown is safe.
6. Open `/history` and select Tool B to see existing incident/repair/calibration and new application activity. Return to the console: pending workflow and return controls remain disabled; documents remain explicitly SIMULATED.

| Window | Units | Confirmed | Probable | Unknown | Quality score |
|---|---:|---:|---:|---:|---:|
| 24h | 35 | 35 | 0 | 0 | 100 |
| 72h | 100 | 90 | 4 | 6 | 82 |
| 168h | 160 | 146 | 8 | 6 | 83 |

These results require the seeded Tool B scenario and its anchor; arbitrary new timestamps can legitimately return different counts. React displays API results without hardcoded totals. The deterministic trace algorithm and manufacturing data were preserved.

## Executed verification

| Check | Actual result |
|---|---|
| Backend regression | 101 tests, 16 suites; zero failed/skipped |
| Frontend API client | 17 tests; zero failed/skipped |
| Isolated SQLite browser integration | 8 checks; zero failed/skipped |
| Real HANA backend/application verification | 11 checks; zero failed/skipped |
| Real HANA browser integration | 7 checks; zero failed/skipped; no browser/page errors or non-abort failed requests |
| Legacy design fixture validation | 15 checks passed; not operational UI data |
| Ground-truth generator verification | Passed against provisional candidate |
| Frontend production build | Passed |
| CAP production build and packaged runtime | Passed; packaged runtime checked with isolated SQLite |
| API smoke and six health/stub checks | Passed on isolated SQLite |
| HANA import integrity | All 394 imported rows retained; 393 unchanged and one incident counter advanced normally |
| Original SQLite integrity | All 394 records in 21 tables unchanged |

Backend and isolated browser tests were also executed with external sockets blocked by a temporary local test guard; this guard is not shipped as product behavior. Live HANA checks ran separately with actual database access. CAP build is not evidence of deployment: it packages 21 table artifacts and two audit triggers with automatic HDI seed imports disabled. There is no lint script.

Reproduce: `npm --prefix backend test`, `npm --prefix backend run verify-ground-truth`, `npm --prefix backend run build`, `npm --prefix backend run verify:package`, `npm --prefix frontend test`, `npm --prefix frontend run test:seed`, `npm --prefix frontend run test:e2e`, `npm --prefix frontend run build`.

For live HANA verification, `npm --prefix backend run verify:hana-app` creates a uniquely identified synthetic incident, verifies persistence over two backend restarts, compares exact trace serials/tiers/locations/evidence/gaps with SQLite, and verifies the database rejects audit UPDATE/DELETE. `npm --prefix frontend run verify:hana-ui` requires the local application running on 5173/4004, creates another labelled report, exercises the actual UI and independently verifies its HANA incident/traces/audit. These explicit checks are additive, not read-only connectivity probes. Synthetic reports and audit remain as test evidence; interrupted attempts can leave a Reported incident. No destructive cleanup is performed.

Read-only verification of the latest report: `npm --prefix backend run hana:record -- --incident=TS-0007`. It reports database kind, schema-match status, state, text hash, trace windows and audit action names without credentials. Do not replay `hana:migrate -- --apply` now that HANA contains new activity; the old SQLite snapshot will correctly conflict. Migration is a cutover tool, not bidirectional synchronization.

Reviewed results: [local demo JSON](local-demo-results.json), [HANA readiness](../backend/tests/results/hana-readiness.json), [migration](../backend/tests/results/hana-migration.json), [repeat import](../backend/tests/results/hana-migration-repeat.json), [retained records](../backend/tests/results/hana-data-integrity.json), [HANA application checks](../backend/tests/results/hana-results.json), [backend summary](../backend/tests/results/summary.json). Raw browser reports/screenshots remain ignored.

## Fixes and remaining limitations

HANA catalog validation now recognizes the target schema's own catalog row and primary-key names represented in both index/constraint catalogs, while still rejecting unrelated objects. Startup anchors paths to the CAP root. The combined launcher handles ports, fresh databases and owned-process shutdown. Separate Vite caches prevent concurrent verification from invalidating a running frontend's dependencies.

The API client now rejects malformed JSON root shapes as invalid responses. Worker review freezes late speech callbacks; starting another report clears previous category, translation, time and model metadata. Missing favicon requests and ambiguous display separators were corrected. Mobile trace buttons/headlines wrap, long identifiers stay inside cards and the evidence SVG scales to the available width. The existing visual design is retained.

Physical microphone capture and camera QR scanning are unverified/unavailable; speech lifecycle was tested with a controlled browser mock and typed/manual input works. Production identity/XSUAA, BTP/HDI service deployment, live S/4HANA/DM actions, teammate AI/workflow logic and Jamuna's approved ground truth remain outside the completed verification. No SQLite reset, credential commit, Git push or merge was performed.
