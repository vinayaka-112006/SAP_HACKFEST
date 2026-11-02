process.env.AUTH_MODE = 'header';
const express = require('express');
const text = require('../communication');
const { createRouter } = require('../communication-endpoints');
const { createClient } = require('../sarvam-client');
const card = { toolId: 'TOOL-B', rawText: 'Bolts loose.', translatedText: 'Bolts loose.', category: 'TORQUE', suggestedNcCode: 'NC-TORQUE-LOOSE', reporterId: 'W1', reportedAt: '2026-11-01T00:00:00Z' };
const incident = { ...card, incidentId: 'TS-1', state: 'Confirmed' };
const trace = { traceId: 'TRACE-1', incidentId: 'TS-1', version: 3, windowHours: 24, units: [{ tier: 'CONFIRMED' }, { tier: 'UNKNOWN' }], tiers: { CONFIRMED: 1, PROBABLE: 0, UNKNOWN: 1 }, gaps: [{ code: 'MISSING_LINK', reason: 'No tool-use record' }], snapshotTime: '2026-11-01T00:00:00Z' };
test.each(['en', 'hi', 'kn'])('grounded %s text preserves IDs, all card fields, counts and Unknown evidence', lang => {
  const readback = text.readback(card, lang);
  for (const value of Object.values(card)) expect(readback.text).toContain(value);
  expect(text.status(incident, lang)).toMatchObject({ recordedState: 'Confirmed', sourceIds: ['TS-1'], modelVersion: 'communication-1' });
  const result = text.explain(trace, lang);
  expect(result).toMatchObject({ traceVersion: 3, counts: { CONFIRMED: 1, PROBABLE: 0, UNKNOWN: 1 }, gaps: trace.gaps });
  expect(result.text).toContain('UNKNOWN: 1');
  expect(text.explain(trace, lang).contentVersion).toBe(result.contentVersion);
});
test('unrecognized status remains Unknown and inconsistent trace cannot be explained', () => {
  expect(text.status({ ...incident, state: 'invented' }, 'en').text).toContain('Unknown');
  expect(() => text.explain({ ...trace, tiers: { CONFIRMED: 9 } }, 'en')).toThrow();
  expect(() => text.readback({ ...card, rawText: 'x'.repeat(2001) }, 'en')).toThrow();
  expect(() => text.readback({ ...card, translatedText: 'x'.repeat(2400) }, 'en')).toThrow();
  expect(() => text.readback(card, 'fr')).toThrow();
});
let server, base, speak, saveDealerDraft, loadIncident, loadTrace;
const headers = { 'x-demo-user': 'COMM-TEST', 'x-demo-role': 'Worker', 'Content-Type': 'application/json' };
beforeEach(async () => {
  speak = jest.fn(async () => ({ audio: 'test', mimeType: 'audio/wav', modelVersion: 'bulbul:v3' }));
  saveDealerDraft = jest.fn(async value => ({ ...value, _label: 'SIMULATED', sent: false }));
  loadIncident = jest.fn(async id => id === 'TS-1' ? incident : null);
  loadTrace = jest.fn(async () => trace);
  const app = express(); app.use(express.json());
  app.use('/api', createRouter({ loadIncident, loadTrace, saveDealerDraft, clientFactory: () => ({ speak }) }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: { code: err.code } }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
afterEach(async () => { await new Promise(resolve => server.close(resolve)); });
const post = (path, body, role = 'Worker') => fetch(base + path, { method: 'POST', headers: { ...headers, 'x-demo-role': role }, body: JSON.stringify(body) });
test('readback requires explicit review, does not confirm, and has a six request cap', async () => {
  expect((await post('/ai/readback', { card, language: 'en' })).status).toBe(400);
  expect(speak).not.toHaveBeenCalled();
  for (let n = 0; n < 6; n++) {
    const response = await post('/ai/readback', { card, language: 'en', reviewed: true });
    expect(response.status).toBe(200); expect((await response.json()).requiresWorkerConfirmation).toBe(true);
  }
  expect((await post('/ai/readback', { card, language: 'en', reviewed: true })).status).toBe(429);
  expect(saveDealerDraft).not.toHaveBeenCalled();
});
test('saved readback uses server fields; status is fresh and no provider is needed', async () => {
  const response = await post('/ai/readback', { incidentId: 'TS-1', card: { ...card, rawText: 'forged' }, reviewed: true, language: 'kn' });
  expect((await response.json()).text).not.toContain('forged');
  expect((await fetch(base + '/incidents/TS-1/status-text?language=hi', { headers })).status).toBe(200);
  expect(speak).toHaveBeenCalledTimes(1);
  expect((await fetch(base + '/incidents/MISSING/status-text', { headers })).status).toBe(404);
});
test('trace and dealer authorization fails before sensitive reads or writes', async () => {
  expect((await fetch(base + '/incidents/TS-1/status-text')).status).toBe(401);
  expect((await fetch(base + '/incidents/TS-1/trace-explanation', { headers })).status).toBe(403);
  expect(loadTrace).not.toHaveBeenCalled();
  expect((await post('/incidents/TS-1/dealer-draft', { approvalId: 'A1', dealerId: 'D1' }, 'Manager')).status).toBe(403);
  expect(saveDealerDraft).not.toHaveBeenCalled();
});
test('trace explanation reads existing snapshot only, validates window and missing source', async () => {
  const h = { ...headers, 'x-demo-role': 'Quality' };
  const response = await fetch(base + '/incidents/TS-1/trace-explanation?window=72&language=kn', { headers: h });
  expect(response.status).toBe(200); expect(loadTrace).toHaveBeenCalledWith('TS-1', 72);
  expect((await fetch(base + '/incidents/TS-1/trace-explanation?window=99', { headers: h })).status).toBe(400);
  loadTrace.mockResolvedValue(null);
  expect((await fetch(base + '/incidents/TS-1/trace-explanation', { headers: h })).status).toBe(404);
  expect(speak).not.toHaveBeenCalled();
});
test('provider failure keeps card workflow available and returns safe errors', async () => {
  speak.mockRejectedValue(new Error('secret provider body'));
  const response = await post('/ai/readback', { card, language: 'en', reviewed: true });
  expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain('secret');
});
test('Bulbul uses documented contract, validates WAV, shares client call cap', async () => {
  const bytes = Buffer.alloc(44); bytes.write('RIFF'); bytes.write('WAVE', 8);
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ audios: [bytes.toString('base64')] }) }));
  const client = createClient({ apiKey: 'fake', timeoutMs: 1000, maxCalls: 1 }, fetchImpl);
  expect(await client.speak('Test card', 'kn')).toMatchObject({ modelVersion: 'bulbul:v3', mimeType: 'audio/wav' });
  expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({ language_code: 'kn-IN', model: 'bulbul:v3', output_audio_codec: 'wav' });
  await expect(client.speak('Test', 'en')).rejects.toMatchObject({ code: 'AI_CALL_LIMIT' });
  const bad = createClient({ apiKey: 'fake', timeoutMs: 1000, maxCalls: 1 }, async () => ({ ok: true, json: async () => ({ audios: ['abcd'] }) }));
  await expect(bad.speak('Test', 'hi')).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
});
