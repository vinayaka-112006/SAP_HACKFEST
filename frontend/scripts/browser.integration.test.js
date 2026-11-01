import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { fork, execFileSync } from "node:child_process";
import { chromium } from "playwright";
const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repo = path.dirname(frontend),
  backend = path.join(repo, "backend");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "toolsathi-browser-"));
fs.mkdirSync(output, { recursive: true });
const testTemp = fs.mkdtempSync(path.join(backend, ".browser-integration-"));
const database = path.join(testTemp, "runtime.sqlite");
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5174);
const frontendUrl = `http://localhost:${frontendPort}`;
let apiUrl, backendProcess, viteProcess, browser, page, context;
const pageErrors = [],
  requests = [],
  traces = [];
const report = {
  label: "synthetic data, simulated services",
  automatedBrowser: true,
  mainDatabaseReset: false,
  checks: [],
  pageErrors,
};
const headers = {
  "content-type": "application/json",
  "x-demo-user": "E2E-REVIEW",
  "x-demo-role": "Manager",
};
async function waitForOutput(child, pattern) {
  let text = "";
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Server startup timed out: " + text)),
      25000,
    );
    child.stdout.on("data", (chunk) => {
      text += chunk;
      const match = text.match(pattern);
      if (match) {
        clearTimeout(timer);
        resolve(match);
      }
    });
    child.stderr.on("data", (chunk) => {
      text += chunk;
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Server exited " + code + ": " + text));
    });
  });
}
async function until(fn, message) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(message);
}
async function skipIntro(target) {
  const skip = target.getByRole("button", { name: /skip/i });
  if (await skip.count()) await skip.first().click();
  await until(
    async () => !(await target.locator(".intro-container").count()),
    "Intro did not close",
  );
}
function check(name, fn) {
  test(name, { timeout: 45000 }, async () => {
    try {
      await fn();
      report.checks.push({ name, status: "PASSED" });
    } catch (error) {
      report.checks.push({ name, status: "FAILED", message: error.message });
      console.error(error.message);
      await page
        ?.screenshot({ path: path.join(output, "failure.png"), fullPage: true })
        .catch(() => {});
      throw error;
    }
  });
}
before(
  async () => {
    backendProcess = fork("srv/server.js", [], {
      execArgv: ['--require', path.join(backend, 'tests/fixtures/recovery-provider.cjs')],
      cwd: backend,
      silent: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
        CDS_ENV: "development",
        DATABASE_MODE: "sqlite",
        AUTH_MODE: "header",
        ENFORCE_APPROVALS: "true",
        ALLOW_UNAPPROVED_MOCKS: "false",
        CDS_REQUIRES_DB_CREDENTIALS_URL: database,
        PORT: "0",
        CORS_ORIGINS: frontendUrl,
      },
    });
    apiUrl = (
      await waitForOutput(
        backendProcess,
        /ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/,
      )
    )[1];
    viteProcess = fork(
      path.join(frontend, "node_modules/vite/bin/vite.js"),
      ["--host", "127.0.0.1", "--port", String(frontendPort), "--strictPort"],
      {
        cwd: frontend,
        silent: true,
        env: {
          ...process.env,
          VITE_API_BASE_URL: "/api",
          VITE_DEMO_AUTH: "true",
          VITE_AI_ENABLED: "false",
          API_PROXY_TARGET: apiUrl,
          TOOLSATHI_VITE_CACHE_DIR: path.join(output, `vite-${frontendPort}`),
        },
      },
    );
    await waitForOutput(viteProcess, /Local:\s+(http:\/\/[^\s]+)/);
    const candidates = [
      process.env.BROWSER_PATH,
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ].filter(Boolean);
    const executablePath = candidates.find((file) => fs.existsSync(file));
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    context = await browser.newContext({
      viewport: { width: 1440, height: 1050 },
    });
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      if (request.url().includes("/api/"))
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        });
    });
    page.on("response", async (response) => {
      if (response.url().includes("/trace?") && response.status() === 200) {
        // Navigation can dispose a response body after its status event.
        const trace = await response.json().catch(() => null);
        if (!trace) return;
        traces.push({
          traceId: trace.traceId,
          windowHours: trace.windowHours,
          summary: trace.summary,
          dataQuality: trace.dataQuality,
          exposureRange: trace.exposureRange,
        });
      }
    });
    report.frontendUrl = frontendUrl;
    report.backendUrl = apiUrl + "/api";
  },
  { timeout: 60000 },
);
after(async () => {
  report.trace = traces;
  report.executedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(repo, "docs", "frontend-integration-results.json"),
    JSON.stringify({ browser: report }, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(output, "browser-summary.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser?.close();
  if (viteProcess && viteProcess.exitCode === null) {
    const closed = new Promise((resolve) => viteProcess.once("exit", resolve));
    viteProcess.kill();
    await closed;
  }
  if (backendProcess && backendProcess.exitCode === null) {
    const closed = new Promise((resolve) =>
      backendProcess.once("exit", resolve),
    );
    backendProcess.send({ type: "toolsathi:shutdown" });
    await closed;
  }
  const resolvedTemp = path.resolve(testTemp);
  if (
    path.dirname(resolvedTemp) === path.resolve(backend) &&
    path.basename(resolvedTemp).startsWith(".browser-integration-")
  ) fs.rmSync(resolvedTemp, { recursive: true, force: true });
  const resolvedOutput = path.resolve(output);
  if (
    path.dirname(resolvedOutput) === path.resolve(os.tmpdir()) &&
    path.basename(resolvedOutput).startsWith("toolsathi-browser-")
  ) fs.rmSync(resolvedOutput, { recursive: true, force: true });
});
check(
  "real register, manual QR fallback and explicit synthetic input",
  async () => {
    await page.goto(frontendUrl + "/worker");
    await skipIntro(page);
    await until(
      async () =>
        (await page.getByLabel("Tool register").locator("option").count()) ===
        3,
      "Live tool register did not load",
    );
    await page
      .getByRole("button", { name: "Worker local demo role" })
      .first()
      .click();
    await until(
      async () =>
        (await page.getByLabel("Tool register").locator("option").count()) ===
        3,
      "Role change did not reload register",
    );
    await page.getByLabel("QR contents / tool ID").fill("UNKNOWN-TOOL");
    await page.getByRole("button", { name: "Resolve tool code" }).click();
    assert.match(
      await page.getByRole("alert").textContent(),
      /Unknown tool code/,
    );
    await page.getByLabel("QR contents / tool ID").fill("TOOL-B");
    await page.getByRole("button", { name: "Resolve tool code" }).click();
    await page.getByRole("button", { name: "Confirm Tool & Proceed" }).click();
    await page.getByRole("button", { name: "Continue to Report" }).click();
    await page
      .getByRole("button", { name: "Load synthetic demo report" })
      .click();
    await page.getByLabel('Worker name (optional, reporter supplied)', { exact: true }).fill('Synthetic Worker One');
    assert.equal(
      await page.getByLabel("Reporter ID (required)").inputValue(),
      "WRK-014",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Structure with AI" })
        .isDisabled(),
      true,
    );
    assert.match(
      await page.locator("body").textContent(),
      /AI extraction unavailable/,
    );
  },
);
const original =
  "  \u0c9f\u0cc2\u0cb2\u0ccd \u0cac\u0cbf \u0cac\u0ccb\u0cb2\u0ccd\u0c9f\u0ccd \u0cb8\u0ca1\u0cbf\u0cb2\u0cb5\u0cbe\u0c97\u0cbf\u0ca6\u0cc6\n  ";
let incidentId;
check(
  "typed creation prevents double submission and confirmation requires a second worker action",
  async () => {
    await page.getByLabel("Original report").fill(original);
    await page
      .getByRole("button", { name: "Review Manual Incident Card" })
      .click();
    assert.match(
      await page.locator("body").textContent(),
      /no AI confidence supplied/,
    );
    const save = page.getByRole("button", {
      name: "Save Incident",
      exact: true,
    });
    await save.click({ clickCount: 2 });
    await until(
      async () =>
        (await page
          .getByRole("button", { name: "Confirm Incident", exact: true })
          .count()) === 1,
      "Saved incident confirmation step missing",
    );
    assert.equal(
      requests.filter(
        (r) => r.method === "POST" && r.url.endsWith("/api/incidents"),
      ).length,
      1,
    );
    assert.equal(requests.filter((r) => r.url.endsWith("/confirm")).length, 0);
    const reported = await fetch(apiUrl + "/api/incidents/TS-0002", {
      headers,
    }).then((r) => r.json());
    incidentId = reported.incident.incidentId;
    assert.equal(reported.incident.state, "Reported");
    assert.equal(reported.incident.rawText, original);
    assert.equal(reported.incident.confidence, null);
    assert.equal(reported.incident.modelVersion, null);
    await page
      .getByLabel("Translated report", { exact: true })
      .fill("Operator-corrected English explanation");
    await page
      .getByRole("button", { name: "Confirm Incident", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Incident Confirmed: TS-0002" })
      .waitFor();
    const confirmed = await fetch(apiUrl + "/api/incidents/" + incidentId, {
      headers,
    }).then((r) => r.json());
    assert.equal(confirmed.incident.state, "Confirmed");
    assert.equal(
      confirmed.incident.translatedText,
      "Operator-corrected English explanation",
    );
  },
);
check(
  "actual 72h trace, gaps, evidence and browser CORS work without fabricated results",
  async () => {
    await page.getByRole("button", { name: "Open Incident Details" }).click();
    assert.match(
      await page.locator("body").textContent(),
      /Trace and audit require/,
    );
    await page
      .getByRole("button", { name: "Manager local demo role" })
      .first()
      .click();
    await page.getByTestId("trace-result").waitFor();
    assert.equal(
      await page.getByTestId("trace-result").getAttribute("data-window"),
      "72",
    );
    await page
      .getByRole("heading", { name: "100 Assemblies Potentially Exposed" })
      .waitFor();
    for (const [name, value] of [
      ["factoryStock", "40"],
      ["dealerX", "35"],
      ["dealerY", "25"],
    ])
      assert.equal(
        await page.getByTestId("location-" + name).textContent(),
        value,
      );
    assert.match(
      await page.getByTestId("trace-result").textContent(),
      /35 to 154 units; 6 Unknown separately/,
    );
    assert.equal(
      requests.filter((r) => r.url.includes("/trace?window=72")).length,
      1,
      "Duplicate rendering-triggered trace requests",
    );
    const traceRun = traces.find((run) => run.windowHours === 72);
    assert.ok(traceRun?.traceId, "The persisted trace must expose its run ID");
    const persistedAudit = await fetch(`${apiUrl}/api/audit?incident=${incidentId}`, { headers }).then((response) => response.json());
    assert.ok(persistedAudit.entries.some((entry) => entry.action === "TRACE_GENERATED" && entry.details.traceId === traceRun.traceId));
    await page.getByRole("button", { name: "Why?", exact: true }).click();
    for (const code of [
      "MISSING_TOOL_USE_RECORD",
      "TIMESTAMP_CONFLICT",
      "STALE_SHIPMENT",
    ])
      assert.match(
        await page.getByTestId("trace-result").textContent(),
        new RegExp(code),
      );
    await page
      .getByRole("button", { name: "Inspect SN-000076", exact: true })
      .click();
    const drawer = page.getByRole("dialog", { name: "Unit evidence" });
    assert.match(
      await drawer.textContent(),
      /Cannot determine from current records/,
    );
    assert.match(await drawer.textContent(), /RUN-B-NOREC/);
    await page.getByLabel("Close drawer").click();
    await page
      .getByRole("button", { name: "Inspect SN-000001", exact: true })
      .click();
    assert.match(await drawer.textContent(), /TUE-B-0001-DUP/);
    await page.getByLabel("Close drawer").click();
    const cors = await page.evaluate(async (url) => {
      const response = await fetch(url + "/api/tools", {
        headers: { "x-demo-user": "BROWSER-CORS", "x-demo-role": "Manager" },
      });
      return {
        status: response.status,
        count: (await response.json()).tools.length,
      };
    }, apiUrl);
    assert.deepEqual(cors, { status: 200, count: 3 });
  },
);
check(
  "trace window switching clears stale values and returns 35/100/160 with scores 100/82/83",
  async () => {
    await page.route("**/api/incidents/*/trace?window=24", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.continue();
    });
    await page
      .getByRole("button", { name: "Trace 24 hours", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("heading", { name: "100 Assemblies Potentially Exposed" })
        .count(),
      0,
    );
    await page
      .getByRole("heading", { name: "35 Assemblies Potentially Exposed" })
      .waitFor();
    assert.equal(
      await page.getByTestId("trace-result").getAttribute("data-window"),
      "24",
    );
    await page
      .getByRole("button", { name: "Trace 168 hours", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "160 Assemblies Potentially Exposed" })
      .waitFor();
    await until(
      async () => traces.some((t) => t.windowHours === 168),
      "168h trace response missing",
    );
    for (const [h, n, score] of [
      [24, 35, 100],
      [72, 100, 82],
      [168, 160, 83],
    ]) {
      const t = traces.find((t) => t.windowHours === h);
      assert.equal(t.summary.totalUnits, n);
      assert.equal(t.dataQuality.score, score);
      assert.deepEqual(
        [
          t.exposureRange.low,
          t.exposureRange.high,
          t.exposureRange.unknownSeparate,
        ],
        [35, 154, 6],
      );
    }
    await page.screenshot({
      path: path.join(output, "console-desktop.png"),
      fullPage: true,
    });
  },
);
check(
  "audit, documents, history and implemented workflow evaluation are shown honestly",
  async () => {
    await page
      .getByRole("heading", { name: "Application Audit History" })
      .waitFor();
    await until(
      async () =>
        (await page.locator("body").textContent()).includes("Trace generated"),
      "Trace audit did not load",
    );
    const body = await page.locator("body").textContent();
    assert.match(body, /Authenticated principal/);
    assert.match(body, /Audit ID/);
    assert.doesNotMatch(body, /Subsystem: No model supplied/);
    for (const action of [
      "Incident reported",
      "Incident confirmed",
      "Trace generated",
    ])
      assert.ok(body.includes(action), `Expected audit label ${action}`);
    assert.match(body, /No simulated documents exist/);
    assert.match(body, /Containment & Recovery/);
    assert.match(body, /Incident Evaluation/);
    assert.doesNotMatch(body, /Workflow unavailable|Awaiting Jamuna/);
    assert.doesNotMatch(body, /cryptographic|tamper-evident|LINK ACTIVE/i);
    await page.goto(frontendUrl + "/history");
    await skipIntro(page);
    await until(
      async () =>
        (await page.locator("body").textContent()).includes("TS-0001"),
      "Seeded tool history missing",
    );
    assert.match(await page.locator("body").textContent(), /CALIBRATION/);
    assert.doesNotMatch(await page.locator("body").textContent(), /Merge Reports/);
    await page.getByLabel("Tool history register").selectOption("TOOL-C");
    await until(
      async () =>
        (await page.locator("body").textContent()).includes(
          "No history records for this tool.",
        ),
      "Empty history state missing",
    );
  },
);

check('recovery evidence is persisted, provider failure stays visible, and the executive download contains stored facts', async () => {
  await page.goto(frontendUrl + '/console');
  await skipIntro(page);
  await page.getByRole('heading', { name: '2. Recovery Planning Agent', exact: true }).waitFor();
  await page.getByText('Record reviewed alternative-tool evidence', { exact: true }).click();
  await page.getByLabel('Alternative tool', { exact: true }).selectOption('TOOL-C');
  await page.getByLabel('Compatibility source reference').fill('SYNTHETIC-E2E-SPEC / SHIFT availability');
  await page.getByLabel('Operation compatibility reviewed').check();
  await page.getByLabel('Available for reassignment').check();
  const saved = page.waitForResponse(r => r.url().endsWith(`/incidents/${incidentId}/recovery/evidence`));
  await page.getByRole('button', { name: 'Save reviewed evidence' }).click();
  assert.equal((await saved).status(), 201);
  await page.getByText('Evidence recorded with selected manager identity.').waitFor();
  await page.route('**/api/incidents/*/recovery/plans', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AI_UNAVAILABLE', message: 'Synthetic provider unavailable' } }) }));
  await page.getByRole('button', { name: 'Generate recovery plan', exact: true }).click();
  await page.getByText('Request failed: Synthetic provider unavailable').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Submit recovery proposal' }).count(), 0);
  await page.unroute('**/api/incidents/*/recovery/plans');
  // Provider responses are mocked by a test-only Node preload; the actual read-tool
  // loop, persistence, approval, revalidation and simulation services all execute.
  const planned = page.waitForResponse(r => r.url().endsWith(`/incidents/${incidentId}/recovery/plans`));
  await page.getByRole('button', { name: 'Generate recovery plan', exact: true }).click();
  const generated = await (await planned).json();
  assert.equal(generated.modelVersion, 'TEST-ONLY-MOCK-PROVIDER');
  assert.equal(generated.actionExecuted, false);
  assert.equal(generated.selectedOptionId, 'ALTERNATIVE:TOOL-C');
  await page.getByText(/Recommendation: ALTERNATIVE:TOOL-C/).waitFor();
  await page.getByLabel('Workflow reason').fill('Reviewed synthetic operation and availability evidence');
  await page.getByRole('button', { name: 'Submit recovery proposal', exact: true }).click();
  await page.getByRole('button', { name: 'Approve RECOVERY_PLAN', exact: true }).click();
  const executing = page.waitForResponse(r => r.url().endsWith(`/incidents/${incidentId}/recovery/execute`));
  await page.getByRole('button', { name: 'Execute simulated RECOVERY_PLAN', exact: true }).click();
  const executed = await (await executing).json();
  assert.equal(executed.externalActionExecuted, false);
  assert.equal(executed.alternativeToolId, 'TOOL-C');
  await page.getByText(/Simulated production reassignment recorded/).first().waitFor();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download executive evidence report' }).click();
  const download = await downloading;
  const file = path.join(output, download.suggestedFilename());
  await download.saveAs(file);
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /SYNTHETIC-E2E-SPEC/);
  assert.match(html, /Synthetic Worker One/);
  assert.match(html, /Worker reporting history/);
  assert.match(html, /Recorded state: <strong>Confirmed/);
  assert.match(html, /SIMULATED/);
  assert.match(html, /RECOVERY_EXECUTION/);
  assert.match(html, /TEST-ONLY-MOCK-PROVIDER/);
  assert.doesNotMatch(html, /45\.2|FULLY RESOLVED|spring relaxation|cryptographic hash/);
});

check("console completes proposal approval, simulated restriction, repair and independent verification through the UI", async () => {
  const category = `E2E-LIFECYCLE-${crypto.randomUUID().slice(0, 8)}`;
  let activeIncident;
  const incidentIds = [];
  for (const [index, reportedAt] of [
    "2026-10-30T12:00:00.000Z",
    "2026-10-31T12:00:00.000Z",
    "2026-10-31T13:00:00.000Z",
  ].entries()) {
    const created = await fetch(apiUrl + "/api/incidents", {
      method: "POST",
      headers,
      body: JSON.stringify({
        toolId: "TOOL-C",
        reporterId: `E2E-REPAIR-${index}`,
        language: "en",
        rawText: "Synthetic fixture alignment slips under torque",
        translatedText: "Synthetic fixture alignment slips under torque",
        category,
        reportedAt,
      }),
    }).then((response) => response.json());
    const incident = created.incident;
    incidentIds.push(incident.incidentId);
    const confirmed = await fetch(apiUrl + `/api/incidents/${incident.incidentId}/confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({ confirmedBy: "E2E-REVIEW" }),
    });
    assert.equal(confirmed.status, 200);
    activeIncident = incident;
  }

  await page.goto(frontendUrl + "/console");
  await skipIntro(page);
  await page.getByLabel("Open incident ID").fill(activeIncident.incidentId);
  await page.getByRole("button", { name: "Open Incident", exact: true }).click();
  await page.getByRole("heading", { name: /Containment & Recovery/ }).waitFor();
  await page.getByText(/Threshold met/).first().waitFor();

  await page.getByLabel("Workflow reason").fill("Review recurring synthetic fixture alignment reports");
  const proposalResponse = page.waitForResponse((response) => response.url().endsWith(`/api/incidents/${activeIncident.incidentId}/proposals`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create containment proposal" }).click();
  const proposalResult = await (await proposalResponse).json();
  assert.equal(proposalResult.proposal.state, "Pending");
  assert.equal(proposalResult.actionExecuted, false);
  const proposalId = proposalResult.proposal.proposalId;
  await until(async () => (await page.getByRole('button', { name: 'Approve TOOL_RESTRICTION', exact: true }).count()) === 1, 'Persisted proposal did not load');
  await page.route(`**/api/approvals/${proposalId}/decision`, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEST_UNAVAILABLE', message: 'Synthetic decision service unavailable' } }) }));
  await page.getByRole('button', { name: 'Approve TOOL_RESTRICTION', exact: true }).click();
  await page.getByText('Request failed: Synthetic decision service unavailable').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Execute simulated TOOL_RESTRICTION' }).isDisabled(), true);
  await page.unroute(`**/api/approvals/${proposalId}/decision`);
  await page.getByLabel("Workflow reason").fill("Reviewed the evidence and approved the proposal");
  const approvalResponse = page.waitForResponse((response) => response.url().endsWith(`/api/approvals/${proposalId}/decision`));
  await page.getByRole("button", { name: "Approve TOOL_RESTRICTION", exact: true }).click();
  const approvalResult = await (await approvalResponse).json();
  assert.equal(approvalResult.proposal.state, "Approved");
  assert.equal(approvalResult.actionExecuted, false);
  assert.ok(approvalResult.approval.approvalId);
  assert.equal(await page.getByLabel("Persisted Approval ID").count(), 0);
  assert.equal(await page.getByLabel("Approval ID").count(), 0);
  await until(async () => page.getByRole("button", { name: "Execute simulated TOOL_RESTRICTION" }).isEnabled(), "Approved action did not become available after backend refresh");
  assert.equal(await page.getByRole("button", { name: "Execute simulated TOOL_RESTRICTION" }).isEnabled(), true);
  const restrictionResponse = page.waitForResponse((response) => response.url().endsWith("/api/mock/dm/tool-restrictions"));
  await page.getByRole("button", { name: "Execute simulated TOOL_RESTRICTION" }).click();
  assert.equal((await restrictionResponse).status(), 200);
  await page.getByText('Simulated action recorded by backend.').waitFor();

  await page.getByRole("button", { name: "Technician local demo role" }).first().click();
  await page.getByLabel("Local demo user ID").fill("E2E-TECHNICIAN");
  await page.getByLabel("Repair description").fill("Adjusted synthetic fixture and documented inspection");
  const repairStartResponse = page.waitForResponse((response) => response.url().endsWith(`/api/incidents/${activeIncident.incidentId}/repairs`));
  await page.getByRole("button", { name: "Start repair", exact: true }).click();
  const repairStart = await (await repairStartResponse).json();
  const repairId = repairStart.repair.repairId;
  await page.getByText('Repair log saved.').waitFor();
  const completionResponse = page.waitForResponse((response) => response.url().endsWith(`/api/repairs/${repairId}/complete`));
  for (const name of ['Fixture torque', 'Alignment']) {
    await page.getByLabel('Reading name', { exact: true }).fill(name);
    await page.getByLabel('Reading result', { exact: true }).selectOption('pass');
    await page.getByRole('button', { name: 'Add reading', exact: true }).click();
  }
  await page.getByRole("button", { name: "Submit repair readings" }).click();
  assert.equal((await completionResponse).status(), 200);

  await page.getByRole("button", { name: "Verifier local demo role" }).first().click();
  await page.getByLabel("Local demo user ID").fill("E2E-INDEPENDENT-VERIFIER");
  const verificationResponse = page.waitForResponse((response) => response.url().endsWith(`/api/incidents/${activeIncident.incidentId}/verify-return`));
  await page.getByRole("button", { name: "Verify return to service", exact: true }).click();
  const verification = await (await verificationResponse).json();
  assert.equal(verification.toolState.to, "Active");
  assert.equal(verification._label, "SIMULATED");

  // The remembered console incident is the third report; explicitly select the first
  // history item and verify that both read-only evaluations follow that selection.
  await page.goto(frontendUrl + "/history");
  await skipIntro(page);
  await page.getByLabel("Tool history register").selectOption("TOOL-C");
  const selectedHistoryIncident = incidentIds[0];
  await page.getByRole('button', { name: `Evaluate incident ${selectedHistoryIncident}`, exact: true }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: `Evaluate incident ${selectedHistoryIncident}`, exact: true }).first().getAttribute('aria-pressed'), 'false');
  assert.doesNotMatch(await page.locator("body").textContent(), /REPEAT PATTERN FLAGGED/);
  await page.getByRole("button", { name: `Evaluate incident ${selectedHistoryIncident}` }).first().click();
  await page.getByText('Selected for duplicate and repeat-failure evaluation', { exact: true }).first().waitFor();
  await until(
    async () => requests.some((request) => request.url.endsWith(`/api/incidents/${selectedHistoryIncident}/repeat-failures`)),
    "History evaluation did not call the selected incident endpoint",
  );
  assert.equal(selectedHistoryIncident !== activeIncident.incidentId, true);
  assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
});
check(
  "network error recovery, role access and mobile layout do not crash",
  async () => {
    const mobile = await context.newPage();
    mobile.on("pageerror", (error) => pageErrors.push(error.message));
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.route("**/api/tools", (route) => route.abort());
    await mobile.goto(frontendUrl + "/worker");
    await skipIntro(mobile);
    await mobile
      .getByRole("alert")
      .filter({ hasText: "Cannot reach the backend" })
      .waitFor();
    await mobile.unroute("**/api/tools");
    await mobile
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await until(
      async () =>
        (await mobile.getByLabel("Tool register").locator("option").count()) ===
        3,
      "Register retry failed",
    );
    const widths = await mobile.evaluate(() => ({
      body: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    assert.ok(
      widths.body <= widths.viewport + 1,
      `Mobile horizontal overflow: ${JSON.stringify(widths)}`,
    );
    await mobile.screenshot({
      path: path.join(output, "worker-mobile.png"),
      fullPage: true,
    });
    await mobile.goto(frontendUrl + "/console");
    await skipIntro(mobile);
    await mobile.getByLabel("Open incident ID").fill(incidentId);
    await mobile
      .getByRole("button", { name: "Open Incident", exact: true })
      .click();
    await mobile.getByTestId("trace-result").waitFor();
    const consoleWidths = await mobile.evaluate(() => ({
      body: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    assert.ok(
      consoleWidths.body <= consoleWidths.viewport + 1,
      JSON.stringify(consoleWidths),
    );
    await mobile.screenshot({
      path: path.join(output, "console-mobile.png"),
      fullPage: true,
    });
    await mobile.close();
    await page.goto(frontendUrl + "/console");
    await skipIntro(page);
    await page.getByTestId("trace-result").waitFor();
    await page
      .getByRole("button", { name: "Worker local demo role" })
      .first()
      .click();
    assert.equal(await page.getByTestId("trace-result").count(), 0);
    await page
      .getByRole("button", { name: "Verifier local demo role" })
      .first()
      .click();
    await page.getByTestId("trace-result").waitFor();
    assert.equal(pageErrors.length, 0, JSON.stringify(pageErrors));
  },
);

check('existing backend smoke and health/stub verification pass on isolated data',async()=>{
 const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 const env={...process.env,BASE_URL:apiUrl,SMOKE_NO_ARTIFACTS:"true"};
 for(const command of ['smoke','verify:stubs']){
  const text=execFileSync(process.execPath,[npm,'run',command],{cwd:backend,env,encoding:'utf8',timeout:30000});
  assert.ok(command==='smoke'?text.includes('VERIFIED_APPROVAL_REJECTION'):/\b\d+ endpoints passed\b/.test(text));
 }
 report.backendSmoke='PASSED';report.backendStubVerification='PASSED';
});

check("manual fallback with AI disabled works and the next report clears old structured fields", async () => {
  const worker = await context.newPage();
  worker.on("pageerror", error => pageErrors.push(error.message));
  try {
    await worker.goto(frontendUrl + "/worker");
    await skipIntro(worker);
    await until(async () => await worker.getByLabel("Tool register").locator("option").count() === 3, "Worker tools did not load");
    await worker.getByRole("button", { name: "Worker local demo role" }).first().click();
    await worker.getByRole("button", { name: "Confirm Tool & Proceed" }).click();
    await worker.getByRole("button", { name: "Continue to Report" }).click();
    await worker.getByRole("button", { name: "Load synthetic demo report" }).click();
    const reviewed = "Typed text explicitly reviewed before saving";
    await worker.getByLabel("Original report").fill(reviewed);
    assert.equal(await worker.getByRole("button", { name: "Start recording voice report" }).isDisabled(), true);
    await worker.getByRole("button", { name: "Review Manual Incident Card" }).click();
    const saved = worker.waitForResponse(response => response.url().endsWith("/api/incidents") && response.request().method() === "POST");
    await worker.getByRole("button", { name: "Save Incident", exact: true }).click();
    const created = await (await saved).json();
    assert.equal(created.incident.rawText, reviewed);
    await worker.getByRole("button", { name: "Confirm Incident", exact: true }).click();
    await worker.getByRole("heading", { name: `Incident Confirmed: ${created.incident.incidentId}` }).waitFor();
    await worker.getByRole("button", { name: "Report Another Issue" }).click();
    await worker.getByRole("button", { name: "Confirm Tool & Proceed" }).click();
    await worker.getByRole("button", { name: "Continue to Report" }).click();
    assert.equal(await worker.getByLabel("Original report").inputValue(), "");
    await worker.getByLabel("Original report").fill("Independent follow-up report");
    await worker.getByRole("button", { name: "Review Manual Incident Card" }).click();
    for (const label of ["Category (optional)", "Reported at (UTC ISO timestamp, optional)", "Translated report", "Suggested NC code"])
      assert.equal(await worker.getByLabel(label, { exact: true }).inputValue(), "");
    report.manualFallbackWithAiDisabled = true;
    report.microphoneHardwareVerified = false;
    assert.equal(pageErrors.length, 0);
  } finally { await worker.close(); }
});
