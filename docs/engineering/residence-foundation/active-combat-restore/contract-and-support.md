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
