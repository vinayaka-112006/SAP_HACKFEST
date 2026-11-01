const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { fork } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..'), frontend = path.join(root, 'frontend');
function ready(child, regex) {
  return new Promise((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(Error('Test application startup timed out')), 30000);
    child.stdout.on('data', chunk => { out += chunk; const match = out.match(regex); if (match) { clearTimeout(timer); resolve(match); } });
    child.once('exit', code => { clearTimeout(timer); reject(Error('Test application exited ' + code)); });
  });
}
async function stop(child, backend = false) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { child.kill(); resolve(); }, 10000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    if (backend && child.connected) child.send({ type: 'toolsathi:shutdown' }); else child.kill();
  });
}
test('AI worker browser flow on isolated SQLite; provider responses mocked', { timeout: 120000 }, async t => {
  const socket = net.createServer(); await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  const backup = path.join(root, 'backup'); fs.mkdirSync(backup, { recursive: true });
  let backend, vite, browser;
  t.after(async () => { await browser?.close(); await stop(vite); await stop(backend, true); });
  backend = fork(path.join(root, 'backend/srv/server.js'), ['--database=sqlite'], { cwd: path.join(root, 'backend'), silent: true,
    env: { ...process.env, DATABASE_MODE: 'sqlite', NODE_ENV: 'development', CDS_ENV: 'development', AUTH_MODE: 'header', PORT: '0',
      CDS_REQUIRES_DB_CREDENTIALS_URL: path.join(backup, `ai-browser-${require('node:crypto').randomUUID()}.sqlite`) } });
  const base = (await ready(backend, /ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/))[1];
  vite = fork(path.join(frontend, 'node_modules/vite/bin/vite.js'), ['--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: frontend, silent: true, env: { ...process.env, VITE_AI_ENABLED: 'true', VITE_DEMO_AUTH: 'true', VITE_API_BASE_URL: '/api',
      API_PROXY_TARGET: base, TOOLSATHI_VITE_CACHE_DIR: path.join(backup, `ai-vite-${port}`) } });
  await ready(vite, /Local:\s+(http:\/\/[^\s]+)/);
  const executablePath = [process.env.BROWSER_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(file => file && fs.existsSync(file));
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  const raw = 'Tool B leaves bolts loose.';
  let aiCalls = 0, speechCalls = 0, failing = false, conflict = false, searchFail = false;
  const evidence = { _stub: false, method: 'HYBRID', indexedPassages: 2, scoreMeaning: 'Relevance, not fault confidence.',
    embeddingModelVersion: 'test-local-model', warnings: [], matches: [{ sourceId: 'SOP-TEST', sourceType: 'SOP', title: 'Synthetic test reference', section: '2.1',
      sourceVersion: 'a'.repeat(64), chunkId: 'SOP:SOP-TEST:test:1', span: { start: 0, end: 25, unit: 'unicode_code_points' }, excerpt: 'Recorded evidence excerpt.',
      lexicalScore: 0.5, semanticSimilarity: 0.9, label: 'Needs technician verification' }] };
  await page.route('**/api/ai/search', async route => {
    assert.equal(route.request().postDataJSON().toolId, 'TOOL-B');
    await route.fulfill(searchFail ? { status: 503, json: { error: { code: 'SEARCH_UNAVAILABLE', message: 'Search temporarily unavailable.' } } } : { json: evidence });
  });
  await page.route('**/api/incidents/*/similar?*', route => route.fulfill({ json: evidence }));
  await page.route('**/api/ai/readback', async route => {
    const body = route.request().postDataJSON();
    assert.equal(body.reviewed, true); assert.equal(body.card.toolId, 'TOOL-B');
    const wav = Buffer.alloc(44); wav.write('RIFF'); wav.write('WAVE', 8);
    await route.fulfill({ json: { _stub: false, text: body.card.rawText, language: body.language, audio: wav.toString('base64'), mimeType: 'audio/wav', sourceIds: [], modelVersion: 'bulbul:v3' } });
  });
  await page.addInitScript(() => {
    window.__stoppedTracks = 0;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => { window.__stoppedTracks++; } }] }) } });
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { window.__recorder = this; this.state = 'inactive'; }
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['fake-audio'], { type: 'audio/webm' }) }); this.onstop?.(); }
    };
  });
  await page.route('**/api/ai/transcribe?*', async route => {
    speechCalls++; assert.equal(route.request().headers()['content-type'], 'audio/webm;codecs=opus');
    assert.equal(route.request().postDataBuffer().toString(), 'fake-audio');
    await route.fulfill({ json: { _stub: false, transcript: raw, detectedLanguage: 'en', modelVersion: 'saaras:v3' } });
  });
  await page.route('**/api/ai/structure-report', async route => {
    aiCalls++;
    if (failing) return route.fulfill({ status: 503, json: { error: { code: 'AI_PROVIDER_UNAVAILABLE', message: 'Sarvam unavailable. Use manual reporting.' } } });
    const body = route.request().postDataJSON(); assert.equal(body.rawText, raw);
    await route.fulfill({ json: { _stub: false, translatedText: raw, category: 'TORQUE', suggestedNcCode: 'NC-TORQUE-LOOSE',
      confidence: 0.9, modelVersion: 'sarvam-105b|intake-2|card-1', missingFields: conflict ? ['toolId'] : [],
      warnings: conflict ? ['Tool mention differs from selected tool.'] : ['Provisional catalogue; worker review required.'] } });
  });
  async function reportScreen() {
    await page.goto(`http://127.0.0.1:${port}/worker`);
    const skip = page.getByRole('button', { name: /skip/i }); if (await skip.count()) await skip.first().click();
    await page.getByRole('button', { name: 'Worker local demo role' }).first().click();
    await page.getByLabel('Tool register').locator('option').filter({ hasText: 'TOOL-B' }).waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Confirm Tool & Proceed' }).click();
    await page.getByRole('button', { name: 'Continue to Report' }).click();
    await page.getByLabel('Reporter ID (required)').fill('AI-BROWSER-TEST');
  }
  await t.test('recording uploads bytes and produces an editable transcript', async () => {
    await reportScreen();
    await page.getByRole('button', { name: 'Start recording voice report' }).click();
    await page.getByRole('button', { name: 'Stop recording voice report' }).click();
    await page.getByLabel('Original report').filter({ visible: true }).waitFor();
    await page.waitForFunction(expected => document.querySelector('textarea[aria-label="Original report"]')?.value === expected, raw);
    assert.equal(speechCalls, 1); assert.ok(await page.evaluate(() => window.__stoppedTracks > 0));
  });
  await t.test('AI card preserves separate save/confirm and model provenance in audit', async () => {
    await page.getByRole('button', { name: 'Structure with AI' }).click();
    await page.getByRole('heading', { name: 'Review Incident Card' }).waitFor();
    assert.equal(await page.getByLabel('Category (optional)').inputValue(), 'TORQUE');
    await page.getByRole('button', { name: 'I reviewed this card — read aloud' }).click();
    await page.getByLabel('Reviewed card readback').waitFor();
    await page.getByLabel('Category (optional)').fill('WEAR');
    assert.equal(await page.getByLabel('Reviewed card readback').count(), 0);
    await page.getByLabel('Category (optional)').fill('TORQUE');
    await page.getByRole('button', { name: 'Find similar records' }).click();
    await page.getByTestId('similar-results').waitFor();
    assert.match(await page.getByTestId('similar-results').textContent(), /SOP-TEST/);
    assert.match(await page.getByTestId('similar-results').textContent(), /Needs technician verification/);
    await page.getByLabel('Category (optional)').fill('WEAR');
    assert.equal(await page.getByTestId('similar-results').count(), 0);
    await page.getByLabel('Category (optional)').fill('TORQUE');
    await page.getByLabel('Translated report', { exact: true }).fill('Worker-reviewed English explanation');
    assert.equal(await page.getByRole('button', { name: 'Confirm Incident', exact: true }).count(), 0);
    const saved = page.waitForResponse(r => r.url().endsWith('/api/incidents') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save Incident', exact: true }).click();
    const result = await (await saved).json();
    assert.equal(result.incident.state, 'Reported'); assert.equal(result.incident.rawText, raw);
    assert.equal(result.incident.modelVersion, 'sarvam-105b|intake-2|card-1|asr:saaras:v3');
    await page.getByRole('button', { name: 'Confirm Incident', exact: true }).click();
    await page.getByRole('heading', { name: `Incident Confirmed: ${result.incident.incidentId}` }).waitFor();
    await page.getByRole('button', { name: 'Refresh status in my language' }).click();
    await page.getByTestId('communication-result').waitFor();
    assert.match(await page.getByTestId('communication-result').textContent(), new RegExp(result.incident.incidentId));
    await page.getByLabel('Update language').selectOption('hi');
    assert.equal(await page.getByTestId('communication-result').count(), 0);
    await page.getByRole('button', { name: 'Refresh status in my language' }).click();
    await page.getByTestId('communication-result').waitFor();
    assert.match(await page.getByTestId('communication-result').textContent(), /पुष्टि हुई/);
    const audit = await fetch(`${base}/api/audit?incident=${result.incident.incidentId}`, { headers: { 'x-demo-user': 'AI-BROWSER-TEST', 'x-demo-role': 'Manager' } }).then(r => r.json());
    assert.ok(audit.entries.some(row => row.action === 'INCIDENT_CONFIRMED' && row.modelVersion === result.incident.modelVersion));
  });
  await t.test('trace explanation uses actual stored snapshot and retains its counts', async () => {
    await page.getByRole('button', { name: 'Open Incident Details' }).click();
    await page.getByRole('button', { name: 'Manager local demo role' }).first().click();
    await page.getByTestId('trace-result').waitFor();
    const response = page.waitForResponse(r => r.url().includes('/trace-explanation?') && r.status() === 200);
    await page.getByRole('button', { name: 'Explain this trace' }).click();
    const data = await (await response).json();
    await page.getByTestId('communication-result').waitFor();
    assert.match(await page.getByTestId('communication-result').textContent(), new RegExp(`UNKNOWN: ${data.counts.UNKNOWN}`));
    assert.match(await page.getByTestId('communication-result').textContent(), new RegExp(data.traceId));
    await page.getByRole('button', { name: 'Trace 24 hours', exact: true }).click();
    assert.equal(await page.getByTestId('communication-result').count(), 0);
  });
  await t.test('provider failure retains typed input and permits manual review', async () => {
    failing = true; await reportScreen();
    await page.getByLabel('Original report').fill(raw);
    await page.getByRole('button', { name: 'Structure with AI' }).click();
    await page.getByRole('alert').filter({ hasText: 'Sarvam unavailable' }).waitFor();
    assert.equal(await page.getByLabel('Original report').inputValue(), raw);
    await page.getByRole('button', { name: 'Review Manual Incident Card' }).click();
    await page.getByRole('heading', { name: 'Review Incident Card' }).waitFor();
  });
  await t.test('tool conflict requires an explicit review acknowledgment', async () => {
    failing = false; conflict = true; await reportScreen();
    await page.getByLabel('Original report').fill(raw);
    await page.getByRole('button', { name: 'Structure with AI' }).click();
    await page.getByRole('heading', { name: 'Review Incident Card' }).waitFor();
    await page.getByRole('button', { name: 'Save Incident', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Review the tool conflict' }).waitFor();
    await page.getByRole('checkbox', { name: /I reviewed the conflicting tool/ }).check();
    await page.getByLabel('Card tool ID').fill('TOOL-C');
    assert.equal(await page.getByRole('checkbox', { name: /I reviewed the conflicting tool/ }).isChecked(), false);
  });
  await t.test('evidence search failure leaves manual review available', async () => {
    searchFail = true; await reportScreen();
    await page.getByLabel('Original report').fill(raw);
    await page.getByRole('button', { name: 'Review Manual Incident Card' }).click();
    await page.getByRole('button', { name: 'Find similar records' }).click();
    await page.getByRole('alert').filter({ hasText: 'Search temporarily unavailable' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Save Incident', exact: true }).isEnabled(), true);
  });
  assert.equal(aiCalls, 3); assert.deepEqual(errors, []);
});
