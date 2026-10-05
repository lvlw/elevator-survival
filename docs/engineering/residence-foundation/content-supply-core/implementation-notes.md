# E01-P implementation notes

## W1 design

Exact start ad56a7d9dfc08e38f966f20cf7e07c71c08c09dc, clean index/worktree.
Branch feature/residence-content-supply-core-001. Actual baseline: 147 files,
3274 tests, exit 0. Package hashes match; original inputs stay byte-for-byte.

Content owns the approved 103-key config and combines existing G1/A handles.
G1 owns energy, paid bleeding and ordered cycles. G2 owns site, geometry and
observation; dedicated supply helpers add investigated witnesses and load costs.
Supply owns one pure aggregate and origin ranges, never current or save.
Task owns method qualification and actual producer facts. A supply-controlled
owns new-source terminal consumption and shares existing monetary settlement.
Old public exports, interfaces, tests and B/C formats retain their old meaning.

Authority and plan WeakMaps bind complete independent canonical bases and
controlled config/content handles, not just revision. Exact commands cannot
provide effects, outcomes, arbitrary facts or next states. Outputs are cloned
and frozen, inputs unchanged. No generic installation interface is exported.

Initial anchors use a separate namespace. World origins bind character,
commission/execution/seed, place/node, source/ordinal, definition and original
quantity. Each origin's [0,issued) units are partitioned between disjoint live
allocations and dispositions. Splits derive child IDs from transferred ranges;
merges preserve ranges and compatible resources. Task items keep whole original
identities. Prior ordinary origins are not rewritten to the current execution.

29 declared bidirectional connections produce 58 explicit directed edges.
C5-H7 uses an investigation witness, never a free full-map reveal. All geometry,
materials and eligibility are checked before entropy. H1/H2 weighted searches
draw one independent branch; fixed sources draw zero; no H2 extra grant.
Sample primary issues the real item/exposure and consumes effective coat before
one G1 paid checkpoint. Medical uses existing condition APIs then one free G1
action. Maintenance consumes concrete allocated units and a single 15-point
pool. Death goes to A with the original signed plan, without replay/revision.
Normal H0 uses actual steps=[]; deadline uses actual G1 ordered steps.

Planned entrypoints: createSupplyDependencies, createInitialSupply,
createSupplyAuthority, planSupplyDeparture, planSupplyMove, planSupplyRest,
planSupplyInventory, planSupplyMedical, planSupplyMaintenance,
planResidenceTask, assertSupplyPlanCurrent, and dedicated supply terminal.
Public index: read-only queries/types only. Internal task -> supply -> G2/G1;
terminal -> supply and shared settlement, no reverse runtime imports.

P01 config/content oracle; P02 nine choices; P03 real tasks; P04 transport;
P05 once sources/trade; P06 allocation conservation; P07 six medical actions;
P08 pooled maintenance; P09 specialties; P10 original death/cycle consumers;
P11 strict input/full-base authority; P12 long chains/history. Independently
count G1 action/cycle, source issuance/draws, task/medical/maintenance and A.
Explicit danger-resolved test prestates retain enemies, not E02 combat.

No codecs, current installation, browser IO, CTB or UI. Real storage, multi-tab,
browser and Owner playability NOT RUN. No E01-R/S, E02/E03, O3 or other branches.

## W2-W4 execution

### Actual ownership and seams

Implemented `establishSupplyInitial` / `planSupplyDeparture` (the candidate
names above were design placeholders), `planSupplyTaskAction`, source reveal,
task transfer, inventory, six medical actions, maintenance, movement/rest and
dedicated A terminal consumers. One immutable SupplyValue includes the G1
character, G2 site, carried assets, origin ranges, production/disposition
history, choices and receipts. No parallel current, body, wallet or site.

The production factory declares one isolated local commission. Technical IDs
are `infected-world-local-v0.1`, `unfinished-transfer`,
`infected-transfer-local-001`, `infected-residence-local-v0.1` and
`DEC-052-pure-v1`; they do not register a global runtime or change old versions.
The exact approved JSON remains an independent test oracle, not a Python model.

Only three existing files changed: G2 movement extracts an internal optional
known-edge/cost policy while the old entry keeps defaults; A validation delegates
its passive site check to a new shared helper; A settlement delegates its same
wallet arithmetic to settlement-shared. Old barrels and all old tests unchanged.
G1 and B/C untouched. New supply fields are NOT_SUPPORTED_BY_V2.

Origin unit intervals are replayed through birth, split/merge transfer and
disposition journals. Per-origin conservation alone was insufficient to reject
same-total cross-origin substitution; the unit-transfer journal closes that
gap. Consumption reason distinguishes recipe from medical use, so trading a
bandage does not spend the survival first-bandage effect. Initial specialty is
also included in its origin identity; changing choices alone cannot regrant it.

Medical composes existing condition primitives with one free G1 action; it
does not pass negative healthLoss or alter the old provider. Maintenance uses
one approved pool, explicit targets and real material units before paid G1
bleeding. Task extraction uses real original task identities and validates
placement before entropy. Sample coat uses integrity (including 1 -> 0), not
weapon durability. Primary item/exposure/resource results precede G1 death.

### Self-check and repairs

Initial TypeScript/schema and test-fixture defects were repaired without
changing dependencies or old tests. A sample last-use test exposed the wrong
resource discriminator in the new sample branch; it was corrected to integrity
and both cautious/direct last-use regressions pass. Daily quota expectations
were corrected to the approved config rather than changing its value. Food
quick-slot rejection uses the existing eligibility rule, not a new exception.

The first full check caught a core test-fixtures -> content dependency. Core
fixtures now receive explicit dependencies; only test files import content.
The architecture validator itself was not changed. Source materialization was
factored into task/plans so both source/task producers use the same real API
and native spies observe actual calls, not labels.

The local TypeScript 7 package does not expose the old default AST API; an
outside-repository audit attempt using it failed before producing results.
The final audit uses an explicit static value-import/export scan (excluding
type-only clauses), with no new package or repository audit script. It found
133 reachable modules and zero cycles. Native tests also load these modules.

### Evidence and limits

Actual start: 147 files / 3274 tests. New native tests: 14 files / 91 tests;
no replaced/deleted old tests. Full check before final documentation passed
161 files / 3365 tests, 52 DEC / 289 core production files and build.
The existing Vite chunk-size warning remains; thresholds were not changed.
Final targeted/check command details and fingerprints are recorded in
[verification-results.json](verification-results.json).

The long chain starts from real initial issuance/departure and uses real
single-edge movement, source draws, rest, power, component, module, sample,
installation and A delivery. Its explicitly danger-resolved TEST prestate
retains all three enemy records. It is not a CTB combat/playability claim.
Two TEST declarations exercise old success/failure history then new source
and death; the production factory still registers only one commission.

Native counts distinguish pre-qualification rejection (zero producer calls)
from an injected draw fault after one fixed origin was produced (no applicable
plan, original unchanged). New task/maintenance and old G2 death are consumed
without action/cycle/draw replay or an extra revision. H0 actual steps=[] and
remote deadline actual ordered G1 steps remain distinct.

IO/current/storage adapters, codecs, live combat, browser, multi-tab, Owner
playability and O3 are NOT RUN / not implemented here. Author self-check is
not WebGPT exact-source review. Stop after the authorized branch commit/push.

Final native effect spies additionally observe restoreHealth1,
restoreItemResource1 and planSupplyTerminal1. The counter-strengthened target
rerun passed 54 files / 1189 tests. Final check after all four report files
exist passed 161 files / 3365 tests, typecheck, 52 DEC / 289 core production
files and build (final-check.log, test start15:24:13, duration74.98s).
Only verification record wording is updated after that run; tested code
fingerprints are unchanged and checked again at stage/commit.
