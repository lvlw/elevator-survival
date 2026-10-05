# E01-P contract and support (actual implementation)

This is an author implementation record, not a new DEC, parameter source,
WebGPT review PASS or Owner playability acceptance. DEC-049/050/051/052 and the
read-only [core contract](../content-supply-core-contract-v1.0.md) apply.
[Restore contract](../content-supply-restore-contract-v1.0.md) remains E01-R.
The [task original](inputs/ENG-RESIDENCE-CONTENT-SUPPLY-001-task-v1.0.md)
and [authority](inputs/OWNER-authority-and-scope-E01-P-v1.0.md) are unchanged.

## Actual API and direction

- Content: `src/content/infected-world-v0.1/initial.ts` creates explicitly
  scoped dependencies and unaccepted mission; config.ts is the single 103-key
  definition. It reuses G1/A handles for the original 38 numeric values.
- `residence-supply/index.ts`: runtime exports only SupplyError and
  querySupplyKnownObjects, plus types. Read-only query grants no capability.
- `residence-supply/controlled.ts`: establishSupplyInitial, createSupplyAuthority,
  readSupplyValue, assertSupplyPlanCurrent, planSupplyDeparture, planSupplyMove,
  planSupplyRest, planSupplyInventory, planSupplyMedical, planSupplyMaintenance.
- `residence-task/controlled.ts`: createTaskCatalog, planSupplyTaskAction,
  planSupplySourceReveal, planSupplyTaskTransfer. Ordinary task/index is type-only.
- `residence-terminal/supply-controlled.ts`: planSupplyTerminal,
  consumeSupplyDeath, consumeSupplyLocationDeath. Original A barrel unchanged.
- Internal supplyTerminalEligibility is read-only. SupplyValue/authority
  validation remains mandatory on command paths. No generic installer is exposed.

Dependency direction: content -> core; task -> supply internals -> G1/G2;
A supply -> supply/task facts/shared old A validation; no task -> A reverse.
New value-import reachable graph has zero cycles. Tests alone import content
into core test modules; core fixture helpers accept dependencies.

## Single owners and supported operations

G1 owns character identity/body/clock/revision, energy rounding/clamping,
paid post-action bleeding and ordered cycles. G2 owns the site, real edge
movement, geometry, observation and ordinary whole-item transfer. P owns
one pure aggregate, original provenance intervals, actual producer methods
and their journals. A owns terminal settlement/mission closure with shared
wallet arithmetic. No parallel body/site/current or effect replay.

The five-location content preserves 24 nodes, 29 bidirectional declarations
mapped to 58 directed edges, and three static enemy records. No enemy deletion,
CTB executor or global content/entry registration. Technical isolated IDs are
listed in implementation-notes; old rules/config/save versions unchanged.

Initial: pipe, coat, one of crow/lamp/toolbox and quick bandage1 only.
Three tools and three specialties independently chosen before departure.
H1/H2: one fixed plus one weighted branch, exactly once; no grant.H2-random.
First toolbox fire door creates electronic on ground, not direct inventory.
P1 power; L2 verify/fix/component; C1 match; C3 module; H5 cautious/direct
sample; H8 exact installation; T1 real unit exchange; explicit card/crow/
toolbox/manual/lit/dark alternatives. C5 investigation adds witnessed hidden
knowledge, separate from unlock and movement.

Task extraction and T1 validate explicit output geometry/carry before commit;
sample placement precedes entropy. Whole task transport preserves original
instance/state/source/execution/ordinal. No ordinary-pickup bypass.
Explicit split/partial-merge/quick transfer preserves interval ownership.
Cannot-carry uses existing classifyLoad; actual 27 -> 28 passes, 28 -> 29 rejects.

Six free battle-external consumables use existing condition primitives and
one free G1 action. Targets, unit quantity, quota and resource eligibility
are strict; no injury clear-all, auto refill or free healing. Survival first
qualified bandage is total2 then base1, including across real rest.
Maintenance is paid: explicit one15-point mechanical pool, cloth coat,
metal+electronic toolbox, compatible battery lamp. Positive E may run below
cost and clamp0; E0 cannot start. Resource primary precedes paid bleeding.

H0 return uses actual G1 normal-return with steps=[] (including Day7).
Remote deadline uses actual ordered cycle and HP0 short circuit. Original
new task/maintenance/move/rest death plan or original G2 death plan is consumed
without producer replay or second revision. Success requires actual carried
original current-execution sample and actual installation fact; no flag shortcut.
Task/card dispositions are unusable history; ordinary survivor assets retain
origin/state. Death zeroes current usable assets/balance, not prior history.

## Pure fields and R/S invariants

SupplyValue protocol `residence-supply-pure-v1` carries configuration/content/
terminal IDs, phase, G1 character, declared missions, balance, current site,
carried ItemInstances/ItemStates, warehouse, origins, live allocations,
lineage, unitTransfers, dispositions, archived sites/ground states/witnesses,
investigation witnesses, choices, production records and receipts.

Each origin binds character/commission/execution/run seed, place/node,
producer/ordinal/definition/issued quantity/draw index; initial specialty is
anchored too. Original [0,issued) units are partitioned between unique live
ranges and dispositions. Birth/transfer replay rejects duplicated units,
unrecorded deletion and same-total cross-origin substitution. All containers
have exclusive live ownership and matching resources. Task instances cannot
be split into substitutes. Consumption reason/revision binds first-bandage
history, recipes and terminal outcomes. Real source outputs and fixed/random
pairs, task facts, installed four units, receipts and closed missions are
cross-validated. Archives preserve old site, states and witnesses.

Authority binds complete independent canonical input, controlled dependencies
and versions, not revision only. Plans are independent frozen signed values;
clones/JSON/stale bases/same-revision altered bodies reject. WeakMaps contain
technical signature metadata, not lifecycle balances/current/consumed state.

This validator is not an independent cold-candidate expected-context API,
anti-offline-rollback proof, codec or installer. B/C v2 remains unchanged and
NOT_SUPPORTED_BY_V2 is explicit. E01-R must add independent expected authority
and strict encoding; E01-S must own unique current/commit/save. None is claimed
here. Browser, save fault/reentry, multi-tab, CTB and Owner review NOT RUN.

## P01-P12 native evidence

All paths below are relative to repository src; test titles are exact describe
groups or individual tests. Parameterized rows count actual expanded cases.

| Group | Actual files / test anchor |
| --- | --- |
| P01 | content/infected-world-v0.1/config.test.ts: "P01 approved parameter oracle"; catalog.test.ts: "P01 real five-location catalog"; task/sources.test.ts weighted boundary rows |
| P02 | core/residence-supply/initial.test.ts: "P02 real initial and departure"; three tools each checks all three specialties; regrant/choice/resource rejects |
| P03 | core/residence-task/tasks.test.ts: "P03 formal task producers and methods"; sample.test.ts: "P03 P10 actual sample, risk and action death" |
| P04 | core/residence-task/transfer.test.ts: "P04 original task transport and cross-day persistence"; tasks/sample tests invalid geometry/source/execution |
| P05 | core/residence-task/sources.test.ts: "P05 real fixed and weighted source"; T1 atomic exchange, last-charge and no-retro-toolbox |
| P06 | core/residence-supply/inventory.test.ts: "P06 real stack organization and exact source units"; interval swap/overlap/deletion and 27/28/29 |
| P07 | core/residence-supply/medical.test.ts: "P07 P09 actual six-consumable effects"; explicit wound/quota/E0 and no-effect/HP0 rejects |
| P08 | core/residence-supply/maintenance.test.ts: "P08 real maintenance, one pool and primary-before-death"; total15, waste, material reuse, positiveE/E0 |
| P09 | task/tasks.test.ts specialty rows; supply/medical.test.ts: "survival first bandage totals 2, next totals 1 after real rest; E0 free action has no bleeding" |
| P10 | supply/supply.integration.test.ts: "P10 P12 native independent producer counts"; terminal/supply-terminal.test.ts: "P10 explicit supply terminal"; original signed death and H0/deadline |
| P11 | supply/authority.test.ts: "P11 strict input, complete authority and safe queries"; exact runtime exports, accessor zero evaluation, unknown/unsafe/stale/clone |
| P12 | supply/supply.integration.test.ts: "P12 native first departure and complete producer route (danger-cleared TEST prestate, no CTB)"; history.test.ts: "P12 two TEST declarations preserve actual prior history" |

Path shorthand task/supply/terminal in table means corresponding core/residence-*
directories. These are native tests, not historical Python model counts.
Full chain starts real initial/departure, traverses real edges and producers.
Danger-resolved TEST prestate explicitly retains all three enemy records;
it does not prove actual CTB reachability. Two declarations are TEST-only,
never a second production commission. Final counts, native call counts,
fingerprints and command results: [verification-results.json](verification-results.json).
