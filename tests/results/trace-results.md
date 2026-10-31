# Executed trace results

Synthetic data, simulated services. Ground truth: PROVISIONAL candidate, awaiting Jamuna. API-level timing includes SQLite persistence and audit on this local test machine. Target <500ms; actual below.

| Window | Units expected/actual | C/P/U expected / actual | Stock/X/Y expected / actual | Score expected/actual | ms |
|---|---|---|---|---|---|
| 24 | 35 / 35 | 35/0/0 / 35/0/0 | 35/0/0 / 35/0/0 | 100 / 100 | 25.38 |
| 72 | 100 / 100 | 90/4/6 / 90/4/6 | 40/35/25 / 40/35/25 | 82 / 82 | 22.17 |
| 168 | 160 / 160 | 146/8/6 / 146/8/6 | 50/55/55 / 50/55/55 | 83 / 83 | 25.36 |

Exposure range expected 35/154/6; assertions verify every result. See summary.json for executed suite status.
