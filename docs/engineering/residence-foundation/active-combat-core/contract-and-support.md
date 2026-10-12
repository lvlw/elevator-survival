# E02-P Contract and Support

This is implementation evidence for the approved [pure core contract](../active-combat-core-contract-v1.0.md) and [lifecycle contract](../active-combat-lifecycle-contract-v1.0.md), not a new rule source. It does not authorize E02-R/S or E03.

## Exact entry boundaries

Ordinary `src/core/residence-combat/index.ts` runtime exports (exact test): `readCombatValue`, `queryResidenceCombat`, `queryCombatTerminalEligibility`. Type-only exports describe the pure aggregate and evidence, not an installable save.

Controlled runtime exports (exact test): `assertCombatPlanCurrent`, `consumeCombatDeath`, `createCombatAuthority`, `createResidenceCombatDependencies`, `establishCombatInitial`, `planCombatDeparture`, `planCombatInventory`, `planCombatMaintenance`, `planCombatMedical`, `planCombatMove`, `planCombatRest`, `planCombatSource`, `planCombatTask`, `planCombatTerminal`, `planCombatTransfer`, `planResidenceCombatAction`, `resolveResidenceCombatAction`.

Legacy ordinary exports, protocol validators and capability issuers are unchanged. New engine profile entry is separate (`combat/profiled-controlled.ts`), not added to the old ordinary CTB index. New content factories are independent and not registered in player/bootstrap defaults.

## State support

| Pure state | Supported | Rejected |
| --- | --- | --- |
| first-hub | Real four-origin materialization and first departure | Arbitrary injected results, cloned authority, wrong execution/context |
| active stable | Real G2 one-edge move; original P task/source/inventory/medical/maintenance/rest; A terminal qualification | Pending encounter without battle, illegal source/placement/quantity, stale plan |
| active combat | Formal attacks/defense/escape, quick-slot bandage/painkiller; E0 allowed | Move/rest/stable treatment/maintenance/task/terminal; remote or non-unit quick medicine |
| living-hub / dead | Strict pure validation and evidence queries | Further active commands, uploaded death proposal, repeated death consumption |

There is no current holder, persistence write, v4 reader/codec, migration, browser entry, multi-tab behavior or continue-next production API. Pure value parsing does not confer any of those powers.

## P01–P12 native acceptance map

Paths below are relative to `src/core/` unless explicitly noted. The exact test names are in the referenced new test files; all baseline test files remain byte/canonical-blob unchanged.

| Group | API / tests / actual evidence |
| --- | --- |
| P01 | `createCombatProfile` and independent content factory; `combat/combat-profile.test.ts`, `content/infected-world-v0.1/combat-profile.test.ts`: all three action tables, unsafe profile values, exact dependency/profile binding. Old combat/hospital suite runs unchanged. |
| P02 | `establishCombatInitial`, `planCombatDeparture`, `planCombatMove`; `residence-combat/entry.test.ts`, `integration.test.ts`: genuine initial grants/departure/G2 first arrival; first CTB 70/150/60; E0 entry and real pre-entry movement death. |
| P03 | `planCombatMove`; `reentry.test.ts`: each enemy 0/50 reentry preserving HP/intent/count/risk; actual H3 card route returns H3 without consuming the card. `history.test.ts` rejects wrong entry/node. |
| P04 | `resolveResidenceCombatAction`; `actions.test.ts`, `enemies.test.ts`, `combat/combat-profiled-resolution.test.ts`: three real victories, two responses in one command, direct death short circuit, real contusion/laceration/bite, completion/player ties and lethal-hit/own-bleed priority. |
| P05 | `effects.test.ts` and profiled-resolution tests: positive last armor integrity, armor before defend-half, defend expiry, locked escape duration despite new wound, same-time completion and completion bleeding death without retreat. |
| P06 | `medical.test.ts`, `usage-resources.test.ts`, `terminal.test.ts`: true origin-unit consumption, first survival bandage total 2, later 1, capped healing then response/death, painkiller without healing/treatment, remote/empty/no-target/quantity failures. |
| P07 | `actions.test.ts`, `effects.test.ts`, `usage-resources.test.ts`: orderly delay 200 versus others 140; G1 quota consumed once and refreshed only by real rest; positive last durability performs full action then 0 permits only temporary attack. |
| P08 | `exit.test.ts`, `actions.test.ts`: isolated 0/99/100/101/201 fee boundary plus real CTB escape/victory; one receipt, actual from, clipping energy, stale/repeated/wrong receipt rejected. Arithmetic tests are not represented as reachable battle paths. |
| P09 | `terminal.test.ts`, `validation.test.ts`: heal then genuine enemy death, private capability and independent before; raw HP/amount/tag/adjacency/death-after-event rejects; later real reentry death binds its own entry. CTB/apply once, death consumer replay increment zero, terminal once, revision once. |
| P10 | `stable.test.ts`: actual sample production/transport, source, split/merge, food, repair/recharge, rest, H0 steps=[], live/dead Day7 ordering. Existing E01-R/F01 and v1/v2/v3 regressions unchanged. |
| P11 | `authority.test.ts`, `validation.test.ts`, `purity.test.ts`, `compatibility.test.ts`: exact inputs, getter/class/null/extra/unsafe integers, copied/stale/foreign capabilities, mutable input preservation, raw entropy domain errors, genuine producer exception, safe query allow-list and zero replay. |
| P12 | `integration.test.ts`, `history.test.ts`, `terminal.test.ts`: each real retreat → stable bandage/rest → reentry → victory; all three real victories → genuine task/transport/install/sample → reward 120; two isolated TEST declaration histories preserve old receipts and real later death. |

## Evidence contract for later R

`EntryWitness` binds execution/catalog/rules, real edge endpoints, enemy identity and pre-move persistent facts, entry revision and deterministic battle identity. `DecisionWitness` stores the most recent formal command/checkpoint, actual queue reasons/adjacency, player HP/enemy HP/count/risk range, typed trace and instance/quota/consumption references. Closed/death receipts retain their own entry and decision plus actual exit/terminal bindings.

The aggregate has no second inventory/body/enemy owner and no per-decision whole snapshot. Validation checks evidence and references without re-running actions, RNG, G1 or settlement. Private in-memory issuance proves plan origin for this stage; pure self-consistency alone is not proof of offline historical authenticity. R expected inputs, v4 string codec and installation authority remain future work under a separate task.

TEST low HP/E, injury, Day7 and earlier isolated history materials are explicitly annotated in tests. Only the older declaration history uses the pre-existing danger-cleared helper; every current-world first-entry, retreat/reentry, victory and later death is a real movement/CTB producer. The dependency-injected TEST harness is not imported by production.

## E02-P-R1 support and minimal evidence refinement

This append follows the F01/F02 review of `9f0eaacfbb83e49401c52fb57c3cfa061b2ef026`; the historical P report above is not rewritten into a mainline PASS.

`DecisionWitness.context` now retains: original enemy opportunity; bleeding, painkiller and contusion/wound-target eligibility; first-bandage-used flag; original pipe/coat instance and resource; and escape-only backpack weight. These are immutable historical source facts captured from the independently validated before. They are neither a second actionable body/inventory/enemy nor a new save format. Current real resource state is also joined when the decision revision is the current revision; older receipts are not compared against later repaired equipment.

`history-context.ts` supplies the minimal context and approved-profile constraints. `history-queue.ts` validates each recorded transition against action duration, enemy action identity/interval, charged delay, locked escape facts, strict-earlier priority and the terminal checkpoint. Work is bounded by evidence and formal duration, not an arbitrary candidate count interval. `trace.ts` preserves the generic clipped-HP arithmetic function and adds contextual source/time/request checks, medication/target binding, armor/defense sequence and real resource links. `terminal.ts` additionally compares death evidence with its independent original before; no historical verification invokes a planner or rule mutator.

| R group | Native evidence (all paths under `src/core/residence-combat/`) |
| --- | --- |
| R01 | `review-regression.test.ts`, original 20-case template: four legal producer chains, eight pre-existing rejects, three F01 and five F02 new rejects; mutable input unchanged/unfrozen. |
| R02 | Same file: all three profiles, 140/200 charged delay, two actual technician responses at 640/750, same-point ordering, consistent queue tampering, count/overflow and missing/duplicate transitions. Original `enemies.test.ts` and `effects.test.ts` retain their exact assertions. |
| R03 | Same file: cross-enemy source, timing beyond completion, inflated direct/bleeding requests, final armor unit plus defense, source-bound latest resource, missing/duplicate/foreign events; original generic large-request clipping test remains. |
| R04 | Same file and `review-history-integration.test.ts`: real heal before lethal response; full-HP untreated-wound target and actual heal0; first survival bandage total2 then real later unit total1; H0 genuine empty steps. |
| R05 | `review-history-integration.test.ts`: three real retreat/medicine/rest/reentry/victory chains; real repair then later reentry death; Day6 rest death, Day7 action/deadline death. Original `history.test.ts` preserves both old success/failure declaration histories; original full production success chain remains. |
| R06 | `review-purity.test.ts`: valid/invalid active, escaped and dead parse/query add zero CTB/planner/reducer/G1/medicine/origin/termination/random calls; real death production once, consumption adds only one termination and no revision; independent-before forgery reject. |

External F01 and F02 mutants remove only the respective joint-check call in a copied `history.ts`. Native original expectations then fail specifically on the three F01 / five F02 acceptance bugs. These are not production toggles or test skips. Exact logs and commands are in the R1 verification record.

Public/controlled export files, existing tests/helpers, old CTB, G1/G2, approved parameters and v1/v2/v3 readers/sessions remain unchanged. Pure evidence validation does not authenticate a completely rewritten offline history. v4, current installation, Storage, browser, player entry, E02-R/S/E03 and O3 remain NOT RUN.

## E02-P-R2 maintenance validation boundary

The exact before is strictly validated by the existing controlled wrapper before any maintenance producer. Shared maintenance still validates strict command, target/pool, recipe, energy and actual resource operations. Its primary candidate remains local; G1 supplies the one real body/revision result before the existing issue boundary performs full final validation. The public read/query contract and latest committed-resource protection are unchanged; no optional skipValidation or revision override is accepted.

| R2 acceptance | Native evidence |
| --- | --- |
| Immediate repair and raw integrity | review-maintenance-regression.test.ts retains the byte-exact seven-case template: two immediate repair positives, two free-organize diagnostic controls, three raw-resource rejects. |
| Adjacent maintenance | Same file: pre-entry real cloth/metal/electronic/battery, immediate coat after escape/victory, one mechanical pool with explicit two targets and partial restoration, cap waste, toolbox and charge. |
| Rejections and continuation | Same file: strict/extra/bad quantities, wrong materials/target/recipe, duplicate/over-pool/E0/stale/live battle, full resources, cloned plans; two actual closed battles then later combat death; real H0 empty steps. |
| Independent counts | review-maintenance-purity.test.ts: living and bleeding-death maintenance, invalid raw before, partial evaluation wrong recipe, final invalid output rejects, repeated read/query zero production. |
| Legacy isolation | review-maintenance-compatibility.test.ts: genuine old initial/source/recipe, living and original death-plan consumption, old protocol output retained and cross-protocol rejection. |

No schema/protocol/save-format change. The original 102 P tests, 58 R1 tests and earlier tests remain read-only; the complete suite includes existing Day6/Day7, three-enemy, same-point, escape, medicine and two-declaration regressions. R2 is author evidence pending exact-SHA review, not E02-R/S/E03 acceptance.
