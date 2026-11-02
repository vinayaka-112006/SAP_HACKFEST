import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../state/store';
import { useLocale } from '../features/v2/locale';
import useSarvamRecorder from '../features/worker/useSarvamRecorder';
import { resolveToolCode } from '../api/mappings';
import VoiceAgent from '../features/v2/VoiceAgent';
import WorkforcePanel from '../features/v2/WorkforcePanel';
import SystemPanel from '../features/v2/SystemPanel';
const box={padding:20,background:'rgba(255,255,255,.88)',border:'1px solid var(--brand-cyan-soft)',borderRadius:16,marginBottom:20};
const row={display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',margin:'12px 0'};
function Field({label,value,onChange,type='text'}){return <label style={{display:'grid',gap:5,flex:1,minWidth:170}}>{label}<input aria-label={label} type={type} value={value} onChange={e=>onChange(e.target.value)} style={{padding:10,border:'1px solid #a3bac6',borderRadius:6}}/></label>;}
function Records({value}){
  if(value===null||value===undefined)return <span>—</span>;
  if(typeof value!=='object')return <span style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{String(value)}</span>;
  if(Array.isArray(value))return <div>{value.map((item,i)=><div key={i} style={{padding:8,borderBottom:'1px solid #dde5e9'}}><Records value={item}/></div>)}</div>;
  return <dl style={{display:'grid',gridTemplateColumns:'minmax(90px, 1fr) minmax(0, 3fr)',gap:8,fontSize:13}}>{Object.entries(value).map(([key,item])=><React.Fragment key={key}><dt style={{overflowWrap:'anywhere'}}>{key.replace(/([A-Z])/g,' $1')}</dt><dd style={{margin:0,minWidth:0}}><Records value={item}/></dd></React.Fragment>)}</dl>;
}
export default function Workspace(){
  const {client,currentRole,tools,incidentId,openIncident,refresh,apiConfig}=useStore(),{language,t}=useLocale();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [selected,setSelected]=useState(''),[qr,setQr]=useState(''),[session,setSession]=useState(null),[answer,setAnswer]=useState(''),[review,setReview]=useState(false),[description,setDescription]=useState(''),[category,setCategory]=useState(''),[translation,setTranslation]=useState('');
  const [scope,setScope]=useState(incidentId||''),[question,setQuestion]=useState(''),[chat,setChat]=useState(null),[me,setMe]=useState(null);
  const [name,setName]=useState(''),[center,setCenter]=useState(''),[team,setTeam]=useState(''),[invitation,setInvitation]=useState('');
  const [techs,setTechs]=useState(null),[orders,setOrders]=useState([]),[duplicates,setDuplicates]=useState(null),[canonical,setCanonical]=useState(''),[reason,setReason]=useState(''),[findings,setFindings]=useState(''),[repairId,setRepairId]=useState(''),[context,setContext]=useState(null),[partId,setPartId]=useState(''),[quantity,setQuantity]=useState('1');
  const [userId,setUserId]=useState(''),[inviteRole,setInviteRole]=useState('Technician'),[adminResult,setAdminResult]=useState(null),[qualification,setQualification]=useState('');
  const [reviewContext,setReviewContext]=useState(null),[information,setInformation]=useState(''),[previewDuplicates,setPreviewDuplicates]=useState(null);
  const [guidance,setGuidance]=useState(null);
  const [speech,setSpeech]=useState(null);
  const [voiceMode,setVoiceMode]=useState(false);
  const perform=async fn=>{setBusy(true);setError('');setNotice('');try{await fn();setNotice(t('saved'));refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const identity = useRef(client);
  identity.current = client;
  const request=async(path,body,method='POST')=>{
    const value=await client.request('/v2'+path,{method,requestTimeoutMs:70000,...(body!==undefined?{body}:{})});
    if(identity.current!==client)throw new Error(t('error'));
    return value;
  };
  const recorder=useSarvamRecorder({client,language:session?.language||language,enabled:apiConfig.aiEnabled&&!busy&&!review,onTranscript:result=>{setAnswer(result.transcript);setNotice(t('speechReview'));},onError:setError});
  useEffect(()=>{setSession(null);setReview(false);setChat(null);setMe(null);setOrders([]);setTechs(null);setContext(null);setDuplicates(null);setReviewContext(null);setGuidance(null);setSpeech(null);setPreviewDuplicates(null);},[client]);
  const tool=tools.find(x=>x.toolId===selected);
  const start=()=>perform(async()=>{const result=await request('/conversations',{toolId:selected,language});setSession(result);setReview(false);setAnswer('');});
  const send=(value=answer)=>perform(async()=>{
    const facts={};if(session.field)facts[session.field]=['equipmentStopped','productionStopped','safety'].includes(session.field)&&['yes','no'].includes(value)?value==='yes':value;
    const result=await request(`/conversations/${session.sessionId}/messages`,{version:session.version,text:value,facts,reason:apiConfig.aiEnabled});setSession(result);setCategory(result.draft?.category||'');setTranslation(result.draft?.translatedText||'');setAnswer('');
  });
  const doWork=action=>perform(async()=>{await request(`/incidents/${encodeURIComponent(scope)}/work`,{action,...(currentRole==='Technician'?{findings}:{}),...(action==='submit'?{repairId}:{})});setOrders((await request('/work-orders',undefined,'GET')).workOrders);});
  return <div className="workspace" style={{maxWidth:1100,margin:'30px auto 160px',padding:20}}>
    <h1>{t('workspace')}</h1><nav style={row}><Link to="/worker">{t('worker')}</Link><Link to="/console">{t('console')}</Link><Link to="/history">{t('history')}</Link></nav>
    {currentRole==='Manager'&&<WorkforcePanel incidentId={scope}/>}
    {['Manager','Administrator'].includes(currentRole)&&<SystemPanel/>}
    {error&&<p role="alert" style={{color:'#9c2136'}}>{t('error')}: {error}</p>}{notice&&<p role="status">{notice}</p>}{busy&&<p aria-live="polite">{t('busy')}</p>}
    {['Worker','Manager'].includes(currentRole)&&<section style={box}><h2>{t('start')}</h2>
      {!session?<><div style={row}><label>{t('equipment')} <select aria-label={t('equipment')} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">—</option>{tools.map(x=><option key={x.toolId} value={x.toolId}>{x.toolId} · {x.type} · {x.workCenter}</option>)}</select></label></div>
        <div style={row}><Field label={t('qr')} value={qr} onChange={setQr}/><button onClick={()=>{const tool=resolveToolCode(qr,tools);if(tool){setSelected(tool.toolId);setError('');}else setError(t('invalidQr'));}}>{t('resolve')}</button></div>
        {tool&&<p>{tool.toolId} · {tool.type} · {tool.workCenter} · {tool.line} · {tool.state}</p>}<button disabled={!tool||busy} onClick={start}>{t('start')}</button><button disabled={!tool} onClick={()=>setVoiceMode(!voiceMode)}>{t('voice')}</button>{voiceMode&&<VoiceAgent key={selected+language} toolId={selected} onConfirmed={id=>{openIncident(id);setScope(id);}}/>}</>:<>
        <p>{t('equipment')}: {session.toolId} · {session.language}</p><p>{t('provider')}</p>
        {session.safetyEscalation&&<p role="alert" style={{background:'#ffe4de',padding:15}}>{session.safetyEscalation}</p>}
        {!review?<><p aria-live="polite">{session.question||t('review')}</p><button disabled={busy||!session.question||!apiConfig.aiEnabled} onClick={()=>perform(async()=>{const result=await request(`/conversations/${session.sessionId}/readback`,{reviewed:true});setSpeech(result.audio?`data:${result.mimeType};base64,${result.audio}`:null);setNotice(`${t('model')}: ${result.providerStatus}`);})}>{t('listen')}</button>{speech&&<audio controls src={speech}/>}
          <textarea aria-label={t('description')} value={answer} onChange={e=>setAnswer(e.target.value)} rows={4} style={{width:'100%',padding:10}}/>
          <div style={row}><button disabled={busy||!answer.trim()} onClick={()=>send()}>{t('send')}</button>
          {['equipmentStopped','productionStopped','safety'].includes(session.field)&&<><button disabled={busy} onClick={()=>send('yes')}>{t('yes')}</button><button disabled={busy} onClick={()=>send('no')}>{t('no')}</button></>}
          <button disabled={busy||!session.messages.length} onClick={()=>send('unknown')}>{t('unknown')}</button>
          <button disabled={!recorder.supported||busy||!apiConfig.aiEnabled} onClick={recorder.toggle}>{recorder.recording?t('stop'):t('voice')}</button>{recorder.recording&&<span role="status">● {t('recording')}</span>}</div>
          <p>{t('speechReview')}</p><div style={row}><button disabled={busy||!session.messages.length} onClick={()=>{setReview(true);setDescription(session.messages.filter(m=>m.role==='worker').map(m=>m.text).join('\n'));}}>{session.ready?t('review'):t('continue')}</button>
          <button disabled={busy||!session.messages.length} onClick={()=>perform(async()=>{const result=await request(`/conversations/${session.sessionId}/messages`,{version:session.version,text:session.messages.filter(m=>m.role==='worker').at(-1).text,extract:true});setSession(result);setCategory(result.draft?.category||'');setTranslation(result.draft?.translatedText||'');setNotice(`${t('model')}: ${result.providerStatus}`);})}>{t('extract')}</button></div>
          <details><summary>{t('original')}</summary>{session.messages.filter(m=>m.role==='worker').map((m,i)=><p key={i}>{m.text}</p>)}</details></>:<>
          <h3>{t('draft')}</h3><label>{t('description')}<textarea aria-label={t('description')} value={description} onChange={e=>setDescription(e.target.value)} rows={4} style={{width:'100%'}}/></label>
          <div style={row}><Field label={t('category')} value={category} onChange={setCategory}/><Field label={t('translate')} value={translation} onChange={setTranslation}/></div>
          <p>{t('missing')}: {session.missingFields.join(', ')||'—'}</p><Records value={session.facts}/>
          <button disabled={busy} onClick={()=>perform(async()=>setPreviewDuplicates(await request(`/conversations/${session.sessionId}/duplicates?semantic=true`,undefined,'GET')))}>{t('duplicates')}</button>
          {previewDuplicates&&<Records value={previewDuplicates.candidates}/>}
          <button disabled={busy||!description.trim()||!!session.incidentId} onClick={()=>perform(async()=>{const result=await request(`/conversations/${session.sessionId}/submit`,{version:session.version,confirmed:true,description,...(category?{category}:{}),...(translation?{translatedText:translation}:{})});setSession({...session,incidentId:result.incident.incidentId});setScope(result.incident.incidentId);openIncident(result.incident.incidentId);setNotice(t('submitted'));})}>{t('confirm')}</button>
          {session.incidentId&&<p>{t('submitted')}: {session.incidentId}</p>}</>}
        <button disabled={busy} onClick={()=>{recorder.cancel();setSession(null);setReview(false);}} style={{margin:12}}>{t('fresh')}</button>
      </>}
    </section>}
    <section style={box}><h2>{t('chat')}</h2><p>{t('readOnly')}</p><div style={row}><Field label={t('incident')} value={scope} onChange={setScope}/><Field label={t('question')} value={question} onChange={setQuestion}/><button disabled={busy||!question.trim()} onClick={()=>perform(async()=>setChat(await request('/chat',{message:question,language,...(scope?{incidentId:scope}:{}),generate:true})))}>{t('ask')}</button></div>
      {chat&&<><p>{chat.answer}</p><small>{t('model')}: {chat.providerStatus}</small><Records value={chat.sources}/></>}
    </section>
    {['Manager','Technician','Quality','Verifier'].includes(currentRole)&&<section style={box}><h2>{t('work')}</h2><div style={row}><Field label={t('incident')} value={scope} onChange={setScope}/><button disabled={busy} onClick={()=>perform(async()=>setOrders((await request('/work-orders',undefined,'GET')).workOrders))}>{t('workOrders')}</button><Link to="/console" onClick={()=>openIncident(scope)}>{t('console')}</Link></div><p>{t('ack')}</p>
      {orders.map(w=><article key={w.workOrderId} style={{borderBottom:'1px solid #ccd',padding:10}}><button onClick={()=>{setScope(w.incidentId);openIncident(w.incidentId);}}>{w.incidentId}</button> · {w.technicianId} · {w.status} · {w.workOrderId}<p>{w.findings}</p></article>)}
      {currentRole==='Manager'&&<><div style={row}><button disabled={busy||!scope} onClick={()=>perform(async()=>setReviewContext(await request(`/incidents/${encodeURIComponent(scope)}/review`,undefined,'GET')))}>{t('review')}</button><button disabled={busy||!scope} onClick={()=>perform(async()=>setTechs((await request(`/incidents/${encodeURIComponent(scope)}/technicians`,undefined,'GET')).technicians))}>{t('technicians')}</button><button disabled={busy||!scope} onClick={()=>perform(async()=>setDuplicates((await request(`/incidents/${encodeURIComponent(scope)}/duplicates?semantic=true`,undefined,'GET')).candidates))}>{t('duplicates')}</button><button disabled={busy||!scope} onClick={()=>doWork('review')}>{t('managerReview')}</button></div>
      {reviewContext&&<Records value={reviewContext}/>}
      {techs&&<div>{techs.length?techs.map(x=><p key={x.userId}>{x.displayName} · {x.reasons.join('; ')} <button disabled={busy||!x.eligible} onClick={()=>perform(async()=>{await request(`/incidents/${encodeURIComponent(scope)}/assign`,{technicianId:x.userId});setTechs(null);})}>{t('assign')}</button></p>):t('noData')}</div>}
      {duplicates&&<><Records value={duplicates}/><div style={row}><Field label={t('canonical')} value={canonical} onChange={setCanonical}/><Field label={t('reason')} value={reason} onChange={setReason}/>{[['LINK','link'],['SEPARATE','separate'],['INCORRECT','incorrect']].map(([decision,key])=><button key={decision} disabled={busy||!reason||!canonical} onClick={()=>perform(async()=>{await request(`/incidents/${encodeURIComponent(scope)}/relationship`,{canonicalId:canonical,decision,reason});setDuplicates(null);})}>{t(key)}</button>)}</div></>}
      </>}
      {currentRole==='Technician'&&<><div style={row}><Field label={t('findings')} value={findings} onChange={setFindings}/><Field label={t('repairId')} value={repairId} onChange={setRepairId}/></div><div style={row}>{[['accept','accept'],['progress','progress'],['submit','submit']].map(([action,key])=><button key={action} disabled={busy||!scope||!findings} onClick={()=>doWork(action)}>{t(key)}</button>)}<button disabled={busy||!scope} onClick={()=>perform(async()=>setContext(await request(`/incidents/${encodeURIComponent(scope)}/repair-context`,undefined,'GET')))}>{t('context')}</button></div>
      {context&&<><h3>{t('parts')}</h3><p>{context.guidance.message}</p><Records value={{tool:context.tool,repairs:context.repairs,sources:context.sources,parts:context.parts}}/><button disabled={busy} onClick={()=>perform(async()=>setGuidance(await request(`/incidents/${encodeURIComponent(scope)}/repair-guidance`,{})))}>{t('repairGuidance')}</button>{guidance&&<><p role="status">{guidance.warning}</p><p>{t('model')}: {guidance.providerStatus}</p><Records value={guidance.plan}/></>}<div style={row}><Field label={t('partId')} value={partId} onChange={setPartId}/><Field label={t('quantity')} value={quantity} onChange={setQuantity} type="number"/><button disabled={busy||!partId} onClick={()=>perform(()=>request(`/incidents/${encodeURIComponent(scope)}/parts`,{partId,quantity:Number(quantity)}))}>{t('reserve')}</button>{[['USE','usePart'],['RELEASE','releasePart']].map(([action,key])=><button key={action} disabled={busy||!partId} onClick={()=>perform(()=>request(`/incidents/${encodeURIComponent(scope)}/parts/${encodeURIComponent(partId)}/decision`,{action}))}>{t(key)}</button>)}</div></>}
      </>}
    </section>}
    {['Worker','Manager'].includes(currentRole)&&<section style={box}><h2>{t('information')}</h2><div style={row}><Field label={t('incident')} value={scope} onChange={setScope}/><Field label={t('message')} value={information} onChange={setInformation}/><button disabled={busy||!scope||!information.trim()} onClick={()=>perform(()=>request(`/incidents/${encodeURIComponent(scope)}/${currentRole==='Manager'?'information-request':'information'}`,{message:information}))}>{t(currentRole==='Manager'?'requestInfo':'send')}</button></div></section>}
    <section style={box}><h2>{t('profile')}</h2><p>{t('scopeHelp')}</p><div style={row}><Field label={t('name')} value={name} onChange={setName}/><Field label={t('center')} value={center} onChange={setCenter}/><Field label={t('team')} value={team} onChange={setTeam}/><Field label={t('invitation')} value={invitation} onChange={setInvitation}/></div><div style={row}><button disabled={busy||!name||!center||!team} onClick={()=>perform(async()=>setMe(await request('/register',{displayName:name,language,workCenter:center,team,...(invitation?{invitationId:invitation}:{})})))}>{t('register')}</button><button disabled={busy} onClick={()=>perform(async()=>setMe(await request('/me',undefined,'GET')))}>{t('notifications')}</button></div>{me&&<Records value={me}/>}</section>
    {currentRole==='Administrator'&&<section style={box}><h2>{t('admin')}</h2><div style={row}><Field label={t('userId')} value={userId} onChange={setUserId}/><label>{t('role')} <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>{['Worker','Manager','Technician','Quality','Verifier'].map(r=><option key={r}>{r}</option>)}</select></label><button disabled={busy||!userId} onClick={()=>perform(async()=>setAdminResult(await request('/invitations',{userId,role:inviteRole})))}>{t('invite')}</button></div><p>{t('qualificationTemplate')}</p><label>{t('qualificationHelp')}<textarea aria-label={t('qualificationHelp')} value={qualification} onChange={e=>setQualification(e.target.value)} rows={7} style={{width:'100%'}}/></label><button disabled={busy||!userId||!qualification} onClick={()=>perform(async()=>setAdminResult(await request(`/qualifications/${encodeURIComponent(userId)}`,JSON.parse(qualification),'PUT')))}>{t('qualification')}</button>{adminResult&&<Records value={adminResult}/>}</section>}
  </div>;
}
