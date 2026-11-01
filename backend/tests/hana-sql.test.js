// Exercise the installed HANA compiler/adapter without opening a remote connection.
const cds = require("@sap/cds");
let db, model;
beforeAll(async () => {
  model = await cds.load("db/schema.cds");
  db = await cds.connect.to({ kind: "hana", impl: "@cap-js/hana", driver: "hdb", credentials: { host: "never-contact.invalid", port: 443, user: "offline-test", password: "offline-test", schema: "TOOLSATHI_TEST", encrypt: true, sslValidateCertificate: true }, model });
  Object.defineProperty(db, "factory", { get() { throw Error("Offline HANA compiler test attempted to connect"); } });
});
test("the same CDS model compiles all tables with HANA LOB, timestamp and decimal types", () => {
  const sql = cds.compile.to.sql(model, { dialect: "hana" });
  expect(sql).toHaveLength(21);
  expect(sql.join("\n")).toContain("rawText NCLOB");
  expect(sql.join("\n")).toContain("value DECIMAL(15, 2)");
  expect(sql.join("\n")).toContain('"TIMESTAMP" TIMESTAMP');
});
test("HANA SELECT handles audit ordering, identifier casing and row locks", () => {
  const query = cds.ql.SELECT.from("toolsathi.AuditLog").where({ incidentId: "TS-0002" }).orderBy("timestamp", "auditId");
  const rendered = db.cqn2sql(query);
  expect(rendered.sql).toMatch(/TOOLSATHI_AUDITLOG|toolsathi_AuditLog/);
  expect(rendered.sql).toContain('"TIMESTAMP"');
  expect(rendered.sql).not.toMatch(/sqlite_master|PRAGMA/);
  const locked = db.cqn2sql(cds.ql.SELECT.one.from("toolsathi.Incident").where({ incidentId: "TS-0002" }).forUpdate());
  expect(locked.sql).toMatch(/FOR UPDATE/i);
});
test("atomic counter increment renders as a database-side update for HANA", () => {
  const query = cds.ql.UPDATE("toolsathi.Counter").set({ value: { "+=": 1 } }).where({ name: "incident" });
  expect(db.cqn2sql(query).sql).toMatch(/value\s*=\s*(?:"[^"]+"\.)?value\s*\+/i);
});
test("HANA insert binds original Unicode text and JSON LOB values", () => {
  const rawText = "  \u0c9f\u0cc2\u0cb2\u0ccd B\n  ";
  const result = db.cqn2sql(cds.ql.INSERT.into("toolsathi.Incident").entries({ incidentId: "TS-0002", rawText, missingFields: '["photo"]', confidence: null }));
  expect(result.sql).toMatch(/INSERT INTO/i);
  expect(result.sql).not.toContain(rawText);
});
test("transfer verification renders full HANA timestamp precision instead of FF3", () => {
  const transfer = require("../srv/lib/data-transfer");
  const entity = transfer.entities(model).find(item => item.name === "toolsathi.Incident");
  const rendered = db.cqn2sql(transfer.readQuery(cds, entity, "hana"));
  expect(rendered.values).toContain('YYYY-MM-DD"T"HH24:MI:SS.FF7"Z"');
  expect(rendered.sql).not.toContain("FF3");
});
