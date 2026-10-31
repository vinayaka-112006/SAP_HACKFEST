# Troubleshooting

- HANA trial stopped: check HANA Central, authorized instance status and entitlement. Restart through cockpit if permitted. Local SQLite remains available.
- Wrong profile: production selects HANA and requires service bindings; clear NODE_ENV/CDS_ENV for local use. Tests use their own in-memory database and never your demo file.
- 401 locally: send x-demo-user and one valid x-demo-role. 403: use a permitted role. These are demo headers, not verified production identities.
- 409 APPROVAL_REQUIRED: Jamuna must create an APPROVED record with correct role, incident, action and payload scope. Stub approval responses do not create records. Do not enable bypass for the demo.
- XSUAA: production never accepts unverified claims or demo headers. Bind the correct service, map role collections and obtain a verified token. Local code cannot verify an unavailable real binding.
- Port busy / old Phase 0 server: stop the previous terminal/process, then restart this branch. Do not run stale and current servers on the same port. PORT can select another local port.
- Schema mismatch: back up and stop the local demo database, then db:reset. Never auto-reset a nonempty existing database on startup.
- WAL present during file backup: stop all database processes cleanly. Run `npm run db:checkpoint` after all writers are stopped, then retry. Do not delete WAL files or copy a live file to bypass the guard.
- Missing approved ground truth: candidate tests remain provisional. Jamuna reviews candidate and provides ground-truth.json. Any difference fails; do not overwrite either file.
- Teammate stub remains: add the owner's real direct-route export under srv/routes, restart, and check registry tests. Nested router middleware is not supported by the current registry.
- Node 24 native SQLite warning: installed driver uses the experimental Node API; tests verify current behavior. Pin the tested runtime for the demo or revalidate a supported runtime/driver combination.
