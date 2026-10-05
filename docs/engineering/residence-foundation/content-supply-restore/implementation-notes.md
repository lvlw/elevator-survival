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

## R1 actual reproduction and narrow repair (2026-10-05)

Start HEAD 346902461c3fd1f01ec88132d4d2e7c3ef1d50bd, same feature/residence-content-supply-restore-001 branch, clean worktree/index. Actual baseline npm run test:run: 168 files / 3472 tests, exit 0, 18:29:57, 102.64 s. Read the ten payload files and verified the nine entries of SHA256SUMS before production edits. Original AGENTS, DEC-049 through DEC-052, relevant GDD/VS/Architecture/content and actual G1/G2/P/A/v3 boundaries were reread.

The byte-identical supplied native template ran first: 13 cases, 4 failed / 9 passed, exit 1, 18:32:24. Each F01 mutation passed P self-consistency and all three v3 aggregate/serialize/deserialize seams returned ACCEPTED. There was no template import/type adaptation, no fabricated failure and no initial production edit. Supplied mainline isolation evidence is separate; isolate-history.cjs was NOT RUN locally (not needed; native repository execution is the proof).

Production repair adds only stored-fact/configuration comparisons in supply-history.ts: clipped configured bleeding magnitude and historical local-rest qualification. Self-review also rejects a live encounter whose pending marker alone was removed. It reads the archived catalog, not current catalog/body; old wound qualification is not reconstructed. No helper module, format, expected, G1/P/A/B/C or old interface changes were necessary.

Unmodified template after repair: 13/13 PASS at 18:38:02. Final expanded suite: 22 cases (13 original cases retained plus 9 focused adjacent cases); original seven v3 test files remain byte-identical. The four native rejections each monitor all three APIs independently: 18 observed producer/RNG/IO/event functions and the injected draw remain zero, with input/expected unchanged. Original 12 pure-operation cases with 29 function spies also remain unchanged.

Negative controls were copied outside the repository under the task temp directory, with existing node_modules linked for dependencies. First attempts hit EPERM in Vite temporary-cache creation before tests (logs retained; not semantic evidence). Authorized reruns succeeded in starting and failed semantically: removing bleeding checks gives 3 failed / 19 passed; removing rest checks gives 6 failed / 16 passed. All failures are ACCEPTED versus INVALID_STATE assertions, not type/import/crash failures. Mutants never replace repository source and are not staged.

Old P regression: 14 files / 91 PASS. Old B/C: 14 files / 327 PASS. V3 regression: 8 files / 129 PASS, including the untouched 107 originals. Actual full-check and scope/input/whitespace results are recorded in the appended R1 verification object and completion section; historical figures above are not overwritten.

W01 is the explicit exact-file exception in this input package: original task lines 7-9 and original review lines 3-6 only, all raw bytes preserved. Incremental R1 changes must pass with exit 0; cumulative P-to-R1 warnings remain fully disclosed rather than suppressed. No whitespace setting or attributes are changed.
