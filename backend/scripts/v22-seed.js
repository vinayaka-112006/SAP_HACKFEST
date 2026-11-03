// Explicit V2.2 synthetic demo seed for the persistent SQLite database.
// Never connects to HANA: the database profile rejects any non-SQLite mode.
// --preview is read-only. --apply inserts only missing namespaced records in one
// transaction, skips identical records and refuses conflicting ones.
const path = require("node:path");
const config = require("../srv/lib/database-config");
config.loadEnvironment();
process.chdir(config.projectRoot);
const preview = process.argv.includes("--preview");
const apply = process.argv.includes("--apply");
if (preview === apply) throw Error("Use exactly one of --preview or --apply");
async function main() {
  const cds = require("@sap/cds");
  const seed = require("../db/seed/v22");
  const migration = require("../srv/lib/schema-migration");
  const selected = config.configureDatabase(cds, { mode: "sqlite" });
  const file = cds.env.requires.db.credentials.url;
  const model = await cds.load("db/schema.cds");
  cds.model = model;
  const db = await cds.connect.to("db");
  try {
    if (db.kind !== "sqlite") throw Error("Synthetic V2.2 seeding requires SQLite");
    await migration.ensure(db, {
      file,
      model,
      deploy: () => cds.deploy(model).to(db),
      log: (message) => console.log(message),
    });
    const plan = await db.tx((tx) => seed.apply(tx, { preview: true }));
    if (preview) {
      console.log(
        JSON.stringify(
          {
            database: path.resolve(config.projectRoot, file),
            mode: selected.mode,
            remoteWrites: false,
            version: plan.version,
            scenarioShift: { startsAt: plan.shiftStartsAt, endsAt: plan.shiftEndsAt },
            planned: plan.planned,
            plan: plan.plan.filter((entry) => entry.records),
            traceImpact: plan.traceImpact,
          },
          null,
          2,
        ),
      );
      return;
    }
    const result = await db.tx((tx) => seed.apply(tx));
    const skipped = result.plan.reduce((total, entry) => total + entry.identical, 0);
    const profiles = await db.run(
      "SELECT role, COUNT(*) as records FROM toolsathi_UserProfile WHERE userId LIKE ? GROUP BY role ORDER BY role",
      [seed.graph.prefix + "%"],
    );
    const counts = {};
    for (const row of profiles) counts[row.role] = Number(row.records);
    const scenarios = [];
    for (const scenario of seed.graph.scenarios || []) {
      const [row] = await db.run(
        "SELECT COUNT(*) as records FROM toolsathi_Incident WHERE incidentId = ?",
        [scenario.incidentId],
      );
      scenarios.push({ incidentId: scenario.incidentId, expected: scenario.expected, present: Number(row.records) === 1 });
    }
    if (scenarios.some((scenario) => !scenario.present))
      throw Error("Seeded incidents are missing; relationships were not established");
    console.log(
      JSON.stringify(
        {
          database: path.resolve(config.projectRoot, file),
          mode: selected.mode,
          remoteWrites: false,
          synthetic: true,
          version: result.version,
          scenarioShift: { startsAt: result.shiftStartsAt, endsAt: result.shiftEndsAt },
          inserted: result.inserted,
          skipped,
          conflicting: 0,
          profiles: counts,
          incidents: {
            solved: seed.graph.scenarios.filter((scenario) => scenario.solved).length,
            unresolved: seed.graph.scenarios.filter((scenario) => !scenario.solved).length,
          },
          scenarios,
          traceImpact: result.traceImpact,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.disconnect();
  }
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      code: error.code || "V22_SEED_FAILED",
      message:
        error.code === "DATABASE_MODE_UNSUPPORTED"
          ? "Synthetic V2.2 seeding is SQLite-only; no remote database was contacted."
          : error.message,
      remoteWrites: false,
    }),
  );
  process.exitCode = 1;
});
