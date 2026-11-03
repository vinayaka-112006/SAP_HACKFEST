# ToolSathi V2 architecture and implementation inventory

This is the V2 baseline inventory. [V2.1 architecture](v2.1-architecture.md) and
[current handover](v2.1-handover.md) supersede its HANA deployment, provider,
localization and workforce status. The earlier limitations below remain historical
unless the current handover explicitly retains them.

See [integration audit](v2-integration-inventory.md), [all actual endpoints](v2-current-endpoints.md)
and [V2 API contract](v2-api-contract.md). Work remains on `feature/toolsathi-v2-core`.
Main and Shashank were already incorporated at the start; no competing AI/rules
implementation or artificial merge commit was created.

## Implemented

| Feature | Backend | Frontend / verification |
|---|---|---|
| Multilingual intake | Versioned, owner-bound persistent conversation; seven optional fact slots; unknown/skip; Sarvam extraction; exact supporting quotes for extracted facts; explicit idempotent confirmation | `/workspace`, equipment register/manual QR validation, editable draft, push-to-talk through existing recorder, transcript correction, selected-language question readback |
| Manager/Technician | Policy and certification eligibility, shift/workload filtering, transactional primary work order, notifications, progress, passing repair submission, Manager review, existing independent Verifier API | Workspace eligibility, assignment, work-order acceptance/progress/submission, review; existing evidence console retains repair/test/verification controls |
| Website assistant | Read-only, object-scoped retrieval; optional Sarvam answer; validated source IDs; provider errors retain authorized record fallback | Floating control on every page and workspace assistant; same language preference |
| Secure onboarding | Existing XSUAA trusted identity, Worker profile by default, bound one-use staff invitations, matching provider scope, Administrator-managed policy and qualifications | Profile/invitation/qualification controls; demo role controls disabled outside development |
| Duplicates | Existing deterministic rule reused; translated/original comparison, exact equipment/time bounds, optional multilingual semantic provider, terminal human decisions, primary work-order guard | Pre-submit suggestions, Manager duplicate review, LINK/SEPARATE/INCORRECT controls |
| Parts | Real inventory table, compatible stock, atomic reservations and explicit USE/RELEASE; retry protection | Technician inventory/context lookup, reserve/use/release controls |
| Review | Original conversation evidence plus edited worker description; Manager information request and owner response | Review/context display, persisted notifications and information controls |

## Data and compatibility

The original 21 entities remain unchanged. Ten additional entities are compiled:
UserProfile, UserInvitation, TechnicianQualification, EquipmentRequirement,
RepairWorkOrder, IncidentRelationship, ConversationSession, UserNotification,
SparePart, PartReservation. CDS compiles 31 SQLite/HANA tables. New references use
existing incident/tool/user identifiers with transaction-time existence checks;
the primary incident key enforces one primary work order. No live schema was
deployed, reset or migrated.

The existing HANA application can continue through its original routes. V2 HANA
routes require reviewed schema deployment and explicit `V2_WORKFLOW_ENABLED=true`.
Existing SQLite files are not auto-altered: V2 reports `V2_SCHEMA_REQUIRED` until
using a newly deployed database. `npm run dev:v2` creates a fresh separate SQLite
file under ignored `backup/`, enables assignment enforcement, and seeds explicit
synthetic qualifications and parts. It never selects HANA.

## Preserved modules

Shashank: Sarvam client, structured intake validation/prompt/schema, speech
transcription/readback, communication and similarity modules. Jamuna/Member 4:
ported duplicate/repeat algorithms, containment proposal and approval gates,
repair inspection and independent verification. Optional original `srv/rules`
files are absent; the existing adapter still uses documented fallback rules.
Platform: CAP transaction/IDs, audit/history, tool state, approvals, deterministic
trace, HANA configuration and guarded data-transfer tooling. Frontend: original
logo, landing, navbar/dock, glass styling, worker/console/history routes.

## Known limitations, explicitly not complete

- Complete localization of the older console, landing, history and design kitchen
  remains unfinished. The new workspace controls and interview prompts have
  English/Hindi/Kannada resources; technical source labels and some record/error
  text remain original. Plant-native review of translations is still required.
- Live Sarvam generation, microphone capture, transcription quality and audible
  language output are unverified in this pass. Provider contracts and failure
  handling are tested offline; no successful voice session is claimed.
- Production identity-provider sign-in/proxy deployment and real XSUAA grants are
  not provisioned here. Tests use mocked SDK verification; invitations alone never
  grant provider scopes. No local password database or fake login is introduced.
- Equipment-specific approved SOP status and numerical inspection tolerances
  are missing from existing records. Guidance explicitly requires technical review;
  existing `{name, passed}` inspection evidence remains provisional.
- Work-order reassignment, Manager reopening/correction after passing repair,
  and dedicated blocker scheduling controls remain future work. Findings can
  record blockers; the current order retains its primary technician.
- Optional evidence references use existing IncidentEvidence. Binary evidence
  upload/retention and an approved evidence store are not introduced.

These limitations are distinct from the tested local implementation. The four
V2 areas have usable integrated functionality, but full master-prompt acceptance
and production readiness are not claimed.
