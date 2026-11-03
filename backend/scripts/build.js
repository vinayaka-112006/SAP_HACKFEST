const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const result = spawnSync(
  process.execPath,
  [require.resolve("@sap/cds-dk/bin/cds.js"), "build", "--production"],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
// The router loader resolves public fixed fixtures relative to the packaged runtime.
fs.cpSync("docs/examples", "gen/srv/docs/examples", { recursive: true });
// SQLite deployment and local scenarios need the baseline fixtures and seed modules.
// The CDS model is already compiled into gen/srv/srv/csn.json; copying schema.cds
// would compile the same entities twice.
for (const folder of ["data", "seed"])
  fs.cpSync(`db/${folder}`, `gen/srv/db/${folder}`, {
    recursive: true,
    filter: source => !source.endsWith(".sqlite") && !source.endsWith(".sqlite-wal"),
  });
console.log("Packaged runtime fixtures for remaining external stub routes.");
