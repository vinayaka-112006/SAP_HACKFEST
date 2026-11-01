# ToolSathi frontend

React 18 + Vite, using Vinayaka's existing Clarity Glass design. The active app is connected to the CAP backend. Synthetic data and SIMULATED SAP services are labelled explicitly; AI and human workflow adapters remain pending.

The normal local backend now persists to verified SAP HANA Cloud. Repository-root `npm run dev` starts both services using the private backend configuration; `npm run dev:local` and `npm run dev:fresh` explicitly select SQLite. Current results and demonstration instructions are in [local demo readiness](../docs/local-demo-readiness.md).

## Run independently

Start the backend on port 4004, then:

```powershell
cd C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST\frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite proxies /api to http://localhost:4004. Public configuration is documented in [.env.example](.env.example). No root installation or frontend seed generation is needed to run the real app.

Local demo role/user controls are labelled explicitly. Worker/Manager can report; Manager/Quality/Verifier can trace and view audit. The backend enforces authorization. Production builds never send demo headers; production identity-provider integration remains unverified.

## Routes

- `/`: original launcher/navigation and local demo roles.
- `/worker`: live tools/manual QR contents, typed input, editable card, real save and separate confirmation.
- `/console`: open a real incident ID, inspect stored details/evidence, select backend trace windows, view gaps/distribution/audit and SIMULATED documents.
- `/history`: live tool timeline including seeded TS-0001, repair and calibration events.
- `/kitchen`: explicitly labelled design examples; no operational approvals are created.

Use **Load synthetic demo report** in the worker form for the 4 November scenario anchor and expected 35/100/160 scopes. It is sample input, not fabricated AI output. No report is saved or confirmed automatically.

## Verify

```powershell
npm test
npm run test:seed
npm run build
npm run test:e2e
```

Client tests use Node's built-in runner. Browser tests use that runner plus the Playwright library with installed Edge/Chrome (or BROWSER_PATH). They use isolated SQLite data and an isolated Vite port 5174; the main demo database is preserved. Legacy fixture checks remain for design reference and are not used by the active UI. No lint script is configured.

Physical camera scanning is unavailable; live manual tool selection/code resolution works. Speech recognition is browser-dependent and actual microphone capture is unverified. AI, duplicate/proposal/approval/verified-return endpoints are still stubs; their controls do not invent successful results.

With the HANA application already running on 5173/4004, `npm run verify:hana-ui` performs seven live checks and creates one labelled synthetic incident. It verifies the saved incident, traces and audit through independent direct HANA reads. Its raw browser output/screenshots stay in ignored `test-results/`; the reviewed result snapshot is [committed here](../docs/local-demo-results.json).

[Complete integration/startup/test handover](../docs/frontend-backend-integration.md). [Backend contracts](../backend/docs/api-contract.md).
