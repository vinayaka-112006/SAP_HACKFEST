const cds = require("@sap/cds");
const { target } = require("./database-files");
async function checkpoint() {
  const file = target();
  require("../srv/lib/local-lock").assertStopped(file);
  const db = await cds.connect.to("db");
  let connection;
  try {
    // CAP's plain SQL handler treats this PRAGMA as a write and discards its result.
    // Use the installed SQLite service's driver factory outside a transaction.
    connection = await db.factory.create();
    const result = connection
      .prepare("PRAGMA wal_checkpoint(TRUNCATE)")
      .all([]);
    if (result.some((row) => Number(row.busy) !== 0))
      throw new Error(
        "SQLite checkpoint is busy; stop external database writers",
      );
    console.log("Stopped local SQLite WAL checkpoint complete.");
  } finally {
    connection?.close();
    await db.disconnect();
  }
}
module.exports = checkpoint;
if (require.main === module)
  checkpoint().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
