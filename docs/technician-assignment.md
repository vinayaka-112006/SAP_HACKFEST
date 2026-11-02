# Technician eligibility and assignment

Administrator records an EquipmentRequirement for the exact Tool.type: required
skill, certification and safety authorization. Without an approved requirement,
eligibility fails closed. TechnicianQualification must match those exact values,
have a future certification expiry, match the actual work center, have a future
shift availability boundary, and allow another active assignment. An active
Technician UserProfile is also required. Ranking is deterministically by workload
then user ID after filtering; past experience cannot bypass a requirement.

Manager assignment locks the incident/tool and technician profile, rechecks
eligibility, and inserts a RepairWorkOrder keyed by incidentId. Repeated same-user
assignment reuses it; a conflicting primary assignee is rejected. Linked child
reports cannot receive primary work. Technician acceptance and repair execution
recheck eligibility, so expired credentials cannot be reused from an old list.

Notifications, manager identity, assignee, timestamps and application audit events
are persisted. Assigned repair uses the original RepairLog and Verifier endpoints;
Manager completion review is an additional gate. The existing approval record is
still required for simulated restriction; assignment does not authorize restriction,
stock blocking, product release or hazardous maintenance.

`npm run dev:v2` creates explicit synthetic profiles/policy/certifications/parts in
a new SQLite file. They are demonstration data and expire after one day. The
qualification UI currently accepts structured JSON for administrative records;
domain certification verification is a human administrative responsibility.
