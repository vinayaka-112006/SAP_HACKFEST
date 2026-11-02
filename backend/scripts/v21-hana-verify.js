// Read-only post-deployment verification. Never prints application rows or connection identity.
const config = require('../srv/lib/database-config');
config.loadEnvironment();
process.chdir(config.projectRoot);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fork } = require('node:child_process');
const report = { at: new Date().toISOString(), remoteWrites: false };

async function applicationRead() {
  const child = fork(path.join(config.projectRoot, 'srv/server.js'), ['--database=hana'], {
    cwd: config.projectRoot, silent: true,
    env: { ...process.env, NODE_ENV: 'development', CDS_ENV: 'development', DATABASE_MODE: 'hana',
      PORT: '0', AUTH_MODE: 'header', V2_WORKFLOW_ENABLED: 'true', V2_SYNTHETIC_FIXTURES: 'false',
      ENFORCE_APPROVALS: 'true', ALLOW_UNAPPROVED_MOCKS: 'false' },
  });
  // Drain logs without persisting connection or application payloads.
  child.stderr.resume();
  try {
    const base = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(Error('HANA_APPLICATION_STARTUP_TIMEOUT')), 30000);
      child.stdout.on('data', chunk => {
        output = (output + chunk).slice(-20000);
        const match = output.match(/ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      child.once('error', () => { clearTimeout(timer); reject(Error('HANA_APPLICATION_STARTUP_FAILED')); });
      child.once('exit', () => { clearTimeout(timer); reject(Error('HANA_APPLICATION_STARTUP_FAILED')); });
    });
    const get = async route => {
      const response = await fetch(base + '/api' + route, {
        headers: { 'x-demo-user': 'V21-MANAGER', 'x-demo-role': 'Manager' }, signal: AbortSignal.timeout(20000),
      });
      assert.equal(response.status, 200, 'HANA API response must succeed');
      return response.json();
    };
    const health = await get('/health'), status = await get('/v2/system');
    assert.equal(health.databaseMode, 'hana');
    assert.equal(status.database.mode, 'hana');
    assert.equal(status.database.connected, true);
    const incident = await get('/incidents/V21-INC-01');
    const workforce = await get('/v2/incidents/V21-INC-01/workforce');
    assert.equal(incident.incident.incidentId, 'V21-INC-01');
    assert.equal(workforce.sourceTool.toolId, 'V21-TOOL-1');
    return { databaseMode: health.databaseMode, databaseInstance: health.databaseInstance,
      incident: incident.incident, workforceSource: workforce.sourceTool.toolId,
      recommendations: workforce.recommendations.length };
  } finally {
    if (child.exitCode === null) await new Promise(resolve => {
      const timer = setTimeout(() => { child.kill(); resolve(); }, 10000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      if (child.connected) child.send({ type: 'toolsathi:shutdown' }); else child.kill();
    });
  }
}

async function main() {
  report.stage = 'load-backup';
  const cds = require('@sap/cds'), transfer = require('../srv/lib/data-transfer');
  const operations = require('../srv/lib/hana-operations'), trace = require('../srv/lib/trace-engine');
  const backupReport = JSON.parse(fs.readFileSync('../docs/v2.1-backup-verification.json', 'utf8'));
  const backupFile = path.resolve('../backup', backupReport.backupFile);
  assert.ok(backupFile.startsWith(path.resolve('../backup') + path.sep));
  const snapshot = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const selected = config.configureDatabase(cds, { mode: 'hana' }); config.assertTarget(selected);
  const model = await cds.load('db/schema.cds');
  const db = await cds.connect.to('db', { ...cds.env.requires.db, model, silent: true });
  try {
    report.stage = 'validate-schema';
    const metadata = await operations.inspect(db, selected.schema);
    operations.assertExclusive(metadata, model);
    await operations.validateTables(db, model, selected.schema);
    await require('../srv/lib/db-protection').install(db);
    const descriptors = transfer.entities(model);
    assert.equal(descriptors.length, 35);
    const present = new Set(metadata.objects.filter(o => o.OBJECT_TYPE === 'TABLE').map(o => o.OBJECT_NAME));
    assert.ok(descriptors.every(e => present.has(e.table.toUpperCase())));
    const original = descriptors.filter(e => snapshot.data[e.name]);
    report.stage = 'compare-original-records';
    assert.deepEqual(transfer.manifest(snapshot.data, original), snapshot.manifest);
    const current = {}, counts = {};
    for (const e of descriptors) {
      current[e.name] = transfer.canonicalRows(await db.run(transfer.readQuery(cds, e, 'hana')), e);
      counts[e.name] = current[e.name].length;
      if (!snapshot.data[e.name]) continue;
      const key = row => JSON.stringify(e.keys.map(k => row[k]));
      const byKey = new Map(current[e.name].map(row => [key(row), row]));
      for (const row of snapshot.data[e.name]) assert.deepEqual(byKey.get(key(row)), row, 'Original row changed');
    }
    report.stage = 'repeat-seed-preview';
    const seed = await db.tx(tx => require('../db/seed/v21').apply(tx, { preview: true }));
    assert.equal(seed.plan.reduce((n, p) => n + p.insert, 0), 0);
    assert.equal(seed.plan.reduce((n, p) => n + p.skip, 0), 106);
    const truth = require('../tests/ground-truth.candidate.json');
    const inputs = data => Object.fromEntries(Object.entries(data).map(([name, rows]) => [name.replace('toolsathi.', ''), rows]));
    const live = inputs(current), before = inputs(snapshot.data);
    const tool = live.Tool.find(t => t.toolId === 'TOOL-B');
    const scenario = await require('../srv/lib/synthetic-scenario').read(db);
    assert.ok(scenario, 'Stored synthetic scenario clock must be identifiable');
    report.scenario = { ...scenario, localFixtureAnchor: truth.anchor, storedClockDiffersFromLocalFixture: scenario.reportedAt !== truth.anchor };
    report.trace = [];
    report.stage = 'compare-trace';
    for (const hours of [24, 72, 168]) {
      const actual = trace.buildWindow(live, tool, scenario.reportedAt, hours);
      const baseline = trace.buildWindow(before, before.Tool.find(t => t.toolId === 'TOOL-B'), scenario.reportedAt, hours);
      report.stage = `trace-${hours}-backup-evidence`;
      assert.deepEqual(actual, baseline, 'Trace evidence changed after additive update');
      const expected = truth.tools['TOOL-B'][hours];
      report.traceDiagnostic = { hours, liveTotal: actual.summary.totalUnits, expectedTotal: expected.totalUnits, anchor: scenario.reportedAt };
      report.stage = `trace-${hours}-candidate-serials`;
      assert.deepEqual(actual.units.map(u => ({ serial: u.serial, tier: u.tier, location: u.locationStatus, dealerId: u.dealerId })), expected.units);
      report.stage = `trace-${hours}-candidate-tiers`;
      assert.deepEqual(actual.summary.byTier, expected.byTier);
      report.stage = `trace-${hours}-candidate-score`;
      assert.equal(actual.dataQuality.score, expected.score);
      report.trace.push({ hours, total: actual.summary.totalUnits, tiers: actual.summary.byTier,
        locations: actual.summary.byLocation, score: actual.dataQuality.score, allSerialsMatch: true,
        allEvidenceAndGapsPreserved: true });
    }
    Object.assign(report, { connected: true, tables: descriptors.length, counts,
      totalRecords: Object.values(counts).reduce((n, c) => n + c, 0),
      originalTables: original.length, originalRecordsPreserved: Object.values(snapshot.data).reduce((n, r) => n + r.length, 0),
      backupManifestVerified: true, auditProtectionVerified: true, matchingSyntheticRecords: 106,
      repeatSeedPreviewInserts: 0, schemaMatchesModel: true, exclusiveSchema: true });
  } finally { await db.disconnect(); }
  report.stage = 'first-application-start';
  const first = await applicationRead();
  report.stage = 'second-application-start';
  const second = await applicationRead();
  assert.deepEqual(second, first, 'HANA-backed application record did not survive restart');
  report.persistence = { backendStarts: 2, databaseMode: first.databaseMode, sameDatabase: first.databaseInstance === second.databaseInstance,
    incidentUnchangedAfterRestart: true, persistedSeedIncident: 'V21-INC-01', workforceReadVerified: true,
    recommendationCount: second.recommendations, testWrites: 0 };
  delete report.stage;
  delete report.traceDiagnostic;
  fs.writeFileSync('../docs/v2.1-hana-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(JSON.stringify({ verified: false, stage: report.stage, code: error.code || 'VERIFICATION_FAILED', traceDiagnostic: report.traceDiagnostic, remoteWrites: false })); process.exitCode = 1; });
