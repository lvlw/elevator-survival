# Browser owner contract and support — author implementation

This is implementation evidence, not DEC/UIR, release/O3 approval or Owner experience acceptance. Formal [browser contract](../browser-owner-contract-v1.0.md) and [DEC-053](../../../../05-design-decisions.md#dec-053) remain authoritative.

## Application storage, not a new domain format

Namespace `elevator-survival.infected-preplay.v1`, fixed `primary` slot, `.reservation` and `.checkpoint` keys, `.writer` exclusive Web Lock. Application envelopes use version 1; the domain remains exact v4. Reservation binds generation, character, execution/seed, explicit tool/specialty, the one approved mission and supported version set. Checkpoint binds that generation and full expected with original v4Text in ONE setItem. No second body/inventory/wallet/current is stored. Client-editable records are not an anti-cheat trust root.

Only two genuinely absent records permit Setup. Confirm validates explicit choices before environment entropy, writes reservation before creating S/provider, then performs one true initial transaction and checkpoint attempt. Setup queries/mount/subscribe do not create identity or grant items. Initial physical writes are two, not one. Failed/ambiguous initialization never silently reissues identity/materials; orphan refresh blocks. Cold loading fixes independently stored expected and reservation/static bindings before S decodes opaque v4 text. No payload-derived expected, migration, cleanup or fallback-to-empty.

## Unique owner and lifetime

S keeps the only current and original validate/encode → commit → one synchronous writer → one native-notice order. Legacy text ports remain valid; explicit prepared ports are mutually exclusive and frozen. Async/dual/malformed compositions reject before domain claim. Invalid writer returns fail saving without a second writer. Retry saves newest memory only, preserves selection/Feed meaning, and never replays gameplay. Refresh only restores last durable checkpoint.

Web Locks use exclusive/ifAvailable, no steal or implicit queue. Whole writable lifetime is held. Missing/insecure capability blocks before S/identity/provider/IO. pagehide/lease loss immediately invalidates old controls, writer, drafts and confirmations; explicit reacquire creates a fresh domain from cold records, never reconnects old memory. Controller callbacks cannot sneak a producer after loss. No controller production edits were necessary. Same-origin cooperative contexts only; no claim about non-cooperating scripts, all storage partitions, malicious offline edits or hardware durability.

## Proven support and limits

See [B01—B10 and exact counters](verification-results.json), [real browser results](browser-results.json), [completion](completion.md) and [TEST-only runner](validation/README.md). Five stops and three enemies, both-zero/enemy-alive deaths, real refreshes, two same-partition tabs, frame competition, navigation/close/crash/BFCache are covered on tested Edge only. Test boundary checkpoints are labeled. Original hidden medical Preview stays unknown; this layer adds no knowledge or safety formulas. No UI/DOM/player route is registered by production code.

NOT RUN: actual OS quota/permission exhaustion/device power failure, other browser/mobile/private-mode partitions, Owner playability, low-asset UI and O3. Failure injections exercise real browser IO wrappers, not those environmental failures. Historical audit404 remains unconfirmed; no dependency changes.
