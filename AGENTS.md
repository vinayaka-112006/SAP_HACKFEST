# ToolSathi platform instructions

## 1. Hard rules (non-negotiable)

1. **No AI or LLM in the trace.** The trace engine is deterministic code. It must give identical output for identical data.
2. Products are only ever "potentially exposed". The word "defective" must never appear in any API response or label.
3. Missing records produce **Unknown** with a stated reason, never "unaffected" and never silent inference.
4. Every state change and every approval-gated action writes an **append-only** audit entry (actor, role, action, details, reason, model version if any, timestamp). Call it "application audit history". Never call it tamper-proof.
5. Consequential actions (restrict tool, stock block, notification drafts) must not execute without a matching approved Approval record from the right role. Enforce this inside the mock services too.
6. Every mock/simulated response carries `"_label": "SIMULATED"`.
7. No secrets anywhere in the repo, logs, prompts or tests. Use environment variables. Add `.env`, `default-env.json`, `*.sqlite` backups with credentials, and service keys to `.gitignore`.
8. Stay inside your folders (section 3). Other people own the AI adapter, UI, and rule modules. Integrate through the seams described below.
9. Do not ask me questions. If something is unclear, choose the simplest option, record it in `docs/decisions.md` (what, why, how to change), and continue. Exceptions: the two STOP points.
10. Keep dependencies minimal. Prefer the standard library and well-known packages. If a framework API is uncertain, check the installed package's docs or type definitions rather than guessing, and note any workaround in `docs/decisions.md`.
11. Commit after every phase with a clear message. Never rewrite history.

## 2. Stack and fallback

Primary: **SAP CAP (Node.js)** with CDS data model. Local development on **SQLite** (`@cap-js/sqlite`), deployable to **SAP HANA Cloud** (`@cap-js/hana`) through a `production` profile. Use current stable `@sap/cds` and Node 20 or newer. REST routes are plain Express routers mounted under `/api` (via `cds.on('bootstrap', ...)` or the current CAP-recommended custom-server hook), using `cds.ql`/CDS database access for data.

Keep SQL portable (SQLite and HANA): no recursive CTEs, no vendor functions. Do joins with straightforward queries and compute tiers in JavaScript.

**Phase 0 spike rule:** if CAP with custom Express routes and SQLite is not working within about 30 minutes, switch to **Express + better-sqlite3** with the same schema (generate SQL from the CDS model with `cds compile --to sql` if possible, otherwise write `db/schema.sql`), keep the identical API contract, and record the switch in `docs/decisions.md`.

Test runner: Jest with `cds.test` for the CAP path (supertest if Express fallback). Keep to one runner.

## 3. Repository layout and ownership

```
db/schema.cds                      (you)
db/data/*.csv                      (you, generated)
db/seed/                           (you: generator, config, ground-truth generator)
srv/server.js                      (you: loads routers, auth, errors, CORS)
srv/lib/                           (you: audit.js, history.js, auth.js, errors.js, ids.js, rules-adapter.js, mock-actions.js, approvals-check.js, tool-state.js)
srv/routes/incident.router.js      (you)
srv/routes/tools.router.js         (you)
srv/routes/trace.router.js         (you)
srv/routes/audit.router.js         (you)
srv/routes/mock-s4.router.js       (you)
srv/routes/mock-dm.router.js       (you)
srv/routes/_stubs/                 (you: stubs for endpoints owned by others)
srv/ai-adapter/                    (Shashank: do not create anything here)
srv/rules/                         (Jamuna: do not create anything here)
app/                               (Vinayaka: do not touch)
tests/ground-truth.json            (Jamuna freezes it; you generate a candidate, see Phase 1)
tests/                             (you write platform tests; Jamuna adds rule tests)
docs/                              (you: api-contract, examples, seed, mapping, run-local, deploy-btp, decisions)
mta.yaml, xs-security.json, package.json, .gitignore, AGENTS.md
```

Create `AGENTS.md` first (Phase 0) containing sections 1, 2 and 3 of this prompt so future sessions keep the rules.

### Seams to other people's code

- **`srv/lib/rules-adapter.js`**: exposes `canIncidentTransition(from, to, ctx)`, `canToolTransition(from, to, ctx)`, `requiredApproverRole(proposalType)`. It first tries `require('../rules/state-machine')` and `require('../rules/approvals')` (Jamuna's modules). If missing, it uses built-in defaults taken from section 8 and logs once "using default rules". Never edit `srv/rules/`.
- **Router auto-load**: `srv/server.js` loads every `srv/routes/*.router.js` that exports `{ mount, router, owner }`. Others add their own router files without touching yours. Keep a registry of `METHOD path` already registered.
- **Stubs**: `srv/routes/_stubs/` registers fixed-JSON handlers only for contract endpoints that no real router has registered. Stubbed responses must include `"_stub": true`. When a teammate adds a real router, the stub disappears automatically.
- **Shared libs for others**: `audit.write()` and `history.append()` are importable by other routers.
