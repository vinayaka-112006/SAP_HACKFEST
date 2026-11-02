# Conversation and AI design

The original language and every submitted message are persisted separately from
translation and edited report evidence. Optional facts: symptom, onset,
equipmentStopped, productionStopped, safety, actionTaken, errorCode. Follow-ups
use English/Hindi/Kannada resources and skip known fields. `unknown` is an explicit
answer. A worker can proceed with missing facts; no event time, measurement or
production-impact estimate is invented. Session versions reject stale updates.

The teammate Sarvam adapter remains the provider abstraction. Optional category
extraction uses its NC catalogue/schema; a second bounded extraction collects
observations with exact original-text supporting quotes. Explicit worker facts
win over suggestions. Confidence is null on V2 saved reports. AI output remains
reviewable and requires explicit human confirmation. Safety observations and
obvious danger words show escalation guidance, without authorizing operation.

The existing MediaRecorder hook provides push-to-talk with visible recording,
20-second recording limit, microphone denial/error handling, transcription review
and text fallback. Raw audio is transient; no audio persistence was added.
Question readback calls the same Sarvam speech client only after explicit review.
This is push-to-talk, not continuous duplex speech. Real microphone and audible
language support were not exercised in this run.

Website assistant and repair guidance retrieve authorized records before optional
generation. Source IDs are checked against retrieved sources; unknown IDs reject
the model output. User and document strings are untrusted data in prompts. The
assistant has no write tools. Six requests per identity per minute, two active
V2 AI requests, bounded inputs and the existing provider call cap limit usage.
Provider failure is returned explicitly; typed/report/read-only records still work.

No LLM participates in trace calculations, eligibility, stock arithmetic, approval
gates or safe-return decisions. Live generation accuracy is not established by
the synthetic provider-contract tests.
