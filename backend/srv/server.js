const databaseConfig = require("./lib/database-config");
// Resolve the CAP project and SQLite file consistently, including launches from repository root.
process.chdir(databaseConfig.projectRoot);
databaseConfig.loadEnvironment();
const cds = require("@sap/cds");
let database, configurationError;
try {
  database = databaseConfig.configureDatabase(cds, {
    mode: process.argv.find(arg => arg.startsWith("--database="))?.split("=")[1],
  });
} catch (error) { configurationError = error; }
const express = require("express");
const cors = require("cors");
const { loadRouters } = require("./lib/router-loader");
const errors = require("./lib/errors");
cds.on("served", async () => {
  if (cds.db.kind !== "sqlite") throw new Error("ToolSathi requires SQLite");
  // Additive, backed-up deployment: creates missing tables without touching existing rows.
  const sqliteFile = cds.env.requires.db.credentials?.url || "db.sqlite";
  await require("./lib/schema-migration").ensure(cds.db, {
    file: sqliteFile,
    model: cds.model,
    deploy: () => cds.deploy(cds.model).to(cds.db),
  });
  await require("./lib/db-protection").install(cds.db);
  if (process.env.V2_SYNTHETIC_FIXTURES === 'true') {
    if (cds.db.kind !== 'sqlite' || process.env.NODE_ENV === 'production') throw new Error('V2 synthetic fixtures require development SQLite');
    await require('../db/seed/v2-demo')(cds.db);
    await cds.db.tx(tx=>require('../db/seed/v21').apply(tx));
  }
  if (process.env.V22_SYNTHETIC_FIXTURES === 'true') {
    if (cds.db.kind !== 'sqlite' || process.env.NODE_ENV === 'production') throw new Error('V22 synthetic fixtures require development SQLite');
    const seed = require('../db/seed/v22');
    const marker = await cds.db.run(cds.ql.SELECT.one.from('toolsathi.AuditLog').where({action:'V22_SYNTHETIC_BASE_CREATED',actor:seed.graph.prefix+'ADMIN'}));
    if (!marker) await cds.db.tx(tx=>seed.apply(tx));
  }
});
cds.on("bootstrap", (app) => {
  app.disable("x-powered-by");
  const origins = (
    process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173"
  )
    .split(",")
    .map((x) => x.trim());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.locals.routeRegistry = loadRouters(app);
  app.use((_req, res) =>
    res
      .status(404)
      .json({
        error: {
          code: "NOT_FOUND",
          message: "Endpoint not found",
          details: {},
        },
      }),
  );
  app.use(errors);
});
module.exports = (options) => {
  if (configurationError) throw configurationError;
  if (database.mode === "hana" && database.connection === "direct") databaseConfig.assertTarget(database);
  if (
    process.env.NODE_ENV === "production" &&
    (process.env.AUTH_MODE === "header" ||
      process.env.ALLOW_UNAPPROVED_MOCKS === "true" ||
      process.env.ENFORCE_APPROVALS === "false")
  )
    throw new Error("Unsafe production configuration");
  const memory =
    cds.env.requires.db.kind === "sqlite" &&
    cds.env.requires.db.credentials?.url === ":memory:";
  if (cds.env.requires.db.kind === "sqlite" && !memory) {
    const file = require("node:path").resolve(
      cds.env.requires.db.credentials.url,
    );
    require("./lib/local-lock").acquire(file);
  }
  return cds.server({
    ...options,
    from: "*",
    in_memory: memory,
    cors: false,
    index: false,
    static: false,
    health: false,
  });
};
if (require.main === module)
  Promise.resolve()
    .then(() => module.exports({}))
    .then(async (server) => {
      if (!server.listening)
        await new Promise((resolve, reject) => {
          server.once("listening", resolve);
          server.once("error", reject);
        });
      console.log(
        `ToolSathi SIMULATED: http://localhost:${server.address().port}/api`,
      );
      console.log(`ToolSathi database: ${database.mode}`);
      const shutdown = () =>
        server.close(async () => {
          await cds.emit("shutdown");
          await cds.db.disconnect();
          process.exit(0);
        });
      for (const signal of ["SIGTERM", "SIGINT"])
        process.once(signal, shutdown);
      if (process.send)
        process.on("message", (message) => {
          if (message?.type === "toolsathi:shutdown") shutdown();
        });
    })
    .catch(async (error) => {
      const safe = database?.mode === "hana" || configurationError
        ? databaseConfig.diagnostic(error)
        : { code: error.code || "STARTUP_ERROR", message: error.message || "Check local database and port availability." };
      console.error(`ToolSathi startup failed (${safe.code}): ${safe.message}`);
      await cds.db?.disconnect();
      process.exitCode = 1;
    });
