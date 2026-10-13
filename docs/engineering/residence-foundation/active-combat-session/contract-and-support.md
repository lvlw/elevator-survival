# E02-S supported contract and acceptance mapping

Author implementation, not mainline PASS or a new rule. Formal owner: [session contract](../active-combat-session-contract-v1.0.md), [lifecycle](../active-combat-lifecycle-contract-v1.0.md), [P](../active-combat-core-contract-v1.0.md), [R](../active-combat-restore-contract-v1.0.md).

Controlled entry: src/state/residence-session/combat-controlled.ts. Ordinary entry: combat-index.ts (types/error only). All test files below are new under src/state/residence-session/.

| Acceptance | Actual test/API evidence |
| --- | --- |
| S01 | combat-domain.test.ts: all 16 ordered v1/v2/v3/v4 pairs; invalid composition does not claim; cloned domain rejected. Existing domain registry reused unchanged. |
| S02 | combat-initial.test.ts and F-A: actual null read, real initial materials/stock, departure, move/first entry, monotonic creation and no refiring. |
| S03 | combat-expected.test.ts: cold facts before read, no provider candidate args, five complete points, wrong anchors/malformed facts, existing current protection and cold continuation equality. |
| S04 | combat-actions.test.ts and combat-longchain.integration.test.ts: three true profiles/CTB, full due responses, defense/escape, charged quota/last resource and legal E0 battle. Original P ordering tests remain unchanged. |
| S05 | combat-medical.test.ts: real bandage/painkiller, one actual quick unit, target/instance/quantity rejection, first-bandage marker, healing then death and E0 free stable medical. |
| S06 | combat-stable.test.ts and real routes: source once, explicit task item/stack/quick/ground transfer, split/merge conservation, immediate mechanical/coat/toolbox maintenance and recharge; retreat/rest/reentry. |
| S07 | combat-terminal.test.ts and true success route: success, voluntary/deadline failure, combat/stable/deadline death, killed-enemy none versus living combat-required, H0/Day7 empty steps. |
| S08 | combat-atomicity.test.ts: actual issued plan clone/JSON/stale/wrong dependency rejection, aggregate/encoder failures zero commit, producer exception visible and busy release. |
| S09 | F-A/F-B/F-C/F-D in initial/medical/persistence/terminal: failed writes, latest-memory continuation, multiple failures, retry save only, paired durable cold facts and real unsaved-progress loss. |
| S10 | combat-reentry.test.ts: read/material/cold/authority/producer/verification/aggregate/encode/write/notify/retry callbacks reject recursive mutation; immutable alias and listener isolation. |
| S11 | combat-history.test.ts: explicitly TEST older success/failure plus later true S CTB death keeps receipts, archives, origins/dispositions and wallet history. No second player content. |
| S12 | combat-session/compatibility/expected and observers: ordinary API, six old/new rejection directions, independent cold/retry counters, five points/real next commands and full old regression. |

## Command and atomic boundary

Strict envelopes support depart, move, source, task, task-transfer, inventory, medical, maintenance, rest, terminal and combat. Combat expectedBattleId is S-only and stripped before P. Stable families cannot bypass battle; closed/dead has no new action entry. No HP/roll/enemy-after/fee injection, arbitrary plan input or current replacement.

P authenticates complete before and plan; R validates the full state and all history including R-F01/F01/F02/F03 before encode. Death only installs final dead, retaining actual enemy kill/pending, spent item/resource and one revision. S does not repeat a P-consumed death or surviving exit fee. Save failure does not roll back, retry does not change current/reference/revision or notify.

## Evidence boundaries

Diagnostic getState contains full internal identities/enemy/world facts, not a final player ViewModel. Query methods delegate to existing P read-only queries; no S gameplay formula. Cold consistency is not cryptographic history authentication or cross-device rollback protection.

Current replacement counts are observed via reference changes at writes; cold installation is separately observed by null-to-current transition. Normal terminal calls lexical settlement internally: exported settle spy zero there is not zero settlement; sharedTerminal/terminate/receipt evidence is reported separately. Free G1 and normal-return planner calls are not paid action/overnight.

True first-play and older conditional history fixtures are separate. Quiet/max or explicit legal TEST draws are reported, not multi-seed balance. Browser IO/multitab/UI/Owner experience NOT RUN; O3 undecided; E03 not started.
