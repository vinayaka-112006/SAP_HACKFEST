const cds = require("@sap/cds");
const request = require("supertest");
const { entity } = require("../srv/lib/db");
const { validateRepairEvidence, validateReturnToService } = require("../srv/lib/return-to-service");

cds.test(__dirname + "/..");
jest.setTimeout(30000);

const api = (repairId, { role = "Verifier", user = "VERIFIER-02", identity = true, extra = {} } = {}) => {
  const call = request(cds.app)
    .post("/api/incidents/TS-0001/verify-return")
    .send({ repairId, ...extra });
  if (identity) call.set("x-demo-user", user).set("x-demo-role", role);
  return call;
};

const readings = [
  { name: "Torque check 1", value: 40, unit: "Nm", passed: true },
  { name: "Torque check 2", value: 41, unit: "Nm", passed: true },
];

let sequence = 0;
async function prepareRepair(overrides = {}, state = "Awaiting verification") {
  sequence += 1;
  const repairId = `REPAIR-VERIFY-${sequence}`;
  await cds.db.run(
    cds.ql.UPDATE(entity("Tool")).set({ state }).where({ toolId: "TOOL-B" }),
  );
  await cds.db.run(
    cds.ql.INSERT.into(entity("RepairLog")).entries({
      repairId,
      toolId: "TOOL-B",
      incidentId: "TS-0001",
      description: "Synthetic repair record for verification test",
      loggedBy: "TECHNICIAN-01",
      loggedAt: "2026-11-01T10:00:00.000Z",
      testReadings: JSON.stringify(readings),
      passed: true,
      verifiedBy: null,
      verifiedAt: null,
      ...overrides,
    }),
  );
  return repairId;
}

const validRepair = {
  description: "Synthetic repair completed",
  loggedBy: "TECHNICIAN-01",
  loggedAt: "2026-11-01T10:00:00.000Z",
  passed: true,
  testReadings: readings,
};

test("unit validator accepts complete evidence and rejects absent, ambiguous, or failing readings", async () => {
  expect(await validateReturnToService({
    repairLog: validRepair,
    toolState: "Awaiting verification",
    verifierId: "VERIFIER-02",
    verifierRole: "Verifier",
  })).toMatchObject({ valid: true, errors: [] });
  expect(validateRepairEvidence({ ...validRepair, testReadings: [] })).toContain("inspection_readings_required");
  expect(validateRepairEvidence({ ...validRepair, testReadings: [{ name: "Torque" }] })).toContain("inspection_result_unknown");
  expect(validateRepairEvidence({ ...validRepair, testReadings: [{ name: "Torque", passed: false }] })).toContain("inspection_reading_failed");
  expect(validateRepairEvidence({ ...validRepair, testReadings: [null] })).toContain("inspection_reading_malformed");
  expect(validateRepairEvidence({ ...validRepair, loggedAt: "2026-02-30T10:00:00.000Z" })).toContain("repair_timestamp_invalid");
});

test("unit validator enforces verifier identity, separation of duties and allowed platform state", async () => {
  const samePerson = await validateReturnToService({
    repairLog: validRepair,
    toolState: "Awaiting verification",
    verifierId: " technician-01 ",
    verifierRole: "Verifier",
  });
  expect(samePerson.errors).toContain("verifier_must_differ_from_repair_technician");
  const unauthorized = await validateReturnToService({
    repairLog: validRepair,
    toolState: "Awaiting verification",
    verifierId: "VERIFIER-02",
    verifierRole: "Manager",
  });
  expect(unauthorized.errors).toContain("verifier_role_required");
  const wrongState = await validateReturnToService({
    repairLog: validRepair,
    toolState: "Active",
    verifierId: "VERIFIER-02",
    verifierRole: "Verifier",
  });
  expect(wrongState.errors).toContain("invalid_tool_state_transition");
});

test("authenticated independent Verifier activates tool and persists evidence, history and audit atomically", async () => {
  const repairId = await prepareRepair();
  const response = await api(repairId);
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    _label: "SIMULATED",
    _stub: false,
    incidentId: "TS-0001",
    toolId: "TOOL-B",
    toolState: { from: "Awaiting verification", to: "Active" },
    verification: {
      repairId,
      repairTechnicianId: "TECHNICIAN-01",
      verifiedBy: "VERIFIER-02",
      readings,
    },
  });
  expect(Number.isFinite(Date.parse(response.body.verification.verifiedAt))).toBe(true);
  expect(response.body.auditId).toBeTruthy();
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).toMatchObject({ state: "Active" });
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("RepairLog")).where({ repairId }))).toMatchObject({
    verifiedBy: "VERIFIER-02",
    verifiedAt: response.body.verification.verifiedAt,
  });
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("AuditLog")).where({
    auditId: response.body.auditId,
    action: "TOOL_RETURN_TO_SERVICE_VERIFIED",
  }))).toMatchObject({ actor: "VERIFIER-02", actorRole: "Verifier" });
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("ToolHistoryEvent")).where({
    toolId: "TOOL-B",
    type: "REPAIR",
    refId: "TS-0001",
  }))).toBeTruthy();
});

test("missing or malformed repair log is rejected without changing the tool", async () => {
  await cds.db.run(cds.ql.UPDATE(entity("Tool")).set({ state: "Awaiting verification" }).where({ toolId: "TOOL-B" }));
  const missing = await api("REPAIR-NOT-FOUND");
  expect(missing.status).toBe(404);
  expect(missing.body.error.code).toBe("REPAIR_LOG_NOT_FOUND");
  const repairId = await prepareRepair({ testReadings: "not-json" });
  const malformed = await api(repairId);
  expect(malformed.status).toBe(409);
  expect(malformed.body.error.details.errors).toContain("inspection_readings_malformed");
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).toMatchObject({ state: "Awaiting verification" });
});

test("unknown incidents are rejected before repair evidence can change state", async () => {
  const repairId = await prepareRepair();
  const response = await request(cds.app)
    .post("/api/incidents/INCIDENT-DOES-NOT-EXIST/verify-return")
    .set("x-demo-user", "VERIFIER-02")
    .set("x-demo-role", "Verifier")
    .send({ repairId });
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("INCIDENT_NOT_FOUND");
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).toMatchObject({ state: "Awaiting verification" });
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("RepairLog")).where({ repairId }))).toMatchObject({ verifiedBy: null, verifiedAt: null });
});

test.each([
  ["empty readings", { testReadings: JSON.stringify([]) }, "inspection_readings_required"],
  ["missing pass result", { testReadings: JSON.stringify([{ name: "Torque check" }]) }, "inspection_result_unknown"],
  ["failed reading", { testReadings: JSON.stringify([{ name: "Torque check", passed: false }]) }, "inspection_reading_failed"],
  ["aggregate repair result is not passing", { passed: false }, "repair_not_marked_passed"],
  ["empty repair description", { description: " " }, "repair_description_required"],
])("incomplete evidence: %s", async (_title, overrides, expectedError) => {
  const repairId = await prepareRepair(overrides);
  const response = await api(repairId);
  expect(response.status).toBe(409);
  expect(response.body.error.details.errors).toContain(expectedError);
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).toMatchObject({ state: "Awaiting verification" });
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("RepairLog")).where({ repairId }))).toMatchObject({ verifiedBy: null, verifiedAt: null });
});

test("authentication and Verifier role are required", async () => {
  const repairId = await prepareRepair();
  expect((await api(repairId, { identity: false })).status).toBe(401);
  for (const role of ["Worker", "Technician", "Manager", "Quality"])
    expect((await api(repairId, { role })).status).toBe(403);
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).toMatchObject({ state: "Awaiting verification" });
});

test("repair technician cannot verify own work, including case and whitespace variants", async () => {
  const repairId = await prepareRepair({ loggedBy: "Verifier-02" });
  const response = await api(repairId, { user: " verifier-02 " });
  expect(response.status).toBe(409);
  expect(response.body.error.details.errors).toContain("verifier_must_differ_from_repair_technician");
});

test("invalid tool states and repeated return requests cannot create a second decision", async () => {
  const invalidStateRepair = await prepareRepair({}, "Under repair");
  const invalidState = await api(invalidStateRepair);
  expect(invalidState.status).toBe(409);
  expect(invalidState.body.error.code).toBe("INVALID_STATE");

  const repairId = await prepareRepair();
  const auditBefore = await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")).where({
    incidentId: "TS-0001",
    action: "TOOL_RETURN_TO_SERVICE_VERIFIED",
  }));
  expect((await api(repairId)).status).toBe(200);
  const retry = await api(repairId);
  expect(retry.status).toBe(409);
  expect(retry.body.error.code).toBe("INVALID_STATE");
  expect(await cds.db.run(cds.ql.SELECT.from(entity("AuditLog")).where({
    incidentId: "TS-0001",
    action: "TOOL_RETURN_TO_SERVICE_VERIFIED",
  }))).toHaveLength(auditBefore.length + 1);
});

test("request cannot supply verifier identity or substitute client readings", async () => {
  const repairId = await prepareRepair();
  const response = await api(repairId, {
    extra: { verifiedBy: "SPOOFED", passed: true, testReadings: readings },
  });
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe("INVALID_INPUT");
  expect(await cds.db.run(cds.ql.SELECT.one.from(entity("Tool")).where({ toolId: "TOOL-B" }))).toMatchObject({ state: "Awaiting verification" });
});
