const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
function buildCorpus({ incidents, repairs, sops }, { excludeIncidentId, toolId, category, asOf = new Date().toISOString() } = {}) {
  const documents = [], warnings = [];
  const incidentMap = new Map(incidents.map(row => [row.incidentId, row]));
  const before = time => Number.isFinite(Date.parse(time)) && Date.parse(time) <= Date.parse(asOf);
  const allowed = row => row.incidentId !== excludeIncidentId && (!toolId || row.toolId === toolId) && (!category || row.category === category);
  function add(sourceType, sourceId, text, metadata = {}) {
    if (!text?.trim()) return;
    const sourceVersion = hash(JSON.stringify({ sourceType, sourceId, text, ...metadata }));
    const characters = Array.from(text);
    // Unicode-code-point spans in canonical source text; include overlap for context.
    for (let start = 0, chunk = 1; start < characters.length; start += 780, chunk++) {
      const end = Math.min(start + 900, characters.length);
      documents.push({ sourceType, sourceId, sourceVersion, chunkId: `${sourceType}:${sourceId}:${sourceVersion.slice(0, 12)}:${chunk}`,
        text: characters.slice(start, end).join(''), span: { start, end, unit: 'unicode_code_points' }, ...metadata });
      if (end === characters.length) break;
    }
  }
  for (const row of incidents) if (allowed(row) && before(row.reportedAt)) add('INCIDENT', row.incidentId,
    [`Category: ${row.category || 'Not recorded'}`, `Original report: ${row.rawText || ''}`, row.translatedText ? `English report: ${row.translatedText}` : ''].filter(Boolean).join('\n'),
    { incidentId: row.incidentId, toolId: row.toolId, category: row.category, reportedAt: row.reportedAt, state: row.state, title: `Past incident ${row.incidentId}` });
  let conflictingRepairs = 0, missingRepairNotes = 0;
  for (const row of repairs) {
    const parent = incidentMap.get(row.incidentId);
    if (!parent || !allowed(parent) || !before(parent.reportedAt) || !before(row.loggedAt)) continue;
    if (row.toolId !== parent.toolId) { conflictingRepairs++; continue; }
    if (!row.description?.trim()) { missingRepairNotes++; continue; }
    add('REPAIR', row.repairId, `Category: ${parent.category || 'Not recorded'}\nRecorded repair note: ${row.description || ''}`, {
      incidentId: row.incidentId, toolId: row.toolId, category: parent.category, recordedAt: row.loggedAt,
      passed: row.passed === true || row.passed === 1, verifiedAt: row.verifiedAt || null, title: `Recorded repair ${row.repairId}`,
    });
  }
  if (conflictingRepairs) warnings.push(`${conflictingRepairs} repair records have conflicting tool/incident links and were excluded.`);
  if (missingRepairNotes) warnings.push(`${missingRepairNotes} repair records have no recorded description and were excluded.`);
  let placeholders = 0;
  for (const row of sops) {
    if (/placeholder/i.test(`${row.title} ${row.text}`)) { placeholders++; continue; }
    add('SOP', row.docId, row.text, { title: row.title, section: row.section || null });
  }
  if (placeholders) warnings.push(`${placeholders} SOP records contain placeholder content and were excluded. Supply reviewed SOP text for procedure retrieval.`);
  if (sops.length > placeholders) warnings.push('SOP revision dates are not stored; current stored SOP text is searched, including for historical incidents.');
  const sorted = documents.sort((a, b) => a.chunkId.localeCompare(b.chunkId));
  if (sorted.length > 1000) warnings.push('Prototype index is limited to 1000 passages; remaining passages were not searched.');
  return { passages: sorted.slice(0, 1000), warnings, totalPassages: sorted.length,
    corpusVersion: hash(sorted.map(row => row.chunkId).join('\n')) };
}
module.exports = { buildCorpus, hash };
