# Person 2 — Phases 1 and 2

Sarvam typed intake and speech are connected through `srv/routes/ai.router.js` to the existing worker screen. No package, database model, trace, approval, startup or private environment-file changes. Embeddings, similarity search, read-back and message drafting remain later phases.

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
