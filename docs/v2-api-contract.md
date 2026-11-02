# V2 API contract

Generated from `backend/scripts/update-v2-contract.js`; exact schemas extend `backend/docs/openapi.yaml`. All paths below are relative to `/api`. Successful V2 endpoints return HTTP 200 and `_label: SIMULATED`, `_stub: false`. This labels the manufacturing demonstration; external AI calls use real adapters.

| Method and path | Authority | Required body fields | Optional body fields |
|---|---|---|---|
| POST /v2/register | Any authenticated role | displayName language workCenter team | invitationId |
| GET /v2/me | Any authenticated role | — | — |
| POST /v2/invitations | Administrator | userId role | — |
| PUT /v2/qualifications/{userId} | Administrator | toolType workCenter skill certification expiresAt safetyAuthorization availableUntil maxAssignments | — |
| PUT /v2/equipment-requirements/{type} | Administrator | skill certification safetyAuthorization | — |
| PUT /v2/parts/{id} | Administrator | name toolType location quantity reorderThreshold | — |
| GET /v2/incidents/{id}/review | Manager Quality Verifier; assigned Technician | — | — |
| POST /v2/incidents/{id}/information-request | Manager | message | — |
| POST /v2/incidents/{id}/information | Owning Worker | message | — |
| GET /v2/incidents/{id}/technicians | Manager | — | — |
| POST /v2/incidents/{id}/assign | Manager | technicianId | — |
| GET /v2/work-orders | Manager Quality Verifier; Technician sees own | — | — |
| POST /v2/incidents/{id}/work | Assigned Technician / Manager review | action | findings repairId |
| GET /v2/incidents/{id}/duplicates | Manager Quality | — | — |
| POST /v2/incidents/{id}/relationship | Manager | canonicalId decision reason | — |
| GET /v2/incidents/{id}/repair-context | Manager or assigned Technician | — | — |
| POST /v2/incidents/{id}/repair-guidance | Manager or assigned Technician | — | — |
| POST /v2/incidents/{id}/parts | Assigned Technician | partId quantity | — |
| POST /v2/incidents/{id}/parts/{partId}/decision | Assigned Technician | action | — |
| POST /v2/conversations | Worker Manager | toolId language | — |
| GET /v2/conversations/{id} | Session owner Worker Manager | — | — |
| GET /v2/conversations/{id}/duplicates | Session owner Worker Manager | — | — |
| POST /v2/conversations/{id}/readback | Session owner Worker Manager | reviewed | — |
| POST /v2/conversations/{id}/messages | Session owner Worker Manager | version text | facts extract |
| POST /v2/conversations/{id}/submit | Session owner Worker Manager | version confirmed description | category translatedText reportedAt |
| POST /v2/chat | Any authenticated role; object and tool permissions enforced | message language | incidentId generate tool |

Errors: 400 validation, 401 authentication, 403 role/scope/ownership, 404 missing record, 409 state/conflicting retry/schema not enabled, 429 rate limit, 500 database/internal. AI outages normally return explicit providerStatus/semanticStatus with usable manual or deterministic results; no provider success is fabricated.

Assignment retries reuse the existing primary work order only for the same technician. Session submissions reuse the saved incident; stale versions reject message updates. Relationship decisions are terminal; reports and original authors remain intact. Inventory reservations and use/release decisions are transactional and repeat-safe. Manager assignment never creates a containment Approval. Every V2 mutation writes application audit history.

Facts: symptom, onset, equipmentStopped, productionStopped, safety, actionTaken, errorCode. Values must be explicit text or boolean; `unknown` is supported. `/work` actions: accept, progress, submit, review. Submit requires findings and a passing repairId from the existing repair API. `/relationship` decisions: LINK, SEPARATE, INCORRECT. Parts decisions: USE, RELEASE. Chat read tools: status, queue, eligibility, history, parts, procedures, workOrders; technical and review tools enforce role checks.
