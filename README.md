# ToolSathi backend

Synthetic manufacturing data and SIMULATED SAP services; no real SAP tenant connected. CAP 10, Node 24.11+, SQLite locally, HANA/XSUAA production configuration prepared.

```powershell
npm ci
npm run seed
npm run verify-ground-truth
npm run start:local
```

API: http://localhost:4004/api . Protected local calls need x-demo-user and x-demo-role. `npm test` verifies real behavior; `npm run smoke` runs API-level checks against the started server. Five teammate endpoints remain explicit stubs. Ground truth is provisional until Jamuna signs off.

Read [handover](docs/backend-handover.md), [local operations](docs/run-local.md), [API contract](docs/api-contract.md), [OpenAPI](docs/openapi.yaml), [integration seams](docs/team-integration.md), [decisions](docs/decisions.md), and [executed trace results](tests/results/trace-results.md).
