const fs = require("node:fs");
const path = require("node:path");
const projectRoot = path.resolve(__dirname, "../..");
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
function isTest(env = process.env) {
  return env.NODE_ENV === "test" || (env.CDS_ENV || "").split(",").includes("test");
}
function loadEnvironment(file = path.join(projectRoot, ".env")) {
  if (!isTest() && fs.existsSync(file)) process.loadEnvFile(file);
}
function schemaName(value) {
  if (!value || !/^[A-Z0-9_]{1,127}$/.test(value) || /^(SYS|SYSTEM|PUBLIC|INFORMATION_SCHEMA)$|^_SYS/.test(value))
    fail("HANA_SCHEMA_REQUIRED", "Use an assigned application schema in uppercase letters, digits and underscores; system/shared schemas are forbidden.");
  return value;
}
function directCredentials(env) {
  const required = ["HANA_SQL_ENDPOINT", "HANA_USER", "HANA_PASSWORD", "HANA_SCHEMA"];
  const missing = required.filter(key => !env[key] || /^your[_-]/i.test(env[key]));
  if (missing.length) fail("HANA_CREDENTIALS_MISSING", `Configure backend/.env: ${missing.join(", ")}.`);
  const match = /^([a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?):([0-9]{1,5})$/.exec(env.HANA_SQL_ENDPOINT);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 65535)
    fail("HANA_ENDPOINT_INVALID", "HANA_SQL_ENDPOINT must be a SQL hostname:port, without an HTTPS URL or path.");
  if (["SYSTEM", "DBADMIN"].includes(env.HANA_USER.toUpperCase()))
    fail("HANA_APP_USER_REQUIRED", "Use a dedicated ToolSathi database account instead of SYSTEM or DBADMIN.");
  for (const key of ["HANA_ENCRYPT", "HANA_VALIDATE_CERTIFICATE"])
    if (env[key] !== undefined && env[key] !== "true") fail("HANA_TLS_REQUIRED", `${key} must be true.`);
  return {
    host: match[1], port: Number(match[2]), user: env.HANA_USER,
    password: env.HANA_PASSWORD, schema: schemaName(env.HANA_SCHEMA),
    encrypt: true, sslValidateCertificate: true, useTLS: true, rejectUnauthorized: true,
    initializationTimeout: 10000,
  };
}
function configureDatabase(cds, { mode, env = process.env } = {}) {
  const testing = isTest(env);
  const requested = mode || env.DATABASE_MODE || (cds.env.requires.db.kind === "hana" ? "hana" : "sqlite");
  if (!["sqlite", "hana"].includes(requested)) fail("DATABASE_MODE_INVALID", "DATABASE_MODE must be sqlite or hana.");
  if (testing && requested === "hana") fail("HANA_TEST_GUARD", "Default tests may not use HANA; use the separate test:hana command.");
  if (requested === "sqlite") {
    if (env.NODE_ENV === "production") fail("SQLITE_PRODUCTION_FORBIDDEN", "Production requires the HANA service binding.");
    cds.env.requires.db = {
      ...cds.env.requires.db, kind: "sqlite", impl: "@cap-js/sqlite",
      credentials: { url: testing ? ":memory:" : cds.env.requires.db.credentials?.url || "db.sqlite" },
    };
    cds.env.sql.dialect = "sqlite";
    return { mode: "sqlite" };
  }
  const connection = env.HANA_CONNECTION || (env.HANA_SQL_ENDPOINT ? "direct" : "binding");
  if (!["direct", "binding"].includes(connection)) fail("HANA_CONNECTION_INVALID", "HANA_CONNECTION must be direct or binding.");
  // VCAP/CDS service binding resolution remains CAP's responsibility. Never manufacture an HDI key.
  const credentials = connection === "direct" ? directCredentials(env) : { ...cds.env.requires.db.credentials };
  if (connection === "binding") {
    if (!credentials.host || !credentials.user || !credentials.password || !credentials.schema)
      fail("HANA_BINDING_MISSING", "Bind an existing ToolSathi HDI container, or configure HANA_CONNECTION=direct with all HANA variables.");
    schemaName(credentials.schema);
    if (credentials.sslValidateCertificate === false || credentials.validate_certificate === false || credentials.rejectUnauthorized === false)
      fail("HANA_TLS_REQUIRED", "The HANA binding must validate the server certificate.");
    Object.assign(credentials, { encrypt: true, sslValidateCertificate: true, useTLS: true, rejectUnauthorized: true });
    delete credentials.url;
  }
  cds.env.requires.db = {
    ...cds.env.requires.db, kind: "hana", impl: "@cap-js/hana", driver: "hdb", credentials,
    pool: { min: 0, max: 5, acquireTimeoutMillis: 15000, idleTimeoutMillis: 1000 },
  };
  cds.env.sql.dialect = "hana";
  cds.env.sql.names = "plain";
  // Suppress SQL/connection debug output; diagnostics below use an explicit safe allowlist.
  cds.log("sql", { level: "error" });
  cds.log("db", { level: "error" });
  return { mode: "hana", connection, host: credentials.host, schema: credentials.schema };
}
function assertTarget(config, env = process.env) {
  if (config.mode !== "hana" || env.HANA_TARGET_CONFIRMED !== config.schema)
    fail("HANA_TARGET_NOT_CONFIRMED", "After the owner confirms this destination is exclusively for ToolSathi, set HANA_TARGET_CONFIRMED to the exact application schema.");
}
function diagnostic(error) {
  const known = String(error.code || "");
  if (/^(HANA_|DATABASE_MODE_|SQLITE_PRODUCTION_)/.test(known)) return { code: known, message: error.message };
  const text = String(error.message || "");
  let code = "HANA_CONNECTION_FAILED", message = "HANA operation failed; inspect connectivity, schema assignment and account privileges.";
  if (known === "10" || /authentication failed|invalid user|invalid password/i.test(text)) [code, message] = ["HANA_AUTH_FAILED", "Database authentication failed. Check the account/password and account lock status."];
  else if (/ENOTFOUND|EAI_AGAIN/.test(known + " " + text)) [code, message] = ["HANA_DNS_FAILED", "SQL endpoint DNS resolution failed."];
  else if (/CERT|TLS|SSL/.test(known) || /certificate/i.test(text)) [code, message] = ["HANA_TLS_FAILED", "TLS certificate verification failed. Correct the endpoint or trusted CA; keep validation enabled."];
  else if (/TIMEOUT|ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH/.test(known + " " + text) || /timeout|timed out/i.test(text)) [code, message] = ["HANA_NETWORK_FAILED", "Cannot reach the HANA SQL endpoint. Check VPN/firewall, IP allowlisting and instance status."];
  else if (known === "362") [code, message] = ["HANA_SCHEMA_UNAVAILABLE", "The assigned schema is missing or inaccessible; ask its owner to provision/grant access."];
  else if (known === "258") [code, message] = ["HANA_PRIVILEGES_MISSING", "The database account lacks the required schema/object privileges."];
  else if (known === "259") [code, message] = ["HANA_TABLES_MISSING", "Application tables are not deployed; run the reviewed deployment for the assigned target."];
  return { code, message };
}
module.exports = { loadEnvironment, configureDatabase, directCredentials, schemaName, assertTarget, diagnostic, isTest, projectRoot };
