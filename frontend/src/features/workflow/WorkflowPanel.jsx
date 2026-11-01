import React, { useEffect, useRef, useState } from 'react';
import GlassPanel from '../../components/GlassPanel';
import { useStore } from '../../state/store';
import IncidentEvaluation from '../history/IncidentEvaluation';
import { renderExecutiveReport } from './executive-report';

const control = { padding: 10, borderRadius: 8, border: '1px solid #bdd5de', maxWidth: '100%', color: 'var(--ink)', background: 'white' };
const stack = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0' };
function Button({ children, disabled, onClick }) {
  return <button type="button" style={{ ...control, fontWeight: 700, background: disabled ? '#e4eaee' : '#ccf5f6', cursor: disabled ? 'default' : 'pointer' }} disabled={disabled} onClick={onClick}>{children}</button>;
}
function Panel({ title, children }) {
  return <GlassPanel style={{ padding: 24, marginBottom: 18, overflowWrap: 'anywhere' }}><h3 style={{ color: 'var(--brand-cyan-ink)', marginTop: 0 }}>{title}</h3>{children}</GlassPanel>;
}
export default function WorkflowPanel() {
  const { client, incident, incidentId, incidentState, currentRole, demoUserId, refresh } = useStore();
  const retained = useRef(null);
  if (incident) retained.current = { incidentId, incident };
  const current = incident || (incidentState.loading && retained.current?.incidentId === incidentId ? retained.current.incident : null);
  // Key the working state to incident AND identity; stale asynchronous responses cannot
  // attach an approval, report or plan to a different incident or persona.
  return current ? <Workflow key={`${incidentId}:${currentRole}:${demoUserId}`} {...{ client, incident: current, incidentId, currentRole, demoUserId, refresh }} /> : null;
}
function Workflow({ client, incident, incidentId, currentRole, demoUserId, refresh }) {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [repairRecords, setRepairRecords] = useState([]);
  const [evaluation, setEvaluation] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState('TOOL_RESTRICTION');
  const [alternative, setAlternative] = useState('');
  const [reference, setReference] = useState('');
  const [compatible, setCompatible] = useState(false);
  const [available, setAvailable] = useState(false);
  const [description, setDescription] = useState('');
  const [readingName, setReadingName] = useState('');
  const [readingResult, setReadingResult] = useState('');
  const [readings, setReadings] = useState([]);
  const [insufficient, setInsufficient] = useState(false);
  const mounted = useRef(true);
  const manager = currentRole === 'Manager';
  const review = ['Manager', 'Quality', 'Verifier'].includes(currentRole);
  const base = `/incidents/${encodeURIComponent(incidentId)}`;
  const post = (path, body, options = {}) => client.request(base + path, { method: 'POST', body, ...options });
  async function load() {
    if (['Technician', 'Verifier', 'Manager', 'Quality'].includes(currentRole)) {
      const result = await client.request(base + '/repair-records');
      if (mounted.current) setRepairRecords(result.repairs);
    }
    if (!review) return;
    const [recovery, persisted] = await Promise.all([client.request(base + '/recovery'), client.request(base + '/executive-report')]);
    if (mounted.current) { setData(recovery); setReport(persisted); }
  }
  useEffect(() => {
    mounted.current = true;
    load().catch(e => { if (mounted.current) setMessage(e.message); });
    if (review) Promise.all([client.getDuplicates(incidentId), client.getRepeatFailures(incidentId)])
      .then(([duplicates, repeatFailures]) => { if (mounted.current) setEvaluation({ duplicates, repeatFailures }); })
      .catch(e => { if (mounted.current) setMessage(e.message); });
    return () => { mounted.current = false; };
  }, [client, incidentId]);
  async function run(action, success) {
    setBusy(true); setMessage('');
    try {
      await action();
      if (mounted.current) {
        setMessage(success);
        try { await load(); } catch (e) { if (mounted.current) setMessage(`${success} Refresh failed: ${e.message}`); }
        refresh();
      }
    } catch (e) { if (mounted.current) setMessage(`Request failed: ${e.message}`); }
    finally { if (mounted.current) setBusy(false); }
  }
  const plans = [...(data?.records || [])].filter(r => r.type === 'RECOVERY_PLAN').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const plan = plans[0];
  const proposals = report?.proposals || [];
  const approvals = report?.approvals || [];
  const repair = repairRecords.find(r => !r.verifiedBy);
  async function download() {
    const persisted = await client.request(base + '/executive-report');
    if (!mounted.current) return;
    const url = URL.createObjectURL(new Blob([renderExecutiveReport(persisted)], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = `ToolSathi_Evidence_Report_${incidentId.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div>
    <Panel title={`Incident ${incidentId} · Containment & Recovery`}>
      <p><strong>{incident.state}</strong> · {demoUserId} ({currentRole}) · SIMULATED manufacturing scenario</p>
      <p>Worker observation: {incident.rawText || 'Unknown'}</p>
      <p>Stored translation: {incident.translatedText || 'Unknown'} · Intake model: {incident.modelVersion || 'Manual / Unknown'}</p>
      <p>Use the role selector to act as each participant. Actions use the selected identity and server authorization.</p>
      {message && <p role="status" style={{ padding: 12, background: '#edf6fa' }}>{message}</p>}
      <label>Review / decision / closure reason<br /><textarea aria-label="Workflow reason" value={reason} onChange={e => setReason(e.target.value)} style={{ ...control, width: '100%' }} maxLength={1000} /></label>
    </Panel>
    {review && <IncidentEvaluation incidentId={incidentId} {...evaluation} />}
    <Panel title="1. Containment proposal and human decision">
      <p>Suggestions require supporting records. Approval and execution are separate actions.</p>
      <div style={stack}><select aria-label="Containment proposal type" style={control} value={type} onChange={e => setType(e.target.value)}>
        {['TOOL_RESTRICTION', 'STOCK_BLOCK', 'QUALITY_NOTIFICATION', 'MAINTENANCE_NOTIFICATION'].map(t => <option key={t}>{t}</option>)}
      </select><Button disabled={busy || !['Worker', 'Manager'].includes(currentRole) || !reason.trim()} onClick={() => run(() => client.createProposal(incidentId, { type, reason }), 'Proposal saved for review; no action executed.')}>Create containment proposal</Button></div>
      {proposals.map(p => {
        const approval = approvals.find(a => a.proposalId === p.proposalId);
        const role = ['STOCK_BLOCK', 'QUALITY_NOTIFICATION'].includes(p.type) ? 'Quality' : 'Manager';
        return <div key={p.proposalId} style={{ borderTop: '1px solid #d4e2e8', padding: '14px 0' }}>
          <strong>{p.type} · {p.state}</strong><p>{p.proposalId} · {p.reason}</p>
          <details><summary>Approved scope / evidence</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(p.payload, null, 2)}</pre></details>
          <div style={stack}>{['APPROVED', 'REJECTED'].map(decision => <Button key={decision} disabled={busy || currentRole !== role || p.state !== 'Pending' || !reason.trim()} onClick={() => run(() => client.decideApproval(p.proposalId, { decision, reason }), `Decision ${decision} recorded; no action executed.`)}>{decision === 'APPROVED' ? 'Approve' : 'Reject'} {p.type}</Button>)}
          <Button disabled={busy || currentRole !== role || p.state !== 'Approved' || !approval} onClick={() => run(() => p.type === 'RECOVERY_PLAN'
            ? post('/recovery/execute', { approvalId: approval.approvalId })
            : client.request(({ TOOL_RESTRICTION: '/mock/dm/tool-restrictions', STOCK_BLOCK: '/mock/s4/stock-blocks', QUALITY_NOTIFICATION: '/mock/s4/quality-notifications', MAINTENANCE_NOTIFICATION: '/mock/s4/maintenance-notifications' })[p.type], { method: 'POST', body: { ...p.payload, incidentId, approvalId: approval.approvalId, requestedBy: demoUserId } }), 'Simulated action recorded by backend.')}>Execute simulated {p.type}</Button></div>
          {approval && <p>Approval {approval.approvalId}: {approval.decision} by {approval.decidedBy} ({approval.approverRole})</p>}
        </div>;
      })}
    </Panel>
    <Panel title="2. Recovery Planning Agent">
      <p>Intake handoff → planner read tools → recommendation → human approval → simulated execution. Deterministic tracing remains a read tool.</p>
      {data?.context.candidates.map(c => <p key={c.tool.toolId}><strong>{c.tool.toolId}: {c.status}</strong> · {c.reasons.join('; ') || 'Recorded eligibility checks passed; manager approval still required'}</p>)}
      {manager && <details><summary>Record reviewed alternative-tool evidence</summary>
        <p>Confirm against an actual operation specification and availability record. This records a manager attestation, not a calibration certificate. Evidence expires after one hour.</p>
        <div style={stack}><select aria-label="Alternative tool" value={alternative} onChange={e => setAlternative(e.target.value)} style={control}><option value="">Select alternative</option>{data?.context.candidates.map(c => <option key={c.tool.toolId}>{c.tool.toolId}</option>)}</select>
        <input aria-label="Compatibility source reference" placeholder="Operation specification / availability reference" value={reference} onChange={e => setReference(e.target.value)} maxLength={500} style={{ ...control, flex: 1 }} /></div>
        <div style={stack}><label><input type="checkbox" checked={compatible} onChange={e => setCompatible(e.target.checked)} /> Operation compatibility reviewed</label><label><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} /> Available for reassignment</label></div>
        <Button disabled={busy || !alternative || !reference.trim()} onClick={() => run(() => post('/recovery/evidence', { alternativeToolId: alternative, sourceReference: reference, operationCompatible: compatible, available, validUntil: new Date(Date.now() + 3600000).toISOString() }), 'Evidence recorded with selected manager identity.')}>Save reviewed evidence</Button>
      </details>}
      <div style={stack}><Button disabled={busy || !manager || incident.state !== 'Confirmed'} onClick={() => run(() => post('/recovery/plans', {}, { requestTimeoutMs: 70000 }), 'Recovery recommendation saved; no action executed.')}>Generate recovery plan</Button></div>
      {plan && <div><p><strong>Recommendation: {plan.payload.selectedOptionId}</strong> · {plan.docId}</p><p>{plan.payload.explanation}</p><p>AI model: {plan.payload.modelVersion} · Downtime avoided: Unknown</p>
        <ol>{plan.payload.steps.map((s, i) => <li key={i}>{s.agent}: {s.tool || s.sourceId || s.optionId} {s.status}</li>)}</ol>
        <p>Evidence: {plan.payload.citedEvidenceIds.join(', ')}</p>
        <Button disabled={busy || !manager || !reason.trim()} onClick={() => run(() => post('/recovery/proposals', { planId: plan.docId, reason }), 'Recovery proposal saved. Approve and execute separately above.')}>Submit recovery proposal</Button>
      </div>}
      {data?.records.filter(r => r.type === 'RECOVERY_EXECUTION').map(r => <p key={r.docId}><strong>SIMULATED:</strong> {r.payload.outcome} · {r.docId} · Approval {r.payload.approvalId}</p>)}
    </Panel>
    <Panel title="3. Repair, independent verification and closure">
      <p>Enter actual observations. No readings, certificate attachments or successful verification are generated automatically.</p>
      <textarea aria-label="Repair description" placeholder="Repair performed and evidence references" value={description} onChange={e => setDescription(e.target.value)} style={{ ...control, width: '100%' }} />
      <div style={stack}><Button disabled={busy || currentRole !== 'Technician' || !description.trim()} onClick={() => run(() => client.startRepair(incidentId, { description }), 'Repair log saved.')}>Start repair</Button></div>
      <div style={stack}><input aria-label="Reading name" placeholder="Test and measured result / reference" value={readingName} maxLength={120} onChange={e => setReadingName(e.target.value)} style={control} /><select aria-label="Reading result" value={readingResult} onChange={e => setReadingResult(e.target.value)} style={control}><option value="">Choose observed result</option><option value="pass">Pass</option><option value="fail">Fail</option></select><Button disabled={!readingName.trim() || !readingResult || readings.length >= 100} onClick={() => { setReadings([...readings, { name: readingName, passed: readingResult === 'pass' }]); setReadingName(''); setReadingResult(''); }}>Add reading</Button></div>
      <ul>{readings.map((r, i) => <li key={i}>{r.name}: {r.passed ? 'Pass' : 'Fail'} <button type="button" onClick={() => setReadings(readings.filter((_, index) => index !== i))}>Remove</button></li>)}</ul>
      <div style={stack}><Button disabled={busy || currentRole !== 'Technician' || !readings.length} onClick={() => run(async () => {
        const id = repair?.repairId;
        if (!id) throw new Error('No repair record available. Start a repair first.');
        await client.completeRepair(id, { testReadings: readings });
        if (mounted.current) setReadings([]);
      }, 'Submitted readings recorded; backend determines repair status.')}>Submit repair readings</Button>
      <Button disabled={busy || currentRole !== 'Verifier' || !repair} onClick={() => run(() => client.verifyReturn(incidentId, { repairId: repair.repairId }), 'Independent verification recorded by backend.')}>Verify return to service</Button></div>
      <label><input type="checkbox" checked={insufficient} onChange={e => setInsufficient(e.target.checked)} /> Close with insufficient evidence</label>
      <div style={stack}><Button disabled={busy || !review || !reason.trim() || incident.state.startsWith('Closed')} onClick={() => run(() => client.closeIncident(incidentId, { reason, insufficientEvidence: insufficient }), 'Closure recorded by backend.')}>Close incident</Button></div>
    </Panel>
    <Panel title="4. Evidence-backed executive report">
      <p><strong>Reporting worker:</strong> {report?.reportingWorker?.reporterName || 'Unknown — name not recorded'} · {incident.reporterId || 'Unknown worker ID'}</p>
      <p>Worker reporting history: {report?.workerReportHistory?.length ?? 'Unknown'} stored reports for this tool. The download lists their worker IDs, available names, dates and observations.</p>
      <p>Includes persisted intake, trace snapshots, recommendations, decisions, simulated documents, repair observations and application audit history. Missing information stays Unknown.</p>
      <Button disabled={busy || !review} onClick={() => run(download, 'Evidence report downloaded. Open it in a browser to print to PDF.')}>Download executive evidence report</Button>
    </Panel>
  </div>;
}
