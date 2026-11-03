const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { DatabaseSync } = require("node:sqlite");
const { backupRoot } = require("../scripts/paths");
const { configureDatabase } = require("../srv/lib/database-config");
const migration = require("../srv/lib/schema-migration");

jest.setTimeout(60000);
const cds = require("@sap/cds");
let directory, file, model, db;

beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(backupRoot, "migration-test-"));
  file = path.join(directory, "legacy.sqlite");
  // A pre-V2.2 database: baseline tables with data and no V2.2 entities.
  const legacy = new DatabaseSync(file);
  legacy.exec(`CREATE TABLE toolsathi_Tool (
    toolId NVARCHAR(120) NOT NULL,
    type NVARCHAR(120),
    "line" NVARCHAR(120),
    workCenter NVARCHAR(120),
    state NVARCHAR(120),
    calibrationDue DATE_TEXT,
    usageCount INTEGER,
    PRIMARY KEY(toolId)
  )`);
  legacy.exec(`INSERT INTO toolsathi_Tool (toolId, type, state, usageCount) VALUES
    ('TOOL-B','TORQUE','Active',200),
    ('LEGACY-KEPT','PRESS','Active',7)`);
  legacy.close();
  configureDatabase(cds, { env: { NODE_ENV: "development", SQLITE_FILE: file } });
  model = await cds.load("db/schema.cds");
  cds.model = model;
  db = await cds.connect.to("db");
});

afterAll(async () => {
  await db?.disconnect();
  fs.rmSync(directory, { recursive: true, force: true });
});

test("legacy database is missing the additive V2.2 tables", async () => {
  expect(await migration.missing(db)).toContain("toolsathi_UserAuthorization");
  expect(await migration.columns(db, "toolsathi_Tool")).not.toContain("lastVerifiedGood");
});

test("migration creates only missing tables and columns, with a verified backup", async () => {
  const receipt = await migration.ensure(db, { file, model, log: () => {} });
  expect(receipt.migrated).toBe(true);
  expect(receipt.mode).toBe("additive");
  expect(receipt.createdTables).toContain("toolsathi_UserProfile");
  expect(receipt.addedColumns).toContain("toolsathi_Tool.lastVerifiedGood");
  expect(receipt.preservedRecords).toBeGreaterThanOrEqual(2);
  expect(fs.existsSync(path.join(backupRoot, receipt.backup))).toBe(true);
  expect(await migration.missing(db)).toEqual([]);
  // Existing rows are preserved; the CSV baseline is never re-inserted by a migration.
  const [count] = await db.run("SELECT COUNT(*) as records FROM toolsathi_Tool");
  expect(Number(count.records)).toBe(2);
  const [kept] = await db.run("SELECT usageCount FROM toolsathi_Tool WHERE toolId='LEGACY-KEPT'");
  expect(Number(kept.usageCount)).toBe(7);
});

test("re-running the migration is idempotent", async () => {
  const before = fs.readdirSync(backupRoot).length;
  const receipt = await migration.ensure(db, { file, model, log: () => {} });
  expect(receipt.migrated).toBe(false);
  expect(fs.readdirSync(backupRoot).length).toBe(before);
});

test("operations dashboards report the additive schema as available", async () => {
  const operations = require("../srv/lib/operations");
  expect(await operations.available(db)).toBe(true);
});
