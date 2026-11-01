# Decisions

## Person 2 Phase 5 acceptance

- Final 15-case live evaluation initially passed 13/15: two vague reports were categorized as OTHER without concrete observations. Increment prompt version to intake-2: OTHER requires a concrete observation, vague concern stays null, and local validation rejects missing-field contradictions. Preserve the initial report and final 15/15 rerun rather than claim held-out accuracy. One schema repair retry remains the only automatic provider retry.
- Add explicit opt-in evaluation CLIs; defaults do not call Sarvam. Typed evaluation is capped at 30 calls/run and stops on auth/credit exhaustion. Synthetic speech checks use at most six calls through the existing proxy. Never record these as physical microphone/native-language acceptance.
- Install existing test dependencies under ignored backup storage and run the full offline suite with NODE_PATH, leaving application dependencies and HANA untouched. Restore only test-generated tracked artifacts after checks. Full regression passed 190 tests; the retained retrieval miss and external human/catalogue/SOP/teammate acceptance dependencies are listed in the AI handoff, not hidden by fabricated data or relaxed thresholds.

## Person 2 Phase 4 communication

- Use versioned English/Hindi/Kannada templates for status, trace explanation and dealer notices. Read canonical persisted fields and retain IDs/counts/gaps rather than ask a model to infer workflow decisions. This avoids translation calls for fixed text. Human plant-language review remains required; change wording in `srv/ai-adapter/communication.js` and increment its version.
- Spoken readback uses the existing private Sarvam key with stable `bulbul:v3`, documented `language_code`, WAV output and a 2400-character complete-card bound. No fields are silently truncated. No auto-confirmation, auto-play or persistent raw audio. Edits, language/identity changes or leaving the view cancel and clear audio. Phase 4 has a separate 30-call-per-process cap, six requests per actor/minute and two concurrent requests.
- Explanation reads the latest stored TraceResult for the selected window without calling or changing the trace engine. Counts must agree with stored units. The UI rejects a different version/window from the displayed trace. Missing snapshots require an explicit normal trace request first.
- Dealer drafts use the existing approved QUALITY_NOTIFICATION scope and matching dealer Shipment rows. Require its incident/tool, right approving role, decision, approver and timestamp; ignore development approval bypass. Store an unsent SIMULATED MockDocument and application audit history atomically. No schema migration or new proposal type. Jamuna's workflow is required to create real approvals; this adapter never fabricates one or sends a message. Change the mapping when that owner supplies a revised approved contract.

## Existing origin/main merge resolution

Preserve Vinayaka's new SVG branding, glass/layout/motion changes and component showcase while retaining the integrated navbar identities, real API/store bindings and accurate uncertainty/approval descriptions. Missing tool-use records stay Unknown; labels cannot promise cryptographic verification, immutable audit or completed governance workflows. Reuse locally bundled fonts instead of duplicate Google Fonts requests and replace the stale PNG favicon with the incoming SVG. Backend source/model/persistence and live databases are unchanged. Alternative copy and exact conflict decisions are documented for Vinayaka in [merge resolution](../../docs/merge-resolution.md).

## Current HANA cutover and local application stabilization

- The user's later explicit HANA choice supersedes the previous SQLite-only plan. Private `.env` selects direct HANA; explicit local/fresh launchers and default regression tests retain SQLite isolation. No HANA code was removed.
- The real HANA catalog includes the schema itself and overlapping primary-key index/constraint names. Recognize those proven objects without permitting foreign objects. The inspected account-owned application destination received only reviewed create-only tables/triggers and a transactional copy of all 394 source records.
- `verify:hana-app` explicitly distinguishes additive application verification from the dedicated test-schema harness. Both preserve synthetic test history. Independent direct reads verify the real browser's HANA writes. Replaying the old SQLite source after new HANA activity remains a conflict, never an overwrite.
- The root launcher forks the existing Node entry points, checks ports, anchors backend paths and shuts down only its children. Fresh demos always use a new ignored SQLite file. Vite verification caches are isolated from running application caches.
- Frontend fixes preserve Vinayaka's design and backend trace semantics: reject malformed JSON roots, freeze speech on review, clear prior report metadata, correct separators/favicon, and fit trace controls/identifiers/evidence SVG on mobile. No AI adapter or rules logic was added.
- See [current handover and executed evidence](../../docs/local-demo-readiness.md). Earlier sections below record historical phase decisions.

Paths and npm commands in this document are relative to the `backend/` CAP project unless stated otherwise. Repository-wide backups live in `../backup/`.

- Historical Phase 0 decision: implementation initially used repository-root paths. This is superseded by the authorized backend/ restructuring below; frontend/ remains untouched.
- CAP 10.2.2 and @cap-js/sqlite 3.1.2 were resolved from npm stable tags. Node 24 is installed. Lockfile pins the resolved dependency tree.
- Phase 0 uses an in-memory SQLite connection and a separate ConnectionProbe entity to demonstrate CAP query access. Phase 1 replaces the probe with the domain schema and seed. No production readiness is claimed.
- Every contract operation is a fixed 200 JSON stub except health, which tests the live database. Stub writes do not persist or execute actions. Real create returns 201 in Phase 2. Stub endpoints remain unauthenticated as requested.
- Endpoint ownership is explicit through { mount, router, owner }. Duplicate real method/path registrations fail startup. Stubs register only unclaimed method/path pairs. Parameter names are normalized for collision checks.
- Seed, ground-truth and backup commands exist; unavailable data operations fail with a clear message rather than claiming success. Persistent database backup becomes available with the Phase 1 database.
- No HANA deployment, auth enforcement or domain implementation is included in this phase. All services and example data are synthetic.

- Tools use `{ tools: [...] }` so responses can carry required simulation and stub markers; this additive envelope resolves the conflict with the requested bare array. Other teammates must consume the tools field.
- Teammate-owned endpoint shapes were unspecified; examples are provisional seam proposals requiring owner review. Stub responses are fixed fixtures: IDs, bodies and windows are not interpreted; trace fixture is always the 24h illustration.

- Installed CAP 10 delegates cds.test to the separate @cap-js/cds-test package; added it after inspecting the installed loader. Built-in persistent queue is disabled for this skeleton, which has no messaging or outbox model. Re-enable it when introducing messaging with its schema.
- The standalone fetch verifier normalizes parsed JSON through local JSON serialization before strict equality because Jest and Node fetch use different object realms.
- npm audit fix applied compatible dependency updates. Runtime dependency audit is clean; the Jest development dependency tree still reports advisories. No forced major-version downgrade was applied.

- Git had no configured author identity. Phase commits use the explicit automation identity `ToolSathi Automation <toolsathi-bot@users.noreply.github.com>` through per-command Git settings; no global or repository user identity is changed. Use your normal Git identity for future human commits.

## Continuation decisions

- The new user prompt authorizes Phases 1?6 without the previous STOP gates. Candidate ground truth stays provisional; no approved file is created. The verification command fails on any difference when an approved file appears.
- Explicit scalar foreign identifiers plus unmanaged CDS associations preserve REST field names. The generator verifies required links; runtime services validate them transactionally. Broader database constraints can be added after cross-database migration review.
- Time plan uses closed one-hour runs at least hours from all window boundaries. Missing-end events are bounded by valid linked run end for window selection. For conflicting run timestamps, run start is the scope anchor. Without this documented assumption, open-ended older records contaminate 24h and contradict the specified totals. Association tiers retain the uncertainty; there is no inferred confirmation. Change this policy and ground truth together after Jamuna review.

- Shared mutating helpers take an optional CAP transaction as the last argument; callers pass it to ensure atomic workflows. Without one, helpers start their own transaction. IDs use a locked atomic counter update, not MAX+1. Audit/history use UUID identifiers and deterministic timestamp/ID order.
- SQLite audit triggers and indexes install via db/init.js during deployment and again on CAP served. Fixed schema table names were checked against compiled CDS. HANA needs separate deployment artifacts/permissions; this is documented in Phase 5.
- Header auth checks are applied when real routes replace stubs. They are local demo identity only and are refused in production. Stub verification now checks only health and five teammate endpoints; real business routes have behavioral tests.
- Added .gitattributes to preserve generated LF bytes on Windows checkouts.

- Trace loads the small synthetic manufacturing tables once per transaction and performs stable JavaScript joins; this is deliberately bounded to the 300-unit prototype, not a claim of production-scale query performance. Snapshot uses latest stored inventory snapshot, or incident anchor if no stock snapshot exists. Multiple conflicting stock/shipment locations remain UNKNOWN_LOCATION with an explicit gap. Missing required links produce gaps without invented serials.
- Trace versions serialize on the incident row. Repeated results may differ only in generatedAt/version. Illustrative data-quality deductions are returned separately; stock location uncertainty does not upgrade an association tier.

- Approval proposal types are MAINTENANCE_NOTIFICATION, QUALITY_NOTIFICATION, STOCK_BLOCK and TOOL_RESTRICTION. Payload must bind the action fields (see team-integration.md); batch request scope may be a subset of approved batchIds. Approval decision and approverRole are authoritative persisted workflow records; Jamuna owns creating them securely.
- Internal actions require a named actor object and permitted role and enforce approval in the same transaction. No external workflow header has authority. setState also requires a matching approval to restrict a tool; return-to-service uses verified=true plus Verifier through the workflow seam, not a new public route.
- Development bypass requires both ENFORCE_APPROVALS=false and ALLOW_UNAPPROVED_MOCKS=true, is unavailable in production, logs a warning and labels results. Default and demo settings enforce approvals. Setting either flag alone does not bypass.
- Auth failures and rejected approvals produce separate ACTION_REJECTED application audit entries. Unauthenticated attempts are explicitly recorded as UNAUTHENTICATED/Anonymous, not invented named identities. No request body or token is logged. When the database is unavailable, denial still fails closed.
- @sap/xssec 4.16 installed API/types were inspected: XsuaaService, createSecurityContext, context.checkScope and context.token.getPayload. Scope mapping happens only after token validation. No XSUAA connection or cryptographic integration is claimed locally.

- Local database is db.sqlite. An absent SQLite schema is initialized on first start; existing data is preserved. Tests use the test profile/in-memory configuration. Reset is explicit and backs up the prior file; backup/restore require stopped writers and refuse nonempty WAL. Local lock files prevent maintenance against a running ToolSathi instance; external database tools must also be stopped.
- CAP production build omits docs by default; build.js copies only public response fixtures into gen/srv/docs/examples so stub imports work in packaged runtime. Model loading uses '*' to work with source CDS locally and built CSN in gen/srv. Test discovery excludes generated packages to avoid duplicate-module warnings.
- @cap-js/hana, @sap/cds-dk and @sap/hdi-deploy added for local production compilation/HDI packaging. No network runtime is needed for SQLite; Node native SQLite warning remains. HANA indexes use physical identifiers inspected in generated hdbtable artifacts. Cloud-side audit privileges/trigger are not verified or claimed.

- OpenAPI validation runs swagger-parser in a Node subprocess inside Jest because its installed ref-parser is ESM and Jest's CommonJS loader rejects it. This retains one test runner and uses the installed validator without introducing transpilation. Production profile is tested in an isolated process to ensure it contains no SQLite URL. Offline backup/restore was executed against the freshly seeded local file.

- Windows process termination is not graceful; reliability tests use trusted parent/child IPC for shutdown, never an HTTP shutdown endpoint. Direct Node startup explicitly disconnects the database before exit because cds.shutdown() exits immediately outside the CAP CLI. A stopped-file checkpoint command recovers residual WAL safely. Installed CAP SQLite plain-SQL dispatch discards wal_checkpoint results; the maintenance command uses the inspected SQLite service driver factory outside a transaction and checks busy before success.
- Stub handlers forcibly add _stub:true even when their documentation example was recorded from a real endpoint. Otherwise a missing router could falsely advertise a working implementation. Mock and XSUAA adapter unit tests use controlled fixtures/mocks and are not claims of teammate approval or real token integration.
- Public examples were refreshed from executed API responses; mock success examples came from approved test-only fixtures. OpenAPI schemas are validated and real responses checked using AJV in Jest. Variable history counts and arbitrary JSON details remain open maps. Requester/confirmedBy are report metadata; audit actor always comes from authentication.

- Final runtime pins Node ^24.11.0, matching the tested native SQLite driver and generated HDI deployer engine, rather than implying an untested Node 20 driver combination works out of the box. Original stack requirement permits Node 20 or newer. To change major version, install the matching SQLite driver and rerun reliability/build tests.
- Approval execution additionally requires a named decidedBy and valid decidedAt. The workflow owner must provide these when persisting approval. Invalid calendar dates in incident timestamps are rejected rather than normalized silently.
- Phase 6 reformatted only platform-owned JavaScript using Prettier 3.6.2 for reviewability; no runtime formatter dependency was introduced. Removed obsolete phase-pending script after all operations had real implementations.

## Repository restructuring

- The single CAP project moved into the existing backend/ directory, including source, tests, backend docs and its package/lock. Business modules, schemas, seed plan and API paths are unchanged. Root docs/ and deploy/ are navigation/shared guidance, not duplicate implementations.
- Existing CAP configuration moved unchanged from package.json to backend/.cdsrc.json. mta.yaml and xs-security.json remain together at the backend CAP root, preserving MTA-relative gen/srv, gen/db and security references. Build/package checks must verify the compiled runtime still resolves configuration.
- Repository backup/ remains the one ignored backup store; source operations use scripts/paths.js to resolve it independently of the working directory. Database maintenance permits only backend/ or that backup store, preserving the previous workspace guard. Restore arguments from backend/ now use ../backup/<file>.sqlite or an absolute path.
- Root npm wrappers delegate through npm --prefix backend. There is no workspace framework, root dependency tree or frontend package. The original backend .gitkeep was removed because the directory now contains real source; frontend/.gitkeep remains unchanged.
- Runtime dependencies and generated output were relocated into backend/ separately from git mv source moves, then dependencies/build outputs are revalidated there. Database state is backed up and verified before and after migration, never reset for restructuring.

## Frontend integration

- The new user request authorizes adapting the merged React/Vite frontend on integration/frontend-backend. Preserve its design/assets/routes; backend trace, schema, routes and approval checks remain unchanged.
- Active frontend fixtures and locally fabricated IDs, audit events, confidence, approvals, receipts and return verification were replaced by real API calls or explicit unavailable states. Legacy fixture files/tests remain only as design reference.
- The central client defaults to relative /api with a Vite proxy. Demo headers require Vite development mode and the demo flag; production assets never send them. Role/user switching is visibly local demo identity, not production login.
- Browser tests use Node's existing runtime test runner with Playwright as a library, installed Edge/Chrome, a unique ignored SQLite database and separate Vite port 5174. No additional app/test framework, main database reset, AI backend or rules engine was introduced.
- A deferred/cancellable resource loader prevents StrictMode's development remount from issuing duplicate trace requests and clears values immediately when incident/window/identity changes. Backend summaries remain authoritative; display aliases do not recompute counts or classify associations.
- The normal Vite server was already running in this repository and was reused. Backend was started through its normal local script. Read-only browser checks on ports 5173/4004 and a table-data digest confirmed the original main database was preserved.

## HANA connection and existing-data migration

- The current request explicitly authorizes implementing HANA storage and transferring existing local data. No usable credentials or binding were available; the local .env appearing during final verification still contains placeholders and is preserved/ignored. Real connectivity, remote DDL/data writes and HANA persistence are blocked rather than reported as passing. No request to push Git commits was inferred from pushing data into HANA.
- Keep the installed CAP/HANA/hdb stack and use Node 24 native env loading. Direct SQL credentials map explicitly into CAP; HDI credentials retain the managed binding path. Verified TLS is mandatory, and HANA errors never trigger a SQLite fallback. Production auth remains XSUAA; local HANA uses existing demo auth.
- Direct DDL is compiler-generated create-only SQL for an owner-confirmed dedicated schema. Existing types/keys and object ownership are checked. No schema provisioning, destructive deployment, auto-alter, force overwrite or competing persistence layer is introduced. The HDI build packages audit triggers and disables automatic hdbtabledata imports so data loading remains explicit.
- Existing-data migration takes a consistent read-only SQLite snapshot of all 21 entities, including operational records and counters. It permits only identical destination rows plus missing inserts, locks the HANA application tables, copies in a single transaction and verifies per-table manifests before commit. Seed loading is separate and uses the existing deterministic construction.
- Default npm test explicitly pins SQLite/in-memory storage above CAP's own env-file configuration; the production configuration test removes those test-only pins when inspecting production defaults. test:hana is separately invoked and requires a dedicated explicitly confirmed test schema. To change the target, supply the assigned schema/binding and repeat inspect/plan/preview; do not relax protection checks.
