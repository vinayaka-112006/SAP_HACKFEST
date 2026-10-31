import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../api/fixtures');
const seedPath = path.join(FIXTURES_DIR, 'seed.json');

console.log('--- RUNNING GROUND-TRUTH SEED VERIFICATION TESTS ---');

if (!fs.existsSync(seedPath)) {
  console.error('FAIL: seed.json does not exist. Run npm run seed first.');
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`FAIL: ${message} (Expected ${expected}, got ${actual})`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${message} (= ${actual})`);
}

// 1. Total Assemblies = 300
assertEqual(seed.length, 300, 'Total assembly count in seed.json');

// 2. Tool B Units in Windows
const toolBUnits = seed.filter(u => u.toolId === 'TOOL-B');
const units24h = toolBUnits.filter(u => u.windowMembership.includes('24h'));
const units72h = toolBUnits.filter(u => u.windowMembership.includes('72h'));
const units7d = toolBUnits.filter(u => u.windowMembership.includes('7d'));

assertEqual(units24h.length, 35, 'Tool B 24h window count');
assertEqual(units72h.length, 100, 'Tool B 72h window count');
assertEqual(units7d.length, 160, 'Tool B 7d window count');

// 3. Subset Nesting: 24h is subset of 72h, which is subset of 7d
const set24 = new Set(units24h.map(u => u.unitId));
const set72 = new Set(units72h.map(u => u.unitId));
const set7d = new Set(units7d.map(u => u.unitId));

for (const id of set24) {
  if (!set72.has(id)) {
    console.error(`FAIL: Unit ${id} is in 24h but missing in 72h window`);
    process.exit(1);
  }
}
console.log('✓ PASS: 24h window (35 units) is a strict subset of 72h window');

for (const id of set72) {
  if (!set7d.has(id)) {
    console.error(`FAIL: Unit ${id} is in 72h but missing in 7d window`);
    process.exit(1);
  }
}
console.log('✓ PASS: 72h window (100 units) is a strict subset of 7d window');

// 4. 72h Set Location Split: 40 Factory stock, 35 Dealer X, 25 Dealer Y
const locStock = units72h.filter(u => u.location === 'Factory stock').length;
const locDealerX = units72h.filter(u => u.location === 'Dealer X').length;
const locDealerY = units72h.filter(u => u.location === 'Dealer Y').length;

assertEqual(locStock, 40, '72h Factory stock location count');
assertEqual(locDealerX, 35, '72h Dealer X location count');
assertEqual(locDealerY, 25, '72h Dealer Y location count');

// 5. 72h Set Tier Split: 90 Confirmed, 4 Probable, 6 Unknown
const tierConfirmed = units72h.filter(u => u.tier === 'Confirmed').length;
const tierProbable = units72h.filter(u => u.tier === 'Probable').length;
const tierUnknown = units72h.filter(u => u.tier === 'Unknown').length;

assertEqual(tierConfirmed, 90, '72h Confirmed tier count');
assertEqual(tierProbable, 4, '72h Probable tier count');
assertEqual(tierUnknown, 6, '72h Unknown tier count');

// 6. Unknown run units have null toolUseEventId
const unknownUnits = units72h.filter(u => u.tier === 'Unknown');
for (const u of unknownUnits) {
  if (u.toolUseEventId !== null) {
    console.error(`FAIL: Unknown unit ${u.unitId} must have null toolUseEventId`);
    process.exit(1);
  }
}
console.log('✓ PASS: All 6 Unknown tier units have null toolUseEventId (ground-truth gap)');

// 7. Verify Ground-Truth Warnings
const staleShipmentUnits = units72h.filter(u => u.warnings.some(w => w.toLowerCase().includes('stale shipment')));
const conflictingTimestampUnits = units72h.filter(u => u.warnings.some(w => w.toLowerCase().includes('conflicting timestamps')));

assertEqual(staleShipmentUnits.length, 1, 'Exactly 1 stale Dealer Y shipment warning');
assertEqual(conflictingTimestampUnits.length, 1, 'Exactly 1 conflicting run timestamps warning');

console.log('====================================================');
console.log('ALL GROUND-TRUTH TEST CHECKS PASSED PERFECTLY (100%)');
console.log('====================================================');
