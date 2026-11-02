const Ajv=require('ajv');
const {createClient,readConfig}=require('../ai-adapter/sarvam-client');
const error=(code,message)=>Object.assign(new Error(message),{code});
const ajv=new Ajv({strict:false,validateFormats:false});
function createReasoningClient({env=process.env,fetchImpl=globalThis.fetch}={}){
  let speech,models,activeModel;
  const provider=env.AI_REASONING_PROVIDER||(env.GROQ_API_KEY?'groq':'sarvam');
  async function groq(path,body){
    if(!env.GROQ_API_KEY?.trim())throw error('AI_NOT_CONFIGURED','Groq reasoning is not configured. Manual reporting remains available.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{
      const response=await fetchImpl('https://api.groq.com/openai/v1/'+path,{method:body?'POST':'GET',signal:controller.signal,headers:{Authorization:'Bearer '+env.GROQ_API_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
      if(!response.ok)throw error(({401:'AI_AUTH_FAILED',403:'AI_AUTH_FAILED',429:'AI_RATE_LIMITED',400:'AI_INVALID_REQUEST',404:'AI_MODEL_UNAVAILABLE',413:'AI_INPUT_TOO_LARGE'})[response.status]||'AI_PROVIDER_UNAVAILABLE','Groq request failed ('+response.status+'). Check provider configuration, model access or quota.');
      return await response.json();
    }catch(cause){if(cause.code?.startsWith('AI_'))throw cause;throw error(controller.signal.aborted?'AI_TIMEOUT':'AI_NETWORK_ERROR','Groq could not be reached. Retry or continue manually.');}finally{clearTimeout(timer);}
  }
  return {provider,
    async model(){
      models ||= (await groq('models')).data?.map(m=>m.id)||[];
      const candidate=env.GROQ_MODEL||['llama-3.3-70b-versatile','openai/gpt-oss-120b','openai/gpt-oss-20b'].find(id=>models.includes(id));
      if(!candidate||!models.includes(candidate))throw error('AI_MODEL_UNAVAILABLE','Configured Groq model is not active for this account.');
      return activeModel=candidate;
    },
    async complete(messages,schema){
      if(provider==='sarvam')return (speech ||= createClient(readConfig(env),fetchImpl)).complete(messages,schema);
      if(provider!=='groq')throw error('AI_CONFIG_INVALID','Unsupported reasoning provider.');
      const model=activeModel||await this.model();
      const response=await groq('chat/completions',{model,messages:[{role:'system',content:'Return JSON only, matching this schema. No invented facts. '+JSON.stringify(schema)},...messages],temperature:0,max_completion_tokens:4096,...(model.startsWith('openai/gpt-oss')?{reasoning_effort:'low'}:{}),response_format:{type:'json_object'}});
      const choice=response.choices?.[0];let value;
      try{value=JSON.parse(choice?.message?.content);}catch{throw error('AI_INVALID_OUTPUT','Groq returned malformed JSON.');}
      if(choice.finish_reason!=='stop')throw error('AI_OUTPUT_TRUNCATED','Groq response was incomplete. Retry with a shorter report.');
      if(!ajv.validate(schema,value))throw Object.assign(error('AI_INVALID_OUTPUT','Groq response did not satisfy the application schema.'),{validation:ajv.errors?.map(e=>({path:e.instancePath,keyword:e.keyword}))});
      return {content:JSON.stringify(value),model:'groq/'+model,usage:response.usage||{}};
    },
    transcribe(...args){return (speech ||= createClient(readConfig(env),fetchImpl)).transcribe(...args);},
    speak(...args){return (speech ||= createClient(readConfig(env),fetchImpl)).speak(...args);},
  };
}
module.exports={createReasoningClient};
