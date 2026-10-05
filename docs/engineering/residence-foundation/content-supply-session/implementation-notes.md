# E01-S implementation notes

Status: author implementation and local verification complete; exact-SHA review pending.

## Baseline and inputs
Start 84eb6dff5e9d3238c3e651525b6ed28412132549; parent 346902461c3fd1f01ec88132d4d2e7c3ef1d50bd;
tree 327e3474a3f6b90d156f6e34dbbcc0288f7efe87. Clean worktree/index.
Created feature/residence-content-supply-session-001 from that exact commit.
Actual npm run test:run: exit 0, 169 files / 3494 tests, 93.43s (19:24:55 start).
Raw log is outside repository in the temporary input directory recorded in final verification.
All four supplied SHA256SUMS entries matched before implementation; all five raw inputs preserved.

## Design before implementation
- Explicit supply barrels, existing domain registry shared unchanged with v1/v2.
- Composition captures synchronous ports and controlled policy; validate before domain claim.
- One private current SupplyValue. Immutable initial identity/execution anchor is not another gameplay owner.
- First eligibility requires explicit first startup plus an actual null read. Initial materials produce
  independent expected before calling the real P initial producer. No arbitrary aggregate factory.
- Existing startup supplies independent expected through a zero-argument callback, before R decode.
  Nonempty storage is sticky evidence against future first-create even after a later null read.
- Strict namespaced commands delegate existing P producers. Policy dependencies are reused by identity.
- Original plan authentication precedes expected construction. Death consumes the original issued
  plan and commits only final dead; live combat-required results remain unsupported.
- Complete R validation and serialization precede one current replacement, write attempt and
  listener batch. Retry only encodes/writes latest current. Busy encloses all callbacks.
- Existing sources/tests/configs are read-only. Four shared documents will receive append-only notes.
- W01 remains limited to the seven historical input hard-breaks; every S increment must be clean.

## Implementation and self-review

The explicit supply entry now wraps the existing P producers and R validator/codec.
No existing source or test file was changed. The unused supply-context.ts slot was not created.
All ordinary command families use the same authenticated-plan and preencoded commit boundary.
The original death plan is consumed once, before installation, including HP0 plus pending combat.
Live pending is rejected by the unchanged R support matrix; no enemy removal or combat bypass.

The startup guard was tightened during self-review: malformed non-string reads are not absence,
and already-known active/closed/nonfirst-clock materials cannot later reopen first-create.
Tests cover both sticky facts and callback exceptions that legitimately allow another attempt.
Initial expected precedes the actual P producer; cold expected is a zero-argument external provider.
No parsed save or initial origin is passed to that provider to generate its own expectation.

Six medical and four maintenance families use actual qualified targets and parameterized costs.
New legal fixture corrections used real fire-door prerequisites, food quantities and catalog IDs;
production rules were not weakened to make tests pass. P itself already rejects locked-specialty
tampering, and that actual INVALID_INPUT is reported rather than manufacturing a later mismatch.

Validation and retry semantic negative controls are injected through Vitest spies in new tests.
The actual R validator rejects corrupted balance before commit; armed gameplay replay traps
remain untouched during successful retrySave. There is no production test-only post-state input.

## Final local evidence

New targeted suite: 10 files / 127 tests PASS.
Required mixed P/R/A/B/C/session regression: 60 files / 1043 tests PASS.
Separate old P: 14 files / 91 tests; old R: 8 / 129 (including R1 22);
old B/C: 14 / 327, all PASS and original files unchanged.
Full npm run check: architecture 52 DEC / 289 core production files; typecheck;
179 files / 3621 tests; production build, all PASS. Existing large-chunk advisory remains.
Added tests 127, replaced/deleted 0. Per-branch counters and actual command timing/exit codes
are in verification-results.json; original reporter logs remain outside the allowed repository paths.

All four shared documents preserve their original byte prefixes, with only an E01-S appendix.
The five supplied files match original bytes. New changes have no whitespace exception.
Cumulative comparison to 8c19ca0 retains precisely the approved seven original W01 hard breaks.
Browser storage, multi-tab, UI, CTB, Owner playtest and E02/E03 are not implemented or run here.
O3 remains undecided. This branch stops for mainline exact-SHA review after ordinary commit/push.
