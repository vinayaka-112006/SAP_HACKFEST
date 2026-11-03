#!/usr/bin/env node
// ToolSathi end-to-end demonstration recorder.
//
//   node demo/scripts/record-demo.js                 fresh isolated SQLite + full recording + videos
//   node demo/scripts/record-demo.js --only 06,07    re-record selected chapters against a running app
//   node demo/scripts/record-demo.js --url http://127.0.0.1:5181 --no-render
//
// The recorder starts the real backend (SQLite) and the real Vite frontend, then drives the
// application with Playwright. Each chapter is recorded with the browser's own video capture,
// narrated offline, subtitled and encoded to 1920x1080 MP4.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { fork } = require('node:child_process');
const media = require('./media');
const chapters = require('./chapters');

const ROOT = path.resolve(__dirname, '../..');
const DEMO = path.join(ROOT, 'demo');
const RUNTIME = path.join(DEMO, 'runtime');
const RAW = path.join(RUNTIME, 'raw');
const NARRATION = path.join(RUNTIME, 'narration');
const VIDEO = path.join(DEMO, 'videos');
const CHAPTER_VIDEOS = path.join(VIDEO, 'chapters');
const SHOTS = path.join(DEMO, 'screenshots');
const DOWNLOADS = path.join(RUNTIME, 'downloads');
const STATE_FILE = path.join(RUNTIME, 'state.json');
const EPISODES = path.join(RUNTIME, 'episodes.json');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  return fallback;
};

const BACKEND_PORT = Number(value('backend-port', 4016));
const FRONTEND_PORT = Number(value('frontend-port', 5182));
const EXTERNAL_URL = value('url', '');
const EXTERNAL_API = value('api', '');
const ONLY = (value('only', '') || '').split(',').map((item) => item.trim()).filter(Boolean);
const NO_RENDER = flag('no-render');
const NO_SERVE = Boolean(EXTERNAL_URL);

const children = [];
const results = [];
let state = {};
let sqliteFile = '';
let backendUrl = EXTERNAL_API || `http://127.0.0.1:${BACKEND_PORT}/api`;
let frontendUrl = EXTERNAL_URL || `http://127.0.0.1:${FRONTEND_PORT}`;

const log = (...parts) => console.log('[demo]', ...parts);

function ensureDirs() {
  for (const directory of [DEMO, RUNTIME, RAW, NARRATION, VIDEO, CHAPTER_VIDEOS, SHOTS, DOWNLOADS]) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function loadState() {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    state = {};
  }
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function waitForOutput(child, pattern, timeout = 120000) {
  return new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${pattern}:\n${text.slice(-2000)}`));
    }, timeout);
    const onData = (chunk) => {
      text += chunk.toString();
      const match = pattern.exec(text);
      if (match) {
        cleanup();
        resolve(match);
      }
    };
    const onExit = (code) => {
      cleanup();
      reject(new Error(`Process exited (${code}) while waiting for ${pattern}:\n${text.slice(-2000)}`));
    };
    function cleanup() {
      clearTimeout(timer);
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
      child.off('exit', onExit);
    }
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', onExit);
  });
}

function httpGet(url, json = true) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 4000 }, (response) => {
      let text = '';
      response.on('data', (chunk) => (text += chunk));
      response.on('end', () => {
        if (response.statusCode >= 400) return reject(new Error(`${url} returned ${response.statusCode}`));
        if (!json) return resolve(text);
        try {
          resolve(JSON.parse(text));
        } catch {
          reject(new Error(`${url} returned non-JSON (${response.statusCode})`));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}

async function waitHttp(url, timeout = 90000, json = true) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      return await httpGet(url, json);
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Service did not answer ${url}: ${last?.message}`);
}

async function startServices() {
  if (NO_SERVE) {
    log(`using running application at ${frontendUrl} (api ${backendUrl})`);
    await waitHttp(`${backendUrl}/health`, 30000);
    await waitHttp(`${frontendUrl}/`, 30000, false);
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  sqliteFile = path.join(ROOT, 'backup', `demo-run-${stamp}.sqlite`);
  fs.mkdirSync(path.dirname(sqliteFile), { recursive: true });
  log(`isolated SQLite database: ${sqliteFile}`);
  const backend = fork(path.join(ROOT, 'backend/srv/server.js'), ['--database=sqlite'], {
    cwd: path.join(ROOT, 'backend'),
    silent: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      CDS_ENV: 'development',
      DATABASE_MODE: 'sqlite',
      AUTH_MODE: 'header',
      ENFORCE_APPROVALS: 'true',
      ALLOW_UNAPPROVED_MOCKS: 'false',
      V2_WORKFLOW_ENABLED: 'true',
      V22_WORKFLOW_ENABLED: 'true',
      V22_SYNTHETIC_FIXTURES: 'true',
      V2_SYNTHETIC_FIXTURES: 'false',
      SQLITE_FILE: sqliteFile,
      CDS_REQUIRES_DB_CREDENTIALS_URL: sqliteFile,
      PORT: String(BACKEND_PORT),
      CORS_ORIGINS: `http://127.0.0.1:${FRONTEND_PORT},http://localhost:${FRONTEND_PORT}`,
    },
  });
  children.push({ child: backend, role: 'backend' });
  backend.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (/error|Error/.test(text)) process.stderr.write(`[backend] ${text}`);
  });
  await waitForOutput(backend, /ToolSathi SIMULATED: (http:\/\/[^\s]+)/, 180000);
  backendUrl = `http://127.0.0.1:${BACKEND_PORT}/api`;
  await waitHttp(`${backendUrl}/health`, 60000);

  const vite = fork(path.join(ROOT, 'frontend/node_modules/vite/bin/vite.js'), [
    '--host', '127.0.0.1', '--port', String(FRONTEND_PORT), '--strictPort',
  ], {
    cwd: path.join(ROOT, 'frontend'),
    silent: true,
    env: {
      ...process.env,
      NO_COLOR: '1',
      FORCE_COLOR: '0',
      VITE_API_BASE_URL: '/api',
      VITE_DEMO_AUTH: 'true',
      VITE_AI_ENABLED: 'true',
      API_PROXY_TARGET: `http://127.0.0.1:${BACKEND_PORT}`,
      TOOLSATHI_VITE_CACHE_DIR: path.join(ROOT, 'frontend', 'node_modules', '.vite-demo'),
    },
  });
  children.push({ child: vite, role: 'frontend' });
  await waitForOutput(vite, /Local:\s+(https?:\/\/[^\s]+)/, 120000);
  frontendUrl = `http://127.0.0.1:${FRONTEND_PORT}`;
  await waitHttp(`${frontendUrl}/`, 60000, false);
  log(`application ready: ${frontendUrl}`);
}

async function stopServices() {
  await Promise.all(children.map(({ child, role }) => new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => {
      child.kill();
      resolve();
    }, 8000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    if (role === 'backend' && child.connected) child.send({ type: 'toolsathi:shutdown' });
    else child.kill();
  })));
}

function apiClient() {
  return async (user, role, endpoint, options = {}) => {
    const response = await fetch(backendUrl + endpoint, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'x-demo-user': user,
        'x-demo-role': role,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`${endpoint} returned ${response.status} ${text.slice(0, 200)}`);
    }
    if (!response.ok) {
      const error = new Error(parsed?.error?.message || `${endpoint} failed (${response.status})`);
      error.code = parsed?.error?.code;
      error.status = response.status;
      throw error;
    }
    return parsed;
  };
}

function browserOptions() {
  const candidates = [
    process.env.BROWSER_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  const executablePath = candidates.find((file) => fs.existsSync(file));
  return { headless: true, ...(executablePath ? { executablePath } : {}) };
}

async function recordChapter(browser, chapter, api) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: RAW, size: { width: 1600, height: 900 } },
    acceptDownloads: true,
  });
  const identity = chapter.identity;
  // Seed the chapter identity once per tab. Re-seeding on every navigation would undo the
  // in-app sign-out/sign-in flow that some chapters demonstrate.
  await context.addInitScript(([role, user, language]) => {
    if (!sessionStorage.getItem('toolsathi.demoSeeded')) {
      sessionStorage.setItem('toolsathi.demoRole', role);
      sessionStorage.setItem('toolsathi.demoUser', user);
      sessionStorage.setItem('toolsathi.demoSeeded', '1');
    }
    localStorage.setItem('toolsathi.language', language);
  }, [identity.role, identity.user, identity.language]);

  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const checks = [];
  const downloadDir = path.join(DOWNLOADS, chapter.id);
  fs.mkdirSync(downloadDir, { recursive: true });
  const ctx = {
    url: frontendUrl,
    state,
    downloadDir,
    log: (...parts) => log(`  ${chapter.id}`, ...parts),
    check(name, ok, detail = '') {
      checks.push({ name, status: ok ? 'PASSED' : 'FAILED', detail: String(detail ?? '') });
      if (!ok) log(`  CHECK FAILED: ${name} ${detail}`);
    },
    api,
    issue: (user, role, incidentId) => api(user, role, `/v2/issues/${encodeURIComponent(incidentId)}`),
  };

  const started = Date.now();
  let failure = '';
  try {
    await chapter.run(page, ctx);
  } catch (error) {
    failure = error.message;
    log(`  CHAPTER ERROR ${chapter.id} at ${page.url()}: ${error.message.split('\n')[0]}`);
    await page.screenshot({ path: path.join(SHOTS, `${chapter.id}-failure.png`), fullPage: false }).catch(() => {});
  }
  await page.screenshot({ path: path.join(SHOTS, `${chapter.id}.png`), fullPage: false }).catch(() => {});
  const video = page.video();
  await context.close();
  let rawVideo = '';
  if (video) {
    const produced = await video.path().catch(() => '');
    if (produced && fs.existsSync(produced)) {
      rawVideo = path.join(RAW, `${chapter.id}.webm`);
      for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
          fs.renameSync(produced, rawVideo);
          break;
        } catch (error) {
          if (attempt === 11) throw error;
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }
  }
  saveState();
  return {
    id: chapter.id,
    number: chapter.number,
    title: chapter.title,
    identity,
    narration: chapter.narration,
    checks,
    failure,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
    rawVideo,
    screenshot: path.join(SHOTS, `${chapter.id}.png`),
    recordedSeconds: Math.round((Date.now() - started) / 100) / 10,
    state: { ...state },
  };
}

// ------------------------------------------------------------ verification ----

async function verifyFunctional(api, sqliteFile) {
  const findings = [];
  const add = (name, ok, detail = '') => findings.push({ name, status: ok ? 'PASSED' : 'FAILED', detail: String(detail ?? '') });
  const incidentId = state.incidentId;
  if (!incidentId) {
    add('incident created during the recording', false, 'no incident id captured');
    return findings;
  }
  const managerIssue = await api('V22-20261103-MANAGER-01', 'Manager', `/v2/issues/${encodeURIComponent(incidentId)}`);
  const workerIssue = await api('V22-20261103-WORKER-01', 'Worker', `/v2/issues/${encodeURIComponent(incidentId)}`);
  add('worker identity matches the stored reporter', workerIssue.issue.reporterId === 'V22-20261103-WORKER-01', workerIssue.issue.reporterId);
  add('manager reads the same incident record', managerIssue.issue.incidentId === incidentId);
  add('incident reached the Closed state', managerIssue.issue.status === 'Closed', managerIssue.issue.status);
  add('work order belongs to the assigned technician', managerIssue.issue.workOrder?.technicianId === 'V22-20261103-TECH-01', managerIssue.issue.workOrder?.technicianId);
  add('work order closed after independent verification', managerIssue.issue.workOrder?.status === 'Closed', managerIssue.issue.workOrder?.status);
  add('incident carries a reviewed severity and urgency', Boolean(managerIssue.issue.severity) && Boolean(managerIssue.issue.urgency), `${managerIssue.issue.severity}/${managerIssue.issue.urgency}`);
  const timeline = managerIssue.timeline || [];
  const actions = new Set(timeline.map((entry) => entry.action));
  for (const action of ['INCIDENT_CONFIRMED', 'INCIDENT_TRIAGED', 'TECHNICIAN_ASSIGNED', 'REPAIR_COMPLETED', 'TOOL_RETURN_TO_SERVICE_VERIFIED', 'INCIDENT_CLOSED']) {
    add(`audit action ${action} recorded`, actions.has(action), [...actions].slice(0, 12).join(','));
  }
  const notifications = await api('V22-20261103-MANAGER-01', 'Manager', '/v2/notifications');
  add('notifications generated from workflow events', (notifications.notifications || []).some((row) => row.incidentId === incidentId), `${(notifications.notifications || []).length} records`);
  const trace = await api('V22-20261103-MANAGER-01', 'Manager', `/incidents/${encodeURIComponent(incidentId)}/trace?window=72`);
  add('lifecycle trace computed by the deterministic engine', Number.isFinite(trace.summary?.totalUnits), `${trace.summary?.totalUnits} units`);
  const report = await api('V22-20261103-QUALITY', 'Quality', `/v2/incidents/${encodeURIComponent(incidentId)}/exposure-reports`, { method: 'POST', body: { window: 72, filters: {} } }).catch((error) => ({ error: error.message }));
  add('stored exposure snapshot created for the incident', Boolean(report.report?.reportId), report.report?.reportId || report.error);
  const tool = await api('V22-20261103-MANAGER-01', 'Manager', '/tools');
  const record = tool.tools.find((row) => row.toolId === 'V22-20261103-TOOL-1');
  add('equipment returned to service after verification', record?.state === 'Active', record?.state);
  if (sqliteFile && fs.existsSync(sqliteFile)) {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(sqliteFile, { readOnly: true });
    const incident = db.prepare('select incidentId,state,reporterId from toolsathi_Incident where incidentId=?').get(incidentId);
    add('incident row persisted in SQLite', Boolean(incident), JSON.stringify(incident));
    const audit = db.prepare('select count(*) c from toolsathi_AuditLog where incidentId=?').get(incidentId);
    add('audit rows persisted in SQLite', audit.c >= 6, `${audit.c} rows`);
    const work = db.prepare('select workOrderId,technicianId,status from toolsathi_RepairWorkOrder where incidentId=?').get(incidentId);
    add('work order persisted in SQLite', Boolean(work), JSON.stringify(work));
    const repair = db.prepare('select repairId,verifiedBy,testReadings from toolsathi_RepairLog where incidentId=?').get(incidentId);
    add('verified repair evidence persisted in SQLite', Boolean(repair?.verifiedBy), repair?.repairId);
    const assignments = db.prepare('select count(*) c from toolsathi_TemporaryAssignment where incidentId=?').get(incidentId);
    add('workforce assignment persisted in SQLite', assignments.c >= 1, `${assignments.c} rows`);
    const docs = db.prepare('select count(*) c from toolsathi_ExposureReport').get();
    add('exposure report snapshot persisted in SQLite', docs.c >= 1, `${docs.c} reports`);
    db.close();
  }
  return findings;
}

// ------------------------------------------------------------------ outputs ----

function writeNarration(chaptersWithMedia) {
  const lines = ['# ToolSathi demonstration narration', '', 'Offline Windows speech synthesis, one cue per sentence. The same text is burned into the videos as subtitles.', ''];
  for (const chapter of chaptersWithMedia) {
    lines.push(`## ${chapter.number} · ${chapter.title}`, '');
    lines.push(`File: \`videos/chapters/${chapter.id}.mp4\` · narration ${chapter.narrationDuration?.toFixed(1)}s · video ${chapter.duration?.toFixed(1)}s`, '');
    chapter.narration.forEach((sentence) => lines.push(`- ${sentence}`));
    lines.push('');
  }
  fs.writeFileSync(path.join(DEMO, 'ToolSathi_Narration.md'), lines.join('\n'));
}

function writeChapters(chaptersWithMedia, full, highlight) {
  const rows = chaptersWithMedia
    .map((chapter) => `| ${chapter.number} | ${chapter.title} | ${chapter.identity.role} | ${chapter.duration?.toFixed(1)}s | \`chapters/${chapter.id}.mp4\` |`)
    .join('\n');
  const text = `# ToolSathi demonstration chapters

Full walkthrough: \`videos/ToolSathi_Full_Walkthrough.mp4\` (${full?.duration?.toFixed(1)}s)
Hackathon highlight: \`videos/ToolSathi_Hackathon_Demo.mp4\` (${highlight?.duration?.toFixed(1)}s)

| # | Chapter | Signed-in role | Duration | File |
|---|---------|----------------|----------|------|
${rows}

## Presentation order

The full walkthrough plays chapters 01–13, then **16 (workforce continuity)**, then 14 (independent
verification) and 15 (closure), then 17–23. Workforce allocation is demonstrated while the machine is
still recorded as unavailable: the verifier's return-to-service action ends the downtime, so an
allocation recorded afterwards would not be realistic. Chapter file numbers keep the numbering of the
production plan; the concatenation order reflects the real workflow.

## Recorded scenario

- Worker identity: \`V22-20261103-WORKER-01\` (work center \`V22-20261103-WC-1\`)
- Equipment: \`V22-20261103-TOOL-1\`
- Manager: \`V22-20261103-MANAGER-01\` · Technician: \`V22-20261103-TECH-01\` · Verifier: \`V22-20261103-VERIFIER-01\`
- Quality reviewer: \`V22-20261103-QUALITY\` · Administrator: \`V22-20261103-ADMIN\`
- Onboarding applicant: \`DEMO-APPLICANT-01\` (no profile until the administrator approves the application)
- Lifecycle incident: \`${state.incidentId || 'not recorded'}\`
- Reference traceability record: \`TS-0001\` (seeded legacy dataset with recorded production, batches and shipments)
`;
  fs.writeFileSync(path.join(DEMO, 'ToolSathi_Demo_Chapters.md'), text);
}

function writeVerification(chaptersWithMedia, functional) {
  const videoChecks = [];
  const add = (name, ok, detail = '') => videoChecks.push({ name, status: ok ? 'PASSED' : 'FAILED', detail });
  const chapterCheck = (id) => chaptersWithMedia.find((chapter) => chapter.id === id);
  add('full walkthrough file exists', fs.existsSync(path.join(VIDEO, 'ToolSathi_Full_Walkthrough.mp4')));
  add('highlight file exists', fs.existsSync(path.join(VIDEO, 'ToolSathi_Hackathon_Demo.mp4')));
  add('every chapter rendered at 1920x1080', chaptersWithMedia.every((chapter) => chapter.width === 1920 && chapter.height === 1080));
  add('every chapter has an audio stream', chaptersWithMedia.every((chapter) => chapter.hasAudio));
  add('narration length matches the rendered chapter length', chaptersWithMedia.every((chapter) => Math.abs(chapter.duration - chapter.targetDuration) < 0.5));
  add('subtitles embedded in every chapter', chaptersWithMedia.filter((chapter) => chapter.narrationAudio).every((chapter) => chapter.cues?.length > 0));
  add('registration approved and profile created', chapterCheck('02-registration')?.checks?.some((check) => check.name.includes('creates the profile') && check.status === 'PASSED'));
  add('voice conversation created the incident', Boolean(state.incidentId));
  add('exposure downloads captured', (state.downloads || []).length > 0, (state.downloads || []).join(', '));

  const rows = (list) => list.map((item) => `| ${item.status === 'PASSED' ? 'PASS' : 'FAIL'} | ${item.name} | ${String(item.detail || '').replace(/\|/g, '/').slice(0, 120)} |`).join('\n');
  const chapterRows = chaptersWithMedia.map((chapter) => `| ${chapter.number} | ${chapter.title} | ${chapter.failure ? 'ERROR' : chapter.checks.every((check) => check.status === 'PASSED') ? 'PASS' : 'CHECK FAILED'} | ${chapter.checks.filter((check) => check.status === 'PASSED').length}/${chapter.checks.length} | ${chapter.failure ? chapter.failure.split('\n')[0].slice(0, 90) : ''} |`).join('\n');

  const text = `# ToolSathi demonstration verification

Recorded ${new Date().toISOString()} · application branch \`feature/toolsathi-v2-core\` · isolated SQLite demo database
${sqliteFile ? `\`${path.relative(ROOT, sqliteFile)}\`` : 'reused an already running instance'}

## Functional checks against the running application

| Result | Check | Observed |
|--------|-------|----------|
${rows(functional)}

## Video checks

| Result | Check | Observed |
|--------|-------|----------|
${rows(videoChecks)}

## Chapter results

| # | Chapter | Result | Checks | Error |
|---|---------|--------|--------|-------|
${chapterRows}

## Limitations and honest exclusions

- No physical microphone was used. The multilingual voice chapter drives the transcript through the
  agent's review textarea, and Sarvam speech synthesis is requested by the application for the
  question read-back. Speech *recognition* from a microphone is therefore not demonstrated.
- No camera QR scanner is attached: the QR payload is entered as text and validated against the live
  register, exactly as the application documents.
- SAP S/4HANA and Digital Manufacturing calls are simulated by design and labelled SIMULATED in the
  interface and in the API responses. SAP HANA was not connected, queried or migrated.
- The lifecycle incident is attached to synthetic equipment with no production history, so its trace
  correctly returns zero associated units. The non-zero traceability demonstration uses the seeded
  reference incident TS-0001, which does have recorded production, batches, stock and shipments.
- Narration is generated offline with Windows speech synthesis; it is not the Sarvam voice used
  inside the application.
`;
  fs.writeFileSync(path.join(DEMO, 'ToolSathi_Feature_Verification.md'), text);
  return { videoChecks, chapterRows };
}

function writeManifest(chaptersWithMedia, functional, videos) {
  const manifest = {
    product: 'ToolSathi',
    version: '2.3',
    branch: 'feature/toolsathi-v2-core',
    recordedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      node: process.version,
      frontend: 'React + Vite (real dev server)',
      backend: 'SAP CAP + Express',
      database: sqliteFile ? path.relative(ROOT, sqliteFile) : 'external instance',
      ai: 'Groq (reasoning) and Sarvam (speech) as configured in backend/.env',
      hana: 'not connected',
    },
    recording: {
      method: 'Playwright browser automation with native video capture, one context per chapter',
      browser: 'Google Chrome (Playwright, headless)',
      viewport: '1600x900 captured, encoded to 1920x1080',
      narration: 'Windows SAPI offline speech synthesis, one WAV per sentence',
      subtitles: 'Generated ASS cues burned into each chapter',
    },
    scenario: {
      incidentId: state.incidentId || null,
      equipment: 'V22-20261103-TOOL-1',
      identities: chapters[0]?.identity ? {
        worker: 'V22-20261103-WORKER-01',
        manager: 'V22-20261103-MANAGER-01',
        technician: 'V22-20261103-TECH-01',
        verifier: 'V22-20261103-VERIFIER-01',
        quality: 'V22-20261103-QUALITY',
        administrator: 'V22-20261103-ADMIN',
        applicant: 'DEMO-APPLICANT-01',
      } : {},
      workforceIncident: state.incidentId || null,
      referenceTraceIncident: 'TS-0001',
      downloads: state.downloads || [],
    },
    videos: videos.map((video) => ({
      file: path.relative(DEMO, video.file),
      durationSeconds: Number(video.duration.toFixed(2)),
      width: video.width,
      height: video.height,
      videoCodec: video.videoCodec,
      audioCodec: video.audioCodec,
      sizeBytes: video.size,
      sha256: video.sha256,
    })),
    chapters: chaptersWithMedia.map((chapter) => ({
      number: chapter.number,
      id: chapter.id,
      title: chapter.title,
      role: chapter.identity.role,
      identity: chapter.identity.user,
      file: `videos/chapters/${chapter.id}.mp4`,
      durationSeconds: Number((chapter.duration || 0).toFixed(2)),
      narrationSeconds: Number((chapter.narrationDuration || 0).toFixed(2)),
      subtitleCues: chapter.cues?.length || 0,
      checks: chapter.checks,
      error: chapter.failure || null,
    })),
    functionalChecks: functional,
    knownLimitations: [
      'No physical microphone or camera scanner is attached to the recording machine.',
      'SAP S/4HANA and Digital Manufacturing integrations are simulated and labelled.',
      'Lifecycle equipment has no production history; the non-zero trace uses the seeded TS-0001 record.',
      'Narration uses offline speech synthesis rather than the in-app Sarvam voice.',
    ],
  };
  fs.writeFileSync(path.join(DEMO, 'ToolSathi_Recording_Manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function writeDemoGuide(full, highlight) {
  const guide = `# ToolSathi demonstration package

Everything in this folder was produced by driving the real application: React + Vite frontend,
SAP CAP/Express backend and a persistent SQLite database. No screenshot mock-ups and no fabricated
API responses are used.

## Start the application

\`\`\`bash
# from the repository root
npm run dev:v22        # persistent SQLite at backend/db.sqlite, API :4004, UI :5173
\`\`\`

The demonstration used an **isolated** database so the recording never touched the development
database:

\`\`\`bash
cd backend
SQLITE_FILE="$PWD/../backup/demo-run.sqlite" \\
CDS_REQUIRES_DB_CREDENTIALS_URL="$PWD/../backup/demo-run.sqlite" \\
DATABASE_MODE=sqlite AUTH_MODE=header V2_WORKFLOW_ENABLED=true V22_WORKFLOW_ENABLED=true \\
V22_SYNTHETIC_FIXTURES=true V2_SYNTHETIC_FIXTURES=false PORT=4016 node srv/server.js --database=sqlite
\`\`\`

On first start the backend deploys the reviewed schema, seeds the legacy tool/batch/shipment dataset
and applies the versioned V2.2 synthetic scenario exactly once. Production, exposure and workforce
records come from that seed; the demo incident itself is created live during the recording.

## Synthetic identities used in the recording

| Role | Identity | Notes |
|------|----------|-------|
| Worker | \`V22-20261103-WORKER-01\` | Reports the fault in Kannada |
| Manager | \`V22-20261103-MANAGER-01\` | Authority for \`V22-20261103-WC-1\` and \`WC-2\` |
| Technician | \`V22-20261103-TECH-01\` | Qualified for equipment type \`V22-20261103-TYPE-1\` |
| Verifier | \`V22-20261103-VERIFIER-01\` | Independent verification capability |
| Quality | \`V22-20261103-QUALITY\` | Unrestricted quality scope, exposure review |
| Administrator | \`V22-20261103-ADMIN\` | Onboarding review and scoped grants |
| Applicant | \`DEMO-APPLICANT-01\` | No profile until the application is approved |

Sign in at \`/login\` in development mode: the account picker lists the seeded synthetic identities.
Selecting an identity never grants a role on its own — every request is authorised server-side.

## Recorded scenario

1. \`DEMO-APPLICANT-01\` registers, requests Technician, declares a skill and is approved by the administrator.
2. \`V22-20261103-WORKER-01\` identifies \`V22-20261103-TOOL-1\` by QR payload and reports abnormal spindle vibration in Kannada through the AI interview.
3. The manager triages the incident, raises and approves a tool restriction, then executes the simulated restriction.
4. Duplicate candidates are reviewed by a human; a qualified technician is assigned from the eligibility list.
5. The technician reserves a spare part, requests grounded guidance, records the repair and submits inspection readings.
6. A bounded workforce plan moves idle operators to a station with real demand.
7. The manager reviews completion; the verifier independently returns the machine to service; the manager closes the incident.
8. Exposure tracing, the evidence downloads, the assistant, notifications and localisation close the walkthrough.

The workforce chapter is presented between repair completion (13) and verification (14) because the
verifier's action ends the recorded downtime.

## Reproduce or re-record

\`\`\`bash
node demo/scripts/record-demo.js                     # fresh isolated SQLite, full recording, both videos
node demo/scripts/record-demo.js --only 06,07        # re-record selected chapters against a running app
node demo/scripts/record-demo.js --url http://127.0.0.1:5181 --api http://127.0.0.1:4014/api --no-render
\`\`\`

Requirements: Node 24, Google Chrome or Edge, ffmpeg on \`PATH\`, and PowerShell for offline narration.
The recorder writes raw browser captures to \`demo/runtime/raw\`, downloads to \`demo/runtime/downloads\`,
per-chapter screenshots to \`demo/screenshots\` and the finished videos to \`demo/videos\`.

## Outputs

| File | Contents |
|------|----------|
| \`videos/ToolSathi_Full_Walkthrough.mp4\` | ${full ? `${(full.duration / 60).toFixed(1)} min end-to-end walkthrough` : 'end-to-end walkthrough'} |
| \`videos/ToolSathi_Hackathon_Demo.mp4\` | ${highlight ? `${(highlight.duration / 60).toFixed(1)} min highlight` : 'highlight'} |
| \`videos/chapters/*.mp4\` | Individual narrated chapters |
| \`videos/chapters/*.srt\` | Subtitle sidecars |
| \`ToolSathi_Narration.md\` | Full narration script and timings |
| \`ToolSathi_Demo_Chapters.md\` | Chapter list and scenario details |
| \`ToolSathi_Feature_Verification.md\` | Functional and video verification results |
| \`ToolSathi_Recording_Manifest.json\` | Machine-readable manifest of every artefact |
| \`screenshots/*.png\` | Final frame of every chapter |
`;
  fs.writeFileSync(path.join(DEMO, 'README.md'), guide);
}

function sha256(file) {
  return require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function describeVideo(file) {
  const info = media.probe(file);
  return {
    file,
    duration: info.duration,
    size: info.size,
    width: info.video?.width,
    height: info.video?.height,
    videoCodec: info.video?.codec_name,
    audioCodec: info.audio?.codec_name,
    hasAudio: Boolean(info.audio),
    sha256: sha256(file),
  };
}

// ---------------------------------------------------------------------- main ----

async function main() {
  ensureDirs();
  loadState();
  const selected = chapters.filter((chapter) => !ONLY.length || ONLY.includes(chapter.number) || ONLY.includes(chapter.id));
  if (!selected.length) throw new Error('No chapter matched --only');
  log(`${selected.length} chapter(s) selected`);
  await startServices();

  const { chromium } = require(path.join(ROOT, 'frontend/node_modules/playwright'));
  const browser = await chromium.launch(browserOptions());
  const api = apiClient();
  const episodes = [];
  let functional = [];
  try {
    for (const chapter of selected) {
      log(`recording ${chapter.number} ${chapter.title}`);
      const episode = await recordChapter(browser, chapter, api);
      episodes.push(episode);
      results.push(episode);
      fs.writeFileSync(EPISODES, JSON.stringify(episodes, null, 2));
    }
    if (!ONLY.length) {
      log('verifying persisted state against the running API and SQLite');
      functional = await verifyFunctional(api, sqliteFile);
    }
  } finally {
    await browser.close().catch(() => {});
    await stopServices();
  }

  if (NO_RENDER) {
    log('recording complete (render skipped)');
    return;
  }

  // Merge with any previously rendered chapters so a partial re-record can be re-assembled.
  const allEpisodes = new Map();
  for (const episode of episodes) allEpisodes.set(episode.id, episode);
  if (ONLY.length) {
    // keep earlier artefacts for chapters that were not re-recorded
    for (const chapter of chapters) {
      if (allEpisodes.has(chapter.id)) continue;
      const file = path.join(CHAPTER_VIDEOS, `${chapter.id}.mp4`);
      if (fs.existsSync(file)) allEpisodes.set(chapter.id, { ...chapter, renderedFile: file, checks: [], state: {} });
    }
  }

  log('generating narration');
  const toRender = [...allEpisodes.values()].filter((episode) => episode.rawVideo && fs.existsSync(episode.rawVideo));
  media.narrate(toRender, NARRATION);

  log('rendering chapters');
  for (const chapter of toRender) {
    const out = path.join(CHAPTER_VIDEOS, `${chapter.id}.mp4`);
    const info = media.renderChapter(chapter, chapter.rawVideo, out, NARRATION);
    chapter.renderedFile = out;
    chapter.duration = info.duration;
    chapter.width = info.video?.width;
    chapter.height = info.video?.height;
    chapter.hasAudio = Boolean(info.audio);
    chapter.size = info.size;
    fs.writeFileSync(path.join(CHAPTER_VIDEOS, `${chapter.id}.srt`), media.srtFromCues(chapter));
    media.thumbnail(out, path.join(SHOTS, `${chapter.id}-frame.jpg`), Math.min(4, Math.max(1, chapter.duration / 3)), NARRATION);
    log(`  ${chapter.id} ${info.duration.toFixed(1)}s`);
  }

  const ordered = chapters.map((chapter) => allEpisodes.get(chapter.id)).filter(Boolean);
  const presentation = ordered
    .slice()
    .sort((left, right) => {
      const order = (chapter) => {
        const number = Number(chapter.number);
        // workforce continuity is shown before verification, which ends the downtime
        return number === 16 ? 13.5 : number;
      };
      return order(left) - order(right);
    })
    .filter((chapter) => chapter.renderedFile);

  const fullFile = path.join(VIDEO, 'ToolSathi_Full_Walkthrough.mp4');
  log('concatenating the full walkthrough');
  media.concat(presentation.map((chapter) => chapter.renderedFile), fullFile, NARRATION);
  const full = describeVideo(fullFile);
  media.thumbnail(fullFile, path.join(VIDEO, 'ToolSathi_Full_Walkthrough.jpg'), 6, NARRATION);

  const highlightOrder = ['01', '06', '08', '10', '13', '14', '17', '23'];
  const highlightChapters = presentation.filter((chapter) => highlightOrder.includes(chapter.number));
  const highlightClips = [];
  for (const chapter of highlightChapters) {
    highlightClips.push(chapter.renderedFile);
  }
  const highlightFile = path.join(VIDEO, 'ToolSathi_Hackathon_Demo.mp4');
  log('concatenating the hackathon highlight');
  media.concat(highlightClips, highlightFile, NARRATION);
  const highlight = describeVideo(highlightFile);
  media.thumbnail(highlightFile, path.join(VIDEO, 'ToolSathi_Hackathon_Demo.jpg'), 4, NARRATION);

  writeNarration(ordered);
  writeChapters(ordered, full, highlight);
  const verification = writeVerification(ordered, functional);
  writeManifest(ordered, functional, [full, highlight]);
  writeDemoGuide(full, highlight);

  log('');
  log('================ DEMONSTRATION COMPLETE ================');
  log(`full walkthrough : ${fullFile} (${(full.duration / 60).toFixed(1)} min, ${full.width}x${full.height}, ${full.videoCodec}/${full.audioCodec})`);
  log(`highlight        : ${highlightFile} (${(highlight.duration / 60).toFixed(1)} min)`);
  log(`chapters         : ${ordered.length}`);
  log(`video checks     : ${verification.videoChecks.filter((check) => check.status === 'PASSED').length}/${verification.videoChecks.length} passed`);
  log(`functional checks: ${functional.filter((check) => check.status === 'PASSED').length}/${functional.length} passed`);
  const failures = functional.filter((check) => check.status !== 'PASSED');
  failures.forEach((check) => log(`  FUNCTIONAL FAILURE: ${check.name} (${check.detail})`));
  const chapterFailures = ordered.filter((chapter) => chapter.failure || chapter.checks.some((check) => check.status !== 'PASSED'));
  chapterFailures.forEach((chapter) => log(`  CHAPTER ISSUE: ${chapter.id} ${chapter.failure || chapter.checks.filter((c) => c.status !== 'PASSED').map((c) => c.name).join(', ')}`));
}

main().catch(async (error) => {
  console.error('[demo] FAILED:', error.message);
  await stopServices();
  process.exitCode = 1;
});
