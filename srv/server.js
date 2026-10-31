const cds = require('@sap/cds');
const express = require('express');
const cors = require('cors');
const {loadRouters} = require('./lib/router-loader');
const errors = require('./lib/errors');
cds.on('served', async () => {
  if(cds.db.kind==='sqlite'){
    const existing=await cds.db.run("SELECT name FROM sqlite_master WHERE type='table' AND name='toolsathi_Tool'");
    if(!existing.length)await cds.deploy(cds.model).to(cds.db);
  }
  await require('./lib/db-protection').install(cds.db);
});
cds.on('bootstrap', app => {
  app.disable('x-powered-by');
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(x=>x.trim());
  app.use(cors({origin:(origin, cb)=>cb(null, !origin || origins.includes(origin))}));
  app.use(express.json({limit:'1mb'}));
  app.locals.routeRegistry = loadRouters(app);
  app.use((_req, res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Endpoint not found',details:{}}}));
  app.use(errors);
});
module.exports = options => {
 if(process.env.NODE_ENV==='production'&&(process.env.AUTH_MODE==='header'||process.env.ALLOW_UNAPPROVED_MOCKS==='true'||process.env.ENFORCE_APPROVALS==='false'))throw new Error('Unsafe production configuration');
 const memory=cds.env.requires.db.kind==='sqlite'&&cds.env.requires.db.credentials?.url===':memory:';
 if(cds.env.requires.db.kind==='sqlite'&&!memory){
  const file=require('node:path').resolve(cds.env.requires.db.credentials.url);const release=require('./lib/local-lock').acquire(file);
  cds.once('shutdown',release);
 }
 return cds.server({...options,from:'*',in_memory:memory,cors:false,index:false,static:false,health:false});
};
if (require.main === module) module.exports({}).then(server=> {
  console.log(`ToolSathi SIMULATED: http://localhost:${server.address().port}/api`);
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close(async()=>{await cds.shutdown();process.exit(0);}));
}).catch(()=> { console.error('ToolSathi startup failed');process.exitCode=1; });
