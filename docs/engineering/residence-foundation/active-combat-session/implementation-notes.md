# E02-S implementation notes

Author implementation and native verification, awaiting exact-SHA mainline review. This is not a rule source or an O3/experience approval.

## Baseline and inputs

Start 29a018a2ad64f8d5cbe56257381568bf3527cd08; parent 55fbf0f48e6a76bea3030bd77354528816581776; tree b7abd390b7a94d3367a79876588e87c1850feeac. Initially clean worktree/index on the R branch; created feature/residence-combat-session-001 from that exact SHA. Real complete baseline: 215 files / 4032 tests, exit 0, 266.93s, command-local two workers. Package five originals and four listed SHA256 entries preserved; old P/R and session/domain remain read-only.

## Detailed design

New combat-controlled issues the explicit v4 owner using the existing domain registry; combat-index exports only types/error, no construction or replace/reset/install. Composition is strictly checked before claim, copies synchronous ports without freezing caller shells, rejects accessors/known async/generator callbacks and checks actual read/write/provider/listener results. Command data is checked for accessors, cycles, sparse/extra-key arrays before per-intent strict parsing.

The owner retains one frozen complete CombatValue and its validated expected. Cold expected is supplied without candidate arguments and fixed before read; an existing/cold provider is prior-progress evidence and permanently revokes first creation. Non-null/bad/non-string reads cannot be retried to null to reopen creation. A read exception alone is not absence. Initial materials are validated independently before the real establishCombatInitial call.

Dispatch uses complete private current, strict revision/phase/battle binding, an actual P authority, the actual P command and original WeakMap plan verification. P may already return final dead, including stable move/maintenance and combat death; S never consumes it again. The S battle ID is checked then removed before the strict P request. Submit expected is derived only after authenticating the complete P result, with retained external initial material and history/mission continuity checks; this is not cold-candidate self-authorization.

R aggregate and full pre-encoding precede current replacement. Write failure retains all latest facts. Retry validates/encodes/writes current using its retained expected, preserving current reference, revision and notification count. No last command is stored or replayed. Cold load reads once/decodes once/installs once, with no write or gameplay notification. Busy spans every operation and external/observable boundary; listener exceptions/nonvoid returns are isolated after the complete commit.

## Actual revisions and failures

- Initial typecheck rejected readonly R expected arrays and a symbol index. New S adapters now use R parsing/readonly output roles; no old type or schema changed.
- First longchain: five failures. New S wrongly treated firstBandageUsed as an immutable choice; fixed continuity to lock only tool/specialty while R validates the actual medical marker. New helper self-node movement and ItemState array path were also corrected. All five then passed.
- New observer imports were corrected to actual definitions. A same-module raw-action export spy missed lexical calls; it was removed rather than claimed as zero execution. Actual CTB resolver/plan/reducer and the imported death consumer are independently observed.
- Normal H0 invokes the G1 normal-return planner once, but returns true empty steps and unchanged body/cycle. Stable free medical likewise invokes G1 with a free-zero request. Initial new count expectations confused planner invocation with paid action/night; corrected against real call arguments and state assertions.
- New recharge test initially used the old hospital capacity 3. It now asserts the approved new configuration capacity.lamp (8), without changing any production value.
- First complete new suite: 161 pass / 1 count-assertion fail; corrected the free-medical planner observation. Final new suite: 14 files / 162 pass, exit 0. Failures are preserved in outside-repository logs, not labeled semantic findings against old code.

## Evidence and limits

Actual counts are in verification-results.json as a column/row matrix. Exported settleSupplyDomain observes imported calls (e.g. death); normal terminal's same-module lexical settlement is instead bounded by the actual shared terminal call, single terminate, one receipt and complete result. It is not claimed to have performed zero settlement. Codec counts, cold installation, retry and producer work are measured separately.

Real read-null success route uses only S dispatch and all three CTB enemies, sources, transport, installation, sample and H0 success. Each enemy also has real retreat/rest/reentry/victory. Older two-declaration historical fixtures explicitly retain their TEST danger-cleared scope; the later execution uses real S entry/CTB/healing death. No new player declaration is registered.

Three outside-repository negative controls are business failures, exit 1: omit plan authentication (clone accepted), replay last intent during retry (CTB/progress/current changes), bypass shared-domain claim (second writer accepted). No old source/test edits or production mutation switches. Historical mutants NOT RE-RUN.

No browser Storage adapter, multitab, UI/player entry, E03, O3, Owner experience or shutdown. Final full check/audit and branch-only Git delivery follow this tested snapshot; exact SHA belongs in the post-commit receipt, not an amend loop.
