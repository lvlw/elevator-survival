# G2 contract and support matrix

This is implementation documentation under the supplied G2 authorization, not a DEC, new parameter approval, product Save contract or G3 authorization. Rule authority remains DEC-049/050 and the approved [restore/transaction supplement](../runtime-restore-supplement-v1.0.md). Exact task and review inputs are retained in [inputs](inputs/BASELINE-AND-INPUTS.json).

## Sole local facts

`ResidenceLocationSnapshot = character + site + carried + itemStates`. `character` is the unchanged G1 CharacterCycleState. It alone owns HP, E, D/T, quotas and revision. `site` owns one node, execution binding, declared persistent facts, source claims/cursors, ground instances, named enemy state/risk cursors and player knowledge. It has no task outcome, wallet, date or second health field. `carried` reuses BackpackSnapshot/EquipmentSnapshot/QuickSlotSnapshot. The one itemStates collection covers all actual items in all ground and carried containers; no source inventory exists in parallel.

The independent input is `LocationAuthority { cycle, mission }`, with actual MissionLifecycleValue and G1 CycleAuthority. Full character/config/rules, world/template/commission/contract, runId/seed/execution rules and catalog ID/version must agree. Each runtime catalog is a validated immutable controlled handle; copied/look-alike objects are not accepted. Catalog costs, graph, source grants, physical definitions, profiles, weight bands and rest facilities are controlled dependencies, not command fields and not new production world content.

Ground execution ownership is inherited from its single enclosing site binding; each node is represented exactly once. An item's origin is not attached as a permanent carried-item restriction. Thus another execution cannot reinterpret an old site, while a later authorized coordinator can carry legitimate existing item instances forward without recreation.

## Public surfaces

| Import | API | Scope |
| --- | --- | --- |
| core/residence-location | createLocationCommand | Exact intent union: move / reveal / pickup / drop. Whole instance only; no quantity, cost, flags, effects, next state or multi-edge arrays. |
| same | planResidenceMove | One known outgoing edge, current physical/permission conditions, one G1 paid action, arrival observation and immediate consequences. |
| same | planResidenceSourceReveal | Visible local unclaimed source; fixed grants or one seeded declared uniform choice; once-only physical materialization. No preview materialization. |
| same | planResidenceItemTransfer | Ordinary whole instance/stack ground-to-explicit-backpack-placement or reverse. Reuses geometry, item/state identity and controlled carry bands. Free at E0, no action bleeding. |
| same | queryActiveResidencePosition | One derived node/place for active execution; null for the three closed outcomes. |
| same | queryPlayerResidenceKnowledge | Explicit safe allow-list, current physical route conditions and labelled last observations; no execution identity, seed, cursor, hidden source outcome or exact remote enemy data. No plan/completion. |
| same | assertResidenceLocationPlanCurrent | Module-issued local plan and exact canonical base/revision guard. No installation or history authority. |
| separate controlled import | createLocationCatalog / establishResidenceLocation | Controlled first establishment only. Future owner proves absence of an existing site; commands and queries never call initialization. |
| separate controlled import | restoreResidenceLocationCandidate | Strict value witness, not cold bootstrap or Save installation. Independent lifecycle/authority still required. |
| separate controlled import | planResidenceLocationRest | Narrow actual-position A/C qualification, then unchanged public G1 planCharacterCycle. No second cycle algorithm. |

All copied outputs are deeply frozen without freezing or mutating caller-owned input. Source parsing rejects class instances, accessors, symbols, sparse arrays, missing/extra keys and unsafe numbers before old constructors can normalize them.

## Plan / terminal boundary

A successful local plan contains one complete local proposal and one G1 revision increment. `stable-local-result` means only these local responsibilities are complete, never an application commit. `combat-required` retains the actual live enemy and pending encounter; G2 cannot move, pick up, reveal or rest past it. `death-required` preserves the completed local action and death facts; it does not close the mission, discard assets or save. CTB input/continuation is deliberately unsupported and not stripped into a fake stable state.

Three actual mission closures (success, voluntary-failure, deadline-failure), composed with G1's matching returned/deadline clock, leave historical site values read-only. No active position or old-ground operation remains, while carried entities are untouched. G2 does not produce these closures itself. Whole-character anti-rollback, existing-current protection, atomic installation of other owners and cross-tab exclusion remain future coordinator responsibilities.

## Knowledge and determinism

Arrival unions declared surface observations with prior knowledge. Unknown edges stay unknown; no whole-graph inference from logs or day changes. Remote edges report last-observed passability, never unobserved current facts. Current passability is a physical condition, not an assertion of energy/action eligibility. Historical permission does not replace a currently carried permission item.

Sources keep claim and draw index separately from their real ground items. Emptying/drop/rest/revisit never resets a claim. Cursor seed/stream are derived, not independently editable duplicated fields. Enemy risk cursor is separate from resolvedActionCount. The exact length-delimited RNG segment order and instance encoding were recorded before code in [implementation notes](implementation-notes.md); the algorithm remains counter32-v1.

## Acceptance mapping

| Group | Actual tests / APIs |
| --- | --- |
| L01 | location.test.ts: independent active construction, complete binding matrix, immutable copies, malformed data/catalog/request cases. |
| L02 | movement.test.ts: A→B→A and rejection of secret/reverse/remote/absent edges. |
| L03 | movement.test.ts: E1/cost8, single action-bleeding and revision, E0 provider/RNG zero, arithmetic preflight. |
| L04 | knowledge-random.test.ts: explicit arrival-only observations, same visible/different hidden pair, labelled remote observations, E0 pure queries. |
| L05 | items-sources.test.ts: fixed source, seeded source via knowledge tests, claimed/empty/rest retries, full backpack ground reveal, no draw on rejection. |
| L06 | items-sources.test.ts: original durability/charge whole migration, geometry/carry/task/partial refusal, every container/state identity check, carryable overload. |
| L07 | residence.integration.test.ts: all three actual terminateMission outcomes with real G1 return/deadline, null active position, no ground reuse, carried preservation. |
| L08 | residence.integration.test.ts: declared existing roads/installations and wounded/disabled enemy preservation; knowledge-random.test.ts: two named enemy cursors. |
| L09 | knowledge-random.test.ts: fixed golden, source/enemy/purpose/seed/delimiter isolation, opposite visit orders plus real rest, JSON value round trip only. |
| L10 | movement.test.ts: arrival damage/exposure at E0, ordered bleeding, legitimate death result, encounter-required and movement/rest/no-pending bypass rejection. |
| L11 | residence.integration.test.ts: public eight-action sequence; movement.test.ts: issued-plan identity/revision/full-base freshness. |
| L12 | unchanged G1 five-file regression; full npm check; external protected-object/config/import audit. |

## Explicitly unsupported / not validated here

No G3 coordinator, Store, cold installation, browser codec/save, multi-tab, player entry or five-map registration. No wallet, rewards, full return/deadline orchestration, CTB action handling, medical consumption, source scripting language, partial transfers, split/merge, equipment/quick-slot mutation or task-item disposition. Unsupported request variants are rejected, not silently approximated. Read-only existing equipment/quick-slot containers still participate in uniqueness/profile/state validation and are excluded from backpack subtotal under the existing container rule.

Ordinary value roundtrip is not real Save testing. Existing wounded-enemy fixtures prove preservation, not combat implementation. Existing hospital UI regressions are not new-world browser play. Browser/real storage/refresh/multi-tab/Owner play: **NOT RUN**. Three specializations, complete toolbox route, real combat and remaining unapproved content remain later responsibilities. Author local checks do not constitute mainline exact-SHA review.
