const cds = require("@sap/cds");
const request = require("supertest");
const { cds: dbCds, entity } = require("../srv/lib/db");
cds.test(__dirname + "/..");
jest.setTimeout(30000);
afterEach(async () => {
  const rows = await dbCds.db.run(cds.ql.SELECT.from(entity("RepairLog")));
  for (const row of rows.filter((repair) => repair.loggedBy?.startsWith("TECH-REPAIR-")))
    await dbCds.db.run(cds.ql.DELETE.from(entity("RepairLog")).where({ repairId: row.repairId }));
  await dbCds.db.run(cds.ql.UPDATE(entity("Tool")).set({ state: "Active" }).where({ toolId: "TOOL-C" }));
});

const call = (method, path, role, user, body) => {
  const req = request(cds.app)[method](`/api${path}`)
    .set("x-demo-user", user)
    .set("x-demo-role", role);
  return body === undefined ? req : req.send(body);
};
let seq = 0;
async function confirmedIncident() {
  seq += 1;
  const create = await call("post", "/incidents", "Worker", `REPAIR-W-${seq}`, {
    toolId: "TOOL-C",
    reporterId: `REPAIR-REPORTER-${seq}`,
    language: "en",
    rawText: "Synthetic fixture alignment concern",
    translatedText: "Synthetic fixture alignment concern",
    category: `REPAIR-TEST-${seq}`,
    reportedAt: "2026-10-31T12:00:00.000Z",
  });
  expect(create.status).toBe(201);
  const id = create.body.incident.incidentId;
  const confirm = await call("post", `/incidents/${id}/confirm`, "Worker", `REPAIR-W-${seq}`, {
    confirmedBy: `REPAIR-W-${seq}`,
  });
  expect(confirm.status).toBe(200);
  return id;
}
async function setRestricted() {
  await dbCds.db.run(cds.ql.UPDATE(entity("Tool")).set({ state: "Restricted" }).where({ toolId: "TOOL-C" }));
}
async function start(id, user = "TECH-REPAIR-01", description = "Replaced a synthetic worn fixture") {
  return call("post", `/incidents/${id}/repairs`, "Technician", user, { description });
}

test("Technician starts a repair from Restricted and completion waits for independent verification", async () => {
  const incidentId = await confirmedIncident();
  await setRestricted();
  const started = await start(incidentId);
  expect(started.status).toBe(201);
  expect(started.body).toMatchObject({
    _label: "SIMULATED",
    _stub: false,
    repairStatus: "Under repair",
    completed: false,
    repair: { incidentId, loggedBy: "TECH-REPAIR-01", passed: false, testReadings: [] },
  });
  const repairId = started.body.repair.repairId;
  expect((await call("post", `/repairs/${repairId}/complete`, "Technician", "OTHER-TECH", {
    testReadings: [{ name: "Alignment", passed: true }],
  })).status).toBe(403);

  const failed = await call("post", `/repairs/${repairId}/complete`, "Technician", "TECH-REPAIR-01", {
    testReadings: [{ name: "Alignment", passed: false }],
  });
  expect(failed.status).toBe(200);
  expect(failed.body).toMatchObject({ completed: false, repairStatus: "Under repair" });
  expect(await dbCds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-C" }))).toMatchObject({ state: "Under repair" });

  const duplicateStart = await start(incidentId, "TECH-REPAIR-01", "Second repair attempt");
  expect(duplicateStart.status).toBe(409);
  expect(duplicateStart.body.error.code).toBe("REPAIR_ALREADY_OPEN");
});

test("failed repair readings remain in append-only audit and tool history after a later passing submission", async () => {
  const incidentId = await confirmedIncident();
  await setRestricted();
  const started = await start(incidentId, "TECH-REPAIR-HISTORY");
  const repairId = started.body.repair.repairId;

  const failedReadings = [
    { name: "Fixture torque", passed: false },
    { name: "Alignment", passed: true },
  ];
  const failed = await call("post", `/repairs/${repairId}/complete`, "Technician", "TECH-REPAIR-HISTORY", {
    testReadings: failedReadings,
  });
  expect(failed.status).toBe(200);
  expect(failed.body.completed).toBe(false);

  const passingReadings = [
    { name: "Fixture torque", passed: true },
    { name: "Alignment", passed: true },
  ];
  const passed = await call("post", `/repairs/${repairId}/complete`, "Technician", "TECH-REPAIR-HISTORY", {
    testReadings: passingReadings,
  });
  expect(passed.status).toBe(200);
  expect(passed.body.completed).toBe(true);

  const audits = await dbCds.db.run(cds.ql.SELECT.from(entity("AuditLog")).where({
    incidentId,
    action: "REPAIR_TESTS_RECORDED_FAILED",
  }));
  expect(audits).toHaveLength(1);
  expect(audits[0]).toMatchObject({ actor: "TECH-REPAIR-HISTORY", actorRole: "Technician" });
  expect(Number.isFinite(Date.parse(audits[0].timestamp))).toBe(true);
  expect(JSON.parse(audits[0].details)).toMatchObject({
    repairId,
    passed: false,
    testReadings: failedReadings,
  });
  const auditApi = await call("get", `/audit?incident=${incidentId}`, "Manager", "REPAIR-HISTORY-REVIEW");
  expect(auditApi.status).toBe(200);
  expect(auditApi.body.entries.find((entry) => entry.auditId === audits[0].auditId).details).toMatchObject({
    passed: false,
    testReadings: failedReadings,
  });

  const history = await dbCds.db.run(cds.ql.SELECT.from(entity("ToolHistoryEvent")).where({
    toolId: "TOOL-C",
    refId: incidentId,
    type: "REPAIR",
  }));
  const submissions = history.map((event) => JSON.parse(event.details)).filter((details) => details.repairId === repairId && details.testReadings);
  expect(submissions).toHaveLength(2);
  expect(submissions).toEqual(expect.arrayContaining([
    expect.objectContaining({ submittedBy: "TECH-REPAIR-HISTORY", passed: false, testReadings: failedReadings }),
    expect.objectContaining({ submittedBy: "TECH-REPAIR-HISTORY", passed: true, testReadings: passingReadings }),
  ]));
  const historyApi = await call("get", "/tools/TOOL-C/history", "Manager", "REPAIR-HISTORY-REVIEW");
  expect(historyApi.status).toBe(200);
  expect(historyApi.body.events.map((event) => event.details).filter((details) => details.repairId === repairId && details.testReadings)).toHaveLength(2);
});

test("all explicit passing readings move to Awaiting verification, never directly to Active", async () => {
  const incidentId = await confirmedIncident();
  await setRestricted();
  const started = await start(incidentId, "TECH-REPAIR-02");
  const repairId = started.body.repair.repairId;
  const completed = await call("post", `/repairs/${repairId}/complete`, "Technician", "TECH-REPAIR-02", {
    testReadings: [
      { name: "Fixture torque", passed: true },
      { name: "Alignment", passed: true },
    ],
  });
  expect(completed.status).toBe(200);
  expect(completed.body).toMatchObject({ completed: true, repairStatus: "Awaiting verification" });
  expect(await dbCds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-C" }))).toMatchObject({ state: "Awaiting verification" });
  expect((await call("post", `/incidents/${incidentId}/verify-return`, "Verifier", "VERIFIER-02", { repairId })).status).toBe(200);
  expect(await dbCds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-C" }))).toMatchObject({ state: "Active" });
});

test("repair start and completion reject invalid identity, incident state and ambiguous readings", async () => {
  const incidentId = await confirmedIncident();
  await dbCds.db.run(cds.ql.UPDATE(entity("Tool")).set({ state: "Active" }).where({ toolId: "TOOL-C" }));
  expect((await start(incidentId, "TECH-REPAIR-03")).status).toBe(409);
  await setRestricted();
  expect((await call("post", `/incidents/${incidentId}/repairs`, "Worker", "WORKER-01", { description: "repair" })).status).toBe(403);
  expect((await start("NO-SUCH-INCIDENT")).status).toBe(404);
  const started = await start(incidentId, "TECH-REPAIR-03");
  const repairId = started.body.repair.repairId;
  for (const testReadings of [undefined, [], [{ name: "Alignment" }], [null]]) {
    const response = await call("post", `/repairs/${repairId}/complete`, "Technician", "TECH-REPAIR-03", { testReadings });
    expect(response.status).toBe(400);
  }
  const audits = await dbCds.db.run(cds.ql.SELECT.from(entity("AuditLog")).where({ incidentId }));
  expect(audits.map((entry) => entry.action)).toContain("REPAIR_STARTED");
  expect(audits.some((entry) => entry.action === "REPAIR_COMPLETED")).toBe(false);
});
