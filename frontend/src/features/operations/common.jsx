import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useStore} from '../../state/store';
import {rolePath,useOperationsText} from './text';
export function useOperation(path,revision=0){
 const {client}=useStore(),[state,setState]=useState({loading:true,data:null,error:''});
 useEffect(()=>{const controller=new AbortController();setState({loading:true,data:null,error:''});client.request(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({loading:false,data,error:''});}).catch(e=>{if(!controller.signal.aborted)setState({loading:false,data:null,error:e.message});});return()=>controller.abort();},[client,path,revision]);
 return state;
}
export function OperationsNav(){const {currentRole}=useStore(),L=useOperationsText();return <nav className="operations-nav" aria-label={L('dashboard')}><Link to={rolePath(currentRole)}>{L('dashboard')}</Link><Link to="/issues">{L('issues')}</Link><Link to="/history">{L('equipment')}</Link>{currentRole==='Technician'&&<Link to="/technician">{L('assigned')}</Link>}{['Manager','Quality','Verifier'].includes(currentRole)&&<Link to="/issues?view=exposure">{L('exposure')}</Link>}<Link to="/notifications">{L('notifications')}</Link><Link to="/profile">{L('profile')}</Link></nav>;}
export function LoadState({state,retry}){const L=useOperationsText();if(state.loading)return <p role="status">{L('loading')}</p>;if(state.error)return <div role="alert"><p>{state.error}</p><button onClick={retry}>{L('retry')}</button></div>;return null;}
export function IssueTable({issues=[]}){const L=useOperationsText();return issues.length?<div className="operations-table-wrap"><table className="operations-table"><thead><tr>{['issues','equipment','status','severity','reportedAt','assigned','next'].map(k=><th key={k}>{L(k)}</th>)}</tr></thead><tbody>{issues.map(i=><tr key={i.incidentId}><td><Link to={'/issues/'+encodeURIComponent(i.incidentId)}>{i.incidentId}</Link><small>{i.translatedText||i.rawText}</small></td><td>{i.toolId}<small>{i.tool?.workCenter}</small></td><td>{L(i.status)}</td><td>{L(i.severity)}</td><td>{new Date(i.reportedAt).toLocaleString()}</td><td>{i.workOrder?.technicianId||'—'}</td><td><Link to={'/issues/'+encodeURIComponent(i.incidentId)}>{L(i.nextAction)}</Link></td></tr>)}</tbody></table></div>:<p>{L('empty')}</p>;}
