const cds = require("@sap/cds");
const path = require("node:path");
const fs = require("node:fs");
const transfer = require("../srv/lib/data-transfer");
const { build } = require("../db/seed/generate");
const { backupRoot } = require("../scripts/paths");
let model, db, snapshot;
beforeAll(async () => {
  model = await cds.load("db/schema.cds");
  const rows = build();
  const data = Object.fromEntries(transfer.entities(model).map(entity => [entity.name, transfer.canonicalRows(rows[entity.name.split(".").at(-1)] || [], entity)]));
  snapshot = { data, manifest: transfer.manifest(data, transfer.entities(model)) };
});
beforeEach(async () => {
  db = await cds.connect.to({ kind: "sqlite", impl: "@cap-js/sqlite", credentials: { url: ":memory:" }, model });
  for (const statement of cds.compile.to.sql(model, { dialect: "sqlite" })) await db.run(statement);
});
afterEach(async () => { await db?.disconnect(); });
test("copy preview performs no writes", async () => {
  const result = await transfer.transfer(db, cds, model, snapshot);
  expect(result.applied).toBe(false);
  expect(result.plan.find(item => item.entity === "toolsathi.Unit").insertRows).toBe(300);
  expect(await db.run(cds.ql.SELECT.from("toolsathi.Unit"))).toHaveLength(0);
});
test("transactional copy verifies all 21 tables and is idempotent", async () => {
  const first = await transfer.transfer(db, cds, model, snapshot, { apply: true });
  expect(first.verified).toBe(true);
  expect(await db.run(cds.ql.SELECT.from("toolsathi.Unit"))).toHaveLength(300);
  expect(await db.run(cds.ql.SELECT.from("toolsathi.Incident"))).toHaveLength(1);
  const second = await transfer.transfer(db, cds, model, snapshot, { apply: true });
  expect(second.plan.every(item => item.insertRows === 0)).toBe(true);
  expect(second.sourceManifest).toEqual(first.sourceManifest);
});
test("a conflicting destination row prevents every insert and is not overwritten", async () => {
  await db.run(cds.ql.INSERT.into("toolsathi.Tool").entries({ toolId: "TOOL-B", state: "Restricted" }));
  await expect(transfer.transfer(db, cds, model, snapshot, { apply: true })).rejects.toMatchObject({ code: "HANA_DATA_CONFLICT" });
  expect(await db.run(cds.ql.SELECT.from("toolsathi.Unit"))).toHaveLength(0);
  expect((await db.run(cds.ql.SELECT.one.from("toolsathi.Tool").where({ toolId: "TOOL-B" }))).state).toBe("Restricted");
});
test("failure late in a copy rolls back prior table inserts", async () => {
  const failing = { kind: "sqlite", tx: fn => db.tx(tx => fn({ run: query => {
    if (query.INSERT?.into.ref[0] === "toolsathi.Unit") throw new Error("injected last-table failure");
    return tx.run(query);
  } })) };
  await expect(transfer.transfer(failing, cds, model, snapshot, { apply: true })).rejects.toThrow("last-table failure");
  expect(await db.run(cds.ql.SELECT.from("toolsathi.Tool"))).toHaveLength(0);
  expect(await db.run(cds.ql.SELECT.from("toolsathi.AuditLog"))).toHaveLength(0);
});
test("read-only SQLite snapshot preserves existing non-seed reports, Unicode, JSON and counters", () => {
  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(backupRoot, { recursive: true });
  const file = path.join(backupRoot, `copy-source-${crypto.randomUUID()}.sqlite`);
  const source = new DatabaseSync(file);
  for (const statement of cds.compile.to.sql(model, { dialect: "sqlite" })) source.exec(statement);
  const raw = "  \u0c9f\u0cc2\u0cb2\u0ccd B\n  ";
  source.prepare("INSERT INTO toolsathi_Incident (incidentId,rawText,missingFields,reportedAt) VALUES (?,?,?,?)").run("TS-0027", raw, '["photo"]', "2026-11-04T05:12:00.1234567Z");
  source.prepare("INSERT INTO toolsathi_Counter (name,value) VALUES (?,?)").run("incident", 9007199254740993n);
  source.close();
  const before = fs.readFileSync(file);
  const result = transfer.snapshotSqlite(file, model);
  expect(result.data["toolsathi.Incident"][0]).toMatchObject({ incidentId: "TS-0027", rawText: raw, missingFields: '["photo"]', reportedAt: "2026-11-04T05:12:00.1234567Z" });
  expect(result.data["toolsathi.Counter"][0].value).toBe("9007199254740993");
  expect(fs.readFileSync(file)).toEqual(before);
});
test("missing source fails without creating a SQLite file", () => {
  const file = path.join(backupRoot, `missing-${crypto.randomUUID()}.sqlite`);
  expect(() => transfer.snapshotSqlite(file, model)).toThrow("does not exist");
  expect(fs.existsSync(file)).toBe(false);
});
test("tampered source manifest is rejected before database access", async () => {
  await expect(transfer.transfer({}, cds, model, { ...snapshot, manifest: [] }, { apply: true })).rejects.toMatchObject({ code: "HANA_SOURCE_INVALID" });
});
