const cds = require("@sap/cds");
const request = require("supertest");
const { entity, transaction } = require("../srv/lib/db");
const ids = require("../srv/lib/ids");
const audit = require("../srv/lib/audit");
cds.test(__dirname + "/..");
jest.setTimeout(30000);
const payload = () => ({ ...require("../docs/demo-incidents.json")[0] });
const api = (method, url, body, role = "Worker") => {
  const r = request(cds.app)
    [method]("/api" + url)
    .set("x-demo-user", "TEST-ACTOR")
    .set("x-demo-role", role);
  return body === undefined ? r : r.send(body);
};
let id;
test("schema loads exactly 300 units and seeded older incident", async () => {
  expect((await cds.db.run(cds.ql.SELECT.from(entity("Unit")))).length).toBe(
    300,
  );
  expect((await api("get", "/incidents/TS-0001")).body.incident.state).toBe(
    "Closed",
  );
});
test("create persists exact raw text, provenance, photo, audit and history", async () => {
  const body = {
    ...payload(),
    rawText: "  original Kannada report \n  ",
    photoRef: "local-photo-01",
  };
  const r = await api("post", "/incidents", body);
  expect(r.status).toBe(201);
  id = r.body.incident.incidentId;
  expect(id).toBe("TS-0002");
  expect(r.body.incident.rawText).toBe(body.rawText);
  expect(r.body.incident.modelVersion).toBe(body.modelVersion);
  const detail = await api("get", "/incidents/" + id);
  expect(detail.body.evidence[0].reference).toBe("local-photo-01");
  expect(detail.body.auditSummary.count).toBe(1);
  expect(detail.body.traceResults).toEqual([]);
  const h = await api("get", "/tools/TOOL-B/history");
  expect(h.body.events.some((e) => e.refId === "TS-0001")).toBe(true);
  expect(h.body.events.some((e) => e.refId === id)).toBe(true);
});
test("validation and lookup errors preserve database", async () => {
  for (const change of [
    { rawText: "" },
    { language: "fr" },
    { confidence: 2 },
    { reportedAt: "yesterday" },
    { reportedAt: "2026-02-31T05:12:00Z" },
    { missingFields: "x" },
  ])
    expect(
      (await api("post", "/incidents", { ...payload(), ...change })).status,
    ).toBe(400);
  expect(
    (await api("post", "/incidents", { ...payload(), toolId: "NO-TOOL" })).body
      .error.code,
  ).toBe("TOOL_NOT_FOUND");
  expect((await api("get", "/incidents/NO-INCIDENT")).status).toBe(404);
});
test("server receive timestamp is explicit when omitted", async () => {
  const body = payload();
  delete body.reportedAt;
  const r = await api("post", "/incidents", body);
  expect(r.status).toBe(201);
  expect(r.body.warnings).toHaveLength(1);
  expect(r.body.incident.reportedAtSource).toBe("SERVER_RECEIVED");
  expect(r.body.incident.reportedAt).toMatch(/Z$/);
});
test("confirmation records before/after and both tools on correction; repeated call conflicts", async () => {
  expect(
    (
      await api("post", `/incidents/${id}/confirm`, {
        confirmedBy: "WRK-014",
        corrections: { toolId: "MISSING" },
      })
    ).status,
  ).toBe(404);
  const r = await api("post", `/incidents/${id}/confirm`, {
    confirmedBy: "WRK-014",
    corrections: { toolId: "TOOL-A", category: "WEAR" },
  });
  expect(r.status).toBe(200);
  expect(r.body.incident.state).toBe("Confirmed");
  expect(
    (await api("post", `/incidents/${id}/confirm`, { confirmedBy: "WRK-014" }))
      .status,
  ).toBe(409);
  const log = await api("get", `/audit?incident=${id}`, undefined, "Manager");
  const event = log.body.entries.find((e) => e.action === "INCIDENT_CONFIRMED");
  expect(event.details.before.toolId).toBe("TOOL-B");
  expect(event.details.after.toolId).toBe("TOOL-A");
  expect(
    (await api("get", "/tools/TOOL-A/history")).body.events.some(
      (e) => e.refId === id,
    ),
  ).toBe(true);
});
test("audit ordering and missing incident handling", async () => {
  const r = await api("get", `/audit?incident=${id}`, undefined, "Verifier");
  expect(r.status).toBe(200);
  const keys = r.body.entries.map((e) => e.timestamp + e.auditId);
  expect(keys).toEqual([...keys].sort());
  expect((await api("get", "/audit", undefined, "Manager")).status).toBe(400);
  expect(
    (await api("get", "/audit?incident=MISSING", undefined, "Manager")).status,
  ).toBe(404);
});
test("audit rows reject UPDATE and DELETE at database level", async () => {
  await expect(
    cds.db.run(
      cds.ql
        .UPDATE(entity("AuditLog"))
        .set({ reason: "changed" })
        .where({ incidentId: id }),
    ),
  ).rejects.toThrow(/append-only/);
  await expect(
    cds.db.run(
      cds.ql.DELETE.from(entity("AuditLog")).where({ incidentId: id }),
    ),
  ).rejects.toThrow(/append-only/);
});
test("atomic counter allocates unique sequential IDs for concurrent requests", async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, () => api("post", "/incidents", payload())),
  );
  expect(results.every((r) => r.status === 201)).toBe(true);
  const nums = results
    .map((r) => Number(r.body.incident.incidentId.slice(3)))
    .sort((a, b) => a - b);
  expect(new Set(nums).size).toBe(8);
  expect(nums.at(-1) - nums[0]).toBe(7);
});
test("transaction rollback removes audit and counter update", async () => {
  const before = await cds.db.run(
    cds.ql.SELECT.one.from(entity("Counter")).where({ name: "incident" }),
  );
  await expect(
    transaction(async (tx) => {
      await ids.next(tx, "incident", "TS-");
      await audit.write(
        {
          actor: "TEST",
          actorRole: "Manager",
          action: "ROLLBACK_PROBE",
          reason: "test",
        },
        tx,
      );
      throw new Error("rollback probe");
    }),
  ).rejects.toThrow("rollback probe");
  expect(
    await cds.db.run(
      cds.ql.SELECT.one.from(entity("Counter")).where({ name: "incident" }),
    ),
  ).toEqual(before);
  expect(
    await cds.db.run(
      cds.ql.SELECT.from(entity("AuditLog")).where({
        action: "ROLLBACK_PROBE",
      }),
    ),
  ).toEqual([]);
});
test("protected real endpoints reject missing identity and wrong roles", async () => {
  expect((await request(cds.app).get("/api/tools")).status).toBe(401);
  for (const role of ["Quality", "Technician", "Verifier"])
    expect((await api("post", "/incidents", payload(), role)).status).toBe(403);
  for (const role of ["Worker", "Technician"])
    expect(
      (await api("get", `/audit?incident=${id}`, undefined, role)).status,
    ).toBe(403);
});
