const { fork } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const backend = path.join(root, "backend");
const frontend = path.join(root, "frontend");
const backendPort = Number(process.env.TOOLSATHI_BACKEND_PORT || 4004);
const frontendPort = Number(process.env.TOOLSATHI_FRONTEND_PORT || 5173);
const fresh = process.argv.includes("--fresh");
const sqlite = fresh || process.argv.includes("--sqlite");
const children = [];
let stopping = false;
async function freePort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error("Choose valid local application ports.");
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () => reject(Error(`Port ${port} is occupied. Stop the existing server before running the combined launcher.`)));
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  await Promise.all(children.map(({ child, role }) => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => { child.kill(); resolve(); }, 12000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    if (role === "backend" && child.connected) child.send({ type: "toolsathi:shutdown" });
    else child.kill();
  })));
  if (process.connected) process.disconnect();
}
function launch(role, file, args, cwd, env) {
  const child = fork(file, args, { cwd, env, stdio: ["inherit", "inherit", "inherit", "ipc"] });
  children.push({ child, role });
  child.once("error", () => { console.error(`Could not start ${role}.`); void stop(1); });
  child.once("exit", code => {
    if (!stopping) { console.error(`${role} exited; stopping the other application process.`); void stop(code || 1); }
  });
}
async function main() {
  for (const file of [path.join(backend, "node_modules/@sap/cds/package.json"), path.join(frontend, "node_modules/vite/bin/vite.js")])
    if (!fs.existsSync(file)) throw Error("Install dependencies first: npm --prefix backend ci and npm --prefix frontend ci.");
  if (backendPort === frontendPort) throw Error("Backend and frontend require different ports.");
  await Promise.all([freePort(backendPort), freePort(frontendPort)]);
  if (stopping) return;
  const backendEnv = { ...process.env, NODE_ENV: "development", CDS_ENV: "development", AUTH_MODE: "header", ENFORCE_APPROVALS: "true", ALLOW_UNAPPROVED_MOCKS: "false", PORT: String(backendPort) };
  if (sqlite) backendEnv.DATABASE_MODE = "sqlite";
  if (fresh) {
    const backup = path.join(root, "backup");
    fs.mkdirSync(backup, { recursive: true });
    backendEnv.CDS_REQUIRES_DB_CREDENTIALS_URL = path.join(backup, `demo-${require("node:crypto").randomUUID()}.sqlite`);
    console.log(`Fresh isolated SQLite demo: ${backendEnv.CDS_REQUIRES_DB_CREDENTIALS_URL}`);
  }
  launch("backend", path.join(backend, "srv/server.js"), sqlite ? ["--database=sqlite"] : [], backend, backendEnv);
  launch("frontend", path.join(frontend, "node_modules/vite/bin/vite.js"), ["--host", "127.0.0.1", "--port", String(frontendPort), "--strictPort"], frontend, {
    ...process.env, VITE_API_BASE_URL: "/api", API_PROXY_TARGET: `http://localhost:${backendPort}`,
    TOOLSATHI_VITE_CACHE_DIR: process.env.TOOLSATHI_VITE_CACHE_DIR || path.join(frontend, "node_modules", `.vite-${frontendPort}`),
  });
  console.log(`Starting ToolSathi: http://localhost:${frontendPort} (API http://localhost:${backendPort}/api). Ctrl+C stops both processes.`);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => { void stop(); });
if (process.send) process.on("message", message => { if (message?.type === "toolsathi:shutdown") void stop(); });
main().catch(error => { console.error(error.message); void stop(1); });
