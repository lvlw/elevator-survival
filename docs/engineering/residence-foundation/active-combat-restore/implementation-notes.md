# E02-R implementation notes

## Actual starting point

- HEAD: `9ada1bd76c768b7bcff676b263e4533854064909`.
- Branch: `feature/residence-combat-restore-001`; initial worktree and index clean.
- Native baseline: 204 files / 3819 tests, exit 0, command-local `VITEST_MAX_WORKERS=2` (258.29s).
- The five input files were extracted outside the repository and byte/hash checked before archival.

## W1 design and ownership

The v4 envelope has only `format`, `formatVersion`, and `state`. Its state is the actual P `CombatValue`, not a converted v3 value. The P strict schema, aggregate reader, queue/trace/history checks remain the sole owners of combat facts, including F01/F02/F03.

The controlled policy holds an issued P dependency handle, binds approved configuration/content/catalog scope and `counter32-v1`, and keeps an owned immutable scope copy. Callers' objects are never frozen by this layer. The expectation explicitly binds identity, progress, declarations, original execution and initial choices, live battle entry/queue/intent/count/risk, and latest closure. Combat death additionally binds the actual entry and typed trace. No expectation factory accepts candidate data.

Same-progress restoration validates both supplied values independently before comparing their complete strict domain facts. Codec validation grants neither CombatAuthority nor SupplyAuthority and does not create a session, current, storage or notification endpoint.

## History reuse

The optional v3 helper extraction moves only format-neutral stored-history assertions to `shared-supply-history.ts`. Its caller supplies the domain-error reporter and an explicit typed combat-death callback. The old v3 wrapper always rejects that source and retains its signature, four source categories and error class. The G1 checkpoint rules, historical rest qualification, chronology, dispositions and origin-unit order remain shared rather than copied or weakened.

The v4 callback validates P combat death linkage and no G1 steps. P remains owner of requested damage, CTB timing, source/consumption math and terminal settlement. R compares recorded facts only, never replays actions, RNG or settlement.

## Test coordination boundary

Test expectations are captured from independently produced records before preparing candidate text. Initial execution is fixed from the separate bootstrap arguments, never extracted from candidate origins. Continuation tests grant P authority explicitly outside the codec and separate producer counts from zero-replay codec counts.

## Scope

No current installation, storage, browser, UI, E02-S/E03 or O3 decision. Existing tests and all core/content production files are read-only. Shared documentation is append-only. W01 is limited to the original two historical input files and seven hard breaks.

## E02-R-R1 design and actual first execution

Start 55fbf0f48e6a76bea3030bd77354528816581776, same feature/residence-combat-restore-001 branch, clean worktree/index. Actual full baseline 213 files / 3988 tests, exit 0, 342.92s, command-local two workers. All 13 listed payload hashes, 3 source blobs and 5 original E02-R input blobs matched before changes.

The native template was copied byte-exact and run before production changes: 12 tests, 8 pass / 4 fail, exit 1. Real P simultaneous-zero production succeeded. Aggregate/encode/decode/same-progress first failed at validateCombatDeathClosure's overstrong active pending requirement (INVALID_STATE), not import, type or fixture code. The same unchanged template passed all 12 after the narrow fix.

Only combat-body-history.ts changes production: require final dead, HP0 and complete typed binding, then jointly check archived execution/site/enemy/decision HP. A truly killed enemy additionally requires an actual attack followed by post-action bleeding and none pending; a still-living enemy requires its actual combat-required. No replay, repair or new rule. combat-history.ts remains unchanged.

New fixtures set explicit TEST health/bleeding BEFORE entry; basic/charged final kill, real retreat/reentry and later technician death all use P. Expected is fixed from independent actual output before candidate copying/text. Full committed comparison is unchanged. All old tests/helpers are read-only.

A new spy initially observed the controlled re-export rather than the internal consumer definition; its missed internal call was NOT semantic evidence. The test now spies on the actual terminal module and keeps the expected single consumer call. No production change was made for that observation issue.
