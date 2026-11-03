// Safe isolated demo database reset utility
// Resets ONLY specifically named isolated scratch/demo databases.
// NEVER resets or deletes the persistent db.sqlite!

const fs = require('node:fs');
const path = require('node:path');
const { target, assertStopped } = require('./database-files');
const backup = require('./backup-db');

async function main() {
  const currentDb = target();
  const baseName = path.basename(currentDb);

  // Safety check: Never touch persistent db.sqlite
  if (baseName === 'db.sqlite') {
    console.error('SAFETY VIOLATION: demo:data:reset-isolated cannot be run against the persistent production/development db.sqlite!');
    console.error('This command is strictly reserved for isolated scratch databases (e.g. backup/demo-*.sqlite or scratch-*.sqlite).');
    process.exit(1);
  }

  // Safety check: Must require explicit CLI flag --confirm-reset-isolated
  if (!process.argv.includes('--confirm-reset-isolated')) {
    console.error('Confirmation required. Run with --confirm-reset-isolated to reset this isolated demo database: ' + currentDb);
    process.exit(1);
  }

  assertStopped(currentDb);

  // Always create a backup first before resetting
  const backupPath = backup();
  console.log(`Pre-reset backup created at: ${backupPath}`);

  // Safely remove the isolated file
  fs.unlinkSync(currentDb);
  for (const ext of ['-shm', '-wal', '.lock']) {
    if (fs.existsSync(currentDb + ext)) fs.unlinkSync(currentDb + ext);
  }

  console.log(`Isolated scratch database ${currentDb} has been safely reset.`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
