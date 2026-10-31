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
