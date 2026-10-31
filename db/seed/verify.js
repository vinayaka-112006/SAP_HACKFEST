const assert=require('node:assert/strict');const fs=require('node:fs');const cds=require('@sap/cds');
const {artifacts}=require('./generate');const {plan,serial,groundTruth}=require('./plan');
async function verify() {
 for(const [file,expected] of Object.entries(artifacts()))assert.equal(fs.readFileSync(file,'utf8'),expected,`Generated artifact differs: ${file}`);
 const model=await cds.load('db/schema.cds');
 const db=await cds.deploy(model).to('sqlite::memory:');
 try {
  const {SELECT}=cds.ql;
  const units=await db.run(SELECT.from('toolsathi.Unit').orderBy('serial'));
  assert.equal(units.length,300);assert.deepEqual(units.map(x=>x.serial),Array.from({length:300},(_,i)=>serial(i+1)));
  const events=await db.run(SELECT.from('toolsathi.ToolUseEvent'));
  for(const p of plan){
   const run=await db.run(SELECT.one.from('toolsathi.ProductionRun').where({runId:p.runId}));
   assert.equal(run.workCenter,`WC-${p.tool}`);
   const batchUnits=units.filter(u=>u.batchId===p.batchId);
   assert.deepEqual(batchUnits.map(u=>u.serial),Array.from({length:p.last-p.first+1},(_,i)=>serial(p.first+i)));
   assert.equal(events.filter(e=>e.runId===p.runId).length,p.suffix==='NOREC'?0:p.suffix==='DUP'?2:1);
   const location=await db.run(SELECT.from(p.location==='STOCK'?'toolsathi.InventoryStock':'toolsathi.Shipment').where({batchId:p.batchId}));
   assert.equal(location.length,1);assert.equal(location[0].quantity,batchUnits.length);
  }
  const candidate=groundTruth();
  if(fs.existsSync('tests/ground-truth.json'))assert.deepEqual(JSON.parse(fs.readFileSync('tests/ground-truth.json')),candidate,'APPROVED GROUND TRUTH DIFFERS: review both files; never overwrite');
  console.log('Verified CSV loading, exact serial plan, linkage and location quantities. Ground truth: '+(fs.existsSync('tests/ground-truth.json')?'approved file matches':'PROVISIONAL; Jamuna review pending'));
 } finally {await db.disconnect();}
}
module.exports=verify;if(require.main===module)verify().catch(e=>{console.error(e.message);process.exitCode=1;});
