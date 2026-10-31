# Deployment preparation (not deployed)

Prerequisites: authorized BTP subaccount, CF org/space, running entitled HANA Cloud instance, XSUAA, Cloud Foundry CLI with multiapps plugin, Cloud MTA Build Tool (`mbt`) and Java/build prerequisites it requires. Use your account's actual API endpoint/org/space; none are assumed. Node 24.11+ and npm are required locally.

```powershell
npm ci
npm run seed
npm run verify-ground-truth
npm test
npm run build
mbt build -p cf
cf login -a <your-cf-api-endpoint> -o <your-org> -s <your-space>
cf target
cf deploy mta_archives/toolsathi_0.1.0.mtar
cf services
cf apps
cf app toolsathi-srv
```

MTA creates/binds toolsathi-db (HDI) and toolsathi-auth (XSUAA); db-deployer loads synthetic schema/CSVs. Backend uses the production HANA profile, verified bearer auth and approval enforcement. A real existing landscape may require adapting resource names/plans before packaging. Never replace a real database with the synthetic seed.

For a manual already-provisioned application only, the binding operations are `cf bind-service toolsathi-srv toolsathi-db`, `cf bind-service toolsathi-srv toolsathi-auth`, then `cf restage toolsathi-srv`. MTA normally handles these; verify bindings in the cockpit. Assign ToolSathi role collections to named users and use a token from the bound XSUAA instance for protected API verification. Do not use demo headers on BTP.

Use `cf app toolsathi-srv` to find the actual route, then request `<route>/api/health` (public) and protected `/api/tools` with a verified bearer token. Inspect `cf logs toolsathi-srv --recent` privately; do not publish credentials. Check HANA instance running state, HDI binding and deployment logs before retrying a failed deployment.

HANA indexes are packaged as hdbindex artifacts. SQLite append-only triggers do not transfer automatically. Before accepting cloud audit guarantees, provision an HDI-supported trigger or restricted append-only database procedure/technical role, deny UPDATE/DELETE on AuditLog to the runtime identity, and verify both attempts fail using that identity. These HANA privileges/trigger tests remain **unverified** and block claiming cloud audit protection.

No BTP deployment or service call has been executed. `mbt`/CF packaging depends on installed external tooling. Local fallback: clear production profile variables, `npm run db:reset` with local server stopped, then `npm run start:local`. Local commands use SQLite and simulated services without SAP credentials.
