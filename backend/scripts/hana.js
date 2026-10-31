const config = require("../srv/lib/database-config");
config.loadEnvironment();
const path = require("node:path");
const fs = require("node:fs");
const { backupRoot, within } = require("./paths");
process.chdir(config.projectRoot);
let db, connected = false;
async function main() {
  const cds = require("@sap/cds");
  const operation = process.argv[2];
  const operations = require("../srv/lib/hana-operations");
  const transfer = require("../srv/lib/data-transfer");
  const model = await cds.load("db/schema.cds");
  if (operation === "plan") {
    const plan = operations.deploymentPlan(cds, model);
    const file = path.join(config.projectRoot, "gen/hana-local/schema.sql");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, [...plan.statements, ...plan.audit.map(item => item.sql + ";")].join("\n\n") + "\n");
    console.log(JSON.stringify({ mode: "hana", offlinePlan: true, tables: plan.tables, auditTriggers: 2, ddlFile: file, applied: false }, null, 2));
    return;
  }
  if (operation === "export") {
    const snapshot = transfer.snapshotSqlite(path.join(config.projectRoot, "db.sqlite"), model);
    console.log(JSON.stringify({ exported: true, source: "backend/db.sqlite (read-only consistent snapshot)", sourceSnapshot: transfer.saveSnapshot(snapshot, backupRoot), manifest: snapshot.manifest }, null, 2));
    return;
  }
  if (!["check", "inspect", "deploy", "migrate", "seed"].includes(operation)) throw Object.assign(new Error("Unknown HANA operation."), { code: "HANA_COMMAND_INVALID" });
  const selected = config.configureDatabase(cds, { mode: "hana" });
  const started = Date.now();
  // Inspect without SET SCHEMA first so missing schema is distinguishable from failed authentication.
  const credentials = { ...cds.env.requires.db.credentials };
  if (["check", "inspect"].includes(operation)) delete credentials.schema;
  db = await cds.connect.to("db", { ...cds.env.requires.db, credentials, model, silent: true });
  const [identity] = await db.run("SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY");
  connected = true;
  const metadata = await operations.inspect(db, selected.schema);
  if (["check", "inspect"].includes(operation)) {
    let schemaAccessible = false;
    if (metadata.schemaVisible) {
      await db.tx(async tx => { await tx.run(`SET SCHEMA ${selected.schema}`); await tx.run("SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY"); });
      schemaAccessible = true;
    }
    console.log(JSON.stringify({ connected: true, mode: "hana", driver: "hdb", host: selected.host, durationMs: Date.now() - started, identity, schema: selected.schema, schemaVisible: metadata.schemaVisible, schemaAccessible, ...(operation === "inspect" ? { objects: metadata.objects, privileges: metadata.privileges, privilegeInspection: metadata.privilegeInspection } : {}) }, null, 2));
    if (!schemaAccessible) process.exitCode = 1;
    return;
  }
  config.assertTarget(selected);
  const apply = process.argv.includes("--apply");
  if (operation === "deploy") {
    console.log(JSON.stringify(await operations.deploy(db, cds, model, selected, { apply }), null, 2));
    return;
  }
  await operations.assertReady(db, cds, model, selected);
  let snapshot;
  if (operation === "seed") {
    const rows = require("../db/seed/generate").build();
    const data = Object.fromEntries(transfer.entities(model).map(entity => [entity.name, transfer.canonicalRows(rows[entity.name.split(".").at(-1)] || [], entity)]));
    snapshot = { format: "toolsathi-data-transfer-v1", data, manifest: transfer.manifest(data, transfer.entities(model)) };
  } else {
    const sourceArg = process.argv.find(arg => arg.startsWith("--source="));
    const file = path.resolve(config.projectRoot, sourceArg ? sourceArg.slice(9) : "db.sqlite");
    if (!within(config.projectRoot, file) && !within(backupRoot, file)) throw Object.assign(new Error("Source must be inside backend/ or repository backup/."), { code: "HANA_SOURCE_INVALID" });
    snapshot = transfer.snapshotSqlite(file, model);
  }
  const saved = transfer.saveSnapshot(snapshot, backupRoot);
  console.log(JSON.stringify({ sourceSnapshot: saved, destinationSchema: selected.schema, ...(await transfer.transfer(db, cds, model, snapshot, { apply })) }, null, 2));
}
main().catch(error => {
  console.error(JSON.stringify({ connected, ...config.diagnostic(error) }));
  process.exitCode = 1;
}).finally(async () => { await db?.disconnect(); });
