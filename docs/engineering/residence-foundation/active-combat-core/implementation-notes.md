# ENG-RESIDENCE-COMBAT-CORE-001 — Implementation Notes

## Verified start

- HEAD: `4166fb25ab2898ca602043fbddacbb88d3444fdf`.
- Branch: `feature/residence-combat-core-001`, created from that exact HEAD.
- Working tree and index were clean. Package digests and the five formal contract digests matched.
- Native baseline: `npm run test:run`, exit 0, 179 files / 3621 tests. Full output is retained outside the repository in the extracted input directory as `baseline-test.log`.

## Detailed design

The new protocol owns one character body, carried inventory, ItemState collection, persistent site and enemy, and supply provenance. Battle data owns only entry identity, queue/checkpoint evidence and closed-battle/death receipts. CombatEncounterSnapshot is an ephemeral evaluation projection, never a second persisted body or inventory.

The existing CTB transition algorithm is to be shared through an internal controlled profile boundary. Legacy dependencies retain their existing validation and semantics; new profiles are explicitly keyed by enemy definition and action, and do not construct a renamed hospital FrozenRuleConfig. The new controlled resolution evaluates once and applies its privately issued effects; old uploaded-effect verification remains strict.

Stable supply actions are to share version-neutral domain operations. Old SupplyAuthority continues to authorize only its own strict protocol. The new authority validates the entire new aggregate and binds the independent base and dependencies. It must not erase battle data or receipts to pretend to be an old SupplyValue.

Entry captures the actual movement-before witness, then executes the real G2 move and its G1 checkpoint. G2's arrival encounter flag cannot determine first versus reentry. Entry and each player command advance the outer revision exactly once. Victory/escape alone settle the configured elapsed-CTB energy fee; death consumes the issued typed body trace and closes through the common pure terminal settlement without replay.

The typed combat trace distinguishes recovery, direct damage, post-action bleeding, injuries and exposure. It validates raw safe integers, adjacency, requested/actual bounds and death short-circuiting. Legacy BodyStep and its restore/terminal consumers remain unchanged.

## Scope and verification plan

Use only the package's 116 exact allowed paths. Existing tests, helpers, G1/G2, restore/session codecs, state/app/UI, dependencies, rules and CI stay read-only. Shared documentation changes are append-only. Input copies retain original bytes. No current owner, storage adapter, v4 codec or player entry is part of this delivery.

Verification will include the P01–P12 native acceptance mapping, actual independent counters, business-level semantic negative controls, targeted legacy compatibility, full `npm run check`, scope/protected-byte checks and ordinary/staged/baseline diffs. The cumulative historical W01 whitespace exception must remain exactly the original seven hard breaks; all new differences must be clean.

## Execution record

The initial design above was recorded before implementation. The executed design and acceptance follow; final evidence is recorded separately in verification-results.json.

### Implemented seams

- Protocol: `residence-combat-pure-v1`, a pure aggregate, not a save format. Character, carried inventory, ItemState, site enemies, origins, dispositions and mission/wallet facts each retain one owner. The battle references the persistent enemy; evaluation projects an ephemeral CTB snapshot and never stores a second body or inventory.
- The old CTB transition builder is shared. `combat-profile*` validates a neutral enemy/rule profile and controlled dependencies; `combat-effect-reducer` is the single effect reducer. `resolveProfiledCombatAction` evaluates and reduces once. Old uploaded effects still rebuild and compare against the formal plan; no skip-validation switch was introduced.
- Legacy enemy primary results keep their original public shape. Only the shared internal primary carries the real injury kind. The new profiles bind approved first CTB, action damage/wait/injury/risk and G1 HP/quota to actual content; no renamed hospital configuration is constructed.
- Supply/task stable operations were extracted into version-neutral `shared-*` functions. Legacy wrappers still validate the old protocol and issue old capabilities. The new composition validates its complete aggregate, calls those shared operations and issues its own plan; it never removes battle/history fields to masquerade as an old SupplyValue.
- Real pre-move EntryWitness captures edge endpoints, execution/catalog, revision, enemy HP/intent/count/risk and the original encountered flag. Actual G2 movement and G1 checkpoints run before entry. Moving to HP0 closes through the existing source; E0 after movement still enters the triggered fight.
- DecisionWitness records the last command, CTB queue reasons/adjacency, HP checkpoints, enemy counts/risk range, real resource/quota/consumption references and typed body trace. ClosedBattleReceipt and CombatDeathReceipt bind their own entry/execution/revision. Historical evidence is not an event bus or a snapshot archive.
- Combat treatment uses shared bandage recovery and real origin-unit consumption. G1 quota is the only charged-strike allowance. Last positive weapon/coat resource provides the full action/strike protection and then clips to zero. First-bandage state is shared across combat and stable actions, not reset on exit/rest.
- Alive exit settles energy once from configured elapsed CTB. Death is a private issued proposal, consumed once by `consumeCombatDeath`, reusing pure A settlement without CTB, randomness, treatment or G1 replay and without another revision. No HP0 active intermediate is published.

### Necessary existing-file adaptations (A group)

| Existing paths | Necessary contract seam |
| --- | --- |
| combat-dependencies, combat-snapshot, enemy-persistent-state | Validate/project the shared engine subset, retaining old signatures and old initial values. |
| combat-player-action-primary-plan, combat-enemy-action-primary-plan, combat-selectors | Internal profile-aware reads; old public primary shape stays unchanged. |
| combat-transition-plan, combat-types | Real contusion effects and deterministic new-source wound identities; original CTB order and old identities remain. |
| combat-risk | New execution/catalog/enemy/action/purpose domain, strict injected draw validation; legacy random domain unchanged. |
| combat-effect-application | Extract one reducer while preserving strict old effect/command binding. |
| residence-supply/allocations, provenance, history, cycle-adapter | Generic domain typing, origin/history preservation, new typed receipt validation; no formula change. |
| residence-supply/authority, plans, validation | Shared domain validation/issuance callbacks; old protocol and capability boundary remain strict. |
| residence-supply/initial, controlled, inventory, medical, maintenance | Thin legacy adapters to actual shared grant/departure/inventory/treatment/resource operations. |
| residence-task/actions, sources, transfer, plans, random | Share formal production/qualification/source/transport operations without dropping new combat facts. |
| residence-terminal/supply-terminal | Share settlement/disposition/archive construction; old death verification remains untouched. |

Each shorthand above denotes the same-named `.ts` file under `src/core/`; the complete actual file list is in verification-results.json. No other existing production path or old test was changed.

### Self-review and real failures

- The first extraction regression exposed old issuance spy compatibility; legacy adapters now pass the original issuer explicitly. The affected old suite then passed 65 files / 1259 tests.
- Initial materialization originally validated a partial grant set. Composition now validates after all four real grants; initial/departure/move counters are separately asserted.
- Early new-test assumptions about quota, armor reduction, sorted states, protected injury and task-item pickup were corrected against actual approved APIs, not by changing rules or old expectations. The complete success chain explicitly rests before attempting a paid action at E0.
- Added strict dependency/profile-array and raw injected entropy checks, queue witness adjacency, real enemy-action/CTB trace attribution, and later real reentry death binding.
- Final check first caught a core test helper importing content. The helper now accepts a dependency factory supplied by test files. A subsequent typecheck caught the two new CTB tests still using the former helper exports; both were adapted. No validator or old test was weakened.
- A late native profile counterexample showed that a changed reentry CTB could still issue a dependency (7-test file: 1 failure before fix). Reentry, player action/resource/retreat/medicine CTB and G1 bleeding/backpack facts now bind to their existing approved configuration/content sources; inherited CTB rules agree across profiles. The extended original new-test case rejects changed reentry and pipe damage (7/7 after fix), without changing parameters or test count.
- Four external semantic mutants were executed with native Vitest config loading: wrong first-entry CTB (4 failed), duplicate exit charge (1 failed), raw trace validation bypass (6 failed), and real CTB replay during death consumption (1 failed). An earlier Vite cache permission failure is not counted as a successful negative control. No mutant was installed in repository production code.

### Limits

P validates pure values and controlled plan issuance, not offline historical authenticity or global rollback. Ordinary queries expose an explicit safe subset, but E03 player ViewModel/renderer wiring is NOT RUN. v4 codec, current installation, storage, browser/multi-tab, O3 and further batches are NOT RUN. No save/notification count is claimed; these layers are absent.
