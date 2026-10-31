const {spawnSync}=require('node:child_process');const fs=require('node:fs');
const result=spawnSync(process.execPath,[require.resolve('@sap/cds-dk/bin/cds.js'),'build','--production'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
// The router loader resolves public fixed fixtures relative to the packaged runtime.
fs.cpSync('docs/examples','gen/srv/docs/examples',{recursive:true});
console.log('Packaged runtime fixtures for remaining teammate stubs.');
