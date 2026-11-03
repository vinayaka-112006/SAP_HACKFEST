import React,{useEffect,useRef,useState} from 'react';
import {useStore} from '../../state/store';
import {useLocale,LanguageSelector} from './locale';
import useSarvamRecorder from '../worker/useSarvamRecorder';
export default function WebsiteAssistant(){
 const {client,incidentId,currentRole}=useStore(),{language,t}=useLocale();
 const [open,setOpen]=useState(false),[message,setMessage]=useState(''),[messages,setMessages]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=useRef(null),region=useRef(null),composer=useRef(null);
 const recorder=useSarvamRecorder({client,language,enabled:open&&!busy&&['Worker','Manager'].includes(currentRole),onTranscript:r=>setMessage(r.transcript),onError:setError});
 useEffect(()=>{active.current?.abort();setMessages([]);setError('');setBusy(false);return()=>active.current?.abort();},[client,incidentId,language]);
 useEffect(()=>{if(open)composer.current?.focus();},[open]);
 useEffect(()=>{if(region.current)region.current.scrollTop=region.current.scrollHeight;},[messages,busy]);
 async function send(){if(busy||!message.trim())return;active.current?.abort();const controller=new AbortController();active.current=controller;const text=message.trim();setMessage('');setMessages(rows=>[...rows.slice(-18),{role:'worker',text}]);setBusy(true);setError('');try{const result=await client.request('/v2/chat',{method:'POST',requestTimeoutMs:65000,signal:controller.signal,body:{message:text,language,...(incidentId?{incidentId}:{}),generate:true}});if(!controller.signal.aborted)setMessages(rows=>[...rows,{role:'assistant',text:result.answer,sources:result.sources.slice(0,5),provider:result.providerStatus}]);}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setBusy(false);}}
 const robot=<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M8 13h1m6 0h1M9 17h6M1 11v5m22-5v5"/><circle cx="12" cy="3" r="1"/></svg>;
 return <aside className="assistant-shell"><button className="assistant-launcher" aria-expanded={open} aria-label={t('chat')} onClick={()=>setOpen(!open)}>{robot}<span>{t('chat')}</span></button>
 {open&&<section className="assistant-window" role="dialog" aria-label={t('chat')} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);recorder.cancel();}}}>
 <header><div className="robot-avatar">{robot}</div><div><h2>ToolSathi AI</h2><small>{currentRole} · {incidentId||t('readOnly')}</small></div><button className="assistant-close" aria-label="Close assistant" onClick={()=>{setOpen(false);recorder.cancel();}}>×</button></header>
 <div className="assistant-language"><LanguageSelector/></div>
 <div ref={region} className="chat-messages" aria-live="polite">{!messages.length&&<p className="assistant-welcome">{t('readOnly')}</p>}{messages.map((m,i)=><article key={i} className={'chat-message '+m.role}><small>{m.role==='assistant'?'ToolSathi AI':t('worker')}</small><p>{m.text}</p>{m.sources?.length>0&&<details><summary>Sources · {m.sources.length}</summary>{m.sources.map(s=><div className="citation-card" key={s.id}><b>{s.data?.title||s.type}</b><small>{s.citation?.sourceId||s.id}</small><p>{s.data?.excerpt?.slice(0,180)||s.data?.state||s.data?.status||''}</p></div>)}</details>}{m.provider?.startsWith('AI_')&&<small role="status">{m.provider} · {t('provider')}</small>}</article>)}{busy&&<p className="typing-indicator">● ● ● <span>{t('busy')}</span></p>}</div>
 {error&&<p role="alert" className="assistant-error">{error}</p>}
 <form className="assistant-composer" onSubmit={e=>{e.preventDefault();send();}}><label className="sr-only" htmlFor="assistant-input">{t('question')}</label><textarea id="assistant-input" ref={composer} rows={2} value={message} placeholder={t('question')} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}/><div><button type="button" disabled={!recorder.supported||busy||!['Worker','Manager'].includes(currentRole)} onClick={recorder.toggle} aria-label={t('voice')}>{recorder.recording?'■':'◉'}</button><button type="submit" disabled={busy||!message.trim()}>{t('ask')} ↗</button></div></form>
 </section>}
 </aside>;
}
