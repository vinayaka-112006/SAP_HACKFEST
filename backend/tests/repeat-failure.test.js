const cds = require("@sap/cds");
const request = require("supertest");
const { entity } = require("../srv/lib/db");
const { detectRepeatFailure } = require("../srv/lib/repeat-failure");
cds.test(__dirname + "/..");
jest.setTimeout(30000);

const api = (method, url, body, identity = true) => {
  const call = request(cds.app)[method]("/api" + url);
  if (identity)
    call.set("x-demo-user", "REPEAT-TEST").set("x-demo-role", "Worker");
  return body === undefined ? call : call.send(body);
};

let sequence = 0;
async function report({
  toolId = "TOOL-B",
  category = "REPEAT-TEST",
  description = "Recurring failure description for review",
  reportedAt = "2026-06-30T12:00:00.000Z",
} = {}) {
  sequence += 1;
  const response = await api("post", "/incidents", {
    toolId,
    reporterId: `REPEAT-${sequence}`,
    language: "en",
    rawText: description,
    translatedText: description,
    category,
    reportedAt,
  });
  expect(response.status).toBe(201);
  return response.body.incident;
}

test("default threshold is met by exactly two prior records, excluding the current incident", async () => {
  const first = await report({ category: "REPEAT-EXACT", reportedAt: "2026-06-10T12:00:00.000Z" });
  const second = await report({ category: "REPEAT-EXACT", reportedAt: "2026-06-20T12:00:00.000Z" });
  const current = await report({ category: "REPEAT-EXACT" });
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures`);
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    _label: "SIMULATED",
    _stub: false,
    incidentId: current.incidentId,
    toolId: "TOOL-B",
    category: "REPEAT-EXACT",
    referenceAt: current.reportedAt,
    referenceAtSource: "CLIENT_REPORTED",
    currentIncidentExcluded: true,
    potentialDuplicateIncidentIds: [first.incidentId, second.incidentId],
    windowDays: 30,
    minimumReports: 2,
    valid: true,
    thresholdMet: true,
    count: 2,
    matchingIncidentIds: [first.incidentId, second.incidentId],
  });
  expect(response.body.matchingIncidentIds).not.toContain(current.incidentId);
  // Similar descriptions are surfaced for review but do not silently reduce the report count.
  expect(response.body.count).toBe(2);
  expect(response.body.matchingIncidents.map((record) => record.state)).toEqual(["Reported", "Reported"]);
  expect(response.body.matchingIncidents.every((record) => record.reportedAtSource === "CLIENT_REPORTED")).toBe(true);
});

test("one prior report remains below the default threshold", async () => {
  const prior = await report({ category: "REPEAT-ONE", reportedAt: "2026-06-20T12:00:00.000Z" });
  const current = await report({ category: "REPEAT-ONE" });
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures`);
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    valid: true,
    thresholdMet: false,
    count: 1,
    matchingIncidentIds: [prior.incidentId],
  });
});

test("records from another tool or category are excluded", async () => {
  await report({ toolId: "TOOL-A", category: "REPEAT-FILTER", reportedAt: "2026-06-20T12:00:00.000Z" });
  await report({ category: "REPEAT-FILTER-OTHER", reportedAt: "2026-06-20T12:00:00.000Z" });
  const current = await report({ category: "REPEAT-FILTER" });
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures`);
  expect(response.status).toBe(200);
  expect(response.body.count).toBe(0);
  expect(response.body.thresholdMet).toBe(false);
});

test("includes the exact 30-day boundary and excludes a report one millisecond older", async () => {
  const boundary = await report({ category: "REPEAT-BOUNDARY", reportedAt: "2026-05-31T12:00:00.000Z" });
  const outside = await report({ category: "REPEAT-BOUNDARY", reportedAt: "2026-05-31T11:59:59.999Z" });
  const current = await report({ category: "REPEAT-BOUNDARY" });
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures?minimumReports=1`);
  expect(response.status).toBe(200);
  expect(response.body.count).toBe(1);
  expect(response.body.matchingIncidentIds).toEqual([boundary.incidentId]);
  expect(response.body.matchingIncidentIds).not.toContain(outside.incidentId);
});

test("query settings configure both window and threshold", async () => {
  const tenDays = await report({ category: "REPEAT-CONFIG", reportedAt: "2026-06-20T12:00:00.000Z" });
  await report({ category: "REPEAT-CONFIG", reportedAt: "2026-06-01T12:00:00.000Z" });
  const current = await report({ category: "REPEAT-CONFIG" });
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures?windowDays=10&minimumReports=1`);
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ windowDays: 10, minimumReports: 1, count: 1, thresholdMet: true });
  expect(response.body.matchingIncidentIds).toEqual([tenDays.incidentId]);
});

test("missing incident returns the standard 404 and missing category is invalid, not safe", async () => {
  expect((await api("get", "/incidents/NO-REPEAT-INCIDENT/repeat-failures")).body.error.code).toBe("INCIDENT_NOT_FOUND");
  const current = await report({ category: null });
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures`);
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ valid: false, thresholdMet: false, count: 0, matchingIncidentIds: [], reason: "invalid_tool_or_category" });
});

test("malformed persisted reportedAt is returned as invalid with zero matches", async () => {
  const current = await report({ category: "REPEAT-BAD-STORED-TIME" });
  await cds.db.run(
    cds.ql
      .UPDATE(entity("Incident"))
      .set({ reportedAt: "not-a-timestamp" })
      .where({ incidentId: current.incidentId }),
  );
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures`);
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    valid: false,
    thresholdMet: false,
    count: 0,
    matchingIncidentIds: [],
    referenceAt: "not-a-timestamp",
    reason: "invalid_reference_timestamp",
  });
});

test("malformed query values are rejected and invalid data timestamps fail safely", async () => {
  const current = await report({ category: "REPEAT-INVALID" });
  for (const query of ["windowDays=0", "minimumReports=1.5", "windowDays=NaN", "windowDays=1e300"])
    expect((await api("get", `/incidents/${current.incidentId}/repeat-failures?${query}`)).status).toBe(400);
  expect(
    detectRepeatFailure("TOOL-B", "REPEAT-INVALID", [], {
      referenceAt: "not-a-timestamp",
    }),
  ).toMatchObject({ valid: false, thresholdMet: false, count: 0, reason: "invalid_reference_timestamp" });
  expect(
    detectRepeatFailure("TOOL-B", "REPEAT-INVALID", [], {
      referenceAt: null,
    }),
  ).toMatchObject({ valid: false, reason: "invalid_reference_timestamp" });
  expect(
    detectRepeatFailure("TOOL-B", "REPEAT-INVALID", [], {
      referenceAt: undefined,
    }),
  ).toMatchObject({ valid: false, reason: "invalid_reference_timestamp" });
  expect(
    detectRepeatFailure("TOOL-B", "REPEAT-INVALID", [], {
      referenceAt: "2026-02-31T12:00:00.000Z",
    }),
  ).toMatchObject({ valid: false, reason: "invalid_reference_timestamp" });
  expect(
    detectRepeatFailure("TOOL-B", "REPEAT-INVALID", [
      { id: "BAD-TIME", toolId: "TOOL-B", category: "REPEAT-INVALID", createdAt: "bad" },
      { id: "BAD-CALENDAR", toolId: "TOOL-B", category: "REPEAT-INVALID", createdAt: "2026-02-31T12:00:00.000Z" },
    ], { referenceAt: current.reportedAt }),
  ).toMatchObject({ valid: true, thresholdMet: false, count: 0, matchingIncidentIds: [] });
});

test("current incident exclusion, ID de-duplication and immutable inputs are enforced by the rule", () => {
  expect(detectRepeatFailure("", "REPEAT-UNIT", [])).toMatchObject({
    valid: false,
    count: 0,
    reason: "invalid_tool_or_category",
  });
  const referenceAt = "2026-06-30T12:00:00.000Z";
  const reports = [
    { id: "CURRENT", toolId: "TOOL-B", category: "REPEAT-UNIT", createdAt: referenceAt },
    { id: "PRIOR", toolId: "TOOL-B", category: "REPEAT-UNIT", createdAt: "2026-06-20T12:00:00.000Z" },
    { id: "PRIOR", toolId: "TOOL-B", category: "REPEAT-UNIT", createdAt: "2026-06-20T12:00:00.000Z" },
  ];
  const before = structuredClone(reports);
  const result = detectRepeatFailure("TOOL-B", "REPEAT-UNIT", reports, {
    referenceAt,
    excludeIncidentId: "CURRENT",
    minimumReports: 1,
  });
  expect(result).toMatchObject({ valid: true, thresholdMet: true, count: 1, matchingIncidentIds: ["PRIOR"] });
  expect(reports).toEqual(before);
});

test("route requires an authenticated identity and successful reads do not mutate records or audit history", async () => {
  const prior1 = await report({ category: "REPEAT-READONLY", reportedAt: "2026-06-10T12:00:00.000Z" });
  const prior2 = await report({ category: "REPEAT-READONLY", reportedAt: "2026-06-20T12:00:00.000Z" });
  const current = await report({ category: "REPEAT-READONLY" });
  expect((await api("get", `/incidents/${current.incidentId}/repeat-failures`, undefined, false)).status).toBe(401);
  const beforeIncidents = await cds.db.run(cds.ql.SELECT.from(entity("Incident")));
  const beforeAudit = await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")));
  const beforeTools = await cds.db.run(cds.ql.SELECT.from(entity("Tool")));
  const response = await api("get", `/incidents/${current.incidentId}/repeat-failures`);
  expect(response.status).toBe(200);
  expect(response.body.matchingIncidentIds).toEqual([prior1.incidentId, prior2.incidentId]);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Incident")))).toEqual(beforeIncidents);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")))).toEqual(beforeAudit);
  expect(await cds.db.run(cds.ql.SELECT.from(entity("Tool")))).toEqual(beforeTools);
});
