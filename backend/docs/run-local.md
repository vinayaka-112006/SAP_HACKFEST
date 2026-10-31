# Run ToolSathi locally

Paths and npm commands in this document are relative to the `backend/` CAP project unless stated otherwise. Repository-wide backups live in `../backup/`.

Synthetic data, simulated services; no SAP tenant connected. Node 24.11+ and npm required. Commands run from C:/Users/yoges/Desktop/hackfest/SAP_HACKFEST/backend.

```powershell
npm ci
npm run seed
npm run verify-ground-truth
npm run start:local
```

After dependencies are installed, seed/start/tests require no network. First start initializes db.sqlite from generated CSVs. Subsequent starts preserve incidents/tool/stock state. Base URL http://localhost:4004/api . Stop with Ctrl+C. `npm run dev` starts the same server.

Protected requests need local demo headers (this is not verified identity): `x-demo-user: WRK-014`, `x-demo-role: Worker`. Use Manager/Quality/Verifier for trace and audit. Manager/Quality may call simulated actions, but approved persisted records are still required. Teammate stubs and health are public. The smoke script uses synthetic named demo actors.

```powershell
npm test
npm run verify:stubs
npm run smoke
```

For a fresh rehearsal, **stop every process using db.sqlite**, then:

```powershell
npm run backup:db
npm run seed
npm run db:reset
npm run start:local
```

`db:reset` backs up an existing local database before reloading the full synthetic schema. It affects only the configured SQLite file under backend/ or repository backup/; it never touches teammate source or HANA. `seed` alone generates files and does not alter a running database. Next incident after reset is TS-0002.

Restore with the server stopped: `npm run restore:db -- ../backup/<selected-backup>.sqlite`. Backups are ignored and written to the repository-level ../backup/ directory. Nonempty WAL files cause offline file operations to refuse; cleanly stop all writers first. Do not copy a live SQLite database as a reliable backup. Use a closed-file backup or a reviewed SQLite online-backup procedure.

| Variable | Default / behavior |
|---|---|
| PORT | 4004 |
| CORS_ORIGINS | http://localhost:3000,http://localhost:5173 comma separated |
| AUTH_MODE | header locally, xsuaa in production |
| NODE_ENV | production selects HANA/XSUAA; leave unset for local |
| CDS_ENV | CAP profile selector; test uses in-memory SQLite |
| CDS_REQUIRES_DB_CREDENTIALS_URL | Optional local SQLite override, defaults backend-local db.sqlite |
| BASE_URL | Verification/smoke origin, defaults http://localhost:4004 |
| ENFORCE_APPROVALS | true; false alone does not bypass |
| ALLOW_UNAPPROVED_MOCKS | false; combined with ENFORCE_APPROVALS=false is DEVELOPMENT ONLY, **never on for the demo build**; refused in production |

XSUAA/HANA credentials come only from service bindings. No secrets belong in .env files committed to Git. Header auth and simulated adapters do not prove production security or SAP integration.

After an abnormal termination with a WAL remaining, stop all writers, run `npm run db:checkpoint`, then retry offline backup/reset. The checkpoint refuses an active ToolSathi lock. `npm run verify:package` checks the built runtime locally after `npm run build`; it does not connect to HANA. Tested runtime: Node 24.11.0. Node 20 needs a compatible SQLite driver (the default native driver is unavailable there); revalidate that combination before use.

From the repository root, use `npm run dev:backend` or `npm run test:backend`. The root package only delegates commands; install dependencies with `npm ci` inside backend/. Frontend installation/startup is independent and awaits Vinayaka's package.
