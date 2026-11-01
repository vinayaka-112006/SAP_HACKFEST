import test from 'node:test';
import assert from 'node:assert/strict';
import { renderExecutiveReport } from '../features/workflow/executive-report.js';
test('report escapes incident and stored text, preserves Unknown, and does not fabricate closure', () => {
  const html = renderExecutiveReport({ incident: { incidentId: '<script>alert(1)</script>', state: 'Confirmed', rawText: '</pre><script>bad()</script>' },
    reportingWorker: { reporterId: 'WRK-1', reporterName: '<img src=x onerror=bad()>' },
    workerReportHistory: [{ incidentId: 'PRIOR-REPORT', reporterId: 'WRK-2', reporterName: 'Prior worker', observation: '<script>bad()</script>' }],
    generatedAt: '2026-11-01T12:00:00Z', tool: null, traces: [], proposals: [], approvals: [], documents: [], repairs: [], audit: [], limitations: ['SIMULATED'] });
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Unknown')); assert.ok(html.includes('Confirmed'));
  assert.ok(!html.includes('FULLY RESOLVED')); assert.ok(!html.includes('45.2'));
  assert.ok(html.includes('Reporting worker')); assert.ok(html.includes('Prior worker / WRK-2'));
  assert.ok(html.includes('PRIOR-REPORT')); assert.ok(!html.includes('<img'));
});
test('cards show latest trace per window, zero counts, approval and repair evidence; JSON stays collapsed', () => {
  const html = renderExecutiveReport({ incident: { incidentId: 'TS-CARDS', state: 'Confirmed', toolId: 'TOOL-B' }, generatedAt: '2026-11-01T12:00:00Z',
    traces: [{ traceId: 'OLD-TRACE', windowHours: 24, version: 1, generatedAt: '2026-11-01T10:00:00Z', units: [], tiers: { CONFIRMED: 9 } },
      { traceId: 'NEW-TRACE', windowHours: 24, version: 2, generatedAt: '2026-11-01T11:00:00Z', units: [], tiers: { CONFIRMED: 0, PROBABLE: 0, UNKNOWN: 6 }, dataQualityScore: 0, gaps: [{ reason: '<script>gap</script>' }] }],
    proposals: [{ proposalId: 'PROP-CARD', type: 'RECOVERY_PLAN', state: 'Approved', payload: { optionId: 'PAUSE' } }],
    approvals: [{ approvalId: 'APR-CARD', proposalId: 'PROP-CARD', decision: 'APPROVED', decidedBy: 'MANAGER-CARD' }],
    documents: [{ docId: 'DOC-CARD', type: 'RECOVERY_EXECUTION', payload: { outcome: 'Simulated operation pause recorded', externalActionExecuted: false, approvalId: 'APR-CARD' } }],
    repairs: [{ repairId: 'REPAIR-CARD', passed: false, testReadings: [{ name: 'Pressure check', passed: false }] }],
    audit: [{ auditId: 'AUD-LATER', timestamp: '2026-11-01T11:00:00Z', action: 'PROPOSAL_APPROVED' }, { auditId: 'AUD-EARLIER', timestamp: '2026-11-01T10:00:00Z', action: 'INCIDENT_CREATED' }], limitations: [] });
  const visible = html.split('<details class="technical">')[0];
  assert.ok(visible.includes('NEW-TRACE')); assert.ok(!visible.includes('OLD-TRACE'));
  assert.match(visible, /Unknown — kept separate<\/dt><dd>6/);
  assert.match(visible, /Record-linked \(Confirmed\)<\/dt><dd>0/);
  assert.ok(visible.includes('MANAGER-CARD')); assert.ok(visible.includes('APR-CARD'));
  assert.ok(visible.includes('Pressure check')); assert.ok(visible.includes('>Fail</span>'));
  assert.ok(visible.includes('No — simulation only')); assert.ok(!visible.includes('<pre>'));
  assert.ok(visible.indexOf('AUD-EARLIER') < visible.indexOf('AUD-LATER'));
  assert.ok(html.includes('<details class="technical"><summary>')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('.technical{display:none}'));
});
