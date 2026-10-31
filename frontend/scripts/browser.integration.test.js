import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fork, execFileSync } from "node:child_process";
import { chromium } from "playwright";
const frontend = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repo = path.dirname(frontend),
  backend = path.join(repo, "backend");
const output = path.join(frontend, "test-results");
fs.mkdirSync(output, { recursive: true });
const database = path.join(
  repo,
  "backup",
  `browser-integration-${crypto.randomUUID()}.sqlite`,
);
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
    fs.mkdirSync(path.dirname(database), { recursive: true });
    backendProcess = fork("srv/server.js", [], {
      cwd: backend,
      silent: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
        CDS_ENV: "development",
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
          VITE_WORKFLOW_ENABLED: "false",
          API_PROXY_TARGET: apiUrl,
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
        const trace = await response.json();
        traces.push({
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
  "audit/documents/history are real and unavailable human workflow stays blocked",
  async () => {
    await page
      .getByRole("heading", { name: "Application Audit History" })
      .waitFor();
    await until(
      async () =>
        (await page.locator("body").textContent()).includes("TRACE_GENERATED"),
      "Trace audit did not load",
    );
    const body = await page.locator("body").textContent();
    for (const action of [
      "INCIDENT_CREATED",
      "INCIDENT_CONFIRMED",
      "TRACE_GENERATED",
    ])
      assert.match(body, new RegExp(action));
    assert.match(body, /No simulated documents exist/);
    assert.match(body, /Workflow unavailable/);
    assert.equal(
      await page
        .getByRole("button", { name: "Approve and Dispatch" })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Verify Return to Service" })
        .isDisabled(),
      true,
    );
    assert.doesNotMatch(body, /cryptographic|tamper-evident|LINK ACTIVE/i);
    await page.goto(frontendUrl + "/history");
    await skipIntro(page);
    await until(
      async () =>
        (await page.locator("body").textContent()).includes("TS-0001"),
      "Seeded tool history missing",
    );
    assert.match(await page.locator("body").textContent(), /CALIBRATION/);
    assert.equal(
      await page.getByRole("button", { name: "Merge Reports" }).isDisabled(),
      true,
    );
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
 const env={...process.env,BASE_URL:apiUrl};
 for(const command of ['smoke','verify:stubs']){
  const text=execFileSync(process.execPath,[npm,'run',command],{cwd:backend,env,encoding:'utf8',timeout:30000});
  assert.ok(command==='smoke'?text.includes('VERIFIED_APPROVAL_REJECTION'):text.includes('6 endpoints passed'));
 }
 report.backendSmoke='PASSED';report.backendStubVerification='PASSED';
});
