const cds = require("@sap/cds");
const request = require("supertest");
const { entity } = require("../srv/lib/db");
const { detectDuplicateIncidents } = require("../srv/lib/duplicate-detection");
cds.test(__dirname + "/..");
jest.setTimeout(30000);

const api = (method, url, body, identity = true) => {
  const call = request(cds.app)[method]("/api" + url);
  if (identity)
    call.set("x-demo-user", "DUPLICATE-TEST").set("x-demo-role", "Worker");
  return body === undefined ? call : call.send(body);
};

let sequence = 0;
async function report({
  toolId = "TOOL-B",
  category = "DUPLICATE-TEST",
  text = "Motor is overheating during normal operation",
    rawText = text,
  translatedText = text,
  reportedAt = "2026-06-30T12:00:00.000Z",
} = {}) {
  sequence += 1;
  const response = await api("post", "/incidents", {
    toolId,
    reporterId: `DUPLICATE-${sequence}`,
    language: "en",
    rawText,
    translatedText,
    category,
    reportedAt,
  });
  expect(response.status).toBe(201);
  return response.body.incident;
}

test("returns a similar same-tool/category candidate with score and human-review reason", async () => {
  const earlier = await report({ reportedAt: "2026-06-29T12:00:00.000Z" });
  const current = await report();
  const response = await api("get", `/incidents/${current.incidentId}/duplicates`);
  expect(response.status).toBe(200);
  expect(response.body._stub).toBe(false);
  expect(response.body.incidentId).toBe(current.incidentId);
  expect(response.body.descriptionSource).toBe("translatedText");
  expect(response.body.evaluation).toEqual({ valid: true, reason: null });
  expect(response.body.candidates).toEqual([
    expect.objectContaining({
      incidentId: earlier.incidentId,
      reportedAt: earlier.reportedAt,
      state: "Reported",
      similarity: 1,
      reason: expect.stringContaining("human review"),
    }),
  ]);
});

test("falls back to rawText and emits no match for dissimilar text", async () => {
  const earlier = await report({
    category: "RAW-FALLBACK",
    translatedText: null,
    text: "Unrelated prior report",
    reportedAt: "2026-06-29T12:00:00.000Z",
  });
  const current = await report({
    category: "RAW-FALLBACK",
    translatedText: null,
    text: "Motor shaft vibrates under load",
  });
  expect(earlier.translatedText).toBeNull();
  const response = await api("get", `/incidents/${current.incidentId}/duplicates`);
  expect(response.body.descriptionSource).toBe("rawText");
  expect(response.body.candidates).toEqual([]);
});

test("excludes different tools and different categories", async () => {
  await report({ toolId: "TOOL-A", category: "FILTER-CATEGORY", reportedAt: "2026-06-29T12:00:00.000Z" });
  await report({ category: "FILTER-CATEGORY-OTHER", reportedAt: "2026-06-29T12:00:00.000Z" });
  const current = await report({ category: "FILTER-CATEGORY" });
  const response = await api("get", `/incidents/${current.incidentId}/duplicates`);
  expect(response.status).toBe(200);
  expect(response.body.candidates).toEqual([]);
});

test("excludes itself and includes the exact inclusive 30-day reportedAt boundary", async () => {
  const current = await report({
    category: "BOUNDARY",
    reportedAt: "2026-06-30T12:00:00.000Z",
  });
  const boundary = await report({
    category: "BOUNDARY",
    reportedAt: "2026-05-31T12:00:00.000Z",
  });
  const outside = await report({
    category: "BOUNDARY",
    reportedAt: "2026-05-31T11:59:59.999Z",
  });
  const response = await api("get", `/incidents/${current.incidentId}/duplicates`);
  expect(response.status).toBe(200);
  expect(response.body.candidates.map((candidate) => candidate.incidentId)).toEqual([
    boundary.incidentId,
  ]);
  expect(response.body.candidates.map((candidate) => candidate.incidentId)).not.toContain(current.incidentId);
  expect(response.body.candidates.map((candidate) => candidate.incidentId)).not.toContain(outside.incidentId);
});

test("missing incident uses the platform 404 envelope", async () => {
  const response = await api("get", "/incidents/DOES-NOT-EXIST/duplicates");
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("INCIDENT_NOT_FOUND");
});

test("missing category and malformed event timestamp fail evaluation without guessing", async () => {
  const current = await report({ category: null });
  const response = await api("get", `/incidents/${current.incidentId}/duplicates`);
  expect(response.status).toBe(200);
  expect(response.body.evaluation).toEqual({
    valid: false,
    reason: "invalid_current_incident_fields",
  });
  expect(response.body.candidates).toEqual([]);
});

test("detector rejects malformed timestamps and safely skips malformed candidates", () => {
  const current = {
    id: "CURRENT",
    toolId: "TOOL-B",
    category: "MALFORMED",
    description: "Motor vibration under load",
    createdAt: "2026-06-30T12:00:00.000Z",
  };
  const malformed = {
    id: "BAD-DATE",
    toolId: "TOOL-B",
    category: "MALFORMED",
    description: current.description,
    createdAt: "not-a-timestamp",
  };
  expect(detectDuplicateIncidents(current, [malformed]).matches).toEqual([]);
  expect(
    detectDuplicateIncidents({ ...current, createdAt: "invalid" }, [malformed]),
  ).toMatchObject({ valid: false, matches: [], reason: "invalid_current_incident_fields" });
  const inputs = structuredClone([current, malformed]);
  detectDuplicateIncidents(current, [malformed]);
  expect([current, malformed]).toEqual(inputs);
});

test("detector rejects impossible calendar and clock timestamps", () => {
  const base = {
    toolId: "TOOL-B",
    category: "INVALID-CALENDAR",
    description: "Motor vibration under load",
    createdAt: "2026-06-30T12:00:00.000Z",
  };
  for (const createdAt of [
    "2026-02-30T12:00:00.000Z",
    "2026-02-29T12:00:00.000Z",
    "2026-06-30T25:00:00.000Z",
  ]) {
    expect(detectDuplicateIncidents({ ...base, createdAt }, []).valid).toBe(false);
  }
  expect(detectDuplicateIncidents(base, [{ ...base, id: "GOOD" }]).valid).toBe(true);
});

test("requires authenticated identity and permits an authenticated Worker to read", async () => {
  const current = await report({ category: "AUTH-CHECK" });
  expect((await api("get", `/incidents/${current.incidentId}/duplicates`, undefined, false)).status).toBe(401);
  const unknownRole = request(cds.app)
    .get(`/api/incidents/${current.incidentId}/duplicates`)
    .set("x-demo-user", "DUPLICATE-TEST")
    .set("x-demo-role", "Unknown");
  expect((await unknownRole).status).toBe(403);
  expect((await api("get", `/incidents/${current.incidentId}/duplicates`)).status).toBe(200);
});

test("successful duplicate evaluation does not change incident records or write application audit entries", async () => {
  const earlier = await report({ category: "READ-ONLY" });
  const current = await report({ category: "READ-ONLY" });
  const beforeIncidents = await cds.db.run(cds.ql.SELECT.from(entity("Incident")));
  const beforeAudit = await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")));
  const response = await api("get", `/incidents/${current.incidentId}/duplicates`);
  expect(response.status).toBe(200);
  expect(response.body.candidates[0].incidentId).toBe(earlier.incidentId);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Incident")))).toEqual(beforeIncidents);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")))).toEqual(beforeAudit);
});
