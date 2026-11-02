# Architecture and ownership

ToolSathi contains one CAP project, `backend/`, and an independent frontend area. There is no workspace framework, second backend, duplicate database or shared dependency installation.

| Path | Owner | Purpose |
|---|---|---|
| backend/db/ | Yogesh | CDS model, deterministic CSVs, seed plan/generator and HDI artifacts |
| backend/srv/lib/ | Yogesh | Persistence, deterministic trace, audit/history, auth and simulation infrastructure |
| backend/srv/routes/ | Endpoint owner | Direct Express router exports with automatic stub replacement |
| backend/srv/routes/_stubs/ | Yogesh | Explicit fixed teammate endpoint fixtures |
| backend/srv/ai-adapter/ (when supplied) | Shashank | AI/speech adapter; not created by this restructure |
| backend/srv/rules/ (when supplied) | Jamuna | Rules, duplicate detection, approval and return workflow; not created here |
| backend/tests/ground-truth.json (when reviewed) | Jamuna | Frozen approved reference; absent, candidate remains provisional |
| backend/tests/, scripts/, docs/ | Yogesh | Platform verification, operations and backend-specific documentation |
| backend/mta.yaml, xs-security.json, .cdsrc.json | Yogesh | CAP-local build, database profiles and deployment configuration |
| frontend/ | Vinayaka | React/Vite UI with API-backed incident/trace/history/audit views |
| docs/, deploy/, AGENTS.md | Repository integration | Navigation, architecture and shared guidance |
| backup/ | Local runtime, ignored | Consistent database backups and isolated verification databases |

Requests use the unchanged /api endpoints. Express routers use shared CAP database access, audit/history and approval checks. The deterministic trace reads manufacturing records; AI does not decide exposure. Consequential SAP-shaped operations are simulated and require persisted scoped approvals.

Backend module-relative imports are preserved by moving its source and public fixtures together. CAP configuration lives in backend/.cdsrc.json; dependency versions and commands live in backend/package.json/lock. The MTA remains beside its build outputs and XSUAA descriptor at the CAP root. Runtime/generated files stay ignored: backend/node_modules, backend/gen, backend/db.sqlite and repository backup/.

See [backend handover](../../backend/docs/backend-handover.md), [API navigation](../api/README.md), [team seams](../../backend/docs/team-integration.md) and [deployment](../../deploy/README.md).

The real frontend merge is integrated on integration/frontend-backend. Frontend changes in this phase preserve Vinayaka's design while adapting to CAP responses; the backend implementation and all 18 paths remain unchanged. See [integration handover](../frontend-backend-integration.md).
