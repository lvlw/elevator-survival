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
