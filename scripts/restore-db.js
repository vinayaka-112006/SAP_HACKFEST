const fs = require("node:fs");
const path = require("node:path");
const { target, assertStopped } = require("./database-files");
function restore(source) {
  const targetFile = target();
  assertStopped(targetFile);
  const backupRoot = path.resolve("backup") + path.sep;
  const sourceFile = path.resolve(source || "");
  if (
    !sourceFile.startsWith(backupRoot) ||
    !sourceFile.endsWith(".sqlite") ||
    !fs.existsSync(sourceFile)
  )
    throw new Error("Choose an existing .sqlite file within backup/");
  assertStopped(sourceFile);
  const header = fs.readFileSync(sourceFile).subarray(0, 16).toString("binary");
  if (header !== "SQLite format 3\0") throw new Error("Not a SQLite database");
  if (fs.existsSync(targetFile)) require("./backup-db")();
  fs.copyFileSync(sourceFile, targetFile);
  console.log("Restored local database from " + sourceFile);
}
module.exports = restore;
if (require.main === module)
  try {
    restore(process.argv[2]);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
