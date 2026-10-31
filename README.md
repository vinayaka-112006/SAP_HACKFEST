# ToolSathi

A synthetic manufacturing incident and product-exposure investigation prototype. SAP services are explicitly SIMULATED; no real SAP tenant is connected.

## Repository map

```text
backend/     CAP project: database, APIs, tests, operations, backend docs and deployment configuration
frontend/    Vinayaka's UI area (currently only .gitkeep; no package/start command yet)
docs/        Repository architecture, API navigation and team ownership
deploy/      Shared deployment guidance; executable MTA/XSUAA configuration lives in backend/
backup/      Ignored database backups and isolated verification databases
```

## Start the backend

Use Node 24.11+ (major 24). The backend installs and runs independently:

```powershell
cd backend
npm ci
npm run seed
npm run verify-ground-truth
npm run start:local
```

API: **http://localhost:4004/api**. Local protected requests need `x-demo-user` and `x-demo-role`. `seed` generates files without resetting existing database state. The sole demo database is `backend/db.sqlite`; backups are in repository `backup/`.

In another backend terminal run `npm test`, `npm run verify:stubs` or `npm run smoke`. The smoke command creates a synthetic incident. Build checks: `npm run build`, then `npm run verify:package`.

From the repository root, `npm run dev:backend`, `npm run test:backend` and `npm run build:backend` delegate to the same backend project. Root dependency installation is not required for these wrappers.

## Frontend

`frontend/` is preserved unchanged. It has no package.json or implementation, so there is currently no valid frontend install/start command. Vinayaka should supply its independent package and scripts; this restructure does not generate UI code or assume a framework.

## Documentation

- [Architecture and folder ownership](docs/architecture/overview.md)
- [API documentation](docs/api/README.md)
- [Team integration and ownership](docs/team/README.md)
- [Backend setup and recovery](backend/docs/run-local.md)
- [Backend handover](backend/docs/backend-handover.md)
- [Deployment navigation](deploy/README.md)
- [Restructuring inventory and validation](backend/docs/repository-restructure.md)

Five teammate routes remain explicit stubs. Candidate ground truth awaits Jamuna's review. No push, merge or real-cloud deployment is implied.
