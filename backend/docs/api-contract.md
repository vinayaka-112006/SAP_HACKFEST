# ToolSathi API contract

Base URL `http://localhost:4004/api`. Synthetic data and simulated services; no live SAP tenant action is claimed. JSON UTC timestamps end in Z. Tools use `{ tools: [...] }`. Implemented responses carry `_label:SIMULATED`, `_stub:false`; fixed non-platform fixtures carry `_stub:true`. The AI structure-report fixture is the single remaining external stub. Examples are recorded synthetic responses.

| Method | Path | Owner | Implementation | Example |
|---|---|---|---|---|
| GET | /api/health | platform | Real backend | [JSON](examples/health.json) |
| POST | /api/incidents | platform | Real backend | [JSON](examples/incident-create.json) |
| POST | /api/incidents/:id/confirm | platform | Real backend | [JSON](examples/incident-confirm.json) |
| GET | /api/incidents/:id | platform | Real backend | [JSON](examples/incident-get.json) |
| GET | /api/tools | platform | Real backend | [JSON](examples/tools.json) |
| GET | /api/tools/:id/history | platform | Real backend | [JSON](examples/tool-history.json) |
| GET | /api/incidents/:id/trace | platform | Real backend | [JSON](examples/trace.json) |
| GET | /api/audit | platform | Real backend | [JSON](examples/audit.json) |
| POST | /api/mock/s4/maintenance-notifications | platform | Real local simulation | [JSON](examples/maintenance.json) |
| POST | /api/mock/s4/quality-notifications | platform | Real local simulation | [JSON](examples/quality.json) |
| POST | /api/mock/s4/stock-blocks | platform | Real local simulation | [JSON](examples/stock-block.json) |
| POST | /api/mock/dm/tool-restrictions | platform | Real local simulation | [JSON](examples/restriction.json) |
| GET | /api/mock/documents | platform | Real local simulation | [JSON](examples/documents.json) |
| POST | /api/ai/structure-report | Shashank | Stub | [JSON](examples/ai-structure.json) |
| GET | /api/incidents/:id/duplicates | platform | Real read-only duplicate evaluation | [JSON](examples/duplicates-real.json) |
| GET | /api/incidents/:id/repeat-failures | platform | Real read-only repeat-failure evaluation | [JSON](examples/repeat-failures.json) |
| POST | /api/incidents/:id/proposals | platform | Real backend | [JSON](examples/proposals.json) |
| POST | /api/approvals/:id/decision | platform | Real backend | [JSON](examples/approval-decision.json) |
| POST | /api/incidents/:id/verify-return | platform | Real backend | [JSON](examples/verify-return.json) |
| POST | /api/incidents/:id/repairs | platform | Real backend | [JSON](examples/repair-start.json) |
| POST | /api/repairs/:id/complete | platform | Real backend | [JSON](examples/repair-complete.json) |
| GET | /api/incidents | platform | Real backend | [JSON](examples/incidents.json) |
| POST | /api/incidents/:id/close | platform | Real backend | [JSON](examples/incident-close.json) |

AI transcription: POST /api/ai/transcribe?language=kn|hi|en, raw audio up to 2 MiB. Both AI operations require Worker/Manager. See srv/ai-adapter/README.md for the current live contract and provider limitations; ai-structure.json is a historical stub fixture, not a live success example.

Read-only evidence retrieval: POST /api/ai/search and GET /api/incidents/:id/similar accept authenticated application roles. Local embeddings plus keyword search; no Sarvam calls or duplicate decisions. Source citations and limitations: srv/ai-adapter/README.md.

Multilingual communication: POST /api/ai/readback (Worker/Manager; explicit review, Sarvam audio); GET /api/incidents/:id/status-text (authenticated roles); GET /api/incidents/:id/trace-explanation (Manager/Quality/Verifier; stored snapshot only); POST /api/incidents/:id/dealer-draft (Quality; approved Quality notification and shipped batch scope, 201). Drafts are stored and audited, never sent. Fixed English/Hindi/Kannada templates do not spend AI credits. See srv/ai-adapter/README.md and OpenAPI.

Errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`. 400 INVALID_INPUT/INVALID_JSON/INVALID_WINDOW; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 TOOL_NOT_FOUND/INCIDENT_NOT_FOUND/REPAIR_LOG_NOT_FOUND/BATCH_NOT_FOUND/NOT_FOUND; 409 INVALID_STATE/INVALID_REPAIR_EVIDENCE/APPROVAL_REQUIRED. Internal 500/503 errors hide details. Payload limit 1 MB.

Incident create returns 201; other successes 200. Required toolId/reporterId/language(kn,hi,en)/rawText; original text is preserved exactly. Optional translatedText/category/suggestedNcCode/confidence(0..1)/missingFields(string array)/photoRef/reportedAt/modelVersion. Missing reportedAt uses SERVER_RECEIVED with warning; photoRef becomes evidence. Confirm requires confirmedBy, permits only translatedText/category/suggestedNcCode/toolId corrections and only Reported state. Before/after audit and both tool histories capture reassignment. No trace is invented when none has been generated.

Trace accepts 24/72/168 and trailing h, default 24. Bounds use incident.reportedAt. Missing-end links use the documented linked-run scope assumption, retaining uncertainty. Deduplicated units preserve source IDs and sort by serial. Unknown and stale location status remain explicit. Exposure range always evaluates all three windows. Every successful request persists a new version/audit/history. Quality score: 100 minus 40*unknown/total, 20*probable/total, 5*stale shipment records and 10*conflict runs; floor zero, round half up. Empty scope scores 100. Value is ESTIMATE_SYNTHETIC.

Audit requires incident; orders timestamp/auditId ascending. Incident detail returns last five newest audit entries and trace summaries. Tool history sorts at/eventId descending. No audit update/delete routes; SQLite database triggers enforce append-only rows. HANA audit privileges/trigger remain unverified.

Mock POST requires authenticated Manager/Quality plus APPROVED persisted record with correct role, incident, proposal type and payload scope. Notification retries return the existing document plus replay audit/history. Stock skips shipped batches; repeats return alreadyBlocked. Repeated restriction returns invalid transition. Documents require incident; limit defaults 50/max100; offset 0..10000; sort createdAt/docId ascending. See mock-mapping.md and team-integration.md.

Local header identity is demo-only; production is configured for XSUAA, but a live binding/token remains unverified. Worker/Manager create and confirm; authenticated roles read incidents/tools/history/documents; Manager/Quality/Verifier trace/audit; Manager/Quality mock POST. Health and the AI structure-report stub are public. x-system-call has no authority.

## Request examples

### POST /api/incidents

```json
{
  "toolId": "TOOL-B",
  "reporterId": "WRK-014",
  "language": "kn",
  "rawText": "?????? ??????????",
  "translatedText": "Tool B is leaving bolts loose",
  "category": "TORQUE",
  "reportedAt": "2026-11-04T05:12:00Z",
  "modelVersion": "stub-0"
}
```

### POST /api/incidents/:id/confirm

```json
{
  "confirmedBy": "WRK-014",
  "corrections": {}
}
```

### POST /api/mock/s4/maintenance-notifications

```json
{
  "incidentId": "TS-0002",
  "toolId": "TOOL-B",
  "shortText": "Inspect Tool B",
  "priority": "2",
  "requestedBy": "MGR-01",
  "approvalId": "APR-0001"
}
```

### POST /api/mock/s4/quality-notifications

```json
{
  "incidentId": "TS-0002",
  "toolId": "TOOL-B",
  "shortText": "Review potential exposure",
  "batchIds": [
    "BATCH-B-DUP"
  ],
  "requestedBy": "QA-01",
  "approvalId": "APR-0002"
}
```

### POST /api/mock/s4/stock-blocks

```json
{
  "incidentId": "TS-0002",
  "batchIds": [
    "BATCH-B-DUP"
  ],
  "plant": "PLANT-01",
  "storageLocation": "STORE-01",
  "reason": "Potential exposure review",
  "approvalId": "APR-0002"
}
```

### POST /api/mock/dm/tool-restrictions

```json
{
  "toolId": "TOOL-B",
  "incidentId": "TS-0002",
  "action": "RESTRICT",
  "reason": "Review torque report",
  "approvalId": "APR-0001"
}
```

### POST /api/ai/structure-report

```json
{
  "toolId": "TOOL-B",
  "language": "kn",
  "rawText": "ಟೂಲ್ B ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿದೆ"
}
```

### POST /api/incidents/:id/proposals

```json
{
  "type": "TOOL_RESTRICTION",
  "reason": "Review torque report"
}
```

### POST /api/approvals/:id/decision

```json
{
  "decision": "APPROVED",
  "reason": "Containment approved"
}
```

### POST /api/incidents/:id/verify-return

```json
{
  "repairId": "REP-0001"
}
```

### POST /api/incidents/:id/repairs

```json
{
  "description": "Replaced the worn synthetic fixture and recorded the adjustment"
}
```

### POST /api/repairs/:id/complete

```json
{
  "testReadings": [
    {
      "name": "Fixture torque check",
      "passed": true
    },
    {
      "name": "Alignment check",
      "passed": true
    }
  ]
}
```

### POST /api/incidents/:id/close

```json
{
  "reason": "Verified resolution",
  "insufficientEvidence": false
}
```

Duplicate evaluation at GET /api/incidents/:id/duplicates returns potential same-tool/category matches for human review only. It prefers translatedText, falls back to rawText, and uses reportedAt with an inclusive 30-day window and similarity threshold 0.8. It never merges or changes state.

Repeat-failure evaluation at GET /api/incidents/:id/repeat-failures accepts optional positive windowDays (default 30) and integer minimumReports (default 2). It uses reportedAt as the inclusive window reference, returns reportedAtSource, and excludes the current incident ID. Count and matching IDs refer to unique prior Incident records; potentialDuplicateIncidentIds are surfaced separately but remain in the count. A threshold result does not establish distinct real-world failures. Missing category or invalid stored event time returns a valid:false evaluation.

Containment proposal generation at POST /api/incidents/:id/proposals accepts only {type, reason} and authenticated Worker or Manager identity. The incident must be Confirmed. TOOL_RESTRICTION and MAINTENANCE_NOTIFICATION require at least two prior same-tool/category Incident records in the inclusive 30-day reportedAt window; TOOL_RESTRICTION additionally requires tool state Active. QUALITY_NOTIFICATION requires a suggested NC code plus persisted CONFIRMED trace links from the latest 168-hour trace to existing batches. STOCK_BLOCK additionally requires those traced batches to have positive UNRESTRICTED STORE-01 inventory, no stale/conflicting location flag, and no Shipment record. No matching evidence returns 409 INSUFFICIENT_EVIDENCE; absent trace or batch evidence is reported as exposure Unknown. Success creates or reuses one Pending Proposal and does not create an Approval, change state, or execute any action. Retry reuses an existing Pending/Approved proposal of the same type for the incident; identical prior proposals are also reused. Maintenance priority `2` and synthetic PLANT-01/STORE-01 are provisional platform demo values.

Approval decisions at POST /api/approvals/:id/decision use the path `id` as proposalId, accept only {decision: APPROVED|REJECTED, reason}, and derive decidedBy/approverRole from authenticated identity and rulesAdapter.requiredApproverRole(type). Both decisions require an auditable reason; a rejection reason is mandatory. Only Pending proposals with supported action-scope payloads can be decided. The route atomically changes Proposal.state to Approved/Rejected, creates one Approval row and writes append-only application audit history. Retries and conflicting later decisions return 409 without new Approval rows. Success returns approvalId; approval alone does not execute a mock action. Rejected proposals are denied by the downstream approval check.

Repair logging starts at POST /api/incidents/:id/repairs for a Confirmed incident and a Restricted or Under repair tool. The Technician identity and loggedAt are server-derived; the request accepts only a non-empty description. A Restricted tool moves through the existing state machine to Under repair. The new RepairLog starts with passed:false and no readings. POST /api/repairs/:id/complete accepts only 1–100 named readings with explicit boolean passed values, and only the recording Technician may submit them. Failed readings are persisted and leave the tool Under repair; all-passing readings mark the log passed and transition Under repair to Awaiting verification. The tool does not become Active in either operation. All row, state, history and application-audit writes share a CAP transaction.

Return-to-service at POST /api/incidents/:id/verify-return uses `id` as incidentId and accepts only {repairId}; it loads the RepairLog and readings from persistence and derives verifier identity from authenticated Verifier middleware. The tool must be Awaiting verification and the repair log must be unverified, linked to that incident/tool, have non-empty description/loggedBy, valid loggedAt, passed:true, and non-empty named readings each explicitly marked passed:true. The verifier must differ from RepairLog.loggedBy (case-insensitive trimmed identity comparison). RepairLog verification metadata, tool state, history and application audit are committed in one transaction; repeat requests fail without a second transition. Test-reading values are synthetic. Explicit passing readings do not prove that all domain-required measurements were captured; the model contains no required-reading catalogue or tolerances.

The console exposes the existing tool restriction, stock block, quality notification and maintenance notification action routes after persisted approval. Each request uses the approved proposal scope and Approval ID; the backend independently checks authenticated role, proposal state, type and scope. Successful action responses carry SIMULATED. Notification results are local records, not external deliveries. The mock-documents response exposes the matching persisted approvalId for UI correlation; it does not treat approval alone as evidence of execution. Tool History evaluates duplicates and repeat failures only for an explicitly selected Incident or Repair event; switching tools clears that selection. Empty results and request errors are shown explicitly.

Incident reportedAt is the client-reported event time in UTC; the route rejects malformed and future event times, while createdAt records server receipt time. An omitted reportedAt is assigned the server receipt time. Incident confirmation stores a business confirmer reference separately from authenticated audit actor identity. Successful trace generation assigns one traceId shared by its response, trace record, application audit event and tool history entry; a new request or window creates a separate trace version. Audit timestamps remain operation time.

There is no incident closure API in this backend. Return-to-service verification sets the tool Active; it does not close the incident. Do not present incident closure or a completed reconciliation lifecycle as implemented until its policy and API contract are defined.
