// Additive SQLite schema migration for the persistent V2.2 development database.
// Creates only missing tables/columns/indices; never drops or rewrites existing rows.
// CAP's full `cds.deploy` re-creates tables and re-runs CSV initial data, so it is
// deliberately not used against an existing development database.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { projectRoot } = require("./database-config");
const backupRoot = path.resolve(projectRoot, "../backup");

// Tables introduced after the V2.1 baseline database was created.
const V22_TABLES = [
  "UserProfile",
  "UserInvitation",
  "UserProfileDetail",
  "UserAuthorization",
  "TechnicianQualification",
  "EquipmentRequirement",
  "RepairWorkOrder",
  "IncidentRelationship",
  "ConversationSession",
  "UserNotification",
  "NotificationRead",
  "SparePart",
  "PartReservation",
  "WorkforceProfile",
  "WorkStation",
  "WorkStationOperation",
  "ProductionDemand",
  "TemporaryAssignment",
  "AssignmentDetail",
  "AllocationPolicy",
  "AllocationPlan",
  "IssueOperation",
  "ExposureReport",
];
const physical = (entity) => entity.replace(/\./g, "_");
const required = () => V22_TABLES.map((name) => "toolsathi_" + name);

const CREATE_TABLE = /^CREATE TABLE (?:IF NOT EXISTS )?["'`]?([A-Za-z0-9_]+)["'`]?\s*\(/i;
const CREATE_INDEX = /^CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?["'`]?[A-Za-z0-9_]+["'`]?\s+ON\s+["'`]?([A-Za-z0-9_]+)["'`]?/i;
const CONSTRAINT = /^(?:PRIMARY|UNIQUE|CONSTRAINT|FOREIGN|CHECK)\b/i;

function splitStatements(compiled) {
  // cds.compile.to.sql returns an array of statements; keep them separated.
  return (Array.isArray(compiled) ? compiled.join(";\n") : String(compiled))
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => statement + ";");
}

function columnsOf(createStatement) {
  const open = createStatement.indexOf("(");
  const close = createStatement.lastIndexOf(")");
  const body = createStatement.slice(open + 1, close);
  const definitions = [];
  let depth = 0;
  let current = "";
  for (const character of body) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      definitions.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  if (current.trim()) definitions.push(current.trim());
  return definitions.filter((line) => line && !CONSTRAINT.test(line));
}

function columnName(definition) {
  const match = /^["'`]?([A-Za-z0-9_]+)["'`]?\s/.exec(definition);
  return match ? match[1] : null;
}

async function plan(model) {
  const compiled = await require("@sap/cds").compile.to.sql(model, { dialect: "sqlite" });
  const statements = splitStatements(compiled);
  const tables = new Map();
  for (const statement of statements) {
    const table = CREATE_TABLE.exec(statement);
    if (table) {
      tables.set(table[1], { table: table[1], create: statement, indexes: [], columns: columnsOf(statement) });
      continue;
    }
    const index = CREATE_INDEX.exec(statement);
    if (index && tables.has(index[1])) tables.get(index[1]).indexes.push(statement);
  }
  return tables;
}

async function tables(db) {
  const rows = await db.run(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'toolsathi!_%' ESCAPE '!'",
  );
  return new Set(rows.map((row) => row.name));
}

async function columns(db, table) {
  const rows = await db.run(`PRAGMA table_info("${table}")`);
  return new Set(rows.map((row) => row.name));
}

async function missing(db) {
  const present = await tables(db);
  return required().filter((name) => !present.has(name));
}

async function counts(db, names) {
  const result = {};
  for (const name of names) {
    const [row] = await db.run(`SELECT COUNT(*) as records FROM "${name}"`);
    result[name] = Number(row.records);
  }
  return result;
}

async function backup(file) {
  const source = path.resolve(projectRoot, file);
  if (!fs.existsSync(source)) return null; // Fresh database: nothing to preserve.
  fs.mkdirSync(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.resolve(
    backupRoot,
    `db-pre-v22-${stamp}-${crypto.randomUUID().slice(0, 8)}.sqlite`,
  );
  if (!destination.startsWith(backupRoot + path.sep))
    throw Object.assign(new Error("Backup destination must stay inside the repository backup directory"), {
      code: "BACKUP_PATH_INVALID",
    });
  // A consistent snapshot, including any WAL content, without copying a live file.
  const { DatabaseSync } = require("node:sqlite");
  const connection = new DatabaseSync(source);
  try {
    try {
      connection.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      /* Not in WAL mode; VACUUM INTO below still produces a consistent copy. */
    }
    connection.exec(`VACUUM INTO '${destination.replace(/'/g, "''")}'`);
  } finally {
    connection.close();
  }
  if (!fs.existsSync(destination) || fs.statSync(destination).size === 0)
    throw Object.assign(new Error("Schema backup could not be written; migration aborted"), {
      code: "BACKUP_FAILED",
    });
  return { file: path.basename(destination), source: path.basename(source) };
}

async function verifyBackup(snapshot, before) {
  const { DatabaseSync } = require("node:sqlite");
  const connection = new DatabaseSync(path.join(backupRoot, snapshot.file));
  try {
    for (const [table, records] of Object.entries(before)) {
      const row = connection.prepare(`SELECT COUNT(*) as records FROM "${table}"`).get();
      if (Number(row.records) !== records)
        throw Object.assign(
          new Error(`Backup verification failed for ${table}; migration aborted`),
          { code: "BACKUP_VERIFY_FAILED" },
        );
    }
  } finally {
    connection.close();
  }
}

async function ensure(db, { model, file, deploy, log = console.log } = {}) {
  if (db.kind !== "sqlite")
    throw Object.assign(new Error("Schema migration requires SQLite"), { code: "DATABASE_MODE_UNSUPPORTED" });
  const memory = String(file || "").includes(":memory:") || !file;
  const expected = await plan(model);
  const present = await tables(db);
  if (!present.size) {
    // Empty database: the standard initial deployment also loads the baseline fixtures.
    if (typeof deploy !== "function")
      throw Object.assign(new Error("Initial schema deployment is unavailable"), { code: "V22_SCHEMA_REQUIRED" });
    await deploy();
    const created = await tables(db);
    for (const table of expected.keys())
      if (!created.has(table))
        throw Object.assign(new Error("Initial schema is incomplete: " + table), { code: "V22_SCHEMA_REQUIRED" });
    log(`Initialized SQLite schema (${created.size} tables).`);
    return {
      migrated: true,
      mode: "initial",
      createdTables: [...created],
      addedColumns: [],
      preservedTables: 0,
      preservedRecords: 0,
      backup: null,
      missing: [],
    };
  }
  const create = [];
  const alter = [];
  for (const [table, definition] of expected) {
    if (!present.has(table)) {
      create.push(definition);
      continue;
    }
    const existing = await columns(db, table);
    for (const column of definition.columns) {
      const name = columnName(column);
      if (!name || existing.has(name)) continue;
      alter.push({ table, column: name, statement: `ALTER TABLE "${table}" ADD COLUMN ${column};` });
    }
  }
  if (!create.length && !alter.length)
    return { migrated: false, created: [], altered: [], backup: null, missing: [] };
  const before = present.size ? await counts(db, [...present].filter((name) => name.startsWith("toolsathi_"))) : {};
  const snapshot = memory ? null : await backup(file);
  if (snapshot) await verifyBackup(snapshot, before);
  // Never add a mandatory column to a table that already holds rows.
  for (const change of alter) {
    if (/\bNOT NULL\b/i.test(change.statement) && before[change.table])
      throw Object.assign(
        new Error(`Cannot add required column ${change.table}.${change.column} to a populated table`),
        { code: "MIGRATION_REQUIRES_MANUAL_REVIEW" },
      );
  }
  for (const definition of create) {
    await db.run(definition.create);
    for (const index of definition.indexes) await db.run(index);
  }
  for (const change of alter) await db.run(change.statement);
  // Post-conditions: every expected table/column exists and nothing was lost.
  const after = await tables(db);
  for (const table of expected.keys())
    if (!after.has(table))
      throw Object.assign(new Error("Additive V2.2 schema is incomplete: " + table), { code: "V22_SCHEMA_REQUIRED" });
  const remaining = await missing(db);
  if (remaining.length)
    throw Object.assign(new Error("Additive V2.2 schema is incomplete: " + remaining.join(", ")), {
      code: "V22_SCHEMA_REQUIRED",
    });
  const unchanged = await counts(db, Object.keys(before));
  const changed = Object.keys(before).filter((table) => before[table] !== unchanged[table]);
  if (changed.length)
    throw Object.assign(new Error("Additive migration altered existing record counts: " + changed.join(", ")), {
      code: "MIGRATION_DATA_LOSS",
    });
  const receipt = {
    at: new Date().toISOString(),
    mode: "additive",
    createdTables: create.map((definition) => definition.table),
    addedColumns: alter.map((change) => `${change.table}.${change.column}`),
    preservedTables: Object.keys(before).length,
    preservedRecords: Object.values(before).reduce((a, b) => a + b, 0),
    backup: snapshot?.file || null,
  };
  if (!memory) {
    fs.mkdirSync(backupRoot, { recursive: true });
    fs.writeFileSync(
      path.join(backupRoot, `v22-migration-${receipt.at.replace(/[:.]/g, "-")}.json`),
      JSON.stringify(receipt, null, 2) + "\n",
    );
  }
  log(
    `Applied additive V2.2 SQLite schema (${receipt.createdTables.length} tables, ${receipt.addedColumns.length} columns; ${receipt.preservedRecords} existing records preserved${snapshot ? "; verified backup " + snapshot.file : ""}).`,
  );
  return { migrated: true, missing: [], ...receipt, backup: snapshot?.file || null };
}

module.exports = { V22_TABLES, physical, required, missing, ensure, backup, plan, tables, columns };
