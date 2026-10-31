const {fail}=require('./http');
const roles=['Worker','Manager','Quality','Technician','Verifier'];
function getUser(req){
 const mode=process.env.AUTH_MODE||'header';
 if(mode!=='header')fail(503,'AUTH_UNAVAILABLE','Verified XSUAA authentication is not configured');
 if(process.env.NODE_ENV==='production')fail(503,'AUTH_UNAVAILABLE','Header authentication is disabled in production');
 const id=req.get('x-demo-user'),role=req.get('x-demo-role');
 if(!id||!id.trim()||id.length>120||!role)fail(401,'UNAUTHENTICATED','Demo user and role headers are required');
 if(!roles.includes(role))fail(403,'FORBIDDEN','Unknown demo role');
 return {id,role};
}
function requireRole(...allowed){return(req,res,next)=>{try{const user=getUser(req);if(allowed.length&&!allowed.includes(user.role))fail(403,'FORBIDDEN','Role is not permitted');req.user=user;next();}catch(e){next(e);}};}
module.exports={getUser,requireRole,roles};
