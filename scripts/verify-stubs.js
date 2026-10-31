const assert = require('node:assert/strict');
const endpoints = require('../srv/routes/_stubs/contract.json');
async function verify(base = process.env.BASE_URL || 'http://localhost:4004') {
  let checked=0;
  for (const endpoint of endpoints) {
    if(endpoint.owner==='platform' && endpoint.name!=='health')continue;
    checked++; 
    const route = endpoint.path.replace(':id',endpoint.name==='tool-history'?'TOOL-B':endpoint.name==='approval-decision'?'APR-0001':'TS-0002');
    const query = endpoint.name==='trace'?'?window=24':['audit','documents'].includes(endpoint.name)?'?incident=TS-0002':'';
    const response = await fetch(base+'/api'+route+query,{method:endpoint.method,headers:{'content-type':'application/json'},...(endpoint.method==='POST'?{body:JSON.stringify(endpoint.request || {})}:{})});
    assert.equal(response.status,200, endpoint.name);
    assert.match(response.headers.get('content-type'),/application\/json/);
    const actual = await response.json();
    assert.deepEqual(JSON.parse(JSON.stringify(actual)),require('../docs/examples/'+endpoint.example),endpoint.name);
    console.log(`PASS ${endpoint.method} /api${endpoint.path} stub=${actual._stub}`);
  }
  return checked;
}
module.exports = verify;
if(require.main===module) verify().then(n=>console.log(`${n} endpoints passed`)).catch(e=>{console.error(e.message);process.exitCode=1;});
