// Explicit live application check: creates one labelled synthetic report through the UI.
// HANA credentials are read only by the backend child used for final persistence verification.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chromium } from "playwright";
const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.resolve(frontend, "../backend");
const output = path.join(frontend, "test-results");
const frontendUrl = process.env.HANA_UI_FRONTEND_URL || "http://localhost:5173";
const apiUrl = process.env.HANA_UI_BACKEND_URL || "http://localhost:4004";
for (const url of [frontendUrl, apiUrl]) assert.ok(["localhost", "127.0.0.1"].includes(new URL(url).hostname), "Use the local ToolSathi application servers.");
let browser, page, incidentId;
const original = "  \u0c9f\u0cc2\u0cb2\u0ccd B - browser HANA verification " + randomUUID() + "\n  ";
const report = { executedAt: new Date().toISOString(), verificationScope: "one new synthetic incident in the confirmed application schema", checks: [], pageErrors: [], consoleErrors: [], failedRequests: [], traces: [], hanaPersistenceVerified: false };
const requests = [];
const headers = { "content-type": "application/json", "x-demo-user": "HANA-BROWSER-VERIFY", "x-demo-role": "Manager" };
function check(name, fn) {
  test(name, { timeout: 120000 }, async () => {
    if (report.checks.some(check => check.status === "FAILED")) throw new Error("An earlier browser step failed; dependent actions were not attempted.");
    try { await fn(); report.checks.push({ name, status: "PASSED" }); }
    catch (error) {
      report.checks.push({ name, status: "FAILED", message: error.message });
      await page?.screenshot({ path: path.join(output, "hana-browser-failure.png"), fullPage: true }).catch(() => {});
      throw error;
    }
  });
}
async function skipIntro() {
  const skip = page.getByRole("button", { name: /skip/i });
  if (await skip.count()) await skip.first().click();
}
async function navigate(route) { await page.goto(frontendUrl + route); await skipIntro(); }
before(async () => {
  fs.mkdirSync(output, { recursive: true });
  const candidates = [process.env.BROWSER_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].filter(Boolean);
  const executablePath = candidates.find(file => fs.existsSync(file));
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(45000);
  page.on("pageerror", error => report.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") report.consoleErrors.push(message.text()); });
  page.on("requestfailed", request => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED") report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on("request", request => { if (request.url().includes("/api/")) requests.push({ url: request.url(), method: request.method() }); });
}, { timeout: 60000 });
after(async () => {
  report.incidentId = incidentId;
  fs.writeFileSync(path.join(output, "hana-browser-summary.json"), JSON.stringify(report, null, 2) + "\n");
  await browser?.close();
});
check("live tool register and manual worker reporting use real APIs", async () => {
  await navigate("/worker");
  await page.getByLabel("Tool register").locator('option[value="TOOL-B"]').waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Worker local demo role" }).first().click();
  await page.getByLabel("Tool register").selectOption("TOOL-B");
  await page.getByRole("button", { name: "Confirm Tool & Proceed" }).click();
  await page.getByRole("button", { name: "Continue to Report" }).click();
  await page.getByRole("button", { name: "Load synthetic demo report" }).click();
  await page.getByLabel("Reporter ID (required)").fill("HANA-BROWSER-" + randomUUID());
  await page.getByLabel("Original report").fill(original);
  assert.equal(await page.getByRole("button", { name: "Structure with AI" }).isDisabled(), true);
  await page.getByRole("button", { name: "Review Manual Incident Card" }).click();
});
check("one real save and a separate confirmation persist exact report text", async () => {
  const created = page.waitForResponse(response => response.url().endsWith("/api/incidents") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save Incident", exact: true }).click({ clickCount: 2 });
  const response = await created;
  assert.equal(response.status(), 201);
  const value = await response.json();
  incidentId = value.incident.incidentId;
  assert.equal(value.incident.state, "Reported");
  assert.equal(value.incident.rawText, original);
  assert.equal(value.incident.confidence, null);
  assert.equal(value.incident.modelVersion, null);
  await page.getByRole("button", { name: "Confirm Incident", exact: true }).waitFor();
  assert.equal(requests.filter(request => request.url.endsWith("/api/incidents") && request.method === "POST").length, 1);
  assert.equal(requests.filter(request => request.url.endsWith("/confirm")).length, 0);
  await page.getByRole("button", { name: "Confirm Incident", exact: true }).click();
  await page.getByRole("heading", { name: `Incident Confirmed: ${incidentId}` }).waitFor();
});
check("starting another report clears the previous category, translation and time", async () => {
  await page.getByRole("button", { name: "Report Another Issue" }).click();
  await page.getByRole("button", { name: "Confirm Tool & Proceed" }).click();
  await page.getByRole("button", { name: "Continue to Report" }).click();
  assert.equal(await page.getByLabel("Original report").inputValue(), "");
  await page.getByLabel("Original report").fill("An unsaved independent report");
  await page.getByRole("button", { name: "Review Manual Incident Card" }).click();
  for (const label of ["Category (optional)", "Reported at (UTC ISO timestamp, optional)", "Translated report", "Suggested NC code"])
    assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), "");
});
check("HANA-backed console shows 35/100/160, uncertainty, evidence and audit", async () => {
  await navigate("/console");
  await page.getByTestId("trace-result").waitFor();
  for (const [hours, count, score] of [[24, 35, 100], [72, 100, 82], [168, 160, 83]]) {
    const response = page.waitForResponse(response => response.url().includes(`/trace?window=${hours}`) && response.status() === 200);
    await page.getByRole("button", { name: `Trace ${hours} hours`, exact: true }).click();
    const trace = await (await response).json();
    await page.getByRole("heading", { name: `${count} Assemblies Potentially Exposed` }).waitFor();
    assert.equal(trace.dataQuality.score, score);
    assert.deepEqual([trace.exposureRange.low, trace.exposureRange.high, trace.exposureRange.unknownSeparate], [35, 154, 6]);
    if (hours === 72) {
      assert.equal(trace.summary.byLocation.IN_STOCK, 40);
      assert.deepEqual(trace.summary.shippedByDealer, { "DLR-X": 35, "DLR-Y": 25 });
      assert.equal(trace.summary.byTier.UNKNOWN, 6);
      assert.ok(trace.gaps.some(gap => gap.code === "MISSING_TOOL_USE_RECORD"));
      assert.ok(trace.gaps.some(gap => gap.code === "TIMESTAMP_CONFLICT"));
    }
    report.traces.push({ hours, summary: trace.summary, dataQuality: trace.dataQuality, exposureRange: trace.exposureRange });
  }
  await page.getByRole("heading", { name: "Application Audit History" }).waitFor();
  await page.getByText("TRACE_GENERATED", { exact: true }).first().waitFor();
  await page.screenshot({ path: path.join(output, "hana-console-desktop.png"), fullPage: true });
});
check("unavailable workflows stay disabled and all four actions reject missing approvals", async () => {
  assert.equal(await page.getByRole("button", { name: "Approve and Dispatch" }).isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "Verify Return to Service" }).isDisabled(), true);
  assert.match(await page.locator("body").textContent(), /No simulated documents exist/);
  for (const route of ["s4/maintenance-notifications", "s4/quality-notifications", "s4/stock-blocks", "dm/tool-restrictions"]) {
    const payload = { incidentId, toolId: "TOOL-B", shortText: "Browser integration check", priority: "2", requestedBy: "HANA-BROWSER-VERIFY", batchIds: ["BATCH-B-DUP"], plant: "PLANT-01", storageLocation: "STORE-01", reason: "Unapproved verification request", action: "RESTRICT" };
    const response = await fetch(apiUrl + "/api/mock/" + route, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, "APPROVAL_REQUIRED");
  }
  await navigate("/history");
  await page.getByText(/TS-0001/).first().waitFor();
  assert.match(await page.locator("body").textContent(), /CALIBRATION/);
});
check("all routes and mobile console render without browser errors", async () => {
  for (const route of ["/", "/kitchen", "/unknown-route", "/console"]) await navigate(route);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("trace-result").waitFor();
  const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(sizes.page <= sizes.viewport + 1);
  for (const hours of [24, 72, 168]) {
    const bounds = await page.getByRole("button", { name: `Trace ${hours} hours`, exact: true }).boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= sizes.viewport + 1, `Mobile ${hours}h control is clipped`);
  }
  await page.screenshot({ path: path.join(output, "hana-console-mobile.png"), fullPage: true });
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.failedRequests, []);
});
check("direct HANA reads verify the browser-created incident, traces and audit", async () => {
  const output = execFileSync(process.execPath, ["scripts/hana.js", "record", "--incident=" + incidentId], { cwd: backend, encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
  const proof = JSON.parse(output);
  assert.equal(proof.mode, "hana");
  assert.equal(proof.targetSchemaMatches, true);
  assert.equal(proof.state, "Confirmed");
  assert.equal(proof.rawTextHash, createHash("sha256").update(original).digest("hex"));
  assert.deepEqual(proof.traceWindows, [24, 72, 168]);
  for (const action of ["INCIDENT_CREATED", "INCIDENT_CONFIRMED", "TRACE_GENERATED"]) assert.ok(proof.auditActions.includes(action));
  report.hanaPersistenceVerified = true;
});
