# E01-R implementation notes

## W1 design before implementation

Baseline: `8c19ca0d28058cf743b41c8547cc2629c8eac767`; clean index/worktree; new branch `feature/residence-content-supply-restore-001`.
Actual baseline: 161 files / 3365 tests PASS (94.99 s). Input ZIP and all five payload hashes verified before implementation.

The v3 envelope contains only format, formatVersion and the validated SupplyValue. Its version/identity/configuration/content/declaration bindings are checked against a separately issued controlled policy and mandatory independent expectation. They are not duplicated as editable gameplay state.

Policy owns fixed dependency handles, not current state. Every encode/decode/validation call requires independent phase, character identity, revision, cycle, mission expectations and an initial mission/execution binding. In particular the first-hub execution is supplied externally; no origin is used to manufacture expected. Same-progress restore additionally compares an independently supplied complete committed SupplyValue. Cold consistency alone does not authenticate an offline history.

Decode order: strict JSON-shaped envelope/header first; then require issued policy and parse exact independent expectation; E01-P readSupplyValue (all existing provenance/history validators); phase/expected bindings; extra stable-boundary/history relationships. Encode starts directly at policy/expected validation and only stringifies the validated aggregate. No producer, authority issuance, current, storage, notification or rules replay is involved. Pure consistency arithmetic and deterministic ID verification are not gameplay re-execution.

Independent supply-index/supply-controlled leave v1/v2 and G4/C consumers untouched. Four phases are supported; living active pending combat is rejected, not cleared. Frozen candidates carry no SupplyAuthority or installation permission.

## Input whitespace evidence

Original task lines 7-9 and review lines 3-6 contain seven Markdown hard-break trailing spaces. Raw-byte archive hashes take precedence over silently editing input evidence. Native no-index checks report these exact locations; ordinary production/report changes will be checked separately. No git whitespace setting or attribute is changed, and the full check result will not be labelled PASS if these warnings remain.

## W2-W4 implementation and self-review

Nine production files implement the issued dependency policy, strict external expectation, envelope/schema, actual P aggregate reuse, passive history constraints, same-progress comparison and separate exports. Seven new test files and one TEST-only fixture file are isolated from runtime.

Self-review added: a real G2 movement death roundtrip (no extra revision); actual deadline infection/hunger deaths; malformed/empty/reordered death checkpoints; lost bleeding qualification or primary exposure; monotone recorded infection/satiety and configured completed reset; per-execution ownership chronology, including dispositions. These checks compare stored relationships, not a second body or terminal producer. Old P/G1/G2/A/B/C production and all old tests remain unchanged.

First-hub counterexample is executed through real initial producers with two external seeds. Expected is held separately; the candidate's initial origins do not choose it. Same-progress comparison additionally rejects an otherwise internally valid body edit. All four phases reject changed independent bindings.

Final targeted run: 7 files / 107 tests. Original P: 14 / 91. Original B/C: 14 / 327. Full npm run check: 168 / 3472, architecture 52 DEC / 289 core files, typecheck/build PASS. The existing large-bundle advisory was not suppressed. Added 107 tests, replaced/deleted 0.

All 29 watched producer/authority/RNG functions, injected draw, jsdom Storage read/write and event dispatch remain at zero for each of 12 pure-operation cases. Fixture production runs before spies; authority misuse rejection is tested after the zero counts. Real Storage, current installation and browser/Owner acceptance are NOT RUN/out of scope, not inferred from these tests.

The four shared docs receive append-only status updates; their original byte prefixes and the five raw input files are checked. Logs remain in the outside-repository input temp directory and are hashed in verification-results.json. No log, extra source path, dependency or threshold is added to get a check to pass.
