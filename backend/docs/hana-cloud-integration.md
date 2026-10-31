# SAP HANA Cloud integration and existing-data transfer

## Actual status

The existing CAP backend can explicitly select SQLite or HANA using the same CDS model, transactions and REST routes. The installed stack is @sap/cds 10.2.2, @cap-js/hana 3.1.2, hdb 2.30.1 and @cap-js/sqlite 3.1.2. No additional database adapter or frontend persistence layer was introduced.

The latest live check **passed a real SQL query**, using direct SQL authentication and verified TLS from ignored backend/.env. The user then explicitly selected HANA and authorized migration/application testing. Inspection confirmed the account-owned application schema; reviewed create-only deployment installed 21 tables and two audit triggers. The existing SQLite source supplied 394 records, copied and verified transactionally. A repeat before normal application writes inserted zero rows and matched all 394 existing rows. See [connection](../tests/results/hana-connection.json), [deployment](../tests/results/hana-deployment.json), [migration](../tests/results/hana-migration.json) and [repeat](../tests/results/hana-migration-repeat.json).

Earlier missing-credential and HANA_AUTH_FAILED results are historical. The exact account-side change between failed and successful attempts was not observed; no credential change or grant was made by this work. The public .env.example contains placeholders only. Actual HANA application checks now pass: 11 backend checks including writes, confirmation, two restarts, exact SQLite trace parity and database audit UPDATE/DELETE rejection. Seven live browser checks additionally verify the UI-created incident/traces/audit through independent HANA reads. See [application results](../tests/results/hana-results.json) and [current local demo handover](../../docs/local-demo-readiness.md). Cloud Foundry/HDI deployment and real XSUAA remain unverified.

The existing local database was exported through a read-only consistent snapshot: 300 units, three tools, 18 runs/batches/tool-use records, nine stock rows, nine shipments, two dealers, existing incident TS-0001, history, repair, calibration, audit and counters. All 21 modeled tables are included, even empty tables. The snapshot is ignored under repository backup/; neither database files nor report contents are committed. Existing-data migration copies these records, rather than regenerating the seed or resetting SQLite.

## Configure the SQL account

In backend/, copy the public template once, then edit only the ignored .env file:

```powershell
cd C:\Users\yoges\Desktop\hackfest\SAP_HACKFEST\backend
Copy-Item .env.example .env
notepad .env
```

Do not overwrite an already configured .env. Fill HANA_SQL_ENDPOINT with the **SQL endpoint** shown for Hackfest-DB in HANA Cloud Central, using hostname:port (typically port 443), without https:// or a cockpit/Database Explorer path. Use a database SQL account and the exact application schema assigned by its owner. BTP cockpit login credentials are not database SQL credentials.

```dotenv
DATABASE_MODE=hana
HANA_CONNECTION=direct
HANA_SQL_ENDPOINT=your-instance.hana.hanacloud.ondemand.com:443
HANA_USER=your_database_username
HANA_PASSWORD=your_database_password
HANA_SCHEMA=your_authorized_schema
HANA_ENCRYPT=true
HANA_VALIDATE_CERTIFICATE=true
PORT=4004
```

Quote passwords containing # or surrounding whitespace using dotenv quoting. Node 24's native process.loadEnvFile loads backend/.env before initializing cds.env. Existing process environment values take precedence. Configuration maps these variables explicitly to the CAP adapter's host, numeric port, user, password and schema; encrypt/useTLS and certificate validation are required. SQLite credentials are removed in HANA mode. No failed HANA connection can fall back to SQLite. Normal output uses safe diagnostics, never complete connection/credential objects or raw driver errors. Keep driver debugging disabled when using credentials.

The direct schema name must use uppercase letters, digits and underscores. System schemas and SYSTEM/DBADMIN runtime accounts are rejected. Have the database owner supply a dedicated account instead. No new schema, user, role, HDI service or grants are created automatically.

## Read-only connection and destination inspection

```powershell
npm run hana:check
npm run hana:inspect
```

Both explicitly select HANA regardless of DATABASE_MODE. They use @cap-js/hana/hdb, perform a real TLS connection and SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY, then inspect the configured schema. The adapter itself queries HANA version metadata. Inspection starts without a schema override so a working login can be distinguished from an absent/inaccessible target schema. Schema accessibility is tested with session-scoped SET SCHEMA and another read. No application tables/data are created.

Output includes only connection status, host, identity/schema, duration, visible object names and privilege names. Missing credentials, bad authentication, DNS, network/timeouts/IP allowlisting, TLS validation, missing schema, missing tables and insufficient privileges have separate safe diagnostic codes. A successful SQL login is distinct from table deployment, runtime grants and write readiness.

## Dedicated destination and schema plan

Before any remote deployment/import, the schema owner must confirm exclusive ToolSathi assignment. Record that confirmation in .env by setting **HANA_TARGET_CONFIRMED to exactly the configured HANA_SCHEMA**. It is an operational confirmation, not a replacement for database authorization. Direct HANA server startup requires it too. Never set it for an unreviewed/shared target.

If no assigned target exists, ask the database owner to provision a ToolSathi schema or HDI container, then grant the assigned installer CREATE ANY/TRIGGER and required schema/table access. The application runtime needs only its application table reads/writes and the metadata visibility required for readiness checks; it does not need database-wide administrative rights. Audit UPDATE/DELETE are rejected by the database triggers. The importer also requires privileges for its application-table locks. Use the actual least-privilege grants approved by the administrator.

For an authorized direct schema, generate the exact offline create-only plan:

```powershell
npm run hana:plan
```

Review backend/gen/hana-local/schema.sql: 21 compiler-generated HANA CREATE TABLE statements plus two append-only audit triggers. It uses NVARCHAR/NCLOB, TIMESTAMP, BOOLEAN, BIGINT and DECIMAL(15,2), with CAP plain identifier naming. This command does not need credentials or contact a database.

After the owner confirms the target and the DDL is reviewed:

```powershell
npm run hana:deploy
npm run hana:deploy -- --apply
```

The first command inspects and prints the still-missing DDL without applying it. The second creates only absent application tables/triggers. It never creates a schema, drops/replaces tables or alters existing columns. It refuses unrelated objects and checks existing table columns, types, sizes, numeric precision, nullability and primary keys. Index/constraint objects are allowed only when metadata proves they belong to the exact application tables. An existing incompatible table requires a separately reviewed migration, never an automatic reset.

HANA DDL commits individually; a deployment failure may leave a subset of newly created empty application objects. Fix privileges and rerun: already matching objects are retained. Do not delete shared objects to work around a conflict. Direct-schema table/trigger deployment and audit enforcement were verified in the configured destination. HDI deployment remains a separate unverified path.

## Copy the existing SQLite data

The requested transfer uses **hana:migrate**, not hana:seed:

```powershell
npm run hana:export
npm run hana:migrate
npm run hana:migrate -- --apply
```

hana:export is offline and read-only; it saves a consistent snapshot plus row counts and SHA-256 manifests under ignored repository backup/. Preview and apply reread the current SQLite source and save their own snapshot. The default source is backend/db.sqlite. An alternate source must stay inside backend/ or repository backup/:

```powershell
npm run hana:migrate -- --source=../backup/authorized-copy.sqlite
```

Migrations include all modeled records, including existing reports, evidence, trace results, audit/history, proposals/approvals, mock documents and sequence counters when present. Unicode/raw report text and stored JSON strings are preserved. UTC timestamps retain up to seven fractional digits; transfer verification explicitly reads HANA FF7 because the installed adapter's ordinary API output uses FF3. Booleans, fixed-scale decimals and 64-bit counters are normalized without losing counter precision.

The importer checks every destination row before inserting anything. Existing rows must be exactly identical to the source; missing rows are inserted. An extra/different destination row aborts without updating or deleting it. Repeating an unchanged import inserts zero duplicates. If HANA has subsequently served new incidents or state changes, a replay of an older SQLite snapshot refuses the conflict; this is not a bidirectional synchronization service.

Apply locks only the application tables, inserts missing rows in one CAP transaction, then checks every table's count/content manifest before commit. Any conflict, insertion failure or comparison mismatch rolls back the full data transaction. Audit records are copied as existing history, not manufactured as newly performed approvals. No historical data is silently rewritten. Stop normal writers for the final cutover if you need the snapshot to include every latest local change. Retain SQLite for offline use.

For a **new isolated target** that needs only the original deterministic manufacturing seed, hana:seed / hana:seed -- --apply uses the existing generator with the same preview/conflict/transaction checks. It refuses destination records that conflict with or extend that seed. It never runs at server startup. Use hana:migrate to preserve actual existing application data.

## HDI binding path

HDI is the preferred managed deployment path. The existing mta.yaml still provisions/binds toolsathi-db (hana/hdi-shared) and XSUAA. A real HDI binding contains installer/runtime/container metadata; a direct SQL username/password is not an HDI key.

For an already authorized dedicated HDI service, use the existing CAP build and HDI deployment process with that binding (see [BTP deployment](deploy-btp.md)); do not run the direct-schema DDL command against HDI. Set HANA_CONNECTION=binding locally, resolve the real service binding using cds bind --exec or Cloud Foundry VCAP_SERVICES, and omit direct SQL fields. The production profile continues to select HANA/XSUAA. Certificate metadata from the binding is preserved and validation is enforced.

The build packages both audit .hdbtrigger artifacts. HANA runtime fails closed if those guards are absent. The HANA build task now has contentHdbtabledata=false: it generates model artifacts but **does not automatically import the CSV seed during an HDI deployment**. Load existing data explicitly with hana:migrate after model deployment; this avoids a deploy silently resetting manufacturing/tool/sequence records. The ordinary SQLite first-start CSV initialization is unchanged.

hana:migrate/seed can use an authorized HDI binding after deployment. Its target confirmation must match the binding's actual schema. Runtime readiness checks verify the model; no HDI technical objects are treated as permission to overwrite application rows. HDI deployment, binding grants and trigger activation are not cloud-verified here.

## Start either backend mode

```powershell
npm run start:local
```

This explicitly selects the existing offline SQLite database, even when DATABASE_MODE=hana in .env. Default npm start follows DATABASE_MODE; npm test pins isolated SQLite above CAP's own env configuration and skips the application's native .env loader. Browser tests and packaged-runtime checks also explicitly pin SQLite, so backend/.env cannot redirect their writes to HANA. The optional hana-local CAP profile selects HANA without activating the production auth profile.

```powershell
npm run start:hana
```

Requires real credentials, a confirmed dedicated target, deployed application tables and the audit guards. It performs real database reads before listening. It does not deploy or seed HANA. The API remains http://localhost:4004/api; local demo headers and the existing React frontend work identically. HANA changes persistence only. S/4HANA and Digital Manufacturing operations remain SIMULATED, with the same approval checks.

## Remote persistence and trace verification

The authorized additive application check is:

```powershell
npm run verify:hana-app
```

It requires the confirmed application target and creates one uniquely labelled synthetic incident. It runs the same persistence/trace/audit checks without claiming that this is a separate disposable test schema. From the frontend, `npm run verify:hana-ui` tests the already running local application on 5173/4004 and directly verifies the resulting HANA rows. Verification history is retained; interrupted attempts may leave a Reported incident. For a read-only saved-report check use `npm run hana:record -- --incident=TS-0007`.

Use a separate owner-authorized test schema/container, deploy the model and load the same deterministic seed there first. Select that destination through HANA_SCHEMA/binding, set HANA_TARGET_CONFIRMED to it, then set HANA_TEST_SCHEMA to that exact test schema. Do not point the test command at the normal demo/shared destination.

```powershell
npm run test:hana
```

The explicit remote harness checks identity/schema, tools, incident creation and confirmation, a full backend process restart, retrieval of the same incident, all trace windows, direct HANA TraceResult/AuditLog rows, database audit mutation rejection, and another restart. It compares actual serials, tiers, locations, evidence IDs and gaps with the current read-only SQLite source, and compares totals/scores to provisional ground truth. It leaves its uniquely identified synthetic test incident/history in the dedicated test scope; it performs no destructive cleanup. Results are written to tests/results/hana-results.json. This command fails visibly when configuration or authorization is missing; it never reports unexecuted remote checks as passing.

Expected Tool B totals/tiers are 35/35/0/0, 100/90/4/6 and 160/146/8/6, with scores 100/82/83. The 72h stock/X/Y split is 40/35/25; the exposure range is 35/154/6. Jamuna's formal approval remains pending. If manufacturing data was intentionally changed in SQLite or HANA, investigate the discrepancy instead of changing the trace algorithm or expectations.

## Executed offline verification

All 101 backend tests pass across 16 suites, including the original 61 (zero failed/skipped). The suite forces isolated SQLite even with inherited HANA settings. Additional tests exercise configuration/TLS/missing credentials, dotenv loading, binding preservation, offline isolation, HANA SQL compilation/row locks/LOB insertion/atomic counters, catalog/schema guards, transactional transfer, precision, path anchoring, combined startup/shutdown and occupied-port handling. Counts are in [summary.json](../tests/results/summary.json). CAP production build and packaged-runtime checks pass. Frontend client tests (17), isolated browser checks (8), legacy fixtures (15) and production build pass. Live HANA verification separately passed 11 backend and seven browser checks. The original SQLite still has all 394 unchanged records across 21 tables. In HANA all imported rows are retained; 393 are unchanged and one incident counter advanced through normal reporting. See [readiness](../tests/results/hana-readiness.json) and [post-application data integrity](../tests/results/hana-data-integrity.json).

## Troubleshooting and references

- Missing credentials/binding: fill only ignored backend/.env or resolve the assigned binding. Do not paste secrets into source, frontend VITE variables or logs.
- DNS/network: use the SQL endpoint, confirm the instance is running and your public IP is allowed; check VPN/firewall outbound access to its port.
- Authentication: verify the dedicated SQL account/password with the owner and check lock/expiry status.
- TLS: correct the hostname/trust chain; never disable certificate validation.
- Missing schema/privileges: have the owner provision/assign it and grant scoped access. Do not create objects in SYS, SYSTEM, PUBLIC or someone else's schema.
- Model conflict: inspect the generated DDL and metadata; no automatic alter/drop is offered.
- Data conflict: compare source/destination with the owner. No force/upsert/overwrite option exists.
- Audit guards missing: deploy the supplied direct-schema or HDI trigger artifacts with appropriate installer rights before runtime startup.
- Offline fallback: stop the HANA process and run start:local. The local database was never reset or deleted.

Conventions were checked against the installed SAP packages and official references: [CAP HANA guide](https://cap.cloud.sap/docs/guides/databases/hana), [CAP environment configuration](https://cap.cloud.sap/docs/node.js/cds-env), [CAP service bindings](https://cap.cloud.sap/docs/node.js/cds-connect), [SAP HANA trigger reference](https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/20d5a65575191014946db96aaedbef5b).

## Changed files

- srv/lib/database-config.js and .env.example: native env loading, explicit modes, verified TLS mapping, binding preservation, target guards and safe diagnostics.
- srv/server.js and .cdsrc.json: mode selection/readiness without remote auto-deployment or auth changes; explicit HDI seed-loading policy.
- srv/lib/data-transfer.js: consistent read-only source snapshots and transactional verified record copying.
- srv/lib/hana-operations.js: read-only metadata, model conflict checks and create-only direct schema deployment.
- srv/lib/db-protection.js, db/src/.hdiconfig and two .hdbtrigger artifacts: HANA append-only readiness and deployment artifacts; SQLite protection retained.
- scripts/hana.js, hana-integration.js, run-tests.js and package.json: operational commands, explicit remote persistence checks and default offline test isolation.
- tests/hana-config.test.js, hana-sql.test.js and data-transfer.test.js: focused offline regression coverage.
- Documentation and executed result files: actual capability boundaries and reproducible handover. The deterministic trace code is unchanged.
- frontend/scripts/browser.integration.test.js and scripts/verify-package.js explicitly pin test storage to SQLite. The current frontend fixes, HANA browser verifier and root launcher are described in the current demo handover.
