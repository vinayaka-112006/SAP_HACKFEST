# ToolSathi backend

Synthetic manufacturing data, real SAP HANA Cloud persistence, and SIMULATED S/4HANA/DM actions. CAP 10, Node 24.11+, explicit SQLite fallback; XSUAA production integration remains unverified.

The configured HANA target now contains the existing 394 records across 21 tables. Real SQL, incident persistence across restarts, trace parity and database audit protections passed. Use `npm run start:hana`, or repository-root `npm run dev` for both services. See [current demo handover](../docs/local-demo-readiness.md).

For explicit offline SQLite operation, run from `C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST\backend`:

```powershell
npm ci
npm run seed
npm run verify-ground-truth
npm run start:local
```

API: http://localhost:4004/api . Protected local calls need x-demo-user and x-demo-role. `npm test` verifies real behavior; `npm run smoke` runs API-level checks against the started server. Five teammate endpoints remain explicit stubs. Ground truth is provisional until Jamuna signs off.

Read [handover](docs/backend-handover.md), [local operations](docs/run-local.md), [API contract](docs/api-contract.md), [OpenAPI](docs/openapi.yaml), [integration seams](docs/team-integration.md), [decisions](docs/decisions.md), and [executed trace results](tests/results/trace-results.md).

CAP configuration is in [.cdsrc.json](.cdsrc.json); deployment descriptors remain [mta.yaml](mta.yaml) and [xs-security.json](xs-security.json) at this project root. The existing local database is db.sqlite here. Backups are kept in repository ../backup/; restore with `npm run restore:db -- ../backup/<file>.sqlite` while the server is stopped.

See [repository ownership](../docs/architecture/overview.md). The root convenience scripts delegate to this same backend. The merged React/Vite frontend runs independently with npm ci / npm run dev in frontend/. See the repository integration handover for actual connected features and pending adapters.

## HANA Cloud and existing data

[HANA integration and migration](docs/hana-cloud-integration.md) documents the adapter, ignored .env credentials, confirmed schema and completed transfer. `hana:check` performs a safe real SQL retry. `start:hana` selects HANA explicitly; `start:local` and the default regression suite use SQLite. Application checks `verify:hana-app` and frontend `verify:hana-ui` each add a labelled synthetic report; normal startup and `hana:record` do not migrate data. Do not replay the old SQLite migration after HANA has acquired new records: the importer correctly rejects conflicts. The frontend uses the same API in either mode.
