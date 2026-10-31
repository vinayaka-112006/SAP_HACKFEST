# Frontend/backend integration

## Current status

Vinayaka's React 18/Vite 5 frontend was already merged successfully at e78c5c0 on integration/frontend-backend. No merge conflicts or missing frontend source remained. The existing design, assets, glass panels, isometric yard, typography, intro animation and routes were retained. The active app now reads the real CAP backend rather than fixtures; no competing backend, AI adapter or workflow engine was created.

Frontend: **http://localhost:5173**. Backend: **http://localhost:4004/api**. Both were run and verified with browser-originated requests. The normal Vite process already running for this repository was reused; no unrelated process was stopped.

## Independent Windows startup

Use Node 24.11+ (major 24) and two terminals. Do not reset the main database for integration.

Backend terminal:

```powershell
cd C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST\backend
npm ci
npm run start:local
```

Frontend terminal:

```powershell
cd C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST\frontend
npm ci
npm run dev
```

Open http://localhost:5173. Stop an existing dev server before starting another on the same port. Vite uses strictPort, so an occupied port produces a clear error rather than silently changing the URL. Backend startup preserves existing db.sqlite; seed/reset are not needed for this integration.

## Configuration and local demo identity

The single API client is frontend/src/api/client.js; frontend/src/api/api.js reads public Vite configuration. Components never embed backend URLs. Default /api uses the Vite proxy to localhost:4004. Direct cross-origin requests were also verified in the browser with the backend's configured CORS.

| Variable | Default / behavior |
|---|---|
| VITE_API_BASE_URL | /api; use an absolute API URL only when needed |
| VITE_DEMO_AUTH | Enabled by default in Vite development unless false; demo headers are never sent by a production build |
| VITE_AI_ENABLED | false; only enable after Shashank supplies a real compatible adapter; _stub:true is always rejected |
| API_PROXY_TARGET | Vite process environment; http://localhost:4004 by default, overridden only for isolated tests |
| BROWSER_PATH | Optional installed browser executable for test:e2e; Windows Edge/Chrome are detected otherwise |
| E2E_FRONTEND_PORT | 5174 for isolated browser tests, separate from the normal app |

frontend/.env.example contains public settings only. Never add API keys, service credentials or private tokens to VITE variables. Demo user ID and Worker/Manager/Quality/Technician/Verifier role switching are explicitly labelled local demo controls, not verified identity. Reporter ID is separately entered in the worker form and is not invented from AI output. The backend remains authoritative for authorization and approvals.

Production frontend assets do not provide an XSUAA login flow; production identity-provider integration and real cloud verification remain external work. Building assets successfully does not establish cloud readiness.

## Connected screens and endpoints

| Screen / feature | Actual API | Behavior |
|---|---|---|
| Worker tool selection / manual QR contents | GET /api/tools | Consumes {tools:[...]}; resolves only known IDs, displays real type/line/work center/state |
| Worker editable card | POST /api/incidents | Preserves original text/language/reporter/time and supplied optional fields; no fabricated confidence/model |
| Worker explicit confirmation | POST /api/incidents/:id/confirm | Separate second action after creation; supported corrections only; returned incident ID displayed |
| Console incident lookup/details | GET /api/incidents/:id | Actual incident, evidence and provenance; clear empty/loading/error states |
| Console window lens / evidence / tanks | GET /api/incidents/:id/trace?window=24,72,168 | Backend totals, tiers, locations, gaps, deductions, range and evidence IDs; clears stale results on selection change |
| Tool History | GET /api/tools/:id/history | Actual incident/repair/calibration/history events, timestamps, categories and reference IDs; Tool B TS-0001 visible |
| Console audit | GET /api/audit?incident=:id | Read-only application audit history, actor/role/action/time/reason/model; JSON only in expandable details |
| Console documents | GET /api/mock/documents?incident=:id | Actual stored simulated documents or truthful empty state; always SIMULATED |
| Launcher / navigation / role controls | Shared API-backed store | Existing navigation preserved; demo identity and role controls are explicit |
| Kitchen | No operational API | Design examples only, labelled as illustrations rather than actual approvals or incident records |

## Demo journey

1. Select Worker in the **LOCAL DEMO** selector and provide the desired demo user ID.
2. Open Shop-Floor Terminal. Choose TOOL-B from the live register, or enter TOOL-B as QR contents and resolve it. Unknown IDs show an error. Physical camera scanning is not connected; the manual path requires no scanner.
3. Choose Kannada/Hindi/English. Enter reporter ID and original text. Browser speech recognition is optional and device-dependent; typed reporting is fully verified.
4. For the synthetic acceptance scenario, explicitly click **Load synthetic demo report**. It populates editable input, including the 4 November 2026 05:12 UTC anchor. This is labelled sample input, not an AI result. Ordinary reports can omit reportedAt and show the backend's server-time warning.
5. Review the manual card; edit category, tool, translation/English explanation, NC suggestion and timestamp as applicable. No AI confidence or model version is fabricated.
6. Click **Save Incident**. The backend creates Reported state; duplicate clicks are guarded. Review any corrections, then click **Confirm Incident** separately. Failed confirmation does not create another incident.
7. Open Incident Details. Select Manager, Quality or Verifier in local demo mode for trace/audit access. Worker/Technician see the permission explanation instead of stale restricted data.
8. Switch 24h/72h/7d. Review potentially exposed associations, data quality, distribution and range. Use Why? for actual gaps/deductions and inspect a serial for all evidence IDs. Unknown is never shown as safe.
9. Review application audit history and simulated documents. Open Tool History to see the seeded earlier incident and calibration/repair events.
10. Proposal, approval, duplicate merge and return controls stay clearly unavailable while Jamuna's routes remain stubs; no success receipt or audit record is fabricated in the browser.

The Evidence Yard shows only serials actually returned in the selected trace. It does not invent an all-300-unit universe or label unreturned units outside/safe. Chart fill is illustrative; numeric counts come from backend summaries.

## AI and workflow boundaries

Shashank's POST /api/ai/structure-report still returns a stub. AI input remains manual by default, the button explains its status, and the common client rejects any _stub:true result. The prepared client validates supplied structured fields and preserves original language/text; it never confirms or saves without user action.

Jamuna's duplicate/proposal/approval/verify-return routes remain stubs. Central client methods use their documented POST/GET paths, but the active UI does not execute fake approvals or bypass protected SAP actions. No Proposal/Approval records were manufactured in the normal database. Supplied future workflow modules still need actual contract and human-approval testing before those controls can be connected.

All four mock SAP services and their approval checks are unchanged. No real S/4HANA, DM or BTP connection is claimed. Ground truth remains the existing provisional candidate pending Jamuna's sign-off.

## Executed verification

| Check | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Existing backend Jest tests (12 suites) | 61 | 0 | 0 |
| Frontend native Node API/mapping tests | 14 | 0 | 0 |
| Native Node + Playwright/Edge browser checks | 7 | 0 | 0 |
| Legacy frontend design-fixture checks | 15 | 0 | 0 |

Frontend Vite production build passed. No frontend lint script existed; lint was not claimed. The legacy fixture checks are preserved design tests, not the live source of trace truth. The active application does not import operational fixtures.

Browser automation covered the real register, unknown QR contents, manual reporting with exact Unicode/whitespace preservation, double-submit protection, explicit correction/confirmation, window switching without stale values, all counts/scores/range, gap/evidence inspection, duplicate-link evidence preservation, real audit/history, empty documents, disabled stub workflows, role changes, network retry, CORS and 390px mobile rendering. There were zero browser page errors. Desktop/mobile screenshots were inspected. Actual microphone capture and physical camera scanning were not verified; camera scanning is explicitly unavailable.

| Tool B window | Total | Confirmed | Probable | Unknown | Factory | X | Y | Quality |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 24h | 35 | 35 | 0 | 0 | 35 | 0 | 0 | 100 |
| 72h | 100 | 90 | 4 | 6 | 40 | 35 | 25 | 82 |
| 168h | 160 | 146 | 8 | 6 | 50 | 55 | 55 | 83 |

Exposure range matched 35 / 154 / 6 in every window. Backend trace implementation, schema, routes, approval gates and expectations were not changed.

Browser checks create a unique ignored database under repository backup/, start an isolated CAP server and Vite on 5174, and shut those test processes down. They also run the existing backend smoke and health/stub verification commands against the isolated server. Normal frontend 5173/backend 4004 were checked separately with read-only browser requests. Main db.sqlite table contents were compared to a pre-start digest and remained identical: 300 units and only seeded incident TS-0001. No main database reset was performed.

Run checks independently:

```powershell
cd C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST
npm run test:backend
cd frontend
npm test
npm run test:seed
npm run build
npm run test:e2e
```

Node's native test runner was used; Playwright is a browser automation library only. Windows Edge/Chrome is reused when installed. If neither is available, set BROWSER_PATH or install the Playwright Chromium binary before running browser checks. Browser tests fail visibly rather than report unexecuted checks as passing.

[Executed browser result snapshot](frontend-integration-results.json). Local screenshots and current raw browser reports are ignored under frontend/test-results/. [Backend executed summary](../backend/tests/results/summary.json).

## Change inventory

- frontend/src/api/client.js, api.js, mappings.js: one real API client, errors/stub guard, request and display mapping.
- frontend/src/state/store.jsx, useResource.js: server-backed resources with cancellation, cleared stale data and no fabricated business changes.
- frontend/src/screens/Worker.jsx, Console.jsx, ToolHistory.jsx: real reporting, confirmation, lookup, trace, history, audit and documents.
- frontend/src/components/ResourceState.jsx and existing role/nav/status/ribbon/intro components: loading/error handling, honest simulation labels and local demo identity.
- Existing evidence/governance/history components: preserve design while using server fields/evidence and disabling unavailable workflow; no invented approval metadata.
- frontend/src/styles/base.css: integration forms/states and mobile navigation fixes within existing tokens.
- frontend/vite.config.js, .env.example, package/lock: proxy/public configuration and test scripts; Playwright is development-only.
- frontend/src/tests/client.test.js and scripts/browser.integration.test.js: focused native-runner tests and real browser checks.
- Repository/frontend/backend docs: current startup, ownership, capability limits and handover. Backend test result timestamps/measurements reflect executed regression checks; backend implementation is unchanged.

No source folders were deleted. No secrets, .env files, SQLite databases, node_modules, screenshots or generated dist files are committed. No push or new merge into main was performed.
