# Recovery planning and evidence reports

The console now connects persisted intake to a bounded Recovery Planning Agent, human approval and a simulated operation pause or production reassignment. The agent uses the existing Sarvam configuration. The deterministic exposure engine is a read tool, not an AI agent. No external SAP operation, notification, physical production change or downtime saving is claimed.

## Demo

Start the apps with `npm.cmd run dev:local` from the repository root for offline SQLite, or `npm.cmd run dev` to follow your private database configuration. Open `/console` and choose a Confirmed incident. Select Manager and enter your named local demo identity. These headers are demo identities, not verified production identity.

1. Review the incident and deterministic trace. The original report is an observation, not proof of root cause.
2. Expand **Record reviewed alternative-tool evidence** if you have actual operation compatibility and availability evidence. Select an alternative, supply the specification/availability reference and explicitly record both observations. The UI attestation expires in one hour; the API permits at most 24 hours. This is a manager attestation, not an independently authenticated capability certificate. Missing, false or expired evidence makes an alternative Unknown.
3. Click **Generate recovery plan**. The model requests `get_incident`, `get_trace` and `get_alternatives` through an application-level JSON tool protocol. Only allowlisted read tools can run. At most three provider calls are permitted for a plan; the normal flow uses two. It selects an eligible option and cites source IDs. Invalid output fails closed. Manual intake is labelled without inventing AI provenance.
4. Read the recommendation and handoffs. Enter a reason and **Submit recovery proposal**. Approve or reject it separately in the proposal list. Approval uses the existing `/approvals/:proposalId/decision` route with Manager permission.
5. **Execute simulated RECOVERY_PLAN** rechecks source evidence, tool state, calibration validity, attestation expiry and other open simulated reservations. Changed evidence requires a newly generated plan and approval. An approval authorizes exactly its incident, tool, plan and option. Development approval bypass is refused. Execution consumes the proposal once and stores a SIMULATED document and audit entry atomically. It does not change a production run or restore the original tool.
6. Use the separate Technician and Verifier roles for actual recorded repair observations and independent return verification. No role is silently substituted, no calibration PDF is assumed uploaded, no passing readings are prefilled, and backend errors remain errors.
7. **Download executive evidence report** fetches current persisted records. The HTML contains a readable overview and full source records, including Unknown tiers, proposal/approval IDs, repair readings, verifier IDs and application audit history. Open it in a browser to print to PDF. It never infers closure from a session flag or fabricates root causes or business benefits. HTML values are escaped.

## API

All paths below are under `/api`. JSON responses identify the synthetic scenario with `_label: SIMULATED` and `_stub: false`.

| Method / path | Roles | Input / result |
| --- | --- | --- |
| GET `/incidents/:id/recovery` | Manager, Quality, Verifier | Current evidence/eligibility, saved recovery records, recovery proposals and their approvals |
| POST `/incidents/:id/recovery/evidence` | Manager | `alternativeToolId`, `sourceReference` (max 500 chars), `validUntil` (future, at most 24h), explicit boolean `operationCompatible` and `available`; appends an attestation |
| POST `/incidents/:id/recovery/plans` | Manager | Empty object; returns persisted plan `docId`, selected option, explanation, provenance, evidence and handoffs |
| POST `/incidents/:id/recovery/proposals` | Manager | `planId`, `reason`; creates/reuses a scoped Pending proposal; never executes |
| POST `/incidents/:id/recovery/execute` | Manager | Only `approvalId`; returns a persisted simulated execution document |
| GET `/incidents/:id/repair-records` | Technician, Manager, Quality, Verifier | Persisted repair records; lets technicians resume after reload without reading restricted audit endpoints |
| GET `/incidents/:id/executive-report` | Manager, Quality, Verifier | Current incident/tool, stored traces, proposals, matching approvals, repairs, documents, application audit history and limitations |

No new table or HANA migration is required. Plans, attestations and simulation documents use the existing MockDocument entity. RECOVERY_PLAN is a new Proposal type with Manager approval and scope fields `toolId`, `planId`, `optionId`. State becomes Executed only with a successful simulated execution. These records are synthetic application evidence; MockDocument is not a physically immutable store.

Fingerprints compare source incident/tool/candidate records and trace content. A new trace ID for otherwise identical content does not invalidate approval; a changed window or result does. The fingerprint is a stale-data check, not a cryptographic authenticity claim. Alternative reservations apply across open incidents and cease to block other plans after the owning incident is closed; a new availability attestation is still required. The simulation does not model shift scheduling or plant capacity.

## Verification

`npm.cmd --prefix backend test` uses isolated SQLite. `npm.cmd --prefix frontend test` includes HTML escaping. `npm.cmd --prefix frontend run test:e2e` exercises real UI/API containment, failed decisions, repair/verification, evidence attestation and report download using a disposable database. Routine tests do not make paid provider calls.

`node backend/scripts/check-recovery.js` checks provider configuration without calls or displaying credentials. Add `--live` for a synthetic provider check limited to three calls and no database access. The implementation check passed with actual `sarvam-105b`, two calls and all three read tools; the selected option was PAUSE. This does not validate physical operations or production planning accuracy.

The planner has a separate process-local 30-call provider cap, three requests per actor per minute, and one active plan at a time. It is not an account-wide credit cap. A missing key, exhausted credits, timeout or malformed output produces an error without creating an action. A real HANA execution test and independent domain approval of operation compatibility and inspection tolerances remain outside these checks.

Verified 2026-11-01: full offline backend regression passed 262 tests in 30 suites; the eight recovery tests also passed after final audit-provenance changes. Frontend regression passed 31 tests. Browser integration passed all 10 checks, including the complete recovery proposal/approval/execution path with a test-only mocked provider, provider/decision failure behavior, stored-evidence report download, repair/verification and mobile layout. Actual Sarvam was separately checked with two calls using synthetic data. Frontend production build, CAP production build and isolated packaged-runtime verification passed. The application was restarted in SQLite mode and the new routes were checked through the frontend proxy. No HANA records or environment files were changed.
