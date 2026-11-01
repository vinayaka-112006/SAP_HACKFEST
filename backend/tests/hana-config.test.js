const { directCredentials, configureDatabase, assertTarget, diagnostic } = require("../srv/lib/database-config");
const { execFileSync, spawnSync } = require("node:child_process");
const { assertExclusive, deploymentPlan, deploy } = require("../srv/lib/hana-operations");
const valid = () => ({ HANA_SQL_ENDPOINT: "example.hana.hanacloud.ondemand.com:443", HANA_USER: "TOOLSATHI_APP", HANA_PASSWORD: "test-only-not-a-real-password", HANA_SCHEMA: "TOOLSATHI" });
const cap = () => ({ env: { requires: { db: { kind: "sqlite", credentials: { url: "db.sqlite" } } }, sql: {} }, log: jest.fn() });
test("direct credentials map to the installed hdb adapter with verified TLS", () => {
  const cds = cap();
  const config = configureDatabase(cds, { mode: "hana", env: valid() });
  expect(config).toEqual({ mode: "hana", connection: "direct", host: "example.hana.hanacloud.ondemand.com", schema: "TOOLSATHI" });
  expect(cds.env.requires.db).toMatchObject({ kind: "hana", impl: "@cap-js/hana", driver: "hdb", credentials: { host: valid().HANA_SQL_ENDPOINT.split(":")[0], port: 443, schema: "TOOLSATHI", encrypt: true, sslValidateCertificate: true, useTLS: true, rejectUnauthorized: true } });
  expect(cds.env.requires.db.credentials.url).toBeUndefined();
});
test.each([
  ["HANA_SQL_ENDPOINT", "https://example.com:443/path"],
  ["HANA_SQL_ENDPOINT", "example.com:0"],
  ["HANA_SQL_ENDPOINT", "example.com:65536"],
  ["HANA_SCHEMA", "SYS"],
  ["HANA_SCHEMA", "_SYS_BIC"],
  ["HANA_SCHEMA", "TOOLSATHI; DROP SCHEMA X"],
  ["HANA_ENCRYPT", "false"],
  ["HANA_VALIDATE_CERTIFICATE", "false"],
  ["HANA_USER", "SYSTEM"],
  ["HANA_USER", "DBADMIN"],
])("unsafe or invalid %s configuration is rejected (%s)", (key, value) => {
  expect(() => directCredentials({ ...valid(), [key]: value })).toThrow();
});
test("missing credentials name required fields without disclosing values", () => {
  expect(() => directCredentials({})).toThrow("HANA_PASSWORD");
  expect(() => directCredentials({ ...valid(), HANA_PASSWORD: "your_database_password" })).toThrow("HANA_PASSWORD");
});
test("ordinary tests cannot select HANA and SQLite is isolated", () => {
  expect(() => configureDatabase(cap(), { mode: "hana", env: { ...valid(), NODE_ENV: "test" } })).toThrow("Default tests may not use HANA");
  const cds = cap();
  configureDatabase(cds, { env: { NODE_ENV: "test", DATABASE_MODE: "sqlite" } });
  expect(cds.env.requires.db.credentials.url).toBe(":memory:");
});
test("explicit SQLite startup overrides .env mode without needing HANA credentials", () => {
  const cds = cap();
  configureDatabase(cds, { mode: "sqlite", env: { DATABASE_MODE: "hana" } });
  expect(cds.env.requires.db.kind).toBe("sqlite");
  expect(cds.env.requires.db.credentials.url).toBe("db.sqlite");
});
test("CAP binding credentials stay intact and are not replaced by SQLite credentials", () => {
  const cds = cap();
  cds.env.requires.db = { kind: "hana", credentials: { host: "example.com", port: 443, user: "HDI_APP", password: "test-only", schema: "HDI_123", certificate: "test-ca" } };
  expect(configureDatabase(cds, { env: { NODE_ENV: "production" } }).connection).toBe("binding");
  expect(cds.env.requires.db.credentials.certificate).toBe("test-ca");
  expect(cds.env.requires.db.credentials.sslValidateCertificate).toBe(true);
});
test("HANA mode with no credentials fails instead of falling back", () => {
  expect(() => configureDatabase(cap(), { mode: "hana", env: {} })).toThrow("Bind an existing ToolSathi HDI container");
});
test("remote changes require the exact owner-confirmed target", () => {
  expect(() => assertTarget({ mode: "hana", schema: "TOOLSATHI" }, {})).toThrow("exclusively for ToolSathi");
  expect(() => assertTarget({ mode: "hana", schema: "TOOLSATHI" }, { HANA_TARGET_CONFIRMED: "TOOLSATHI_TEST" })).toThrow();
  expect(() => assertTarget({ mode: "hana", schema: "TOOLSATHI" }, { HANA_TARGET_CONFIRMED: "TOOLSATHI" })).not.toThrow();
});
test("diagnostics omit raw driver messages and secrets", () => {
  for (const code of [10, 258, 362, 259, "ENOTFOUND", "CERT_HAS_EXPIRED", "ETIMEDOUT", "OTHER"]) {
    const safe = diagnostic({ code, message: "private-password-and-connection-object" });
    expect(JSON.stringify(safe)).not.toContain("private-password");
    expect(safe.code).toMatch(/^HANA_/);
  }
});
test("HANA compiler plan contains only CREATE tables and append-only triggers", async () => {
  const cds = require("@sap/cds"), model = await cds.load("db/schema.cds");
  const plan = deploymentPlan(cds, model);
  expect(plan.tables).toHaveLength(21);
  expect(plan.statements.every(statement => statement.startsWith("CREATE TABLE"))).toBe(true);
  expect(plan.audit.map(item => item.sql).join("\n")).not.toMatch(/DROP|REPLACE|TRUNCATE/);
  expect(() => assertExclusive({ schemaVisible: true, objects: [{ OBJECT_NAME: "OTHER_APP", OBJECT_TYPE: "TABLE" }] }, model)).toThrow("outside the ToolSathi model");
  expect(() => assertExclusive({ schemaVisible: true, objects: [{ OBJECT_NAME: "TOOLSATHI_TOOL", OBJECT_TYPE: "VIEW" }] }, model)).toThrow();
});
test("HDI bindings are never subjected to the direct-schema deployer", async () => {
  await expect(deploy({}, {}, {}, { mode: "hana", schema: "HDI_123", connection: "binding" }, { apply: true, env: { HANA_TARGET_CONFIRMED: "HDI_123" } })).rejects.toMatchObject({ code: "HANA_HDI_DEPLOY_REQUIRED" });
});
test("the catalog's own SCHEMA row is permitted without permitting foreign objects", async () => {
  const cds = require("@sap/cds"), model = await cds.load("db/schema.cds");
  const metadata = { schema: "TOOLSATHI", schemaVisible: true, objects: [{ OBJECT_NAME: null, OBJECT_TYPE: "SCHEMA" }] };
  expect(() => assertExclusive(metadata, model)).not.toThrow();
  expect(() => assertExclusive({ ...metadata, objects: [{ OBJECT_NAME: "OTHER_SCHEMA", OBJECT_TYPE: "SCHEMA" }] }, model)).toThrow("outside the ToolSathi model");
  expect(() => assertExclusive({ ...metadata, objects: [...metadata.objects, { OBJECT_NAME: "OTHER_TABLE", OBJECT_TYPE: "TABLE" }] }, model)).toThrow("outside the ToolSathi model");
});
test("a HANA primary-key index appearing in both catalogs retains its INDEX type", async () => {
  const cds = require("@sap/cds"), model = await cds.load("db/schema.cds");
  const metadata = {
    schema: "TOOLSATHI", schemaVisible: true,
    objects: [{ OBJECT_NAME: "_SYS_PRIMARY_TOOL", OBJECT_TYPE: "INDEX" }],
    indexes: [{ INDEX_NAME: "_SYS_PRIMARY_TOOL", TABLE_NAME: "TOOLSATHI_TOOL" }],
    constraints: [{ CONSTRAINT_NAME: "_SYS_PRIMARY_TOOL", TABLE_NAME: "TOOLSATHI_TOOL" }],
  };
  expect(() => assertExclusive(metadata, model)).not.toThrow();
  expect(() => assertExclusive({ ...metadata, indexes: [{ INDEX_NAME: "_SYS_PRIMARY_TOOL", TABLE_NAME: "OTHER_APP" }], constraints: [] }, model)).toThrow("outside the ToolSathi model");
});
test("test environment never loads a developer .env file", () => {
  const out = execFileSync(process.execPath, ["-e", "process.loadEnvFile=()=>{throw Error('must not load')};require('./srv/lib/database-config').loadEnvironment();console.log('isolated')"], { env: { ...process.env, NODE_ENV: "test" }, encoding: "utf8" });
  expect(out.trim()).toBe("isolated");
});
test("native .env loading occurs before CAP configuration and never prints the password", () => {
  const fs = require("node:fs"), path = require("node:path");
  const file = path.join(require("../scripts/paths").backupRoot, `env-check-${crypto.randomUUID()}.env`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'DATABASE_MODE=hana\nHANA_CONNECTION=direct\nHANA_SQL_ENDPOINT=example.com:443\nHANA_USER=TOOLSATHI_APP\nHANA_PASSWORD="test-only#quoted"\nHANA_SCHEMA=TOOLSATHI\nHANA_ENCRYPT=true\nHANA_VALIDATE_CERTIFICATE=true\n');
  const env = { ...process.env, NODE_ENV: "development", CDS_ENV: "development" };
  for (const key of Object.keys(env)) if (/^HANA_|^DATABASE_MODE$/.test(key)) delete env[key];
  const script = "const config=require('./srv/lib/database-config');config.loadEnvironment(process.argv[1]);const cds=require('@sap/cds');const selected=config.configureDatabase(cds);console.log(JSON.stringify({mode:selected.mode,port:cds.env.requires.db.credentials.port,passwordLoaded:cds.env.requires.db.credentials.password==='test-only#quoted',tls:cds.env.requires.db.credentials.sslValidateCertificate}))";
  const output = execFileSync(process.execPath, ["-e", script, file], { env, encoding: "utf8" });
  expect(JSON.parse(output)).toEqual({ mode: "hana", port: 443, passwordLoaded: true, tls: true });
  expect(output).not.toContain("test-only#quoted");
});
test("real startup with incomplete HANA credentials exits nonzero without exposing a supplied password", () => {
  const env = { ...process.env, NODE_ENV: "development", CDS_ENV: "development", HANA_CONNECTION: "direct", HANA_PASSWORD: "never-print-this-test-secret" };
  for (const key of ["HANA_SQL_ENDPOINT", "HANA_USER", "HANA_SCHEMA"]) env[key] = "";
  const result = spawnSync(process.execPath, ["srv/server.js", "--database=hana"], { env, encoding: "utf8", timeout: 20000 });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("HANA_CREDENTIALS_MISSING");
  expect(result.stderr + result.stdout).not.toContain(env.HANA_PASSWORD);
});
