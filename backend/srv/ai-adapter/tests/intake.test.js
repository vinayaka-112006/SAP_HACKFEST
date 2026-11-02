const { createIntake, loadCatalogue } = require('../intake');
const { schema, conforms, validateOutput } = require('../validation');
const { createClient, readConfig } = require('../sarvam-client');
const reports = require('../test-set/reports.json');
const catalogue = loadCatalogue();
const card = (changes = {}) => ({ detectedLanguage: 'en', translatedText: 'Bolts remain loose after using Tool B.',
  symptom: 'Bolts remain loose', category: 'TORQUE', suggestedNcCode: 'NC-TORQUE-LOOSE',
  mentionedToolId: 'TOOL-B', confidence: 0.9, missingFields: [], ...changes });
const response = value => ({ content: JSON.stringify(value), model: 'sarvam-105b', usage: { total_tokens: 100 } });
const input = reports.find(row => row.id === 'en-01').input;
test('15 provisional reference reports cover five cases per language', () => {
  expect(reports).toHaveLength(15);
  expect(new Set(reports.map(row => row.id)).size).toBe(15);
  for (const language of ['kn', 'hi', 'en']) expect(reports.filter(row => row.input.language === language)).toHaveLength(5);
  for (const row of reports) if (row.expected.suggestedNcCode) expect(catalogue.some(code => code.code === row.expected.suggestedNcCode)).toBe(true);
});
test.each(reports)('mocked intake preserves language/text and validates reference $id', async fixture => {
  const value = card({ detectedLanguage: fixture.input.language, translatedText: fixture.expected.symptomEnglish || 'Something seems wrong; details are unknown.',
    symptom: fixture.expected.symptomEnglish, category: fixture.expected.category,
    suggestedNcCode: fixture.expected.suggestedNcCode, mentionedToolId: fixture.expected.mentionedToolId,
    missingFields: fixture.expected.missingFields || [], confidence: fixture.expected.category ? 0.9 : 0.2 });
  const result = await createIntake({ client: { complete: async () => response(value) } })(fixture.input);
  expect(result.rawText).toBe(fixture.input.rawText);
  expect(result.language).toBe(fixture.input.language);
  expect(result.category).toBe(fixture.expected.category);
  expect(result.suggestedNcCode).toBe(fixture.expected.suggestedNcCode);
  expect(result.requiresWorkerConfirmation).toBe(true);
});
test('preserves exact raw input and model provenance, without inventing identity/time', async () => {
  const complete = jest.fn().mockResolvedValue(response(card()));
  const rawText = '  ' + input.rawText + '\n';
  const result = await createIntake({ client: { complete } })({ ...input, rawText });
  expect(result.rawText).toBe(rawText);
  expect(result.missingFields).toEqual(['reportedAt', 'reporterId']);
  expect(result.modelVersion).toBe('sarvam-105b|intake-2|card-1');
  expect(result.requiresWorkerConfirmation).toBe(true);
  expect(result.needsReview).toBe(true);
  expect(result).not.toHaveProperty('reportedAt');
  expect(result).not.toHaveProperty('state');
  expect(JSON.parse(complete.mock.calls[0][0][1].content).rawText).toBe(rawText);
});
test.each([
  { confidence: 2 }, { confidence: NaN }, { category: 'UNKNOWN-CATEGORY' },
  { translatedText: '' }, { missingFields: ['arbitrary'] }, { extra: 'field' },
  { suggestedNcCode: 'NC-INVENTED' }, { suggestedNcCode: 'NC-WEAR' },
  { translatedText: 'The product is defective.' },
  { symptom: null }, { missingFields: ['category'] },
])('rejects malformed or unsupported output %j', changes => {
  expect(() => validateOutput(card(changes), catalogue)).toThrow();
});
test('rejects missing schema fields and schema extensions with unsupported keywords', () => {
  const missing = card(); delete missing.confidence;
  expect(conforms(missing, schema)).toBe(false);
  expect(() => conforms('x', { type: 'string', pattern: 'x' })).toThrow('Unsupported schema keyword');
});
test('one repair retry for invalid output; never repeats provider output in repair instructions', async () => {
  const complete = jest.fn().mockResolvedValueOnce({ content: 'invalid', model: 'sarvam-105b' }).mockResolvedValueOnce(response(card()));
  expect((await createIntake({ client: { complete } })(input)).category).toBe('TORQUE');
  expect(complete).toHaveBeenCalledTimes(2);
  expect(complete.mock.calls[1][0].at(-1).content).not.toContain('invalid');
});
test('fails explicitly after two invalid outputs', async () => {
  const complete = jest.fn().mockResolvedValue({ content: '{}', model: 'sarvam-105b' });
  await expect(createIntake({ client: { complete } })(input)).rejects.toMatchObject({ code: 'AI_INVALID_OUTPUT' });
  expect(complete).toHaveBeenCalledTimes(2);
});
test('tool/language conflicts require review without changing selected context', async () => {
  const result = await createIntake({ client: { complete: async () => response(card({ mentionedToolId: 'TOOL-C', detectedLanguage: 'hi' })) } })(input);
  expect(result.toolId).toBe('TOOL-B'); expect(result.language).toBe('en');
  expect(result.missingFields).toContain('toolId'); expect(result.warnings).toHaveLength(4);
});
test('unclear reports keep null values and surface missing fields', async () => {
  const result = await createIntake({ client: { complete: async () => response(card({ symptom: null, category: null, suggestedNcCode: null, confidence: 0.1 })) } })(input);
  expect(result.category).toBeNull(); expect(result.needsReview).toBe(true);
  expect(result.missingFields).toEqual(expect.arrayContaining(['symptom', 'category', 'suggestedNcCode']));
});
test('bad input fails before spending credits', async () => {
  const complete = jest.fn();
  const intake = createIntake({ client: { complete } });
  for (const changes of [{ rawText: '' }, { rawText: 'x'.repeat(2001) }, { language: 'xx' }, { reportedAt: '2026-02-30T00:00:00Z' }])
    await expect(intake({ ...input, ...changes })).rejects.toMatchObject({ code: 'AI_INVALID_INPUT' });
  expect(complete).not.toHaveBeenCalled();
});
const config = { apiKey: 'test-secret', model: 'sarvam-105b', maxCalls: 2, timeoutMs: 20, maxTokens: 700 };
test.each([[402, 'AI_CREDITS_EXHAUSTED'], [403, 'AI_AUTH_FAILED'], [429, 'AI_RATE_LIMITED'], [500, 'AI_PROVIDER_UNAVAILABLE']])('safe provider error %s without retries or raw error text', async (status, code) => {
  const fetch = jest.fn().mockResolvedValue({ ok: false, status });
  const client = createClient(config, fetch);
  await expect(createIntake({ client })(input)).rejects.toMatchObject({ code });
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('native fetch request is authenticated and schema constrained, with safe usage metadata', async () => {
  const fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ model: 'sarvam-105b', choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { total_tokens: 99, secret: 'do-not-forward' } }) });
  const client = createClient(config, fetch);
  expect((await client.complete([], schema)).usage).toEqual({ total_tokens: 99 });
  expect(fetch.mock.calls[0][0]).toBe('https://api.sarvam.ai/v1/chat/completions');
  expect(JSON.parse(fetch.mock.calls[0][1].body).response_format.type).toBe('json_object');
  expect(JSON.parse(fetch.mock.calls[0][1].body).reasoning_effort).toBeNull();
  await client.complete([], schema);
  await expect(client.complete([], schema)).rejects.toMatchObject({ code: 'AI_CALL_LIMIT' });
});
test('timeout and network errors do not leak raw driver messages', async () => {
  const fetch = async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('test-secret'))));
  await expect(createClient(config, fetch).complete([], schema)).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
  await expect(createClient(config, async () => { throw new Error('test-secret'); }).complete([], schema)).rejects.toMatchObject({ message: 'AI request failed. Manual reporting remains available.' });
});
test('missing key and unsupported model fail with safe setup instructions', () => {
  expect(() => readConfig({})).toThrow('Add SARVAM_API_KEY');
  expect(() => readConfig({ SARVAM_API_KEY: 'test-secret', SARVAM_CHAT_MODEL: 'unknown' })).toThrow('Unsupported');
});
