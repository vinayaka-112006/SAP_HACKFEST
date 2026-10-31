const fs=require('node:fs');const path=require('node:path');const cds=require('@sap/cds');
function target(){if(process.env.NODE_ENV==='production'||cds.env.requires.db.kind!=='sqlite')throw new Error('Local SQLite operation only');const file=cds.env.requires.db.credentials?.url;if(!file||file===':memory:')throw new Error('Persistent SQLite file required');const resolved=path.resolve(file);if(!resolved.startsWith(path.resolve('.')+path.sep))throw new Error('Database must be within this workspace');return resolved;}
function assertStopped(file){
 require('../srv/lib/local-lock').assertStopped(file);
 // Operations use exclusive/offline files; the caller must stop every process first.
 if(fs.existsSync(file+'-wal')&&fs.statSync(file+'-wal').size)throw new Error('SQLite WAL is present: stop the server and checkpoint before offline file operations');
}
module.exports={target,assertStopped};
