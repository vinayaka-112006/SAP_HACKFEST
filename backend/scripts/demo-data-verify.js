// ToolSathi V23 Demonstration Data Verification Suite
// Validates counts, relationships, stages, qualifications, workforce allocation, and trace regression.

const path = require('node:path');
const config = require('../srv/lib/database-config');
config.loadEnvironment();
process.chdir(config.projectRoot);

const cds = require('@sap/cds');
const { PREFIX, id } = require('../db/seed/demo-v23-constants');
const workforce = require('../srv/lib/workforce');
const traceEngine = require('../srv/lib/trace-engine');
const v = require('../srv/lib/v2');
const ops = require('../srv/lib/operations');

async function main() {
  const file = cds.env.requires.db.credentials?.url || 'db.sqlite';
  const model = await cds.load('db/schema.cds');
  cds.model = model;
  const db = await cds.connect.to('db');

  const report = {
    database: path.resolve(config.projectRoot, file),
    verifiedAt: new Date().toISOString(),
    namespace: PREFIX,
    checks: [],
    passed: true
  };

  function check(name, condition, details = {}) {
    const passed = Boolean(condition);
    report.checks.push({ name, passed, ...details });
    if (!passed) report.passed = false;
  }

  try {
    // 1. Profile Role Counts
    const profiles = await db.run(
      cds.ql.SELECT.from('toolsathi.UserProfile').where({ userId: { like: PREFIX + '%' } })
    );
    const roleCounts = {};
    for (const p of profiles) roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;

    check('Profile Total Count is 43', profiles.length === 43, { actual: profiles.length, expected: 43 });
    check('Worker Count is 15', roleCounts.Worker === 15, { actual: roleCounts.Worker, expected: 15 });
    check('Manager Count is 10', roleCounts.Manager === 10, { actual: roleCounts.Manager, expected: 10 });
    check('Technician Count is 10', roleCounts.Technician === 10, { actual: roleCounts.Technician, expected: 10 });
    check('Verifier Count is 5', roleCounts.Verifier === 5, { actual: roleCounts.Verifier, expected: 5 });
    check('Quality Count is 2', roleCounts.Quality === 2, { actual: roleCounts.Quality, expected: 2 });
    check('Administrator Count is 1', roleCounts.Administrator === 1, { actual: roleCounts.Administrator, expected: 1 });

    // 2. Incident Count & Stages
    const incidents = await db.run(
      cds.ql.SELECT.from('toolsathi.Incident').where({ incidentId: { like: PREFIX + '%' } })
    );
    check('Incident Total Count is 20', incidents.length === 20, { actual: incidents.length, expected: 20 });

    const works = await db.run(cds.ql.SELECT.from('toolsathi.RepairWorkOrder'));
    const operations = await db.run(cds.ql.SELECT.from('toolsathi.IssueOperation'));
    const tools = await db.run(cds.ql.SELECT.from('toolsathi.Tool'));
    const relations = await db.run(cds.ql.SELECT.from('toolsathi.IncidentRelationship'));

    const wm = new Map(works.map(x => [x.incidentId, x]));
    const om = new Map(operations.map(x => [x.incidentId, x]));
    const tm = new Map(tools.map(t => [t.toolId, t]));
    const rm = new Map(relations.map(r => [r.incidentId, r]));

    const stages = {};
    for (const inc of incidents) {
      const work = wm.get(inc.incidentId);
      const op = om.get(inc.incidentId);
      const tool = tm.get(inc.toolId);
      const rel = rm.get(inc.incidentId);

      let stage;
      if (v.closed(inc.state)) stage = 'Closed';
      else if (rel?.decision === 'LINK') stage = 'Linked report';
      else if (inc.state === 'Reported') stage = 'Awaiting worker confirmation';
      else if (work?.status === 'Closed') stage = 'Awaiting closure';
      else if (work?.status === 'Reviewed') stage = 'Awaiting verification';
      else if (work?.status === 'Submitted') stage = 'Awaiting manager completion review';
      else if (work?.status === 'BlockedParts') stage = 'Blocked by spare parts';
      else if (work?.status === 'NeedsInformation') stage = 'Awaiting information';
      else if (work?.status === 'NeedsEvidence') stage = 'Awaiting additional repair evidence';
      else if (work?.status === 'Accepted') stage = 'Repair in progress';
      else if (work?.status === 'Assigned') stage = 'Awaiting technician acceptance';
      else if (op?.assignmentEscalated) stage = 'Awaiting authorized assigner';
      else if (op?.reviewedBy) stage = 'Awaiting technician assignment';
      else if (tool?.state === 'Active' && /^Closed/.test(inc.state)) stage = 'Closed';
      else stage = 'Awaiting manager review';

      stages[inc.incidentId] = stage;
    }

    const solvedIncidents = Object.keys(stages).filter(id => stages[id] === 'Closed');
    check('Exactly 5 Closed / Solved Incidents', solvedIncidents.length === 5, { actual: solvedIncidents.length, expected: 5 });
    check('Incident 08 is Blocked by spare parts', stages[PREFIX + 'INC-08'] === 'Blocked by spare parts', { actual: stages[PREFIX + 'INC-08'] });
    check('Incident 09 has Additional Evidence Requested', stages[PREFIX + 'INC-09'] === 'Awaiting additional repair evidence', { actual: stages[PREFIX + 'INC-09'] });

    // 3. Spare Parts Count & Zero-Stock Presence
    const parts = await db.run(
      cds.ql.SELECT.from('toolsathi.SparePart').where({ partId: { like: PREFIX + '%' } })
    );
    check('Spare Parts Count is between 20 and 30', parts.length >= 20 && parts.length <= 30, { actual: parts.length });
    const zeroStockPart = parts.find(p => p.quantity === 0);
    check('At least one Out-of-Stock Spare Part exists', Boolean(zeroStockPart), { partId: zeroStockPart?.partId });

    // 4. Workforce Allocation Engine Test
    const inc01 = incidents.find(i => i.incidentId === PREFIX + 'INC-01');
    const workforceProfiles = await db.run(cds.ql.SELECT.from('toolsathi.WorkforceProfile'));
    const userDetails = await db.run(cds.ql.SELECT.from('toolsathi.UserProfileDetail'));
    const stations = await db.run(cds.ql.SELECT.from('toolsathi.WorkStation'));
    const stationOps = await db.run(cds.ql.SELECT.from('toolsathi.WorkStationOperation'));
    const demands = await db.run(cds.ql.SELECT.from('toolsathi.ProductionDemand'));

    const wfData = {
      incident: inc01,
      Tool: tools,
      UserProfile: profiles,
      UserProfileDetail: userDetails,
      WorkforceProfile: workforceProfiles,
      WorkStation: stations,
      WorkStationOperation: stationOps,
      ProductionDemand: demands,
      TemporaryAssignment: []
    };

    const optResult = workforce.optimize(wfData, 120, { now: Date.parse(inc01.createdAt) + 1000 });
    const assignedWorkers = optResult.assignments.map(a => a.workerId);
    check('Workforce optimizer allocates Worker 1 (Packaging)', assignedWorkers.includes(PREFIX + 'WRK-01'), { assignments: optResult.assignments.map(a => `${a.workerId}->${a.stationId}`) });
    check('Workforce optimizer allocates Worker 2 (Inspection)', assignedWorkers.includes(PREFIX + 'WRK-02'), { assignments: optResult.assignments.map(a => `${a.workerId}->${a.stationId}`) });
    const excludedWorkerIds = optResult.excluded.map(e => e.workerId);
    check('Workforce optimizer excludes Worker 3 (Ineligible/Expired)', excludedWorkerIds.includes(PREFIX + 'WRK-03'), { excluded: optResult.excluded });

    // 5. Technician Qualification Rules Test
    const torqueTool = tools.find(t => t.toolId === PREFIX + 'TOOL-TORQUE-01');
    const candidates = await v.eligible(db, torqueTool);
    const eligibleTechs = candidates.filter(c => c.eligible).map(c => c.userId);
    check('Technician 1 is Eligible & Recommended for Torque Tool', eligibleTechs.includes(PREFIX + 'TECH-01'), { eligibleTechs });
    const busyTech = candidates.find(c => c.userId === PREFIX + 'TECH-02');
    check('Technician 2 is Rejected due to Workload Limit', !busyTech?.eligible && busyTech?.reasons.some(r => r.includes('Workload limit')), { busyReasons: busyTech?.reasons });
    const mismatchTech = candidates.find(c => c.userId === PREFIX + 'TECH-03');
    check('Technician 3 is Rejected due to Skill Mismatch', !mismatchTech?.eligible && mismatchTech?.reasons.some(r => r.includes('Required skill')), { mismatchReasons: mismatchTech?.reasons });

    // 6. Deterministic Product Traceability Baseline Test (TOOL-B)
    const toolB = tools.find(t => t.toolId === 'TOOL-B');
    if (toolB) {
      const anchor = '2026-10-31T05:12:00.000Z';
      const r24 = await traceEngine.generate(db, toolB, anchor, 24);
      const r72 = await traceEngine.generate(db, toolB, anchor, 72);
      const r168 = await traceEngine.generate(db, toolB, anchor, 168);

      check('Tool B 24h Baseline is 35 units', r24.summary.totalUnits === 35, { actual: r24.summary.totalUnits, expected: 35 });
      check('Tool B 72h Baseline is 100 units', r72.summary.totalUnits === 100, { actual: r72.summary.totalUnits, expected: 100 });
      check('Tool B 72h Tier Breakdown (90 Confirmed, 4 Probable, 6 Unknown)',
        r72.summary.byTier.CONFIRMED === 90 && r72.summary.byTier.PROBABLE === 4 && r72.summary.byTier.UNKNOWN === 6,
        { actual: r72.summary.byTier }
      );
      check('Tool B 72h Disposition (40 In-Stock, 35 Dealer X, 25 Dealer Y)',
        r72.summary.byLocation.IN_STOCK === 40 && r72.summary.shippedByDealer['DLR-X'] === 35 && r72.summary.shippedByDealer['DLR-Y'] === 25,
        { byLocation: r72.summary.byLocation, byDealer: r72.summary.shippedByDealer }
      );
      check('Tool B 168h Baseline is 160 units', r168.summary.totalUnits === 160, { actual: r168.summary.totalUnits, expected: 160 });
    } else {
      check('TOOL-B exists in database', false, { error: 'TOOL-B not found' });
    }

    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exit(1);

  } finally {
    await db.disconnect();
  }
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
  process.exit(1);
});
