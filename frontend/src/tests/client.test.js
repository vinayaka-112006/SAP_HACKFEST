import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../api/client.js";
import {
  traceView,
  resolveToolCode,
  buildIncidentPayload,
} from "../api/mappings.js";
function setup(value, options = {}) {
  const calls = [];
  const api = createApiClient({
    baseUrl: "http://test/api/",
    fetchImpl: async (url, init) => {
      calls.push({ url, ...init });
      return new Response(JSON.stringify(value), {
        status: options.status || 200,
      });
    },
    ...options,
  });
  return { api, calls };
}
test("live tools envelope and normalized base URL", async () => {
  const { api, calls } = setup({ tools: [{ toolId: "TOOL-B" }] });
  assert.deepEqual(await api.getTools(), [{ toolId: "TOOL-B" }]);
  assert.equal(calls[0].url, "http://test/api/tools");
});
test("demo headers are explicit and supplied only when demo mode is enabled", async () => {
  const { api, calls } = setup(
    { tools: [] },
    {
      demoMode: true,
      getSession: () => ({ userId: "WRK-014", role: "Worker" }),
    },
  );
  await api.getTools();
  assert.equal(calls[0].headers["x-demo-user"], "WRK-014");
  assert.equal(calls[0].headers["x-demo-role"], "Worker");
  const plain = setup(
    { tools: [] },
    { getSession: () => ({ userId: "X", role: "Manager" }) },
  );
  await plain.api.getTools();
  assert.equal(plain.calls[0].headers["x-demo-role"], undefined);
});
test("demo mode refuses missing named identity before making a request", async () => {
  const { api, calls } = setup({}, { demoMode: true });
  await assert.rejects(api.getTools(), { code: "DEMO_IDENTITY_REQUIRED" });
  assert.equal(calls.length, 0);
});
test("incident request preserves original input and omits absent AI metadata", async () => {
  const raw = "  original report\n  ";
  const payload = buildIncidentPayload({
    toolId: "TOOL-B",
    reporterId: "WRK-014",
    language: "kn",
    rawText: raw,
    translatedText: "",
    confidence: null,
  });
  assert.equal(payload.rawText, raw);
  assert.equal("confidence" in payload, false);
  assert.equal("modelVersion" in payload, false);
  const { api, calls } = setup(
    { incident: { incidentId: "TS-0002" } },
    { status: 201 },
  );
  await api.createIncident(payload);
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), payload);
});
test("confirmation sends named confirmer and only supplied corrections", async () => {
  const { api, calls } = setup({});
  const body = { confirmedBy: "WRK-014", corrections: { category: "TORQUE" } };
  await api.confirmIncident("TS-0002", body);
  assert.equal(calls[0].url, "http://test/api/incidents/TS-0002/confirm");
  assert.deepEqual(JSON.parse(calls[0].body), body);
});
test("trace requests bind the actual incident and selected window", async () => {
  const { api, calls } = setup({});
  for (const window of [24, 72, 168]) await api.getTrace("TS-0042", window);
  assert.deepEqual(
    calls.map((c) => c.url),
    [24, 72, 168].map(
      (h) => `http://test/api/incidents/TS-0042/trace?window=${h}`,
    ),
  );
});
test("HTTP validation errors preserve useful backend code and message", async () => {
  const { api } = setup(
    {
      error: {
        code: "INVALID_INPUT",
        message: "Unsupported language",
        details: { field: "language" },
      },
    },
    { status: 400 },
  );
  await assert.rejects(
    api.createIncident({}),
    (error) =>
      error.code === "INVALID_INPUT" &&
      error.status === 400 &&
      error.message === "Unsupported language",
  );
});
test("network failure is a useful error instead of fabricated data", async () => {
  const api = createApiClient({
    fetchImpl: async () => {
      throw new TypeError("offline");
    },
  });
  await assert.rejects(api.getTools(), { code: "NETWORK_ERROR" });
});
test("malformed JSON response is rejected", async () => {
  const api = createApiClient({
    fetchImpl: async () => new Response("not json"),
  });
  await assert.rejects(api.getTools(), { code: "INVALID_RESPONSE" });
});
test("stub AI and workflow responses never count as execution success", async () => {
  const { api } = setup({
    _stub: true,
    _label: "SIMULATED",
    approval: { decision: "APPROVED" },
  });
  await assert.rejects(api.structureReport({}), { code: "STUB_UNAVAILABLE" });
  await assert.rejects(api.decideApproval("A", {}), {
    code: "STUB_UNAVAILABLE",
  });
  await assert.rejects(api.verifyReturn("TS-2", {}), {
    code: "STUB_UNAVAILABLE",
  });
});
test("tools response must have the real tools envelope", async () => {
  const { api } = setup({ data: [{ toolId: "TOOL-B" }] });
  await assert.rejects(api.getTools(), { code: "INVALID_RESPONSE" });
});
for (const [label, value] of [["null", null], ["array", []], ["string", "unexpected"]]) {
  test(`a JSON ${label} response is rejected as invalid rather than a network failure`, async () => {
    const { api } = setup(value);
    await assert.rejects(api.getIncident("TS-0002"), { code: "INVALID_RESPONSE" });
  });
}
test("display mapping preserves backend totals, evidence IDs and Unknown tier", () => {
  const trace = {
    toolId: "TOOL-B",
    snapshotTime: "2026-11-04T05:02:00Z",
    summary: {
      byTier: { CONFIRMED: 90, PROBABLE: 4, UNKNOWN: 6 },
      byLocation: { IN_STOCK: 40 },
      shippedByDealer: { "DLR-X": 35, "DLR-Y": 25 },
    },
    units: [
      {
        serial: "SN-000076",
        tier: "UNKNOWN",
        locationStatus: "SHIPPED",
        dealerId: "DLR-Y",
        reasonCodes: ["MISSING_TOOL_USE_RECORD"],
        flags: [],
        evidenceIds: ["RUN-B-NOREC", "SN-000076"],
      },
    ],
  };
  const view = traceView(trace);
  assert.deepEqual(view.tankCounts, {
    factoryStock: 40,
    dealerX: 35,
    dealerY: 25,
  });
  assert.deepEqual(view.tierCounts, { confirmed: 90, probable: 4, unknown: 6 });
  assert.deepEqual(view.units[0].evidenceIds, trace.units[0].evidenceIds);
  assert.equal(view.units[0].tier, "Unknown");
  assert.equal(view.units[0].toolUseEventId, null);
});
test("QR contents resolve only to IDs in the current live register", () => {
  const tools = [{ toolId: "TOOL-B" }];
  assert.equal(resolveToolCode("TOOL-B", tools), tools[0]);
  assert.equal(
    resolveToolCode("https://example.test/tool?toolId=TOOL-B", tools),
    tools[0],
  );
  assert.equal(resolveToolCode("UNKNOWN", tools), null);
});
test("unknown location is explicit and does not become stock or a dealer", () => {
  const view = traceView({
    toolId: "T",
    summary: {
      byTier: { CONFIRMED: 0, PROBABLE: 0, UNKNOWN: 1 },
      byLocation: { IN_STOCK: 0 },
      shippedByDealer: {},
    },
    units: [
      {
        serial: "S",
        tier: "UNKNOWN",
        locationStatus: "UNKNOWN_LOCATION",
        reasonCodes: ["MISSING_TOOL_USE_RECORD"],
        flags: [],
        evidenceIds: ["S"],
      },
    ],
  });
  assert.equal(view.units[0].location, "Unknown location");
  assert.equal(view.tankCounts.factoryStock, 0);
});
