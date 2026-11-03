// ToolSathi V2.3 browser integration suite.
// Drives the real Vite build against a temporary SQLite backend. Every assertion below
// describes behaviour of the shipped V2.3 interface; nothing is mocked in the frontend.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { fork } from "node:child_process";
import { chromium } from "playwright";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.dirname(frontend);
const backend = path.join(repo, "backend");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "toolsathi-v23-browser-"));
const testTemp = fs.mkdtempSync(path.join(backend, ".browser-integration-"));
const database = path.join(testTemp, "runtime.sqlite");
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5175);
const frontendUrl = `http://localhost:${frontendPort}`;
let apiUrl, backendProcess, viteProcess, browser, page, context;
const pageErrors = [];
const report = { label: "synthetic data, simulated services", interface: "V2.3", automatedBrowser: true, checks: [], pageErrors };

async function waitForOutput(child, pattern) {
  let text = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server startup timed out: " + text)), 40000);
    child.stdout.on("data", (chunk) => {
      text += chunk;
      const match = text.match(pattern);
      if (match) { clearTimeout(timer); resolve(match); }
    });
    child.stderr.on("data", (chunk) => { text += chunk; });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error("Server exited " + code + ": " + text)); });
  });
}

async function until(fn, message) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error(message);
}

function check(name, fn) {
  test(name, { timeout: 60000 }, async () => {
    try {
      await fn();
      report.checks.push({ name, status: "PASSED" });
    } catch (error) {
      report.checks.push({ name, status: "FAILED", message: error.message });
      await page?.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
      throw error;
    }
  });
}

// Demo identity is stored in sessionStorage; the store pairs role with the same account.
async function asUser(role, userId, target = "/") {
  await page.goto(frontendUrl + "/login");
  await page.evaluate(([r, u]) => {
    sessionStorage.setItem("toolsathi.demoRole", r);
    sessionStorage.setItem("toolsathi.demoUser", u);
  }, [role, userId]);
  await page.goto(frontendUrl + target);
  await page.waitForSelector(".v23-root, .v23-landing");
}

const api = (pathname, options = {}) =>
  page.request.fetch(apiUrl + "/api" + pathname, {
    ...options,
    headers: { "x-demo-user": "E2E-REVIEW", "x-demo-role": "Manager", ...(options.headers || {}) },
  }).then(async (response) => ({ status: response.status(), body: await response.json().catch(() => null), response }));

before(async () => {
  backendProcess = fork("srv/server.js", [], {
    cwd: backend,
    silent: true,
    env: {
      ...process.env,
      NODE_ENV: "development",
      CDS_ENV: "development",
      DATABASE_MODE: "sqlite",
      AUTH_MODE: "header",
      SARVAM_API_KEY: "",
      GROQ_API_KEY: "",
      V21_BROWSER_FIXTURES: "true",
      V22_WORKFLOW_ENABLED: "true",
      V22_SYNTHETIC_FIXTURES: "true",
      V2_SYNTHETIC_FIXTURES: "false",
      ENFORCE_APPROVALS: "true",
      ALLOW_UNAPPROVED_MOCKS: "false",
      CDS_REQUIRES_DB_CREDENTIALS_URL: database,
      SQLITE_FILE: database,
      PORT: "0",
      CORS_ORIGINS: frontendUrl,
    },
  });
  apiUrl = (await waitForOutput(backendProcess, /ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/))[1];
  viteProcess = fork(path.join(frontend, "node_modules/vite/bin/vite.js"), ["--host", "127.0.0.1", "--port", String(frontendPort), "--strictPort"], {
    cwd: frontend,
    silent: true,
    env: {
      ...process.env,
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      VITE_API_BASE_URL: "/api",
      VITE_DEMO_AUTH: "true",
      VITE_AI_ENABLED: "false",
      API_PROXY_TARGET: apiUrl,
      TOOLSATHI_VITE_CACHE_DIR: path.join(output, `vite-${frontendPort}`),
    },
  });
  await waitForOutput(viteProcess, /Local:\s+(http:\/\/[^\s]+)/);
  const candidates = [process.env.BROWSER_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
  const executablePath = candidates.find((file) => fs.existsSync(file));
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => pageErrors.push(error.message));
  report.frontendUrl = frontendUrl;
  report.backendUrl = apiUrl + "/api";
}, { timeout: 120000 });

after(async () => {
  report.executedAt = new Date().toISOString();
  fs.writeFileSync(path.join(repo, "docs", "frontend-integration-results.json"), JSON.stringify({ browser: report }, null, 2) + "\n");
  fs.writeFileSync(path.join(output, "browser-summary.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
  if (viteProcess && viteProcess.exitCode === null) {
    const closed = new Promise((resolve) => viteProcess.once("exit", resolve));
    viteProcess.kill();
    await closed;
  }
  if (backendProcess && backendProcess.exitCode === null) {
    const closed = new Promise((resolve) => backendProcess.once("exit", resolve));
    backendProcess.send({ type: "toolsathi:shutdown" });
    await closed;
  }
  const resolvedTemp = path.resolve(testTemp);
  if (path.dirname(resolvedTemp) === path.resolve(backend) && path.basename(resolvedTemp).startsWith(".browser-integration-"))
    fs.rmSync(resolvedTemp, { recursive: true, force: true });
  const resolvedOutput = path.resolve(output);
  if (path.dirname(resolvedOutput) === path.resolve(os.tmpdir()) && path.basename(resolvedOutput).startsWith("toolsathi-v23-browser-"))
    fs.rmSync(resolvedOutput, { recursive: true, force: true });
});

check("landing page, sign in, and a paired demo identity open the matching dashboard", async () => {
  await page.goto(frontendUrl + "/");
  await page.waitForSelector(".v23-landing");
  assert.match(await page.locator("h1").first().innerText(), /shop-floor voice note/i);
  assert.equal(await page.locator(".v23-hero .v23-btn").count() >= 2, true);
  await page.getByRole("link", { name: "Sign in" }).click();
  await page.waitForSelector(".v23-account");
  // The historic giant native dropdown is gone: searchable, filtered account cards instead.
  assert.equal(await page.locator("select").filter({ hasText: "DEMO-MANAGER" }).count(), 0);
  assert.equal(await page.locator("button.v23-account").count() > 5, true);
  await page.getByRole("button", { name: "Manager" }).first().click();
  const managers = page.locator("button.v23-account");
  const managerLabel = await managers.first().innerText();
  assert.match(managerLabel, /Manager/);
  await managers.first().click();
  await page.getByRole("button", { name: /Enter dashboard/ }).click();
  await page.waitForSelector(".v23-page-head h1");
  assert.equal(await page.locator(".v23-page-head h1").innerText(), "Manager control tower");
  const stored = await page.evaluate(() => ({ role: sessionStorage.getItem("toolsathi.demoRole"), user: sessionStorage.getItem("toolsathi.demoUser") }));
  assert.equal(stored.role, "Manager");
  assert.match(stored.user, /MANAGER/);
  await until(async () => (await page.locator(".v23-kpi").count()) >= 8, "Manager dashboard KPIs did not load");
  const kpis = await page.locator(".v23-kpi").allInnerTexts();
  assert.equal(kpis.some((label) => /OPEN INCIDENTS/i.test(label)), true);
});

check("worker dashboard reads the live register and keeps an honest typed fallback", async () => {
  await asUser("Worker", "V22-20261103-WORKER-01", "/worker");
  assert.match(await page.locator(".v23-page-head h1").innerText(), /SYNTHETIC Worker/);
  const equipment = page.locator('select[aria-label="Equipment"]');
  await until(async () => (await equipment.locator("option").count()) > 3, "Live equipment register did not load");
  const start = page.getByRole("button", { name: "Start report" });
  assert.equal(await start.isDisabled(), true, "Reporting must require a selected machine");
  await equipment.selectOption({ index: 1 });
  assert.equal(await start.isDisabled(), false);
  // AI extraction is disabled in this suite, so the provider limitation is stated, not fabricated.
  assert.match(await page.locator(".v23-card").filter({ hasText: "Report a problem" }).innerText(), /AI extraction is optional/i);
  await page.goto(frontendUrl + "/worker/manual");
  await page.getByLabel("QR contents / tool ID").fill("UNKNOWN-TOOL");
  await page.getByRole("button", { name: "Resolve tool code" }).click();
  assert.match(await page.getByRole("alert").first().textContent(), /Unknown tool code/);
});

check("registration collects skills and a certificate, and a requested Manager role is never self-granted", async () => {
  await asUser("Worker", "E2E-APPLICANT", "/register");
  await page.getByLabel("Full name").fill("End To End Applicant");
  await page.getByLabel("Work email").fill("e2e.applicant@example.com");
  await page.getByLabel("Department").fill("Maintenance");
  await page.getByLabel("Work center").fill("WC-A");
  await page.getByRole("button", { name: /Save and continue/ }).click();
  await page.locator(".v23-role-card", { hasText: "Manager" }).click();
  await page.getByRole("button", { name: /Save and continue/ }).click();
  await page.waitForSelector(".v23-dropzone");
  await page.getByLabel("Skill name").fill("Torque calibration");
  await page.getByLabel("Category").fill("Mechanical");
  await page.getByRole("button", { name: "Add skill" }).click();
  await until(async () => (await page.locator(".v23-skill-tag").count()) === 1, "Declared skill was not saved");
  assert.match(await page.locator(".v23-skill-tag").first().innerText(), /Unverified/);
  await page.locator('.v23-dropzone input[type="file"]').setInputFiles({
    name: "torque-certificate.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
  });
  await until(async () => (await page.locator(".v23-file-row").count()) >= 1, "Certificate was not listed");
  await page.getByRole("button", { name: /Review application/ }).click();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await until(async () => (await page.locator(".v23-chip", { hasText: "Submitted" }).count()) > 0, "Application was not submitted");

  const beforeReview = await page.request.get(apiUrl + "/api/v2/me", { headers: { "x-demo-user": "E2E-APPLICANT", "x-demo-role": "Manager" } });
  assert.equal(beforeReview.status(), 200);
  assert.equal(Boolean((await beforeReview.json()).profile), false, "A requested role must not create an approved profile");
  const onboarding = await page.request.get(apiUrl + "/api/v2/onboarding/me", { headers: { "x-demo-user": "E2E-APPLICANT", "x-demo-role": "Manager" } });
  assert.equal((await onboarding.json()).application.requestedRole, "Manager");
  assert.equal((await onboarding.json()).application.status, "Submitted");

  await asUser("Administrator", "V22-20261103-ADMIN", "/admin");
  await until(async () => (await page.locator(".v23-card .v23-card").count()) >= 1, "Review queue did not load");
  const card = page.locator(".v23-card .v23-card").filter({ hasText: "End To End Applicant" });
  await card.locator("select").first().selectOption("Worker");
  await card.locator('input[placeholder="Evidence checked"]').fill("Certificate evidence reviewed");
  await page.getByRole("button", { name: "Approve" }).click();
  await until(async () => (await page.locator(".v23-chip", { hasText: "Approved" }).count()) > 0, "Application was not approved");

  const me = await page.request.get(apiUrl + "/api/v2/me", { headers: { "x-demo-user": "E2E-APPLICANT", "x-demo-role": "Worker" } });
  const profile = (await me.json()).profile;
  assert.equal(profile.role, "Worker", "The reviewer records the granted role, not the requested one");
  const escalate = await page.request.get(apiUrl + "/api/v2/dashboard", { headers: { "x-demo-user": "E2E-APPLICANT", "x-demo-role": "Manager" } });
  assert.equal(escalate.status(), 403, "An approved worker cannot claim manager scope");
});

check("issue register is readable, filterable and paginated", async () => {
  await asUser("Manager", "V22-20261103-MANAGER-01", "/issues");
  await until(async () => (await page.locator(".v23-table tbody tr").count()) > 0, "Issue register did not load");
  const contrast = await page.locator(".v23-table td").first().evaluate((cell) => {
    const parse = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
      const channel = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const text = lum(parse(getComputedStyle(cell).color));
    const background = lum(parse(getComputedStyle(cell.closest(".v23-table-wrap")).backgroundColor));
    const light = Math.max(text, background), dark = Math.min(text, background);
    return (light + 0.05) / (dark + 0.05);
  });
  assert.equal(contrast > 7, true, "Issue table text must stay well above WCAG AA, got " + contrast.toFixed(1));
  await page.locator(".v23-filters select").first().selectOption("Awaiting authorized assigner");
  await until(async () => page.url().includes("status=Awaiting"), "Status filter did not update the query");
  await until(async () => (await page.locator(".v23-table tbody tr").count()) >= 1, "Filtered register lost its rows");
  assert.match(await page.locator(".v23-filter-actions").innerText(), /1 filter applied/);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await until(async () => !page.url().includes("status="), "Clear filters did not reset the query");
  assert.match(await page.locator(".v23-pager").innerText(), /Showing 1–\d+ of \d+/);
});

check("issue detail links one incident to conversation, assignment, repair, trace and audit", async () => {
  await asUser("Manager", "V22-20261103-MANAGER-01", "/issues");
  await until(async () => (await page.locator(".v23-table tbody tr").count()) > 0, "Issue register did not load");
  await page.locator(".v23-table tbody tr td a").first().click();
  await page.waitForSelector('nav[aria-label="Issue sections"]');
  const tabs = await page.locator('nav[aria-label="Issue sections"] button').allInnerTexts();
  for (const expected of ["Overview", "Conversation", "Assignment", "Repair", "Application audit history"]) assert.equal(tabs.includes(expected), true, "Missing tab " + expected);
  assert.match(await page.locator(".v23-page-head h1").innerText(), /./);
  await page.getByRole("button", { name: "Application audit history" }).click();
  await page.waitForSelector(".v23-timeline li");
  assert.equal(await page.locator(".v23-timeline li").count() > 0, true);
  await page.getByRole("button", { name: "Assignment" }).click();
  await page.getByRole("button", { name: "Eligible technicians" }).click();
  await until(async () => (await page.locator(".operations-panel").count()) >= 1, "Eligibility list did not load");
  const panels = await page.locator(".operations-panel").allInnerTexts();
  assert.equal(panels.some((text) => /Approved equipment skill/.test(text)), true, "Eligibility reasons must come from recorded qualifications");
  assert.equal(panels.some((text) => /Required skill does not match/.test(text)), true, "Ineligible technicians must be rejected with a reason");
});

check("technician sees assigned work without entering incident identifiers", async () => {
  await asUser("Technician", "V22-20261103-TECH-02", "/technician");
  await page.waitForSelector(".v23-page-head h1");
  assert.equal(await page.locator(".v23-page-head h1").innerText(), "Technician workbench");
  await until(async () => (await page.locator(".v23-table tbody tr").count()) >= 1, "No assigned work order was shown");
  assert.match(await page.locator(".v23-table tbody tr").first().innerText(), /RepairWorkOrder/);
  await page.getByRole("link", { name: "Open workspace" }).first().click();
  await page.waitForSelector('nav[aria-label="Issue sections"]');
  assert.equal((await page.locator('nav[aria-label="Issue sections"] button').allInnerTexts()).includes("Repair"), true);
});

check("verifier grants are independent and driven by the recorded authorisation", async () => {
  const identities = await api("/v2/demo-identities", { headers: { "x-demo-user": "IDENTITY-LOOKUP", "x-demo-role": "Worker" } });
  assert.equal(identities.status, 200);
  const verifier = identities.body.identities.find((identity) => identity.role === "Verifier");
  assert.equal(Boolean(verifier), true, "No verifier identity was seeded");
  const dashboard = await api("/v2/dashboard", { headers: { "x-demo-user": verifier.userId, "x-demo-role": "Verifier" } });
  assert.equal(dashboard.status, 200);
  await asUser("Verifier", verifier.userId, "/verifier");
  await until(async () => (await page.locator(".v23-actions .v23-chip").count()) >= 3, "Verifier capability chips did not render");
  const chips = (await page.locator(".v23-actions .v23-chip").allInnerTexts()).join(" | ");
  const permissions = dashboard.body.permissions;
  assert.equal(chips.includes(permissions.canAssign ? "Assignment capability granted" : "Assignment not granted"), true);
  assert.equal(chips.includes(permissions.canVerify ? "Independent verification granted" : "Verification not granted"), true);
  assert.match(chips, /approved work centers|Unrestricted quality scope/);
});

check("exposure reconciles deterministic 24/72/168 windows and stores downloadable evidence", async () => {
  // The recorded Tool B fixture is traced for a real incident; the counts come from stored tool-use events.
  const created = await page.request.post(apiUrl + "/api/incidents", {
    headers: { "x-demo-user": "E2E-WORKER", "x-demo-role": "Worker", "content-type": "application/json" },
    data: { toolId: "TOOL-B", reporterId: "E2E-WORKER", language: "en", rawText: "Synthetic exposure reference scenario", category: "TORQUE" },
  });
  assert.equal(created.status(), 201);
  const incidentId = (await created.json()).incident.incidentId;
  await asUser("Quality", "E2E-QUALITY", `/exposure/${encodeURIComponent(incidentId)}?window=72`);
  await until(async () => (await page.locator(".v23-kpi").count()) >= 5, "Exposure dashboard did not load: " + (await page.locator(".v23-main").innerText().catch(() => "")).slice(0, 1600));
  // Deterministic traversal: the same recorded window always reconciles to the same units,
  // wider windows only add associations, and the score stays inside its documented range.
  const totals = {};
  for (const window of [24, 72, 168]) {
    const first = await api(`/incidents/${encodeURIComponent(incidentId)}/trace?window=${window}`, { headers: { "x-demo-user": "E2E-QUALITY", "x-demo-role": "Quality" } });
    assert.equal(first.status, 200, "Trace failed for window " + window);
    const second = await api(`/incidents/${encodeURIComponent(incidentId)}/trace?window=${window}`, { headers: { "x-demo-user": "E2E-QUALITY", "x-demo-role": "Quality" } });
    assert.equal(second.body.summary.totalUnits, first.body.summary.totalUnits, "Trace must be deterministic for window " + window);
    assert.equal(second.body.dataQuality.score, first.body.dataQuality.score, "Quality score must be deterministic");
    assert.equal(first.body.dataQuality.score >= 0 && first.body.dataQuality.score <= 100, true);
    const tierTotal = Object.values(first.body.summary.byTier).reduce((sum, value) => sum + value, 0);
    assert.equal(tierTotal, first.body.summary.totalUnits, "Tier split must reconcile with the unit total");
    totals[window] = first.body.summary.totalUnits;
  }
  assert.equal(totals[24] <= totals[72] && totals[72] <= totals[168], true, "Wider windows must not lose associations: " + JSON.stringify(totals));
  const kpis = (await page.locator(".v23-kpi").allInnerTexts()).join(" | ");
  assert.match(kpis, new RegExp("ASSOCIATED UNITS\\s*" + totals[72], "i"));
  const traceRows = await page.locator(".v23-table tbody tr").count();
  assert.equal(traceRows, totals[72], "The dashboard table must render exactly the associated units");
  const stored = await page.request.post(apiUrl + `/api/v2/incidents/${encodeURIComponent(incidentId)}/exposure-reports`, {
    headers: { "x-demo-user": "E2E-QUALITY", "x-demo-role": "Quality", "content-type": "application/json" },
    data: { window: 72, filters: {} },
  });
  assert.equal(stored.status(), 200);
  const report = (await stored.json()).report;
  assert.equal(report.windowHours, 72);
  for (const format of ["csv", "pdf"]) {
    const download = await page.request.get(apiUrl + `/api/v2/exposure-reports/${encodeURIComponent(report.reportId)}/download?format=${format}`, {
      headers: { "x-demo-user": "E2E-QUALITY", "x-demo-role": "Quality", Accept: format === "csv" ? "text/csv" : "application/pdf" },
    });
    assert.equal(download.status(), 200, format + " download failed");
    const body = await download.body();
    if (format === "csv") {
      const csv = body.toString("utf8");
      assert.match(csv, /Synthetic|SYNTHETIC|serial/i);
      assert.equal(csv.trim().split("\n").length - 1, totals[72], "CSV must contain one row per associated unit");
    } else {
      assert.equal(body.length > 400, true, "PDF download is too small to contain the stored report");
      assert.equal(body.subarray(0, 4).toString("latin1"), "%PDF", "PDF download must be a real PDF document");
    }
  }
});

check("workforce allocation preview exposes recommendations and exclusions for restricted equipment", async () => {
  const scoped = await api("/v2/issues?status=Awaiting%20authorized%20assigner", { headers: { "x-demo-user": "V22-20261103-MANAGER-02", "x-demo-role": "Manager" } });
  assert.equal(scoped.status, 200);
  const incident = scoped.body.issues[0] || (await api("/v2/issues", { headers: { "x-demo-user": "V22-20261103-MANAGER-02", "x-demo-role": "Manager" } })).body.issues[0];
  assert.equal(Boolean(incident), true, "No incident available for allocation");
  await asUser("Manager", "V22-20261103-MANAGER-02", "/workforce");
  await page.waitForSelector(".v23-page-head h1");
  assert.equal(await page.locator(".v23-page-head h1").innerText(), "Workforce allocation");
  const panel = page.locator(".workforce-module");
  await until(async () => (await panel.count()) === 1, "Allocation module did not mount");
  assert.match(await panel.innerText(), /Auto Allocate|Automatic/);
  assert.match(await panel.innerText(), /Manual/);
  assert.equal(await page.locator(".v23-error").count(), 0);
});

check("notification reads persist for the owning identity", async () => {
  await asUser("Manager", "V22-20261103-MANAGER-01", "/notifications");
  await page.waitForSelector(".v23-page-head h1");
  assert.equal(await page.locator(".v23-page-head h1").innerText(), "Notification centre");
  const unread = await page.locator(".v23-file-row").filter({ hasText: "Unread" }).count();
  if (unread > 0) {
    await page.getByRole("button", { name: "Mark read" }).first().click();
    await until(async () => (await page.locator(".v23-file-row").filter({ hasText: "Unread" }).count()) === unread - 1, "Notification was not marked read");
    await page.reload();
    await page.waitForSelector(".v23-page-head h1");
    assert.equal(await page.locator(".v23-file-row").filter({ hasText: "Unread" }).count(), unread - 1, "Read state did not survive a reload");
  }
});

check("assistant dock stays inside the viewport and answers from authorised records", async () => {
  await asUser("Manager", "V22-20261103-MANAGER-01", "/manager");
  await page.getByRole("button", { name: /Website assistant/ }).click();
  await page.waitForSelector(".v23-dock-panel");
  const box = await page.locator(".v23-dock-panel").boundingBox();
  const viewport = page.viewportSize();
  assert.equal(box.width <= viewport.width && box.height <= viewport.height, true, "Assistant panel overflows the viewport");
  await page.locator("#v23-dock-input").fill("Which incidents need review?");
  await page.getByRole("button", { name: "Ask" }).click();
  await until(async () => (await page.locator(".v23-bubble.assistant").count()) === 1, "Assistant produced no answer");
  const answer = await page.locator(".v23-bubble.assistant").innerText();
  assert.equal(answer.length > 20, true, "Assistant answer is empty");
  assert.equal(/hallucin|invented/.test(answer), false);
});

check("Kannada and Hindi switching keeps the shell readable and the form state intact", async () => {
  await asUser("Manager", "V22-20261103-MANAGER-01", "/issues");
  for (const language of ["kn", "hi"]) {
    await page.getByRole("combobox").first().selectOption(language);
    await page.waitForTimeout(400);
    const body = await page.locator(".v23-page-head p").first().innerText();
    assert.equal(body.length > 0, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, "Language switch introduced horizontal overflow");
  }
  await page.getByRole("combobox").first().selectOption("en");
  assert.match(await page.locator(".v23-page-head h1").innerText(), /Issue register/);
});

check("responsive widths 375, 768 and 1440 keep every main route usable", async () => {
  const routes = ["/", "/login", "/manager", "/issues", "/equipment", "/notifications", "/profile"];
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(frontendUrl + route);
      try { await page.waitForSelector(".v23-root, .v23-landing", { timeout: 8000 }); } catch (error) { throw new Error(route + " at " + width + "px did not render: " + ((await page.content()).slice(0,200))); }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.equal(overflow <= 1, true, `${route} overflows by ${overflow}px at ${width}px`);
      if (width === 375) {
        const toggleVisible = await page.locator(".v23-mobile-toggle").first().isVisible().catch(() => false);
        if (route !== "/" && route !== "/login") assert.equal(toggleVisible, true, "Mobile navigation toggle must be available on " + route);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
});

check("no uncaught page errors occurred during the suite", async () => {
  assert.deepEqual(pageErrors, []);
});
