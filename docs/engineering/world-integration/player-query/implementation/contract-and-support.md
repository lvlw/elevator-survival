# ENG-WORLD-PLAYER-QUERY-001 — contract and support

Status: author implementation; exact-SHA mainline review still required. No UI, browser storage, multitab, player entry or O3 decision is included.

## Entrypoints and ownership

[player-controlled.ts](../../../../../src/state/residence-session/player-controlled.ts) creates a controlled wrapper around the existing v4 S. [player-index.ts](../../../../../src/state/residence-session/player-index.ts) exports ordinary safe DTO types, not current/commit/authority/commands. The controlled bundle has bootstrap/retryRead/createFirst/synchronize; its `player` member has only query/setup/preview/resolve/execute/retrySave/subscribe. Existing S remains the sole current, pre-encoder and writer; old domain guards are reused.

Pure core [qualification/projection](../../../../../src/core/residence-supply/player-query.ts) accepts normalized structural intents, not a next state or a resolver result. State performs descriptor-first selection parsing, private reference binding and delegation. `resolve` returns a safe qualification DTO, never an internal command or authority. Only explicit `execute` calls S.dispatch. Final S/P qualification is never bypassed.

`available` means command eligibility, **not safe survival**. This batch does not simulate a future battle/body cycle or derive a hidden outcome. Public costs come from formal pure owners. Combat attack resource payment reuses the formal ItemState preview, including last-resource truncation; victory/retreat energy is described as one later settlement, not invented numeric future CTB.

## 24 fields, four phases and five stops

The complete mapping is [field-support.json](field-support.json): 24 logical keys covered, 23 public mappings implemented, one deliberate infection-stage unknown. Inactive combat/terminal data is null, not a false supported result. first-hub, stable-active, battle-decision, living-hub and dead are distinct complete points; no-current/unbootstrapped/read-error/blocked remain application states.

Setup reads a public catalogue without issuance. Existing initial choices remain locked; there is no facade operation to reissue or change them. Current map nodes/edges come only from canonical knowledge plus real witnesses. Unknown side routes are absent. A remote investigated edge with no stored traversal observation has unknown passability rather than a fabricated current/last observation.

E01 source opportunities use current node, actual productions and shared prerequisites, not the old empty G2 source list. Revealed local items and real carried containers expose physical dimensions, actual resource and formal occupied cells; source/origin ledgers and real IDs stay private. Task acquired/carried/left/delivered are separate. Completed terminal objectives read the committed archive rather than resetting to unobserved. H0 return keeps real empty body steps; Day7 does not invent Day8. Both-zero remains final death and retains the true kill internally.

### Unknowns and UI-before responsibilities

- New-world infection public stages have no ratified mapping. `body.infectionWarning` is explicitly unknown, with a generic approved mechanism explanation; no exact progress/pending value or old hospital threshold is used.
- Disinfectant and suppressant target qualification is unknown in previews regardless of hidden state. An explicit request may be rejected by S, or consume one real item when its actual target exists. These outcomes are not predicted through enabled/list length/reasons.
- Relative combat timeline is current known order only, not an action Ghost/future simulation. Any later UI prediction remains a separate approved boundary.
- Remote missing observation is unknown, never safe/current-passable. UI must preserve that distinction. These are not permission to add canonical memory fields in this batch.

## Opaque selector lifecycle

Each handle is a frozen object with only the fixed marker `{ selection: 'opaque' }`. Object identity, not payload, resolves it. No seed/execution/origin/instance/wound ID, ordinal, encoding or hash is in its payload. Private maps contain purpose/technical object selectors and a canonical reference only; no second editable body/inventory/enemy/balance or eligibility cache.

Context is made explicitly at composition/restore/commit, never mutated by query. Every new current invalidates old handles, including movement, battle, phase, consumption and split/merge. JSON copies, wrong-purpose and cross-facade/cold handles fail without fallback. A failed uncommitted request retains valid handles. retrySave keeps the same current and handles while feedback changes. Save failure exposes latest committed memory, not disk rollback.

During S.write/native notification callbacks, reads are explicitly transaction-blocked and gameplay reentry is rejected. They do not advertise the previous view as executable. A projection-construction failure leaves committed current intact, makes the player view unavailable, does not save again, and remains an observable implementation error. Controlled synchronize can rebuild presentation only.

Only genuine typed business errors become safe unavailable/invalid-selection categories. An arbitrary Error with a `code` property propagates; raw causes, internal rejection codes and S commits are not ordinary DTOs.

## Narrow extraction compatibility

| Existing host | Shared pure owner / retained production behavior | Evidence |
| --- | --- | --- |
| residence-location/movement.ts | requireKnownResidenceEdge; unchanged G1/arrival/encounter execution | old movement.test.ts; new preview and native routes |
| residence-location/items.ts | requireOrdinaryTransferItem; same real whole-instance transfer | old items-sources.test.ts; new dispatch tests |
| residence-supply/shared-inventory.ts | requireSupplySplit/Merge/QuickTarget; original lineage, source shares and physical operations | old inventory.test.ts, including 27→28 / 28→29; new explicit seven operations |
| residence-supply/shared-medical.ts | requireSupplyClinicalTarget; original healing/bleeding/quota/consumption order | old medical.test.ts; hidden target pairs and native use |
| residence-supply/shared-maintenance.ts | pool/allocation/target/recipe helpers; original resource restoration/body/consumption and issue boundary | old maintenance and F03 regressions; immediate native post-retreat repair |
| residence-task/plans.ts | assertSupplyRecipe/requireEquippedSupplyTool; no query consumption or issuance | old task/sample/source tests; missing recipe rejection |
| residence-task/shared-actions.ts | requireTaskSelection/taskMethodCost/taskMethodChoices; pollution draw and primary outcomes unchanged | old tasks/sample regressions; full query-driven route |
| residence-task/shared-sources.ts | strict source selection, method/cost and exchange geometry; same producer and random path | old source tests; real atomic hotel exchange into freed material cells |
| residence-task/shared-transfer.ts | real original/provenance selection; same task item identity | old transfer tests; sample acquisition/delivery native route |

Only nine of the sixteen permitted hosts needed edits. Old exported functions remain. Extraction preserves formal results and error classes/codes; a generic private opportunity message is shared, not returned to players. F03 still validates raw before and issues complete body/resource/consumption together; no intermediate full read or skipValidation flag was added. Existing S/domain, v4 schema/codec/policy/expected, G1, CTB, content/config and all old tests/helpers are byte-protected.

## Q01—Q12 acceptance map

All new tests are under `src/state/residence-session/`; existing protected tests remain in their original paths.

| Gate | New evidence |
| --- | --- |
| Q01 | player-phases, player-fields: application states, five points, issued policy/shared domain, strict request descriptors |
| Q02 | player-phases: pure Setup and actual first-hub choice lock / no reissue |
| Q03 | player-privacy and player-route: known-only local routes, investigation and remote observation distinction |
| Q04 | player-dispatch, player-compatibility, player-route: E01 sources, real footprint/resources/units, task/recipe facts |
| Q05 | player-phases: all three genuine battles, existing health phase/intent/command owner, public payments/current relative timeline |
| Q06 | player-privacy, player-compatibility: hidden progress/pending pairs, unknown medical target, current public body |
| Q07 | player-phases, player-dispatch, player-route: H0 empty steps, Day7, source death, living-enemy and both-zero death, success/static hub |
| Q08 | player-stale, player-dispatch: old/cross/cold/wrong-purpose/consumed/split/phase/sample selections |
| Q09 | player-preview, player-dispatch, player-route: explicit inputs, no replacement or first-fit, one native S dispatch |
| Q10 | player-purity, player-persistence: per-window independent zero counters, save-only retry, callback reentry, no rollback |
| Q11 | player-privacy, player-compatibility: complete view/option/error comparison with handle bijection; real public change positive controls |
| Q12 | player-route; unchanged E03 124 cases + old budget 10; two external semantic mutants; default complete check |

## Native chains and independent counts

The new public route starts at real read-null and initial grant, and takes all movement/source/item/task/combat/medical/terminal choices from safe views and opaque objects. Quantities, anchors, rotation, materials and methods remain explicit TEST strategy choices; there is no facade target/material auto-selection. It reaches real sample acquisition, installation and success: **75 dispatch / 76 writes / 76 native notices**, including the separate initial creation write/notice. Missing installation material is rejected before dispatch. A second real read-null chain acquires repair metal before entry, retreats, immediately repairs, treats bleeding, rests/reenters and explicitly stops; spent metal is not refunded/reissued.

For read-only legal and rejected windows, the observed P/CTB/G1/G2/authority/origin/consumption/codec/IO/notification vector and S dispatch are all zero. Explicit committed operation: one S dispatch, one write attempt, one native notice/current replacement. H1 random source with save failure: one source, one draw, two real source-origin issuances, one write attempt/current/notice; latest memory retained. Retry: aggregate validation twice, encode/write once, all gameplay/draw/read/notice/dispatch counts zero, same current reference. Explicit hidden-target medical rejection is one S dispatch but zero write/notice/state mutation; its preview remains unknown, not an oracle.

## Regression and negative-control limits

Original E03 124 + budget 10 passed in a 15-file actual run with 85 outside evidence outputs. Default 72 seed/combination samples remain 63 success / 9 actual death. Four official witnesses succeed; hotel seed-01 is a real missing-condition stop, not death or success. No strategy/seed/old helper was changed. Prior historic local/CI results retain their original identity; prior unrelated negative-control packs are NOT RE-RUN.

Outside-repository mutations add raw ID payload to handles, or retain stale bindings and silently bind them with the new revision. The ordinary leakage/staleness tests detect these with genuine AssertionErrors (not import/fixture/type/timeout failures). Mutation files never replace repository production files. See [verification results](verification-results.json) and [completion](completion.md) for executed counts/status.
