import React,{useState} from 'react';
import {useStore} from '../../state/store';
export default function TraceTimeline(){
 const {trace,incident,tools}=useStore(),[selected,setSelected]=useState(null);
 if(!trace)return null;
 const tool=tools.find(t=>t.toolId===incident?.toolId);
 const events=[{id:'good',title:'Last verified-good record',time:tool?.lastVerifiedGood,detail:'Stored equipment check; no inferred calibration boundary'},{id:'report',title:'Incident reported',time:incident?.reportedAt,detail:incident?.rawText},{id:'snapshot',title:'Evidence snapshot',time:trace.snapshotTime||trace.generatedAt,detail:'Deterministic trace results for the selected window'}];
 const units=trace.units||[];const batches=[...new Set(units.map(u=>u.batchId).filter(Boolean))];
 for(const batch of batches)events.push({id:batch,title:'Batch record',time:null,detail:batch+' · '+units.filter(u=>u.batchId===batch).length+' potentially exposed units'});
 for(const gap of trace.gaps||[])events.push({id:'gap-'+events.length,title:'Missing evidence',time:null,detail:typeof gap==='string'?gap:JSON.stringify(gap),tier:'UNKNOWN'});
 return <section className="glass-panel trace-timeline"><h3>Investigation timeline</h3><p>Recorded times and record-linked associations. Shipment evidence does not establish a live location.</p><ol>{events.map(event=><li key={event.id} data-tier={event.tier}><button onClick={()=>setSelected(event)}>{event.title}</button><small>{event.time?new Date(event.time).toLocaleString():'Time not recorded'}</small><p>{event.detail}</p></li>)}</ol>{selected&&<div role="status"><b>{selected.title}</b><p>{selected.detail}</p></div>}</section>;
}
