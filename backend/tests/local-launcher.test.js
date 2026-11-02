const { fork } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const { projectRoot, repositoryRoot, backupRoot } = require("../scripts/paths");
const children = new Set();
const headers = { "x-demo-user": "LOCAL-LAUNCH-TEST", "x-demo-role": "Manager" };
jest.setTimeout(45000);
function child(file, args, options = {}) {
  const process = fork(file, args, { cwd: repositoryRoot, silent: true, ...options });
  children.add(process);
  return process;
}
function ready(process, pattern) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(Error("Application startup timed out")), 25000);
    process.stdout.on("data", chunk => { output += chunk; const match = output.match(pattern); if (match) { clearTimeout(timer); resolve(match); } });
    process.once("exit", code => { clearTimeout(timer); reject(Error("Application startup exited " + code)); });
  });
}
async function stop(process) {
  if (process.exitCode !== null) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { process.kill(); reject(Error("Application did not shut down gracefully")); }, 15000);
    process.once("exit", () => { clearTimeout(timer); resolve(); });
    if (process.connected) process.send({ type: "toolsathi:shutdown" }); else process.kill();
  });
}
async function ports() {
  const servers = [net.createServer(), net.createServer()];
  await Promise.all(servers.map(server => new Promise(resolve => server.listen(0, "127.0.0.1", resolve))));
  const values = servers.map(server => server.address().port);
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
  return values;
}
const offline = () => ({ ...process.env, NODE_ENV: "development", CDS_ENV: "development", DATABASE_MODE: "hana", AUTH_MODE: "header", HANA_SQL_ENDPOINT: "", HANA_USER: "", HANA_PASSWORD: "", HANA_SCHEMA: "" });
afterAll(async () => { await Promise.all([...children].map(stop)); });
test("combined fresh launcher starts SQLite and Vite, proxies real tools and stops both children", async () => {
  const [backendPort, frontendPort] = await ports();
  const process = child(path.join(repositoryRoot, "scripts/dev.js"), ["--fresh"], { env: { ...offline(), TOOLSATHI_BACKEND_PORT: String(backendPort), TOOLSATHI_FRONTEND_PORT: String(frontendPort) } });
  await ready(process, /ToolSathi database: sqlite/);
  const deadline = Date.now() + 15000;
  let response;
  while (Date.now() < deadline) {
    try { response = await fetch(`http://localhost:${frontendPort}/api/tools`, { headers }); if (response.ok) break; } catch { /* Vite is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  expect(response.status).toBe(200);
  expect((await response.json()).tools).toHaveLength(3);
  await stop(process);
  for (const port of [backendPort, frontendPort]) await expect(fetch(`http://localhost:${port}/api/health`)).rejects.toThrow();
});
test("direct server launch from repository root anchors a relative SQLite path in backend", async () => {
  const name = `cwd-${require("node:crypto").randomUUID()}.sqlite`;
  const rootFileBefore = fs.existsSync(path.join(repositoryRoot, "db.sqlite"));
  const process = child(path.join(projectRoot, "srv/server.js"), ["--database=sqlite"], { env: { ...offline(), CDS_REQUIRES_DB_CREDENTIALS_URL: "../backup/" + name, PORT: "0" } });
  const match = await ready(process, /ToolSathi SIMULATED: (http:\/\/localhost:\d+)\/api/);
  expect((await (await fetch(match[1] + "/api/tools", { headers })).json()).tools).toHaveLength(3);
  expect(fs.existsSync(path.join(backupRoot, name))).toBe(true);
  expect(fs.existsSync(path.join(repositoryRoot, "db.sqlite"))).toBe(rootFileBefore);
  await stop(process);
});
test("combined launcher reports a port conflict without stopping the existing listener", async () => {
  const [backendPort, frontendPort] = await ports();
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(frontendPort, "127.0.0.1", resolve));
  try {
    const process = child(path.join(repositoryRoot, "scripts/dev.js"), ["--fresh"], { env: { ...offline(), TOOLSATHI_BACKEND_PORT: String(backendPort), TOOLSATHI_FRONTEND_PORT: String(frontendPort) } });
    let output = "";
    process.stderr.on("data", chunk => { output += chunk; });
    const code = await new Promise(resolve => process.once("exit", resolve));
    expect(code).toBe(1);
    expect(output).toContain(`Port ${frontendPort} is occupied`);
    expect(listener.listening).toBe(true);
    await expect(fetch(`http://localhost:${backendPort}/api/health`)).rejects.toThrow();
  } finally { await new Promise(resolve => listener.close(resolve)); }
});
