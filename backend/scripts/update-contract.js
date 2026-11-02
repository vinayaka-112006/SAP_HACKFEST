const fs = require("node:fs");
const rows = require("../srv/routes/_stubs/contract.json");
const nullable = new Set([
  "translatedText",
  "category",
  "suggestedNcCode",
  "confidence",
  "confirmedAt",
  "confirmedBy",
  "modelVersion",
  "dealerId",
  "location",
  "refId",
  "toolId",
  "incidentId",
  "reportedAtSource",
]);
const arbitrary = new Set([
  "details",
  "payload",
  "before",
  "after",
]);
function schema(value, key = "") {
  if (key === "minimumReports")
    return { type: "integer", minimum: 1 };
  if (key === "count") return { type: "integer", minimum: 0 };
  if (key === "referenceAt") return { type: "string", nullable: true };
  if (key === "counts")
    return { type: "object", additionalProperties: { type: "integer" } };
  if (arbitrary.has(key)) return { type: "object", additionalProperties: true };
  if (value === null) return { type: "string", nullable: true };
  if (Array.isArray(value))
    return { type: "array", items: value.length ? schema(value[0]) : {} };
  if (typeof value === "object")
    return {
      type: "object",
      ...(Object.keys(value).length ? { required: Object.keys(value) } : {}),
      properties: Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, schema(v, k)]),
      ),
      additionalProperties: true,
    };
  const out = { type: typeof value };
  if (nullable.has(key)) out.nullable = true;
  if (key === "_label") out.enum = ["SIMULATED"];
  if (key === "_stub") out.enum = [value];
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))
    out.format = "date-time";
  return out;
}
const error = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "details"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "object" },
      },
    },
  },
};
const api = {
  openapi: "3.0.3",
  info: {
    title: "ToolSathi simulated platform",
    version: "0.1.0",
    description: `${rows.filter((row) => row.owner === "platform").length} platform operations including 4 persisted simulated actions; ${rows.filter((row) => row.owner !== "platform").length} external stub routes. No live SAP connection is claimed. Provisional ground truth.`,
  },
  servers: [{ url: "http://localhost:4004/api" }],
  components: {
    securitySchemes: {
      demoIdentity: {
        type: "apiKey",
        in: "header",
        name: "x-demo-user",
        description: "Local demo only; disabled in production",
      },
      demoRole: { type: "apiKey", in: "header", name: "x-demo-role" },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Verified using bound XSUAA SDK",
      },
    },
    schemas: { Error: error },
  },
  paths: {},
};
const required = {
  "incident-create": ["toolId", "reporterId", "language", "rawText"],
  "incident-confirm": ["confirmedBy"],
  "ai-structure": ["toolId", "language", "rawText"],
  proposals: ["type", "reason"],
  "approval-decision": ["decision", "reason"],
  "verify-return": ["repairId"],
  "repair-create": ["description"],
  "repair-complete": ["testReadings"],
  "incident-close": ["reason"],
};
for (const e of rows) {
  const stub = e.owner !== "platform",
    example = require("../docs/examples/" + e.example),
    route = e.path.replace(":id", "{id}");
  const responseSchema = schema(example);
  if (e.name === "proposals") {
    responseSchema.properties.auditId.nullable = true;
    responseSchema.properties.approval = {
      type: "object",
      description: "Present when this idempotent request reuses an already Approved proposal.",
      required: ["approvalId", "proposalId", "approverRole", "decision", "decidedBy", "decidedAt"],
      properties: {
        approvalId: { type: "string" },
        proposalId: { type: "string" },
        approverRole: { type: "string" },
        decision: { type: "string", enum: ["APPROVED"] },
        decidedBy: { type: "string" },
        decidedAt: { type: "string", format: "date-time" },
        reason: { type: "string" },
      },
    };
  }
  if (e.name === "documents") {
    responseSchema.properties.documents = {
      type: "array",
      items: {
        type: "object",
        required: ["docId", "system", "type", "incidentId", "payload", "createdAt", "_label", "approvalId"],
        properties: {
          docId: { type: "string" },
          system: { type: "string" },
          type: { type: "string" },
          incidentId: { type: "string" },
          payload: { type: "object", additionalProperties: true },
          createdAt: { type: "string", format: "date-time" },
          _label: { type: "string", enum: ["SIMULATED"] },
          approvalId: { type: "string", nullable: true },
        },
        additionalProperties: true,
      },
    };
  }
  const op = {
    operationId: e.name,
    tags: [e.owner],
    "x-owner": e.owner,
    "x-implementation": stub
      ? "stub"
      : e.name === "duplicates"
        ? "read-only duplicate evaluation"
        : e.name === "repeat-failures"
          ? "read-only repeat-failure evaluation"
      : e.name === "approval-decision"
        ? "persisted approval workflow"
      : e.name === "verify-return"
        ? "repair evidence validation and tool state transition"
      : ["repair-create", "repair-complete"].includes(e.name)
        ? "technician repair lifecycle"
      : e.path.startsWith("/mock/")
        ? "simulated"
        : "real",
    description: stub
      ? "Fixed _stub:true fixture; does not persist or execute workflow. Shape awaits owner review."
      : e.name === "duplicates"
        ? "Authenticated deterministic candidate detection over same-tool/category incidents. Uses translatedText or rawText fallback and reportedAt with an inclusive 30-day window. Similarity is a human-review signal, not proof of identity. No state filtering or mutation."
        : e.name === "repeat-failures"
          ? "Authenticated read-only count of unique prior same-tool/category Incident records. Uses reportedAt, excludes the current incident, includes both time-window boundaries, and does not filter states. Potential duplicate IDs are surfaced separately but not excluded. Threshold reports records only; it does not establish distinct real-world occurrences."
      : e.name === "proposals"
        ? "Authenticated advisory proposal generation for Confirmed incidents. Requires explicit incident evidence; stock and quality batch scope comes only from persisted CONFIRMED trace links in the latest 168-hour trace and existing batch records, and stock proposals additionally require current unrestricted STORE-01 inventory with no shipment record. Persists Pending Proposal and application audit history idempotently. Does not create Approval records, change incident/tool state, or execute actions. Reusing an Approved proposal includes its persisted Approval record for client handoff."
      : e.name === "approval-decision"
        ? "Authenticated decision for a Pending proposal. The path id is proposalId. Uses the current requiredApproverRole policy, requires an auditable reason, derives reviewer identity from authentication, and atomically updates Proposal plus creates Approval plus writes application audit history. A decision is one-way; repeated/conflicting decisions are rejected. Approval creates no action side effect."
      : e.name === "verify-return"
        ? "Authenticated Verifier-only return-to-service workflow. The path id is incidentId; request supplies only a persisted repairId. Requires an unverified matching RepairLog with description, technician, timestamp, aggregate pass and non-empty named readings each explicitly marked passed:true. Verifier must differ from loggedBy. Uses Awaiting verification to Active through the tool-state workflow and commits repair verification, state, history and audit together. No approval can substitute for physical repair evidence."
      : e.name === "repair-create"
        ? "Technician-only repair start for a Confirmed incident and a Restricted or Under repair tool. Identity and time are taken from authenticated request context and server time. Persists an uncompleted RepairLog and transitions Restricted to Under repair when needed. Does not activate the tool."
      : e.name === "repair-complete"
        ? "Only the Technician who recorded the repair may submit explicit named boolean readings. The RepairLog retains the latest submission, while every submission's full readings, authenticated actor, timestamp and aggregate outcome are appended to application audit history and tool history in the same transaction. Failed readings leave the tool Under repair; all-passing readings mark the RepairLog passed and move the tool to Awaiting verification. This does not return the tool to Active, and named booleans do not prove domain-required inspection coverage or tolerances."
      : e.name === "trace"
        ? "Deterministic association with run-bounded missing-end assumption, explicit uncertainty and all-window exposure range."
        : e.path.startsWith("/mock/")
          ? "Persisted local SIMULATED behavior. Matching approval role, incident, action and scope required for POST."
          : "CAP persistence with application audit history.",
    responses: {},
    parameters: [],
  };
  op.responses[e.name === "incident-create" ? "201" : "200"] = {
    description: stub
      ? "Fixed fixture"
      : "Implemented response on synthetic data",
    content: { "application/json": { schema: responseSchema, example } },
  };
  for (const code of ["400", "401", "403", "404", "409", "500", "503"])
    op.responses[code] = {
      description: {
        400: "Validation error",
        401: "Identity missing or unverified",
        403: "Role forbidden",
        404: "Record not found",
        409: "Invalid state or approval required",
        500: "Internal error; details withheld",
        503: "Unavailable configuration or database",
      }[code],
      content: {
        "application/json": { schema: { $ref: "#/components/schemas/Error" } },
      },
    };
  if (route.includes("{id}"))
    op.parameters.push({
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      ...(e.name === "approval-decision"
        ? { description: "The proposalId of the Pending proposal to decide" }
        : e.name === "verify-return"
          ? { description: "The incidentId associated with the persisted repair log and tool" }
        : {}),
    });
  if (e.name === "trace")
    op.parameters.push({
      name: "window",
      in: "query",
      schema: {
        type: "string",
        default: "24",
        enum: ["24", "72", "168", "24h", "72h", "168h"],
      },
    });
  if (["audit", "documents"].includes(e.name))
    op.parameters.push({
      name: "incident",
      in: "query",
      required: true,
      schema: { type: "string" },
    });
  if (e.name === "documents")
    op.parameters.push(
      {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
      },
      {
        name: "offset",
        in: "query",
        schema: { type: "integer", minimum: 0, maximum: 10000, default: 0 },
      },
    );
  if (e.name === "repeat-failures")
    op.parameters.push(
      {
        name: "windowDays",
        in: "query",
        required: false,
        schema: {
          type: "number",
          minimum: 0,
          default: 30,
          description: "Must be greater than zero",
        },
      },
      {
        name: "minimumReports",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, default: 2 },
      },
    );
  if (!stub && e.name !== "health")
    op.security = [{ demoIdentity: [], demoRole: [] }, { bearerAuth: [] }];
  if (e.request) {
    const s = schema(e.request);
    if (required[e.name]) s.required = required[e.name];
    if (e.name === "proposals") {
      s.additionalProperties = false;
      s.properties.type.enum = [
        "TOOL_RESTRICTION",
        "STOCK_BLOCK",
        "QUALITY_NOTIFICATION",
        "MAINTENANCE_NOTIFICATION",
      ];
      s.properties.reason.minLength = 1;
      s.properties.reason.maxLength = 1000;
      s.properties.reason.description = "Must contain non-whitespace text";
    }
    if (e.name === "approval-decision") {
      s.additionalProperties = false;
      s.properties.decision.enum = ["APPROVED", "REJECTED"];
      s.properties.reason.minLength = 1;
      s.properties.reason.maxLength = 1000;
      s.properties.reason.description =
        "Required for audit; mandatory as the rejection explanation";
    }
    if (e.name === "verify-return") {
      s.additionalProperties = false;
      s.properties.repairId.minLength = 1;
      s.properties.repairId.maxLength = 120;
      s.properties.repairId.description =
        "Persisted repair log for this incident/tool; verifier identity and readings are loaded from trusted records";
    }
    if (e.name === "repair-create") {
      s.additionalProperties = false;
      s.properties.description.minLength = 1;
      s.properties.description.maxLength = 4000;
    }
    if (e.name === "repair-complete") {
      s.additionalProperties = false;
      s.properties.testReadings.minItems = 1;
      s.properties.testReadings.maxItems = 100;
      s.properties.testReadings.items.additionalProperties = false;
      s.properties.testReadings.items.required = ["name", "passed"];
      s.properties.testReadings.items.properties.name.minLength = 1;
      s.properties.testReadings.items.properties.name.maxLength = 120;
      s.properties.testReadings.items.properties.passed.type = "boolean";
    }
    op.requestBody = {
      required: true,
      content: { "application/json": { schema: s, example: e.request } },
    };
  }
  api.paths[route] ||= {};
  api.paths[route][e.method.toLowerCase()] = op;
}
require('../srv/ai-adapter/openapi').applyAiSpec(api);
fs.writeFileSync("docs/openapi.yaml", JSON.stringify(api, null, 2) + "\n");
let text =
  "# ToolSathi API contract\n\nBase URL `http://localhost:4004/api`. Synthetic data and simulated services; no live SAP tenant action is claimed. JSON UTC timestamps end in Z. Tools use `{ tools: [...] }`. Implemented responses carry `_label:SIMULATED`, `_stub:false`; fixed non-platform fixtures carry `_stub:true`. The AI structure-report fixture is the single remaining external stub. Examples are recorded synthetic responses.\n\n| Method | Path | Owner | Implementation | Example |\n|---|---|---|---|---|\n";
for (const e of rows)
  text += `| ${e.method} | /api${e.path} | ${e.owner} | ${e.owner !== "platform" ? "Stub" : e.name === "duplicates" ? "Real read-only duplicate evaluation" : e.name === "repeat-failures" ? "Real read-only repeat-failure evaluation" : e.path.startsWith("/mock/") ? "Real local simulation" : "Real backend"} | [JSON](examples/${e.example}) |\n`;
text += '\nAI transcription: POST /api/ai/transcribe?language=kn|hi|en, raw audio up to 2 MiB. Both AI operations require Worker/Manager. See srv/ai-adapter/README.md for the current live contract and provider limitations; ai-structure.json is a historical stub fixture, not a live success example.\n';
text += '\nRead-only evidence retrieval: POST /api/ai/search and GET /api/incidents/:id/similar accept authenticated application roles. Local embeddings plus keyword search; no Sarvam calls or duplicate decisions. Source citations and limitations: srv/ai-adapter/README.md.\n';
text += '\nMultilingual communication: POST /api/ai/readback (Worker/Manager; explicit review, Sarvam audio); GET /api/incidents/:id/status-text (authenticated roles); GET /api/incidents/:id/trace-explanation (Manager/Quality/Verifier; stored snapshot only); POST /api/incidents/:id/dealer-draft (Quality; approved Quality notification and shipped batch scope, 201). Drafts are stored and audited, never sent. Fixed English/Hindi/Kannada templates do not spend AI credits. See srv/ai-adapter/README.md and OpenAPI.\n';
text +=
  '\nErrors: `{ "error": { "code": "...", "message": "...", "details": {} } }`. 400 INVALID_INPUT/INVALID_JSON/INVALID_WINDOW; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 TOOL_NOT_FOUND/INCIDENT_NOT_FOUND/REPAIR_LOG_NOT_FOUND/BATCH_NOT_FOUND/NOT_FOUND; 409 INVALID_STATE/INVALID_REPAIR_EVIDENCE/APPROVAL_REQUIRED. Internal 500/503 errors hide details. Payload limit 1 MB.\n\nIncident create returns 201; other successes 200. Required toolId/reporterId/language(kn,hi,en)/rawText; original text is preserved exactly. Optional translatedText/category/suggestedNcCode/confidence(0..1)/missingFields(string array)/photoRef/reportedAt/modelVersion. Missing reportedAt uses SERVER_RECEIVED with warning; photoRef becomes evidence. Confirm requires confirmedBy, permits only translatedText/category/suggestedNcCode/toolId corrections and only Reported state. Before/after audit and both tool histories capture reassignment. No trace is invented when none has been generated.\n\nTrace accepts 24/72/168 and trailing h, default 24. Bounds use incident.reportedAt. Missing-end links use the documented linked-run scope assumption, retaining uncertainty. Deduplicated units preserve source IDs and sort by serial. Unknown and stale location status remain explicit. Exposure range always evaluates all three windows. Every successful request persists a new version/audit/history. Quality score: 100 minus 40*unknown/total, 20*probable/total, 5*stale shipment records and 10*conflict runs; floor zero, round half up. Empty scope scores 100. Value is ESTIMATE_SYNTHETIC.\n\nAudit requires incident; orders timestamp/auditId ascending. Incident detail returns last five newest audit entries and trace summaries. Tool history sorts at/eventId descending. No audit update/delete routes; SQLite database triggers enforce append-only rows. HANA audit privileges/trigger remain unverified.\n\nMock POST requires authenticated Manager/Quality plus APPROVED persisted record with correct role, incident, proposal type and payload scope. Notification retries return the existing document plus replay audit/history. Stock skips shipped batches; repeats return alreadyBlocked. Repeated restriction returns invalid transition. Documents require incident; limit defaults 50/max100; offset 0..10000; sort createdAt/docId ascending. See mock-mapping.md and team-integration.md.\n\nLocal header identity is demo-only; production is configured for XSUAA, but a live binding/token remains unverified. Worker/Manager create and confirm; authenticated roles read incidents/tools/history/documents; Manager/Quality/Verifier trace/audit; Manager/Quality mock POST. Health and the AI structure-report stub are public. x-system-call has no authority.\n\n## Request examples\n\n';
for (const e of rows.filter((e) => e.request))
  text +=
    `### ${e.method} /api${e.path}\n\n` +
    "```json\n" +
    JSON.stringify(e.request, null, 2) +
    "\n```\n\n";
text = text
  .replace(
    "Rejected proposals are denied by the downstream approval check.",
    "Rejected proposals are denied by the downstream approval check. Idempotent proposal creation retries return the persisted Approval when reusing an Approved proposal.",
  )
  .replace(
    "Failed readings are persisted and leave the tool Under repair;",
    "RepairLog retains the latest submission for verification. Every completion submission, including failed readings later followed by a pass, is also appended with full readings, authenticated actor, submission timestamp and outcome to application audit history and tool history in the same transaction. Failed readings leave the tool Under repair;",
  );
text += "Duplicate evaluation at GET /api/incidents/:id/duplicates returns potential same-tool/category matches for human review only. It prefers translatedText, falls back to rawText, and uses reportedAt with an inclusive 30-day window and similarity threshold 0.8. It never merges or changes state.\n\n";
text += "Repeat-failure evaluation at GET /api/incidents/:id/repeat-failures accepts optional positive windowDays (default 30) and integer minimumReports (default 2). It uses reportedAt as the inclusive window reference, returns reportedAtSource, and excludes the current incident ID. Count and matching IDs refer to unique prior Incident records; potentialDuplicateIncidentIds are surfaced separately but remain in the count. A threshold result does not establish distinct real-world failures. Missing category or invalid stored event time returns a valid:false evaluation.\n\n";
text += "Containment proposal generation at POST /api/incidents/:id/proposals accepts only {type, reason} and authenticated Worker or Manager identity. The incident must be Confirmed. TOOL_RESTRICTION and MAINTENANCE_NOTIFICATION require at least two prior same-tool/category Incident records in the inclusive 30-day reportedAt window; TOOL_RESTRICTION additionally requires tool state Active. QUALITY_NOTIFICATION requires a suggested NC code plus persisted CONFIRMED trace links from the latest 168-hour trace to existing batches. STOCK_BLOCK additionally requires those traced batches to have positive UNRESTRICTED STORE-01 inventory, no stale/conflicting location flag, and no Shipment record. No matching evidence returns 409 INSUFFICIENT_EVIDENCE; absent trace or batch evidence is reported as exposure Unknown. Success creates or reuses one Pending Proposal and does not create an Approval, change state, or execute any action. Retry reuses an existing Pending/Approved proposal of the same type for the incident; identical prior proposals are also reused. Maintenance priority `2` and synthetic PLANT-01/STORE-01 are provisional platform demo values.\n\n";
text += "Approval decisions at POST /api/approvals/:id/decision use the path `id` as proposalId, accept only {decision: APPROVED|REJECTED, reason}, and derive decidedBy/approverRole from authenticated identity and rulesAdapter.requiredApproverRole(type). Both decisions require an auditable reason; a rejection reason is mandatory. Only Pending proposals with supported action-scope payloads can be decided. The route atomically changes Proposal.state to Approved/Rejected, creates one Approval row and writes append-only application audit history. Retries and conflicting later decisions return 409 without new Approval rows. Success returns approvalId; approval alone does not execute a mock action. Rejected proposals are denied by the downstream approval check.\n\n";
text += "Repair logging starts at POST /api/incidents/:id/repairs for a Confirmed incident and a Restricted or Under repair tool. The Technician identity and loggedAt are server-derived; the request accepts only a non-empty description. A Restricted tool moves through the existing state machine to Under repair. The new RepairLog starts with passed:false and no readings. POST /api/repairs/:id/complete accepts only 1–100 named readings with explicit boolean passed values, and only the recording Technician may submit them. Failed readings are persisted and leave the tool Under repair; all-passing readings mark the log passed and transition Under repair to Awaiting verification. The tool does not become Active in either operation. All row, state, history and application-audit writes share a CAP transaction.\n\n";
text += "Return-to-service at POST /api/incidents/:id/verify-return uses `id` as incidentId and accepts only {repairId}; it loads the RepairLog and readings from persistence and derives verifier identity from authenticated Verifier middleware. The tool must be Awaiting verification and the repair log must be unverified, linked to that incident/tool, have non-empty description/loggedBy, valid loggedAt, passed:true, and non-empty named readings each explicitly marked passed:true. The verifier must differ from RepairLog.loggedBy (case-insensitive trimmed identity comparison). RepairLog verification metadata, tool state, history and application audit are committed in one transaction; repeat requests fail without a second transition. Test-reading values are synthetic. Explicit passing readings do not prove that all domain-required measurements were captured; the model contains no required-reading catalogue or tolerances.\n\n";
text += "The console exposes the existing tool restriction, stock block, quality notification and maintenance notification action routes after persisted approval. Each request uses the approved proposal scope and Approval ID; the backend independently checks authenticated role, proposal state, type and scope. Successful action responses carry SIMULATED. Notification results are local records, not external deliveries. The mock-documents response exposes the matching persisted approvalId for UI correlation; it does not treat approval alone as evidence of execution. Tool History evaluates duplicates and repeat failures only for an explicitly selected Incident or Repair event; switching tools clears that selection. Empty results and request errors are shown explicitly.\n\n";
text += "Incident reportedAt is the client-reported event time in UTC; the route rejects malformed and future event times, while createdAt records server receipt time. An omitted reportedAt is assigned the server receipt time. Incident confirmation stores a business confirmer reference separately from authenticated audit actor identity. Successful trace generation assigns one traceId shared by its response, trace record, application audit event and tool history entry; a new request or window creates a separate trace version. Audit timestamps remain operation time.\n\n";
text += "There is no incident closure API in this backend. Return-to-service verification sets the tool Active; it does not close the incident. Do not present incident closure or a completed reconciliation lifecycle as implemented until its policy and API contract are defined.\n\n";
fs.writeFileSync("docs/api-contract.md", text.trimEnd() + "\n");
console.log("Updated contract and OpenAPI from public synthetic examples.");
