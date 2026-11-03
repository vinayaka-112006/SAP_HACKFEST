# Persisted V2 workflow

1. Worker selects a registered tool or validates QR contents against the register.
2. A conversation is bound to identity, equipment and original language. Worker
   supplies facts by text or reviewed transcript, may skip unknowns, and can ask
   for optional AI suggestions. Facts already supplied are omitted from follow-ups.
3. Worker reviews/edits the draft and explicitly selects Confirm and Submit.
   Transactional session submission retains all original messages, saves the
   edited description as evidence, creates a Confirmed Incident and writes audit
   and tool history. Retrying returns the same incident.
4. Manager reviews report/equipment/repair/containment/trace records, requests
   more information, reviews duplicates, then chooses an eligible technician.
   Assignment is investigation authorization; it creates no containment Approval.
5. The technician receives a persisted notification and accepts the work order.
   Actual repair still needs the existing approved tool restriction workflow.
6. Existing repair APIs record description and passing/failing named readings.
   Parts are reserved/used/released explicitly from compatible stored inventory.
   Guidance cites source records and cannot authorize work or certify safety.
7. Technician submits findings and the passing RepairLog ID. Manager reviews
   Submitted work. Only Reviewed work may pass the existing independent Verifier
   return-to-service gate. Technician and verifier identities must differ.
8. Verification updates work order to Closed in the same transaction as existing
   repair verification and tool-state changes. Incident closure remains an explicit
   existing console action; work completion alone never makes equipment Active.

Work-order states: Assigned → Accepted → Submitted → Reviewed → Closed. Incident
and tool state machines retain their established meaning. Legacy unassigned repair
scenarios remain available only in ordinary development demos; the V2 launcher
sets assignment enforcement. Production cannot use demo role headers.

Every successful V2 mutation records application audit history in its transaction.
Linking does not erase reports, raw descriptions, authors, timestamps or audit rows.
