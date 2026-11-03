# Duplicate and repeat review

Reuse the existing Member 4 deterministic Jaccard function; keep its original
endpoint behavior unchanged. The V2 adapter uses exact equipment, same category,
event time within 30 days, normalized translation when present, original text as
fallback, and an advisory 0.45 word-overlap threshold. The score is lexical overlap,
not a probability. Identical work-center alone is never sufficient.

Optional `semantic=true` compares at most ten same-equipment reports within the
bounded event-time window using the existing Sarvam client. It can compare
Kannada/Hindi/English without an English translation. Returned IDs must belong
to the filtered pool. Provider outage/invalid output keeps deterministic candidates
and returns explicit semanticStatus. Synthetic contract tests do not establish
live semantic accuracy.

Closed prior reports are labeled REPEAT_FAILURE, never automatically linked.
An open report suggestion is POSSIBLE_DUPLICATE and requires human review. Manager
LINK, SEPARATE or INCORRECT decisions are terminal and audited. LINK preserves both
original reports and rejects child assignment/repair creation. Existing child work
must be resolved before linking. Canonical chains/cycles are rejected. Assignment
and relationship operations lock the incident; one work-order primary key plus
session version/idempotency protection prevent accidental duplicate primary work.

Tests cover normalized Kannada/Hindi reports, optional semantic cross-language
matching, invalid model IDs, repeat after closure, cycles, unauthorized linking,
concurrent submission/assignment and preservation of original descriptions.
