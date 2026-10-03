# ENG-RESIDENCE-LOCATION-001 implementation notes

## Design recorded before production writes

Start: `942b2d93916c649f4c2ec6cd399035151269d2ca`; branch `feature/residence-location-core-001`. Native baseline: 110 files / 2425 tests, exit 0 (external baseline.log). G1-R1 mainline PASS is limited to its query/action correction; original G1 review history is not rewritten.

### Owners and boundaries

- `CharacterCycleState` alone owns body, D/T and revision. A local aggregate contains it once, one execution-bound site, real carried containers, and exactly one ItemState per real item (including ground).
- Site binding includes ResidenceIdentity, full MissionDeclaration, full RunIdentity, catalog ID/version. Position is one node; place is derived from the controlled node catalog. Independent CycleAuthority and actual MissionLifecycleValue must agree with the candidate and scope.
- Controlled initialization and catalog creation are separate from ordinary public query/command exports. Strict restore checks all required fields; it does not initialize missing state, install saves or prove history.
- Roads and installations are declared persistent facts. Source claim plus draw index is separate from ground inventory. EnemyPersistentCombatState is reused with a separate risk draw index; no CTB is copied into it.
- Knowledge records observed/visited nodes, observed directed edges and last observed route conditions. Current-source contents and remote live enemy data are not projected. Query never observes, draws or produces an action plan.
- Four ordinary commands: one-edge move, one source reveal, whole-instance pickup, whole-instance drop. Rest is a controlled G1 composition entry, not a new cycle implementation. All plans use one G1 revision increment and strictly validate the full local result. Encounter/death require later coordination; no save/notification/mission close is performed.
- A plan-current guard checks module-issued plan provenance plus exact canonical base identity/revision/value; this is process-local stale-plan protection, not historical anti-rollback or install authority.

### Random encoding (fixed before implementation)

Use existing `counter32-v1`, `createStreamId`, `createRandomCursor`, `drawIntInclusive`. Stream segments in order:

`residence-location-v1`, characterId, rulesVersion, configurationId, worldId, templateId, commissionId, contractVersion, runId, execution.rulesVersion, catalogId, catalogVersion, placeId, nodeId, entity kind (`source` / `enemy`), entity ID, purpose (`contents` / `risk`). Seed is execution.seed. No date, visit count, array index or daily Scene ID.

New source instance ID uses the same length-delimited stable anchor plus `item` and fixed grant ordinal; migration never generates IDs. A seeded source makes one uniform declared-choice selection using the existing integer sampler, including its rejection-sampling cursor advancement; fixed sources draw nothing.

### Actual source reading and reuse

Read root AGENTS, GDD, Vertical Slice, relevant Architecture/DEC-045/048/049/050, current UIR knowledge boundary, items/scenes/events, approved O1/O2 records, runtime restore supplement, G1 contract, all five G2 input files. Read G1 energy/types/validation and character-cycle/types/validation/cycle; mission lifecycle public/controlled/validation; random stream and golden tests; inventory, item-state, equipment and quick-slot factories; run-loadout snapshot; scene items/search materialization; enemy persistent state/definition catalog; old navigation and player-visible query, plus related tests.

Reuse `readCycleContext`, `planResidenceAction`, `planCharacterCycle`; strict data parsing and safe integer helpers; real item catalog/instance/resource/state collection, backpack geometry/add/remove/weight, carried-container constructors and `classifyLoad`; enemy persistent-state validator; existing deterministic RNG. New exact-object wrappers run before older constructors. `queryResidenceAction` was read as the G1 query/action reference; G2's knowledge query only needs strict context reading, not an energy preview.

Do not reuse old Scene initialization or `materializeMainSearchOutcome`: both carry old Scene ownership/identity semantics; use their underlying item factories and RNG instead. Do not reuse old player-visible navigation's remote live traversal projection. New directed graph knowledge keeps last observations separate from current truth. Do not reuse RunLoadout's warehouse/taskStorage owner.

No G1 production edits, five-map registration, wallet, combat scheduler, specialization, player entry, browser save or G3. Test graph/item/cost values are isolated fixtures, not approved content.

## Iteration and self-review

- Initial TypeScript check found three existing catalog factories require physical definition IDs; supplied their real public second argument, no old API changes.
- First two-file run: 60 passed / 1 failed. A malformed-cost test modified a shared fixture cost used by later cases; catalog fixtures now deep-copy their isolated inputs. Rerun: 61/61.
- First architecture run rejected the test support file's content import (it is counted as core production by the existing checker). Moved G1 config injection into `.test.ts` callers; no checker exception or duplicate numerical config. Architecture: 50 DEC / 246 counted core files. This includes ten new implementation files and one test-only fixture helper; the ordinary/controlled index never exports that helper.
- Added safe-integer preflight for enemy cycle indexing before reusing its validator; consistent duplicate static enemy definitions are shared by the catalog, but conflicting ones reject. Named enemy state/cursors remain separate real facts.
- Additional checks cover source output identity collisions before RNG, original carryable overload using injected bands, equipment/quick state preservation, actual E0 effect-provider zero calls, and two independent persistent enemy cursors.
- Current API/test mapping and unimplemented responsibilities are in [contract and support](contract-and-support.md). No read-only assistant/subagent review was run; self-review is author evidence only.
