// Explicit remote verification harness, separate from the offline Jest regression suite.
const configuration = require("../srv/lib/database-config");
configuration.loadEnvironment();
process.chdir(configuration.projectRoot);
const assert = require("node:assert/strict");
const { fork } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
let server, db, currentCheck = "configuration", connected = false;
const report = { mode: "hana", executedAt: new Date().toISOString(), status: "NOT_EXECUTED", checks: [], _label: "SIMULATED" };
const headers = { "content-type": "application/json", "x-demo-user": "HANA-INTEGRATION", "x-demo-role": "Manager" };
async function check(name, fn) {
  currentCheck = name;
  await fn();
  report.checks.push({ name, status: "PASSED" });
}
async function start() {
  return new Promise((resolve, reject) => {
    // HANA is a storage choice, not a request to enable production XSUAA locally.
    server = fork("srv/server.js", ["--database=hana"], {
      silent: true,
      env: { ...process.env, NODE_ENV: "development", CDS_ENV: "hana-local", DATABASE_MODE: "hana", AUTH_MODE: "header", ENFORCE_APPROVALS: "true", ALLOW_UNAPPROVED_MOCKS: "false", PORT: "0" },
    });
    let output = "";
    const timer = setTimeout(() => reject(Object.assign(new Error("HANA backend startup timed out."), { code: "HANA_STARTUP_TIMEOUT" })), 45000);
    server.stdout.on("data", chunk => {
      output += chunk;
      const match = output.match(/ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/);
      if (match) { clearTimeout(timer); resolve(match[1] + "/api"); }
    });
    // Never echo captured child stderr/credential objects into the verification report.
    server.once("exit", () => { clearTimeout(timer); reject(Object.assign(new Error("HANA backend failed to start. Run hana:check and inspect application table/audit readiness."), { code: "HANA_STARTUP_FAILED" })); });
  });
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const child = server;
  server = null;
  await new Promise(resolve => {
    const timer = setTimeout(() => { child.kill(); resolve(); }, 10000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.send({ type: "toolsathi:shutdown" });
  });
}
async function main() {
  const cds = require("@sap/cds");
  const config = configuration.configureDatabase(cds, { mode: "hana" });
  configuration.assertTarget(config);
  if (!process.env.HANA_TEST_SCHEMA || process.env.HANA_TEST_SCHEMA !== config.schema)
    throw Object.assign(new Error("Set HANA_TEST_SCHEMA to the owner-authorized test schema selected by HANA_SCHEMA/binding. Never use the normal demo destination."), { code: "HANA_TEST_TARGET_REQUIRED" });
  const model = await cds.load("db/schema.cds");
  db = await cds.connect.to("db", { ...cds.env.requires.db, model, silent: true });
  await db.run("SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY");
  connected = true;
  await require("../srv/lib/hana-operations").assertReady(db, cds, model, config);
  let base = await start();
  const api = async (method, route, body) => {
    const response = await fetch(base + route, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    const value = await response.json();
    assert.ok(response.ok, `API status ${response.status}`);
    return value;
  };
  await check("HANA database identity and schema", async () => {
    const [row] = await db.run("SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY");
    assert.equal(row.CURRENT_SCHEMA, config.schema);
    assert.equal(db.kind, "hana");
  });
  await check("real tools and health APIs", async () => {
    assert.equal((await api("GET", "/health")).db, "connected");
    assert.equal((await api("GET", "/tools")).tools.length, 3);
  });
  const payload = { ...require("../docs/demo-incidents.json")[0], reporterId: "HANA-TEST-" + require("node:crypto").randomUUID() };
  let incidentId;
  await check("incident creation actually writes to HANA", async () => {
    const value = await api("POST", "/incidents", payload);
    incidentId = value.incident.incidentId;
    const row = await db.run(cds.ql.SELECT.one.from("toolsathi.Incident").where({ incidentId }));
    assert.equal(row.rawText, payload.rawText);
    assert.equal(row.reporterId, payload.reporterId);
    assert.equal(row.state, "Reported");
  });
  await check("explicit confirmation persists in HANA", async () => {
    assert.equal((await api("POST", `/incidents/${incidentId}/confirm`, { confirmedBy: payload.reporterId, corrections: {} })).incident.state, "Confirmed");
  });
  await stop();
  base = await start();
  await check("incident survives backend process restart", async () => {
    const value = await api("GET", `/incidents/${incidentId}`);
    assert.equal(value.incident.state, "Confirmed");
    assert.equal(value.incident.rawText, payload.rawText);
  });
  const source = require("../srv/lib/data-transfer").snapshotSqlite(path.join(configuration.projectRoot, "db.sqlite"), model);
  const sqliteData = Object.fromEntries(Object.entries(source.data).map(([name, rows]) => [name.split(".").at(-1), rows]));
  const engine = require("../srv/lib/trace-engine");
  const truth = require("../tests/ground-truth.candidate.json");
  const association = unit => ({ serial: unit.serial, tier: unit.tier, locationStatus: unit.locationStatus, dealerId: unit.dealerId, evidenceIds: unit.evidenceIds, flags: unit.flags, reasonCodes: unit.reasonCodes });
  for (const hours of [24, 72, 168]) await check(`${hours}h HANA trace matches SQLite serials, tiers, locations and evidence`, async () => {
    const value = await api("GET", `/incidents/${incidentId}/trace?window=${hours}`);
    const expected = truth.tools["TOOL-B"][hours];
    const local = engine.buildWindow(sqliteData, sqliteData.Tool.find(tool => tool.toolId === "TOOL-B"), payload.reportedAt, hours);
    assert.equal(value.summary.totalUnits, expected.totalUnits);
    assert.deepEqual(value.summary.byTier, expected.byTier);
    assert.equal(value.summary.byLocation.IN_STOCK, expected.inStock);
    assert.deepEqual(value.summary.shippedByDealer, { "DLR-X": expected.dealerX, "DLR-Y": expected.dealerY });
    assert.equal(value.dataQuality.score, expected.score);
    assert.deepEqual(value.exposureRange, { ...truth.exposureRange, definition: "low=Confirmed in 24h; high=Confirmed+Probable in 7d; Unknown counted separately" });
    assert.deepEqual(value.units.map(association), local.units.map(association));
    assert.deepEqual(value.gaps, local.gaps);
  });
  await check("trace and audit rows exist in the actual HANA database", async () => {
    assert.equal((await db.run(cds.ql.SELECT.from("toolsathi.TraceResult").where({ incidentId }))).length, 3);
    const audit = (await api("GET", `/audit?incident=${incidentId}`)).entries;
    assert.ok(audit.some(row => row.action === "INCIDENT_CREATED"));
    assert.ok(audit.some(row => row.action === "TRACE_GENERATED"));
  });
  await check("database audit UPDATE and DELETE are rejected", async () => {
    const row = await db.run(cds.ql.SELECT.one.from("toolsathi.AuditLog").where({ incidentId }));
    for (const operation of ["update", "delete"]) {
      let rejected = false;
      try {
        await db.tx(async tx => {
          const query = operation === "update" ? cds.ql.UPDATE("toolsathi.AuditLog").set({ reason: "must be denied" }).where({ auditId: row.auditId }) : cds.ql.DELETE.from("toolsathi.AuditLog").where({ auditId: row.auditId });
          await tx.run(query);
          throw new Error("audit mutation unexpectedly allowed");
        });
      } catch (error) { rejected = /append-only/.test(String(error.message)); }
      assert.ok(rejected, `${operation} audit guard`);
    }
  });
  await stop();
  base = await start();
  await check("persisted traces and audit survive another backend restart", async () => {
    const detail = await api("GET", `/incidents/${incidentId}`);
    assert.equal(detail.incident.incidentId, incidentId);
    assert.equal((await db.run(cds.ql.SELECT.from("toolsathi.TraceResult").where({ incidentId }))).length, 3);
    assert.ok((await api("GET", `/audit?incident=${incidentId}`)).entries.length >= 5);
  });
  report.status = "PASSED";
  report.incidentId = incidentId;
  report.groundTruth = "PROVISIONAL; Jamuna sign-off pending";
}
main().catch(error => {
  report.status = report.checks.length || connected ? "FAILED" : "BLOCKED";
  report.failedAt = currentCheck;
  report.error = configuration.diagnostic(error);
  process.exitCode = 1;
}).finally(async () => {
  await stop();
  await db?.disconnect();
  fs.mkdirSync("tests/results", { recursive: true });
  fs.writeFileSync("tests/results/hana-results.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
});
