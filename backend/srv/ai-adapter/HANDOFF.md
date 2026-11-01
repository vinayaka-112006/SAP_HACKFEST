# Person 2 acceptance and teammate handoff

All paths below are relative to `/api`. The database and existing workflow contracts are unchanged. Every successful prototype response carries `SIMULATED`. Current prompt provenance is `intake-2|card-1`; older stored records retain their actual historical model versions.

| Feature | Working integration | Boundary |
|---|---|---|
| Speech/text intake | `POST /ai/transcribe?language=kn|hi|en`, then `POST /ai/structure-report` | Worker/Manager; original text and selected tool retained; no save or confirmation inside AI |
| Editable card | Existing worker Save and Confirm calls | Separate explicit actions; corrected fields and model provenance appear in application audit history |
| Readback | `POST /ai/readback` with explicit review and card or saved incident ID | Sarvam audio; edit/language/identity change invalidates playback; no auto-confirmation |
| Worker status | `GET /incidents/:id/status-text?language=kn|hi|en` | Reads persisted incident state; unrecognized state is Unknown |
| Similar reports/SOPs | `POST /ai/search`, `GET /incidents/:id/similar?scope=same-tool|all-tools` | Local model/keywords, exact excerpts and source citations; no duplicate or repair decision |
| Trace wording | `GET /incidents/:id/trace-explanation?window=24|72|168&language=kn|hi|en` | Existing snapshot ID/version, counts and gaps only; trace engine remains deterministic |
| Dealer draft | `POST /incidents/:id/dealer-draft` with `{approvalId,dealerId,language}` | Quality only; real approved QUALITY_NOTIFICATION for incident/tool plus dealer shipments in batch scope; atomic unsent draft/audit |

## Jamuna integration

The four workflow endpoints `/incidents/:id/duplicates`, `/incidents/:id/proposals`, `/approvals/:id/decision` and `/incidents/:id/verify-return` are still teammate stubs. The UI rejects `_stub:true` as unavailable. This adapter does not create fake approvals, merge incidents, decide return-to-service or substitute similarity scores for duplicate rules.

Duplicate review can consume `GET /incidents/:id/similar`: use `matches[].sourceId`, `sourceType`, exact `excerpt`, `citation`, source/content version and score provenance. Results are candidates requiring human/rule review. The current incident and its linked repairs are excluded; same-tool scope is the default. Do not treat an empty result as proof that the report is new or safe, or a score as fault confidence.

Dealer drafts are enabled once the approval owner creates the existing approved notification records with matching payload `{toolId,batchIds,...}`. The approval must identify its approving role/person/time. The service checks those records even when mock bypass flags are enabled. Test fixtures only create approvals in isolated SQLite; none are inserted into HANA for acceptance.

## Reproducible checks

Run from the repository root:

```powershell
# Offline fixture checks; no key or credits:
node backend/srv/ai-adapter/evaluate.js
node backend/srv/ai-adapter/speech-check.js
# Explicit paid checks using existing backend/.env:
node backend/srv/ai-adapter/evaluate.js --live
# Needs frontend 5173 and backend 4004; six calls maximum:
node backend/srv/ai-adapter/speech-check.js --live
# Local embeddings only; retains exit 1 for the documented Kannada miss:
node backend/srv/ai-adapter/similarity/evaluate.js
```

Intake evaluation caps a run at 30 calls for 15 cases, permits only the existing single schema-repair retry, and stops remaining calls on auth/credit/call-cap errors. Results are synthetic fixture checks, not production accuracy. The first Phase 5 run passed 13/15; it exposed vague reports being categorized as OTHER. Prompt version 2 reserves OTHER for concrete observations and local validation rejects contradictory missing fields. The rerun passed 15/15 using 16 calls. Both baseline and rerun metadata are retained under ignored `backup/phase5-intake-*.json`. The three synthetic speech checks used at most six calls; raw transcript review metadata is in `backup/phase5-speech-evaluation.json`. No business records are written by either evaluation CLI.

## Remaining acceptance dependencies

Final automated regression: 190 backend tests across 23 suites, 20 frontend client tests, six AI browser subchecks plus their parent, eight existing browser regression checks and the frontend production build passed. Browser/provider mocks and real provider checks are distinguished above. No cloud deployment or human sign-off is implied.

- Human Kannada/Hindi review of translations, template wording and pronunciation. The 15 references are draft synthetic expectations; category/code matching cannot establish translation faithfulness or production accuracy.
- Physical microphone/browser permission and factory-noise testing: open the worker screen, select language/tool, enter reporter ID, record a short issue, inspect/correct the transcript, structure and edit the card, listen, then deliberately Save and Confirm. Check audit provenance in the console. Repeat once per language and check denied microphone permission still permits typing.
- Catalogue owner must replace provisional NC descriptions and approve mappings. SOP owner must supply real procedure text; current three placeholder SOPs are deliberately excluded.
- Real teammate workflows and approval/duplicate handoff await their modules. Positive dealer persistence and rollback are tested using isolated SQLite, not real approval execution in HANA.
- Short Kannada-only wear retrieval remains a known miss (11/12 local calibration). Use reviewed English wording with the original report; do not lower semantic thresholds simply to fill results.

Implementation and automated acceptance are complete within Person 2's scope. These human/data/teammate dependencies are not represented as signed off.
