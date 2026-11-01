# Rules Integration Map

**Purpose:** map Member 4's preserved rule/workflow implementation to the current CAP backend and record verified integration status.

> **Current implementation update (2026-11-01):** duplicate and repeat-failure evaluation are authenticated, read-only routes in `srv/routes/incident.router.js`, backed by adapted pure functions in `srv/lib/duplicate-detection.js` and `srv/lib/repeat-failure.js`. Both use current CAP Incident rows and make no successful-request writes. Repeat-failure API semantics and tests are documented in `docs/api-contract.md` and `tests/repeat-failure.test.js`. Remaining notes that describe repeat-failure as unimplemented are historical.

> **Workflow update (2026-11-01):** proposal generation and one-way approval decisions are implemented in `srv/routes/proposals.router.js`. Decisions persist Proposal state, Approval and application audit history atomically; mock action execution remains a separate approval-gated step.

## 1. Current backend architecture and entry points

### Verified in source

- backend/package.json identifies the project as toolsathi-platform, requires Node ^24.11.0, and uses @sap/cds 10.2.2 with Express 4 routers. Scripts start srv/server.js; tests run node scripts/run-tests.js.
- backend/.cdsrc.json configures CAP database profiles: SQLite by default/test/development and HANA for hana-local/production. Production auth is configured as XSUAA.
- backend/srv/server.js is the application entry point. It configures the CAP database, installs append-only database protection, configures Express JSON/CORS/error handling, loads routers, and starts the CAP server. It emits SIMULATED startup labeling.
- backend/srv/lib/router-loader.js loads srv/routes/*.router.js, registers real routes, rejects duplicate method/path registrations, and registers fixed-JSON _stub:true handlers for missing paths in srv/routes/_stubs/contract.json.
- backend/db/schema.cds is the CAP data model. It includes Tool, Incident, IncidentEvidence, Proposal, Approval, RepairLog, AuditLog, ToolHistoryEvent, and trace/manufacturing entities.
- backend/srv/lib/incidents.js validates and retrieves Incident and Tool rows. The incident router implements incident creation, confirmation, and get-by-ID.
- backend/srv/lib/audit.js persists application audit entries; backend/srv/lib/history.js persists tool history. Database protection includes audit update/delete triggers and service-side protections.
- backend/srv/lib/auth.js supports local demo headers and XSUAA token validation. Its role labels are Title Case: Worker, Manager, Quality, Technician, Verifier.
- backend/srv/lib/approvals-check.js checks persisted Approval and Proposal rows before mock actions. backend/srv/lib/mock-actions.js contains simulated notification, stock-block, and tool-restriction behavior and labels results SIMULATED.
- Existing real routes include health, incident create/confirm/get/duplicate and repeat-failure evaluation, tools/list/history, trace, audit, mock S/4 actions, mock DM restriction, and mock documents.
- backend/srv/lib/rules-adapter.js is an existing CommonJS seam. It tries to load backend/srv/rules/state-machine.js and backend/srv/rules/approvals.js; when those files are absent it uses built-in defaults and logs "using default rules". Its public functions are canIncidentTransition(from, to, ctx), canToolTransition(from, to, ctx), and requiredApproverRole(type).
- backend/srv/routes/_stubs/contract.json retains fallback fixtures for unimplemented endpoints. Duplicate/repeat-failure and return verification are claimed by the platform incident router; proposal creation and approval decisions are claimed by the platform proposal router. AI structure remains stubbed.
- backend/docs/team-integration.md, backend/docs/api-contract.md, and root AGENTS.md identify ownership seams. Root instructions say not to create or edit backend/srv/rules/ (Jamuna-owned) and describe backend/srv/lib/rules-adapter.js as the adapter seam.

### Not established by the source

- mta.yaml provisions CAP service, HDI, and XSUAA resources. This configuration alone does not establish a successful live SAP tenant integration. The source labels S/4 and DM actions simulated; do not describe them as live SAP integrations.

## 2. Existing entities, services, handlers, and APIs

### Incident and tool data

db/schema.cds defines Incident fields including incidentId, toolId, reporterId, rawText, translatedText, category, state, createdAt, and reportedAt; Tool fields include toolId, state, calibration metadata, and usage metadata; IncidentEvidence and ToolHistoryEvent are also defined.

The actual incident create route requires toolId, reporterId, language, and rawText. It assigns an ID, sets state to Reported, records createdAt from server time, and sets reportedAt to a valid supplied value or server receipt time. It does not evaluate these rules during creation. The duplicate and repeat-failure routes load the requested Incident and query same-tool/category history inside CAP transactions.

### Proposals, approvals, repairs, and audit

db/schema.cds defines:

- Proposal: proposalId, incidentId, type, payload, reason, state, createdAt.
- Approval: approvalId, proposalId, approverRole, decision, reason, decidedAt, decidedBy.
- RepairLog: repairId, toolId, incidentId, description, loggedBy, loggedAt, testReadings, passed, verifiedBy, verifiedAt.
- AuditLog: actor, actorRole, action, details, reason, modelVersion, timestamp, and incident/tool references.

These are actual CAP entities. Proposal generation persists Pending Proposal rows; the approval decision route updates Proposal and inserts the completed Approval row in one transaction. The verify-return route reads RepairLog, stores verifiedBy/verifiedAt, and changes tool state through the existing tool-state workflow in one transaction. mock-actions consumes only matching persisted approved records as a separate action stage.

### Existing role/state/action checks

- Platform roles in srv/lib/auth.js and xs-security.json use Title Case and include Verifier.
- Current fallback state-machine values in srv/lib/rules-adapter.js use Title Case incident states (Reported, Confirmed, Under review, etc.) and tool states (Active, Restricted, Under repair, Awaiting verification).
- Tool state updates go through srv/lib/tool-state.js, which uses the rules adapter, checks incident/tool consistency, enforces approval on Restricted, writes audit and history, and updates the Tool row transactionally.
- Mock actions call approvals-check.assertApproved(...) for the exact persisted proposal/approval, required role, incident, type, and action scope before their simulated side effect. This platform enforcement path must not be weakened by a copied validator.
- The API contract and stub fixtures say simulated responses carry _label: SIMULATED and stubs carry _stub: true.

## 3. Mapping from preserved rules to current backend

| Preserved Member 4 function/module | Closest current platform capability | Current integration status |
|---|---|---|
| detectDuplicateIncidents in backup src/rules/duplicateDetection.js | GET /api/incidents/:id/duplicates in incident.router.js; adapted pure function in srv/lib/duplicate-detection.js; CAP Incident query. | Implemented as a read-only candidate response. tests/duplicates.test.js covers matching, filters, self-exclusion, boundary, 404, auth, invalid data, and no successful-read mutation. |
| detectRepeatFailure in backup src/rules/repeatFailure.js | GET /api/incidents/:id/repeat-failures in incident.router.js; adapted pure function in srv/lib/repeat-failure.js; CAP Incident query. | Implemented as a read-only count of unique prior records. Tests cover threshold, filtering, current exclusion, boundary, invalid input/data, auth, and no successful-read mutation. |
| generateContainmentProposals in backup src/rules/containmentProposals.js | POST /api/incidents/:id/proposals in srv/routes/proposals.router.js; pure builder srv/lib/containment-proposals.js; Proposal CDS entity; existing mock-action payload scope. | Implemented as authenticated, evidence-gated, audited Pending Proposal generation. No Approval or action is created; retries reuse an existing Pending/Approved proposal. |
| validateApprovalDecision in backup src/workflows/approvalWorkflow.js | POST /api/approvals/:id/decision in srv/routes/proposals.router.js, Approval CDS entity, approvals-check and rules-adapter.requiredApproverRole. | Implemented as an authenticated one-way decision addressed by proposalId; updates Proposal and writes Approval plus audit atomically. The backup validator is not imported. |
| validateIncidentTransition / validateToolTransition in backup workflow modules | srv/lib/rules-adapter.js, used by incident confirmation and tool-state service. | Similar responsibility exists, but backup exports and state names do not match adapter contract. Native defaults are in place; srv/rules modules are absent. |
| validateReturnToService in backup workflow | POST /api/incidents/:id/verify-return in incident.router.js; validator srv/lib/return-to-service.js; RepairLog and existing srv/lib/tool-state.js workflow. | Implemented with persisted repair evidence, authenticated Verifier, distinct loggedBy/verifier identities, explicit passing reading records, tool transition, audit and history in one transaction. Backup roles/states are not imported. |
| Backup rolePolicy.js | srv/lib/auth.js, xs-security.json, srv/lib/approvals-check.js, rules-adapter.js. | Platform has its own authentication, role checks, persisted approval checks, and role mapping. Lowercase backup policy is not wired and should not replace these checks. |

## 4. Schema and API differences

### Incident shape and duplicate mapping

Backup duplicate detection expects { id?, toolId, category, description, createdAt }. The integrated endpoint maps incidentId to id, prefers non-empty translatedText and falls back to preserved rawText, and maps reportedAt to the rule timestamp because it represents event time; createdAt is server receipt time. Missing category or invalid event timestamp produces an invalid evaluation with no candidates. The 30-day boundary is inclusive, threshold remains 0.8, and no incident-state filter is applied because the standalone function had none. The function returns suggestions for human review only.

Backup repeat-failure detection expects { id?, toolId, category, createdAt }. The endpoint maps incidentId to id and reportedAt to createdAt, using the current report's reportedAt as reference and excluding its ID. Matching IDs are deduplicated. The inclusive 30-day interval and threshold of two are defaults with validated query overrides. No state filter is applied. The count represents unique incident records and does not establish distinct real-world events. Potential duplicate IDs are returned separately for review and remain in the count; they are never merged or automatically excluded.

### Proposal names, fields, and status

Backup proposal types are lowercase snake_case: restrict_tool, hold_stock, notify_quality, notify_maintenance. Platform action/approval types are uppercase: TOOL_RESTRICTION, STOCK_BLOCK, QUALITY_NOTIFICATION, MAINTENANCE_NOTIFICATION.

The backup generator context fields are toolRisk, stockConcern, qualityReview, and maintenance. The platform implementation now accepts one uppercase proposal type plus a reason, derives triggers server-side, maps to mock-action payload fields, persists state Pending, and records trace/repeat evidence. It uses CONFIRMED trace links from the latest 168-hour trace for quality and stock; stock additionally requires non-stale, non-conflicting, positive UNRESTRICTED STORE-01 inventory and no Shipment. It does not import the backup schema or accept caller-provided batch scope. Maintenance priority `2` and plant/storage `PLANT-01`/`STORE-01` are documented provisional synthetic values.

### Approval fields and decisions

Backup decision validation accepts approve/reject, a lowercase role, and an in-memory proposal whose required role list exactly matches its matrix. Platform Approval records use uppercase decisions such as APPROVED and fields approverRole, decidedBy, and decidedAt. Platform mock-action approval checks require a persisted approved record with matching proposal, role, incident, type, payload, and scope. Decision creation/authentication remains the Jamuna endpoint responsibility.

### Return-to-service fields and states

Backup verifier input uses verifierId, repairTechnicianId, verifierRole, repairLog, testReadings with per-reading boolean passed, and toolState verification_pending. Platform RepairLog fields are description, loggedBy, testReadings JSON, passed, verifiedBy, verifiedAt. Platform states use Title Case Awaiting verification and Active; backup constants use snake_case verification_pending and returned_to_service. Backup validator checks a transition to returned_to_service, whereas platform state service requests Active and requires a Verifier context in the fallback adapter. Deliberate translation and evidence review are required.

### Identity and roles

Backup role labels are lowercase worker, manager, quality, technician; its return policy permits manager/quality for tool:verify_return. Platform authenticated role labels are Title Case and include Verifier; current team integration docs require verified return with Verifier. Do not substitute the backup role check for trusted req.user/XSUAA and persisted approval enforcement.

## 5. Conflicting states and role policies

Verified conflicts:

- Incident states differ in spelling and lifecycle. Backup has reported, needs_review, confirmed, rejected, closed; platform fallback adds Under review, Containment proposed, Approved, Repairing, Awaiting verification, and Closed with insufficient evidence.
- Tool states differ: backup has active, restricted, under_maintenance, verification_pending, returned_to_service; platform fallback has Active, Restricted, Under repair, Awaiting verification, with direct verified return to Active.
- Backup toolState map permits Restricted -> Active without verification context. Platform fallback requires Awaiting verification -> Active with verified:true and role Verifier.
- Backup return validator permits Quality/Manager verifier role labels under its old policy. Platform auth defines a dedicated Verifier role and current team integration docs require Verifier.
- Backup approval roles are single lowercase role strings in proposal arrays; platform has requiredApproverRole(type) returning Title Case Manager/Quality and persisted Approval records.
- Proposal and action types differ as listed above.

These are incompatible contracts, not cosmetic naming differences. Resolve them before adapting any business rule.

## 6. Files that could be reused or adapted safely

Reference-only backup files:

- backend_local_backup/src/rules/duplicateDetection.js
- backend_local_backup/src/rules/repeatFailure.js
- backend_local_backup/src/rules/containmentProposals.js
- backend_local_backup/src/workflows/approvalWorkflow.js
- backend_local_backup/src/workflows/incidentState.js
- backend_local_backup/src/workflows/toolState.js
- backend_local_backup/src/workflows/returnToService.js
- backend_local_backup/src/authorization/rolePolicy.js
- backend_local_backup/docs/rules-integration-contract.md
- Backup tests and ground-truth fixtures.

Do not copy these files wholesale into current backend. They use ESM and lowercase domain contracts; platform entry point and services use CommonJS and platform-native Title Case/uppercase contracts. Preserve only implementation ideas that survive contract review, such as deterministic similarity scoring and strict per-reading pass validation, then adapt through platform-owned boundaries.

Current platform seams to preserve:

- srv/lib/rules-adapter.js is the existing state/approver seam. It expects srv/rules/state-machine.js and srv/rules/approvals.js with exact exports documented in backend/docs/team-integration.md. Root ownership instructions mark srv/rules as Jamuna-owned; do not create or edit those files as part of this integration map.
- Jamuna-owned stub endpoint contracts remain in _stubs/contract.json; router loader replaces each stub automatically when a real route registers the same method/path.
- Existing srv/lib/incidents.js, approvals-check.js, tool-state.js, audit.js, history.js, authenticated req.user, and transaction conventions remain authoritative for retrieval, persistence, authorization, state changes, and audit.
- srv/lib/mock-actions.js already enforces approved persisted action scope. New integration must not bypass this check.

No backup file is currently imported by the backend.

## 7. Confirmation required from backend owner / rule owner

1. Both integrated rules use event timestamp `reportedAt`; creation normalizes accepted timestamps to UTC. Confirm with the domain owner that event time, rather than server `createdAt`, is appropriate for recurrence decisions.
2. Duplicate matching prefers non-empty `translatedText` and falls back to `rawText`; missing category yields an invalid evaluation. Confirm whether this translation fallback is acceptable for comparing reports across languages.
3. Should repeat-failure counts exclude any current platform incident states? Current code preserves standalone behavior and applies no state filter; it returns each match's state as context.
4. The current GET routes query same-tool/category Incident rows directly in a CAP transaction. Confirm whether that query should move behind a shared incident-history service if one is introduced.
5. Duplicate, repeat-failure, proposal, approval-decision and verify-return are platform routes. AI structure remains a stub.
6. Should backup proposal types/context map to platform uppercase types and action-specific payloads, or should the rule owner implement directly against platform terms?
7. Are proposal states Pending/Approved/Rejected authoritative? What are legal proposal/approval transitions and idempotency rules?
8. Confirm final approver mapping and whether every consequential action requires a matching persisted Approval record. Existing approvals-check enforces a matching approval for mock actions.
9. Confirm the provisional reading shape `{name, passed}` and universal independent-verifier rule. Does the domain require a typed reading entity, named required checks, numeric limits, or a different separation-of-duties policy?
10. Which parts of validateApprovalDecision should remain after adaptation: proposal-state shape checks, role mapping, rejection reason, or only pure decision semantics? Existing platform auth and approval checks must not be duplicated or weakened.
11. Confirm the Node 24 CI runtime and test command. Dependencies were available for the current local Jest runs; external CI behavior remains to be verified.

## 8. Historical first implementation recommendation

The recommendation below was made before the duplicate endpoint was implemented. The endpoint now exists in the platform incident router; this section records why that read-only seam was chosen.

Why this is the safest first change:

- The backend already has real incident retrieval, an Incident entity, an endpoint contract, authentication middleware, error handling, and a route loader designed to replace the stub.
- Duplicate detection is read-only and cannot change tool state or execute mock actions.
- It tests one integration seam before coupling proposal persistence, approval decisions, or return-to-service transitions.
- This route is listed as Jamuna-owned; coordinate ownership before editing it.
- Preserve platform response labeling and confirm whether a read operation should write an application audit entry before implementation.

Both duplicate and repeat-failure evaluations are now implemented. Domain review is still needed for repeat-failure threshold semantics (two prior records versus counting the current report) and whether any incident states should be excluded.
