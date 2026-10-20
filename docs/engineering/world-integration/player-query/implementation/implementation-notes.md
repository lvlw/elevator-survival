# ENG-WORLD-PLAYER-QUERY-001 implementation notes

## W1 baseline and design

Start: `8cddbdc3243561aaef5eb9a4eb6bd74dcbca11f3`, tree `758c5cf11eb3ae15c543b50f30a7e4f5a703f38c`. Clean index and working tree. New branch: `feature/world-player-query-001`. Default baseline actually executed: 242 files / 4318 tests PASS, 303.04s. Node v24.9.0, npm 11.6.0, Vitest 4.1.10; no CI, VITEST_MAX_WORKERS or NODE_OPTIONS override. Raw log retained outside repository in this task's temporary directory.

### Ownership and projection

The only current and writer remain the existing v4 CombatSession. The controlled facade wraps that owner; it does not compose P results or write storage. Ordinary exports are separate from combat-index/controlled. Four domain phases produce five complete points; unbootstrapped, no-save, read-error and blocked are application states, not invented domain phases.

24-field design map (concrete support and tests will be recorded in field-support.json):

| Field group | Existing truth / pure owner | Knowledge / stop point |
| --- | --- | --- |
| first.toolChoices, first.specialtyChoices | injected content catalog and current.choices | Setup catalog, then locked first-hub choices; no issuance by query |
| phase, location, taskDay | S current, G2 site/catalog, G1 clock / committed receipt | all complete points; terminal location not active |
| map.nodes, map.routes | canonical knowledge plus knownSupplyEdges/witnesses, edgePassable | observed routes only; remote last-observed distinct |
| move.options | formal movement edge qualification, supplyPaidCost, supplyEnergyQuery | stable-active, one edge, no arrival simulation |
| sources, tasks.publicObjectives | E01 catalog, productions, prerequisites, taskFact, real specified instance | only locally observed opportunities and acquired/completed facts |
| ground, carried | real containers, physical catalog, getOccupiedCells and ItemState | local ground; explicit opaque identities; terminal usable assets only |
| terminal.eligibility, terminal.result | sharedTerminalEligibility and committed receipt/dispositions | no speculative terminal result; H0/day7 remain formal |
| combat.intent/actions/enemyStage/relativeTimeline | projectCombat, existing command selector, selectEnemyHealthPhase | battle-decision; current relative order only, no future evaluation |
| body.hp/bleedingWounds/energySatiety | current G1 body, condition, limits and quotas | current public facts at all points; wound IDs replaced |
| body.infectionWarning | no new-world approved public stage mapping | explicit unknown; no progress/pending inference or old hospital thresholds |
| persistence.feedback | actual S persistence/status | no disk query |
| staticHub.successors | DEC-049/051 current single commission | living-hub: empty, not a restart or death |

### Opaque selection and freshness

Use frozen object-identity handles whose only payload is the fixed marker `{ selection: 'opaque' }`. They contain no ID, hash, ordinal, seed or execution encoding. A private context binds actual canonical object reference, purpose and technical selector. It stores identity metadata only, not a second body/inventory/enemy/balance or eligibility cache. Create it explicitly after facade construction/bootstrap/commit. Repeated reads do not mutate bindings. Any new canonical reference rebuilds the context; old/cross-facade/cold handles cannot resolve. retrySave retains the same current and handles. Failed uncommitted requests retain context. During synchronous write/notification callbacks, facade operations are busy and reads explicitly blocked, not an old executable projection.

### Narrow shared checks

Extract only pure eligibility/required parameter/cost checks from permitted hosts. Existing producers retain mutation, random draw, G1 execution and issue order. Queries never call producers or clinical effect evaluators. Formal geometry/load/resource compatibility helpers may validate explicit placements without issuing an item. F03 maintenance retains the complete body/resource/consumption validation at its original issue boundary; no intermediate full read. Old public exports, old S/domain, codecs, policies, expected and tests remain read-only.

### Errors and noninterference

Strict descriptor-first data validation rejects accessors without invoking them. Only typed, known business errors map to safe public categories; arbitrary Error objects (even with a code property) propagate. Hidden medical qualification is not reflected in enabled/list length/reasons: disinfectant and suppressant expose an unknown qualification and generic explanation. Preview is eligibility/requirements/cost, not a next-state simulation or death prediction.

Noninterference compares whole views including all actions, counts, order and errors, with a bijective renaming of fixed-marker object handles only. Pair seeds, hidden infection, unrevealed source outcomes and remote unknown enemies. Public wounds/resources/search/install/delivery changes must remain visible. Native routes choose from safe local opportunities and opaque handles, explicitly supplying quantities, targets, placements and methods; raw diagnostics are used only by independent test observers.

### Protection and verification plan

All tracked working bytes were fingerprinted before edits. Five input originals are byte copies. Three ratified payloads and all old tests/helpers are protected. Run new tests, affected old qualification/P/R/S, E03 124 cases/72 samples and old 10 budget cases, then default full check. Outside-repository semantic mutants must cause genuine assertion failures for hidden leakage and stale acceptance. Preserve historical W01 seven hard breaks and record actual cumulative exit code separately from new diff checks. No UI/browser/Owner playtest claims.
