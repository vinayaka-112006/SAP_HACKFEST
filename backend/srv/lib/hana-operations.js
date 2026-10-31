const { entities } = require("./data-transfer");
const { assertTarget } = require("./database-config");
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
function auditStatements() {
  return ["UPDATE", "DELETE"].map(operation => ({
    name: `TOOLSATHI_AUDIT_NO_${operation}`,
    sql: `CREATE TRIGGER TOOLSATHI_AUDIT_NO_${operation} BEFORE ${operation} ON toolsathi_AuditLog FOR EACH ROW BEGIN SIGNAL SQL_ERROR_CODE 10001 SET MESSAGE_TEXT = 'Application audit history is append-only'; END`,
  }));
}
async function inspect(db, schema) {
  const [identity] = await db.run("SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY");
  const schemas = await db.run("SELECT SCHEMA_NAME FROM SYS.SCHEMAS WHERE SCHEMA_NAME = ?", [schema]);
  const objects = await db.run("SELECT OBJECT_NAME, OBJECT_TYPE FROM SYS.OBJECTS WHERE SCHEMA_NAME = ? ORDER BY OBJECT_TYPE, OBJECT_NAME", [schema]);
  const indexes = await db.run("SELECT INDEX_NAME, TABLE_NAME FROM SYS.INDEXES WHERE SCHEMA_NAME = ?", [schema]);
  const constraints = await db.run("SELECT CONSTRAINT_NAME, TABLE_NAME FROM SYS.CONSTRAINTS WHERE SCHEMA_NAME = ?", [schema]);
  let privileges = [], privilegeInspection = "available";
  try {
    privileges = await db.run("SELECT DISTINCT PRIVILEGE FROM SYS.EFFECTIVE_PRIVILEGES WHERE USER_NAME = CURRENT_USER AND SCHEMA_NAME = ? ORDER BY PRIVILEGE", [schema]);
  } catch { privilegeInspection = "unavailable: ask schema owner to review grants"; }
  return { identity, schema, schemaVisible: schemas.length === 1, objects, indexes, constraints, privileges: privileges.map(row => row.PRIVILEGE), privilegeInspection };
}
function assertExclusive(metadata, model) {
  if (!metadata.schemaVisible) fail("HANA_SCHEMA_UNAVAILABLE", "The assigned schema is not visible; no objects or data were changed.");
  const allowed = new Map(entities(model).map(entity => [entity.table.toUpperCase(), "TABLE"]));
  const tables = new Set(allowed.keys());
  // Permit only indexes/constraints proven to belong to these exact application tables.
  for (const index of metadata.indexes || []) if (tables.has(index.TABLE_NAME)) allowed.set(index.INDEX_NAME, "INDEX");
  for (const constraint of metadata.constraints || []) if (tables.has(constraint.TABLE_NAME)) allowed.set(constraint.CONSTRAINT_NAME, "CONSTRAINT");
  for (const item of auditStatements()) allowed.set(item.name, "TRIGGER");
  if (metadata.objects.some(object => allowed.get(object.OBJECT_NAME) !== object.OBJECT_TYPE))
    fail("HANA_SCHEMA_CONFLICT", "The schema contains objects outside the ToolSathi model. Use a dedicated destination; no objects were changed.");
}
function deploymentPlan(cds, model) {
  const statements = cds.compile.to.sql(model, { dialect: "hana", names: "plain" });
  if (!statements.every(sql => /^CREATE TABLE [A-Za-z0-9_]+\s*\(/.test(sql)))
    fail("HANA_MODEL_UNSUPPORTED", "The direct-schema deployer only permits compiler-generated CREATE TABLE statements; use HDI for other artifact types.");
  return { tables: entities(model).map(entity => entity.table.toUpperCase()), statements, audit: auditStatements() };
}
async function validateTables(db, model, schema) {
  const columns = await db.run("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE FROM SYS.TABLE_COLUMNS WHERE SCHEMA_NAME = ?", [schema]);
  const keys = await db.run("SELECT TABLE_NAME, COLUMN_NAME, POSITION FROM SYS.CONSTRAINTS WHERE SCHEMA_NAME = ? AND IS_PRIMARY_KEY = 'TRUE' ORDER BY TABLE_NAME, POSITION", [schema]);
  const tables = new Set(columns.map(column => column.TABLE_NAME));
  for (const entity of entities(model)) {
    const table = entity.table.toUpperCase();
    if (!tables.has(table)) continue;
    const actual = columns.filter(column => column.TABLE_NAME === table);
    if (actual.length !== entity.columns.length) fail("HANA_MODEL_CONFLICT", `${entity.name} has unexpected columns; automatic alteration is forbidden.`);
    if (JSON.stringify(keys.filter(key => key.TABLE_NAME === table).map(key => key.COLUMN_NAME)) !== JSON.stringify(entity.keys.map(key => key.toUpperCase())))
      fail("HANA_MODEL_CONFLICT", `${entity.name} has different primary keys; automatic alteration is forbidden.`);
    for (const key of entity.columns) {
      const element = entity.definition.elements[key];
      const column = actual.find(item => item.COLUMN_NAME === key.toUpperCase());
      const type = { "cds.String": "NVARCHAR", "cds.LargeString": "NCLOB", "cds.Timestamp": "TIMESTAMP", "cds.Date": "DATE", "cds.Boolean": "BOOLEAN", "cds.Integer": "INTEGER", "cds.Integer64": "BIGINT", "cds.Double": "DOUBLE", "cds.Decimal": "DECIMAL" }[element.type];
      if (!column || column.DATA_TYPE_NAME !== type || (element.length && Number(column.LENGTH) !== element.length) || (element.precision && Number(column.LENGTH) !== element.precision) || (element.scale && Number(column.SCALE) !== element.scale) || (element.key && column.IS_NULLABLE !== "FALSE"))
        fail("HANA_MODEL_CONFLICT", `${entity.name}.${key} differs from the CDS model; automatic alteration is forbidden.`);
    }
  }
}
async function deploy(db, cds, model, config, { apply = false, env = process.env } = {}) {
  assertTarget(config, env);
  if (config.connection !== "direct") fail("HANA_HDI_DEPLOY_REQUIRED", "Deploy HDI artifacts through the existing CAP build/HDI deployer; direct DDL is not used against an HDI binding.");
  const metadata = await inspect(db, config.schema);
  assertExclusive(metadata, model);
  await validateTables(db, model, config.schema);
  const plan = deploymentPlan(cds, model);
  const existing = new Set(metadata.objects.map(item => item.OBJECT_NAME));
  const create = plan.statements.filter(sql => !existing.has(/^CREATE TABLE (\w+)/.exec(sql)[1].toUpperCase()));
  const audit = plan.audit.filter(item => !existing.has(item.name));
  // HANA DDL commits individually. Only absent tables/triggers are created, never dropped/replaced.
  if (apply) {
    for (const statement of create) await db.run(statement.replace(/;\s*$/, ""));
    for (const item of audit) await db.run(item.sql);
  }
  return { applied: apply, createTables: create.length, createAuditTriggers: audit.length, statements: [...create, ...audit.map(item => item.sql)] };
}
async function assertReady(db, cds, model, config) {
  const metadata = await inspect(db, config.schema);
  if (config.connection === "direct") assertExclusive(metadata, model);
  await validateTables(db, model, config.schema);
  const present = new Set(metadata.objects.map(item => item.OBJECT_NAME));
  if (entities(model).some(entity => !present.has(entity.table.toUpperCase())))
    fail("HANA_TABLES_MISSING", "All application tables must be deployed before migration/startup.");
  await require("./db-protection").install(db);
  for (const entity of entities(model)) await db.run(cds.ql.SELECT.from(entity.name).limit(1));
  return metadata;
}
module.exports = { inspect, assertExclusive, deploymentPlan, validateTables, deploy, assertReady, auditStatements };
