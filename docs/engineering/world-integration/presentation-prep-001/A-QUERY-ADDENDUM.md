# A query implementation addendum

Authority is the unchanged input A-TECHNICAL-CONTRACT-v1.0.md and this task's explicit user authorization. This addendum records implementation, not a new DEC/UIR or adoption of all historical A/B/C candidates.

`PlayerReadyView.combat.opponent` is required whenever combat is non-null. Its exact keys are `kind`, `visualKey`, `name`; the three known pairs and fixed unknown are those in the input contract. A non-combat query still returns `combat: null`. Ordinary PlayerSession retains exactly execute/preview/query/resolve/retrySave/setup/subscribe. The type-only player-index export adds PlayerOpponentPresentation.

Content owns `player-opponent-catalog.ts::infectedWorldOpponentPresentation`, a frozen exact-definition lookup. `infectedWorldPlayerLabels.opponent` supplies it at existing trusted composition. The optional seam keeps legacy action/source/place callers compatible. State's `player-opponent.ts::playerOpponent` reads only the current already-validated battle entry, gates active-world/live battle, validates the returned closed triple, explicitly constructs the public object and freezes it. Missing/malformed/unknown presentation returns the fixed unknown. The existing facade's readCombatValue rejection remains earlier than this helper; invalid values are not rehabilitated as unknown.

`player-queries.ts::projectPlayerView` actually appends the result to the explicit combat projection used by ordinary query. No new context, selector, current, cache, command, producer, RNG, IO or diagnostic channel exists. No content import enters core. No stage thresholds are copied: old playerCombatFacts/selectEnemyHealthPhase remains authoritative. Production UI does not consume the addition in this batch.

Private identifiers, raw CTB, exact enemy HP/ratio, hidden progress/exposure, risk cursor/rolls, future intent, drops and source allowances are forbidden. Frozen returned values cannot mutate current. The presentation triple is never serialized or used as expected, mission identity, command or opaque selector.

Whole old-query comparison uses a TEST-only oracle from the exact base (original blob `602786c0d291fb3574d1935d3ac5a657ffdc4d2e`). Only its function name and output annotations are adapted; logic is unchanged. Tests remove exactly the added opponent and compare the complete graph with one-to-one opaque-handle normalization, retaining actions, warnings, costs, all other facts and alias relationships. Existing field contract JSON and tests are untouched.

Native entry/restore for all three opponents and native healthy/wounded/severely-wounded/critical are tested. Current max HP is 14/16/16 and current player damage is 4/6/2, so these native enemies cannot reach a positive odd HP. Orderly has no positive incapacitated interval; the HP16 enemies' HP1 interval is unreachable with current damage parity. Actual HP0 closes combat. All five formal selector states and all 15 resource slots are specified separately; no live HP0, fabricated history, changed profile or death reinterpretation was introduced.

Completion is author verification awaiting exact-SHA mainline review, not permission to start B production/C/art adoption.
