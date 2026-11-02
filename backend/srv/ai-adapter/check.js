const path = require('node:path');
const fs = require('node:fs');
const { readConfig, createClient } = require('./sarvam-client');
const { createIntake } = require('./intake');
const reports = require('./test-set/reports.json');
async function main() {
  const envFile = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const config = readConfig();
  if (process.argv.includes('--config-only')) {
    console.log(JSON.stringify({ configured: true, provider: 'sarvam', model: config.model, keyPresent: true }));
    return;
  }
  const id = process.argv.find(arg => arg.startsWith('--fixture='))?.slice(10) || 'hi-01';
  const fixture = reports.find(row => row.id === id);
  if (!fixture) throw Object.assign(new Error('Unknown fixture ID.'), { code: 'AI_INVALID_INPUT' });
  const client = createClient(config);
  const result = await createIntake({ client })(fixture.input);
  console.log(JSON.stringify({ fixture: id, schemaValid: true, providerCalls: client.calls,
    categoryMatchesExpected: result.category === fixture.expected.category,
    ncCodeMatchesExpected: result.suggestedNcCode === fixture.expected.suggestedNcCode,
    result }, null, 2));
}
if (require.main === module) main().catch(cause => {
  // Application-owned errors only. Never print provider response bodies, keys or environment.
  console.error(JSON.stringify({ code: /^AI_/.test(cause.code || '') ? cause.code : 'AI_CHECK_FAILED',
    message: /^AI_/.test(cause.code || '') ? cause.message : 'Check failed. Inspect setup without logging secrets.' }));
  process.exitCode = 1;
});
module.exports = { main };
