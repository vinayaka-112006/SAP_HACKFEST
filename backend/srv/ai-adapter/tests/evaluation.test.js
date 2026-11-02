const fixtures = require('../test-set/reports.json');
const { validateFixtures, assess, evaluate } = require('../evaluate');
test('evaluation fixtures have five valid Unicode reports per language', () => {
  expect(validateFixtures()).toMatchObject({ fixtures: 15, languages: { kn: 5, hi: 5, en: 5 } });
  expect(() => validateFixtures(fixtures.slice(1))).toThrow();
});
test('ambiguous reports must keep symptom/category/code empty and preserve original data', () => {
  const fixture = fixtures.find(row => row.id === 'en-05');
  const value = { ...fixture.input, detectedLanguage: 'en', category: null, suggestedNcCode: null, mentionedToolId: null, symptom: null,
    missingFields: ['symptom', 'category', 'suggestedNcCode'], requiresWorkerConfirmation: true };
  expect(assess(fixture, value).passed).toBe(true);
  expect(assess(fixture, { ...value, symptom: 'invented' }).passed).toBe(false);
  expect(assess(fixture, { ...value, rawText: 'rewritten' }).passed).toBe(false);
});
test('credit/auth failure stops remaining live evaluation calls without reporting skipped rows as passed', async () => {
  const client = { calls: 0, complete: jest.fn(async () => { client.calls++; throw Object.assign(new Error('private body'), { code: 'AI_CREDITS_EXHAUSTED' }); }) };
  const result = await evaluate({ client });
  expect(result).toMatchObject({ total: 15, attempted: 1, passed: 0, providerCalls: 1 });
  expect(client.complete).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(result)).not.toContain('private body');
});
