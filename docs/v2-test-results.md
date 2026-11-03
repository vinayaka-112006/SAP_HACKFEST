# V2 verification — 2026-11-02

| Check | Actual result |
|---|---|
| Starting backend baseline | 263 passed / 30 suites |
| Final backend `npm --prefix backend test` | 277 passed / 32 suites; 0 failed |
| Frontend `npm --prefix frontend test` | 32 passed; 0 failed |
| Frontend `test:seed` | Passed all ground-truth checks |
| Browser `npm --prefix frontend run test:e2e` | 12 passed; 0 failed |
| Backend `build` | Passed; compiled 31 HANA tables, packaged CAP runtime |
| Frontend `build` | Passed, Vite production output |
| OpenAPI validation | Passed Swagger Parser; 56 paths, 63 method/path operations |
| Actual route registry | 63 real handlers; no registered fallback stubs |
| Default DB safety | Isolated in-memory SQLite / separate synthetic browser/launcher files |
| HANA compatibility | Offline compiler and SQL adapter checks passed; no remote connection/deployment |
| HANA migration/live data | Not executed or reset; create-only review artifact prepared |
| Real microphone/Sarvam output | Not verified; synthetic contracts/failure paths only |

## Trace regression

| Window | Potentially exposed | Confirmed | Probable | Unknown |
|---|---:|---:|---:|---:|
| 24h | 35 | 35 | 0 | 0 |
| 72h | 100 | 90 | 4 | 6 |
| 168h | 160 | 146 | 8 | 6 |

The existing exposure-range assertions remain 35 / 154 / 6. The trace algorithm
was not modified. Results are synthetic demonstration evidence, not plant safety
certification. See backend tracked trace-validation.json and summary.json.

## New coverage

Invitation ownership/expiry/scope requirements, Worker default registration,
Administrator boundaries, credential/work-center/shift/workload eligibility,
simultaneous repeated assignment and session confirmation, immutable original
Kannada/Hindi statements, human duplicate links, cycle rejection, repeat failures,
linked-child work rejection, parts reservation and repeat-safe actual consumption,
Manager completion review before independent verification, and AI outage fallback.

XSUAA tests mock the SDK and exercise real middleware/routes to reject spoofed
headers, unrelated incidents, indirect readback references, broad restricted
searches and fabricated reporter/confirmer identity. They do not establish a live
identity-provider deployment.

The browser suite retains its ten original cases and adds Kannada interview,
editable confirmation, persisted language/Hindi switch, qualified Manager
assignment, Technician acceptance and cross-user chatbot denial. Chromium/Edge
ran headlessly with synthetic records; no real audio hardware was exercised.
Browser tests also run existing backend smoke and stub verification.

An intermediate run failed when Windows storage filled (ENOSPC/SQLite disk full).
After free space became available, full backend and browser suites were rerun and
passed. Initial new browser selector ambiguities were corrected; final counts above
refer to actual completed executions. No failed run is presented as success.
