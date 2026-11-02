// Synthetic provider check only: no database connection, incident or approval writes.
const fs = require('node:fs');
const path = require('node:path');
const { plan } = require('../srv/lib/recovery-planner');
const { readConfig, createClient } = require('../srv/ai-adapter/sarvam-client');
async function main() {
  const envFile = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const config = readConfig();
  if (!process.argv.includes('--live')) {
    console.log(JSON.stringify({ configured: true, provider: 'sarvam', calls: 0, databaseAccess: false }));
    return;
  }
  const client = createClient({ ...config, maxTokens: 1000, maxCalls: 3 });
  const result = await plan({ incident: { incidentId: 'SYNTHETIC-RECOVERY-CHECK', rawText: 'Synthetic fixture slips; inspection requested.', state: 'Confirmed', confirmedBy: 'SYNTHETIC-WORKER' },
    source: { toolId: 'SYNTHETIC-TOOL', type: 'TORQUE', state: 'Restricted' }, trace: null, candidates: [],
    options: [{ optionId: 'PAUSE', label: 'Pause pending inspection', eligible: true }, { optionId: 'WAIT', label: 'Wait for verified repair', eligible: true }],
    evidenceIds: ['SYNTHETIC-RECOVERY-CHECK', 'SYNTHETIC-TOOL'] }, client);
  console.log(JSON.stringify({ status: 'PASSED', provider: 'sarvam', providerCalls: client.calls,
    modelVersion: result.modelVersion, selectedOptionId: result.selectedOptionId,
    readTools: result.steps.filter(s => s.tool).map(s => s.tool), actionExecuted: result.actionExecuted, databaseAccess: false }));
}
main().catch(error => {
  console.error(JSON.stringify({ status: 'FAILED', code: /^(AI_|INVALID_AGENT_|AGENT_)/.test(error.code || '') ? error.code : 'RECOVERY_CHECK_FAILED',
    message: 'Synthetic planner check failed; inspect configuration or planner protocol without logging credentials.' }));
  process.exitCode = 1;
});
