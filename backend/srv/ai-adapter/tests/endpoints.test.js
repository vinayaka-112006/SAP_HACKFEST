process.env.AUTH_MODE = 'header';
const express = require('express');
const { createRouter } = require('../endpoints');
const { loadCatalogue } = require('../intake');
const { createClient } = require('../sarvam-client');
let server, base;
const complete = jest.fn(), transcribe = jest.fn();
const lookupTool = jest.fn(async id => id === 'TOOL-B' ? { toolId: id } : null);
const headers = { 'x-demo-user': 'AI-HTTP-TEST', 'x-demo-role': 'Worker', 'Content-Type': 'application/json' };
const input = { toolId: 'TOOL-B', language: 'en', rawText: 'Tool B leaves bolts loose.' };
const value = { detectedLanguage: 'en', translatedText: 'Tool B leaves bolts loose.', symptom: 'Loose bolts', category: 'TORQUE',
  suggestedNcCode: 'NC-TORQUE-LOOSE', mentionedToolId: 'TOOL-B', confidence: 0.9, missingFields: [] };
beforeEach(async () => {
  complete.mockReset().mockResolvedValue({ content: JSON.stringify(value), model: 'sarvam-105b', usage: {} });
  transcribe.mockReset().mockResolvedValue({ transcript: 'Test transcript', _stub: false });
  lookupTool.mockClear();
  const app = express(); app.use(express.json());
  app.use('/api', createRouter({ lookupTool, loadNcCatalogue: async () => loadCatalogue(), clientFactory: () => ({ complete, transcribe }) }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: { code: err.code || err.type } }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
afterEach(async () => { await new Promise(resolve => server.close(resolve)); });
const post = (path, body = input, options = {}) => fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body), ...options });
test('protected intake returns a reviewed real response, preserving context', async () => {
  const response = await post('/ai/structure-report');
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ toolId: 'TOOL-B', rawText: input.rawText, _stub: false, requiresWorkerConfirmation: true });
  expect(lookupTool).toHaveBeenCalledWith('TOOL-B');
});
test('missing identity and wrong role fail before provider work', async () => {
  expect((await post('/ai/structure-report', input, { headers: { 'Content-Type': 'application/json' } })).status).toBe(401);
  expect((await post('/ai/structure-report', input, { headers: { ...headers, 'x-demo-role': 'Quality' } })).status).toBe(403);
  expect(complete).not.toHaveBeenCalled();
});
test('unknown tool and invalid input fail before spending credits', async () => {
  expect((await post('/ai/structure-report', { ...input, toolId: 'UNKNOWN' })).status).toBe(404);
  expect((await post('/ai/structure-report', { ...input, rawText: '' })).status).toBe(400);
  expect(complete).not.toHaveBeenCalled();
});
test('provider failure returns a safe actionable error without a fabricated result', async () => {
  complete.mockRejectedValue(Object.assign(new Error('Sarvam credits are exhausted.'), { code: 'AI_CREDITS_EXHAUSTED' }));
  const response = await post('/ai/structure-report');
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: { code: 'AI_CREDITS_EXHAUSTED' } });
});
test('audio endpoint accepts bounded raw bytes and forwards selected language', async () => {
  const response = await fetch(base + '/ai/transcribe?language=kn', { method: 'POST', headers: { ...headers, 'Content-Type': 'audio/webm;codecs=opus' }, body: Buffer.from('test-audio') });
  expect(response.status).toBe(200);
  expect(transcribe).toHaveBeenCalledWith(Buffer.from('test-audio'), 'audio/webm', 'kn');
});
test('unsupported, empty, oversized audio and invalid language never reach Sarvam', async () => {
  for (const [type, bytes, language, status] of [
    ['text/plain', Buffer.from('x'), 'en', 415], ['audio/wav', Buffer.alloc(0), 'en', 400],
    ['audio/wav', Buffer.from('x'), 'xx', 400], ['audio/wav', Buffer.alloc(2 * 1024 * 1024 + 1), 'en', 413],
  ]) {
    const response = await fetch(base + `/ai/transcribe?language=${language}`, { method: 'POST', headers: { ...headers, 'Content-Type': type }, body: bytes });
    expect(response.status).toBe(status);
  }
  expect(transcribe).not.toHaveBeenCalled();
});
test('per-actor limits bound provider use', async () => {
  for (let n = 0; n < 6; n++) expect((await post('/ai/structure-report')).status).toBe(200);
  expect((await post('/ai/structure-report')).status).toBe(429);
  expect(complete).toHaveBeenCalledTimes(6);
});
test('speech client sends multipart transcription mode and validates its response', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ transcript: 'ಮಾದರಿ', language_code: 'kn-IN' }) });
  const client = createClient({ apiKey: 'test-key', speechModel: 'saaras:v3', timeoutMs: 1000, maxCalls: 1 }, fetchImpl);
  const result = await client.transcribe(Buffer.from('audio'), 'audio/wav', 'kn');
  expect(result).toMatchObject({ transcript: 'ಮಾದರಿ', detectedLanguage: 'kn', requiresTranscriptReview: true });
  expect(fetchImpl.mock.calls[0][1].body.get('mode')).toBe('transcribe');
  expect(fetchImpl.mock.calls[0][1].body.get('language_code')).toBe('kn-IN');
  await expect(client.transcribe(Buffer.from('audio'), 'audio/wav', 'kn')).rejects.toMatchObject({ code: 'AI_CALL_LIMIT' });
});
