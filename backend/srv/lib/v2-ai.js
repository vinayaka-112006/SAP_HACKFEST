// Share teammate provider code. Bound costs across all V2 capabilities, not per request.
const { createReasoningClient } = require('./reasoning');
const { fail } = require('./http');
let client,active=0;
const requests=new Map();
async function use(userId,fn){
  const now=Date.now();
  for(const [id,r] of requests)if(now-r.at>=60000)requests.delete(id);
  const record=requests.get(userId)||{at:now,count:0};
  if(record.count>=6||active>=2||requests.size>=1000&&!requests.has(userId))fail(429,'AI_RATE_LIMITED','Wait a minute before another AI request');
  record.count++;requests.set(userId,record);active++;
  try{return await fn(client ||= createReasoningClient());}finally{active--;}
}
module.exports={use};
