// ToolSathi V23 Grand Finale Complete Demonstration Dataset Generator
// Stable namespace: TS-DEMO-V23-

const {
  PREFIX,
  id,
  BASE_NOW,
  SHIFT_START,
  SHIFT_END,
  EXPIRY,
  PAST_EXPIRY,
  WORK_CENTERS,
  TOOL_TYPES
} = require('./demo-v23-constants');

function buildDataset() {
  const data = {
    UserProfile: [],
    UserProfileDetail: [],
    WorkforceProfile: [],
    UserAuthorization: [],
    Tool: [],
    WorkStation: [],
    WorkStationOperation: [],
    ProductionDemand: [],
    EquipmentRequirement: [],
    TechnicianQualification: [],
    SparePart: [],
    Incident: [],
    IncidentEvidence: [],
    IssueOperation: [],
    RepairWorkOrder: [],
    RepairLog: [],
    PartReservation: [],
    Proposal: [],
    Approval: [],
    UserNotification: [],
    AuditLog: [],
    SopDoc: [],
    TemporaryAssignment: []
  };

  const add = (entity, row) => data[entity].push(row);

  // 1. WORK CENTERS & EQUIPMENT REQUIREMENTS
  const REQS = [
    { toolType: id('TYPE-TORQUE'), skill: id('SKILL-TORQUE'), certification: id('CERT-TORQUE'), safetyAuthorization: id('SAFETY-GENERAL') },
    { toolType: id('TYPE-CNC'), skill: id('SKILL-CNC'), certification: id('CERT-CNC'), safetyAuthorization: id('SAFETY-GENERAL') },
    { toolType: id('TYPE-PACKAGING'), skill: id('SKILL-PACKAGING'), certification: id('CERT-PACKAGING'), safetyAuthorization: id('SAFETY-GENERAL') },
    { toolType: id('TYPE-INSPECTION'), skill: id('SKILL-INSPECTION'), certification: id('CERT-INSPECTION'), safetyAuthorization: id('SAFETY-GENERAL') },
    { toolType: id('TYPE-QUALITY'), skill: id('SKILL-QUALITY'), certification: id('CERT-QUALITY'), safetyAuthorization: id('SAFETY-GENERAL') }
  ];

  for (const req of REQS) {
    add('EquipmentRequirement', {
      toolType: req.toolType,
      skill: req.skill,
      certification: req.certification,
      safetyAuthorization: req.safetyAuthorization,
      approvedBy: id('ADMIN-01')
    });
  }

  // 2. TOOLS & WORK STATIONS (2 per work center: 1 primary [downed/restricted], 1 backup [active])
  const TOOLS_DEF = [
    { id: id('TOOL-TORQUE-01'), type: id('TYPE-TORQUE'), wc: id('WC-BRAKE'), line: id('LINE-BRAKE-1'), state: 'Restricted' },
    { id: id('TOOL-TORQUE-02'), type: id('TYPE-TORQUE'), wc: id('WC-BRAKE'), line: id('LINE-BRAKE-2'), state: 'Active' },
    { id: id('TOOL-CNC-01'), type: id('TYPE-CNC'), wc: id('WC-MACHINING'), line: id('LINE-MACHINING-1'), state: 'Restricted' },
    { id: id('TOOL-CNC-02'), type: id('TYPE-CNC'), wc: id('WC-MACHINING'), line: id('LINE-MACHINING-2'), state: 'Active' },
    { id: id('TOOL-PACK-01'), type: id('TYPE-PACKAGING'), wc: id('WC-PACKAGING'), line: id('LINE-PACKAGING-1'), state: 'Restricted' },
    { id: id('TOOL-PACK-02'), type: id('TYPE-PACKAGING'), wc: id('WC-PACKAGING'), line: id('LINE-PACKAGING-2'), state: 'Active' },
    { id: id('TOOL-INSPECT-01'), type: id('TYPE-INSPECTION'), wc: id('WC-INSPECTION'), line: id('LINE-INSPECTION-1'), state: 'Restricted' },
    { id: id('TOOL-INSPECT-02'), type: id('TYPE-INSPECTION'), wc: id('WC-INSPECTION'), line: id('LINE-INSPECTION-2'), state: 'Active' },
    { id: id('TOOL-QUAL-01'), type: id('TYPE-QUALITY'), wc: id('WC-QUALITY'), line: id('LINE-QUALITY-1'), state: 'Restricted' },
    { id: id('TOOL-QUAL-02'), type: id('TYPE-QUALITY'), wc: id('WC-QUALITY'), line: id('LINE-QUALITY-2'), state: 'Active' }
  ];

  for (const t of TOOLS_DEF) {
    add('Tool', {
      toolId: t.id,
      type: t.type,
      line: t.line,
      workCenter: t.wc,
      state: t.state,
      calibrationDue: '2027-06-30',
      usageCount: 420,
      lastVerifiedGood: SHIFT_START
    });
  }

  // Work Stations (on the backup tools)
  const STATIONS_DEF = [
    { stationId: id('STATION-BRAKE'), wc: id('WC-BRAKE'), toolId: id('TOOL-TORQUE-02'), skill: id('SKILL-TORQUE'), cert: id('CERT-TORQUE'), slots: 2, uph: 15, setup: 10, demand: 120, dueHours: 6 },
    { stationId: id('STATION-MACHINING'), wc: id('WC-MACHINING'), toolId: id('TOOL-CNC-02'), skill: id('SKILL-CNC'), cert: id('CERT-CNC'), slots: 2, uph: 18, setup: 15, demand: 100, dueHours: 6 },
    { stationId: id('STATION-PACKAGING'), wc: id('WC-PACKAGING'), toolId: id('TOOL-PACK-02'), skill: id('SKILL-PACKAGING'), cert: id('CERT-PACKAGING'), slots: 2, uph: 20, setup: 10, demand: 200, dueHours: 4 },
    { stationId: id('STATION-INSPECTION'), wc: id('WC-INSPECTION'), toolId: id('TOOL-INSPECT-02'), skill: id('SKILL-INSPECTION'), cert: id('CERT-INSPECTION'), slots: 2, uph: 25, setup: 15, demand: 250, dueHours: 5 },
    { stationId: id('STATION-QUALITY'), wc: id('WC-QUALITY'), toolId: id('TOOL-QUAL-02'), skill: id('SKILL-QUALITY'), cert: id('CERT-QUALITY'), slots: 2, uph: 12, setup: 20, demand: 80, dueHours: 8 }
  ];

  for (const s of STATIONS_DEF) {
    add('WorkStation', {
      stationId: s.stationId,
      workCenter: s.wc,
      toolId: s.toolId,
      requiredSkill: s.skill,
      requiredCertification: s.cert,
      safetyAuthorization: id('SAFETY-GENERAL'),
      materialsAvailable: true,
      slots: s.slots,
      unitsPerHour: s.uph,
      setupMinutes: s.setup
    });

    add('WorkStationOperation', {
      stationId: s.stationId,
      travelMinutes: 5,
      bottleneckUnitsPerHour: s.uph,
      approvedBy: id('MGR-01'),
      updatedAt: BASE_NOW
    });

    add('ProductionDemand', {
      orderId: id('ORDER-' + s.stationId.replace(PREFIX + 'STATION-', '')),
      stationId: s.stationId,
      requiredQuantity: s.demand,
      completedQuantity: 20,
      dueAt: new Date(Date.parse(BASE_NOW) + s.dueHours * 3600000).toISOString()
    });
  }

  // 3. SPARE PARTS INVENTORY (25 realistic records across 5 tool types)
  const SPARE_PARTS_DEF = [
    // Torque Parts
    { id: id('PART-TORQUE-01'), name: 'Torque Calibration Shim Pack', type: id('TYPE-TORQUE'), loc: 'BIN-TRQ-A1', qty: 25, res: 1, reorder: 5 },
    { id: id('PART-TORQUE-02'), name: 'Digital Strain Gauge Transducer', type: id('TYPE-TORQUE'), loc: 'BIN-TRQ-A2', qty: 8, res: 0, reorder: 2 },
    { id: id('PART-TORQUE-03'), name: 'Quick-Release Hex Drive Head 3/8in', type: id('TYPE-TORQUE'), loc: 'BIN-TRQ-A3', qty: 15, res: 0, reorder: 3 },
    { id: id('PART-TORQUE-04'), name: 'High-Torque Viton O-Ring Seal Kit', type: id('TYPE-TORQUE'), loc: 'BIN-TRQ-A4', qty: 45, res: 2, reorder: 10 },
    { id: id('PART-TORQUE-CRITICAL'), name: 'Master Optical Slip Sensor Module (Zero Stock)', type: id('TYPE-TORQUE'), loc: 'BIN-TRQ-CRIT', qty: 0, res: 0, reorder: 1 },

    // CNC Machining Parts
    { id: id('PART-CNC-01'), name: 'Ceramic Spindle High-Speed Bearing', type: id('TYPE-CNC'), loc: 'BIN-CNC-B1', qty: 6, res: 0, reorder: 2 },
    { id: id('PART-CNC-02'), name: 'Adjustable High-Pressure Coolant Nozzle', type: id('TYPE-CNC'), loc: 'BIN-CNC-B2', qty: 30, res: 0, reorder: 5 },
    { id: id('PART-CNC-03'), name: 'Solid Carbide 4-Flute End Mill 10mm', type: id('TYPE-CNC'), loc: 'BIN-CNC-B3', qty: 50, res: 0, reorder: 15 },
    { id: id('PART-CNC-04'), name: 'Precision ER32 Collet Chuck Assembly', type: id('TYPE-CNC'), loc: 'BIN-CNC-B4', qty: 12, res: 0, reorder: 4 },
    { id: id('PART-CNC-05'), name: 'Reinforced Synchronous Servo Drive Belt', type: id('TYPE-CNC'), loc: 'BIN-CNC-B5', qty: 10, res: 0, reorder: 3 },

    // Packaging Sealer Parts
    { id: id('PART-PACK-01'), name: 'Nichrome Vacuum Thermal Heating Band', type: id('TYPE-PACKAGING'), loc: 'BIN-PCK-C1', qty: 14, res: 0, reorder: 4 },
    { id: id('PART-PACK-02'), name: 'PTFE Coated High-Temp Teflon Strip', type: id('TYPE-PACKAGING'), loc: 'BIN-PCK-C2', qty: 40, res: 0, reorder: 8 },
    { id: id('PART-PACK-03'), name: 'K-Type Thermal Couple Sensor Probe', type: id('TYPE-PACKAGING'), loc: 'BIN-PCK-C3', qty: 22, res: 0, reorder: 5 },
    { id: id('PART-PACK-04'), name: 'Pneumatic Silicon Vacuum Suction Cup', type: id('TYPE-PACKAGING'), loc: 'BIN-PCK-C4', qty: 60, res: 0, reorder: 12 },
    { id: id('PART-PACK-05'), name: 'Tungsten Carbide Film Guillotine Blade', type: id('TYPE-PACKAGING'), loc: 'BIN-PCK-C5', qty: 9, res: 0, reorder: 2 },

    // Optical Inspection Parts
    { id: id('PART-INSPECT-01'), name: 'Bi-Telecentric Low-Distortion Lens 0.5x', type: id('TYPE-INSPECTION'), loc: 'BIN-OPT-D1', qty: 4, res: 0, reorder: 1 },
    { id: id('PART-INSPECT-02'), name: 'High-Luminance LED White Strobe Ring', type: id('TYPE-INSPECTION'), loc: 'BIN-OPT-D2', qty: 11, res: 0, reorder: 3 },
    { id: id('PART-INSPECT-03'), name: 'Chrome-on-Glass Dot Grid Reticle Target', type: id('TYPE-INSPECTION'), loc: 'BIN-OPT-D3', qty: 5, res: 0, reorder: 1 },
    { id: id('PART-INSPECT-04'), name: 'Linear Polarizing Filter Glass 52mm', type: id('TYPE-INSPECTION'), loc: 'BIN-OPT-D4', qty: 18, res: 0, reorder: 4 },
    { id: id('PART-INSPECT-05'), name: 'Industrial GigE Camera Shielded Cable 5m', type: id('TYPE-INSPECTION'), loc: 'BIN-OPT-D5', qty: 25, res: 0, reorder: 6 },

    // Quality Testing Press Parts
    { id: id('PART-QUAL-01'), name: 'Electro-Proportional Hydraulic Relief Valve', type: id('TYPE-QUALITY'), loc: 'BIN-QLT-E1', qty: 7, res: 0, reorder: 2 },
    { id: id('PART-QUAL-02'), name: 'Ultra-High Pressure Hydraulic Hose 700bar', type: id('TYPE-QUALITY'), loc: 'BIN-QLT-E2', qty: 12, res: 0, reorder: 3 },
    { id: id('PART-QUAL-03'), name: 'Precision Compression Load Cell 50kN', type: id('TYPE-QUALITY'), loc: 'BIN-QLT-E3', qty: 5, res: 0, reorder: 1 },
    { id: id('PART-QUAL-04'), name: 'Digital Hydraulic Test Gauge 0-1000bar', type: id('TYPE-QUALITY'), loc: 'BIN-QLT-E4', qty: 8, res: 0, reorder: 2 },
    { id: id('PART-QUAL-05'), name: 'Micro-Mesh High-Pressure Return Bypass Filter', type: id('TYPE-QUALITY'), loc: 'BIN-QLT-E5', qty: 35, res: 0, reorder: 10 }
  ];

  for (const p of SPARE_PARTS_DEF) {
    add('SparePart', {
      partId: p.id,
      name: p.name,
      toolType: p.type,
      location: p.loc,
      quantity: p.qty,
      reserved: p.res,
      reorderThreshold: p.reorder
    });
  }

  // 4. USER PROFILES (EXACTLY 43 PROFILES)
  // 4.1 Workers (15) — 3 per work center
  const WORKERS_DEF = [
    // Brake Assembly (3)
    { id: id('WRK-01'), name: 'Ravi Kumar (Worker 1)', lang: 'en', wc: id('WC-BRAKE'), tool: id('TOOL-TORQUE-01'), skills: [id('SKILL-PACKAGING')], cert: id('CERT-PACKAGING'), exp: EXPIRY, avail: true },
    { id: id('WRK-02'), name: 'Suresh Gowda (Worker 2)', lang: 'kn', wc: id('WC-BRAKE'), tool: id('TOOL-TORQUE-01'), skills: [id('SKILL-INSPECTION')], cert: id('CERT-INSPECTION'), exp: EXPIRY, avail: true },
    { id: id('WRK-03'), name: 'Arjun Sharma (Worker 3)', lang: 'hi', wc: id('WC-BRAKE'), tool: id('TOOL-TORQUE-01'), skills: [id('SKILL-BRAKE-ONLY')], cert: id('CERT-EXPIRED'), exp: PAST_EXPIRY, avail: true },
    // Machining (3)
    { id: id('WRK-04'), name: 'Manjunath Patil (Worker 4)', lang: 'kn', wc: id('WC-MACHINING'), tool: id('TOOL-CNC-01'), skills: [id('SKILL-CNC')], cert: id('CERT-CNC'), exp: EXPIRY, avail: true },
    { id: id('WRK-05'), name: 'Ganesh Bhat (Worker 5)', lang: 'en', wc: id('WC-MACHINING'), tool: id('TOOL-CNC-01'), skills: [id('SKILL-CNC')], cert: id('CERT-CNC'), exp: EXPIRY, avail: true },
    { id: id('WRK-06'), name: 'Pooja Deshmukh (Worker 6)', lang: 'hi', wc: id('WC-MACHINING'), tool: id('TOOL-CNC-01'), skills: [id('SKILL-CNC')], cert: id('CERT-CNC'), exp: EXPIRY, avail: true },
    // Packaging (3)
    { id: id('WRK-07'), name: 'Basavaraj Hiremath (Worker 7)', lang: 'kn', wc: id('WC-PACKAGING'), tool: id('TOOL-PACK-01'), skills: [id('SKILL-PACKAGING')], cert: id('CERT-PACKAGING'), exp: EXPIRY, avail: true },
    { id: id('WRK-08'), name: 'Rajeshwar Singh (Worker 8)', lang: 'en', wc: id('WC-PACKAGING'), tool: id('TOOL-PACK-01'), skills: [id('SKILL-PACKAGING')], cert: id('CERT-PACKAGING'), exp: EXPIRY, avail: true },
    { id: id('WRK-09'), name: 'Karthik Shettar (Worker 9)', lang: 'kn', wc: id('WC-PACKAGING'), tool: id('TOOL-PACK-01'), skills: [id('SKILL-PACKAGING')], cert: id('CERT-PACKAGING'), exp: EXPIRY, avail: true },
    // Final Inspection (3)
    { id: id('WRK-10'), name: 'Alok Tiwari (Worker 10)', lang: 'hi', wc: id('WC-INSPECTION'), tool: id('TOOL-INSPECT-01'), skills: [id('SKILL-INSPECTION')], cert: id('CERT-INSPECTION'), exp: EXPIRY, avail: true },
    { id: id('WRK-11'), name: 'Chandan Gowda (Worker 11)', lang: 'kn', wc: id('WC-INSPECTION'), tool: id('TOOL-INSPECT-01'), skills: [id('SKILL-INSPECTION')], cert: id('CERT-INSPECTION'), exp: EXPIRY, avail: true },
    { id: id('WRK-12'), name: 'Deepak Choudhary (Worker 12)', lang: 'en', wc: id('WC-INSPECTION'), tool: id('TOOL-INSPECT-01'), skills: [id('SKILL-INSPECTION')], cert: id('CERT-INSPECTION'), exp: EXPIRY, avail: true },
    // Quality Testing Support (3)
    { id: id('WRK-13'), name: 'Vinod Naidu (Worker 13)', lang: 'en', wc: id('WC-QUALITY'), tool: id('TOOL-QUAL-01'), skills: [id('SKILL-QUALITY')], cert: id('CERT-QUALITY'), exp: EXPIRY, avail: true },
    { id: id('WRK-14'), name: 'Shivakumar Halli (Worker 14)', lang: 'kn', wc: id('WC-QUALITY'), tool: id('TOOL-QUAL-01'), skills: [id('SKILL-QUALITY')], cert: id('CERT-QUALITY'), exp: EXPIRY, avail: true },
    { id: id('WRK-15'), name: 'Santosh Yadav (Worker 15)', lang: 'hi', wc: id('WC-QUALITY'), tool: id('TOOL-QUAL-01'), skills: [id('SKILL-QUALITY')], cert: id('CERT-QUALITY'), exp: EXPIRY, avail: true }
  ];

  for (const w of WORKERS_DEF) {
    add('UserProfile', {
      userId: w.id,
      displayName: w.name,
      role: 'Worker',
      language: w.lang,
      workCenter: w.wc,
      team: 'TS-DEMO Production Operations',
      status: 'Active',
      createdAt: BASE_NOW
    });
    add('UserProfileDetail', {
      userId: w.id,
      shift: 'Demonstration Operational Shift A',
      shiftStartsAt: SHIFT_START,
      shiftEndsAt: SHIFT_END,
      updatedAt: BASE_NOW
    });
    add('WorkforceProfile', {
      workerId: w.id,
      homeToolId: w.tool,
      skills: JSON.stringify(w.skills),
      certifications: JSON.stringify([w.cert]),
      safetyAuthorizations: JSON.stringify([id('SAFETY-GENERAL')]),
      certificationExpiresAt: w.exp,
      shiftEndsAt: SHIFT_END,
      available: w.avail
    });
  }

  // 4.2 Managers (10) — 2 per work center
  const MANAGERS_DEF = [
    { id: id('MGR-01'), name: 'Deepa Nair (Manager 1)', lang: 'en', wc: id('WC-BRAKE'), wcs: [id('WC-BRAKE'), id('WC-MACHINING')] },
    { id: id('MGR-02'), name: 'Kavita Rao (Manager 2)', lang: 'kn', wc: id('WC-BRAKE'), wcs: [id('WC-BRAKE')] },
    { id: id('MGR-03'), name: 'Priya Sundaram (Manager 3)', lang: 'hi', wc: id('WC-MACHINING'), wcs: [id('WC-MACHINING'), id('WC-PACKAGING')] },
    { id: id('MGR-04'), name: 'Anand Kulkarni (Manager 4)', lang: 'en', wc: id('WC-MACHINING'), wcs: [id('WC-MACHINING')] },
    { id: id('MGR-05'), name: 'Sunil Hegde (Manager 5)', lang: 'kn', wc: id('WC-PACKAGING'), wcs: [id('WC-PACKAGING'), id('WC-INSPECTION')] },
    { id: id('MGR-06'), name: 'Meera Joshi (Manager 6)', lang: 'hi', wc: id('WC-PACKAGING'), wcs: [id('WC-PACKAGING')] },
    { id: id('MGR-07'), name: 'Raghavendra Murthy (Manager 7)', lang: 'en', wc: id('WC-INSPECTION'), wcs: [id('WC-INSPECTION'), id('WC-QUALITY')] },
    { id: id('MGR-08'), name: 'Srinivas Prasad (Manager 8)', lang: 'kn', wc: id('WC-INSPECTION'), wcs: [id('WC-INSPECTION')] },
    { id: id('MGR-09'), name: 'Anita Verma (Manager 9)', lang: 'hi', wc: id('WC-QUALITY'), wcs: [id('WC-QUALITY'), id('WC-BRAKE')] },
    { id: id('MGR-10'), name: 'Vikram Sengupta (Manager 10)', lang: 'en', wc: id('WC-QUALITY'), wcs: [id('WC-QUALITY')] }
  ];

  for (const m of MANAGERS_DEF) {
    add('UserProfile', {
      userId: m.id,
      displayName: m.name,
      role: 'Manager',
      language: m.lang,
      workCenter: m.wc,
      team: 'TS-DEMO Plant Shift Leadership',
      status: 'Active',
      createdAt: BASE_NOW
    });
    add('UserProfileDetail', {
      userId: m.id,
      shift: 'Shift Leadership Roster',
      shiftStartsAt: SHIFT_START,
      shiftEndsAt: SHIFT_END,
      updatedAt: BASE_NOW
    });
    add('UserAuthorization', {
      userId: m.id,
      workCenters: JSON.stringify(m.wcs),
      canAssign: true,
      canVerify: false,
      expiresAt: EXPIRY,
      approvedBy: id('ADMIN-01'),
      updatedAt: BASE_NOW
    });
  }

  // 4.3 Technicians (10) — Specializations & Eligibility States
  const TECHS_DEF = [
    // Tech 1: Eligible & Recommended for Torque Tools
    { id: id('TECH-01'), name: 'Prakash Shenoy (Tech 1 - Torque Specialist)', lang: 'en', wc: id('WC-BRAKE'), toolType: id('TYPE-TORQUE'), skill: id('SKILL-TORQUE'), cert: id('CERT-TORQUE'), exp: EXPIRY, avail: SHIFT_END, max: 3, note: 'Eligible & Recommended' },
    // Tech 2: Torque Qualified, but Busy (max 1 assignment, has active work order)
    { id: id('TECH-02'), name: 'Mahesh Angadi (Tech 2 - Torque Lead)', lang: 'kn', wc: id('WC-BRAKE'), toolType: id('TYPE-TORQUE'), skill: id('SKILL-TORQUE'), cert: id('CERT-TORQUE'), exp: EXPIRY, avail: SHIFT_END, max: 1, note: 'Qualified but Workload Busy' },
    // Tech 3: Mechanical (Skill Mismatch on Torque)
    { id: id('TECH-03'), name: 'Rohit Malhotra (Tech 3 - Mechanical)', lang: 'hi', wc: id('WC-BRAKE'), toolType: id('TYPE-TORQUE'), skill: id('SKILL-MISMATCH'), cert: id('CERT-TORQUE'), exp: EXPIRY, avail: SHIFT_END, max: 2, note: 'Skill Mismatch' },
    // Tech 4: Electrical (Certification Expired)
    { id: id('TECH-04'), name: 'Venkatesh Rao (Tech 4 - Electrical)', lang: 'kn', wc: id('WC-BRAKE'), toolType: id('TYPE-TORQUE'), skill: id('SKILL-TORQUE'), cert: id('CERT-TORQUE'), exp: PAST_EXPIRY, avail: SHIFT_END, max: 2, note: 'Certification Expired' },
    // Tech 5: CNC Maintenance (Off Shift)
    { id: id('TECH-05'), name: 'Naveen Saxena (Tech 5 - CNC Maintenance)', lang: 'en', wc: id('WC-MACHINING'), toolType: id('TYPE-CNC'), skill: id('SKILL-CNC'), cert: id('CERT-CNC'), exp: EXPIRY, avail: PAST_EXPIRY, max: 2, note: 'Off Shift Availability' },
    // Tech 6: Conveyor & Packaging
    { id: id('TECH-06'), name: 'Ashok Kamath (Tech 6 - Packaging Specialist)', lang: 'hi', wc: id('WC-PACKAGING'), toolType: id('TYPE-PACKAGING'), skill: id('SKILL-PACKAGING'), cert: id('CERT-PACKAGING'), exp: EXPIRY, avail: SHIFT_END, max: 2, note: 'Packaging Qualified' },
    // Tech 7: Quality Calibration
    { id: id('TECH-07'), name: 'Chetan Biradar (Tech 7 - Calibration Rig)', lang: 'kn', wc: id('WC-QUALITY'), toolType: id('TYPE-QUALITY'), skill: id('SKILL-QUALITY'), cert: id('CERT-QUALITY'), exp: EXPIRY, avail: SHIFT_END, max: 2, note: 'Quality Qualified' },
    // Tech 8: Industrial Automation CNC
    { id: id('TECH-08'), name: 'Manoj Mishra (Tech 8 - Automation CNC)', lang: 'hi', wc: id('WC-MACHINING'), toolType: id('TYPE-CNC'), skill: id('SKILL-CNC'), cert: id('CERT-CNC'), exp: EXPIRY, avail: SHIFT_END, max: 3, note: 'CNC Qualified' },
    // Tech 9: Optical Inspection Metrology
    { id: id('TECH-09'), name: 'Jagadish Kulkarni (Tech 9 - Metrology)', lang: 'kn', wc: id('WC-INSPECTION'), toolType: id('TYPE-INSPECTION'), skill: id('SKILL-INSPECTION'), cert: id('CERT-INSPECTION'), exp: EXPIRY, avail: SHIFT_END, max: 2, note: 'Inspection Qualified' },
    // Tech 10: Optical Inspection Secondary
    { id: id('TECH-10'), name: 'Abhishek Bannerjee (Tech 10 - Vision Systems)', lang: 'en', wc: id('WC-INSPECTION'), toolType: id('TYPE-INSPECTION'), skill: id('SKILL-INSPECTION'), cert: id('CERT-INSPECTION'), exp: EXPIRY, avail: SHIFT_END, max: 2, note: 'Inspection Qualified' }
  ];

  for (const t of TECHS_DEF) {
    add('UserProfile', {
      userId: t.id,
      displayName: t.name,
      role: 'Technician',
      language: t.lang,
      workCenter: t.wc,
      team: 'TS-DEMO Field Maintenance Service',
      status: 'Active',
      createdAt: BASE_NOW
    });
    add('UserProfileDetail', {
      userId: t.id,
      shift: 'Maintenance Active Roster',
      shiftStartsAt: SHIFT_START,
      shiftEndsAt: t.avail,
      updatedAt: BASE_NOW
    });
    add('TechnicianQualification', {
      userId: t.id,
      toolType: t.toolType,
      workCenter: t.wc,
      skill: t.skill,
      certification: t.cert,
      safetyAuthorization: id('SAFETY-GENERAL'),
      expiresAt: t.exp,
      availableUntil: t.avail,
      maxAssignments: t.max,
      approvedBy: id('ADMIN-01')
    });
  }

  // 4.4 Verifiers / Assigners (5) — Separation of duties
  const VERIFIERS_DEF = [
    { id: id('VERIFIER-01'), name: 'Dr. Lakshmi Swamy (Verifier 1 - Dual)', lang: 'en', wc: id('WC-BRAKE'), wcs: [id('WC-BRAKE'), id('WC-MACHINING')], assign: true, verify: true, note: 'Dual grant; governed by separation of duties' },
    { id: id('VERIFIER-02'), name: 'Harish Chandra (Verifier 2 - Independent)', lang: 'kn', wc: id('WC-BRAKE'), wcs: [id('WC-BRAKE'), id('WC-PACKAGING'), id('WC-QUALITY')], assign: false, verify: true, note: 'Independent return-to-service verifier' },
    { id: id('VERIFIER-03'), name: 'Neeraj Tripathi (Verifier 3 - Assigner)', lang: 'hi', wc: id('WC-MACHINING'), wcs: [id('WC-MACHINING'), id('WC-PACKAGING')], assign: true, verify: false, note: 'Delegated maintenance assigner' },
    { id: id('VERIFIER-04'), name: 'Prashant Dixit (Verifier 4 - Independent)', lang: 'en', wc: id('WC-INSPECTION'), wcs: [id('WC-INSPECTION'), id('WC-QUALITY')], assign: false, verify: true, note: 'Independent inspection verifier' },
    { id: id('VERIFIER-05'), name: 'Vandana Patil (Verifier 5 - Plant-wide)', lang: 'kn', wc: id('WC-QUALITY'), wcs: [id('WC-BRAKE'), id('WC-MACHINING'), id('WC-PACKAGING'), id('WC-INSPECTION'), id('WC-QUALITY')], assign: true, verify: true, note: 'Dual grant plant-wide' }
  ];

  for (const v of VERIFIERS_DEF) {
    add('UserProfile', {
      userId: v.id,
      displayName: v.name,
      role: 'Verifier',
      language: v.lang,
      workCenter: v.wc,
      team: 'TS-DEMO Independent Quality & Return Gate',
      status: 'Active',
      createdAt: BASE_NOW
    });
    add('UserProfileDetail', {
      userId: v.id,
      shift: 'Independent Return Gate Shift',
      shiftStartsAt: SHIFT_START,
      shiftEndsAt: SHIFT_END,
      updatedAt: BASE_NOW
    });
    add('UserAuthorization', {
      userId: v.id,
      workCenters: JSON.stringify(v.wcs),
      canAssign: v.assign,
      canVerify: v.verify,
      expiresAt: EXPIRY,
      approvedBy: id('ADMIN-01'),
      updatedAt: BASE_NOW
    });
  }

  // 4.5 Quality (2)
  const QUALITY_DEF = [
    { id: id('QUAL-01'), name: 'Sanjay Menon (Quality Lead)', lang: 'en', wc: id('WC-QUALITY') },
    { id: id('QUAL-02'), name: 'Ananya Sen (Quality Compliance)', lang: 'hi', wc: id('WC-QUALITY') }
  ];

  for (const q of QUALITY_DEF) {
    add('UserProfile', {
      userId: q.id,
      displayName: q.name,
      role: 'Quality',
      language: q.lang,
      workCenter: q.wc,
      team: 'TS-DEMO Quality Assurance & Containment',
      status: 'Active',
      createdAt: BASE_NOW
    });
    add('UserProfileDetail', {
      userId: q.id,
      shift: 'Quality Assurance Shift',
      shiftStartsAt: SHIFT_START,
      shiftEndsAt: SHIFT_END,
      updatedAt: BASE_NOW
    });
    add('UserAuthorization', {
      userId: q.id,
      workCenters: JSON.stringify(WORK_CENTERS.map(w => w.id)),
      canAssign: false,
      canVerify: true,
      expiresAt: EXPIRY,
      approvedBy: id('ADMIN-01'),
      updatedAt: BASE_NOW
    });
  }

  // 4.6 Administrator (1)
  add('UserProfile', {
    userId: id('ADMIN-01'),
    displayName: 'ToolSathi Enterprise Administrator',
    role: 'Administrator',
    language: 'en',
    workCenter: id('WC-BRAKE'),
    team: 'TS-DEMO Platform Administration',
    status: 'Active',
    createdAt: BASE_NOW
  });
  add('UserProfileDetail', {
    userId: id('ADMIN-01'),
    shift: 'Continuous Administration Governance',
    shiftStartsAt: SHIFT_START,
    shiftEndsAt: SHIFT_END,
    updatedAt: BASE_NOW
  });
  add('UserAuthorization', {
    userId: id('ADMIN-01'),
    workCenters: JSON.stringify(WORK_CENTERS.map(w => w.id)),
    canAssign: true,
    canVerify: true,
    expiresAt: EXPIRY,
    approvedBy: id('ADMIN-01'),
    updatedAt: BASE_NOW
  });

  // 5. EXACTLY 20 CONNECTED INCIDENTS
  // 5.1 FIVE SOLVED / CLOSED (INC-01 to INC-05)
  const SOLVED = [
    {
      incId: id('INC-01'), toolId: id('TOOL-TORQUE-01'), worker: id('WRK-01'), lang: 'kn',
      raw: 'ಬೋಲ್ಟ್ ಸಡಿಲವಾಗಿದೆ, ಟಾರ್ಕ್ ಸರಿಯಾಗಿ ಹೊಂದಿಕೊಳ್ಳುತ್ತಿಲ್ಲ (ಕ್ಯಾಲಿಬ್ರೇಶನ್ ದೋಷ)',
      trans: 'Bolt is loose, torque setting is slipping below 45Nm tolerance',
      cat: 'TORQUE', nc: 'NC-TORQUE-LOOSE', mgr: id('MGR-01'), tech: id('TECH-01'), verifier: id('VERIFIER-02'),
      part: id('PART-TORQUE-01'), reading: '45.2 Nm (Spec 45.0-48.0 Nm)',
      desc: 'Replaced torque calibration shim and recalibrated digital transducer'
    },
    {
      incId: id('INC-02'), toolId: id('TOOL-CNC-01'), worker: id('WRK-04'), lang: 'hi',
      raw: 'सीएनसी स्पिंडल में असामान्य कंपन और शोर सुनाई दे रहा है',
      trans: 'CNC spindle is producing abnormal vibration and acoustic noise exceeding 80dB',
      cat: 'VIBRATION', nc: 'NC-CNC-VIBRATION', mgr: id('MGR-03'), tech: id('TECH-08'), verifier: id('VERIFIER-04'),
      part: id('PART-CNC-01'), reading: '0.012 mm runout (Spec <0.02 mm)',
      desc: 'Replaced spindle high-speed ceramic bearing and aligned motor coupler'
    },
    {
      incId: id('INC-03'), toolId: id('TOOL-PACK-01'), worker: id('WRK-07'), lang: 'en',
      raw: 'Packaging sealer heating element temperature fluctuating intermittently',
      trans: 'Packaging sealer heating element temperature fluctuating intermittently between 140C and 185C',
      cat: 'THERMAL', nc: 'NC-PACK-HEAT', mgr: id('MGR-05'), tech: id('TECH-06'), verifier: id('VERIFIER-02'),
      part: id('PART-PACK-01'), reading: '175.4 C stable (Spec 170-180 C)',
      desc: 'Replaced nichrome thermal heating band and calibrated K-type thermocouple'
    },
    {
      incId: id('INC-04'), toolId: id('TOOL-INSPECT-01'), worker: id('WRK-10'), lang: 'kn',
      raw: 'ಆಪ್ಟಿಕಲ್ ಕ್ಯಾಮೆರಾ ಅಳತೆಯ ಲೆನ್ಸ್‌ನಲ್ಲಿ ಮಸುಕಾದ ಚಿತ್ರ ಕಂಡುಬಂದಿದೆ',
      trans: 'Optical dimensional camera lens shows blurred image and edge distortion',
      cat: 'OPTICAL', nc: 'NC-INSPECT-OPTICAL', mgr: id('MGR-07'), tech: id('TECH-09'), verifier: id('VERIFIER-04'),
      part: id('PART-INSPECT-01'), reading: '0.003 mm optical distortion (Spec <0.005 mm)',
      desc: 'Installed replacement bi-telecentric lens and performed 9-point grid calibration'
    },
    {
      incId: id('INC-05'), toolId: id('TOOL-QUAL-01'), worker: id('WRK-13'), lang: 'hi',
      raw: 'हाइड्रोलिक प्रूफ टेस्ट प्रेस में दबाव गिर रहा है और लीकेज है',
      trans: 'Hydraulic proof test press pressure is dropping from 500bar to 320bar',
      cat: 'PRESSURE', nc: 'NC-QUAL-PRESSURE', mgr: id('MGR-09'), tech: id('TECH-07'), verifier: id('VERIFIER-02'),
      part: id('PART-QUAL-01'), reading: '502 bar hold for 60s (Spec 500 bar +/- 5 bar)',
      desc: 'Replaced electro-proportional hydraulic relief valve and high-pressure hose seals'
    }
  ];

  for (let i = 0; i < SOLVED.length; i++) {
    const s = SOLVED[i];
    const reportedTime = new Date(Date.parse(SHIFT_START) + (i + 1) * 1800000).toISOString();
    const confirmedTime = new Date(Date.parse(reportedTime) + 300000).toISOString();
    const triagedTime = new Date(Date.parse(confirmedTime) + 600000).toISOString();
    const assignedTime = new Date(Date.parse(triagedTime) + 300000).toISOString();
    const acceptedTime = new Date(Date.parse(assignedTime) + 300000).toISOString();
    const completedTime = new Date(Date.parse(acceptedTime) + 3600000).toISOString();
    const reviewedTime = new Date(Date.parse(completedTime) + 600000).toISOString();
    const verifiedTime = new Date(Date.parse(reviewedTime) + 900000).toISOString();
    const closedTime = new Date(Date.parse(verifiedTime) + 300000).toISOString();

    const repairId = id('REP-' + String(i + 1).padStart(2, '0'));
    const workOrderId = id('WO-' + String(i + 1).padStart(2, '0'));
    const propId = id('PROP-' + String(i + 1).padStart(2, '0'));
    const appId = id('APP-' + String(i + 1).padStart(2, '0'));

    add('Incident', {
      incidentId: s.incId,
      toolId: s.toolId,
      reporterId: s.worker,
      language: s.lang,
      rawText: s.raw,
      translatedText: s.trans,
      category: s.cat,
      suggestedNcCode: s.nc,
      confidence: 0.94,
      missingFields: '[]',
      state: 'Closed',
      createdAt: reportedTime,
      reportedAt: reportedTime,
      reportedAtSource: reportedTime,
      confirmedAt: confirmedTime,
      confirmedBy: s.worker,
      modelVersion: 'toolsathi-v23-model'
    });

    add('IncidentEvidence', {
      evidenceId: id('EVID-' + String(i + 1).padStart(2, '0')),
      incidentId: s.incId,
      type: 'LOG_TRACE',
      reference: 'DIAGNOSTIC-RUN-' + (i + 101),
      sourceTime: reportedTime
    });

    add('IssueOperation', {
      incidentId: s.incId,
      severity: 'High',
      urgency: 'Urgent',
      shift: 'Shift A Demonstration',
      reviewedBy: s.mgr,
      reviewedAt: triagedTime,
      assignmentEscalated: false,
      version: 1,
      updatedAt: closedTime
    });

    add('Proposal', {
      proposalId: propId,
      incidentId: s.incId,
      type: 'TOOL_RESTRICTION',
      payload: JSON.stringify({ toolId: s.toolId, action: 'RESTRICT' }),
      reason: 'Physical symptom verified; safety restriction proposed pending certified repair',
      state: 'APPROVED',
      createdAt: triagedTime
    });

    add('Approval', {
      approvalId: appId,
      proposalId: propId,
      approverRole: 'Manager',
      decision: 'APPROVED',
      reason: 'Reviewed physical inspection and agreed with safety isolation',
      decidedAt: triagedTime,
      decidedBy: s.mgr
    });

    add('RepairWorkOrder', {
      incidentId: s.incId,
      workOrderId,
      technicianId: s.tech,
      assignedBy: s.mgr,
      assignedAt: assignedTime,
      status: 'Closed',
      findings: 'Root cause identified and corrected: ' + s.desc,
      repairId,
      reviewedBy: s.mgr,
      reviewedAt: reviewedTime
    });

    add('PartReservation', {
      incidentId: s.incId,
      partId: s.part,
      quantity: 1,
      requestedBy: s.tech,
      createdAt: acceptedTime,
      status: 'FULFILLED'
    });

    add('RepairLog', {
      repairId,
      toolId: s.toolId,
      incidentId: s.incId,
      description: s.desc,
      loggedBy: s.tech,
      loggedAt: completedTime,
      testReadings: JSON.stringify([{ name: 'Post-Repair Calibration Test', value: s.reading, passed: true }]),
      passed: true,
      verifiedBy: s.verifier,
      verifiedAt: verifiedTime
    });

    add('AuditLog', {
      auditId: id('AUDIT-REP-' + String(i + 1).padStart(2, '0')),
      incidentId: s.incId,
      toolId: s.toolId,
      actor: s.verifier,
      actorRole: 'Verifier',
      action: 'REPAIR_VERIFIED',
      details: JSON.stringify({ repairId, testReading: s.reading, passed: true }),
      reason: 'Independent verification completed and signed off',
      modelVersion: null,
      timestamp: verifiedTime
    });

    add('AuditLog', {
      auditId: id('AUDIT-CLS-' + String(i + 1).padStart(2, '0')),
      incidentId: s.incId,
      toolId: s.toolId,
      actor: s.mgr,
      actorRole: 'Manager',
      action: 'INCIDENT_CLOSED',
      details: JSON.stringify({ verifiedBy: s.verifier, repairId }),
      reason: 'Independent return-to-service verified and logged to audit trail',
      modelVersion: null,
      timestamp: closedTime
    });

    add('UserNotification', {
      notificationId: id('NOTIF-' + String(i + 1).padStart(2, '0')),
      userId: s.worker,
      incidentId: s.incId,
      message: 'Your reported issue on ' + s.toolId + ' has been repaired, independently verified, and closed.',
      createdAt: closedTime
    });
  }

  // 5.2 FIVE UNRESOLVED / BLOCKED INCIDENTS (INC-06 to INC-10)
  // INC-06: Awaiting manager review
  add('Incident', {
    incidentId: id('INC-06'),
    toolId: id('TOOL-TORQUE-02'),
    reporterId: id('WRK-02'),
    language: 'kn',
    rawText: 'ಟಾರ್ಕ್ 2 ಉಪಕರಣದಲ್ಲಿ ಹಿಡಿಕೆ ಸಡಿಲವಾಗಿದೆ, ಬಟನ್ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ',
    translatedText: 'Torque tool 2 handle is physically loose and digital button is sticking',
    category: 'MECHANICAL',
    suggestedNcCode: 'NC-TORQUE-BUTTON',
    confidence: 0.88,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 3300000).toISOString(),
    confirmedBy: id('WRK-02'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-06'),
    severity: 'Unassessed',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: null, // Null -> Awaiting manager review
    reviewedAt: null,
    assignmentEscalated: false,
    version: 0,
    updatedAt: BASE_NOW
  });

  // INC-07: Awaiting technician assignment (triaged, assignment escalated)
  add('Incident', {
    incidentId: id('INC-07'),
    toolId: id('TOOL-CNC-02'),
    reporterId: id('WRK-05'),
    language: 'en',
    rawText: 'CNC machine 2 axis guide-way coolant pressure alarm triggered',
    translatedText: 'CNC machine 2 axis guide-way coolant pressure alarm triggered repeatedly',
    category: 'HYDRAULIC',
    suggestedNcCode: 'NC-CNC-PRESSURE',
    confidence: 0.91,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 7200000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 7200000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 7200000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 6900000).toISOString(),
    confirmedBy: id('WRK-05'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-07'),
    severity: 'High',
    urgency: 'Urgent',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-03'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 6000000).toISOString(),
    assignmentEscalated: true, // Escalated -> Awaiting authorized assigner
    version: 1,
    updatedAt: BASE_NOW
  });

  // INC-08: Blocked by spare parts (technician accepted, needed part zero stock)
  add('Incident', {
    incidentId: id('INC-08'),
    toolId: id('TOOL-TORQUE-02'),
    reporterId: id('WRK-03'),
    language: 'hi',
    rawText: 'टॉर्क सेंसर बार-बार एरर कोड E-09 दे रहा है',
    translatedText: 'Torque sensor repeatedly throwing E-09 slip error code during tightening',
    category: 'ELECTRONIC',
    suggestedNcCode: 'NC-TORQUE-SENSOR',
    confidence: 0.92,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 10800000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 10800000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 10800000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 10500000).toISOString(),
    confirmedBy: id('WRK-03'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-08'),
    severity: 'High',
    urgency: 'Urgent',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-01'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 9600000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  add('RepairWorkOrder', {
    incidentId: id('INC-08'),
    workOrderId: id('WO-08'),
    technicianId: id('TECH-02'),
    assignedBy: id('MGR-01'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 9000000).toISOString(),
    status: 'BlockedParts', // Blocked by spare parts!
    findings: 'Requires replacement of TS-DEMO-V23-PART-TORQUE-CRITICAL which is currently zero stock in stores',
    repairId: null,
    reviewedBy: null,
    reviewedAt: null
  });

  // INC-09: Awaiting additional repair evidence / information
  add('Incident', {
    incidentId: id('INC-09'),
    toolId: id('TOOL-PACK-02'),
    reporterId: id('WRK-08'),
    language: 'en',
    rawText: 'Packaging sealer film clamp tension uneven across left and right edges',
    translatedText: 'Packaging sealer film clamp tension uneven across left and right edges',
    category: 'MECHANICAL',
    suggestedNcCode: 'NC-PACK-TENSION',
    confidence: 0.89,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 14400000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 14400000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 14400000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 14100000).toISOString(),
    confirmedBy: id('WRK-08'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-09'),
    severity: 'Medium',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-05'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 13200000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  add('RepairWorkOrder', {
    incidentId: id('INC-09'),
    workOrderId: id('WO-09'),
    technicianId: id('TECH-06'),
    assignedBy: id('MGR-05'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 12600000).toISOString(),
    status: 'NeedsEvidence', // NeedsEvidence -> Awaiting additional repair evidence
    findings: 'Clamp tension readjusted; manager requested photographic proof of clearance tolerances before submission',
    repairId: null,
    reviewedBy: null,
    reviewedAt: null
  });

  // INC-10: Verification failed
  add('Incident', {
    incidentId: id('INC-10'),
    toolId: id('TOOL-INSPECT-02'),
    reporterId: id('WRK-11'),
    language: 'kn',
    rawText: 'ಕ್ಯಾಮೆರಾ ಕೇಬಲ್ ಜೋಡಣೆಯಲ್ಲಿ ಲೂಸ್ ಕನೆಕ್ಷನ್ ಮತ್ತು ಅಸ್ಥಿರ ಸಿಗ್ನಲ್',
    translatedText: 'Camera cable assembly has loose connection and intermittent video drop',
    category: 'ELECTRICAL',
    suggestedNcCode: 'NC-INSPECT-SIGNAL',
    confidence: 0.93,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 18000000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 18000000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 18000000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 17700000).toISOString(),
    confirmedBy: id('WRK-11'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-10'),
    severity: 'High',
    urgency: 'Urgent',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-07'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 16800000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  const rep10 = id('REP-10');
  add('RepairWorkOrder', {
    incidentId: id('INC-10'),
    workOrderId: id('WO-10'),
    technicianId: id('TECH-10'),
    assignedBy: id('MGR-07'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 16200000).toISOString(),
    status: 'Accepted', // Returned to technician after verification failed
    findings: 'Initial cable re-seat failed independent noise threshold; secondary grounding shielding needed',
    repairId: rep10,
    reviewedBy: id('MGR-07'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 14400000).toISOString()
  });
  add('RepairLog', {
    repairId: rep10,
    toolId: id('TOOL-INSPECT-02'),
    incidentId: id('INC-10'),
    description: 'Initial cable re-seat attempted',
    loggedBy: id('TECH-10'),
    loggedAt: new Date(Date.parse(BASE_NOW) - 15000000).toISOString(),
    testReadings: JSON.stringify([{ name: 'Independent Noise Verification', value: '78 dBA', passed: false, expected: '<65 dBA' }]),
    passed: false,
    verifiedBy: id('VERIFIER-04'),
    verifiedAt: new Date(Date.parse(BASE_NOW) - 14000000).toISOString()
  });
  add('AuditLog', {
    auditId: id('AUDIT-FAIL-10'),
    incidentId: id('INC-10'),
    toolId: id('TOOL-INSPECT-02'),
    actor: id('VERIFIER-04'),
    actorRole: 'Verifier',
    action: 'VERIFICATION_REJECTED',
    details: JSON.stringify({ repairId: rep10, measured: '78 dBA', limit: '<65 dBA', status: 'Returned to technician' }),
    reason: 'Measured acoustic vibration exceeded tolerance threshold; returned for secondary repair',
    modelVersion: null,
    timestamp: new Date(Date.parse(BASE_NOW) - 14000000).toISOString()
  });

  // 5.3 TEN ACTIVE IN PROGRESSIVE STAGES (INC-11 to INC-20)
  // INC-11: Newly reported (state Reported) -> Awaiting worker confirmation
  add('Incident', {
    incidentId: id('INC-11'),
    toolId: id('TOOL-CNC-01'),
    reporterId: id('WRK-06'),
    language: 'hi',
    rawText: 'सीएनसी टूल 1 में ड्रिफ्ट महसूस हो रहा है, जांच की आवश्यकता है',
    translatedText: 'CNC tool 1 experiencing slight positional drift during roughing passes',
    category: 'CALIBRATION',
    suggestedNcCode: 'NC-CNC-DRIFT',
    confidence: 0.85,
    missingFields: '[]',
    state: 'Reported', // Reported -> Awaiting worker confirmation
    createdAt: BASE_NOW,
    reportedAt: BASE_NOW,
    reportedAtSource: BASE_NOW,
    confirmedAt: null,
    confirmedBy: null,
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-11'),
    severity: 'Unassessed',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: null,
    reviewedAt: null,
    assignmentEscalated: false,
    version: 0,
    updatedAt: BASE_NOW
  });

  // INC-12: Confirmed by worker -> Awaiting manager review
  add('Incident', {
    incidentId: id('INC-12'),
    toolId: id('TOOL-PACK-01'),
    reporterId: id('WRK-09'),
    language: 'kn',
    rawText: 'ಪ್ಯಾಕೇಜಿಂಗ್ ಸೀಲರ್ 1 ನಲ್ಲಿ ನಿರ್ವಾತ ಒತ್ತಡ ಕಡಿಮೆಯಾಗಿದೆ',
    translatedText: 'Packaging sealer 1 vacuum level is dropping below -0.85 bar',
    category: 'VACUUM',
    suggestedNcCode: 'NC-PACK-VACUUM',
    confidence: 0.90,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 2400000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 2400000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 2400000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 2100000).toISOString(),
    confirmedBy: id('WRK-09'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-12'),
    severity: 'Unassessed',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: null,
    reviewedAt: null,
    assignmentEscalated: false,
    version: 0,
    updatedAt: BASE_NOW
  });

  // INC-13: Triaged / under review -> Awaiting technician assignment
  add('Incident', {
    incidentId: id('INC-13'),
    toolId: id('TOOL-INSPECT-01'),
    reporterId: id('WRK-12'),
    language: 'en',
    rawText: 'Optical dimension unit 1 optical encoder missing home index pulse',
    translatedText: 'Optical dimension unit 1 optical encoder missing home index pulse',
    category: 'ENCODER',
    suggestedNcCode: 'NC-INSPECT-ENCODER',
    confidence: 0.94,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 3300000).toISOString(),
    confirmedBy: id('WRK-12'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-13'),
    severity: 'High',
    urgency: 'Urgent',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-07'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 1800000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });

  // INC-14: Assigned to technician -> Awaiting technician acceptance
  add('Incident', {
    incidentId: id('INC-14'),
    toolId: id('TOOL-QUAL-01'),
    reporterId: id('WRK-14'),
    language: 'kn',
    rawText: 'ಹೈಡ್ರಾಲಿಕ್ ಪರೀಕ್ಷಾ ಉಪಕರಣದಲ್ಲಿ ಒತ್ತಡ ಗೇಜ್ ಸೂಚಿ ಕಂಪಿಸುತ್ತಿದೆ',
    translatedText: 'Hydraulic testing rig pressure dial is fluttering erratically',
    category: 'HYDRAULIC',
    suggestedNcCode: 'NC-QUAL-GAUGE',
    confidence: 0.89,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 4500000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 4500000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 4500000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 4200000).toISOString(),
    confirmedBy: id('WRK-14'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-14'),
    severity: 'Medium',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-09'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 3000000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  add('RepairWorkOrder', {
    incidentId: id('INC-14'),
    workOrderId: id('WO-14'),
    technicianId: id('TECH-07'),
    assignedBy: id('MGR-09'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 2400000).toISOString(),
    status: 'Assigned', // Assigned -> Awaiting technician acceptance
    findings: null,
    repairId: null,
    reviewedBy: null,
    reviewedAt: null
  });

  // INC-15: Accepted by technician -> Repair in progress
  add('Incident', {
    incidentId: id('INC-15'),
    toolId: id('TOOL-TORQUE-01'),
    reporterId: id('WRK-15'),
    language: 'hi',
    rawText: 'टॉर्क रिंच की स्लीव क्लैंपिंग ढीली महसूस हो रही है',
    translatedText: 'Torque wrench sleeve clamping collar feels loose on extension',
    category: 'MECHANICAL',
    suggestedNcCode: 'NC-TORQUE-SLEEVE',
    confidence: 0.87,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 5400000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 5400000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 5400000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 5100000).toISOString(),
    confirmedBy: id('WRK-15'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-15'),
    severity: 'Medium',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-01'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 4000000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  add('RepairWorkOrder', {
    incidentId: id('INC-15'),
    workOrderId: id('WO-15'),
    technicianId: id('TECH-01'),
    assignedBy: id('MGR-01'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    status: 'Accepted', // Accepted -> Repair in progress
    findings: 'Physical collar inspection commenced; checking retaining clip groove',
    repairId: null,
    reviewedBy: null,
    reviewedAt: null
  });

  // INC-16: Parts reserved (Accepted with PartReservation active)
  add('Incident', {
    incidentId: id('INC-16'),
    toolId: id('TOOL-TORQUE-01'),
    reporterId: id('WRK-01'),
    language: 'en',
    rawText: 'Torque tool seal leaking slight hydraulic dampening fluid',
    translatedText: 'Torque tool seal leaking slight hydraulic dampening fluid during high load',
    category: 'HYDRAULIC',
    suggestedNcCode: 'NC-TORQUE-LEAK',
    confidence: 0.92,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 6300000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 6300000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 6300000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 6000000).toISOString(),
    confirmedBy: id('WRK-01'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-16'),
    severity: 'High',
    urgency: 'Urgent',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-01'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 5400000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  add('RepairWorkOrder', {
    incidentId: id('INC-16'),
    workOrderId: id('WO-16'),
    technicianId: id('TECH-01'),
    assignedBy: id('MGR-01'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 4800000).toISOString(),
    status: 'Accepted',
    findings: 'Fluid dampening O-ring worn; reserved compatible Viton O-ring kit',
    repairId: null,
    reviewedBy: null,
    reviewedAt: null
  });
  add('PartReservation', {
    incidentId: id('INC-16'),
    partId: id('PART-TORQUE-04'),
    quantity: 2,
    requestedBy: id('TECH-01'),
    createdAt: new Date(Date.parse(BASE_NOW) - 4200000).toISOString(),
    status: 'ACTIVE'
  });

  // INC-17: Repair log in progress (Accepted with preliminary repair log draft)
  add('Incident', {
    incidentId: id('INC-17'),
    toolId: id('TOOL-CNC-01'),
    reporterId: id('WRK-04'),
    language: 'kn',
    rawText: 'ಸಿಎನ್‌ಸಿ ಲೂಬ್ರಿಕೇಶನ್ ಆಯಿಲ್ ಮಟ್ಟ ಶೀಘ್ರವಾಗಿ ಇಳಿಕೆಯಾಗುತ್ತಿದೆ',
    translatedText: 'CNC machine 1 automatic lubrication oil reservoir level dropping rapidly',
    category: 'LUBRICATION',
    suggestedNcCode: 'NC-CNC-LUBRICANT',
    confidence: 0.90,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 7200000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 7200000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 7200000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 6900000).toISOString(),
    confirmedBy: id('WRK-04'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-17'),
    severity: 'Medium',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-03'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 6300000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  const rep17 = id('REP-17');
  add('RepairWorkOrder', {
    incidentId: id('INC-17'),
    workOrderId: id('WO-17'),
    technicianId: id('TECH-08'),
    assignedBy: id('MGR-03'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 5700000).toISOString(),
    status: 'Accepted',
    findings: 'Disassembled metering valve manifold; found contaminated check-valve seat',
    repairId: rep17,
    reviewedBy: null,
    reviewedAt: null
  });
  add('RepairLog', {
    repairId: rep17,
    toolId: id('TOOL-CNC-01'),
    incidentId: id('INC-17'),
    description: 'Metering valve cleaning and ultrasonic flush in progress',
    loggedBy: id('TECH-08'),
    loggedAt: new Date(Date.parse(BASE_NOW) - 3600000).toISOString(),
    testReadings: '[]',
    passed: null,
    verifiedBy: null,
    verifiedAt: null
  });

  // INC-18: Repair submitted -> Awaiting manager completion review
  add('Incident', {
    incidentId: id('INC-18'),
    toolId: id('TOOL-PACK-01'),
    reporterId: id('WRK-07'),
    language: 'en',
    rawText: 'Packaging sealer safety curtain optical sensor false-tripping',
    translatedText: 'Packaging sealer safety light curtain optical emitter false-tripping intermittently',
    category: 'SAFETY',
    suggestedNcCode: 'NC-PACK-CURTAIN',
    confidence: 0.95,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 8100000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 8100000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 8100000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 7800000).toISOString(),
    confirmedBy: id('WRK-07'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-18'),
    severity: 'High',
    urgency: 'Urgent',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-05'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 7200000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  const rep18 = id('REP-18');
  add('RepairWorkOrder', {
    incidentId: id('INC-18'),
    workOrderId: id('WO-18'),
    technicianId: id('TECH-06'),
    assignedBy: id('MGR-05'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 6600000).toISOString(),
    status: 'Submitted', // Submitted -> Awaiting manager completion review
    findings: 'Optical sensor head realigned and optical alignment beam calibrated to 99.8% intensity',
    repairId: rep18,
    reviewedBy: null,
    reviewedAt: null
  });
  add('RepairLog', {
    repairId: rep18,
    toolId: id('TOOL-PACK-01'),
    incidentId: id('INC-18'),
    description: 'Aligned emitter/receiver pair and verified response time <15ms',
    loggedBy: id('TECH-06'),
    loggedAt: new Date(Date.parse(BASE_NOW) - 1800000).toISOString(),
    testReadings: JSON.stringify([{ name: 'Safety Curtain Trip Time', value: '11.4 ms', passed: true, expected: '<15 ms' }]),
    passed: true,
    verifiedBy: null,
    verifiedAt: null
  });

  // INC-19: Awaiting verification (Manager reviewed completion, awaiting verifier)
  add('Incident', {
    incidentId: id('INC-19'),
    toolId: id('TOOL-INSPECT-01'),
    reporterId: id('WRK-10'),
    language: 'kn',
    rawText: 'ಆಪ್ಟಿಕಲ್ ಕ್ಯಾಮೆರಾ ಫ್ಲಾಶ್ ಲೈಟ್ ತೀವ್ರತೆ ಮಂಕಾಗಿದೆ',
    translatedText: 'Optical camera strobe illumination intensity degraded by 30%',
    category: 'OPTICAL',
    suggestedNcCode: 'NC-INSPECT-STROBE',
    confidence: 0.91,
    missingFields: '[]',
    state: 'Confirmed',
    createdAt: new Date(Date.parse(BASE_NOW) - 9000000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 9000000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 9000000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 8700000).toISOString(),
    confirmedBy: id('WRK-10'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-19'),
    severity: 'Medium',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-07'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 8100000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  const rep19 = id('REP-19');
  add('RepairWorkOrder', {
    incidentId: id('INC-19'),
    workOrderId: id('WO-19'),
    technicianId: id('TECH-09'),
    assignedBy: id('MGR-07'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 7500000).toISOString(),
    status: 'Reviewed', // Reviewed -> Awaiting verification
    findings: 'Replaced LED strobe module with TS-DEMO-V23-PART-INSPECT-02; measured 1200 Lux uniformity',
    repairId: rep19,
    reviewedBy: id('MGR-07'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 900000).toISOString()
  });
  add('RepairLog', {
    repairId: rep19,
    toolId: id('TOOL-INSPECT-01'),
    incidentId: id('INC-19'),
    description: 'Installed new LED strobe ring and ran 500-cycle high-speed trigger test',
    loggedBy: id('TECH-09'),
    loggedAt: new Date(Date.parse(BASE_NOW) - 1800000).toISOString(),
    testReadings: JSON.stringify([{ name: 'Illumination Uniformity', value: '1240 Lux', passed: true, expected: '1200-1300 Lux' }]),
    passed: true,
    verifiedBy: null,
    verifiedAt: null
  });

  // INC-20: Verified and awaiting closure
  add('Incident', {
    incidentId: id('INC-20'),
    toolId: id('TOOL-QUAL-01'),
    reporterId: id('WRK-13'),
    language: 'hi',
    rawText: 'प्रूफ टेस्ट लोड सेल माउंटिंग ब्रैकेट में प्ले आ गया है',
    translatedText: 'Proof test 50kN load cell mounting bracket has mechanical axial play',
    category: 'MECHANICAL',
    suggestedNcCode: 'NC-QUAL-MOUNT',
    confidence: 0.93,
    missingFields: '[]',
    state: 'Confirmed', // State Confirmed while WorkOrder Closed -> Awaiting closure!
    createdAt: new Date(Date.parse(BASE_NOW) - 9900000).toISOString(),
    reportedAt: new Date(Date.parse(BASE_NOW) - 9900000).toISOString(),
    reportedAtSource: new Date(Date.parse(BASE_NOW) - 9900000).toISOString(),
    confirmedAt: new Date(Date.parse(BASE_NOW) - 9600000).toISOString(),
    confirmedBy: id('WRK-13'),
    modelVersion: 'toolsathi-v23-model'
  });
  add('IssueOperation', {
    incidentId: id('INC-20'),
    severity: 'High',
    urgency: 'Normal',
    shift: 'Shift A Demonstration',
    reviewedBy: id('MGR-09'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 9000000).toISOString(),
    assignmentEscalated: false,
    version: 1,
    updatedAt: BASE_NOW
  });
  const rep20 = id('REP-20');
  add('RepairWorkOrder', {
    incidentId: id('INC-20'),
    workOrderId: id('WO-20'),
    technicianId: id('TECH-07'),
    assignedBy: id('MGR-09'),
    assignedAt: new Date(Date.parse(BASE_NOW) - 8400000).toISOString(),
    status: 'Closed', // Work order closed by verifier -> Incident awaiting manager closure!
    findings: 'Precision mounting bracket tightened with calibrated locking torque and threadlocker applied',
    repairId: rep20,
    reviewedBy: id('MGR-09'),
    reviewedAt: new Date(Date.parse(BASE_NOW) - 1800000).toISOString()
  });
  add('RepairLog', {
    repairId: rep20,
    toolId: id('TOOL-QUAL-01'),
    incidentId: id('INC-20'),
    description: 'Torqued bracket to 85 Nm with blue Loctite; zero deflection measured under 40 kN load',
    loggedBy: id('TECH-07'),
    loggedAt: new Date(Date.parse(BASE_NOW) - 2700000).toISOString(),
    testReadings: JSON.stringify([{ name: 'Axial Bracket Deflection at 40kN', value: '0.002 mm', passed: true, expected: '<0.005 mm' }]),
    passed: true,
    verifiedBy: id('VERIFIER-02'),
    verifiedAt: new Date(Date.parse(BASE_NOW) - 600000).toISOString()
  });

  // 6. WORKFORCE ALLOCATION DEMONSTRATION SCENARIO (PRIMARY TOOL DOWNTIME)
  // Tool: TS-DEMO-V23-TOOL-TORQUE-01 is Restricted.
  // Workers: WRK-01 (Packaging qualified), WRK-02 (Inspection qualified), WRK-03 (Ineligible/expired).
  // Pre-seed an active temporary assignment for WRK-01 to show the active reallocation!
  add('TemporaryAssignment', {
    assignmentId: id('ASSIGN-WRK-01'),
    workerId: id('WRK-01'),
    incidentId: id('INC-01'),
    sourceToolId: id('TOOL-TORQUE-01'),
    stationId: id('STATION-PACKAGING'),
    startsAt: BASE_NOW,
    endsAt: new Date(Date.parse(BASE_NOW) + 7200000).toISOString(), // 2 hours
    status: 'Active',
    estimatedOutput: 36,
    assumptions: JSON.stringify({ rate: 20, setup: 10, travel: 5, productiveMinutes: 105 }),
    approvedBy: id('MGR-01'),
    approvedAt: BASE_NOW
  });

  // 7. GROUNDING SOP DOCUMENTS (One per Work Center)
  const SOPS_DEF = [
    {
      id: id('SOP-BRAKE'),
      title: 'Brake Assembly Fastening & Torque Verification SOP',
      section: 'Brake Assembly Protocol 401',
      text: 'Standard Operating Procedure for Brake Assembly Torque Tooling: All M12 flange fasteners must be tightened to 45.0–48.0 Nm using certified digital torque tools. Any slippage, clicking anomaly, or reading below 45.0 Nm must be tagged immediately. Workers must confirm reports within 15 minutes. When Tool Restriction is enacted, workers must be redeployed to active packaging or inspection stations per qualification matrix.'
    },
    {
      id: id('SOP-MACHINING'),
      title: 'CNC Multi-Axis Spindle & Vibration Threshold SOP',
      section: 'Machining Operations Protocol 205',
      text: 'CNC Machining Center Standard Operating Procedure: Spindle radial runout must stay below 0.02 mm and acoustic vibration below 80 dBA at 12,000 RPM. In the event of chatter or axis alarms, isolate the work center and request Level 2 maintenance. Only technicians with CNC-CERT and active safety permits may perform ceramic bearing or drawbar replacement.'
    },
    {
      id: id('SOP-PACKAGING'),
      title: 'Thermal Vacuum Packaging & Sealing Quality SOP',
      section: 'Packaging Protocol 302',
      text: 'Packaging Line Standard Operating Procedure: Vacuum sealing jaws must operate at 170–180°C with negative pressure >= -0.85 bar. Film clamp tension must be balanced across lateral guides. Cross-trained operators from Brake Assembly may operate Station 3 upon completing the 10-minute setup and travel check.'
    },
    {
      id: id('SOP-INSPECTION'),
      title: 'Optical Metrology Dimensional Verification SOP',
      section: 'Metrology Protocol 501',
      text: 'Final Inspection Optical Measurement SOP: Dimensional optical rigs require telecentric optics with distortion <= 0.005 mm and strobe illumination >= 1200 Lux. If edge contrast degrades or encoder drops pulses, calibrate using the chrome-on-glass dot grid reticle target before releasing batches.'
    },
    {
      id: id('SOP-QUALITY'),
      title: 'Hydraulic Proof Pressure Diagnostic Rig SOP',
      section: 'Quality Assurance Protocol 601',
      text: 'Hydraulic Proof Pressure Testing SOP: Proof pressure cycles test up to 500 bar with maximum permissible decay of 5 bar over 60 seconds. Any leakage, gauge flutter, or proportioning valve hysteresis mandates immediate line stop. Independent verification by certified quality gate officer is strictly mandatory before returning to production.'
    }
  ];

  for (const s of SOPS_DEF) {
    add('SopDoc', {
      docId: s.id,
      title: s.title,
      section: s.section,
      text: s.text
    });
  }

  return data;
}

module.exports = { buildDataset };
