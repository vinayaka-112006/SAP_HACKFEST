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
]);
const arbitrary = new Set([
  "details",
  "payload",
  "before",
  "after",
  "testReadings",
]);
function schema(value, key = "") {
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
    description:
      "13 implemented operations including 4 persisted SAP simulations; 5 teammate stubs. No real SAP connection. Provisional ground truth.",
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
};
for (const e of rows) {
  const stub = e.owner !== "platform",
    example = require("../docs/examples/" + e.example),
    route = e.path.replace(":id", "{id}");
  const op = {
    operationId: e.name,
    tags: [e.owner],
    "x-owner": e.owner,
    "x-implementation": stub
      ? "stub"
      : e.path.startsWith("/mock/")
        ? "simulated"
        : "real",
    description: stub
      ? "Fixed _stub:true fixture; does not persist or execute workflow. Shape awaits owner review."
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
    content: { "application/json": { schema: schema(example), example } },
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
  if (!stub && e.name !== "health")
    op.security = [{ demoIdentity: [], demoRole: [] }, { bearerAuth: [] }];
  if (e.request) {
    const s = schema(e.request);
    if (required[e.name]) s.required = required[e.name];
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
  "# ToolSathi API contract\n\nBase URL `http://localhost:4004/api`. Synthetic data, simulated SAP services; no tenant connected. JSON UTC timestamps end in Z. Tools use `{ tools: [...] }`. Real responses carry `_label:SIMULATED`, `_stub:false`; fixed teammate fixtures carry `_stub:true`. Examples are recorded synthetic responses.\n\n| Method | Path | Owner | Implementation | Example |\n|---|---|---|---|---|\n";
for (const e of rows)
  text += `| ${e.method} | /api${e.path} | ${e.owner} | ${e.owner === "Jamuna" ? "Stub" : e.path.startsWith("/mock/") ? "Real local simulation" : "Real backend"} | [JSON](examples/${e.example}) |\n`;
text += '\nAI transcription: POST /api/ai/transcribe?language=kn|hi|en, raw audio up to 2 MiB. Both AI operations require Worker/Manager. See srv/ai-adapter/README.md for the current live contract and provider limitations; ai-structure.json is a historical stub fixture, not a live success example.\n';
text += '\nRead-only evidence retrieval: POST /api/ai/search and GET /api/incidents/:id/similar accept authenticated application roles. Local embeddings plus keyword search; no Sarvam calls or duplicate decisions. Source citations and limitations: srv/ai-adapter/README.md.\n';
text += '\nMultilingual communication: POST /api/ai/readback (Worker/Manager; explicit review, Sarvam audio); GET /api/incidents/:id/status-text (authenticated roles); GET /api/incidents/:id/trace-explanation (Manager/Quality/Verifier; stored snapshot only); POST /api/incidents/:id/dealer-draft (Quality; approved Quality notification and shipped batch scope, 201). Drafts are stored and audited, never sent. Fixed English/Hindi/Kannada templates do not spend AI credits. See srv/ai-adapter/README.md and OpenAPI.\n';
text +=
  '\nErrors: `{ "error": { "code": "...", "message": "...", "details": {} } }`. 400 INVALID_INPUT/INVALID_JSON/INVALID_WINDOW; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 TOOL_NOT_FOUND/INCIDENT_NOT_FOUND/BATCH_NOT_FOUND/NOT_FOUND; 409 INVALID_STATE/APPROVAL_REQUIRED. Internal 500/503 errors hide details. Payload limit 1 MB.\n\nIncident create returns 201; other successes 200. Required toolId/reporterId/language(kn,hi,en)/rawText; original text is preserved exactly. Optional translatedText/category/suggestedNcCode/confidence(0..1)/missingFields(string array)/photoRef/reportedAt/modelVersion. Missing reportedAt uses SERVER_RECEIVED with warning; photoRef becomes evidence. Confirm requires confirmedBy, permits only translatedText/category/suggestedNcCode/toolId corrections and only Reported state. Before/after audit and both tool histories capture reassignment. No trace is invented when none has been generated.\n\nTrace accepts 24/72/168 and trailing h, default 24. Bounds use incident.reportedAt. Missing-end links use the documented linked-run scope assumption, retaining uncertainty. Deduplicated units preserve source IDs and sort by serial. Unknown and stale location status remain explicit. Exposure range always evaluates all three windows. Every successful request persists a new version/audit/history. Quality score: 100 minus 40*unknown/total, 20*probable/total, 5*stale shipment records and 10*conflict runs; floor zero, round half up. Empty scope scores 100. Value is ESTIMATE_SYNTHETIC.\n\nAudit requires incident; orders timestamp/auditId ascending. Incident detail returns last five newest audit entries and trace summaries. Tool history sorts at/eventId descending. No audit update/delete routes; SQLite database triggers enforce append-only rows. HANA audit privileges/trigger remain unverified.\n\nMock POST requires authenticated Manager/Quality plus APPROVED persisted record with correct role, incident, proposal type and payload scope. Notification retries return the existing document plus replay audit/history. Stock skips shipped batches; repeats return alreadyBlocked. Repeated restriction returns invalid transition. Documents require incident; limit defaults 50/max100; offset 0..10000; sort createdAt/docId ascending. See mock-mapping.md and team-integration.md.\n\nLocal header identity is demo-only; production uses verified XSUAA. Worker/Manager create and confirm; authenticated roles read incidents/tools/history/documents; Manager/Quality/Verifier trace/audit; Manager/Quality mock POST. Health and teammate stubs are public. x-system-call has no authority.\n\n## Request examples\n\n';
for (const e of rows.filter((e) => e.request))
  text +=
    `### ${e.method} /api${e.path}\n\n` +
    "```json\n" +
    JSON.stringify(e.request, null, 2) +
    "\n```\n\n";
fs.writeFileSync("docs/api-contract.md", text.trimEnd() + "\n");
console.log("Updated contract and OpenAPI from public synthetic examples.");
