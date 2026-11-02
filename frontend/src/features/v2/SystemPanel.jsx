import React,{useState} from 'react';
import {useStore} from '../../state/store';
export default function SystemPanel(){
 const {client,currentRole}=useStore(),[status,setStatus]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(check=false){setBusy(true);setError('');try{if(check)await client.request('/v2/system/check',{method:'POST',body:{},requestTimeoutMs:65000});setStatus(await client.request('/v2/system'));}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="glass-panel" style={{padding:20,marginBottom:20}}><h2>Integration status</h2><button disabled={busy} onClick={()=>load()}>Refresh integration status</button>{currentRole==='Administrator'&&<button disabled={busy} onClick={()=>load(true)}>Verify AI connections</button>}{error&&<p role="alert">{error}</p>}{status&&<div className="workforce-grid"><p>{status.database.mode==='hana'?'SAP HANA Cloud':'SQLite'} · {status.database.connected?'Connected':'Unverified'}</p><p>Groq · {status.groq.verified?'Verified':status.groq.configured?'Configured; not verified':'Not configured'}</p><p>Sarvam · {status.sarvam.verified?'Verified':status.sarvam.configured?'Configured; not verified':'Not configured'}</p><p>SAP S/4HANA · SIMULATED</p><p>Digital Manufacturing · SIMULATED</p><p>Synthetic manufacturing records</p></div>}</section>;
}
