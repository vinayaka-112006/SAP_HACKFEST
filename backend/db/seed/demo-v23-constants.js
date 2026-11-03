// ToolSathi V23 Grand Finale Demonstration Dataset
// Stable namespace: TS-DEMO-V23-
// Deterministic, realistic, interconnected dataset across 5 work centers and 6 roles.

const PREFIX = 'TS-DEMO-V23-';
const id = s => PREFIX + s;

// Deterministic timestamps anchored for demonstration
const BASE_NOW = '2026-11-03T10:00:00.000Z';
const SHIFT_START = '2026-11-03T06:00:00.000Z';
const SHIFT_END = '2026-11-04T18:00:00.000Z'; // 36 hours later
const EXPIRY = '2027-11-03T00:00:00.000Z';
const PAST_EXPIRY = '2026-10-20T00:00:00.000Z';

const WORK_CENTERS = [
  { id: id('WC-BRAKE'), name: 'Brake Assembly', code: 'WC-01' },
  { id: id('WC-MACHINING'), name: 'Machining', code: 'WC-02' },
  { id: id('WC-PACKAGING'), name: 'Packaging', code: 'WC-03' },
  { id: id('WC-INSPECTION'), name: 'Final Inspection', code: 'WC-04' },
  { id: id('WC-QUALITY'), name: 'Quality Testing Support', code: 'WC-05' }
];

const TOOL_TYPES = [
  { id: id('TYPE-TORQUE'), name: 'Digital Torque Wrench System', workCenter: id('WC-BRAKE') },
  { id: id('TYPE-CNC'), name: 'CNC Multi-Axis Machining Center', workCenter: id('WC-MACHINING') },
  { id: id('TYPE-PACKAGING'), name: 'Thermal Vacuum Packaging Sealer', workCenter: id('WC-PACKAGING') },
  { id: id('TYPE-INSPECTION'), name: 'Optical Dimensional Metrology Station', workCenter: id('WC-INSPECTION') },
  { id: id('TYPE-QUALITY'), name: 'Hydraulic Proof Pressure Diagnostic Rig', workCenter: id('WC-QUALITY') }
];

module.exports = {
  PREFIX,
  id,
  BASE_NOW,
  SHIFT_START,
  SHIFT_END,
  EXPIRY,
  PAST_EXPIRY,
  WORK_CENTERS,
  TOOL_TYPES
};
