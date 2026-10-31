# Run Phase 0

Use Node 20 or newer and npm. From the repository root:

```powershell
npm ci
npm run start:local
```

Base URL: http://localhost:4004/api . Stop with Ctrl+C. After installation, runtime needs no internet. CAP uses in-memory SQLite; restart resets the probe. No domain seed exists yet.

In another terminal:

```powershell
npm test
npm run verify:stubs
```

`npm run dev` also starts the server. `PORT` defaults to 4004. `CORS_ORIGINS` is a comma-separated list (default http://localhost:3000,http://localhost:5173). `BASE_URL` changes the verification script's server URL.

All 17 business endpoints are unauthenticated fixed stubs and execute no actions. Health is live. `seed` and `verify-ground-truth` fail clearly until Phase 1; `backup:db` requires db.sqlite, unavailable in Phase 0. These scripts never fabricate success.

Later phases add AUTH_MODE, ENFORCE_APPROVALS (default true), and ALLOW_UNAPPROVED_MOCKS (default false; never on for the demo build). They are not implemented switches in Phase 0.

To integrate a router export `{ mount: '/api', router, owner }` from `srv/routes/*.router.js`. Use direct Express routes; attach middleware as route handlers. Duplicate real METHOD/path combinations fail startup; matching stubs disappear. Parameter names are normalized. See api-contract.md for examples and provisional teammate seams.
