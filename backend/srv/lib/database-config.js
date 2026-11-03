const fs=require('node:fs'),path=require('node:path');
const projectRoot=path.resolve(__dirname,'../..');
const isTest=(env=process.env)=>env.NODE_ENV==='test'||(env.CDS_ENV||'').split(',').includes('test');
function loadEnvironment(file=path.join(projectRoot,'.env')){if(!isTest()&&fs.existsSync(file))process.loadEnvFile(file);}
function configureDatabase(cds,{mode,env=process.env}={}){
 // Explicit remote commands fail before connecting; stale environment/bindings cannot select HANA.
 if(mode&&mode!=='sqlite')throw Object.assign(new Error('ToolSathi uses SQLite only; remote database operations are disabled.'),{code:'DATABASE_MODE_UNSUPPORTED'});
 const url=isTest(env)?':memory:':env.SQLITE_FILE||env.CDS_REQUIRES_DB_CREDENTIALS_URL||cds.env.requires.db.credentials?.url||'db.sqlite';
 if(env.NODE_ENV==='production'&&url===':memory:')throw Object.assign(new Error('Production requires a persistent SQLite file.'),{code:'SQLITE_PERSISTENCE_REQUIRED'});
 cds.env.requires.db={kind:'sqlite',impl:'@cap-js/sqlite',credentials:{url},pool:{min:1,max:1}};
 cds.env.sql.dialect='sqlite';return {mode:'sqlite'};
}
function assertTarget(){throw Object.assign(new Error('Remote database operations are disabled in the SQLite project.'),{code:'DATABASE_MODE_UNSUPPORTED'});}
function diagnostic(error){return {code:/^(DATABASE_MODE_|SQLITE_)/.test(String(error.code))?error.code:'DATABASE_UNAVAILABLE',message:/^(DATABASE_MODE_|SQLITE_)/.test(String(error.code))?error.message:'SQLite startup failed. Check the file path, permissions, schema and application lock.'};}
module.exports={projectRoot,isTest,loadEnvironment,configureDatabase,assertTarget,diagnostic};
