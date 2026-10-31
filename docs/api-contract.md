# ToolSathi API contract

Base URL `http://localhost:4004/api`. Synthetic data, simulated SAP services; no tenant connected. JSON UTC timestamps end in Z. Tools use `{ tools: [...] }`. Real responses carry `_label:SIMULATED`, `_stub:false`; fixed teammate fixtures carry `_stub:true`. Examples are recorded synthetic responses.

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
| GET | /api/incidents/:id/duplicates | Jamuna | Stub | [JSON](examples/duplicates.json) |
| POST | /api/incidents/:id/proposals | Jamuna | Stub | [JSON](examples/proposals.json) |
| POST | /api/approvals/:id/decision | Jamuna | Stub | [JSON](examples/approval-decision.json) |
| POST | /api/incidents/:id/verify-return | Jamuna | Stub | [JSON](examples/verify-return.json) |

Errors: `{ "error": { "code": "...", "message": "...", "details": {} } }`. 400 INVALID_INPUT/INVALID_JSON/INVALID_WINDOW; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 TOOL_NOT_FOUND/INCIDENT_NOT_FOUND/BATCH_NOT_FOUND/NOT_FOUND; 409 INVALID_STATE/APPROVAL_REQUIRED. Internal 500/503 errors hide details. Payload limit 1 MB.

Incident create returns 201; other successes 200. Required toolId/reporterId/language(kn,hi,en)/rawText; original text is preserved exactly. Optional translatedText/category/suggestedNcCode/confidence(0..1)/missingFields(string array)/photoRef/reportedAt/modelVersion. Missing reportedAt uses SERVER_RECEIVED with warning; photoRef becomes evidence. Confirm requires confirmedBy, permits only translatedText/category/suggestedNcCode/toolId corrections and only Reported state. Before/after audit and both tool histories capture reassignment. No trace is invented when none has been generated.

Trace accepts 24/72/168 and trailing h, default 24. Bounds use incident.reportedAt. Missing-end links use the documented linked-run scope assumption, retaining uncertainty. Deduplicated units preserve source IDs and sort by serial. Unknown and stale location status remain explicit. Exposure range always evaluates all three windows. Every successful request persists a new version/audit/history. Quality score: 100 minus 40*unknown/total, 20*probable/total, 5*stale shipment records and 10*conflict runs; floor zero, round half up. Empty scope scores 100. Value is ESTIMATE_SYNTHETIC.

Audit requires incident; orders timestamp/auditId ascending. Incident detail returns last five newest audit entries and trace summaries. Tool history sorts at/eventId descending. No audit update/delete routes; SQLite database triggers enforce append-only rows. HANA audit privileges/trigger remain unverified.

Mock POST requires authenticated Manager/Quality plus APPROVED persisted record with correct role, incident, proposal type and payload scope. Notification retries return the existing document plus replay audit/history. Stock skips shipped batches; repeats return alreadyBlocked. Repeated restriction returns invalid transition. Documents require incident; limit defaults 50/max100; offset 0..10000; sort createdAt/docId ascending. See mock-mapping.md and team-integration.md.

Local header identity is demo-only; production uses verified XSUAA. Worker/Manager create and confirm; authenticated roles read incidents/tools/history/documents; Manager/Quality/Verifier trace/audit; Manager/Quality mock POST. Health and teammate stubs are public. x-system-call has no authority.

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
  "reason": "Containment approved",
  "decidedBy": "MGR-01"
}
```

### POST /api/incidents/:id/verify-return

```json
{
  "verifiedBy": "VER-01",
  "repairId": "REP-0001",
  "passed": true
}
```
