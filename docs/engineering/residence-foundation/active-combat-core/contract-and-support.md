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
