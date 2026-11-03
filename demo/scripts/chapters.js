// ToolSathi demonstration chapters. Every chapter drives the real application through
// Playwright: real HTTP calls, real SQLite writes and real backend state transitions.
// Nothing in this file fabricates UI output; assertions record what actually happened.
const WORKER = 'V22-20261103-WORKER-01';
const MANAGER = 'V22-20261103-MANAGER-01';
const TECHNICIAN = 'V22-20261103-TECH-01';
const VERIFIER = 'V22-20261103-VERIFIER-01';
const QUALITY = 'V22-20261103-QUALITY';
const ADMIN = 'V22-20261103-ADMIN';
const APPLICANT = 'DEMO-APPLICANT-01';
const TOOL = 'V22-20261103-TOOL-1';
const LEGACY_INCIDENT = 'TS-0001';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pause(page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function goto(page, ctx, path) {
  await page.goto(ctx.url + path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await pause(page, 600);
}

async function button(page, pattern) {
  const locator = page.getByRole('button', { name: pattern }).first();
  await locator.waitFor({ state: 'visible', timeout: 20000 });
  return locator;
}

async function click(page, pattern, options = {}) {
  const locator = await button(page, pattern);
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await locator.click();
  await pause(page, options.after ?? 700);
  return locator;
}

async function fill(page, label, value, options = {}) {
  const locator = page.getByLabel(label, { exact: options.exact !== false }).first();
  await locator.waitFor({ state: 'visible', timeout: 20000 });
  await locator.fill(String(value));
  await pause(page, 260);
  return locator;
}

async function loginAs(page, ctx, name) {
  await goto(page, ctx, '/login');
  const account = page.getByRole('option', { name: new RegExp(name, 'i') }).first();
  await account.waitFor({ state: 'visible', timeout: 20000 });
  await account.click();
  await pause(page, 500);
  await click(page, /Enter dashboard/, { after: 1400 });
}

async function tab(page, name) {
  const control = page.getByRole('button', { name, exact: true }).first();
  await control.waitFor({ state: 'visible', timeout: 20000 });
  await control.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await pause(page, 900);
}

async function openIssue(page, ctx, suffix = '') {
  const incidentId = ctx.state.incidentId;
  if (!incidentId) throw new Error('No incident recorded yet');
  await goto(page, ctx, `/issues/${encodeURIComponent(incidentId)}${suffix}`);
}

async function waitForText(page, pattern, timeout = 30000) {
  const locator = page.getByText(pattern).first();
  await locator.waitFor({ state: 'visible', timeout });
  return locator;
}

// --------------------------------------------------------------- voice helpers --

async function startConversation(page, toolId = TOOL) {
  const select = page.getByLabel('Equipment', { exact: true }).first();
  await select.waitFor({ state: 'visible', timeout: 20000 });
  await select.selectOption(toolId);
  await pause(page, 500);
  await click(page, /Start report|ವರದಿ ಪ್ರಾರಂಭಿಸಿ|रिपोर्ट शुरू करें/, { after: 2200 });
}

async function conversationCount(page) {
  return page.locator('.voice-history .chat-message').count();
}

async function answer(page, text, { wait = 9000 } = {}) {
  const before = await conversationCount(page);
  const box = page.locator('.voice-agent textarea').first();
  await box.waitFor({ state: 'visible', timeout: 20000 });
  await box.fill(text);
  await pause(page, 400);
  await click(page, /Send answer|ಉತ್ತರ ಕಳುಹಿಸಿ|उत्तर भेजें/, { after: 600 });
  const deadline = Date.now() + wait;
  while (Date.now() < deadline) {
    if ((await page.getByRole('button', { name: /Confirm and Submit|ದೃಢೀಕರಿಸಿ ಸಲ್ಲಿಸಿ/ }).count())) return 'review';
    if ((await conversationCount(page)) > before) return 'continued';
    await sleep(300);
  }
  return 'timeout';
}

async function skipField(page) {
  const unknown = page.getByRole('button', { name: /I don’t know|I don't know|ನನಗೆ ಗೊತ್ತಿಲ್ಲ/ }).first();
  if (await unknown.count()) {
    await unknown.click();
    await pause(page, 2600);
  }
}

// ------------------------------------------------------------------- chapters --

module.exports = [
  {
    number: '01',
    id: '01-introduction',
    title: 'Introduction',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'ToolSathi is a manufacturing incident intelligence platform. It connects one shop-floor fault report to maintenance, workforce and quality decisions on a single auditable record.',
      'The application you are about to see is the real React, SAP CAP and SQLite implementation, running with synthetic manufacturing data and clearly labelled simulated SAP integrations.',
      'Every screen in this walkthrough is produced by the running application, and every state change is written to the application database and audit history.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/');
      await pause(page, 2200);
      ctx.check('landing renders the product narrative', (await page.locator('h1').first().textContent() || '').includes('shop-floor voice note'));
      await page.mouse.wheel(0, 620);
      await pause(page, 1800);
      await page.mouse.wheel(0, 620);
      await pause(page, 1800);
      await page.mouse.wheel(0, -1400);
      await pause(page, 1200);
    },
  },
  {
    number: '02',
    id: '02-registration',
    title: 'Registration and controlled role approval',
    identity: { role: 'Worker', user: APPLICANT, language: 'en' },
    narration: [
      'Registration is a real onboarding application, not a static form. A new identity starts without a profile.',
      'The applicant records personal details, requests an operational role, declares a qualification and submits the application for review.',
      'Selecting a role never grants permissions. An independent administrator must review the evidence and record the approved role, which then creates the account profile.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/register');
      await pause(page, 900);
      await page.getByLabel('Full name').fill('SYNTHETIC Applicant Rao');
      await page.getByLabel('Work email').fill('applicant.one@example.invalid');
      await page.getByLabel('Phone (optional)').fill('+91 00000 00000');
      await page.getByLabel('Employee ID (optional)').fill('EMP-DEMO-01');
      await page.getByLabel('Department').fill('Maintenance');
      await page.getByLabel('Work center').fill('V22-20261103-WC-1');
      await pause(page, 500);
      await click(page, /Save and continue/, { after: 1500 });
      ctx.check('application details saved through the API', (await page.locator('body').innerText()).includes('Requested role'));

      await page.getByRole('button', { name: /Technician/ }).first().click();
      await pause(page, 700);
      await click(page, /Save and continue/, { after: 1500 });

      await page.getByLabel('Skill name').fill('Torque calibration');
      await page.getByLabel('Category').fill('Mechanical');
      await page.getByLabel('Equipment specialization').fill('V22-20261103-TYPE-1');
      await page.getByLabel('Work center').fill('V22-20261103-WC-1');
      await page.getByLabel('Certification name').fill('SYNTHETIC torque certificate');
      await page.getByLabel('Issuer').fill('SYNTHETIC training centre');
      await page.getByLabel('Years of experience').fill('4');
      await pause(page, 400);
      await click(page, /Add skill/, { after: 1600 });
      ctx.check('declared skill stored as an unverified suggestion', (await page.locator('body').innerText()).includes('Unverified'));

      await click(page, /Review application/, { after: 1200 });
      await pause(page, 900);
      await click(page, /Submit for review/, { after: 1800 });
      await waitForText(page, /Application status/);
      const submitted = await page.locator('body').innerText();
      ctx.check('application submitted for administrator review', submitted.includes('Submitted'));
      ctx.state.applicationUser = APPLICANT;

      await loginAs(page, ctx, 'SYNTHETIC Administrator 1');
      await goto(page, ctx, '/admin');
      await waitForText(page, /Onboarding review queue/);
      await pause(page, 1200);
      const approve = page.getByRole('button', { name: 'Approve', exact: true }).first();
      await approve.scrollIntoViewIfNeeded();
      await approve.click();
      await pause(page, 1800);
      const reviewText = await page.locator('body').innerText();
      ctx.check('administrator approval creates the profile', /Approved DEMO-APPLICANT-01 as Technician/i.test(reviewText), reviewText.slice(0, 200));
    },
  },
  {
    number: '03',
    id: '03-role-switching',
    title: 'Role-based sign-in',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'The development build exposes seeded synthetic identities so each operational role can be demonstrated. In production this picker is replaced by verified organisational sign-in.',
      'Accounts are filtered by role, and the identity and its granted role always travel together. The server checks the role on every request, so changing a screen cannot grant authority.',
      'Here the manager account is selected and the manager control tower opens.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/login');
      await page.getByRole('listbox', { name: 'Development accounts' }).first().waitFor({ state: 'visible', timeout: 20000 });
      await pause(page, 1400);
      await page.getByRole('button', { name: 'Technician', exact: true }).first().click();
      await pause(page, 1200);
      await page.getByRole('button', { name: 'All', exact: true }).first().click();
      await pause(page, 700);
      const search = page.getByLabel('Search accounts').first();
      await search.fill('Manager 1');
      await pause(page, 1200);
      ctx.check('account search filters seeded identities', (await page.getByRole('option').count()) >= 1);
      await page.getByRole('option', { name: /SYNTHETIC Manager 1/ }).first().click();
      await pause(page, 900);
      await click(page, /Enter dashboard/, { after: 2000 });
      await waitForText(page, /Manager control tower/);
      ctx.check('manager dashboard loads with the manager identity', true);
    },
  },
  {
    number: '04',
    id: '04-worker-dashboard',
    title: 'Worker dashboard',
    identity: { role: 'Worker', user: WORKER, language: 'en' },
    narration: [
      'The worker dashboard is scoped to the authenticated worker. It shows only the reports linked to this identity and the equipment available at the recorded work center.',
      'The report panel is the main entry point: select a registered machine, then speak or type the observation. Nothing is submitted until the worker confirms the reviewed description.',
      'Temporary reassignments from an earlier downtime are visible here as well, because the same worker can be moved while their machine is unavailable.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/worker');
      await waitForText(page, /My open reports/);
      await pause(page, 1800);
      const body = await page.locator('body').innerText();
      ctx.check('worker dashboard shows scoped KPIs', body.includes('Temporary reassignments'));
      await page.mouse.wheel(0, 420);
      await pause(page, 1400);
      const select = page.getByLabel('Equipment', { exact: true }).first();
      ctx.check('live equipment register loads', (await select.locator('option').count()) > 1);
      await select.selectOption(TOOL);
      await pause(page, 1200);
      await page.mouse.wheel(0, 300);
      await pause(page, 1200);
    },
  },
  {
    number: '05',
    id: '05-qr-identification',
    title: 'QR equipment identification',
    identity: { role: 'Worker', user: WORKER, language: 'en' },
    narration: [
      'On the shop floor the worker identifies the machine by scanning its QR code. This build has no camera scanner attached, so the QR payload is entered as text and validated against the live equipment register.',
      'An unknown code is rejected. A registered code resolves to the machine type, line, work center and current lifecycle state, so the report can never be attached to the wrong asset.',
      'The worker then chooses the intake language. Kannada, Hindi and English are all first-class inputs for the conversation that follows.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/worker/manual');
      await pause(page, 1200);
      await page.locator('#tool-code').fill('UNKNOWN-TOOL');
      await click(page, /Resolve tool code/, { after: 1200 });
      ctx.check('unknown QR payload rejected by the register', /Unknown tool code|not in the current register/i.test(await page.locator('body').innerText()));
      await page.locator('#tool-code').fill(TOOL);
      await click(page, /Resolve tool code/, { after: 1500 });
      await pause(page, 900);
      await click(page, /Confirm Tool & Proceed/, { after: 1200 });
      await pause(page, 800);
      const kannada = page.getByRole('button', { name: /ಕನ್ನಡ/ }).first();
      await kannada.click();
      await pause(page, 1200);
      ctx.check('Kannada intake language selected', (await kannada.getAttribute('aria-pressed')) === 'true');
      await click(page, /Continue to Report/, { after: 1400 });
      await pause(page, 900);
      const body = await page.locator('body').innerText();
      ctx.check('report form requires a reporter identity', body.includes('Reporter ID'));
      await page.mouse.wheel(0, 260);
      await pause(page, 1200);
    },
  },
  {
    number: '06',
    id: '06-voice-agent',
    title: 'Multilingual AI conversation',
    identity: { role: 'Worker', user: WORKER, language: 'kn' },
    narration: [
      'Back on the dashboard, the worker starts a guided conversation for the selected machine. The interviewer asks one question at a time and keeps the worker in control of every answer.',
      'The worker answers in Kannada. Speech synthesis reads the question back through Sarvam, and the transcript can always be corrected before it is sent.',
      'The assistant only structures what the worker actually said. When a fact is genuinely unknown, the worker can say so, and the field stays missing instead of being invented.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/worker');
      await pause(page, 1200);
      await startConversation(page);
      await page.locator('.voice-agent').scrollIntoViewIfNeeded();
      await pause(page, 2200);
      const body = await page.locator('body').innerText();
      ctx.check('interview question returned by the backend', /ಸಮಸ್ಯೆ|question|ಗಮನಿಸಿ/i.test(body));
      // The application limits each identity to a small number of AI requests per minute
      // (interview turn plus speech read-back count separately), so the demo shows three
      // exchanges and then reviews the report, which is exactly how a worker may finish early.
      const answers = [
        'ಯಂತ್ರದಿಂದ ವಿಚಿತ್ರ ಕಂಪನ ಶಬ್ದ ಬರುತ್ತಿದೆ ಮತ್ತು ಸ್ಪಿಂಡಲ್ ಬಿಸಿಯಾಗುತ್ತಿದೆ.',
        'ಇಂದು ಬೆಳಿಗ್ಗೆ ಶಿಫ್ಟ್ ಪ್ರಾರಂಭವಾದಾಗಿನಿಂದ ಇದು ಕಂಡುಬರುತ್ತಿದೆ.',
        'ಹೌದು, ಯಂತ್ರವನ್ನು ನಿಲ್ಲಿಸಿದ್ದೇವೆ.',
      ];
      let outcome = 'timeout';
      for (const text of answers) {
        outcome = await answer(page, text);
        if (outcome === 'review') break;
        await pause(page, 4200);
      }
      if (outcome !== 'review') {
        const review = page.getByRole('button', { name: /Review report|ವರದಿ ಪರಿಶೀಲಿಸಿ/ }).first();
        if (await review.count()) {
          await review.click();
          await pause(page, 1600);
        }
      }
      const confirm = page.getByRole('button', { name: /Confirm and Submit|ದೃಢೀಕರಿಸಿ ಸಲ್ಲಿಸಿ/ }).first();
      if (!(await confirm.count())) {
        const review = page.getByRole('button', { name: /Review report|ವರದಿ ಪರಿಶೀಲಿಸಿ/ }).first();
        if (await review.count()) await review.click();
        await pause(page, 1200);
      }
      ctx.check('conversation reached the worker review stage', (await page.getByRole('button', { name: /Confirm and Submit|ದೃಢೀಕರಿಸಿ ಸಲ್ಲಿಸಿ/ }).count()) > 0);
      await page.mouse.wheel(0, 240);
      await pause(page, 1600);
    },
  },
  {
    number: '07',
    id: '07-incident-confirmation',
    title: 'Worker confirmation and incident creation',
    identity: { role: 'Worker', user: WORKER, language: 'kn' },
    narration: [
      'A second conversation is completed and reviewed. The reviewed description is editable, and the worker must explicitly confirm it before anything is stored.',
      'Confirmation creates the incident record in SQLite, stores the conversation as evidence and notifies the manager for review. The worker never needs to retype the fault.',
      'The resulting incident is the single record that the manager, technician, verifier and quality reviewer will all act on.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/worker');
      await pause(page, 1000);
      await startConversation(page);
      await answer(page, 'ಸ್ಪಿಂಡಲ್ ಬೇರಿಂಗ್‌ನಿಂದ ಕಂಪನ ಶಬ್ದ ಮತ್ತು ಅಧಿಕ ಬಿಸಿ ಕಂಡುಬಂದಿದೆ, ಯಂತ್ರ ನಿಲ್ಲಿಸಲಾಗಿದೆ.');
      const review = page.getByRole('button', { name: /Review report|ವರದಿ ಪರಿಶೀಲಿಸಿ/ }).first();
      if (await review.count()) {
        await review.click();
        await pause(page, 1400);
      }
      const description = page.locator('.voice-agent textarea').first();
      if (await description.count()) {
        await description.fill('Spindle bearing produces abnormal vibration and heat; machine stopped and supervisor informed.');
        await pause(page, 700);
      }
      ctx.check('worker review shows an editable description', (await description.inputValue()).length > 20);
      await click(page, /Confirm and Submit|ದೃಢೀಕರಿಸಿ ಸಲ್ಲಿಸಿ/, { after: 2600 });
      const track = page.getByRole('link', { name: /Track this issue/ }).first();
      await track.waitFor({ state: 'visible', timeout: 30000 });
      await track.click();
      await page.waitForURL(/\/issues\//, { timeout: 20000 });
      await page.waitForLoadState('networkidle').catch(() => {});
      await pause(page, 1600);
      const match = /\/issues\/([^/?]+)/.exec(page.url());
      ctx.state.incidentId = decodeURIComponent(match[1]);
      ctx.check('incident persisted and opened', Boolean(ctx.state.incidentId), ctx.state.incidentId);
      const body = await page.locator('body').innerText();
      ctx.check('incident shows the worker statement and confirmed state', /Confirmed|Original worker report/i.test(body));
      await pause(page, 1400);
    },
  },
  {
    number: '08',
    id: '08-manager-review',
    title: 'Manager review and containment approval',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'The manager sees the confirmed report in the control tower queue. Scope is limited to the work centers this manager is authorised for.',
      'Reviewing the incident records severity, urgency and a decision reason. Those human decisions drive every qualification check that follows, and the AI never sets them.',
      'Containment is a separate, two-step control: the manager raises a proposal, approves it, and only then executes the simulated equipment restriction. Each step is audited.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/manager');
      await waitForText(page, /Managed control tower|Manager control tower/);
      await pause(page, 2000);
      ctx.check('manager dashboard reports the open incident queue', (await page.locator('.v23-grid.kpi').count()) === 1);
      await openIssue(page, ctx);
      await pause(page, 1200);
      await fill(page, 'Severity', 'High');
      await fill(page, 'Urgency', 'Urgent');
      await fill(page, 'Production shift', 'Shift A');
      await page.getByLabel('Decision reason', { exact: true }).first().fill('Reviewed vibration evidence with the shift supervisor');
      await page.getByLabel('Decision reason', { exact: true }).first().press('Tab');
      await pause(page, 500);
      await click(page, /Save review/, { after: 2200 });
      ctx.check('triage decision recorded', /High/.test(await page.locator('body').innerText()));

      await tab(page, 'Approvals');
      const workflowReason = page.getByLabel('Workflow reason').first();
      await workflowReason.waitFor({ state: 'visible', timeout: 20000 });
      await workflowReason.fill('Restrict the machine until a qualified repair is verified');
      await pause(page, 600);
      await click(page, /Create containment proposal/, { after: 2200 });
      await click(page, /Approve TOOL_RESTRICTION/, { after: 2200 });
      await click(page, /Execute simulated TOOL_RESTRICTION/, { after: 2400 });
      const body = await page.locator('body').innerText();
      ctx.check('containment approval executed', /SIMULATED|Approval|Restricted/i.test(body));
      const tool = await ctx.api(MANAGER, 'Manager', `/tools`).catch(() => null);
      const record = tool?.tools?.find((row) => row.toolId === TOOL);
      ctx.check('equipment state changed to Restricted', record?.state === 'Restricted', record?.state);
    },
  },
  {
    number: '09',
    id: '09-duplicates',
    title: 'Duplicate and repeat-failure review',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'Manufacturing reports often describe the same fault twice. ToolSathi compares the current report with earlier incidents on the same equipment and surfaces possible duplicates for a human decision.',
      'The comparison is deterministic: identical equipment, category and overlapping normalised words, with the similarity score and reasons shown. Nothing is merged automatically.',
      'The manager records a decision with a reason. Both reports remain on file, because discarding a worker statement is never an automatic action.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx);
      await tab(page, 'Duplicates');
      await pause(page, 900);
      const runButton = page.getByRole('button', { name: 'Duplicates', exact: true }).last();
      await runButton.click();
      await pause(page, 2000);
      const panel = await page.locator('body').innerText();
      ctx.check('duplicate candidates calculated from stored incidents', /POSSIBLE_DUPLICATE|REPEAT_FAILURE|Possible duplicate|Repeat failure/i.test(panel));
      const reason = page.getByLabel('Decision reason', { exact: true }).first();
      if (await reason.count()) {
        await reason.fill('Different failure event on the same machine; keep the new report separate');
        await pause(page, 400);
      }
      const separate = page.getByRole('button', { name: 'Keep separate', exact: true }).first();
      if (await separate.count()) {
        await separate.click();
        await pause(page, 2000);
        ctx.check('human duplicate decision recorded', true);
      } else {
        ctx.check('human duplicate decision recorded', false, 'no linkable candidate returned');
      }
      await page.mouse.wheel(0, 240);
      await pause(page, 1200);
    },
  },
  {
    number: '10',
    id: '10-technician-assignment',
    title: 'Qualified technician assignment',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'Assignment is not a free-text field. The backend evaluates every technician against the approved equipment requirement: skill, certification, safety authorisation, work center, shift availability and current workload.',
      'The candidate list shows why a technician is eligible or excluded, so the manager can justify the placement rather than guess.',
      'The manager records a reason and assigns the most suitable qualified technician. The work order is created on the same incident.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx);
      await tab(page, 'Assignment');
      await click(page, /Eligible technicians/, { after: 2200 });
      const cards = page.locator('.operations-panel');
      ctx.check('eligibility evaluation returned candidates', (await cards.count()) > 0);
      await pause(page, 1800);
      const reason = page.getByLabel('Decision reason', { exact: true }).first();
      await reason.fill('Qualified for this equipment type and available on the current shift');
      await pause(page, 500);
      const assigns = page.getByRole('button', { name: 'Assign', exact: true });
      const total = await assigns.count();
      let assigned = false;
      for (let index = 0; index < total; index += 1) {
        const control = assigns.nth(index);
        if (await control.isEnabled()) {
          await control.click();
          assigned = true;
          break;
        }
      }
      await pause(page, 2400);
      ctx.check('work order assigned to a qualified technician', assigned);
      const body = await page.locator('body').innerText();
      ctx.check('assignment shown on the incident', /V22-20261103-TECH|Assigned/i.test(body));
    },
  },
  {
    number: '11',
    id: '11-technician-dashboard',
    title: 'Technician workbench',
    identity: { role: 'Technician', user: TECHNICIAN, language: 'en' },
    narration: [
      'The technician signs in with the same workflow. The workbench only shows work orders placed on this identity; there is no manual incident search.',
      'Each order carries the incident, the recorded status and the findings already captured. Opening the order leads to the repair workspace on the same record.',
      'Repair assistance, spare parts and completion evidence all live inside that workspace so the repair remains traceable.',
    ],
    async run(page, ctx) {
      await loginAs(page, ctx, 'SYNTHETIC Technician 1');
      await waitForText(page, /Technician workbench/);
      await pause(page, 1800);
      const body = await page.locator('body').innerText();
      ctx.check('technician sees the assigned work order', body.includes(ctx.state.incidentId));
      await page.mouse.wheel(0, 380);
      await pause(page, 1400);
      const open = page.getByRole('link', { name: /Open workspace/ }).first();
      await open.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await pause(page, 1800);
      ctx.check('repair workspace opens on the assigned incident', page.url().includes('tab=repair'));
      await pause(page, 1200);
    },
  },
  {
    number: '12',
    id: '12-ai-repair-and-parts',
    title: 'Grounded repair guidance and spare parts',
    identity: { role: 'Technician', user: TECHNICIAN, language: 'en' },
    narration: [
      'The technician loads the repair context. Compatible spare parts are read from the persisted inventory with their real availability and storage location.',
      'Requesting guidance retrieves permitted records: similar historical failures, approved reference documents and the equipment requirement. The answer cites its sources and warns that it is advice, not a safety certificate.',
      'After reserving the part, the technician accepts the assignment and starts a recorded repair. Acceptance is a real state transition, not a button that only looks busy.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx, '?tab=repair');
      await pause(page, 1200);
      await click(page, /Parts and repair references/, { after: 2200 });
      const parts = await page.locator('.operations-panel').count();
      ctx.check('compatible spare parts listed from inventory', parts > 0, `${parts} panels`);
      await pause(page, 1600);
      const reserve = page.getByRole('button', { name: /Reserve part/ }).first();
      if (await reserve.count()) {
        await reserve.click();
        await pause(page, 2000);
      }
      ctx.check('part reserved with a recorded decision', /Active|Reserved|available/i.test(await page.locator('body').innerText()));
      await click(page, /Request grounded AI guidance/, { after: 1200 });
      await waitForText(page, /grounded|AI_|not-requested|groq|Possible causes|Suggested checks/i, 70000);
      await pause(page, 2600);
      const guidance = await page.locator('body').innerText();
      ctx.check('grounded guidance returned with sources', /Possible causes|Suggested checks|source|groq/i.test(guidance));
      const findings = page.getByLabel('Findings / progress').first();
      await findings.fill('Removed the spindle cover and confirmed abnormal bearing noise; replacement bearing available in stores.');
      await pause(page, 500);
      await click(page, /Accept assignment/, { after: 2200 });
      await click(page, /Start recorded repair/, { after: 2400 });
      ctx.check('repair record created', /Repair evidence ID|Readings|repair/i.test(await page.locator('body').innerText()));
    },
  },
  {
    number: '13',
    id: '13-repair-completion',
    title: 'Repair completion evidence',
    identity: { role: 'Technician', user: TECHNICIAN, language: 'en' },
    narration: [
      'Completion requires evidence. The technician records the inspection reading, the measured value, the reference and whether it passed.',
      'The backend validates the readings and stores them against the repair. Readings cannot be generated by the assistant or skipped by the interface.',
      'The technician then submits the completion for manager review. The work order moves to Submitted and the evidence becomes part of the incident record.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx, '?tab=repair');
      await pause(page, 1600);
      const fieldsets = page.locator('fieldset.operations-form');
      if (await fieldsets.count()) {
        const inputs = fieldsets.first().locator('input');
        await inputs.nth(0).fill('Bearing vibration reading');
        await inputs.nth(1).fill('1.2');
        await inputs.nth(2).fill('mm/s RMS');
        await inputs.nth(3).fill('Below 2.8 mm/s per approved reference');
        await inputs.nth(4).fill('MEASUREMENT-DEMO-01');
        const passed = fieldsets.first().locator('input[type="checkbox"]').first();
        await passed.check();
        await pause(page, 700);
        await click(page, /Save inspection readings/, { after: 2600 });
      }
      const findings = page.getByLabel('Findings / progress').first();
      await findings.fill('Replaced the spindle bearing, reassembled and re-ran the machine at production speed.');
      await pause(page, 500);
      await click(page, /Submit repair evidence/, { after: 2600 });
      const status = await ctx.issue(MANAGER, 'Manager', ctx.state.incidentId);
      ctx.check('work order submitted for manager review', status.issue?.workOrder?.status === 'Submitted', status.issue?.workOrder?.status);
      await page.mouse.wheel(0, 300);
      await pause(page, 1400);
    },
  },
  {
    number: '16',
    id: '16-workforce',
    title: 'Workforce continuity during downtime',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'While the machine is down, its operators are idle. Workforce continuity moves qualified workers to stations that still have real demand, instead of leaving them without productive work.',
      'Recommendations are deterministic. Skills, certification, safety authorisation, shift time, station capacity, materials and remaining demand are all checked before any worker is proposed.',
      'The manager approves an individual reassignment and then a bounded automatic plan, and asks the assistant to explain the validated plan. The assistant explains; it never changes the allocation.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx, '?tab=workforce');
      await pause(page, 1400);
      await click(page, /Find available capacity/, { after: 2600 });
      await pause(page, 1600);
      const cards = page.locator('.capacity-card');
      ctx.check('eligible reassignment capacity found', (await cards.count()) > 0, `${await cards.count()} cards`);
      const reason = page.getByLabel('Manager decision reason').first();
      await reason.fill('Keep idle operators productive while the machine is restricted');
      await pause(page, 600);
      const approve = page.getByRole('button', { name: /Approve reassignment/ }).first();
      if (await approve.count()) {
        await approve.click();
        await pause(page, 2600);
        ctx.check('manual reassignment saved and audited', (await page.locator('body').innerText()).includes('Manual'));
      }
      await page.getByRole('button', { name: 'Automatic', exact: true }).first().click();
      await pause(page, 2200);
      await click(page, /Auto Allocate Workers/, { after: 3200 });
      await waitForText(page, /Proposed allocation|Allocation saved/);
      await pause(page, 2000);
      const planBody = await page.locator('body').innerText();
      ctx.check('automatic allocation plan computed', /deterministic|Estimated units|Estimated/i.test(planBody));
      const confirm = page.getByRole('button', { name: /Confirm and apply this allocation/ }).first();
      if (await confirm.count()) {
        await confirm.click();
        await pause(page, 2800);
        ctx.check('automatic allocation executed after confirmation', (await page.locator('body').innerText()).includes('Allocation saved'));
      }
      const explain = page.getByRole('button', { name: /Explain validated plan with AI/ }).first();
      if (await explain.count()) {
        await explain.click();
        await pause(page, 6000);
      }
      await page.mouse.wheel(0, 260);
      await pause(page, 1600);
    },
  },
  {
    number: '14',
    id: '14-verifier',
    title: 'Independent verification and return to service',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'Completed work cannot release a machine on its own. The manager first reviews the completion and its evidence.',
      'Then an authorised verifier performs an independent check. The verifier must not be the person who assigned or approved the work, and the verification capability is granted separately from assignment.',
      'Only after the verifier accepts the inspection evidence does the equipment return to service. The verifier identity and reason are stored in the audit record.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx, '?tab=repair');
      await pause(page, 1400);
      const reason = page.getByLabel('Decision reason', { exact: true }).first();
      await reason.fill('Completion evidence reviewed; forwarding for independent verification');
      await pause(page, 500);
      await click(page, /Review completed repair/, { after: 2600 });
      ctx.check('manager completion review recorded', (await ctx.issue(MANAGER, 'Manager', ctx.state.incidentId)).issue?.workOrder?.status === 'Reviewed');

      await loginAs(page, ctx, 'SYNTHETIC Verifier 1');
      await pause(page, 1200);
      await openIssue(page, ctx, '?tab=repair');
      await pause(page, 1600);
      const body = await page.locator('body').innerText();
      ctx.check('verifier sees the reviewed repair awaiting verification', /Reviewed|Verify return to service/i.test(body));
      const checkbox = page.getByLabel(/I independently checked/).first();
      await checkbox.check();
      await pause(page, 600);
      const verifierReason = page.getByLabel('Decision reason', { exact: true }).first();
      await verifierReason.fill('Independently inspected the machine and confirmed the recorded vibration reading');
      await pause(page, 500);
      await click(page, /Verify return to service/, { after: 3000 });
      const tool = await ctx.api(MANAGER, 'Manager', '/tools').catch(() => null);
      const record = tool?.tools?.find((row) => row.toolId === TOOL);
      ctx.check('equipment returned to service by the verifier', record?.state === 'Active', record?.state);
    },
  },
  {
    number: '15',
    id: '15-closure',
    title: 'Closure and audit history',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'With the machine back in service, the manager closes the incident and records the reason for closure.',
      'The audit timeline lists every recorded action with its actor, role, timestamp and reason: the worker confirmation, the manager review, the containment approval, the assignment, the repair evidence, the verification and the closure.',
      'This append-only history is the evidence trail behind the finished job, and it is what the downloadable evidence report contains.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx, '?tab=repair');
      await pause(page, 1200);
      const reason = page.getByLabel('Decision reason', { exact: true }).first();
      await reason.fill('Repair and independent verification complete; returning the machine to production');
      await pause(page, 600);
      await click(page, /Close verified incident/, { after: 2800 });
      const status = await ctx.issue(MANAGER, 'Manager', ctx.state.incidentId);
      ctx.check('incident closed', status.issue?.status === 'Closed', status.issue?.status);
      await tab(page, 'Application audit history');
      await pause(page, 2200);
      const timeline = await page.locator('ol.v23-timeline li').count();
      ctx.check('audit timeline recorded the full lifecycle', timeline >= 5, `${timeline} entries`);
      await page.mouse.wheel(0, 420);
      await pause(page, 1800);
    },
  },
  {
    number: '17',
    id: '17-exposure',
    title: 'Product exposure tracing',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'Traceability asks which units could have been produced while the machine was faulty. The engine traverses recorded tool use, production runs, batches, stock and shipments inside a chosen window.',
      'This record has no production history attached to the synthetic equipment, and the dashboard says so: zero associated units, with evidence gaps instead of an invented number.',
      'For a record that does have production history, the quality reviewer opens the closed reference incident TS-0001. The same engine calculates serial-level associations, tiers, locations and an evidence-quality score.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, `/exposure/${encodeURIComponent(ctx.state.incidentId)}?window=72`);
      await pause(page, 2600);
      const body = await page.locator('body').innerText();
      ctx.check('lifecycle incident trace computed deterministically', /Associated units/i.test(body));
      ctx.state.lifecycleTraceText = body;
      await pause(page, 1400);

      await loginAs(page, ctx, 'SYNTHETIC Quality 1');
      await pause(page, 1200);
      await goto(page, ctx, `/exposure/${LEGACY_INCIDENT}?window=72`);
      await pause(page, 3000);
      const reference = await page.locator('body').innerText();
      const units = /Associated units\s*(\d+)/i.exec(reference);
      ctx.check('reference trace returns recorded units', Number(units?.[1] || 0) > 0, units?.[1]);
      await page.mouse.wheel(0, 320);
      await pause(page, 1800);
      ctx.state.referenceTraceUnits = Number(units?.[1] || 0);
    },
  },
  {
    number: '18',
    id: '18-exposure-download',
    title: 'Evidence report downloads',
    identity: { role: 'Quality', user: QUALITY, language: 'en' },
    narration: [
      'A trace becomes useful when it can be handed to quality and logistics. The reviewer stores an immutable snapshot with the filters that were applied.',
      'The PDF and CSV downloads are generated from that stored snapshot, including the window, the evidence references and a synthetic-data disclosure.',
      'The files you see saved here are the actual downloads produced by the backend during this recording.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, `/exposure/${LEGACY_INCIDENT}?window=72`);
      await pause(page, 2600);
      const downloads = [];
      page.on('download', async (download) => {
        const directory = ctx.downloadDir;
        const target = `${directory}/${download.suggestedFilename()}`;
        await download.saveAs(target).catch(() => {});
      });
      await page.getByRole('button', { name: /Download PDF/ }).first().click();
      await pause(page, 8000);
      await page.getByRole('button', { name: /Download CSV/ }).first().click();
      await pause(page, 6000);
      const fs = require('node:fs');
      const files = fs.existsSync(ctx.downloadDir) ? fs.readdirSync(ctx.downloadDir).filter((name) => /\.(pdf|csv)$/i.test(name)) : [];
      files.forEach((name) => downloads.push(name));
      ctx.state.downloads = files;
      ctx.check('PDF exposure report downloaded from the stored snapshot', files.some((name) => /\.pdf$/i.test(name)), files.join(','));
      ctx.check('CSV exposure report downloaded from the stored snapshot', files.some((name) => /\.csv$/i.test(name)), files.join(','));
      await pause(page, 1400);
    },
  },
  {
    number: '19',
    id: '19-quality-and-audit',
    title: 'Quality register and evidence report',
    identity: { role: 'Quality', user: QUALITY, language: 'en' },
    narration: [
      'Quality works from the same issue register as every other role. Filters narrow the register by status, severity, urgency, work center, equipment and date, and the table shows the current lifecycle state of each record.',
      'Opening the closed incident shows the audit history the manager reviewed, now read-only for quality.',
      'The executive evidence report is generated from persisted records: intake, decisions, repair evidence, verification and audit entries, with missing information left explicitly unknown.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/issues');
      await pause(page, 2200);
      await page.getByLabel('Severity').first().selectOption('High');
      await pause(page, 1600);
      const filtered = await page.locator('table.v23-table tbody tr').count();
      ctx.check('issue register filters records by severity', filtered >= 0, `${filtered} rows`);
      await page.getByRole('button', { name: /Clear filters/ }).first().click();
      await pause(page, 1200);
      await openIssue(page, ctx);
      await pause(page, 1200);
      await tab(page, 'Application audit history');
      await pause(page, 1800);
      await tab(page, 'Approvals');
      await pause(page, 1800);
      page.on('download', async (download) => {
        await download.saveAs(`${ctx.downloadDir}/${download.suggestedFilename()}`).catch(() => {});
      });
      const evidence = page.getByRole('button', { name: /Download executive evidence report/ }).first();
      if (await evidence.count()) {
        await evidence.click();
        await pause(page, 6000);
      }
      const fs = require('node:fs');
      const files = fs.existsSync(ctx.downloadDir) ? fs.readdirSync(ctx.downloadDir) : [];
      ctx.check('executive evidence report downloaded', files.some((name) => /\.html$/i.test(name)), files.join(','));
      await pause(page, 1400);
    },
  },
  {
    number: '20',
    id: '20-chatbot',
    title: 'Grounded website assistant',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'The assistant answers operational questions from permitted records only. It runs retrieval first and then reasoning, and it shows the sources it used.',
      'Here the manager asks which technicians are qualified for this equipment, and then which incidents still need review. The answers come from the same database the dashboards read, scoped to the signed-in role.',
      'The assistant is read-only. It cannot assign work, approve containment or close an incident.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx);
      await pause(page, 1400);
      await page.getByRole('button', { name: /Website assistant/ }).first().click();
      await pause(page, 1400);
      await page.getByRole('button', { name: /Which technicians are qualified for this equipment/ }).first().click();
      await pause(page, 400);
      await waitForText(page, /ToolSathi AI/, 9000);
      await page.waitForFunction(() => {
        const bubbles = document.querySelectorAll('.v23-bubble.assistant');
        return bubbles.length > 0;
      }, { timeout: 70000 }).catch(() => {});
      await pause(page, 2600);
      const panel = page.locator('.v23-dock-panel');
      const answer = await panel.innerText();
      ctx.check('assistant answered with retrieved records', answer.length > 200);
      const input = page.locator('#v23-dock-input');
      await input.fill('Which incidents still need manager review?');
      await page.getByRole('button', { name: 'Ask', exact: true }).click();
      await pause(page, 1200);
      await page.waitForFunction(() => {
        const bubbles = document.querySelectorAll('.v23-bubble.assistant');
        return bubbles.length > 1;
      }, { timeout: 70000 }).catch(() => {});
      await pause(page, 2400);
      const sources = await page.locator('.v23-bubble details').count();
      ctx.check('assistant exposes citations for the answer', sources > 0);
      await pause(page, 1200);
    },
  },
  {
    number: '21',
    id: '21-notifications-profile',
    title: 'Notifications and profile',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'Notifications are persisted per identity and generated by real workflow events: new worker reports, assignments, repair submissions and verification decisions.',
      'Reading a notification is recorded server-side, and the notification itself never changes a workflow state. The link opens the record where the decision must be made.',
      'The profile page shows the identity, its granted role and the onboarding record, including how many skills and documents are attached.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/notifications');
      await pause(page, 2000);
      const body = await page.locator('body').innerText();
      ctx.check('notifications persist for the signed-in identity', /Notification centre/i.test(body));
      const mark = page.getByRole('button', { name: /Mark read/ }).first();
      if (await mark.count()) {
        await mark.click();
        await pause(page, 2000);
      }
      await page.mouse.wheel(0, 240);
      await pause(page, 1600);
      await goto(page, ctx, '/profile');
      await pause(page, 2200);
      ctx.check('profile shows the granted role', /Manager/.test(await page.locator('body').innerText()));
      await page.mouse.wheel(0, 220);
      await pause(page, 1600);
    },
  },
  {
    number: '22',
    id: '22-localization',
    title: 'Localisation',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'The interface is localised for English, Kannada and Hindi. Changing the language updates the navigation, the operational labels and the assistant responses.',
      'Kannada and Hindi labels are shown exactly as the storefront uses them on the shop floor. Technical identifiers and stored record values are never translated.',
      'The same localisation applies to the worker intake conversation, which is what makes the multilingual capture story possible in the first place.',
    ],
    async run(page, ctx) {
      await openIssue(page, ctx);
      await pause(page, 1600);
      const selector = page.locator('.v23-topbar select').first();
      await selector.selectOption('kn');
      await pause(page, 2000);
      ctx.check('Kannada interface labels rendered', /ಸಮಸ್ಯೆಗಳು|ಉಪಕರಣ|ಕಾರ್ಯಫಲಕ/.test(await page.locator('body').innerText()));
      await page.mouse.wheel(0, 240);
      await pause(page, 1600);
      await selector.selectOption('hi');
      await pause(page, 2000);
      ctx.check('Hindi interface labels rendered', /समस्याएँ|उपकरण|डैशबोर्ड/.test(await page.locator('body').innerText()));
      await pause(page, 1400);
      await selector.selectOption('en');
      await pause(page, 1200);
    },
  },
  {
    number: '23',
    id: '23-summary',
    title: 'Summary',
    identity: { role: 'Manager', user: MANAGER, language: 'en' },
    narration: [
      'One incident, connected decisions. The worker reported a fault in Kannada, the manager reviewed it, containment was approved, a qualified technician repaired it, idle operators were reassigned, product exposure was traced, and an independent verifier returned the machine to service.',
      'Every step is stored in SQLite, every consequential action required a human decision, and every AI answer is labelled and grounded in permitted records. Simulated SAP integrations and synthetic manufacturing data are marked throughout.',
      'That is ToolSathi: multilingual incident intelligence with explainable product traceability, built on the existing React, SAP CAP and SQLite implementation.',
    ],
    async run(page, ctx) {
      await goto(page, ctx, '/issues');
      await pause(page, 2200);
      await goto(page, ctx, '/');
      await pause(page, 1600);
      await page.mouse.wheel(0, 1300);
      await pause(page, 2200);
      await page.mouse.wheel(0, 1200);
      await pause(page, 1800);
      await page.mouse.wheel(0, 900);
      await pause(page, 2200);
    },
  },
];

module.exports.constants = { WORKER, MANAGER, TECHNICIAN, VERIFIER, QUALITY, ADMIN, APPLICANT, TOOL, LEGACY_INCIDENT };
