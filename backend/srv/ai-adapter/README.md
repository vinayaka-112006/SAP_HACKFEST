# Person 2 — Phases 1–5

Sarvam typed intake, transcription, readback, local evidence retrieval and grounded multilingual communication are connected to the existing screens. Database models, trace engine, approval workflows, startup scripts and private environment files are unchanged. Phase 5 automated evaluation and handoff are complete within Person 2's scope; human acceptance, reviewed plant data and real teammate workflow integration remain external dependencies.

## Phase 5 — final evaluation and handoff

See [HANDOFF.md](HANDOFF.md) for endpoint ownership, reproducible checks, teammate seams and remaining acceptance steps.

- Full offline backend regression: **190 tests across 23 suites passed**, including AI, deterministic trace, schema/OpenAPI, permissions, incident persistence, approval checks, dealer-draft rollback and existing platform tests. The project's existing test dependencies were installed only in ignored `backup/phase5-tools`; application package files and runtime dependencies were not changed. The suite used `scripts/run-tests.js --reporters=default` with that directory and `backend/node_modules` on `NODE_PATH`, pinning in-memory SQLite. On a normal checkout with devDependencies installed, use `npm --prefix backend test`.
- Live typed intake: baseline **13/15**, then **15/15** after the missing-observation fix, five per language. The second run used 16 provider calls including one schema retry. These are synthetic calibration checks against draft expectations, not held-out or production accuracy. Prompt provenance is now `intake-2|card-1`; raw text remains unchanged. Vague concern with no concrete symptom must retain null symptom/category/NC, and local validation rejects missing-field contradictions. Translation faithfulness still requires human review.
- Live synthetic speech: **3/3** English/Hindi/Kannada TTS-generated WAVs returned nonempty, language-matched transcripts through the actual frontend proxy and authenticated speech endpoint. Maximum six Sarvam calls. This verifies the pipeline, not physical microphone behavior, transcription accuracy or pronunciation quality.
- Live integration verified the corrected Kannada/Hindi ambiguous cases through the current HTTP endpoint and returned version 2 provenance. Read-only HANA retrieval returned actual prior-report source citations. Three placeholder SOPs are excluded; future-dated incidents are excluded by the existing past-record policy. No evaluation created incidents or approvals in HANA.
- Local retrieval calibration remains **11/12**, with the known short Kannada wear miss. Reviewed English plus the original report retrieves that reference; unrelated-query exclusions remain intact. The evaluation intentionally exits nonzero rather than conceal the miss.

`node backend/srv/ai-adapter/evaluate.js` validates fixtures offline. Add `--live` explicitly to spend credits on the 15-case evaluation, capped at 30 calls per run. `node backend/srv/ai-adapter/speech-check.js` defaults to no calls; `--live` needs the local services and runs three synthetic audio checks. Reports remain under ignored `backup/phase5-*.json`. No new API key or subscription was required.

## Phase 4 — readback and grounded communication

No additional key, subscription or dependency is required. Readback uses the existing `SARVAM_API_KEY`; status, trace explanation and dealer text use versioned fixed English/Hindi/Kannada templates with no paid model call. Canonical codes, original reports, gap reasons and source IDs are retained; English translations stored in the card are explicitly labelled English. Plant-language review of wording and pronunciation remains part of final acceptance.

- **Worker card:** click **I reviewed this card — read aloud**, then use the audio controls. Sarvam `bulbul:v3` produces WAV in the selected language. The complete card includes original text, any stored English translation, tool, category, suggested NC, reporter and report time. A complete readback over 2400 characters is rejected rather than truncated. Review/Save/Confirm remain distinct; listening never confirms anything. Editing any card field, language or identity clears old audio, stops playback and cancels pending output. Audio is transient browser memory, with no auto-play or backend audio persistence.
- **Worker status or console:** click **Refresh status in my language**. The adapter reads the current incident from the database, returns its canonical state plus localized wording and read timestamp. Unrecognized state becomes Unknown. Status does not infer approval from a tool state or manufacture a repair decision. Refresh after workflow changes.
- **Review console:** after a normal deterministic trace has loaded, click **Explain this trace**. The adapter reads the latest stored snapshot for that window and returns its ID/version, exact tier counts, snapshot time and recorded gaps. It verifies counts against stored units and fails closed on inconsistencies. The UI rejects a version/window mismatch rather than present an explanation of another trace. CONFIRMED/PROBABLE are linkage tiers, never product-quality findings. Unknown is kept separate. Missing snapshots return 404; explanation never generates a trace or alters membership.
- **Quality console:** expand **Approval-bound dealer notice draft**, enter an approved Quality-notification approval ID and dealer ID, and click **Create dealer draft**. A matching approved record, incident/tool, approving role and dealer shipments inside approved batch scope are mandatory, even when development mock approval bypass is enabled. Only matching shipped batches appear. An unsent SIMULATED draft and application audit history are stored in one transaction. No emails or external messages are sent. Jamuna's workflow remains necessary to create approvals; its current stub cannot supply one. Positive persistence tests use isolated SQLite fixtures, never fabricated approvals in HANA.

Verification: 84 isolated AI/backend tests (including real SQLite persistence and rollback on failed audit), 20 frontend client tests, six AI browser subchecks plus their parent, eight existing browser regressions and the production build passed. An initial concurrent browser run timed out taking a screenshot; the complete existing suite passed when rerun alone. Full backend regression, cloud deployment, all 15 live intake cases and physical audio acceptance are not claimed here.

### Phase 4 endpoints

- `POST /api/ai/readback`: Worker/Manager; `{language, reviewed:true, card:{toolId,rawText,translatedText?,category?,suggestedNcCode?,reporterId?,reportedAt?}}` or `{language,reviewed:true,incidentId}`. With an incident ID, server fields take precedence. Returns text, content version, source IDs and base64 WAV. Six requests per actor/minute, two concurrent; the Phase 4 client caps provider use at 30 calls per process, separate from the existing intake client. Safe failure leaves on-screen review available.
- `GET /api/incidents/:id/status-text?language=kn|hi|en`: any authenticated application role. Read-only, no Sarvam calls.
- `GET /api/incidents/:id/trace-explanation?window=24|72|168&language=kn|hi|en`: Manager/Quality/Verifier. Existing trace snapshot only, no provider calls.
- `POST /api/incidents/:id/dealer-draft`: Quality; `{approvalId,dealerId,language?}`. Returns 201 with stored draft ID, source IDs and `sent:false`. Uses existing `MockDocument`/`AuditLog`; no model or schema changes.

Provider contract: https://docs.sarvam.ai/api-reference/text-to-speech/convert . Stable `bulbul:v3`, `language_code`, `shubh`, WAV/22050 Hz, server timeout and local credit cap. Live checks passed one English synthetic-card readback (valid 771500-byte WAV) and read-only English/Hindi/Kannada status against HANA. The chosen live incident had no stored 24h trace, and correctly returned 404 without creating one. Actual explanation and dealer draft persistence are checked against isolated SQLite. Browser provider audio is mocked; physical speaker/microphone and native-language pronunciation acceptance remain Phase 5 work.

## Setup and run

Add only this line to the existing private `backend/.env`, preserving all HANA settings:

```dotenv
SARVAM_API_KEY=your_actual_key
```

Optional: `SARVAM_CHAT_MODEL=sarvam-105b` (default). The module uses native Node 24 fetch, a 20-second deadline and up to 700 extraction output tokens. It retries invalid model output once; network/auth/quota failures are not retried. Speech uses `saaras:v3`, mode `transcribe`, preserving source-language text. The shared HTTP client is capped at 30 total provider calls per backend process, including retries and speech. This is not an account-wide or currency budget and resets on restart. HTTP intake permits at most two concurrent requests and six per actor per minute.

From the repository root:

```powershell
node backend/srv/ai-adapter/check.js --config-only
node backend/srv/ai-adapter/check.js --fixture=hi-01
npm exec --yes --package=jest@30.2.0 -- jest --config backend/srv/ai-adapter/jest.config.js --runInBand
node --test frontend/scripts/ai.integration.test.cjs
```

The first command checks key presence without displaying it or spending credits. The second makes one live extraction call (at most two with repair retry), prints a synthetic editable card and token usage, and never saves an incident or connects to HANA. Routine Jest tests inject mock provider responses and spend no credits. The third command obtains Jest through npm's temporary cache without changing project package files. The module itself has no new dependencies.

## Contract

`createIntake({client, catalogue?, reviewThreshold?})(input)` accepts `toolId`, `language` (`kn/hi/en`), `rawText` (1–2000 characters), optional `reporterId` and UTC `reportedAt`. The HTTP route checks tool existence and reads the current NC catalogue through CAP. Intake/transcription never create or confirm an incident. Existing Save Incident and separate Confirm Incident actions retain their original persistence/audit behavior.

Response preserves original text and selected context, and adds English translation, symptom, category, NC suggestion, detected language, mentioned tool, confidence, missing fields, warnings and model provenance. `modelVersion` fits the existing incident/audit field. No identity or timestamp is invented. Confidence is uncalibrated model self-assessment, not speech accuracy or evidence of a fault. All cards require explicit worker confirmation. Provisional catalogue warnings currently always require review.

Sarvam is called with `json_object` and the schema supplied in the prompt, followed by mandatory local schema validation. Live testing found strict grammar rejects `uniqueItems` and can emit whitespace until the token cap, even after stripping validation bounds. JSON mode produced complete, locally validated cards. V1 thinking is disabled with `reasoning_effort: null`, per the documented API. Dependency-free validation supports exactly this fixed schema's keywords and fails closed for unsupported extensions. Business checks reject unknown/mismatched NC codes and prohibited English wording. Semantic guardrails still require real multilingual evaluation and worker review, not just schema checks.

## HTTP and worker integration

- `POST /api/ai/structure-report`: JSON input as above, Worker/Manager authentication required. Returns editable suggestions with `_stub:false`, provenance, warnings and missing fields.
- `POST /api/ai/transcribe?language=kn|hi|en`: raw audio body, Worker/Manager authentication required. Supported content types: audio/webm, audio/ogg, audio/mp4, audio/wav, audio/mpeg; at most 2 MiB. Returns transcript, detected language, speech model and a review requirement. No disk uploads.
- UI: select tool/language, record at most 20 seconds, stop and review/correct transcript, then Structure with AI or Review Manual Incident Card. Sarvam rejects audio beyond its 30-second synchronous limit. Provider-supported MIME formats are used directly; no transcoding dependency.
- Microphone tracks and pending callbacks are cancelled on navigation, language/session changes and unmount. Permission denial, unsupported devices and provider failure retain manual input. Conflicting tool mentions require an explicit acknowledgment; editing the tool invalidates that acknowledgment.
- Development enables AI by default. `VITE_AI_ENABLED=false` disables AI/recording and keeps manual reporting. Keys remain backend-only. API calls retain existing demo headers locally and require verified identity in production.
- Saving an AI card forwards `modelVersion` through the existing incident/audit path. Speech-derived cards append the speech model ID. Confidence is labelled self-assessment, not measured accuracy. The NC catalogue is still provisional.

## Provisional data and outstanding work

The 15 synthetic references (five per language) are draft expectations, not human-approved translations or measured model accuracy. `symptomEnglish` is a semantic reference, not an exact string-match target. The existing seed catalogue is read-only and still has placeholder descriptions; no catalogue approval is implied. Its owner must supply reviewed plant definitions before production use.

Validation: 47 Jest AI/HTTP tests, 18 frontend client tests, eight existing isolated browser regression checks and four AI browser subchecks passed. The AI browser checks mock Sarvam but use actual isolated SQLite incident creation/confirmation and audit reads, verifying model provenance. Frontend production build passed. No full backend Jest regression or cloud deployment is claimed in this phase.

Live Sarvam checks through the running frontend proxy passed one typed torque sample in each language and a short Windows-synthesized English audio clip. All three typed samples returned TORQUE / NC-TORQUE-LOOSE and preserved original text; audio returned the intended English report. This is a small synthetic acceptance check, not 15/15 measured accuracy or a physical-microphone/noisy-factory test. Live checks did not create incidents; authorization-denial checks may append application rejection audit entries. Raw live result metadata is under ignored `backup/phase2-live-results.json`.

Sarvam contract reference: https://docs.sarvam.ai/api/token-factory/chat-completions

The user's explicit request authorizes Shashank's AI module despite the older platform-only ownership instructions. Changes outside this folder are limited to its router, worker/API bindings, and directly affected contract/test tooling. Existing `.env` and the pre-existing removal of `backend/.env.example` are untouched. Stub probes and ordinary smoke checks skip real AI so they cannot silently consume credits.

## Phase 3 — local evidence retrieval

### Setup and usage

`@huggingface/transformers` 3.8.1 is an optional backend dependency. Failure to install/load the native inference runtime does not prevent backend startup or reporting; search explicitly falls back to keywords. No embedding API key or Sarvam credits are needed.

```powershell
# One-time public model download, then offline CPU inference:
node backend/srv/ai-adapter/similarity/embeddings.js --download
# Small local calibration evaluation (exit 1 if any case misses):
node backend/srv/ai-adapter/similarity/evaluate.js
```

Model: Xenova/multilingual-e5-small, revision `761b726dd34fb83930e26aab4e9ac3899aa1fa78`, q8 ONNX, mean pooling, L2-normalized 384-dimensional vectors. Query/passages use the E5 `query:` and `passage:` prefixes. Native CPU inference is limited to two intra-operation threads. Model files are about 135 MB and live under ignored `backup/ai-models`; hashed-vector cache lives under ignored `backup/ai-search`. Neither is committed. Runtime requests never download a model or call an external embedding provider. A fresh checkout requires the explicit download command for semantic search.

On a worker's reviewed card or the incident console, click **Find similar records**. Retrieval is on demand and read-only. **Include other tools** changes the scope and clears prior results. Source IDs, exact excerpts, SOP sections where recorded, content-version hashes, Unicode character spans and embedding provenance are inspectable. Relevance scores are not probabilities or physical fault findings. Source text is displayed as evidence, never executed as instructions or rewritten into invented repair steps.

### Endpoints and boundaries

- `POST /api/ai/search`: `{query, toolId?, category?, asOf?, limit?}`; 1–2000 query characters and limit 1–10 (default 5). Uses existing incident/history read permissions: any authenticated application role.
- `GET /api/incidents/:id/similar?scope=same-tool|all-tools&limit=5`: derives query and anchor from the stored incident; excludes that incident and its linked repair notes. Same-tool is the default. Jamuna's `/duplicates` endpoint and workflow are untouched; no record is merged or flagged as a confirmed duplicate.
- Sources are current CAP Incident, RepairLog and SopDoc rows, read in one transaction. No HANA model changes or business-record writes. Invalid/missing repair descriptions and conflicting tool links are excluded with warnings. Future incidents/repairs are excluded relative to the supplied/incident anchor. SOP revision dates do not exist in the current schema, so current text is searched with that limitation stated.
- Every request rebuilds its source manifest from current rows; changed text produces a new content version, and deleted records cannot remain in results through an old persisted text index. Only reusable hashes/vectors are cached.
- Prototype limits: first 500 records per source table, at most 1000 passages, 900 Unicode-code-point chunks with 120-character overlap, bounded 4000-vector cache. Source/passage limits produce warnings. This is a small-corpus prototype, not production-scale search.
- Keyword scoring uses query coverage weighted by document frequency. Hybrid ranking adds cosine similarity; provisional policy `hybrid-1` uses keyword minimum 0.2, semantic minimum 0.8 and a 0.03 window from the best semantic candidate. Model/policy versions and score meaning are returned. No result is manufactured to fill a requested limit.
- The three live SOP entries are placeholders and are excluded explicitly. Reviewed SOP text must be supplied through the existing data-owner process before useful live procedure retrieval is possible. Test SOP passages exist only in isolated evaluation fixtures.

### Phase 3 verification and limitations

61 offline Jest tests and 19 frontend client tests pass. Eight existing browser regression checks pass. Extended isolated AI browser checks cover citation display, clearing results when card context changes, retrieval failure preserving manual review, and the existing speech/save/confirm path. Provider responses in those UI checks are mocked; actual HANA/local-model retrieval was checked separately through the running frontend proxy, with no Sarvam calls.

Local calibration: **11/12 cases**, not a held-out accuracy estimate. Eight of nine raw English/Hindi/Kannada positive queries found their expected source within the first three results; two unrelated queries returned no matches; the additional reviewed-English-assisted Kannada wear query passed. The short raw Kannada wear query missed and the evaluation deliberately retains a nonzero exit status for it. Results must not be presented as 100% multilingual accuracy. The worker search includes the reviewed English intake translation when available and explains the no-match fallback. Raw calibration and live read-only result metadata are in ignored `backup/phase3-retrieval-evaluation.json` and `backup/phase3-live-results.json`.

References: https://huggingface.co/Xenova/multilingual-e5-small and https://huggingface.co/intfloat/multilingual-e5-small . Installed Transformers.js and ONNX Runtime type definitions were checked for local-only loading and session/thread options.
