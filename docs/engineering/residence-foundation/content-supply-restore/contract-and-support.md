# E01-R v3 aggregate and codec contract

Status: author implementation, awaiting exact-SHA v3 seam review. This is not a new gameplay decision or E01-S authorization.

## Ownership and entry points

- Family: `elevator-survival.residence-headless`; formatVersion: `3`.
- Ordinary entry: `src/state/residence-save/supply-index.ts`, exporting envelope creation, string serialization/deserialization, constants and readonly types.
- Controlled entry: `src/state/residence-save/supply-controlled.ts`, exporting issued policy creation, aggregate validation and same-progress candidate restore.
- Existing v1 `index.ts` and v2 `terminal-index.ts`, their readers, consumers and tests are unchanged. No implicit migration or registration.
- The envelope is exactly `{ format, formatVersion, state }`. `state` is the E01-P SupplyValue, not a second inventory, body, wallet or editable metadata copy.

## Independent binding

The controlled policy contains issued G1/supply/terminal configuration and content/catalog handles plus a copied declaration scope. It contains no current state, IO or SupplyAuthority. Unissued policy/config handles and malformed dependency shells reject.

Every operation requires external `SupplyResidenceExpectation`: character/rules/G1 configuration identity, phase, revision, cycle, complete ordered mission expectations, and the original initial mission/execution binding. Supply configuration, terminal configuration and content versions are independently fixed by policy and checked by the P aggregate.

The first-hub pending execution cannot be read back from candidate origins as its own expected. The caller supplies initial runId/seed/rulesVersion independently; all four initial origins must match it. Unaccepted missions do not invent an execution. Later phases also require independent mission/execution expectations. No production helper infers these expectations from a candidate.

Same-progress `restoreSupplyResidenceCandidate(candidate, independentCommitted, expected, policy)` additionally validates and compares the entire independently held committed value. Cold decode checks external bindings and internal consistency only: it is not an offline authenticity, cross-device rollback-prevention or current-installation service.

## Validation and purity

Deserialize: require string; parse JSON; exact family/version/state envelope; issued policy and exact expected; actual P `readSupplyValue`; external bindings; supported stable boundary; passive historical relationships. Serialize validates the value again before JSON.stringify.

P owns provenance, per-origin conservation, allocations, split/merge lineage, production, medical history, physical ownership/ItemState, recipes, receipts and wallet consistency. The v3 layer adds stable-boundary, chronology, stored checkpoint/body and ownership-domain relationships, not new gameplay formulas. It never fabricates missing steps, defaults, supplies, outcomes or fields.

P's existing read-only history check calls the shared pure balance calculator to compare recorded receipts. This is validation, not a terminal producer or another award. Deterministic source identity checking likewise does not draw RNG or issue instances.

Each result is a deeply frozen `{ kind: 'supply-residence-candidate', value }`. It carries no authority and cannot be used as a SupplyAuthority. Mutable caller input is neither mutated nor frozen. No current, Storage adapter, notification API or installation function exists here.

## Support matrix

| Boundary | v3 support | Evidence |
| --- | --- | --- |
| first-hub | Yes; initial execution independently required | Four-state roundtrip and R-GUARD-01 |
| active-world, pending none | Yes; positive health and current mission binding | Roundtrip, source/consumption/lineage tests |
| active-world, living pending combat | No; UNSUPPORTED_STAGE, pending unchanged | Native door + move encounter test |
| living-hub | Yes; normal H0 empty steps or actual deadline continuation | Success/failure/deadline roundtrips |
| dead | Yes; actual supply/G2/deadline checkpoint and unavailable assets | Action bleed, cycle bleed, infection and hunger death |
| same-progress restore | Yes; full independent committed comparison | Legal-but-changed body rejects |
| v1/v2 values in v3 | No migration | Actual old codec text rejects |
| v3 in v1/v2 | No | Old readers reject UNKNOWN_VERSION |
| current / saves / browser / active CTB | Not implemented | E01-S/E02/E03/O3 remain separate |

## Acceptance groups

| Group | Evidence file(s) and purpose |
| --- | --- |
| R01 | supply-codec / supply-validation: exact v3 envelope and controlled versions |
| R02 | supply-roundtrip: four states, frozen outputs, unchanged inputs, byte stability |
| R03 | supply-expected: external initial execution; all phase/mission bindings; full committed comparison |
| R04 | supply-validation / supply-codec: illegal values, getters, sparse/cyclic data, extra fields |
| R05 | supply-compatibility: native v1/v2/v3 bidirectional rejection and exact old exports |
| R06 | supply-history: origins, allocation intervals, split/merge and cross-origin substitution |
| R07 | supply-history / supply-roundtrip: production, first bandage, recipes, real sample and retained ground |
| R08 | supply-history / supply-roundtrip: closure/body trace, wallet, receipt, archive, real death sources |
| R09 | supply-history / supply-roundtrip: two TEST declarations; old success/failure survive later death |
| R10 | supply-purity: each encode/decode/restore separately observes zero producer/RNG/IO calls |
| R11 | supply-compatibility / supply-purity: candidate is readonly, never issued gameplay authority |
| R12 | verification-results: whitelist, input hashes, old P/B/C regressions and full check |

All test filenames above are under `src/state/residence-save/`. The second declaration and danger-cleared prestates are TEST-only controlled fixtures; they preserve enemy definitions and do not claim a real CTB victory, new player content or Owner acceptance.

See [implementation notes](implementation-notes.md), [verification](verification-results.json), [completion](completion.md) and the unchanged [approved restore contract](../content-supply-restore-contract-v1.0.md).
