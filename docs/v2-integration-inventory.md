# ToolSathi V2 integration audit

Verified 2026-11-02. Clean starting tree on `feature/toolsathi-v2-core`, HEAD
`10a6ff0`. Fetch succeeded. `6f36773` is an ancestor of HEAD; HEAD equals
`origin/main`. `git merge origin/main` returned Already up to date. Shashank's
`6162563` is an ancestor of main (PR #5, `4aa5f71`); no separate merge or artificial
merge commit is needed. Local main remains untouched.

## Existing implementation

| Area | Actual implementation | Status / limitation |
|---|---|---|
| Frontend | React/Vite, Worker, Console, history, design kitchen, animated landing, glass components | Integrated; preserve design |
| Intake | Register-backed QR/manual selection, edited text, explicit incident confirmation | Working; no persisted multi-turn interview |
| AI | Shashank's Sarvam structured intake, transcription, speech readback, multilingual communication | Real provider adapters; successful live speech not established by offline tests |
| Retrieval | Local multilingual embeddings, SOP/incident citations | Implemented; optional model downloads required |
| Incidents | CDS Incident/Evidence, creation, confirmation, list/detail, closure | Persisted; original statements retained |
| Trace | Pure deterministic trace, window snapshots, tiers, gaps, value at risk | Regression protected; no AI |
| Approval | Proposals, role-specific decisions, approval-bound mock actions | Implemented, separately SIMULATED |
| Repairs | RepairLog, Technician completion, independent Verifier return | Implemented; assignment and qualification filtering missing |
| Duplicate/repeat | Platform ports of Member 4 rules; authenticated review endpoints | Token Jaccard, canonical translation fallback; no human link persistence |
| State rules | rules-adapter defaults | Optional Jamuna `srv/rules/state-machine` and `approvals` absent; ported logic present, original modules not present |
| Recovery | Grounded provider planner, approval-bound simulated executor | Implemented; capability gaps explicit |
| History/audit | ToolHistoryEvent, append-only AuditLog | Implemented application audit history |
| Database | CAP SQLite / HANA profiles, guarded transfer and deploy tools | HANA not changed or write-tested in this task |
| Identity | Worker, Manager, Quality, Technician, Verifier; XSUAA verification | Header roles development-only; no registration/profile UI |
| Website assistant | No general role-aware chatbot | Missing |
| Localization | Worker language paths and font packages | Whole website localization missing |

The existing API families are `/tools`, `/tools/:id/history`, `/incidents`
(list/create/detail/confirm/close), incident `/trace`, `/duplicates`,
`/repeat-failures`, `/proposals`, `/repairs`, `/verify-return`,
`/repairs/:id/complete`, `/approvals/:id/decision`, `/audit`, `/health`,
`/mock/*`, `/ai/structure-report`, `/ai/transcribe`, similarity and communication,
and recovery planning. Exact methods, schemas and route details live in
`backend/docs/openapi.yaml` and `backend/docs/api-contract.md`; the generated V2
API inventory adds all actual registered paths without replacing those contracts.

## Baseline verification

- Backend: 30 suites, 263 tests passed, isolated in-memory SQLite.
- Frontend: 32 tests passed; Vite production build passed.
- No HANA write, deployment, migration, database reset or push executed.
- Test reporters update tracked result artifacts; these are generated test results.

## Extension decisions

Reuse trusted XSUAA authentication rather than introduce local passwords. New
registration creates an application profile for an already authenticated identity;
privileged application onboarding needs an Administrator invitation and matching
identity-provider scope. An application invitation never grants an XSUAA scope.
New CDS tables require reviewed deployment; existing populated SQLite/HANA must not
be auto-migrated. Use a new isolated SQLite file or in-memory tests for V2.
