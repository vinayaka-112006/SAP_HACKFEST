const fs = require("node:fs");
const path = require("node:path");
const { target, assertStopped } = require("./database-files");
function backup() {
  const source = target();
  assertStopped(source);
  if (!fs.existsSync(source)) throw new Error("No SQLite database to back up");
  fs.mkdirSync("backup", { recursive: true });
  const destination = path.resolve(
    "backup",
    `db-${new Date().toISOString().replace(/[:.]/g, "-")}-${require("node:crypto").randomUUID()}.sqlite`,
  );
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  console.log("Backup created: " + destination);
  return destination;
}
module.exports = backup;
if (require.main === module)
  try {
    backup();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
