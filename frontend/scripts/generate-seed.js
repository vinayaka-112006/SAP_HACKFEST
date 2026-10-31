import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../src/api/fixtures');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Fixed reference incident time: 2026-10-31T10:42:00.000Z
const INCIDENT_TIME = new Date('2026-10-31T10:42:00.000Z').getTime();
const H_24 = 24 * 3600 * 1000;
const H_72 = 72 * 3600 * 1000;
const D_7 = 7 * 24 * 3600 * 1000;

console.log('Generating deterministic seed data for ToolSathi...');

const assemblies = [];

/**
 * Total assemblies = 300
 * Tool B in 7d = 160 units (which includes 100 units in 72h, which includes 35 units in 24h).
 * Outside 7d for Tool B = 20 units.
 * Tool A = 65 units.
 * Tool C = 55 units.
 * Total = 160 + 20 + 65 + 55 = 300 units.
 */

// Generate 100 units for Tool B inside 72h
// 72h split:
// Location: 40 Factory stock, 35 Dealer X, 25 Dealer Y
// Tier: 90 Confirmed, 4 Probable, 6 Unknown

// Allocate tiers and locations deterministically for the 100 units:
const units72h = [];
for (let i = 0; i < 100; i++) {
  const unitNum = i + 1;
  const unitId = `TS-BRK-${String(unitNum).padStart(4, '0')}`;
  const serial = `SN-2026-${String(unitNum).padStart(5, '0')}`;

  // First 35 are in 24h window
  const in24h = i < 35;
  const windowMembership = in24h ? ['24h', '72h', '7d'] : ['72h', '7d'];

  // Time distribution:
  // in 24h: between (INCIDENT_TIME - 22h) and (INCIDENT_TIME - 2h)
  // 24h to 72h: between (INCIDENT_TIME - 70h) and (INCIDENT_TIME - 25h)
  let prodTimeOffset;
  if (in24h) {
    prodTimeOffset = 2 * 3600 * 1000 + (i / 35) * (20 * 3600 * 1000);
  } else {
    prodTimeOffset = 25 * 3600 * 1000 + ((i - 35) / 65) * (45 * 3600 * 1000);
  }
  const productionTime = new Date(INCIDENT_TIME - prodTimeOffset).toISOString();

  // Location allocation: 40 Factory stock, 35 Dealer X, 25 Dealer Y
  let location;
  if (i < 40) {
    location = 'Factory stock';
  } else if (i < 75) {
    location = 'Dealer X';
  } else {
    location = 'Dealer Y';
  }

  // Tier allocation: 90 Confirmed, 4 Probable, 6 Unknown
  let tier;
  let toolUseEventId = `TUE-TOOL-B-2026-${100 + Math.floor(i / 10)}`;
  const warnings = [];

  if (i >= 90 && i < 94) {
    tier = 'Probable';
    toolUseEventId = `TUE-INFERRED-${unitNum}`; // Inferred via work center association
    warnings.push('Tool-use record unlinked: association inferred by station torque telemetry');
  } else if (i >= 94) {
    tier = 'Unknown';
    toolUseEventId = null; // Ground truth: missing tool-use record
    warnings.push('Data gap: missing tool-use record for assembly run');
  } else {
    tier = 'Confirmed';
  }

  // Inject specific ground-truth warnings:
  // 1. One stale Dealer Y shipment warning (let's place on unit #85, which is Dealer Y)
  if (i === 84) {
    warnings.push('Stale shipment record: transit scan overdue by 48 hours for Dealer Y consignment');
  }

  // 2. One run whose end time precedes its start time (let's place on run #398, unit #22)
  let runId = `RUN-${390 + Math.floor(i / 10)}`;
  if (i === 22) {
    runId = 'RUN-398';
    warnings.push('Conflicting timestamps: run end time (08:30) precedes start time (09:00)');
  }

  const batchId = `BATCH-2026-B${Math.floor(i / 20) + 1}`;
  const evidenceIds = [
    `EV-RUN-${runId}`,
    `EV-BATCH-${batchId}`,
    toolUseEventId ? `EV-TUE-${toolUseEventId}` : 'EV-GAP-RECORD-MISSING',
    `EV-LOC-${location.replace(/\s+/g, '-').toUpperCase()}`
  ];

  units72h.push({
    unitId,
    serial,
    toolId: 'TOOL-B',
    runId,
    batchId,
    tier,
    location,
    windowMembership,
    productionTime,
    evidenceIds,
    toolUseEventId,
    warnings,
    componentLot: `LOT-VALVE-${200 + Math.floor(i / 15)}`,
    operatorId: `OP-10${(i % 5) + 1}`
  });
}

// Generate 60 units for Tool B between 72h and 7d (to total 160 units in 7d)
const units7dRemaining = [];
for (let i = 0; i < 60; i++) {
  const unitNum = 100 + i + 1;
  const unitId = `TS-BRK-${String(unitNum).padStart(4, '0')}`;
  const serial = `SN-2026-${String(unitNum).padStart(5, '0')}`;
  const windowMembership = ['7d'];

  const prodTimeOffset = 73 * 3600 * 1000 + (i / 60) * (90 * 3600 * 1000);
  const productionTime = new Date(INCIDENT_TIME - prodTimeOffset).toISOString();

  const locations = ['Factory stock', 'Dealer X', 'Dealer Y', 'Distribution Hub C'];
  const location = locations[i % locations.length];
  const tier = i % 12 === 0 ? 'Probable' : 'Confirmed';
  const runId = `RUN-${380 + Math.floor(i / 10)}`;
  const batchId = `BATCH-2026-B${Math.floor(i / 20) + 6}`;
  const toolUseEventId = `TUE-TOOL-B-HIST-${150 + i}`;

  units7dRemaining.push({
    unitId,
    serial,
    toolId: 'TOOL-B',
    runId,
    batchId,
    tier,
    location,
    windowMembership,
    productionTime,
    evidenceIds: [`EV-RUN-${runId}`, `EV-BATCH-${batchId}`, `EV-TUE-${toolUseEventId}`],
    toolUseEventId,
    warnings: [],
    componentLot: `LOT-VALVE-${250 + Math.floor(i / 10)}`,
    operatorId: `OP-10${(i % 5) + 1}`
  });
}

// Generate 20 units for Tool B outside 7d window (older than 7 days)
const unitsToolBOutside = [];
for (let i = 0; i < 20; i++) {
  const unitNum = 160 + i + 1;
  const unitId = `TS-BRK-${String(unitNum).padStart(4, '0')}`;
  const serial = `SN-2026-${String(unitNum).padStart(5, '0')}`;
  const windowMembership = []; // Outside all windows

  const prodTimeOffset = (8 + i * 0.5) * 24 * 3600 * 1000;
  const productionTime = new Date(INCIDENT_TIME - prodTimeOffset).toISOString();

  unitsToolBOutside.push({
    unitId,
    serial,
    toolId: 'TOOL-B',
    runId: `RUN-${360 + Math.floor(i / 5)}`,
    batchId: `BATCH-2026-B-ARCHIVE`,
    tier: 'Confirmed',
    location: 'Customer Fleet',
    windowMembership,
    productionTime,
    evidenceIds: [`EV-ARCHIVE-${unitNum}`],
    toolUseEventId: `TUE-TOOL-B-ARCH-${i}`,
    warnings: [],
    componentLot: 'LOT-VALVE-HIST',
    operatorId: 'OP-098'
  });
}

// Generate 65 units for Tool A (Pneumatic Calibrator)
const unitsToolA = [];
for (let i = 0; i < 65; i++) {
  const unitNum = 180 + i + 1;
  const unitId = `TS-CAL-${String(unitNum).padStart(4, '0')}`;
  const serial = `SN-2026-${String(unitNum).padStart(5, '0')}`;

  const prodTimeOffset = (i * 2.5 + 3) * 3600 * 1000;
  const productionTime = new Date(INCIDENT_TIME - prodTimeOffset).toISOString();

  unitsToolA.push({
    unitId,
    serial,
    toolId: 'TOOL-A',
    runId: `RUN-A-${200 + Math.floor(i / 15)}`,
    batchId: `BATCH-2026-A-${Math.floor(i / 20) + 1}`,
    tier: 'Confirmed',
    location: i < 30 ? 'Factory stock' : 'Customer Fleet',
    windowMembership: [],
    productionTime,
    evidenceIds: [`EV-TOOL-A-${unitNum}`],
    toolUseEventId: `TUE-TOOL-A-${i}`,
    warnings: [],
    componentLot: 'LOT-CAL-01',
    operatorId: 'OP-102'
  });
}

// Generate 55 units for Tool C (Digital Torque Spindle)
const unitsToolC = [];
for (let i = 0; i < 55; i++) {
  const unitNum = 245 + i + 1;
  const unitId = `TS-SPD-${String(unitNum).padStart(4, '0')}`;
  const serial = `SN-2026-${String(unitNum).padStart(5, '0')}`;

  const prodTimeOffset = (i * 3 + 4) * 3600 * 1000;
  const productionTime = new Date(INCIDENT_TIME - prodTimeOffset).toISOString();

  unitsToolC.push({
    unitId,
    serial,
    toolId: 'TOOL-C',
    runId: `RUN-C-${100 + Math.floor(i / 15)}`,
    batchId: `BATCH-2026-C-${Math.floor(i / 20) + 1}`,
    tier: 'Confirmed',
    location: i < 25 ? 'Factory stock' : 'Dealer Z',
    windowMembership: [],
    productionTime,
    evidenceIds: [`EV-TOOL-C-${unitNum}`],
    toolUseEventId: `TUE-TOOL-C-${i}`,
    warnings: [],
    componentLot: 'LOT-SPD-99',
    operatorId: 'OP-104'
  });
}

// Combine all 300 units
const allAssemblies = [
  ...units72h,
  ...units7dRemaining,
  ...unitsToolBOutside,
  ...unitsToolA,
  ...unitsToolC
];

fs.writeFileSync(
  path.join(FIXTURES_DIR, 'seed.json'),
  JSON.stringify(allAssemblies, null, 2),
  'utf-8'
);
console.log(`✓ seed.json generated with ${allAssemblies.length} assemblies.`);

// 2. Incident Fixture (TS-0001, Tool B, 10:42 AM)
const incident = {
  incidentId: 'TS-0001',
  toolId: 'TOOL-B',
  toolName: 'Digital Angle Torque Wrench 120Nm',
  line: 'Brake-Assembly Line 3',
  workCenter: 'WC-BRK-04',
  reporterId: 'OP-104',
  reporterName: 'Basavaraj K.',
  language: 'kn',
  rawText: 'ಟೂಲ್ ಬಿ ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿ ಬಿಡುತ್ತಿದೆ, ಟಾರ್ಕ್ ಸರಿಯಾಗಿ ಹಿಡಿಯುತ್ತಿಲ್ಲ',
  translatedText: 'Tool B is leaving bolts loose; torque is not gripping properly',
  category: 'Torque Drift / Fastener Looseness',
  suggestedNcCode: 'NC-FAST-042 (Bolt Torque Deviation)',
  suggestedNcDesc: 'Assembly torque lower than threshold limits (62Nm vs 85Nm specification)',
  confidence: 0.88,
  confidenceLabel: 'Needs technician verification',
  state: 'Under review',
  reportedAt: '2026-10-31T10:42:00.000Z',
  evidenceCount: 4,
  activeInvestigationWindow: '72h',
  potentiallyExposedUnitsCount: 100,
  exposureRange: { min: 35, mid: 100, max: 160 },
  tiers: { confirmed: 90, probable: 4, unknown: 6 },
  locations: { factoryStock: 40, dealerX: 35, dealerY: 25 },
  dataQualityScore: 0.91,
  dataGaps: [
    {
      type: 'missing_tool_use',
      count: 6,
      label: 'Missing tool-use event records for 6 units (Unknown tier)',
      unitIds: ['TS-BRK-0095', 'TS-BRK-0096', 'TS-BRK-0097', 'TS-BRK-0098', 'TS-BRK-0099', 'TS-BRK-0100']
    },
    {
      type: 'stale_shipment',
      count: 1,
      label: 'Stale Dealer Y shipment snapshot (overdue 48h)',
      unitIds: ['TS-BRK-0085']
    },
    {
      type: 'conflicting_timestamps',
      count: 1,
      label: 'Conflicting run timestamps in Run #398 (endTime < startTime)',
      unitIds: ['TS-BRK-0023']
    }
  ]
};

fs.writeFileSync(
  path.join(FIXTURES_DIR, 'incident.json'),
  JSON.stringify(incident, null, 2),
  'utf-8'
);
console.log('✓ incident.json generated.');

// 3. Tools Master Fixture
const tools = [
  {
    toolId: 'TOOL-A',
    name: 'Pneumatic Nutrunner 80Nm',
    type: 'Pneumatic Fastener',
    line: 'Chassis Line 1',
    workCenter: 'WC-CHS-01',
    status: 'Active',
    calibrationDue: '2026-11-28',
    lastVerifiedGood: '2026-10-15T08:00:00.000Z',
    usageCount: 14200
  },
  {
    toolId: 'TOOL-B',
    name: 'Digital Angle Torque Wrench 120Nm',
    type: 'Digital Torque Wrench',
    line: 'Brake-Assembly Line 3',
    workCenter: 'WC-BRK-04',
    status: 'Restricted', // Currently locked out
    calibrationDue: '2026-11-05',
    lastVerifiedGood: '2026-10-24T06:30:00.000Z',
    usageCount: 28450,
    lockoutDetails: {
      isLockedOut: true,
      tagId: 'LOTO-2026-B-09',
      lockedBy: 'System AI Containment Interlock',
      lockReason: 'Bolt looseness reported; torque calibration drift TS-0001',
      lockedAt: '2026-10-31T10:44:00.000Z'
    }
  },
  {
    toolId: 'TOOL-C',
    name: 'Electric Spindle Driver 45Nm',
    type: 'Electric Screwdriver',
    line: 'Electronics Line 2',
    workCenter: 'WC-ELC-02',
    status: 'Active',
    calibrationDue: '2026-11-05', // Due in 5 days warning!
    lastVerifiedGood: '2026-10-06T14:00:00.000Z',
    usageCount: 38900
  }
];

fs.writeFileSync(
  path.join(FIXTURES_DIR, 'tools.json'),
  JSON.stringify(tools, null, 2),
  'utf-8'
);
console.log('✓ tools.json generated.');

// 4. Governance Action Proposals Fixture
const proposals = [
  {
    proposalId: 'PROP-001',
    incidentId: 'TS-0001',
    type: 'restrict_tool',
    title: 'Immediate Tool Containment: Restrict Tool B',
    description: 'Prohibit further assembly runs with Tool B across all shifts in Digital Manufacturing.',
    targetSystem: 'SAP Digital Manufacturing (DM) Resource Status',
    requiredRole: 'Manager',
    status: 'Approved',
    approvedBy: 'Yogesh (Plant Manager)',
    approvedAt: '2026-10-31T10:45:12.000Z',
    approvalReason: 'Confirmed torque drift on safety-critical brake caliper assembly',
    simulatedReceipt: {
      transactionId: 'DM-RES-LOCK-90214',
      status: 'RESOURCE_LOCKED_OUT',
      timestamp: '2026-10-31T10:45:13.000Z',
      chip: 'Simulated: sent to mock SAP DM'
    }
  },
  {
    proposalId: 'PROP-002',
    incidentId: 'TS-0001',
    type: 'hold_stock',
    title: 'Quarantine In-Plant Inventory: Hold 40 Units',
    description: 'Execute QA Stock Block in SAP S/4HANA for 40 assemblies held in Plant Storage Location 0001.',
    targetSystem: 'SAP S/4HANA Materials Management (MM) Stock Posting',
    requiredRole: 'Quality',
    status: 'Pending',
    approvedBy: null,
    approvedAt: null,
    approvalReason: null,
    simulatedReceipt: {
      transactionId: 'S4-POSTING-BLK-48901',
      status: 'STOCK_RESTRICTED_USE',
      timestamp: null,
      chip: 'Simulated: sent to mock S/4'
    }
  },
  {
    proposalId: 'PROP-003',
    incidentId: 'TS-0001',
    type: 'quality_notification',
    title: 'Draft S/4HANA Quality Notification (QM01)',
    description: 'Create Category Q2 Supplier/Internal deviation notification for 100 potentially exposed assemblies.',
    targetSystem: 'SAP S/4HANA Quality Management (QM)',
    requiredRole: 'Quality',
    status: 'Pending',
    approvedBy: null,
    approvedAt: null,
    approvalReason: null,
    simulatedReceipt: {
      transactionId: 'QM-NOTIF-2026-00441',
      status: 'DRAFT_CREATED',
      timestamp: null,
      chip: 'Simulated: sent to mock S/4'
    }
  },
  {
    proposalId: 'PROP-004',
    incidentId: 'TS-0001',
    type: 'maintenance_notification',
    title: 'Raise Asset Maintenance Order for Torque Calibrator',
    description: 'Route recalibration work order to certified technician Ravi M. with transducer check.',
    targetSystem: 'SAP S/4HANA Asset Management (PM)',
    requiredRole: 'Manager',
    status: 'Pending',
    approvedBy: null,
    approvedAt: null,
    approvalReason: null,
    simulatedReceipt: {
      transactionId: 'PM-ORDER-88203',
      status: 'DISPATCH_QUEUED',
      timestamp: null,
      chip: 'Simulated: sent to mock S/4'
    }
  }
];

fs.writeFileSync(
  path.join(FIXTURES_DIR, 'proposals.json'),
  JSON.stringify(proposals, null, 2),
  'utf-8'
);
console.log('✓ proposals.json generated.');

// 5. Tool History Fixture (including 12 days ago repeat torque drift + duplicate 2h later)
const history = [
  {
    eventId: 'HIST-EV-01',
    date: '2026-10-31T12:30:00.000Z',
    type: 'duplicate_report',
    incidentId: 'TS-0002',
    toolId: 'TOOL-B',
    title: 'Secondary Worker Report (Possible Duplicate)',
    author: 'Ramesh N. (Line 3)',
    language: 'hi',
    rawText: 'टूल बी नट कसने में झटके दे रहा है और स्लिप हो रहा है',
    translatedText: 'Tool B is jerking while tightening nuts and slipping',
    actionRequired: 'Merge or keep separate prompt',
    potentialDuplicateOf: 'TS-0001'
  },
  {
    eventId: 'HIST-EV-02',
    date: '2026-10-31T10:42:00.000Z',
    type: 'incident',
    incidentId: 'TS-0001',
    toolId: 'TOOL-B',
    title: 'Reported: Torque Drift / Fastener Looseness',
    author: 'Basavaraj K. (Operator)',
    language: 'kn',
    rawText: 'ಟೂಲ್ ಬಿ ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿ ಬಿಡುತ್ತಿದೆ',
    translatedText: 'Tool B is leaving bolts loose',
    badge: 'Active Incident'
  },
  {
    eventId: 'HIST-EV-03',
    date: '2026-10-19T14:15:00.000Z',
    type: 'repeat_incident',
    incidentId: 'TS-9088',
    toolId: 'TOOL-B',
    title: 'Repeat Incident: Torque clutch slip (12 days ago)',
    author: 'Arun V.',
    resolution: 'Torque spring retensioned, passed 5 sample cycles. Repeat pattern flagged.',
    isRepeatFlag: true
  },
  {
    eventId: 'HIST-EV-04',
    date: '2026-10-15T09:00:00.000Z',
    type: 'calibration',
    toolId: 'TOOL-B',
    title: 'Periodic Scheduled Calibration',
    author: 'Metrology Lab',
    resolution: 'Calibrated to ISO 6789. Deviation was +1.2Nm.'
  },
  {
    eventId: 'HIST-EV-05',
    date: '2026-09-28T11:20:00.000Z',
    type: 'repair',
    toolId: 'TOOL-B',
    title: 'Handle Sensor Replacement',
    author: 'Ravi M. (Senior Tech)',
    resolution: 'Replaced transducer wiring harness.'
  }
];

fs.writeFileSync(
  path.join(FIXTURES_DIR, 'history.json'),
  JSON.stringify(history, null, 2),
  'utf-8'
);
console.log('✓ history.json generated.');

// 6. Append-Only Audit Trail Fixture
const audit = [
  {
    auditId: 'AUD-9001',
    incidentId: 'TS-0001',
    timestamp: '2026-10-31T10:42:01.000Z',
    actor: 'OP-104 (Basavaraj K.)',
    role: 'Shop-Floor Worker',
    action: 'INCIDENT_INTAKE_SUBMITTED',
    details: 'Spoken intake in Kannada transcribed and structured via Generative AI Hub',
    modelVersion: 'SAP-GenAI-Adapter v2.4.1 (Claude 3.5 Sonnet / Azure OpenAI)'
  },
  {
    auditId: 'AUD-9002',
    incidentId: 'TS-0001',
    timestamp: '2026-10-31T10:42:04.000Z',
    actor: 'System AI Engine',
    role: 'Triage Agent',
    action: 'TRACE_CALCULATED',
    details: 'Calculated 72h deterministic exposure window: 100 potentially exposed assemblies (40 Stock, 35 Dealer X, 25 Dealer Y)',
    modelVersion: 'Deterministic Trace Algorithm v1.0'
  },
  {
    auditId: 'AUD-9003',
    incidentId: 'TS-0001',
    timestamp: '2026-10-31T10:45:12.000Z',
    actor: 'Yogesh (1MV24CS240)',
    role: 'Plant Manager',
    action: 'INTERLOCK_GATE_APPROVED',
    details: 'Proposal PROP-001 (Restrict Tool B) approved. Dispatched simulated lock to SAP DM.',
    modelVersion: 'Human Approval Step 1'
  }
];

fs.writeFileSync(
  path.join(FIXTURES_DIR, 'audit.json'),
  JSON.stringify(audit, null, 2),
  'utf-8'
);
console.log('✓ audit.json generated.');

// 7. Nonconformance Codes Catalog Fixture
const ncCodes = [
  { code: 'NC-FAST-042', group: 'FASTENERS', description: 'Bolt Torque Deviation (< specification)' },
  { code: 'NC-FAST-043', group: 'FASTENERS', description: 'Cross-threaded or stripped fastener' },
  { code: 'NC-CAL-012', group: 'CALIBRATION', description: 'Transducer telemetry drift out of tolerance' },
  { code: 'NC-SURF-009', group: 'SURFACE', description: 'Scratch or indentation on mating flange' }
];

fs.writeFileSync(
  path.join(FIXTURES_DIR, 'ncCodes.json'),
  JSON.stringify(ncCodes, null, 2),
  'utf-8'
);
console.log('✓ ncCodes.json generated.');

console.log('Deterministic seed generation complete!');
