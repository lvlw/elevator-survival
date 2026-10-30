# B committed presentation candidate

Status: REVIEW CANDIDATE. Source research only; no B production event, notification or lifecycle implementation exists in this batch. A's authorization does not approve this candidate. Future work requires an exact-SHA task and explicit whitelist.

## Observed source chain

Original P `src/core/residence-combat/actions.ts::resolveResidenceCombatAction` returns a completed CombatPlan. `types.ts` defines DecisionWitness.queue/trace/uses/resources/enemyResponses. S `src/state/residence-session/combat-session.ts::dispatch/commit` fully validates/pre-encodes, installs current, attempts save and notifies before returning CombatSessionCommit. Facade `player-facade.ts::execute` resolves a typed command, calls dispatch once, synchronizes, and returns only kind/view/preview. It discards the dispatch return. Controller `src/app/infected-preplay/controller.ts::executeCaptured/run/adopt` returns kind/snapshot (the type's execution is optional and absent in the observed path). `feed.ts` projects coarse public before/after facts, not an action trace. `src/app/infected-browser/owner.ts::freshContext` forwards the controller under existing lease/guard.

The new source probes consume original returned results once. The multi-response case uses an explicit valid TEST weapon-resource boundary, eight real defends, then one actual temporary attack. Two enemy responses exist in trusted witnesses, while PlayerExecution has no response count/sequence. No HP-difference, feed wording or cumulative-count inference is used. See B-SOURCE records and B-SOURCE-MATRIX.md.

## Narrow candidate schema and field sources

Proposed first B cut supports exactly one coarse committed-action envelope per successfully committed command in the existing `combat` family, limited to the six action classes below, not individual enemy blows. All non-combat commands (including movement, stable medical, tasks, terminal, initial stock and departure) keep existing results and receive no envelope/token in B1. This permits deterministic public projection without exposing response counts or hidden branches.

| Proposed field | Real source/function | Current availability and permitted minimum | Gap / forbidden data |
| --- | --- | --- | --- |
| `version: 1` | New closed presentation type | Candidate constant, not save/rules version | Requires later type review |
| `token` | Controller executeCaptured after successful original execution | Session-local opaque object + monotonically increasing local ordinal; same event object reused if delivered twice | Not seed, execution ID, battle ID, canonical revision, entropy or durable identity |
| `actor: {role:'player'}` | Original resolved typed command in facade execute | Known initiating player | No instance/source/wound IDs |
| `action` | resolvePlayerCommand result already held by facade | Closed public kinds: basic-attack/signature/temporary-attack/defend/retreat/quick-use; explicit captured current choice | This typed fact is discarded by current ordinary return. Never derive from translated label or opaque object shape |
| `opponent` | Safe before-query combat.opponent from A | Already public current class or unknown, captured for this completed envelope only | No remote enemy, location-derived class or lasting enemy history |
| `stageBefore/stageAfter` | Existing before/after safe combat.enemyStage | Approved coarse phase or null when combat absent | No exact HP, ratio or synthetic post-victory live stage; null alone does not assert victory |
| `sequence` | New deterministic projection of the above | Exactly one initiating-action record, ordinal 0, then settled stop. Constant event cardinality independent of hidden response/injury/exposure | No individual enemy response events, damage numbers, effects or raw witness traversal |
| `stop` | Returned PlayerView.point/phase | battle-decision/stable-active/living-hub/dead; blocked becomes unavailable, not an inferred stop | No future initiative, predicted death or speculative scene |
| `persistence` | Returned PlayerView.persistence.feedback or existing S persistence | saved/save-failed separate from commit | Save failure never converts a commit into rejection or causes replay |

These are proposed field names/values, not an installed contract. The minimal implementation could carry a closed internal completed-action classification out of facade execute, then build the public envelope at the controller's successful execution return. It does not require changing S commit/publish, prepared modes, policy, expected, codecs or owner. One explicit new ephemeral result transport is still a real lifecycle seam and must be separately reviewed.

## What cannot yet be safely animated

Internal queue has scheduling, enemy-action-resolved/terminal and current decision stop. Internal trace additionally contains clinical risks, exact HP/CTB, action IDs, references and actual exposure. Availability internally is not authorization to publish it. `enemyResponses` counts player-health-loss effects, including possible zero actual damage, not a general public hit list. Pure witness types also do not directly preserve every player's enemy-hit animation event. Filtering trace kinds is insufficient: record count, missing fields, ordinals and errors can leak hidden branches.

For a future detailed sequence, the minimum additional source is a bounded trusted projection of the already-completed CTB result, before facade discards it, with a separately approved schema for public actor/action ordering. It must establish which enemy response/action facts are allowed player knowledge, how zero damage/control/treatment and simultaneous death appear, and prove whole-output noninterference including array lengths. It must not re-run CTB/RNG/clinical/energy or copy all raw trace. If that knowledge is not approved, retain the coarse one-record cut and mark detailed blows unsupported.

## Commit, tokens and cancellation

1. Generate token only for the successful execute/executeDraft/confirm return that actually committed one of the six supported combat-family actions. Non-combat commits receive no token. Never generate from subscription notifications, busy/stable publishes, query, preview, description, draft, cancellation, rejection, retrySave, synchronize, setup or bootstrap.
2. Token ordinal starts at zero per new controller/owner session, increases once per returned commit and is never persisted. Consumer keeps a bounded session-local consumed-token set/high-water mark; same token at most once. Token is not an authority for dispatch or state mutation. Successful save retry retains scope and creates no token.
3. A committed result with failed save may play the same coarse envelope once and show separate save-failed feedback. Retry saves latest current only; it neither creates a new action nor plays again. A rejected command is zero commit and has no envelope. If execute reports uncertainty/projection failure, stop presentation and show current recovery/error; do not reconstruct missed events from memory, disk or Feed.
4. Cold restore displays the newest successfully persisted stable state with empty animation queue/token history and no replay. First-hub restore grants no stock. Reentry is a new actual combat context from existing S, not revival or reuse of prior stage.
5. Cancellation before commit invalidates drafts/confirmation, producing no event. Cancellation after commit, unmount, navigation or lost lease cancels only local presentation; it cannot undo/refire the command. Dispose resets token scope and drops pending envelopes. Terminal state may render immediately; an optional short settled presentation never retains a usable old combat context.
6. Skip/reduced motion consumes the same token and settles visuals immediately. Animation callbacks never dispatch, charge resources, award, save, reopen combat or decide victory/death. No real-time timer advances CTB. Consumer errors cannot roll back current.

## Privacy and deterministic acceptance

All keys/enum sets are closed and explicitly projected. Equal approved public before/after facts and same submitted public action must yield identical envelope shape, event count, labels and generic error regardless of hidden infection, stage-internal HP, seed or instance identity (token correspondence normalized one-to-one). Different approved current enemy class is a positive control. Unknown fields are fixed neutral values; do not attach private diagnostics. Exact enemy HP, raw CTB, internal action names, random cursors, item/wound IDs, origin/disposition data and future outcomes are excluded.

Required future tests: all six action classes, native two-response command, zero damage, last durability/quick unit, actual heal, victory, enemy-alive death, both-zero primary-then-bleeding death, rejected/stale/cancel, committed+save-failed then continue/retry, duplicate listeners/busy/stable notifications, repeated sync, five cold stop points, reentry, unmount/lost lease/skip/reduced motion, and whole-envelope noninterference. Count one producer/CTB/commit/write/notice for an actual action; read windows zero. No number-of-tests target.

## Proposed production whitelist for a separately authorized first cut

- Modify `src/state/residence-session/player-types.ts` and `player-facade.ts` only to carry a closed coarse completed-action fact from the already resolved original command after successful dispatch.
- Add `src/state/residence-session/player-committed-presentation.ts` for pure explicit projection, if review confirms it is necessary.
- Modify `src/app/infected-preplay/types.ts` and `controller.ts` for an optional committed envelope on direct PreplayResult and session-local token issuance; no snapshot canonical cache or subscription event bus.
- Add dedicated new tests for projection, privacy, lifecycle and controller forwarding. BrowserOwner/BrowserControls may remain unchanged because they already forward PreplayResult; verify this inference against the future exact SHA.
- Exclude core, S owner/commit/publish, browser owner, save/expected, production UI, dependencies, CI and assets. If source evidence needs more, stop that subitem and obtain an expanded task before editing.

Suggested commands: the new exact targeted files; existing player-/combat- query/persistence tests; infected-preplay and infected-browser suites; E03 acceptance directory; default npm run check; external semantic negatives. A pass is prerequisite evidence, not B authorization.

Future cut B1: review coarse schema/transport and whitelist; implement plus privacy/save/lifecycle tests; exact-SHA stop. B2 only if explicitly approved: detailed already-occurred enemy response knowledge and bounded projection with another exact-SHA stop. C follows approved B scope and per-slot art gates. No Owner decision is needed for routine implementation within such a future task; genuinely new per-response knowledge/zero-damage meaning must be explicitly approved rather than inferred here.
