# E02-R v4 contract and support

Status: author implementation and native verification; exact-SHA mainline review pending. No browser/current/storage integration.

## Exact API surface

`combat-index.ts` runtime exports: COMBAT_RESIDENCE_FORMAT, COMBAT_RESIDENCE_FORMAT_VERSION, CombatResidenceSaveError, createCombatResidenceEnvelope, serializeCombatResidenceSave, deserializeCombatResidenceSave. Type exports: CombatResidencePolicy, CombatResidencePolicyInput, CombatResidenceExpectation, CombatResidenceCandidate, CombatResidenceEnvelope.

`combat-controlled.ts` runtime exports: createCombatResidencePolicy, readCombatResidenceExpectation, validateCombatResidenceAggregate, restoreCombatResidenceCandidate. Neither entry exports gameplay authority, plan producers, installation, session/domain or IO.

- Policy input: `{dependencies: issued CombatDependencies, randomAlgorithmVersion}`. Approved P dependencies/profile bindings are reused; residence/supply/terminal/configuration/content/catalog scope and counter32-v1 are pinned. An owned scope copy detects later caller scope mutation without freezing it.
- Expectation: identity, phase, revision, cycle, versions, missions, initial `{binding, execution, choices}`, nullable actual battle anchor, nullable latest closure anchor. Battle has binding/id/entry revision/edge endpoints/enemy identities/queue/intent/cycle/count/risk. Typed combat closure includes actual battle/entry/edge/enemy identities and complete typed trace, not a fabricated signature.
- Envelope: exactly `{format:'elevator-survival.residence-headless',formatVersion:4,state:CombatValue}`; protocol is `residence-combat-pure-v1`.
- Decoder returns `{kind:'combat-residence-candidate',value}`. Same-progress restore requires a separately supplied complete committed value, validates both and compares every domain fact. It has no default committed input.

## Ownership and reuse

P readCombatValue owns schema, combat queue/trace, persistent enemies, resources and supply domain constraints. R pins independent anchors and strengthens stored chronology/entry-arrival checkpoints/exit energy capacity; this is deterministic recorded-evidence comparison, never gameplay replay. Neutral supply history retains G1 checkpoint amplitude/rest/day guards, cycle chronology, dispositions and source-unit declaration order. Only the v4 callback consumes combat-death records; the original v3 wrapper retains four-source rejection and its error class.

Only known domain invalid-data exceptions are translated. Programmer TypeError/RangeError or injected implementation exceptions are not semantic PASS evidence. Validation/encoding checks raw values before JSON normalization. Caller values, expected, independent committed and dependency scope are not frozen or mutated; owned results are deeply frozen.

## R01-R12 native mapping

All test paths below are under `src/state/residence-save/`.

| Group | API / native evidence |
| --- | --- |
| R01 | combat-policy/schema/codecs; combat-aggregate and combat-compatibility: actual protocol, exact three keys, versions and issued policy |
| R02 | combat-expected: first-hub seed from independent bootstrap arguments; combat-roundtrip: actual initial materialization |
| R03 | combat-aggregate: pending without battle, drain, preparation, defense, HP0, unpaid exit; combat-roundtrip: five legal full boundaries |
| R04 | combat-roundtrip: three actual first/action decision points; combat-review-regression: original queue/count/risk witnesses |
| R05 | combat-continuation: actual next commands, retreat repair/reentry, victory coat repair, repaired death; full values equal |
| R06 | combat-roundtrip/continuation/history: typed three-enemy and later-battle death, healing death, Day6 rest/Day7 deadline/action death, H0 empty steps |
| R07 | combat-review-regression: original 20 witnesses and F03 resource rejection through aggregate/encode/decode; history retains G1/P guards |
| R08 | combat-history: true three-CTB success/install/sample, two explicit TEST declarations with real later CTB death, provenance/wallet/history tampering |
| R09 | combat-expected: strict external expected, unknown facts rejected, both committed values independently validated then complete comparison |
| R10 | combat-compatibility: six directions; combat-history-sharing: same old source/category corpus also run with untouched baseline helper outside repo |
| R11 | combat-purity: four APIs x legal/rejected, 36 distinct zero counters plus injected draw; input/freeze checks; two outside-repo semantic mutants |
| R12 | baseline/full check, read-only core/content/old tests, 35 exact paths, append-only byte prefixes, input/config hashes, W01 and branch-only Git audit |

## Limits

Cold consistency is not authentication of jointly forged candidate/external materials, cryptographic history signing or cross-device rollback protection. TEST day/HP/body boundaries are labeled. Only the older archived execution in the two-declaration test uses an existing danger-cleared TEST fixture; all current/later battles and the complete three-enemy success route use true CTB producers.

Storage and notification spies prove no call during codec; they do not prove real save failure, retry, session reentry or current installation. Those are NOT RUN / outside E02-R. Older P/R1/R2 negative controls are NOT RE-RUN; two new R controls are counted separately. No E02-S/E03, browser/multitab/UI or O3 decision.

## E02-R-R1 support addendum

The exact original v4 API, schema and permissions stay unchanged. Joint death archive validation supports both actual killed-enemy none and living-enemy combat-required, tied to this receipt's entry/decision, execution, revision, node and enemy instance. Ordinary live-battle pending rules remain P-owned and strict.

New native tests: combat-review-simultaneous-death.test.ts (35: original 12 byte-exact first-run cases plus 23 adjacent cases) and combat-review-simultaneous-purity.test.ts (9). The new fixtures are TEST-only. Cases include basic/charged simultaneous death, +1 HP living victory, living direct/bleed/heal death, real reentry and later C2 encounter, complete frozen roundtrip, wrong pending/binding/source/trace/money/disposition/phase/extra fields, and full independent committed comparison. No original 169 tests/helpers changed.

Zero replay observes 36 actual spies per valid/rejected call across four APIs and both dead-enemy branches, plus injected draw. Real last action/death work is separately [CTB resolver, plan, reducer, death consumer, terminate, settlement]=[1,1,1,1,1,1]; G1 action/cycle and RNG draw are zero for this actual final kill. It does not prove real Storage failure, session reentry or browser behavior.

Two outside-repository semantic mutants: restore the old overstrong killed-enemy pending requirement (legal positive fails); omit actual living-enemy pending requirement (P-valid malformed archive wrongly accepted and business assertion fails). Both exit 1 without import/fixture exceptions. Historical P/R1/R2 and initial E02-R mutants are NOT RE-RUN.
