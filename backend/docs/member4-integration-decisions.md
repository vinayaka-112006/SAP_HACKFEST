# Member 4 Integration Decisions

**Status:** duplicate detection, repeat-failure evaluation, advisory containment proposal generation, one-way proposal approval decisions, and repair/return-to-service workflow are implemented in the current CAP backend. The console now connects to the workflow APIs for local demonstration.

> **Repair lifecycle and console update (2026-11-01):** platform routes `POST /api/incidents/:id/repairs` and `POST /api/repairs/:id/complete` record Technician repair work and explicit test readings through the existing CAP transaction, tool-state, audit and history paths. Every reading submission is retained in append-only audit and history, even after a later passing submission. The frontend console connects duplicate/repeat review, proposal creation, approval, all four separately SIMULATED action routes, repair entry and independent Verifier return. Test readings remain a provisional `{name, passed}` contract without an agreed measurement catalogue or tolerances; production XSUAA and live SAP execution are not claimed.

> **Earlier implementation update (2026-11-01):** duplicate detection and repeat-failure evaluation were integrated as authenticated read-only routes. Their mappings, query parameters, count semantics, and limitations are documented in `docs/api-contract.md`; route coverage is in `tests/duplicates.test.js` and `tests/repeat-failure.test.js`. The containment proposal update below supersedes the prior proposal status.

> **Containment proposal update (2026-11-01):** `POST /api/incidents/:id/proposals` is now an authenticated, persisted, review-only workflow. It requires a Confirmed incident and explicit `{type, reason}`; evidence gates use prior repeat reports or persisted trace/batch/inventory rows. New proposals are Pending, audited, and safely reused on retries. No Approval is created and no action executes. Coverage is in `tests/proposals.test.js`.

> **Approval workflow update (2026-11-01):** `POST /api/approvals/:id/decision` uses `:id` as `proposalId`, derives reviewer identity and role from authenticated middleware and platform policy, and atomically updates a Pending Proposal, creates an Approval and writes audit history. Decisions are terminal; retries/conflicts fail safely. The route does not execute actions. Focused approval/contract tests passed 20/20; the prior full backend suite passed 140/140 tests across 20 suites.

> **Return-to-service update (2026-11-01):** `POST /api/incidents/:id/verify-return` loads persisted RepairLog evidence, requires authenticated Verifier role and a distinct verifier identity, validates named inspection readings as explicitly passing, and transitions the tool from an allowed platform state to Active in the same transaction as repair verification metadata, history and audit. It does not call SAP.

> **Verification results:** targeted return/contract/platform/state/smoke tests passed 26/26 across 5 suites; the full backend suite passed 154/154 tests across 21 suites.

> **Current validation (2026-11-01):** backend suite 163/163 across 22 suites; frontend suite 26/26; seed checks 15/15; isolated browser suite 9/9 including automatic Approval ID handoff, selected-history duplicate/repeat context, proposal → approval → SIMULATED restriction, and repair → independent verification. Backend/frontend builds and packaged runtime verification passed using isolated SQLite. These are local synthetic-data checks, not production safety evidence. HANA, production XSUAA, domain inspection requirements/tolerances, and external SAP actions were not verified in this pass.

## 1. Duplicate detection

### Verified standalone contract

The preserved pure function is detectDuplicateIncidents(currentIncident, existingIncidents, options = {}) in backend_local_backup/src/rules/duplicateDetection.js.

It expects the current report and candidate rows in this shape:

~~~js
{ id?, toolId, category, description, createdAt }
~~~

It only considers the same tool and exact same category, excludes self when both IDs are present and equal, uses an inclusive interval ending at the current report timestamp, and defaults to 30 days and similarity threshold 0.8. Description comparison is token-set Jaccard after lowercasing, trimming, and collapsing whitespace. It returns { valid, matches, reason }; matches contain similarity, createdAt, and id when available. It returns candidates for review only and does not merge incidents or mutate state. Invalid top-level input returns valid: false; malformed candidate rows are skipped.

The backup test suite includes similar/dissimilar descriptions, tool/category filtering, self-exclusion, window edges, invalid timestamps/input, and immutability. The previously verified backup run was 11 passed, including repeat-failure tests.

### Current CAP mapping used by the integrated endpoint

The integrated endpoint maps incidentId to id, prefers non-empty translatedText and falls back to rawText, and maps reportedAt to the rule timestamp because it is event time. createdAt remains server receipt time and is not used for the window. Missing category or invalid event time returns a valid:false evaluation with no candidates. Candidate state is returned as context but is not filtered, preserving the standalone rule's behavior.

### Ownership and confirmation

The GET /api/incidents/:id/duplicates endpoint is now a real platform route; the fixed fixture remains only as a fallback if the route is not registered. The real endpoint requires an authenticated identity, returns _stub:false, and performs no successful-request writes.

The endpoint mapping and response are documented in backend/docs/api-contract.md. Revisit field mapping or state filtering only with an explicit domain decision. Successful GETs do not write audit entries, consistent with other read routes and the read-only requirement.

## 2. Repeat-failure detection

### Verified standalone contract

The preserved function is detectRepeatFailure(toolId, category, incidents, options = {}) in backend_local_backup/src/rules/repeatFailure.js.

Rows use { id?, toolId, category, createdAt }. Options support windowDays, minimumReports, and referenceAt. Defaults are 30 days, at least 2 reports, and current time when referenceAt is omitted. The time interval is inclusive at both ends. The result is { valid, thresholdMet, count, matchingIncidentIds, reason }. Invalid top-level input returns valid: false with a reason; malformed historical rows are skipped.

### Possible current-record mapping

The integrated `GET /api/incidents/:id/repeat-failures` maps `incidentId` to `id` and `reportedAt` to the rule timestamp, using the current incident's `reportedAt` as an explicit reference. It excludes the current ID and deduplicates repeated IDs. It counts unique prior Incident rows in the inclusive interval; defaults are 30 days and two prior records. Positive `windowDays` and integer `minimumReports` query values can override them. No state filter is applied, preserving the standalone behavior. `potentialDuplicateIncidentIds` identifies records that also meet the existing text-similarity candidate rule, but those IDs remain in the count for human review. Missing category or invalid event time returns `valid:false`, zero count, and no matches.

### Decisions required

The endpoint's chosen mapping and state policy are explicit, but need domain review: does the threshold mean two prior reports (current behavior) or two records including the current incident? Should any states such as Rejected or Closed be excluded? `thresholdMet` reports a threshold of prior records, not confirmed distinct real-world failures. Potentially similar reports are surfaced separately and not automatically merged or excluded.

## 3. Containment proposals

### Verified standalone behavior

generateContainmentProposals(incident, context = {}) creates review-only proposals only when the matching trigger is exactly true and a non-empty reason is supplied:

| Backup proposal type | Context trigger | Additional requirement |
|---|---|---|
| restrict_tool | toolRisk.requiresRestriction | incident toolId |
| hold_stock | stockConcern.identified | explicit non-empty batchIds |
| notify_quality | qualityReview.needed | none beyond reason |
| notify_maintenance | maintenance.needed | incident toolId |

Generated proposals use status: "awaiting_review" and executed: false. Unknown exposure is preserved if supplied; counts and safety conclusions are not inferred. This function does not execute actions or persist proposals.

### Platform behavior now implemented

The endpoint accepts one requested platform type and a caller reason; it rejects caller-supplied evidence or batch IDs. Every proposal requires a Confirmed incident. TOOL_RESTRICTION and MAINTENANCE_NOTIFICATION require the 30-day/two-prior-report rule; restriction additionally requires Active tool state. QUALITY_NOTIFICATION requires a suggested NC code and persisted CONFIRMED tier units from the latest 168-hour trace linked to actual Batch records. STOCK_BLOCK additionally requires positive UNRESTRICTED STORE-01 inventory, no stale/conflicting trace flag, and no Shipment row. Missing trace or batch evidence is reported as Unknown and rejected. No affected quantity is inferred.

The route persists current uppercase action types in the CAP Proposal entity with Pending state. Payloads include fields accepted by the existing mock-action approval scope plus trace/repeat evidence references. Similar-description incident IDs are surfaced separately and do not reduce the repeat-record count; prior incident states are not filtered. `rules-adapter.requiredApproverRole` provides the reviewer role. New proposals write application audit history. Existing Pending/Approved proposals and identical previous proposals are reused on retries. The route creates no Approval record and invokes no action. `srv/lib/mock-actions.js` and `srv/lib/approvals-check.js` remain authoritative before any later simulated action.

Provisional choices requiring domain review: proposal requests are limited to Worker/Manager; maintenance priority uses the API example value `2`; stock target uses synthetic PLANT-01/STORE-01. Trace freshness has no maximum age in the current model, so proposal evidence includes trace ID/version/time and remains subject to human review.

## 4. Approval workflow

### Verified standalone behavior

validateApprovalDecision(input = {}) validates decisions approve or reject. Proposal-aware input requires a recognized proposal type, status: "awaiting_review", executed: false, and a requiredApprovalRoles list exactly matching the standalone matrix. It checks the supplied role against that list and the standalone incident:confirm role policy. Rejection requires a non-empty reason. Results include valid, allowed, and reason, and can include decision, role, proposalType, and a trimmed rejectionReason.

Standalone role labels are lowercase. Provisional role assignments are manager for restrict_tool/notify_maintenance and quality for hold_stock/notify_quality. A proposal-less generic validation path also remains for compatibility.

### Platform differences and authoritative checks

The current backend authenticates users through srv/lib/auth.js (local demo identity or XSUAA) and uses Title Case roles, including Verifier. Persisted Approval uses uppercase decisions such as APPROVED, plus approverRole, decidedBy, and decidedAt.

The platform decision route uses authenticated middleware and `rules-adapter.requiredApproverRole`; the standalone lowercase role matrix is not reused. It derives `decidedBy`, role, and `decidedAt` from authenticated identity/policy, moves the Proposal from Pending to Approved/Rejected and creates Approval in one transaction, and writes audit history. `approvals-check.assertApproved` and mock-action scope checks remain authoritative for any later consequential action. The decision route itself executes nothing.

The current policy maps TOOL_RESTRICTION/MAINTENANCE_NOTIFICATION to Manager and QUALITY_NOTIFICATION/STOCK_BLOCK to Quality through `rules-adapter`. Confirm whether multi-party approval is required. The path parameter denotes proposalId because a completed Approval row is created only when a decision is made; the response returns its new approvalId for later action calls. Both decisions require an auditable reason because Approval.reason is mandatory; a rejection reason is specifically its explanation.

## 5. Return-to-service verification

### Verified standalone requirements

validateReturnToService(input = {}) requires:

- repairLog: non-empty string or structured object with non-empty descriptive string content.
- testReadings: non-empty array; each item must be an object with boolean passed, and every reading must be passed: true.
- Authorized verifier role under standalone tool:verify_return policy.
- Non-empty verifierId and repairTechnicianId, with trimmed identities different.
- toolState or fallback currentToolState permitting a transition to returned_to_service.

It returns { valid: true, reason: null, errors: [] } or { valid: false, reason, errors }. It validates only; it does not change tool state.

### Platform behavior now implemented

`POST /api/incidents/:id/verify-return` accepts only `{ repairId }`. It treats `:id` as incidentId, loads that incident's tool and matching persisted RepairLog, and rejects a missing or previously verified repair. Client-supplied verifier identity, pass status, repair description and readings are not accepted. The route requires authenticated `Verifier` middleware.

The RepairLog must have non-empty description and loggedBy, a parseable loggedAt timestamp, aggregate `passed: true`, and a non-empty `testReadings` JSON array. Every item must contain a non-empty `name` and boolean `passed: true`; failed, missing, ambiguous, malformed and empty readings are rejected. The verifier and `RepairLog.loggedBy` are compared after trimming and case-folding. This array shape is a platform contract decision because the CDS column is untyped LargeString JSON; older map-shaped readings do not qualify.

The tool must permit the current platform transition (default: `Awaiting verification` to `Active`, with verified context and Verifier role). The handler uses `tool-state.setState`, persists `RepairLog.verifiedBy`/`verifiedAt`, and writes evidence-specific audit metadata in one CAP transaction. The tool-state helper also writes its normal transition audit and history. Proposal approval cannot substitute for repair evidence. This route does not invoke action services.

Separation of duties is enforced for all returns, although the current platform adapter does not express that rule. Treat this as a conservative provisional domain rule. Local demo role headers are not authentication; production identity relies on existing verified XSUAA middleware.

## 6. Ground-truth testing and demo evidence

### Existing evidence

The backup has deterministic fixtures in backend_local_backup/tests/fixtures/groundTruthScenarios.js and Node built-in tests in groundTruth.test.js, alongside focused rule/workflow tests. The prior run verified 11 backup tests. Current-backend coverage is in `tests/duplicates.test.js`, `tests/repeat-failure.test.js`, `tests/proposals.test.js`, `tests/approval-workflow.test.js`, and `tests/return-to-service.test.js`. These synthetic tests do not establish production safety.

Ground-truth passing means only that the standalone function matched synthetic expected outcomes. It does not prove database wiring, route behavior, authentication, audit persistence, SAP connectivity, or production safety.

### Implemented integration tests and remaining test work

- Duplicate route coverage is implemented in tests/duplicates.test.js: same-tool/category similarity, filters, self-exclusion, boundary, malformed data, missing incident, authentication, and read-only behavior.
- Repeat-failure route coverage is implemented in tests/repeat-failure.test.js: threshold cases, filters, inclusive boundary, configurable settings, current exclusion, ID de-duplication, malformed inputs/data, authentication, and read-only behavior. It also verifies that potential duplicate IDs are surfaced separately without being removed from the count.
- Proposal generation: each platform type is tested against its required evidence, plus missing trace/batch evidence, retry behavior, authentication, invalid/unconfirmed incidents, audit, and no-execution behavior.
- Approval workflow: all four current role mappings, approve/reject, rejection reason, authorization, invalid/ineligible proposals, repeated/conflicting decisions, persistence/audit, and no execution are tested. Rejected decisions are checked against the action gate.
- Return-to-service unit/integration tests cover passing evidence, missing/malformed/empty/failed readings, invalid state, missing repair, authentication/role denial, technician/verifier conflict, caller evidence rejection, persisted evidence, audit/history and retries.
- Current CAP integration coverage does not establish live XSUAA identity, HANA transaction behavior, official inspection limits, or production-scale maintenance controls.

### Demo labeling

- Implemented: current source and tests exercise the stated behavior in the platform.
- Simulated: platform mock service behavior that is actually executed locally and labeled _label: SIMULATED.
- Planned: backup-only rules, stub routes, proposed mappings, or contracts awaiting integration.

Never present a passing standalone test or _stub: true fixture as a connected API feature. Do not claim live SAP integration based on simulated mock routes or deployment configuration.

## 7. Implementation sequence

1. Duplicate and repeat-failure evaluation are integrated at authenticated read-only endpoints, with API contracts and tests.
2. Review the repeat-failure threshold meaning and whether any incident states should be excluded before making frontend claims about recurrence.
3. Proposal generation now persists evidence-backed Pending records without creating an Approval or executing actions. Review provisional proposal-role/priority choices and the repeat-report threshold meaning with the domain team.
4. Approval decisions now persist through the authenticated endpoint. `assertApproved` and action-scope matching remain the gate for any later execution; role policy comes from the existing adapter, not the backup role matrix.
5. Review the provisional inspection-reading schema and universal separation-of-duties rule with the domain team; also define authoritative required-reading sets or limits before treating verification as production assurance.

### Work that can be done independently

- Maintain Member 4 documentation and standalone ground-truth fixtures/tests in the preserved module without changing platform-owned routes or rules.
- Review/add test cases against the backup pure functions using its existing node:test convention.
- Prepare a mapping proposal and integration test matrix from agreed platform contracts.
- Do not add a competing service, change shared stub contracts, or modify Jamuna-owned srv/rules/ or routes without explicit ownership alignment.

### Confirmation dependencies

- **Jamuna:** rules-adapter state-machine contracts and proposal/approval policy; review the return route's state-transition seam.
- **Backend owner:** confirm whether RepairLog.testReadings should become a typed CDS entity and how actual reading values/limits are represented. Duplicate/repeat routes use Incident.reportedAt and existing query patterns.
- **Domain/team decision:** which incident states count, final approver roles, approval cardinality, similarity/window thresholds, and return-verification requirements.

## Current decision

Duplicate evaluation, repeat-failure evaluation, proposal generation, approval decisions and return-to-service verification are integrated and covered by current-backend tests; backup source remains reference material and is not imported at runtime. The JSON reading schema and universal separation-of-duties rule remain decisions for domain review.
