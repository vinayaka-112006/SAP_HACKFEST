const { cds, entity } = require('./db');
async function reportWorkers(tx, incident) {
  const reports = await tx.run(cds.ql.SELECT.from(entity('Incident')).where({ toolId: incident.toolId }).orderBy('reportedAt desc', 'incidentId'));
  const ids = reports.map(r => r.incidentId);
  const evidence = ids.length ? await tx.run(cds.ql.SELECT.from(entity('IncidentEvidence')).where({ incidentId: { in: ids }, type: 'REPORTER_PROFILE' })) : [];
  const submissions = ids.length ? await tx.run(cds.ql.SELECT.from(entity('AuditLog')).where({ incidentId: { in: ids }, action: 'INCIDENT_CREATED' }).orderBy('timestamp', 'auditId')) : [];
  const history = reports.map(report => {
    const profile = evidence.find(e => e.incidentId === report.incidentId);
    let name = null;
    try {
      const value = JSON.parse(profile?.reference || 'null');
      if (value?.reporterId === report.reporterId && typeof value.reporterName === 'string') name = value.reporterName.trim() || null;
    } catch { /* Missing/malformed names remain Unknown. */ }
    const submission = submissions.find(a => a.incidentId === report.incidentId);
    return { incidentId: report.incidentId, toolId: report.toolId, reporterId: report.reporterId,
      reporterName: name, nameBasis: name ? 'Reporter supplied; not independently verified' : 'Unknown — no name recorded for this report',
      nameEvidenceId: name ? profile.evidenceId : null, reportedAt: report.reportedAt, receivedAt: report.createdAt,
      language: report.language, observation: report.rawText, category: report.category, state: report.state,
      submittedBy: submission?.actor || null, submitterRole: submission?.actorRole || null,
      submissionAuditId: submission?.auditId || null, isSelectedIncident: report.incidentId === incident.incidentId };
  });
  return { reportingWorker: history.find(r => r.isSelectedIncident), workerReportHistory: history,
    workerHistoryScope: 'All currently stored incident reports for this tool, including the selected report. Report records do not establish separate physical failures or identify everyone who operated the tool.' };
}
module.exports = { reportWorkers };
