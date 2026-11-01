const cds = require("@sap/cds");
const fs = require("node:fs");
const { target, assertStopped } = require("./database-files");
async function reset() {
  const file = target();
  assertStopped(file);
  if (fs.existsSync(file)) require("./backup-db")();
  const model = await cds.load("db/schema.cds");
  const db = await cds.connect.to("db");
  try {
    await cds.deploy(model).to(db);
    console.log("Reset synthetic SQLite database. Next incident: TS-0002.");
  } finally {
    await db.disconnect();
  }
}
module.exports = reset;
if (require.main === module)
  reset().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
