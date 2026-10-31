const fs = require('node:fs'); const path = require('node:path');
const source = path.resolve('db.sqlite');
if (!fs.existsSync(source)) { console.error('No persistent SQLite database exists yet. Phase 0 uses an in-memory database.'); process.exitCode=1; } else { fs.mkdirSync('backup',{recursive:true}); fs.copyFileSync(source,path.join('backup',`db-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`)); }
