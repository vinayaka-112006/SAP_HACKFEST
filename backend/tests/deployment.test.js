const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const yaml = require("yaml");
test("MTA bindings and XSUAA role collections are structurally consistent", () => {
  const mta = yaml.parse(fs.readFileSync("mta.yaml", "utf8"));
  const security = require("../xs-security.json");
  expect(mta.modules.map((m) => m.name)).toEqual([
    "toolsathi-srv",
    "toolsathi-db-deployer",
  ]);
  const resources = new Set(mta.resources.map((r) => r.name));
  for (const m of mta.modules)
    for (const r of m.requires || []) expect(resources.has(r.name)).toBe(true);
  const srv = mta.modules[0];
  expect(srv.properties).toMatchObject({
    NODE_ENV: "production",
    AUTH_MODE: "xsuaa",
    ENFORCE_APPROVALS: "true",
    ALLOW_UNAPPROVED_MOCKS: "false",
  });
  expect(security.scopes).toHaveLength(5);
  expect(security["role-templates"]).toHaveLength(5);
  expect(security["role-collections"]).toHaveLength(5);
});
test("production profile selects HANA/XSUAA without local SQLite credentials", () => {
  const env = { ...process.env, NODE_ENV: "production", CDS_ENV: "production" };
  // Inspect production defaults independently of the offline test runner's database pins.
  for (const key of Object.keys(env)) if (/^cds[_.]requires[_.]db/i.test(key)) delete env[key];
  const out = execFileSync(
    process.execPath,
    [
      "-e",
      "const cds=require('@sap/cds');process.stdout.write(JSON.stringify({kind:cds.env.requires.db.kind,url:cds.env.requires.db.credentials?.url,auth:cds.env.requires.auth.kind}))",
    ],
    {
      env,
      encoding: "utf8",
    },
  );
  expect(JSON.parse(out)).toEqual({ kind: "hana", auth: "xsuaa" });
});
test("OpenAPI is a valid document with all declared operations including AI communication and platform workflow", async () => {
  const out = execFileSync(
    process.execPath,
    [
      "-e",
      "require('@apidevtools/swagger-parser').validate('docs/openapi.yaml').then(doc=>process.stdout.write(String(Object.values(doc.paths).reduce((n,item)=>n+Object.keys(item).filter(k=>['get','post','put','patch','delete'].includes(k)).length,0)))).catch(e=>{console.error(e.message);process.exitCode=1;})",
    ],
    { encoding: "utf8" },
  );
  expect(Number(out)).toBe(30);
});
