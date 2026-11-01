# ToolSathi

A synthetic manufacturing incident and product-exposure investigation prototype. Local application persistence is verified against real SAP HANA Cloud. S/4HANA and Digital Manufacturing actions remain explicitly SIMULATED.

## Repository map

```text
backend/     CAP project: database, APIs, tests, operations, backend docs and deployment configuration
frontend/    Vinayaka's React/Vite UI, now connected to the local CAP backend
docs/        Repository architecture, API navigation and team ownership
deploy/      Shared deployment guidance; executable MTA/XSUAA configuration lives in backend/
backup/      Ignored database backups and isolated verification databases
```

## Start the application on Windows

Use Node 24.11+ (major 24). From the repository root:

```powershell
npm --prefix backend ci
npm --prefix frontend ci
npm run dev
```

Open **http://localhost:5173**; API: **http://localhost:4004/api**. The combined launcher follows `backend/.env`, currently configured for HANA, and stops its two children on Ctrl+C. It reports occupied ports without stopping existing applications. Root dependency installation is unnecessary.

`npm run dev:local` explicitly uses the preserved `backend/db.sqlite` offline. `npm run dev:fresh` creates a separate seeded SQLite file under ignored `backup/` each time. Neither resets the existing database. Stop the running application before switching modes.

See [current demo readiness, verified results and limitations](docs/local-demo-readiness.md). Existing data migration completed: **394 records across 21 tables**, with content verification and a zero-insert repeat before application testing.

## Start the backend independently with SQLite

Use Node 24.11+ (major 24). The backend installs and runs independently:

```powershell
cd backend
npm ci
npm run seed
npm run verify-ground-truth
npm run start:local
```

API: **http://localhost:4004/api**. Local protected requests need `x-demo-user` and `x-demo-role`. `seed` generates files without resetting existing database state. The preserved offline demo database is `backend/db.sqlite`; backups are in repository `backup/`. Use `npm run start:hana` instead for the configured HANA target; startup never deploys or imports records.

In another backend terminal run `npm test`, `npm run verify:stubs` or `npm run smoke`. The smoke command creates a synthetic incident. Build checks: `npm run build`, then `npm run verify:package`.

From the repository root, `npm run dev:backend`, `npm run test:backend` and `npm run build:backend` delegate to the same backend project. Root dependency installation is not required for these wrappers.

## Start the frontend independently

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. The existing design is preserved; /api is proxied to the backend. Local demo roles are explicitly labelled. Typed reporting, separate confirmation, incident lookup, tool history, trace windows, audit and simulated documents use real APIs. AI and workflow stubs stay unavailable. See [current walkthrough and executed tests](docs/local-demo-readiness.md).

## Documentation

- [Current demo readiness and HANA verification](docs/local-demo-readiness.md)
- [Frontend/backend integration](docs/frontend-backend-integration.md)
- [Architecture and folder ownership](docs/architecture/overview.md)
- [API documentation](docs/api/README.md)
- [Team integration and ownership](docs/team/README.md)
- [Backend setup and recovery](backend/docs/run-local.md)
- [Backend handover](backend/docs/backend-handover.md)
- [HANA Cloud connection and existing-data migration](backend/docs/hana-cloud-integration.md)
- [Deployment navigation](deploy/README.md)
- [Restructuring inventory and validation](backend/docs/repository-restructure.md)

Five teammate routes remain explicit stubs. Candidate ground truth awaits Jamuna's review. No push, merge or real-cloud deployment is implied.
