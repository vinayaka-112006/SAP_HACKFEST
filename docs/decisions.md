# Decisions

- Phase 0 only; stop before domain schema and seed. Existing backend/ and frontend/ placeholders stay untouched; platform files use the prompt's root layout. Change layout through an explicit team agreement.
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
