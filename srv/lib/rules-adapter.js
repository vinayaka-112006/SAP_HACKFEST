const path=require('node:path');const fs=require('node:fs');
function optional(name){const file=path.join(__dirname,'../rules',name);try{return require(require.resolve(file));}catch(e){if(e.code==='MODULE_NOT_FOUND'&&!fs.existsSync(file+'.js')&&!fs.existsSync(file)&&!fs.existsSync(file+'.json'))return null;throw e;}}
const machine=optional('state-machine'),approvals=optional('approvals');
if(!machine||!approvals)console.warn('using default rules');
const incident={Reported:['Confirmed','Closed with insufficient evidence'],Confirmed:['Under review','Closed with insufficient evidence'],'Under review':['Containment proposed','Closed with insufficient evidence'],'Containment proposed':['Approved','Rejected'],'Approved':['Repairing'],'Rejected':['Repairing'],'Repairing':['Awaiting verification'],'Awaiting verification':['Closed']};
const tool={Active:['Restricted'],Restricted:['Under repair'],'Under repair':['Awaiting verification'],'Awaiting verification':['Active']};
const roleByType={MAINTENANCE_NOTIFICATION:'Manager',TOOL_RESTRICTION:'Manager',QUALITY_NOTIFICATION:'Quality',STOCK_BLOCK:'Quality'};
function canIncidentTransition(from,to,ctx={}){return machine?machine.canIncidentTransition(from,to,ctx):(incident[from]||[]).includes(to);}
function canToolTransition(from,to,ctx={}){if(machine)return machine.canToolTransition(from,to,ctx);if(from==='Retired')return false;if(to==='Retired')return true;if(!(tool[from]||[]).includes(to))return false;return to!=='Active'||(ctx.verified===true&&ctx.role==='Verifier');}
function requiredApproverRole(type){if(approvals)return approvals.requiredApproverRole(type);if(!roleByType[type])throw new Error('Unsupported proposal type');return roleByType[type];}
module.exports={canIncidentTransition,canToolTransition,requiredApproverRole,usingDefaults:!machine||!approvals};
