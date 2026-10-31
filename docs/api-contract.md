# ToolSathi API contract ? Phase 0

Base URL: `http://localhost:4004/api`. All services are SIMULATED; no SAP tenant is connected. JSON timestamps are UTC. These fixed fixtures execute no actions and require no auth. Health checks the live CAP SQLite database.

Error: `{ "error": { "code": "NOT_FOUND", "message": "Endpoint not found", "details": {} } }`.

| Method | Path | Owner | Phase 0 | Example |
|---|---|---|---|---|
| GET | /api/health | platform | Live | [JSON](examples/health.json) |
| POST | /api/incidents | platform | Stub | [JSON](examples/incident-create.json) |
| POST | /api/incidents/:id/confirm | platform | Stub | [JSON](examples/incident-confirm.json) |
| GET | /api/incidents/:id | platform | Stub | [JSON](examples/incident-get.json) |
| GET | /api/tools | platform | Stub | [JSON](examples/tools.json) |
| GET | /api/tools/:id/history | platform | Stub | [JSON](examples/tool-history.json) |
| GET | /api/incidents/:id/trace | platform | Stub | [JSON](examples/trace.json) |
| GET | /api/audit | platform | Stub | [JSON](examples/audit.json) |
| POST | /api/mock/s4/maintenance-notifications | platform | Stub | [JSON](examples/maintenance.json) |
| POST | /api/mock/s4/quality-notifications | platform | Stub | [JSON](examples/quality.json) |
| POST | /api/mock/s4/stock-blocks | platform | Stub | [JSON](examples/stock-block.json) |
| POST | /api/mock/dm/tool-restrictions | platform | Stub | [JSON](examples/restriction.json) |
| GET | /api/mock/documents | platform | Stub | [JSON](examples/documents.json) |
| POST | /api/ai/structure-report | Shashank | Stub | [JSON](examples/ai-structure.json) |
| GET | /api/incidents/:id/duplicates | Jamuna | Stub | [JSON](examples/duplicates.json) |
| POST | /api/incidents/:id/proposals | Jamuna | Stub | [JSON](examples/proposals.json) |
| POST | /api/approvals/:id/decision | Jamuna | Stub | [JSON](examples/approval-decision.json) |
| POST | /api/incidents/:id/verify-return | Jamuna | Stub | [JSON](examples/verify-return.json) |

All Phase 0 successes return 200. Future incident creation returns 201. Stubs use the fixed TS-0002 / TOOL-B example regardless of input. Trace fixture illustrates 24h only. Real trace will accept 24/72/168 and trailing h; invalid windows return 400 INVALID_WINDOW.

Future auth: Worker/Manager create and confirm; authenticated roles read incidents/tools/history/documents; Manager/Quality/Verifier trace and audit; mock writes require Manager/Quality plus matching approved record. Stubs and health remain public.

Tools return `{ tools: [...] }` with simulation metadata. Teammate endpoint fixtures are provisional until reviewed by their owners. Application audit history is implemented in Phase 2. No update/delete audit endpoints are planned.

## Requests

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
  "rawText": "?????? ??????????"
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

## Target behavior after stubs are replaced

## 4. API contract (frozen at end of Day 1)

Base path `/api`. JSON in and out. Timestamps are ISO 8601 UTC strings ending in `Z`. Error shape everywhere:

```
{ "error": { "code": "TOOL_NOT_FOUND", "message": "human readable", "details": {} } }
```

| Endpoint | Owner | Notes |
|---|---|---|
| GET /api/health | you | `{status, db, mode:"SIMULATED", seedVersion}` |
| POST /api/incidents | you | create incident |
| POST /api/incidents/:id/confirm | you | worker confirms or corrects |
| GET /api/incidents/:id | you | incident, evidence, audit summary, trace summaries |
| GET /api/tools | you | register |
| GET /api/tools/:id/history | you | per-tool timeline |
| GET /api/incidents/:id/trace?window=24\|72\|168 | you | deterministic trace |
| GET /api/audit?incident=:id | you | ordered history |
| POST /api/mock/s4/maintenance-notifications | you | simulated |
| POST /api/mock/s4/quality-notifications | you | simulated |
| POST /api/mock/s4/stock-blocks | you | simulated |
| POST /api/mock/dm/tool-restrictions | you | simulated |
| GET /api/mock/documents?incident=:id | you | additive: lists simulated documents for the console |
| POST /api/ai/structure-report | Shashank | **stub only** |
| GET /api/incidents/:id/duplicates | Jamuna | **stub only** |
| POST /api/incidents/:id/proposals | Jamuna | **stub only** |
| POST /api/approvals/:id/decision | Jamuna | **stub only** |
| POST /api/incidents/:id/verify-return | Jamuna | **stub only** |

Also accept `window=72h` style values (strip a trailing `h`). Reject anything other than 24, 72, 168 with 400 `INVALID_WINDOW`.

### POST /api/incidents

Request:

```
{ "toolId": "TOOL-B", "reporterId": "WRK-014", "language": "kn",
  "rawText": "<original text, preserved exactly>",
  "translatedText": "Tool B is leaving bolts loose",
  "category": "TORQUE", "suggestedNcCode": "NC-TORQUE-LOOSE",
  "confidence": 0.82, "missingFields": [], "photoRef": null,
  "reportedAt": "2026-11-04T05:12:00Z", "modelVersion": "stub-0" }
```

Required: `toolId`, `reporterId`, `language` (one of `kn`, `hi`, `en`), `rawText`. Unknown tool: 404 `TOOL_NOT_FOUND`. If `reportedAt` is missing, use server receive time, set `reportedAtSource: "SERVER_RECEIVED"` and add a warning; never invent identity. Create `incidentId` as `TS-0001`, `TS-0002`, ... using an atomic counter. State starts `Reported`. Write audit `INCIDENT_CREATED` and a tool history event. Response 201: `{ incident, warnings, auditId }`. Store `photoRef` as an IncidentEvidence row (type `photo`).

### POST /api/incidents/:id/confirm

Body: `{ "confirmedBy": "WRK-014", "corrections": { "translatedText"?, "category"?, "suggestedNcCode"?, "toolId"? } }`. Allowed only from state `Reported` (else 409 `INVALID_STATE`; use `rules-adapter`). Apply corrections, validate a changed `toolId`, store before/after values in the audit details, set state `Confirmed`, set `confirmedAt` and `confirmedBy`.

### GET /api/incidents/:id

`{ incident, evidence: [...], auditSummary: { count, last: [last 5] }, traceResults: [ { windowHours, version, totalUnits, byTier, dataQualityScore, snapshotTime } ] }`. 404 `INCIDENT_NOT_FOUND`.

### GET /api/tools and GET /api/tools/:id/history

Tools: array of `{ toolId, type, line, workCenter, state, calibrationDue, usageCount, lastVerifiedGood }`. Do not compute warnings (Jamuna owns calibration and duplicate rules); just return raw fields.

History: `{ toolId, events: [ { eventId, type, at, summary, refId, details } ], counts }`, newest first. Event types: `INCIDENT`, `TRACE`, `RESTRICTION`, `REPAIR`, `CALIBRATION`, `APPROVAL`. Backed by a `ToolHistoryEvent` table written through `history.append()`. Seed it for Tool B (section 6).

### GET /api/incidents/:id/trace?window=72

See section 7 for the algorithm and response. Generate on every call, store a versioned `TraceResult` row, write audit `TRACE_GENERATED` and a history event.

### GET /api/audit?incident=:id

`{ incidentId, entries: [...] }` ordered by timestamp then auditId ascending. Missing parameter: 400. Unknown incident: 404. No update or delete routes exist anywhere. Add a database trigger on SQLite (and a note for HANA) that rejects UPDATE and DELETE on `AuditLog`.
