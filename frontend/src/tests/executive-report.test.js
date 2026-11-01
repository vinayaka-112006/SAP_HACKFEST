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
