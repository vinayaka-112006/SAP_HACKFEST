const {fail}=require('./http');const {cds}=require('./db');
const roles=['Worker','Manager','Quality','Technician','Verifier'];const verified=Symbol('verified-xsuaa-user');let service;
const mode=()=>process.env.AUTH_MODE||(process.env.NODE_ENV==='production'?'xsuaa':'header');
function getUser(req){
 if(mode()==='xsuaa'){if(!req[verified])fail(401,'UNAUTHENTICATED','Verified bearer authentication is required');return req[verified];}
 if(mode()!=='header'||process.env.NODE_ENV==='production')fail(503,'AUTH_UNAVAILABLE','Header authentication is disabled in production');
 const id=req.get('x-demo-user'),role=req.get('x-demo-role');
 if(!id||!id.trim()||id.length>120||!role)fail(401,'UNAUTHENTICATED','Demo user and role headers are required');
 if(!roles.includes(role))fail(403,'FORBIDDEN','Unknown demo role');return {id,role,roles:[role]};
}
async function authenticate(req){
 if(mode()!=='xsuaa')return;
 if(!req.get('authorization')?.startsWith('Bearer '))fail(401,'UNAUTHENTICATED','Bearer token is required');
 const credentials=cds.env.requires.auth?.credentials;
 if(!credentials?.xsappname)fail(503,'AUTH_UNAVAILABLE','XSUAA service binding is required');
 const {XsuaaService,createSecurityContext}=require('@sap/xssec');
 try{
  service||=new XsuaaService(credentials);const context=await createSecurityContext(service,{req});
  const granted=roles.filter(role=>context.checkScope(`${credentials.xsappname}.${role}`));
  const payload=context.token.getPayload();const id=payload.user_name;
  if(!id||!granted.length)fail(403,'FORBIDDEN','A named user with a ToolSathi role is required');
  req[verified]={id,role:granted[0],roles:granted};
 }catch(e){if(e.status===403)throw e;fail(401,'UNAUTHENTICATED','Bearer token could not be verified');}
}
function requireRole(...allowed){return async(req,res,next)=>{try{await authenticate(req);const user=getUser(req);req.user=user;const role=allowed.length?user.roles.find(r=>allowed.includes(r)):user.role;if(!role)fail(403,'FORBIDDEN','Role is not permitted');req.user={...user,role};next();}catch(e){next(e);}};}
module.exports={getUser,requireRole,roles};
