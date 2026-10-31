const path = require("node:path");
// Source-only operational paths; the backend is the sole CAP project.
const projectRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(projectRoot, "..");
const backupRoot = path.join(repositoryRoot, "backup");
function within(parent, target) {
  const relative = path.relative(parent, target);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(".." + path.sep) &&
    !path.isAbsolute(relative)
  );
}
module.exports = { projectRoot, repositoryRoot, backupRoot, within };
