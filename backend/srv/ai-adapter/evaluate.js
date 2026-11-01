const fs = require('node:fs');
const path = require('node:path');
const reports = require('./test-set/reports.json');
const { validateInput } = require('./validation');
const { createIntake } = require('./intake');
function validateFixtures(fixtures = reports) {
  if (fixtures.length !== 15 || new Set(fixtures.map(row => row.id)).size !== 15) throw new Error('Expected 15 unique fixtures.');
  for (const lang of ['kn', 'hi', 'en']) {
    const group = fixtures.filter(row => row.input.language === lang);
    if (group.length !== 5) throw new Error('Expected five reports per language.');
    for (const row of group) {
      validateInput(row.input);
      if (/\ufffd/u.test(row.input.rawText) || lang === 'kn' && !/[\u0c80-\u0cff]/u.test(row.input.rawText) || lang === 'hi' && !/[\u0900-\u097f]/u.test(row.input.rawText))
        throw new Error('Fixture text encoding or script is invalid.');
      if (!row.expected || !Object.hasOwn(row.expected, 'category') || !Object.hasOwn(row.expected, 'suggestedNcCode')) throw new Error('Fixture expectations are missing.');
    }
  }
  return { fixtures: 15, languages: { kn: 5, hi: 5, en: 5 }, referenceStatus: 'DRAFT_SYNTHETIC_NOT_HUMAN_APPROVED' };
}
function assess(fixture, value) {
  const expected = fixture.expected;
  const checks = {
    category: value.category === expected.category,
    ncCode: value.suggestedNcCode === expected.suggestedNcCode,
    mentionedTool: value.mentionedToolId === expected.mentionedToolId,
    detectedLanguage: value.detectedLanguage === fixture.input.language,
    originalPreserved: value.rawText === fixture.input.rawText && value.toolId === fixture.input.toolId,
    missingFields: (expected.missingFields || []).every(field => value.missingFields.includes(field)),
    confirmationRequired: value.requiresWorkerConfirmation === true,
    ambiguousSymptom: expected.symptomEnglish !== null || value.symptom === null,
  };
  return { checks, passed: Object.values(checks).every(Boolean) };
}
async function evaluate({ client, fixtures = reports, onProgress = () => {} }) {
  const dataset = validateFixtures(fixtures), intake = createIntake({ client });
  const results = [];
  let stopped = false;
  for (const fixture of fixtures) {
    if (stopped) { results.push({ id: fixture.id, language: fixture.input.language, attempted: false, passed: false }); continue; }
    const started = Date.now();
    try {
      const value = await intake(fixture.input);
      results.push({ id: fixture.id, language: fixture.input.language, attempted: true, schemaValid: true, ...assess(fixture, value),
        elapsedMs: Date.now() - started, expected: fixture.expected, actual: value,
        translationReview: 'PENDING_HUMAN_REVIEW; English reference is semantic, not an exact string target.' });
    } catch (cause) {
      const code = /^AI_/.test(cause.code || '') ? cause.code : 'EVALUATION_FAILED';
      results.push({ id: fixture.id, language: fixture.input.language, attempted: true, passed: false, schemaValid: false, errorCode: code, elapsedMs: Date.now() - started });
      if (['AI_AUTH_FAILED', 'AI_CREDITS_EXHAUSTED', 'AI_CALL_LIMIT'].includes(code)) stopped = true;
    }
    onProgress({ id: fixture.id, passed: results.at(-1).passed, errorCode: results.at(-1).errorCode });
  }
  return { _label: 'SIMULATED', dataset, executedAt: new Date().toISOString(), providerCalls: client.calls,
    total: results.length, attempted: results.filter(row => row.attempted).length, passed: results.filter(row => row.passed).length,
    byLanguage: Object.fromEntries(['kn', 'hi', 'en'].map(lang => [lang, { total: 5, passed: results.filter(row => row.language === lang && row.passed).length }])),
    limitations: ['Draft synthetic expectations; not production accuracy or catalogue-owner sign-off.', 'Translation faithfulness, diagnosis guardrails and pronunciation require human review.', 'Typed evaluation only; no physical microphone or noisy-floor acceptance.', 'One schema repair retry only; no automatic auth/quota/network retries.'], results };
}
async function main() {
  if (!process.argv.includes('--live')) { console.log(JSON.stringify({ ...validateFixtures(), liveCalls: 0, next: 'Pass --live to spend Sarvam credits on up to 30 calls for 15 reports.' })); return; }
  const envFile = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const { readConfig, createClient } = require('./sarvam-client');
  const report = await evaluate({ client: createClient(readConfig()), onProgress: row => console.log(JSON.stringify(row)) });
  const output = path.resolve(__dirname, '../../..', 'backup/phase5-intake-evaluation.json');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, total: report.total, attempted: report.attempted, providerCalls: report.providerCalls, byLanguage: report.byLanguage, output: 'backup/phase5-intake-evaluation.json', humanReview: 'pending' }));
  if (report.passed !== report.total) process.exitCode = 1;
}
if (require.main === module) main().catch(() => { console.error('Evaluation failed. Check fixture/configuration locally; no provider details or credentials are printed.'); process.exitCode = 1; });
module.exports = { validateFixtures, assess, evaluate };
