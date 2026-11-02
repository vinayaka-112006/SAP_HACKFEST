const cds = require("@sap/cds");
const router = require("express").Router();
router.get("/health", async (_req, res, next) => {
  try {
    await cds.db.run(cds.ql.SELECT.from("toolsathi.Tool").limit(1));
    res.json({
      status: "ok",
      db: "connected",
      databaseMode: cds.db.kind,
      databaseInstance: require('node:crypto').createHash('sha256').update(JSON.stringify([cds.db.kind,cds.env.requires.db.credentials?.url||'',cds.env.requires.db.credentials?.schema||''])).digest('hex').slice(0,16),
      mode: "SIMULATED",
      seedVersion: "synthetic-v1",
      _label: "SIMULATED",
      _stub: false,
    });
  } catch (cause) {
    next(
      Object.assign(new Error("Database unavailable"), {
        status: 503,
        code: "DATABASE_UNAVAILABLE",
      }),
    );
  }
});
module.exports = { mount: "/api", router, owner: "platform" };
