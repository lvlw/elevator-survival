# ENG-RESIDENCE-COMBAT-CORE-001 (E02-P) Completion

Author implementation/verification report. Exact-SHA external source review is pending; this is not R/S, save, session or player acceptance.

## Start and tests

- Start HEAD: `4166fb25ab2898ca602043fbddacbb88d3444fdf`; parent `464b59d657184636b897f72375eb6b61bd2c5786`; start tree `88f85400fe094918c122bab87a6384eb97f7291f`.
- Clean source branch: `feature/design-world-entry-005`. New branch: `feature/residence-combat-core-001`, created at the exact start. Origin: `https://github.com/lvlw/elevator-survival.git`.
- Actual starting `npm run test:run`: exit 0, 179 files / 3621 tests, 79.44s.
- Final complete `npm run check`: exit 0; architecture 52 DEC / 327 core files, typecheck PASS, 198 files / 3723 tests PASS, build PASS. Existing build chunk-size warning retained; no configuration/dependency change to suppress it.
- New tests: 19 files / 102 cases; replaced/deleted/modified old cases: 0; net +102. Final core-only command: 16 files / 85 cases PASS. The 3 additional profile/content test files have 17 cases and are included in the complete suite.
- Earlier affected legacy subset: 65 files / 1259 tests PASS; complete final check reran all baseline tests, including CTB/hospital, P/R/S and old terminal/restore/session.

## Delivered behavior

The independent content factory supplies orderly/porter/technician profiles bound to approved tables, actual first CTB 70/150/60 and actual wound/risk/action types. Real grant/departure/G2 movement creates entry before interpreting the arrival encountered flag; reentry is 0/50 and retains the same enemy state. Last E-positive move may enter at E0; movement HP0 closes before battle.

One CTB engine handles primary effects, actual quick medicine, own bleeding, death before victory, and all required enemy responses. Contusion is not an open wound. Defense, last positive armor/weapon resource, delayed action, locked escape and completion bleeding retain the approved semantics. Alive victory/escape charges elapsed energy once, death does not charge an alive exit fee.

`residence-combat-pure-v1` owns one body, inventory, resource/state collection, persistent enemy/site, mission/wallet and provenance. It records entry/most-recent decision/exit/death evidence, not duplicate snapshots. Stable P operations are shared, not copied or obtained by erasing combat fields. Old P capability/protocol isolation remains strict.

Typed combat death is a private original-plan proposal; the consumer binds independent before/deps/entry/execution/revision and closes once through A. It does not replay CTB, RNG, medicine or G1, add another revision, or publish an HP0 active intermediate. A genuine later reentry death is independently covered.

Real post-combat source/task/transport/split/merge/medical/repair/recharge/rest/terminal operations remain available. A full native chain defeats all three enemies, produces and carries actual objectives/materials, installs and delivers the sample for genuine reward 120. No enemy removal or hand-set task completion is used. Separate TEST-only older success/failure history preserves receipts/dispositions/archives through a later real death.

## Independent counters (observed after fixture construction where applicable)

| Operation | Observed evidence |
| --- | --- |
| Initial / departure | 4 real origins, 1 activate, 1 character cycle, 0 action/move; the next one-edge move adds 1 G1 action and 1 G2 bound move. |
| New heal → enemy death | CTB resolution 1, effect reduction 1, draw 0 for lethal direct response; consumer adds 0 CTB/reduction/draw/G1 action/cycle, terminate 1, revision +1 total. |
| Nonlethal basic response | 1 enemy response, 1 injury draw, site risk cursor +1; exposure-none adds no exposure draw. |
| Multiple response command | Actual technician responses at CTB 640 and 750; 3 draws (two injury, one exposure), one command revision. |
| Quick use | Quantity 1, one use witness and one medical disposition, consumed origin allocation absent, source slot empty. No auto refill. |
| Alive exit | One ClosedBattleReceipt, one actual energy decrement, no per-action energy; isolated 0/99/100/101/201 boundaries and real victory/retreat both covered. |
| H0 / Day7 terminal | G1 action 0, character cycle 1, terminate 1; H0 real steps=[]; remote deadline has real live/dead cycle steps. |
| Repeated parse/query | CTB/action/cycle/origin/terminate/draw increments all 0; caller mutable object remains unchanged and unfrozen. |
| IO/current/notification | Not connected in P: no storage/current/notification implementation or claimed save-once acceptance. |

Exact APIs, all twelve acceptance groups, test files and support/rejection boundaries: [contract-and-support](contract-and-support.md). Actual existing-file necessity and self-review failures: [implementation-notes](implementation-notes.md).

## Semantic negative controls

External copied source, never repository production switches: first-entry mistakenly 50 (4 failures); duplicate alive exit debit (1 failure); bypass raw trace validation (6 failures); death consumer re-runs real CTB (1 failure). Each failed on business assertions/extra actual calls. The initial Vite cache permission failure is excluded. Normal final suite passed after all corrections. Logs remain outside the repository at the paths/digests listed in verification-results.json.

## Integrity and scope

All actual paths are within the 116-path maximum. Shared documents are append-only with exact original byte prefixes. Five input files match package bytes; five approved contracts and all four referenced configuration/content JSON digests match. All baseline tests/helpers, G1/G2/identity, old restore/session codecs, state/app/UI, approved rules/parameters, AGENTS, package/lock, CI/scripts and ordinary exports remain unchanged by canonical Git-object checks.

Ordinary, cached and exact-start increment checks are clean. Historical cumulative W01 returns exit 2 only for the original two input files, seven specified hard breaks; neither blob was modified. No eighth exception or new whitespace issue was accepted.

## Git and stop point

The authorized ordinary commit/push is restricted to `feature/residence-combat-core-001`; final commit/parent/tree, remote ref verification, clean status and CI actual state are supplied in the final external receipt to avoid a self-referential commit SHA. No merge, force-push, main/old-branch push or amend is authorized.

No rule or UI-design conflict found. No uncompleted item within E02-P acceptance identified. E02-R/S/E03, v4 codec, current installation, persistence, browser/player entry, multi-tab and O3 are NOT RUN and not represented as passed. Stop for exact-SHA pure-core source review; do not enter another engineering batch automatically.

## ENG-RESIDENCE-COMBAT-CORE-001-R1 completion (2026-10-12)

Author implementation and native verification, not a mainline exact-SHA review approval. The original P report above and its verification object remain historical evidence. The R1 final commit, parent, tree, remote and CI observation are supplied in the external receipt; no self-referential amend is performed.

### Start and actual tests

- Exact start `9f0eaacfbb83e49401c52fb57c3cfa061b2ef026`; parent `4166fb25ab2898ca602043fbddacbb88d3444fdf`; tree `249accacd9327f7610544f10c84e4f8246ae369e`. Continued `feature/residence-combat-core-001`; clean worktree/index, no new branch.
- Actual initial `npm run test:run` and unchanged repeat: 198 files / 3723 tests, 3722 passed and the same existing 5000ms supply-session long-chain timeout. These failures are retained, not reported as PASS. Unchanged baseline with `--maxWorkers=2`: all 198 / 3723 passed. No timeout, old test or configuration was changed.
- Final `npm run check`, environment `VITEST_MAX_WORKERS=2`: exit 0; architecture 52 DEC / 329 core production files; typecheck PASS; 201 files / 3781 tests PASS (255.20s); build PASS. The pre-existing >500kB client chunk warning remains.
- New tests: 3 files / 58 actual expanded cases (44 regression, 5 purity, 9 integration); replaced/deleted/modified original tests: 0; net +58. All original 102 P tests and all earlier 3621 tests remain.
- Final combined targeted run: 130 files / 2390 tests PASS, including new R1, original P, legacy CTB/hospital, E01-P/R/S, terminal/save/session, G1/G2 and identity. An earlier full check at 3780 tests is separately retained, not substituted for the final 3781 run.

### Native reproduction: each original case

The supplied template ran byte-exact before production edits: 12 passed / 8 failed, exit 1, zero import/type/fixture failures and zero template repairs. The exact original source snapshot and complete output remain outside the repository. Each following F failure was an invalid record accepted by the real aggregate API, not just the mainline isolated stub harness.

| Native ID | Before | After |
| --- | --- | --- |
| C01 active-basic100 | legal accepted | legal accepted |
| C02 heal-then-death | legal accepted | legal accepted |
| C03 HP1-action-bleeding-clips0 | legal accepted | legal accepted |
| C04 escape80 | legal accepted | legal accepted |
| C05 wrong-battle-id | rejected | rejected |
| C06 broken-queue-adjacency | rejected | rejected |
| C07 broken-HP-adjacency | rejected | rejected |
| C08 bool-trace | rejected | rejected |
| C09 site-latest-HP | rejected | rejected |
| C10 repeat-exit | rejected | rejected |
| C11 wrong-fee | rejected | rejected |
| C12 wrong-medical-reference | rejected | rejected |
| F01 player-basic-recovery80 | incorrectly accepted | domain rejected |
| F01 enemy-interval430 | incorrectly accepted | domain rejected |
| F01 escape-complete75 | incorrectly accepted | domain rejected |
| F02 death-trace-after-exit | incorrectly accepted | domain rejected |
| F02 death-wrong-action-source | incorrectly accepted | domain rejected |
| F02 death-damage-inflated99 | incorrectly accepted | domain rejected |
| F02 bleed-request2-clips1 | incorrectly accepted | domain rejected |
| F02 bleed-wrong-source | incorrectly accepted | domain rejected |

Mutable caller inputs remain unchanged and unfrozen on acceptance and rejection. The template is now the original prefix of the 44-case regression file; its expectations were not changed to fit new output.

### F01/F02 implementation and minimal evidence

Six existing production files changed: `residence-combat/types.ts`, `schema.ts`, `effects.ts`, `history.ts`, `trace.ts`, `terminal.ts`. Two internal helpers added: `history-context.ts`, `history-queue.ts`. All paths are under `src/core/`.

Decision-start evidence records only the original enemy opportunity, bleeding/painkiller/wound eligibility, first-bandage flag, weapon/armor identity and resource, and escape-only backpack weight. Real effects capture it from the validated independent before. It is not a second body/enemy/inventory, a full snapshot or a save-format change.

F01 joins each queue transition to the actual command/profile duration, original opportunity, action identity/interval, charged delay, locked escape, strict-earlier response and exact terminal checkpoint. Immediate victory/death need not wait for recovery; ties still favor player completion. Candidate count spans cannot drive unbounded loops; CTB/delay/fee arithmetic rejects unsafe integers.

F02 keeps generic clipped-HP arithmetic unchanged, then joins trace source, time and requested amount to the actual response, armor/defense/resource sequence, medicine unit/target and bleeding checkpoint. Latest real resources agree with latest decision evidence; later legitimate repair is not compared against old resource values. Death issuance additionally binds context to the original independent before. No validator re-runs CTB, random draws, medicine, G1 or settlement.

### Real positive chains, negative controls and zero replay

R01-R06 are mapped in [contract-and-support](contract-and-support.md). All three real enemies retain their differing response profiles, charged 140/200 delays and stable continuation. Covered chains include retreat -> real medical/rest -> reentry -> victory for each enemy; retreat -> repair/rest -> later reentry death; two technician responses at 640/750; newly inflicted escape wound without changing the locked completion; last armor unit plus defend; full-HP targeted bandage with actual heal0; first bandage2 then real later unit1; Day6 rest death, Day7 action/deadline death and genuine H0 empty steps. Existing full three-enemy task success and two-declaration historical records remain unchanged.

External copied-source semantic mutants remove only the corresponding call in copied `history.ts`, keeping native fixtures and original assertions. Final F01 mutant: three F01 business failures / five F02 passes / 36 filtered, exit1. Final F02 mutant: five F02 business failures / three F01 passes / 36 filtered, exit1. Neither result is a missing import, type error or cache failure. The four original P mutants were NOT re-run in R1; their historical evidence remains separately identified.

Independent counter order: CTB resolver / CTB planner / CTB reducer / G1 action / G1 cycle / unit consumption / stable clinical effect / origin issuance / termination.

| Observation | Actual calls |
| --- | --- |
| Repeated valid and invalid active/dead/escaped parse and query | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0; random0 |
| Real quick bandage then lethal enemy response producer | 1 / 1 / 1 / 0 / 0 / 1 / 0 / 0 / 0; random0 |
| After consuming that original death proposal | 1 / 1 / 1 / 0 / 0 / 1 / 0 / 0 / 1; random0 |
| Re-reading dead and rejecting repeated consumption | No further increments; total revision +1, consumer extra revision0 |

The original lethal trace is heal requested1/actual1 at CTB0, then protected direct damage requested2/actual2 at CTB70. Zero random calls here follow the real direct-death short circuit; other genuine nonlethal/multiple-response risk cases continue using the original random producer. No storage/current/notification behavior is implemented or claimed.

### Integrity, records and delivery scope

35 actual paths within the maximum39: 14 modified / 21 new, comprising 8 production, 3 new test, 8 documentation/report and 16 byte-exact package archive files. Four shared docs and three original engineering Markdown reports preserve exact original byte prefixes. The complete original verification object is retained as `historical.original`; R1 records are separate. All five original inputs, all16 new inputs, approved five contracts and four configuration/content files retain their exact digests.

UTF-8 and added relative links are checked. Ordinary and exact-R1 increment whitespace checks pass; staged bytes/paths and cached whitespace are checked before commit. Cumulative check against `8c19ca0d28058cf743b41c8547cc2629c8eac767` retains native exit2 for ONLY the approved two original input files / seven original hard-break lines and unchanged blobs: WITH_APPROVED_W01_ARCHIVE_EXCEPTION, no eighth exception.

Actual logs, snapshots, source hashes and integrity records are in `C:/Users/zjl/AppData/Local/Temp/e02-r1-901f9a8acd384a22adcb9ba1ac3549f7`; the tracked verification JSON identifies retained log sizes/digests. Final tested source fingerprint is `e39024fb643ac8db5337c2b3529747d9b14ddd1984016875ca276d295451651c`. Final staged and committed source bytes must match this fingerprint; post-commit CI/remote status is reported externally, never pre-filled as success here.

No approved rule/parameter, old CTB semantic, G1/G2/identity, old test/helper, old save/session, package/lock, CI, AGENTS, UI or asset changed. No rule conflict or remaining in-scope implementation blocker identified. The default-concurrency baseline timeout and unchanged bundle-size warning are disclosed above, not suppressed.

One normal commit is authorized after checks, followed only by `git push origin HEAD:feature/residence-combat-core-001`. No amend, rebase, merge, reset, main/other-branch push or force-push. Final SHA/parent/tree, exact remote branch SHA and other remote refs are verified in the final receipt. E02-R/S/E03, v4, current, Storage, browser/player and O3 are NOT RUN. Stop and wait for exact-SHA mainline review; do not proceed automatically.
