const { buildCorpus } = require('../similarity/corpus');
const { createSearch, cosine } = require('../similarity/search');
const { createSimilarityRouter } = require('../similarity/endpoints');
const express = require('express');
const sources = () => ({
  incidents: [
    { incidentId: 'TS-OLD', toolId: 'TOOL-B', category: 'TORQUE', rawText: 'Bolts remain loose after tightening.', translatedText: 'Torque wrench leaves loose bolts.', reportedAt: '2026-10-20T00:00:00Z', state: 'Closed' },
    { incidentId: 'TS-CURRENT', toolId: 'TOOL-B', category: 'TORQUE', rawText: 'Current loose bolts report.', reportedAt: '2026-11-01T00:00:00Z' },
    { incidentId: 'TS-OTHER', toolId: 'TOOL-A', category: 'ELECTRICAL', rawText: 'Frayed cable insulation.', reportedAt: '2026-10-20T00:00:00Z' },
    { incidentId: 'TS-FUTURE', toolId: 'TOOL-B', category: 'TORQUE', rawText: 'Future torque report.', reportedAt: '2027-01-01T00:00:00Z' },
  ],
  repairs: [{ repairId: 'REP-OLD', incidentId: 'TS-OLD', toolId: 'TOOL-B', description: 'Recorded torque adjustment.', loggedAt: '2026-10-21T00:00:00Z', passed: true },
    { repairId: 'REP-CURRENT', incidentId: 'TS-CURRENT', toolId: 'TOOL-B', description: 'Current repair', loggedAt: '2026-11-01T01:00:00Z' }],
  sops: [{ docId: 'SOP-REAL', title: 'Torque verification reference', section: '2.1', text: 'A reported loose bolt requires authorized review of the torque verification records.' },
    { docId: 'SOP-PLACEHOLDER', title: 'Placeholder procedure', text: 'Synthetic placeholder.' }],
});
const filters = { excludeIncidentId: 'TS-CURRENT', toolId: 'TOOL-B', asOf: '2026-11-01T00:00:00Z' };
test('source selection excludes current incident, linked repair, future records and other tools', () => {
  const corpus = buildCorpus(sources(), filters);
  expect(corpus.passages.map(row => row.sourceId).sort()).toEqual(['REP-OLD', 'SOP-REAL', 'TS-OLD']);
  expect(corpus.warnings.join(' ')).toMatch(/placeholder/);
});
test('source citations are stable, versioned, and change when content changes', () => {
  const data = sources(), first = buildCorpus(data, filters), repeat = buildCorpus(data, filters);
  expect(first.corpusVersion).toBe(repeat.corpusVersion);
  expect(first.passages.map(row => row.chunkId)).toEqual(repeat.passages.map(row => row.chunkId));
  data.repairs[0].description = 'Updated authoritative repair note';
  const updated = buildCorpus(data, filters);
  expect(updated.corpusVersion).not.toBe(first.corpusVersion);
  expect(updated.passages.find(row => row.sourceId === 'REP-OLD').sourceVersion).not.toBe(first.passages.find(row => row.sourceId === 'REP-OLD').sourceVersion);
});
test('conflicting tool links and missing repair descriptions are excluded explicitly', () => {
  const data = sources();
  data.repairs.push({ ...data.repairs[0], repairId: 'CONFLICT', toolId: 'TOOL-A' }, { ...data.repairs[0], repairId: 'EMPTY', description: '' });
  const result = buildCorpus(data, filters);
  expect(result.passages.some(row => ['CONFLICT', 'EMPTY'].includes(row.sourceId))).toBe(false);
  expect(result.warnings.join(' ')).toMatch(/conflicting tool\/incident links/);
  expect(result.warnings.join(' ')).toMatch(/no recorded description/);
});
test('chunk citations reproduce exact Unicode passages and do not fabricate page numbers', () => {
  const text = 'ಕನ್ನಡ 🛠 '.repeat(200);
  const corpus = buildCorpus({ incidents: [], repairs: [], sops: [{ docId: 'SOP-KN', title: 'Reference', section: '3', text }] });
  expect(corpus.passages.length).toBeGreaterThan(1);
  for (const row of corpus.passages) {
    expect(row.text).toBe(Array.from(text).slice(row.span.start, row.span.end).join(''));
    expect(row).not.toHaveProperty('page');
  }
});
test('keyword fallback is honest, deterministic, cites sources and does not invent repairs', async () => {
  const embedder = { embed: jest.fn().mockRejectedValue(new Error('missing local model')) };
  const search = createSearch({ embedder, loadSources: async () => sources() });
  const result = await search({ query: 'loose bolts', ...filters });
  expect(result.method).toBe('KEYWORD'); expect(result.embeddingModelVersion).toBeNull();
  expect(result.matches[0].sourceId).toBe('TS-OLD');
  expect(result.matches[0].citation.sourceId).toBe('TS-OLD');
  expect(result.matches[0].semanticSimilarity).toBeNull();
  expect(result.matches[0].label).toBe('Needs technician verification');
  expect(result.warnings.join(' ')).toMatch(/keyword search only/);
  expect(result).not.toHaveProperty('repairSteps'); expect(result).not.toHaveProperty('duplicateOf');
  expect(await search({ query: 'loose bolts', ...filters })).toEqual(result);
});
test('hybrid search uses query/passage embeddings and returns model provenance', async () => {
  const embedder = { modelVersion: 'test-embedding-model', embed: jest.fn(async (texts, kind) => kind === 'query' ? [[1, 0]] : texts.map(() => [0.9, 0.1])) };
  const result = await createSearch({ embedder, loadSources: async () => sources() })({ query: 'torque', ...filters });
  expect(result.method).toBe('HYBRID'); expect(result.embeddingModelVersion).toBe('test-embedding-model');
  expect(embedder.embed.mock.calls[0][1]).toBe('query'); expect(embedder.embed.mock.calls[1][1]).toBe('passage');
  expect(result.matches[0].semanticSimilarity).toBeGreaterThan(0.9);
});
test('empty/irrelevant scopes return no matches rather than the top unrelated record', async () => {
  const search = createSearch({ embedder: { embed: async () => { throw new Error(); } }, loadSources: async () => sources() });
  expect((await search({ query: 'weather tomorrow forecast', ...filters })).matches).toEqual([]);
  expect((await search({ query: 'tool report', ...filters })).matches).toEqual([]);
  expect((await search({ query: 'loose bolts', category: 'ELECTRICAL', ...filters })).matches.every(row => row.sourceType === 'SOP')).toBe(true);
});
test.each([{ query: '' }, { query: 'x'.repeat(2001) }, { query: 'torque', limit: 11 }, { query: 'torque', toolId: [] }, { query: 'torque', asOf: 'invalid' }])('rejects malformed input %j before loading records', async input => {
  const loadSources = jest.fn();
  await expect(createSearch({ embedder: {}, loadSources })(input)).rejects.toMatchObject({ code: 'AI_INVALID_INPUT' });
  expect(loadSources).not.toHaveBeenCalled();
});
test('invalid embedding output falls back rather than emitting NaN scores', async () => {
  const result = await createSearch({ embedder: { embed: async texts => texts.map(() => [NaN, 0]) }, loadSources: async () => sources() })({ query: 'loose bolts', ...filters });
  expect(result.method).toBe('KEYWORD');
  expect(result.matches.every(row => Number.isFinite(row.relevanceScore))).toBe(true);
  expect(() => cosine([0, 0], [0, 0])).toThrow();
});
test('read-only HTTP routes authenticate and saved search excludes its own ID', async () => {
  process.env.AUTH_MODE = 'header';
  const lookupTool = jest.fn(async id => id === 'TOOL-B'), lookupIncident = jest.fn(async id => id === 'TS-CURRENT' ? sources().incidents[1] : null);
  const app = express(); app.use(express.json());
  app.use('/api', createSimilarityRouter({ lookupTool, lookupIncident, loadSources: async () => sources(), embedder: { embed: async () => { throw new Error(); } } }));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: { code: error.code } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`, headers = { 'x-demo-user': 'SEARCH-TEST', 'x-demo-role': 'Technician', 'Content-Type': 'application/json' };
  try {
    expect((await fetch(base + '/incidents/TS-CURRENT/similar')).status).toBe(401);
    const result = await fetch(base + '/incidents/TS-CURRENT/similar', { headers }).then(r => r.json());
    expect(result.filters.excludedIncidentId).toBe('TS-CURRENT');
    expect(result.matches.every(row => row.incidentId !== 'TS-CURRENT')).toBe(true);
    expect((await fetch(base + '/incidents/MISSING/similar', { headers })).status).toBe(404);
    expect((await fetch(base + '/ai/search', { method: 'POST', headers, body: JSON.stringify({ query: 'torque', toolId: 'MISSING' }) })).status).toBe(404);
    expect((await fetch(base + '/ai/search', { method: 'POST', headers, body: JSON.stringify({ query: 'loose bolts', toolId: 'TOOL-B' }) })).status).toBe(200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
