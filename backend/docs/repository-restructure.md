# Repository restructuring inventory and plan

Recorded before any source/runtime moves. Branch yogesh/platform; starting commit b9e9894; initial working tree clean. Executed baseline: 61 tests passed in 12 suites, 0 failed/skipped.

## Inventory

- db/, srv/, tests/, scripts/ and docs/ contain the real CAP backend, tests, operations and backend-specific documents. package.json and lock carry CAP/runtime/build configuration; jest.config.js targets the CAP root.
- backend/ and frontend/ each contain only tracked .gitkeep. No frontend package, AI adapter directory or Jamuna rules modules exist. Five teammate routers remain explicit stubs.
- mta.yaml references gen/srv, gen/db and ./xs-security.json relative to the CAP root. Keep both deployment files at the new backend CAP root to preserve build behavior.
- node_modules/ is the installed, ignored dependency tree. gen/ is ignored reproducible CAP output. db.sqlite and its WAL/SHM/lock are ignored runtime state. backup/ is ignored and contains previous operational backups and test databases.
- Router imports/fixture paths are module-relative; moving db/srv/tests/scripts/docs as one project retains those relationships. Seed/build/smoke/report scripts use CAP-project-relative working directories. npm --prefix backend gives root convenience scripts that working directory.
- Backup/reset/restore and reliability/package checks currently assume a local backup/ subfolder. Update these explicitly to the single repository-level backup/ and retain path guards for backend files and that ignored directory only.

## Intended moves and preservation sequence

1. Stop the existing server through its installed graceful shutdown handler; confirm its process/lock have closed. Run checkpoint and backup commands, then verify the backup with SQLite integrity_check, counts and a canonical data digest.
2. git mv db/, srv/, tests/, scripts/, docs/, package.json, package-lock.json, jest.config.js, mta.yaml, xs-security.json and README.md into existing backend/. Keep frontend/ unchanged.
3. Move the closed db.sqlite to backend/db.sqlite only after verified backup. Move ignored dependencies into backend/node_modules, discard no runtime state. Move reproducible gen output into backend/gen and rebuild it there.
4. Keep ignored repository backup/ unchanged; update backup path helpers and tests without changing assertions or business logic. Add backend .cdsrc.json to hold the existing CAP configuration, keeping package scripts at the CAP root.
5. Create root docs/architecture, docs/api, docs/team and deploy guides; root README and minimal backend convenience commands. Update AGENTS ownership paths and backend instructions/links.
6. Install dependencies from backend with npm ci; run all 61 tests and independent ground-truth verification, API smoke, health/stub checks, production build and compiled-package checks. Verify the migrated database against the pre-move digest. Run API smoke against an isolated copy to preserve original state.
7. Review tracked moves and excluded runtime files; commit only after validation. No push/merge or history rewrite.

No frontend implementation or startup command will be invented: frontend remains Vinayaka's existing placeholder until he supplies its package/scripts. No AI/rules directories will be fabricated.

## Executed migration

The launch session was stopped with Ctrl+C. No Node/CAP processes remained; the existing stopped-file lock and empty WAL were settled using the existing checkpoint command. No live WAL/SHM file was manually deleted. The backup command created a consistent copy in repository backup/; SQLite integrity_check returned ok for source and backup. Canonical table-data digest matched before and after relocation:

`31e59ac66c7516a05e39a3c8de46979ead72f6d670d05a5f5e81c32212d195a5`

All 300 units, 18 runs/batches, 3 tools, TS-0001, seeded history/audit and counters were preserved. No demo reset or new main database was used. Standalone API smoke ran on a separate ignored copy and verified creation of TS-0002 without changing the migrated original.

Tracked db/, srv/, tests/, scripts/, docs/, package/lock, Jest config, MTA, XSUAA and README were moved with git mv into backend/. The old backend/.gitkeep was removed as redundant; frontend/.gitkeep remains unchanged. Ignored node_modules, gen and the closed database/WAL/SHM moved separately. npm ci rebuilt dependencies and npm run build regenerated CAP output in backend/. Repository backup/ was retained in place.

CAP configuration was extracted without semantic changes into backend/.cdsrc.json. MTA paths remain gen/srv, gen/db and ./xs-security.json relative to backend/. New root docs/ and deploy/ are guides linking to the single implementation. Operational backups resolve to repository backup/ through backend/scripts/paths.js, including package/reliability tests. Relative restore arguments from backend/ are ../backup/<file>.sqlite.

## Validation after moves

- npm ci from backend/: passed, lockfile/dependency versions retained.
- npm run seed and npm run verify-ground-truth from backend/: passed; CSVs/candidate unchanged.
- npm test from backend/: 61 passed, 12 suites, zero failed/skipped (same as baseline).
- npm run build and npm run verify:package from backend/: passed; compiled runtime includes .cdsrc.json and public stub fixtures.
- Standalone npm run smoke -- --fresh on isolated copy: passed; counts 35/100/160, scores 100/82/83 and range 35/154/6 matched. Incident confirmation, audit, history and all four approval rejections verified.
- npm run verify:stubs against that copy: health and all five teammate fixtures passed.
- All 52 db/srv source and seed files compared byte-for-byte (normalizing Git line endings) with b9e9894: unchanged. Frontend unchanged. All 18 endpoint paths and OpenAPI remain unchanged.
- Main database integrity/data digest after smoke remained identical to the pre-move source and backup.

Root convenience commands and final link/staging review are recorded below after execution. No cloud deployment, push or merge was performed. Existing teammate/cloud/ground-truth external dependencies are unchanged.

## Final review

- Root npm run test:backend: 61 passed across 12 suites, zero failed/skipped. Root npm run dev:backend starts the backend with its correct working directory/database; health, authenticated tool register and six health/stub checks pass on unchanged localhost:4004/api.
- Main database checked again after startup: integrity ok, canonical data digest unchanged, 300 units, TS-0002 not allocated. Backup and all runtime/generated/dependency files are ignored.
- Original CAP configuration equals backend/.cdsrc.json exactly; backend package/dependency semantics remain identical after extracting that configuration. Backend lock, MTA, XSUAA, Jest config, OpenAPI and candidate ground truth match their originals byte-for-byte apart from Git newline normalization.
- Relative Markdown links were checked across repository/backend documents: no missing targets. No source, API behavior or test assertion was removed; only operational/test database paths changed.
- Only backend/.gitkeep was removed, because backend now contains the real project. No other source or teammate files were deleted. Frontend remains its original .gitkeep; no valid frontend start command exists until Vinayaka supplies a package.

Final repository layout (runtime entries are ignored):

```text
SAP_HACKFEST/
  backend/
    db/                  schema, seed, CSVs, HDI artifacts
    srv/                 unchanged platform libs and routers/stubs
    tests/results/       executed verification evidence
    scripts/             operational/build/verification commands
    docs/                backend setup, contract, examples and handover
    .cdsrc.json
    package.json
    package-lock.json
    jest.config.js
    mta.yaml
    xs-security.json
    README.md
    db.sqlite*           ignored preserved local database/sidecars/lock
    node_modules/        ignored dependencies
    gen/                 ignored reproducible build output
  frontend/.gitkeep      unchanged
  docs/architecture/     overview and ownership
  docs/api/              API navigation
  docs/team/             team navigation
  deploy/README.md       shared deployment navigation
  backup/                ignored consistent backups and isolated checks
  AGENTS.md
  .gitignore
  .gitattributes
  package.json           root convenience scripts only
  package-lock.json      empty root dependency graph
  README.md
```

Existing external limitations persist: provisional ground truth, five teammate stubs and unverified real-cloud deployment/audit/token checks. No push or merge is part of this work.
