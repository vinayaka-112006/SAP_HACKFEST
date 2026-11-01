const escape = value => String(value ?? 'Unknown').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const section = (title, value) => `<section><h2>${escape(title)}</h2><pre>${escape(JSON.stringify(value, null, 2))}</pre></section>`;
const table = (headers, rows) => `<table><thead><tr>${headers.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
export function renderExecutiveReport(report) {
  const worker = report.reportingWorker || { reporterId: report.incident.reporterId };
  const localTime = value => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Unknown — no timestamp recorded';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ToolSathi evidence report ${escape(report.incident.incidentId)}</title>
  <style>body{font:15px system-ui;color:#0e1a2f;background:#f4f8fa;padding:24px}main{max-width:960px;margin:auto;background:white;padding:28px;border-radius:16px}h1,h2{color:#005662}section{border-top:1px solid #dce5eb;margin-top:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px ui-monospace,monospace}li{margin:8px 0}table{border-collapse:collapse;width:100%;overflow-wrap:anywhere}td,th{padding:10px;text-align:left;border:1px solid #dce5eb}@media print{body{padding:0}main{padding:12px}}</style></head><body><main>
  <p>SIMULATED manufacturing scenario · Application audit history</p><h1>ToolSathi Incident &amp; Recovery Evidence Report</h1>
  <p>Incident ${escape(report.incident.incidentId)} · Recorded state: <strong>${escape(report.incident.state)}</strong></p>
  <p>Generated ${escape(new Date(report.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))} IST</p>
  <ul>${report.limitations.map(item => `<li>${escape(item)}</li>`).join('')}</ul>
  <h2>Executive overview</h2>
  ${table(['Record', 'Stored value'], [['Tool', report.incident.toolId], ['Worker observation', report.incident.rawText],
    ['Recorded translation (review status not inferred)', report.incident.translatedText], ['Incident state', report.incident.state],
    ['Root cause', 'Unknown — not established by this report'], ['Measured downtime avoided', 'Unknown'],
    ['Proposals / approval decisions / simulated documents', `${report.proposals.length} / ${report.approvals.length} / ${report.documents.length}`]])}
  <h2>Reporting worker</h2>
  ${table(['Field', 'Recorded value'], [['Worker name', worker.reporterName || 'Unknown — no name recorded for this report'],
    ['Worker ID', worker.reporterId], ['Name source', worker.nameBasis || 'No worker-name record available'],
    ['Reported event time', localTime(worker.reportedAt || report.incident.reportedAt)],
    ['Received by application', localTime(worker.receivedAt || report.incident.createdAt)],
    ['Submitted through application by', worker.submittedBy || 'Unknown — no submission audit entry'],
    ['Submitter role', worker.submitterRole], ['Submission audit ID', worker.submissionAuditId],
    ['Worker-name evidence ID', worker.nameEvidenceId]])}
  <h2>Worker reporting history for ${escape(report.incident.toolId)}</h2>
  <p>${escape(report.workerHistoryScope || 'Unknown — reporting history was not returned by the backend.')}</p>
  ${(report.workerReportHistory || []).length ? table(['Incident', 'Worker name / ID', 'Reported time', 'Worker observation', 'Category / state'],
    report.workerReportHistory.map(r => [r.incidentId + (r.isSelectedIncident ? ' (selected)' : ''),
      `${r.reporterName || 'Unknown — name not recorded'} / ${r.reporterId || 'Unknown'}`, localTime(r.reportedAt),
      r.observation, `${r.category || 'Unknown'} / ${r.state || 'Unknown'}`])) : '<p>Unknown: no worker report history available.</p>'}
  <h2>Exposure snapshot overview</h2>
  <p>These are record linkage tiers, not product quality findings. Historical snapshots can differ; source IDs identify each result.</p>
  ${report.traces.length ? table(['Trace ID', 'Window (hours)', 'Linked records', 'Linkage tiers (Unknown retained)', 'Quality score'], report.traces.map(t => [t.traceId, t.windowHours, t.units?.length ?? 'Unknown', JSON.stringify(t.tiers), t.dataQualityScore])) : '<p>Unknown: no persisted trace snapshot.</p>'}
  <h2>Recovery handoffs and outcomes</h2>
  ${table(['Record ID', 'Stage', 'Recorded outcome'], report.documents.filter(d => d.type.startsWith('RECOVERY_')).map(d => [d.docId, d.type, d.payload.selectedOptionId || d.payload.outcome || d.payload.sourceReference]))}
  ${section('1. Worker report and intake provenance (reported observations)', report.incident)}
  ${section('2. Current tool record', report.tool)}
  ${section('3. Deterministic trace snapshots — potentially exposed records', report.traces.length ? report.traces : { status: 'Unknown', reason: 'No persisted trace snapshot' })}
  ${section('4. Proposals — recommendations are separate from execution', report.proposals)}
  ${section('5. Human approval decisions', report.approvals)}
  ${section('6. Stored planning evidence and simulated action documents', report.documents)}
  ${section('7. Submitted repair readings and independent verification records', report.repairs)}
  ${section('8. Application audit history (actor IDs and roles; no credentials)', report.audit)}
  </main></body></html>`;
}
