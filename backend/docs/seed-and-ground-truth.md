# Synthetic seed and provisional ground truth

Paths and npm commands in this document are relative to the `backend/` CAP project unless stated otherwise. Repository-wide backups live in `../backup/`.

Anchor T = 2026-11-04T05:12:00Z, stock snapshot T-10min, stale threshold 48h. 300 serials, INR 3200 each, LINE-BRAKE-1 / BRAKE-ASM-01. Tools A/B/C at WC-A/B/C. All data is synthetic; services simulated.

`db/seed/plan.js` is the construction specification. `npm run seed` produces CSVs, two demo incidents and tests/ground-truth.candidate.json. It does not reset a live database. `npm run verify-ground-truth` checks bytes against the plan, independently loads CSVs through CAP into SQLite, and checks exact serial ranges and source links without importing trace code. Repeated generation is byte-identical. Jamuna must review/freeze tests/ground-truth.json; it is not created here. If present, any difference fails loudly.

| Window B | Total | Confirmed | Probable | Unknown | Stock | X | Y | Score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 24h | 35 | 35 | 0 | 0 | 35 | 0 | 0 | 100 |
| 72h | 100 | 90 | 4 | 6 | 40 | 35 | 25 | 82 |
| 168h | 160 | 146 | 8 | 6 | 50 | 55 | 55 | 83 |

B exact scope: 1?35, 1?100, 1?160; Probable 72?75 and (168h) 127?130; Unknown 76?81. Exposure range 35/154/6. A exact scope 201?205, 201?215, 201?250. C empty. B 161?200 and C 251?300 remain outside. See plan.js for every batch, time, location and boundary.

DUP has two source links; CONFLICT has missing tool-use end and run end 20min before start; NOREC has no source event; STALE has one shipment 60h before snapshot; NOEND has missing event end with valid run. Old incident TS-0001 is imported as closed historical data with passing repair, calibration and timeline events, with a clearly marked historical import audit rather than fabricated past transition audits. Next incident is TS-0002. Proposal/Approval are not seeded.

All assumptions, including run-bounded handling of open-ended links, are in decisions.md. Ground truth has not been approved by Jamuna.
