# Team ownership and integration

- Yogesh: platform, CAP database, incident services, deterministic trace, audit/history, simulated SAP actions, tests and deployment preparation under backend/.
- Shashank: AI/speech adapter under backend/srv/ai-adapter/ when provided, and POST /api/ai/structure-report.
- Jamuna: rules/workflow under backend/srv/rules/ when provided; duplicates, proposals, approval decisions and verified return; reviewed backend/tests/ground-truth.json.
- Vinayaka: frontend/ and its independent package/setup. Current frontend remains an untouched placeholder.

The AI and rules directories have not been fabricated. Real teammate router files belong in backend/srv/routes and keep the existing `{ mount, router, owner }` export. They replace matching stubs automatically. API routes and business logic were not changed by the folder migration.

See [exact backend seams](../../backend/docs/team-integration.md), [ownership map](../architecture/overview.md) and [repository instructions](../../AGENTS.md).
