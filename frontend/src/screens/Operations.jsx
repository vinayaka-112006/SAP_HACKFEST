import React,{useEffect,useState} from 'react';
import {Link,Navigate,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {useStore} from '../state/store';
import {useLocale} from '../features/v2/locale';
import VoiceAgent from '../features/v2/VoiceAgent';
import Worker from './Worker';
import WorkflowPanel from '../features/workflow/WorkflowPanel';
import WorkforcePanel from '../features/v2/WorkforcePanel';
import {useOperation,LoadState,IssueTable} from '../features/operations/common';
import {rolePath,useOperationsText} from '../features/operations/text';
import {AssignmentActions,ConversationActions,DuplicateActions,RepairActions,WorkerAssignments} from '../features/operations/CaseActions';
import '../styles/operations.css';

export function DashboardRedirect(){const {currentRole}=useStore();return <Navigate to={rolePath(currentRole)} replace/>;}
export function RoleDashboard({role}){
 const {currentRole,tools,openIncident,refresh}=useStore(),L=useOperationsText(),navigate=useNavigate();
 const [revision,setRevision]=useState(0),[toolId,setToolId]=useState('');
 const state=useOperation('/v2/dashboard',revision);
 useEffect(()=>{const timer=setInterval(()=>setRevision(n=>n+1),30000);return()=>clearInterval(timer);},[]);
 if(currentRole!==role&&!(role==='Worker'&&currentRole==='Manager'))return <section className="operations-page"><h1>{L('wrongRole')}</h1><Link to={rolePath(currentRole)}>{L(currentRole)}</Link></section>;
 const data=state.data,worker=role==='Worker';
 const metricStatus={new:'Awaiting manager review',critical:null,repairs:'Repair in progress',review:'Awaiting manager completion review',verification:'Awaiting verification'};
 const keys=role==='Manager'?['open','new','critical','repairs','review','verification','restricted','exposed','idle','reassigned','availableTechnicians','pendingDemand']:role==='Technician'?['open','repairs','review','verification']:role==='Verifier'?['open','new','verification','restricted']:['open','review','verification'];
 return <div className="operations-page"><header className="operations-heading"><div><p>{L('dashboard')}</p><h1>{L(role)}</h1>{data?.permissions.profile&&<p>{data.permissions.profile.displayName} · {data.permissions.profile.workCenter} · {data.profileDetail?.shift||L('unknown')}</p>}</div><button onClick={()=>setRevision(n=>n+1)}>{L('refresh')}</button></header>
 <LoadState state={state} retry={()=>setRevision(n=>n+1)}/>
 {worker&&<section className="operations-panel"><h2>{L('voice')}</h2><p>{L('voiceHelp')}</p><label>{L('equipment')}<select aria-label={L('equipment')} value={toolId} onChange={e=>setToolId(e.target.value)}><option value="">{L('equipment')}</option>{tools.map(t=><option key={t.toolId} value={t.toolId}>{t.toolId} · {t.workCenter} · {t.state}</option>)}</select></label><VoiceAgent toolId={toolId} onConfirmed={id=>{openIncident(id);refresh();navigate('/issues/'+encodeURIComponent(id));}}/></section>}
 {data&&<><div className="operations-metrics">{keys.map(key=><Link key={key} to={'/issues'+(metricStatus[key]?'?status='+encodeURIComponent(metricStatus[key]):key==='critical'?'?severity=Critical':'')}><span>{L(key)}</span><strong>{data.counts[key]}</strong></Link>)}</div><section className="operations-panel"><h2>{worker?L('myReports'):L('issues')}</h2><IssueTable issues={data.issues}/></section>{worker&&<WorkerAssignments assignments={data.assignments} done={()=>setRevision(n=>n+1)}/>}</>}
 {worker&&<section className="operations-panel"><h2>{L('manual')}</h2><Worker/></section>}
 </div>;
}
export function Issues(){
 const L=useOperationsText(),[search,setSearch]=useSearchParams(),[revision,setRevision]=useState(0);
 const state=useOperation('/v2/issues?'+search.toString(),revision),data=state.data;
 const filter=(key,value)=>{const next=new URLSearchParams(search);if(value)next.set(key,value);else next.delete(key);next.delete('offset');setSearch(next);};
 return <section className="operations-page"><header className="operations-heading"><h1>{L('issues')}</h1><button onClick={()=>setRevision(n=>n+1)}>{L('refresh')}</button></header><div className="operations-filters">
 <label>{L('search')}<input value={search.get('search')||''} onChange={e=>filter('search',e.target.value)}/></label>
 {['status','severity','urgency','workCenter','shift','toolId'].map(key=><label key={key}>{L({workCenter:'center',toolId:'equipment'}[key]||key)}<input value={search.get(key)||''} onChange={e=>filter(key,e.target.value)}/></label>)}
 {['from','to'].map(key=><label key={key}>{L(key)}<input type="date" value={search.get(key)||''} onChange={e=>filter(key,e.target.value)}/></label>)}
 <label>{L('sort')}<select aria-label={L('sort')} value={search.get('sort')||'reportedAt'} onChange={e=>filter('sort',e.target.value)}>{['reportedAt','status'].map(k=><option key={k} value={k}>{L(k)}</option>)}</select></label></div>
 <LoadState state={state} retry={()=>setRevision(n=>n+1)}/>{data&&<><IssueTable issues={data.issues}/><p>{data.offset+data.issues.length} / {data.total}</p><button disabled={!data.offset} onClick={()=>filter('offset','')}>{L('first')}</button><button disabled={data.offset+data.limit>=data.total} onClick={()=>{const next=new URLSearchParams(search);next.set('offset',String(data.offset+data.limit));setSearch(next);}}>{L('more')}</button></>}</section>;
}
function Triage({issue,done}){
 const {client}=useStore(),L=useOperationsText(),[form,setForm]=useState({severity:issue.severity==='Unassessed'?'Medium':issue.severity,urgency:issue.urgency,shift:issue.operation?.shift||'Day',reason:'',escalate:false}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{await client.request(`/v2/incidents/${encodeURIComponent(issue.incidentId)}/triage`,{method:'POST',body:{...form,version:issue.operation?.version||0}});done();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <form onSubmit={submit} className="operations-form"><h3>{L('reviewReport')}</h3>{['severity','urgency'].map(k=><label key={k}>{L(k)}<select aria-label={L(k)} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}>{(k==='severity'?['Low','Medium','High','Critical']:['Normal','Urgent','Immediate']).map(x=><option key={x} value={x}>{L(x)}</option>)}</select></label>)}{['shift','reason'].map(k=><label key={k}>{L(k)}<input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<label><input type="checkbox" checked={form.escalate} onChange={e=>setForm({...form,escalate:e.target.checked})}/>{L('escalate')}</label><button disabled={busy}>{L('save')}</button>{error&&<p role="alert">{error}</p>}</form>;
}
export function IssueDetail(){
 const {incidentId}=useParams(),{currentRole,openIncident,refresh}=useStore(),L=useOperationsText(),[search,setSearch]=useSearchParams();
 const [revision,setRevision]=useState(0),state=useOperation('/v2/issues/'+encodeURIComponent(incidentId),revision),data=state.data;
 useEffect(()=>{openIncident(incidentId);},[incidentId]);
 const done=()=>{refresh();setRevision(n=>n+1);},tab=search.get('tab')||'overview';
 const tabs=['overview','conversation',...(['Manager','Quality'].includes(currentRole)?['duplicates']:[]),'assignment','repair',...(['Manager','Verifier','Quality'].includes(currentRole)?['exposure','approvals']:[]),...(currentRole==='Manager'?['workforce']:[]),'timeline'];
 return <article className="operations-page"><header className="operations-heading"><div><Link to="/issues">{L('issues')}</Link><h1>{incidentId}</h1>{data&&<p>{data.issue.toolId} · {L(data.issue.status)} · {L(data.issue.nextAction)}</p>}</div><button onClick={done}>{L('refresh')}</button></header><LoadState state={state} retry={done}/>{data&&<><nav className="operations-tabs" aria-label={L('issues')}>{tabs.map(k=><button key={k} aria-pressed={tab===k} onClick={()=>setSearch({tab:k})}>{L(k)}</button>)}</nav><section className="operations-panel">
 {tab==='overview'&&<><h2>{L('original')}</h2><p className="preserve-text">{data.issue.rawText}</p><h3>{L('summary')}</h3><p>{data.issue.translatedText||L('unknown')}</p><p>{L('reporter')}: {data.issue.reporterId} · {new Date(data.issue.reportedAt).toLocaleString()}</p><p>{data.issue.tool?.workCenter} · {L(data.issue.tool?.state)} · {L(data.issue.severity)}</p>{currentRole==='Manager'&&data.issue.state==='Confirmed'&&<Triage key={revision} issue={data.issue} done={done}/>}</>}
 {tab==='conversation'&&<ConversationActions data={data} done={done}/>}
 {tab==='timeline'&&<ol className="operations-timeline">{data.timeline.map(e=><li key={e.auditId}><strong>{e.action}</strong><p>{e.reason}</p><small>{new Date(e.timestamp).toLocaleString()} · {e.actor} · {e.actorRole}</small></li>)}</ol>}
 {tab==='workforce'&&<WorkforcePanel incidentId={incidentId}/>}
 {tab==='exposure'&&<Link to={'/exposure/'+encodeURIComponent(incidentId)}>{L('exposure')}</Link>}
 {tab==='assignment'&&<AssignmentActions data={data} done={done}/>}
 {tab==='repair'&&<RepairActions key={revision} data={data} done={done}/>}
 {tab==='approvals'&&<WorkflowPanel/>}
 {tab==='duplicates'&&<DuplicateActions data={data} done={done}/>}
 </section></>}</article>;
}
export function Notifications(){const {client}=useStore(),L=useOperationsText(),[revision,setRevision]=useState(0),[error,setError]=useState(''),state=useOperation('/v2/notifications',revision);
 useEffect(()=>{const timer=setInterval(()=>setRevision(n=>n+1),30000);return()=>clearInterval(timer);},[]);
 return <section className="operations-page"><h1>{L('notifications')} {state.data&&`(${state.data.unread})`}</h1><LoadState state={state} retry={()=>setRevision(n=>n+1)}/>{error&&<p role="alert">{error}</p>}{state.data?.notifications.map(n=><article className="operations-panel" key={n.notificationId}><Link to={n.href}>{n.message}</Link><p>{new Date(n.createdAt).toLocaleString()} · {L(n.read?'read':'unread')}</p>{!n.read&&<button onClick={async()=>{try{await client.request(`/v2/notifications/${encodeURIComponent(n.notificationId)}/read`,{method:'POST',body:{}});setRevision(n=>n+1);}catch(e){setError(e.message);}}}>{L('markRead')}</button>}</article>)}</section>;
}
export function Profile(){const {client}=useStore(),{language}=useLocale(),L=useOperationsText(),[revision,setRevision]=useState(0),state=useOperation('/v2/me',revision),[form,setForm]=useState({displayName:'',workCenter:'',team:'',invitationId:''}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const profile=state.data?.profile;
 useEffect(()=>{if(profile)setForm({displayName:profile.displayName,workCenter:profile.workCenter,team:profile.team,invitationId:''});},[profile]);
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{await client.request(profile?'/v2/profile':'/v2/register',{method:profile?'PUT':'POST',body:profile?{displayName:form.displayName,language}:{...form,language,invitationId:form.invitationId||undefined}});setRevision(n=>n+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="operations-page"><h1>{L(profile?'profile':'register')}</h1><p>{L('productionLogin')}</p><LoadState state={state} retry={()=>setRevision(n=>n+1)}/>{state.data&&<><p>{L('identity')}: {state.data.identity.id} · {state.data.identity.roles.map(L).join(', ')}</p>{profile&&<p>{L('registered')}: {L(profile.role)} · {profile.workCenter} · {profile.team}</p>}<form className="operations-form" onSubmit={submit}>{(profile?['displayName']:['displayName','workCenter','team','invitationId']).map(k=><label key={k}>{L({displayName:'name',workCenter:'center',invitationId:'invitation'}[k]||k)}<input required={k!=='invitationId'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<button disabled={busy}>{L(profile?'save':'register')}</button></form></>}{error&&<p role="alert">{error}</p>}</section>;
}
export function Login(){
 const {apiConfig,currentRole,setCurrentRole,demoUserId,setDemoUserId}=useStore(),L=useOperationsText(),navigate=useNavigate();
 const identities=useOperation(apiConfig.demoMode?'/v2/demo-identities':'/v2/me');
 const selected=identities.data?.identities?.find(p=>p.userId===demoUserId);
 return <section className="operations-page"><h1>{L('login')}</h1><p>{L('productionLogin')}</p>{apiConfig.demoMode&&<form className="operations-form" onSubmit={e=>{e.preventDefault();navigate(rolePath(currentRole));}}><h2>{L('demo')}</h2>
 {!!identities.data?.identities?.length&&<label>{L('demoIdentity')}<select aria-label={L('demoIdentity')} value={selected?.userId||''} onChange={e=>{const p=identities.data.identities.find(p=>p.userId===e.target.value);if(p){setDemoUserId(p.userId);setCurrentRole(p.role);}}}><option value="">{L('demoIdentity')}</option>{identities.data.identities.map(p=><option key={p.userId} value={p.userId}>{L(p.role)} - {p.displayName} - {p.workCenter}</option>)}</select></label>}
 {selected&&<p>{L('demoShift')}: {new Date(selected.shiftEndsAt).toLocaleString()}</p>}
 <label>{L('identity')}<input required value={demoUserId} onChange={e=>setDemoUserId(e.target.value)}/></label><select aria-label={L('profile')} value={currentRole} onChange={e=>setCurrentRole(e.target.value)}>{['Worker','Manager','Technician','Verifier','Quality','Administrator'].map(r=><option key={r} value={r}>{L(r)}</option>)}</select><button>{L('continue')}</button></form>}<Link to="/register">{L('register')}</Link></section>;
}
