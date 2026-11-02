import React,{useEffect,useRef,useState} from 'react';
import {useStore} from '../../state/store';
import {useLocale} from './locale';
import useSarvamRecorder from '../worker/useSarvamRecorder';
export default function VoiceAgent({toolId,onConfirmed}){
  const {client,apiConfig}=useStore(),{language,t}=useLocale();
  const [session,setSession]=useState(null),[state,setState]=useState('IDLE'),[text,setText]=useState(''),[error,setError]=useState(''),[audio,setAudio]=useState(''),[description,setDescription]=useState('');
  const player=useRef(null),operation=useRef(null);
  const request=async(path,body)=>{
    if(!operation.current||operation.current.signal.aborted)operation.current=new AbortController();
    const current=operation.current;
    try{
      const value=await client.request('/v2'+path,{method:'POST',body,requestTimeoutMs:65000,signal:current.signal});
      if(current!==operation.current||current.signal.aborted)throw new DOMException('Cancelled','AbortError');
      return value;
    }catch(error){
      if(current!==operation.current||current.signal.aborted)throw new DOMException('Cancelled','AbortError');
      throw error;
    }
  };
  const recorder=useSarvamRecorder({client,language,enabled:state!=='SPEAKING'&&state!=='REASONING'&&state!=='REVIEW',onTranscript:result=>{setText(result.transcript);setState('LISTENING');},onError:message=>{setError(message);setState('LISTENING');}});
  useEffect(()=>{setSession(null);setText('');setError('');setAudio('');setDescription('');setState('IDLE');return()=>{operation.current?.abort();operation.current=null;player.current?.pause();};},[client,language,toolId]);
  async function speak(row){
    recorder.cancel();setState('SPEAKING');
    try{const response=await request(`/conversations/${row.sessionId}/readback`,{reviewed:true});if(!response.audio)throw new Error(response.providerStatus);setAudio(`data:${response.mimeType};base64,${response.audio}`);}catch(e){if(e.name==='AbortError')return;setError(e.message);setState('LISTENING');}
  }
  async function start(){operation.current?.abort();operation.current=new AbortController();setError('');setState('REASONING');try{const row=await request('/conversations',{toolId,language});setSession(row);await speak(row);}catch(e){if(e.name==='AbortError')return;setError(e.message);setState('IDLE');}}
  async function send(unknown=false){
    operation.current?.abort();operation.current=new AbortController();player.current?.pause();recorder.cancel();setState('REASONING');setError('');
    const facts=session.field&&(unknown||!apiConfig.aiEnabled)?{[session.field]:unknown?'unknown':text}:undefined;
    try{const row=await request(`/conversations/${session.sessionId}/messages`,{version:session.version,text:unknown?'unknown':text,...(facts?{facts}:{}),reason:apiConfig.aiEnabled});setSession(row);setText('');if(row.draft?.translatedText)setDescription(row.draft.translatedText);if(row.ready){setDescription(row.messages.filter(m=>m.role==='worker').map(m=>m.text).join('\n'));setAudio('');setState('REVIEW');}else await speak(row);}catch(e){if(e.name==='AbortError')return;setError(e.message);setState('LISTENING');}
  }
  function stop(){operation.current?.abort();operation.current=null;player.current?.pause();recorder.cancel();setAudio('');setState(session?'LISTENING':'IDLE');}
  const displayedState=recorder.recording?'LISTENING':recorder.transcribing?'TRANSCRIBING':state;
  return <section className="voice-agent glass-card" aria-label={t('voice')}>
    <header><div className={'robot-avatar '+(state==='SPEAKING'?'speaking':'')}>TS</div><div><h2>{t('voice')}</h2><p aria-live="polite">{t(displayedState)}</p></div></header>
    <div className="waveform" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{animationDelay:`${i*.09}s`,animationPlayState:recorder.recording||state==='SPEAKING'?'running':'paused'}}/>)}</div>
    {error&&<p role="alert">{error} · {t('provider')}</p>}
    {!session?<button disabled={!toolId||state==='REASONING'} onClick={start}>{t('start')}</button>:<>
      <div className="voice-history" aria-live="polite">{session.messages.map((message,i)=><p key={i} className={'chat-message '+message.role}>{message.text}</p>)}{session.question&&session.messages.at(-1)?.text!==session.question&&<p className="chat-message assistant">{session.question}</p>}</div>
      {audio&&<audio ref={player} controls autoPlay src={audio} onPlay={()=>{recorder.cancel();setState('SPEAKING');}} onEnded={()=>setState('LISTENING')} onPause={()=>{if(state==='SPEAKING')setState('LISTENING');}}/>}
      {state==='REVIEW'?<><label>{t('description')}<textarea aria-label={t('description')} value={description} onChange={e=>setDescription(e.target.value)}/></label><button disabled={!description.trim()} onClick={async()=>{setState('REASONING');try{const result=await request(`/conversations/${session.sessionId}/submit`,{version:session.version,confirmed:true,description});setState('CONFIRMED');onConfirmed(result.incident.incidentId);}catch(e){setError(e.message);setState('REVIEW');}}}>{t('confirm')}</button></>:state==='CONFIRMED'?<p>{t('submitted')}</p>:<>
        <label>{t('speechReview')}<textarea aria-label={t('speechReview')} value={text} onChange={e=>setText(e.target.value)} disabled={state==='REASONING'}/></label>
        <div className="agent-controls"><button disabled={!recorder.supported||state==='SPEAKING'||state==='REASONING'} onClick={recorder.toggle}>{recorder.recording?t('stop'):t('voice')}</button><button disabled={!text.trim()||state==='REASONING'} onClick={()=>send()}>{t('send')}</button><button disabled={!session.field||state==='REASONING'} onClick={()=>send(true)}>{t('unknown')}</button><button onClick={()=>{stop();setDescription(session.messages.filter(m=>m.role==='worker').map(m=>m.text).join('\n'));setState('REVIEW');}}>{t('review')}</button></div>
      </>}
      <button onClick={stop}>{t('stop')}</button>
    </>}
  </section>;
}
