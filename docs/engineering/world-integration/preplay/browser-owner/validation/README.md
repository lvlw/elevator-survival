# TEST-only real browser validation

Not a game entry. Not in App/main or the public build. Run only in a newly created temporary profile; never use an Owner profile or saved game. Uses installed Edge, Node built-ins and existing Vite, without package installation.

From repository root: `node docs/engineering/world-integration/preplay/browser-owner/validation/run-browser-checks.mjs <absolute-output-directory-outside-repo>`. Optional `BROWSER_OWNER_TEST_EXE` selects an already installed Chromium executable. Diagnostic-only `BROWSER_OWNER_CASE_FILTER` must be absent for the full run; filtered cases record NOT RUN.

Runner verifies external output, creates one temporary profile, its own local Vite process and CDP connection; same default browser context creates competing tabs and a same-origin iframe. Only its own browser is closed. No arbitrary process kill, system shutdown, download or dependency install. TEST cleanup removes exactly the two new-world keys in its private profile, never storage.clear; the actual legacy hospital key is a sentinel retained unchanged. Production exposes no cleanup or raw-storage API.

The TEST page uses real localStorage and navigator.locks; quota/read/write faults are injected port exceptions, not actual OS failures. Boundary-record creation imports TEST-only genuine P fixtures, independently prepares expected before candidate serialization and labels low-HP/bleeding material. True A/B routes start at real absent records, use public selectors/controller/S, seeded default RNG and real production; no cleared enemy, hand completion, grant, current replacement or RNG override. A uses three actual battles and explicit sample placement. B uses immediate repair and medical after actual retreat.

Reports distinguish initial/continuing/cold IO, entropy and Presentation updates. Native S/producer/current/notice/pay counters come from separate source spies in new unit/combination tests, not inferred from DOM. Crashed renderer is proven by targetCrashed events; release can lag, so runner makes explicit non-queued acquire attempts and records each. Actual BFCache persisted=true vs simulated tests vs NOT RUN are separated. Screenshots are actual TEST-state captures, not low-asset UI acceptance.

Final evidence: `C:/Users/zjl/AppData/Local/Temp/browser-owner-work-94d649668b8843f885d8dc007a2f17d2/browser-final-2`; 9 groups PASS, Edge Edg/155.0.4283.62, four PNGs, zero page Runtime.exceptionThrown, two expected crash protocol events. Browser-1 route death, browser-2 300ms crash assumption failure, diagnostic and intermediate runs remain outside repo. Full [author evidence](../verification-results.json).

## T02 output boundary follow-up (ENG-WORLD-LOW-ASSET-UI-001)

The output preflight now delegates to the reviewed [T01 filesystem guard](../../../../../design-drafts/world-infected-001/entry-006/validation/output-path-guard.mjs) before any directory, log, profile or process creation. Immediately after creating the output directory, the runner rechecks its real location before creating its private browser profile. Existing browser cases, assertions, result handling and historical nine-group evidence are unchanged.

The [standalone boundary regression](../../low-asset-ui/validation/check-output-boundary.mjs) uses external fixtures only, including a native Windows junction back into a stand-in repository. It separates native filesystem evidence, pure path calculations and injected permission failures. Resolution failures fail closed; this is not an operating-system sandbox against hostile concurrent link replacement. T02 does not count as a new gameplay test.
