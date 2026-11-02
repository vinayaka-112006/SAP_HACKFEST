import React, {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useStore} from '../../state/store';
import {useLocale} from './locale';
export default function WebsiteAssistant(){
  const {client,incidentId}=useStore(),{language,t}=useLocale();
  const [open,setOpen]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const active=useRef(null);
  useEffect(()=>{active.current?.abort();setResult(null);setError('');setBusy(false);return()=>active.current?.abort();},[client,incidentId,language]);
  async function send(){active.current?.abort();const controller=new AbortController();active.current=controller;setBusy(true);setError('');try{const value=await client.request('/v2/chat',{method:'POST',requestTimeoutMs:65000,signal:controller.signal,body:{message,language,...(incidentId?{incidentId}:{}),generate:true}});if(!controller.signal.aborted)setResult(value);}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setBusy(false);}}
  return <aside style={{position:'fixed',bottom:80,right:18,zIndex:95,maxWidth:'calc(100vw - 36px)'}}>
    <button aria-expanded={open} onClick={()=>setOpen(!open)} style={{padding:'12px 18px',borderRadius:18,background:'var(--brand-cyan-soft)',border:'1px solid var(--brand-cyan-ink)'}}>{t('chat')}</button>
    {open&&<section style={{width:350,maxWidth:'calc(100vw - 36px)',padding:18,background:'white',boxShadow:'0 4px 30px #1233',borderRadius:16,maxHeight:'65vh',overflow:'auto'}}>
      <h2>{t('chat')}</h2><p>{t('readOnly')}</p><small>{t('incident')}: {incidentId||'—'}</small>
      <label style={{display:'block'}}>{t('question')}<textarea aria-label={t('question')} value={message} onChange={e=>setMessage(e.target.value)} style={{width:'100%'}}/></label>
      <button disabled={busy||!message.trim()} onClick={send}>{busy?t('busy'):t('ask')}</button>
      {error&&<p role="alert">{error}</p>}{result&&<div aria-live="polite"><p>{result.answer}</p><small>{t('model')}: {result.providerStatus}</small>{result.sources.map(source=><p key={source.id}>{source.id} · {source.data.state||source.data.status||''}</p>)}</div>}
      <p><Link to="/workspace">{t('workspace')}</Link></p>
    </section>}
  </aside>;
}
