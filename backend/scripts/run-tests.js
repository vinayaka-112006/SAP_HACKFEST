const { spawnSync } = require("node:child_process");
// Keep the ordinary regression suite offline even when backend/.env selects HANA.
const env = { ...process.env, NODE_ENV: "test", CDS_ENV: "test", DATABASE_MODE: "sqlite" };
for (const key of Object.keys(env))
  if (/^cds[_.]requires[_.]db/i.test(key) || ["CDS_CONFIG", "VCAP_SERVICES", "VCAP_SERVICES_FILE_PATH", "SERVICE_BINDING_ROOT"].includes(key)) delete env[key];
// CAP also has its own .env loader. Pin database settings at higher process-env precedence.
Object.assign(env, { CDS_REQUIRES_DB_KIND: "sqlite", CDS_REQUIRES_DB_IMPL: "@cap-js/sqlite", CDS_REQUIRES_DB_CREDENTIALS_URL: ":memory:", CDS_CONFIG: "{}", VCAP_SERVICES: "{}", VCAP_SERVICES_FILE_PATH: "", SERVICE_BINDING_ROOT: "" });
const result = spawnSync(process.execPath, [require.resolve("jest/bin/jest"), "--runInBand", ...process.argv.slice(2)], { env, stdio: "inherit" });
process.exitCode = result.status ?? 1;
