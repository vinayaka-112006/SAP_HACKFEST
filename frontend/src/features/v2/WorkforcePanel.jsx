import React,{useEffect,useState} from 'react';
import {useStore} from '../../state/store';
export default function WorkforcePanel({incidentId}){
 const {client}=useStore();const [result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reason,setReason]=useState('');
 useEffect(()=>{setResult(null);setError('');},[client,incidentId]);
 async function load(){setResult(await client.request('/v2/incidents/'+encodeURIComponent(incidentId)+'/workforce'));}
 async function run(action){setBusy(true);setError('');try{await action();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="glass-panel" style={{padding:24,marginBottom:20}}><h2>Workforce reassignment</h2><p>Qualified alternatives during verified equipment downtime. Estimates use stored demand, rate, setup time and shift availability.</p>
 <button disabled={busy||!incidentId} onClick={()=>run(load)}>Find available capacity</button>{error&&<p role="alert">{error}</p>}
 {result&&<><p>{result.affectedWorkers.length} affected workers · {result.sourceTool.toolId} · {result.sourceTool.state}</p><label>Manager decision reason<input value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="workforce-grid">{result.recommendations.map(c=><article key={c.workerId+c.stationId} className="capacity-card"><b>{c.workerId} → {c.workCenter}</b><div className="capacity-number">+{c.estimatedImprovement}</div><p>Estimated additional units</p><p>Baseline: {c.baselineOutput} · Rate: {c.assumptions.unitsPerHour}/h · Setup: {c.assumptions.setupMinutes} min · Backlog: {c.assumptions.backlog}</p><button disabled={busy||!reason.trim()} onClick={()=>run(async()=>{await client.request('/v2/incidents/'+encodeURIComponent(incidentId)+'/workforce/assign',{method:'POST',body:{workerId:c.workerId,stationId:c.stationId,minutes:c.minutes,reason}});await load();})}>Approve reassignment</button></article>)}</div>
 {!result.recommendations.length&&<p>No eligible capacity available. Review staffing, qualifications and demand.</p>}
 {result.activeAssignments.map(a=><p key={a.assignmentId}>{a.workerId} → {a.stationId} · {a.status} <button disabled={busy||!reason.trim()||!result.returnCandidates.includes(a.assignmentId)} onClick={()=>run(async()=>{await client.request('/v2/workforce/'+encodeURIComponent(a.assignmentId)+'/return',{method:'POST',body:{reason}});await load();})}>Return to original station</button></p>)}<details><summary>Eligibility exclusions and assumptions</summary>{result.rejected.map((r,i)=><p key={i}>{r.workerId} / {r.stationId}: {r.reasons.join('; ')}</p>)}</details></>}
 </section>;
}
