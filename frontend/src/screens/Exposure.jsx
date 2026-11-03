import React,{useEffect,useRef,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {useStore} from '../state/store';
import {useOperation,LoadState} from '../features/operations/common';
import {useOperationsText} from '../features/operations/text';
export default function Exposure(){
 const {incidentId}=useParams(),[search,setSearch]=useSearchParams(),{client,currentRole}=useStore(),L=useOperationsText();
 const [revision,setRevision]=useState(0),[filters,setFilters]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef(false);
 const hours=Number(search.get('window')||72),reportId=search.get('report');
 const state=useOperation(reportId?'/v2/exposure-reports/'+encodeURIComponent(reportId):`/incidents/${encodeURIComponent(incidentId)}/trace?window=${hours}`,revision);
 const report=state.data?.report,trace=report?.snapshot.trace||state.data;
 useEffect(()=>{if(report){setFilters(report.snapshot.filters);if(report.windowHours!==hours)setSearch({window:String(report.windowHours),report:report.reportId});}},[report?.reportId]);
 useEffect(()=>{setError('');},[client,incidentId]);
 if(!['Manager','Quality','Verifier'].includes(currentRole))return <section className="operations-page"><h1>{L('wrongRole')}</h1><Link to="/dashboard">{L('dashboard')}</Link></section>;
 if(report&&report.incidentId!==incidentId)return <section className="operations-page"><h1>{L('reportMismatch')}</h1><Link to={'/exposure/'+encodeURIComponent(report.incidentId)+'?report='+encodeURIComponent(report.reportId)}>{L('exposure')}</Link></section>;
 const units=trace?.units||[],shown=units.filter(u=>(!filters.serial||u.serial===filters.serial)&&(!filters.batchId||u.batchId===filters.batchId)&&(!filters.tier||u.tier===filters.tier)&&(!filters.locationStatus||u.locationStatus===filters.locationStatus)&&(!filters.shipmentId||u.evidenceIds.includes(filters.shipmentId)));
 const change=(key,value)=>{setFilters(previous=>{const next={...previous};if(value)next[key]=value;else delete next[key];return next;});};
 async function download(format){
  if(pending.current)return;pending.current=true;setBusy(true);setError('');
  try{
    let current=report;
    if(!current||JSON.stringify(current.snapshot.filters)!==JSON.stringify(filters)||current.windowHours!==hours){
      const result=await client.request(`/v2/incidents/${encodeURIComponent(incidentId)}/exposure-reports`,{method:'POST',body:{window:hours,filters},requestTimeoutMs:65000});current=result.report;setSearch({window:String(hours),report:current.reportId});
    }
    const blob=await client.download(`/v2/exposure-reports/${encodeURIComponent(current.reportId)}/download?format=${format}`,{requestTimeoutMs:65000});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`ToolSathi_${current.reportId}.${format}`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setError(e.message);}finally{pending.current=false;setBusy(false);}
 }
 return <section className="operations-page"><header className="operations-heading"><div><Link to={'/issues/'+encodeURIComponent(incidentId)}>{incidentId}</Link><h1>{L('exposure')}</h1></div><button disabled={busy} onClick={()=>{setSearch({window:String(hours)});setRevision(n=>n+1);}}>{L('refresh')}</button></header><p>{L('exposureCaution')}</p>
 <div className="operations-filters"><label>{L('traceWindow')}<select aria-label={L('traceWindow')} value={hours} onChange={e=>{setSearch({window:e.target.value});setFilters({});}}>{[24,72,168].map(h=><option key={h} value={h}>{h} h</option>)}</select></label>
 <label>{L('batch')}<select aria-label={L('batch')} value={filters.batchId||''} onChange={e=>change('batchId',e.target.value)}><option value="">{L('all')}</option>{[...new Set(units.map(u=>u.batchId))].map(id=><option key={id} value={id}>{id}</option>)}</select></label>
 <label>{L('tier')}<select aria-label={L('tier')} value={filters.tier||''} onChange={e=>change('tier',e.target.value)}><option value="">{L('all')}</option>{['CONFIRMED','PROBABLE','UNKNOWN'].map(t=><option key={t} value={t}>{L(t)}</option>)}</select></label>
 <label>{L('locationStatus')}<select aria-label={L('locationStatus')} value={filters.locationStatus||''} onChange={e=>change('locationStatus',e.target.value)}><option value="">{L('all')}</option>{['IN_STOCK','SHIPPED','UNKNOWN_LOCATION'].map(t=><option key={t} value={t}>{L(t)}</option>)}</select></label>
 <label>{L('serial')}<input value={filters.serial||''} onChange={e=>change('serial',e.target.value)}/></label><label>{L('shipmentId')}<input value={filters.shipmentId||''} onChange={e=>change('shipmentId',e.target.value)}/></label></div>
 <LoadState state={state} retry={()=>setRevision(n=>n+1)}/>{error&&<p role="alert">{error}</p>}
 {trace?.summary&&<><section className="operations-panel"><h2>{trace.toolId} · {trace.windowHours} h</h2><p>{trace.windowStart} → {trace.windowEnd}</p><p>{L('associatedUnits')}: {trace.summary.totalUnits} · {L('selectedUnits')}: {shown.length}</p><p>{Object.entries(trace.summary.byTier).map(([key,value])=>L(key)+': '+value).join(' · ')}</p><p>{L('qualityScore')}: {trace.dataQuality.score}/100 · {L('range')}: {trace.exposureRange.low}–{trace.exposureRange.high} · {L('UNKNOWN')}: {trace.exposureRange.unknownSeparate}</p><p>{L('locationCaution')}</p><button disabled={busy} onClick={()=>download('pdf')}>{L('downloadPdf')}</button><button disabled={busy} onClick={()=>download('csv')}>{L('downloadCsv')}</button>{report&&<p>{L('storedSnapshot')}: {report.reportId} · {report.createdAt} · {report.digest}</p>}</section>
 <div className="operations-table-wrap"><table className="operations-table"><thead><tr>{['serial','batch','tier','locationStatus','evidence'].map(k=><th key={k}>{L(k)}</th>)}</tr></thead><tbody>{shown.map(u=><tr key={u.serial}><td>{u.serial}</td><td>{u.batchId}</td><td>{L(u.tier)}<small>{u.tierReason}</small></td><td>{L(u.locationStatus)}<small>{u.location||L('unknown')} · {u.dealerId||''}</small></td><td><details><summary>{u.evidenceIds.length} {L('evidence')}</summary>{u.evidenceIds.join(', ')}<p>{u.flags.join(', ')}</p></details></td></tr>)}</tbody></table></div>
 <section className="operations-panel"><h2>{L('evidenceGaps')}</h2>{trace.gaps.map((g,i)=><p key={i}><b>{g.code}</b>: {g.message} · {g.runId} · {(g.evidenceIds||[]).join(', ')}</p>)}</section></>}
 </section>;
}
