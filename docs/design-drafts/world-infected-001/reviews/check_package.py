"""WORLD-DESIGN-003 package checks, Python standard library only.

Read-only Git and inputs. Writes one JSON result beside this script. It does
not run production code, simulate gameplay, or validate external web links.
Historical ZIP entries keep their original bytes and are fingerprint-checked;
their old prose links are deliberately not treated as v1.3 specification links.
"""
from pathlib import Path
import argparse
import hashlib
import io
import zipfile
import json
import re
import subprocess
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
START = "196d4bf03b07eb9af452ff99aae4ff553f9659d6"
LEGACY_START = "697ed7ae010bbdfcc70aa0eb152d045f283d3606"
MAIN = "a76e9c1c998051fc1643b6e0c3d53443fa55feed"
BRANCH = "feature/design-world-infected-world-001"
PREFIX = "docs/design-drafts/world-infected-001/"
ENTRIES = [
    "01-world-overview.md", "02-seven-day-structure.md", "03-location-design.md",
    "04-main-mission.md", "05-resource-economy.md", "06-event-pack.md",
    "07-enemy-continuity.md", "08-balance-budget.md", "09-design-critic.md",
    "10-decision-queue.md", "11-points-hub-recovery.md",
]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--skip-external-inputs', action='store_true', help='Review copy only: skip original files in the author download directory; do not count them as passed')
args = parser.parse_args()
checks = []
skipped = []

def record(name, passed, detail):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})

def git(*args):
    result = subprocess.run(["git", "-c", "core.quotepath=false", *args], cwd=REPO,
                            capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "git returned nonzero")
    return result.stdout.strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def current(path):
    return not any(part.startswith("input-") or part in {"v1.1-baseline", "v1.2-baseline"} for part in path.parts) and path.name not in {"WORLD-DESIGN-001-completion.md", "WORLD-DESIGN-001R-completion.md", "WORLD-DESIGN-002-completion.md", "reference-use-world-design-002.md", "owner-direction-world-design-002.md"}

def slug(title):
    title = re.sub(r"[`*_~]", "", title.strip().lower())
    title = re.sub(r"[^\w\s\-\u3400-\u9fff]", "", title)
    return re.sub(r"\s", "-", title)

def anchors(text):
    result = set(re.findall(r'<a\s+id=["\']([^"\']+)["\']', text))
    seen = {}
    for title in re.findall(r"^#{1,6}\s+(.+)$", text, re.M):
        key = slug(title)
        index = seen.get(key, 0)
        result.add(key if not index else f"{key}-{index}")
        seen[key] = index + 1
    return result

for filename in ENTRIES:
    path = ROOT / filename
    body = path.read_text(encoding="utf-8") if path.exists() else ""
    record("entry:" + filename, path.is_file() and "v1.3" in body[:1000],
           "Entry exists and identifies the current draft version")

manifest = json.loads((ROOT / "reviews/input-manifest.json").read_text(encoding="utf-8"))
for item in manifest["archived_entries"]:
    path = ROOT / "reviews" / item["path"]
    record("archive:" + item["path"], path.is_file() and sha(path) == item["sha256"]
           and path.stat().st_size == item["bytes"], "Original byte length and SHA-256")
for item in manifest["input_files"]:
    if args.skip_external_inputs:
        skipped.append({'name': 'external-input:' + item['path'], 'reason': 'Explicit review-copy mode'})
        continue
    path = Path(item["path"])
    record("external-input:" + path.name, path.is_file() and sha(path) == item["sha256"],
           "Read-only original input SHA-256; no external upload")
original_manifest = json.loads((ROOT / "reviews/input-61de1a1/manifest.json").read_text(encoding="utf-8"))
for item in original_manifest["files"]:
    path = ROOT / "reviews/input-61de1a1" / item["path"]
    record("review-manifest:" + item["path"], sha(path) == item["sha256"],
           "Matches the independent review's own manifest")

# Historical 002 pack and archives retain their bytes and fingerprints.
current_manifest = json.loads((ROOT / "reviews/input-manifest-world-design-002.json").read_text(encoding="utf-8"))
for item in current_manifest["archived_entries"]:
    path = ROOT / item["path"]
    record("current-archive:" + item["path"], path.is_file() and sha(path) == item["sha256"]
           and path.stat().st_size == item["bytes"], "Exact original bytes; not promoted to formal rules")
review_manifest = json.loads((ROOT / "reviews/input-697ed7a/review/manifest.json").read_text(encoding="utf-8"))
for item in review_manifest["files"]:
    path = ROOT / "reviews/input-697ed7a/review" / item["path"]
    record("current-review-manifest:" + item["path"], path.is_file() and sha(path) == item["sha256"]
           and path.stat().st_size == item["bytes"], "Independent review manifest")
outer_manifest = json.loads((ROOT / "reviews/input-697ed7a/manifest.json").read_text(encoding="utf-8"))
record("current-manifest-crosscheck", outer_manifest["payload_files"] == current_manifest["payload_verified"],
       "Nine payload identities match the original manifest; receipt is not its own source")
if args.skip_external_inputs:
    skipped.append({"name": "current-pack-and-nested-payloads", "reason": "Explicit review-copy mode; exact local archive copies still checked"})
else:
    pack = Path(current_manifest["pack_path"])
    record("current-pack-sha256", pack.is_file() and sha(pack) == current_manifest["pack_sha256"], current_manifest["pack_sha256"])
    if pack.is_file():
        with zipfile.ZipFile(pack) as archive:
            record("current-pack-crc", archive.testzip() is None, "All outer payload CRCs")
            for item in outer_manifest["payload_files"]:
                data = archive.read(item["path"])
                record("current-payload:" + item["path"], len(data) == item["bytes"] and hashlib.sha256(data).hexdigest() == item["sha256"],
                       "Read from original ZIP; no extraction or source upload")
            with zipfile.ZipFile(io.BytesIO(archive.read("inputs/WORLD-DESIGN-001R-review-697ed7a.zip"))) as nested:
                record("nested-review-crc", nested.testzip() is None, "All review payload CRCs")
            with zipfile.ZipFile(io.BytesIO(archive.read("reference/无限恐怖参考资料整理集合_v1.0.zip"))) as research:
                record("nested-reference-crc", research.testzip() is None, "All reference payload CRCs")
                for item in current_manifest["reference_internal_verified"]:
                    data = research.read(item["path"])
                    record("reference-payload:" + item["path"], hashlib.sha256(data).hexdigest() == item["sha256"], "Original internal source SHA-256")
# Current 003 originals: root payloads and embedded review retain exact bytes.
manifest003 = json.loads((ROOT / "reviews/input-manifest-world-design-003.json").read_text(encoding="utf-8"))
archive003 = ROOT / "reviews/input-196d4bf"
for item in manifest003["raw_archive_entries"]:
    path = REPO / item["archive_path"]
    record("003-archive:" + item["pack_path"], path.is_file() and sha(path) == item["sha256"]
           and path.stat().st_size == item["bytes"], "Exact input bytes, not current specification")
root003 = json.loads((archive003 / "manifest.json").read_text(encoding="utf-8"))
for item in root003["files"]:
    path = archive003 / item["path"]
    record("003-source-manifest:" + item["path"], sha(path) == item["sha256"] and path.stat().st_size == item["bytes"], "Matches independently supplied manifest")
inner003 = json.loads((archive003 / "inputs/review-196d4bf/manifest.json").read_text(encoding="utf-8"))
for item in inner003["files"]:
    path = archive003 / "inputs/review-196d4bf" / item["name"]
    record("003-review-manifest:" + item["name"], sha(path) == item["sha256"] and path.stat().st_size == item["bytes"], "Original six review payloads")
if args.skip_external_inputs:
    skipped.append({"name": "003-original-ZIP", "reason": "Review-copy mode; archived originals still verified"})
else:
    pack003 = Path(manifest003["source_zip"])
    record("003-pack-SHA", pack003.is_file() and sha(pack003) == manifest003["source_zip_sha256"], manifest003["source_zip_sha256"])
    if pack003.is_file():
        with zipfile.ZipFile(pack003) as z:
            record("003-pack-CRC", z.testzip() is None, "All 13 original entries")
            record("003-pack-exact-archive", all(z.read(i["pack_path"]) == (REPO / i["archive_path"]).read_bytes() for i in manifest003["raw_archive_entries"]), "All raw byte copies equal original ZIP entries")
record("reference-archive-not-copied", not list(ROOT.rglob("*.zip")), "No full research/input ZIP stored in design deliverable")
terminal = ROOT / "reviews/endgame-candidates-v1.1.md"
record("single-current-terminal", terminal.is_file() and "v1.3" in terminal.read_text(encoding="utf-8")[:1000]
       and len(list((ROOT / "reviews").glob("endgame-candidates-*.md"))) == 1,
       "Stable v1.1 filename, one current v1.3 body")

# Evidence integrity and identity checks are independent of model success counts.
try:
    evidence = ROOT / "evidence"
    model_result = json.loads((evidence / "raw-results.json").read_text(encoding="utf-8"))
    metadata = json.loads((evidence / "execution-metadata.json").read_text(encoding="utf-8"))
    all_results = model_result["scenarios"] + model_result["sensitivity"] + model_result["joint"]
    ids = [entry["id"] for entry in all_results]
    record("evidence-result-unique-ids", len(ids) == len(set(ids)), {"total": len(ids), "unique": len(set(ids))})
    for filename, expected_sha in metadata["input_sha256"].items():
        record("evidence-current-input-sha:" + filename, sha(evidence / filename) == expected_sha,
               "Current result must describe the actual current input/script bytes")
    reproduction = json.loads((ROOT / "reviews/reproduction-results-world-design-003.json").read_text(encoding="utf-8"))
    runs = reproduction["runs"]
    record("two-final-reproductions", len(runs) == 2 and all(r["exit_code"] == 0 for r in runs)
           and runs[0]["output_sha256"] == runs[1]["output_sha256"]
           and reproduction["input_sha256"] == metadata["input_sha256"],
           "Root stored two actual final runs; same interpreter bytes; not additional gameplay cases")
    for filename, expected_sha in reproduction["output_sha256"].items():
        record("evidence-output-sha:" + filename, sha(evidence / filename) == expected_sha,
               "Checked-in result bytes equal the independently reproduced outputs")
    canonical = json.dumps({k:model_result[k] for k in ("scenarios","sensitivity","joint")}, ensure_ascii=False, sort_keys=True, separators=(",",":")).encode("utf-8")
    canonical_sha = hashlib.sha256(canonical).hexdigest()
    record("stable-canonical-game-results", canonical_sha == metadata["canonical_results_sha256"] == reproduction["canonical_results_sha256"]
           and all(r["canonical_results_sha256"] == canonical_sha for r in runs),
           "Independently normalized gameplay result hash, excluding runtime metadata")
    old_specs = json.loads((evidence / "v1.1-baseline/scenarios.json").read_text(encoding="utf-8"))
    old_ids = {entry["id"] for entry in old_specs["scenarios"] + old_specs["sensitivity"]}
    mapping = json.loads((evidence / "inheritance-map.json").read_text(encoding="utf-8"))
    rows = mapping["mapping"]
    record("inherited-57-exhaustive-map", len(old_ids) == 57 == mapping["old_count"] == len(rows)
           and {r["v1_1_id"] for r in rows} == old_ids
           and all(r["v1_2_id"] in ids and r["disposition"] for r in rows),
           "Every original scenario and sensitivity case is mapped to an actual current result")
    baseline = json.loads((evidence / "v1.1-baseline/manifest-summary.json").read_text(encoding="utf-8"))
    for filename in ("check_design.py", "parameters.json", "scenarios.json"):
        expected = baseline["original_files"][filename]
        local = evidence / "v1.1-baseline" / filename
        blob = subprocess.run(["git", "show", LEGACY_START + ":" + PREFIX + "evidence/" + filename], cwd=REPO, capture_output=True, check=True).stdout
        record("historical-small-snapshot:" + filename,
               hashlib.sha256(blob).hexdigest() == expected["sha256"] == sha(local)
               and len(blob) == expected["bytes"] == local.stat().st_size,
               "Exact historical 697ed7a bytes, not reconstructed new expectations")
    historical12 = json.loads((evidence / "v1.2-baseline/manifest-summary.json").read_text(encoding="utf-8"))
    for filename, info in historical12["files"].items():
        blob = subprocess.run(["git", "show", START + ":" + PREFIX + "evidence/" + filename], cwd=REPO, capture_output=True, check=True).stdout
        record("v1.2-git-history:" + filename, hashlib.sha256(blob).hexdigest() == info["sha256"] and len(blob) == info["bytes"], "Pinned historical bytes; large outputs recovered with git show, not duplicated")
        if filename == "parameters.json":
            snapshot = evidence / "v1.2-baseline" / filename
            record("v1.2-local-parameter-snapshot", snapshot.read_bytes() == blob,
                   "Small local parameter copy equals pinned 196d4bf Git bytes")
    migration13 = json.loads((evidence / "inheritance-v1.2-v1.3.json").read_text(encoding="utf-8"))
    previous_ids = {entry["id"] for entry in historical12["cases"]}
    rows13 = migration13["mapping"]
    record("v1.2-171-exhaustive-migration", len(previous_ids) == len(rows13) == migration13["old_count"] == 171
           and {row["v1_2_id"] for row in rows13} == previous_ids
           and all(row["disposition"] and (row.get("v1_3_id") in ids or row["disposition"].lower().startswith("deleted")) for row in rows13),
           "All 171 previous cases carry an explicit disposition and current target; no negative case silently removed")
    record("stable-result-metadata-separated", "python" not in model_result and "input_sha256" not in model_result
           and metadata["stable_output_sha256"] == reproduction["output_sha256"],
           "Stable output hashes are separate from interpreter/input provenance")
    counted = {label: sum(entry["classification"] == label for entry in all_results)
               for label in ("positive", "expected_rejection", "unsupported")}
    record("evidence-counts-separated", all(model_result["counts"][label] == value for label, value in counted.items())
           and sum(counted.values()) == len(all_results), counted)
    record("no-python-cache-or-temporary-archive", not list(ROOT.rglob("*.pyc")) and not list(ROOT.rglob("__pycache__")),
           "Design deliverable contains no bytecode cache")
except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
    record("evidence-integrity-execution", False, str(exc))

link_count = 0
broken = []
active_md = [p for p in ROOT.rglob("*.md") if current(p)]
for path in active_md:
    body = path.read_text(encoding="utf-8")
    for target in re.findall(r"!?\[[^\]\n]*\]\(([^)\n]+)\)", body):
        target = target.strip().strip("<>")
        if re.match(r"(?:https?://|mailto:)", target):
            continue
        target = unquote(target)
        filepart, _, anchor = target.partition("#")
        dest = (path.parent / filepart).resolve() if filepart else path
        link_count += 1
        if not dest.exists():
            broken.append({"file": path.relative_to(ROOT).as_posix(), "target": target,
                           "reason": "missing local target"})
        elif anchor and dest.suffix.lower() == ".md":
            if anchor not in anchors(dest.read_text(encoding="utf-8")):
                broken.append({"file": path.relative_to(ROOT).as_posix(), "target": target,
                               "reason": "missing explicit or generated heading anchor"})
record("local-links-and-anchors", not broken, {"count": link_count, "broken": broken,
       "historical_inputs": "Raw input archives, versioned baselines and 001/001R/002 completion and 002 adoption/reference reports excluded from current-link checks; archived inputs fingerprint checked"})

fields = ["事件名", "触发条件", "玩家已知", "真实状态", "选项", "成本", "结果", "后续影响", "状态标记"]
events = []
for section in re.split(r"(?m)^## ", (ROOT / "06-event-pack.md").read_text(encoding="utf-8")):
    if not re.search(r"^\|\s*事件名\s*\|", section, re.M):
        continue
    title = section.splitlines()[0]
    counts = {field: len(re.findall(r"^\|\s*" + re.escape(field) + r"\s*\|", section, re.M))
              for field in fields}
    events.append(title)
    record("event-fields:" + title, all(v == 1 for v in counts.values()), counts)
record("unique-event-sections", bool(events) and len(events) == len(set(events)),
       {"events": len(events), "fixed_event_count_is_not_a_design_quality_metric": True})

bad_text = []
for path in active_md:
    raw = path.read_bytes()
    body = raw.decode("utf-8")
    if raw.startswith(b"\xef\xbb\xbf") or b"\r\n" in raw or not raw.endswith(b"\n"):
        bad_text.append(path.relative_to(ROOT).as_posix())
    if re.search(r"^#{1,3}\s+DEC-\d{3}[：:]", body, re.M):
        bad_text.append(path.relative_to(ROOT).as_posix() + ": new DEC heading")
record("active-markdown-encoding-and-no-new-dec", not bad_text, bad_text)

try:
    record("branch", git("branch", "--show-current") == BRANCH, BRANCH)
    record("main-baseline", git("rev-parse", "main") == MAIN, MAIN)
    git("merge-base", "--is-ancestor", START, "HEAD")
    record("starting-commit-is-ancestor", True, START)
    files = set(filter(None, git("diff", "--name-only", START, "--").splitlines()))
    files.update(filter(None, git("diff", "--cached", "--name-only").splitlines()))
    files.update(filter(None, git("ls-files", "--others", "--exclude-standard").splitlines()))
    illegal = sorted(p for p in files if not p.startswith(PREFIX))
    record("path-allow-list", not illegal, {"files": sorted(files), "outside": illegal})
    original_entry = PREFIX + "reviews/input-697ed7a/00-START-HERE.md"
    excluded_original = ":(exclude)" + original_entry
    git("diff", "--check", START, "--", ".", excluded_original)
    git("diff", "--cached", "--check", "--", ".", excluded_original)
    git("-c", "core.whitespace=-blank-at-eol", "diff", "--check", START, "--", original_entry)
    git("-c", "core.whitespace=-blank-at-eol", "diff", "--cached", "--check", "--", original_entry)
    record("git-diff-check", True, {"authored_files": "Strict working and staged diff checks passed",
           "only_exception": original_entry,
           "reason": "Original attachment lines 5/6/7 contain Markdown double-space hard breaks; exact original SHA and bytes checked above; only blank-at-eol disabled for that file, no Git configuration changed"})
except RuntimeError as exc:
    record("git-check-execution", False, str(exc))

result = {
    "task": "WORLD-DESIGN-003",
    "kind": "Package/link/input/Git scope checks; not gameplay verification",
    "external_input_mode": "SKIPPED_BY_REQUEST" if args.skip_external_inputs else "FULL_ORIGINAL_PACK",
    "starting_sha": START,
    "checks": checks,
    "skipped": skipped,
    "checks_count": len(checks),
    "passed": sum(c["passed"] for c in checks),
    "failed": sum(not c["passed"] for c in checks),
    "not_checked": ["external web links", "production gameplay/tests/build/browser",
                    "save and restore transactions", "Owner experience"],
}
output = ROOT / "reviews/package-check-results.json"
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"checks": result["checks_count"], "passed": result["passed"],
                  "failed": result["failed"], "local_links": link_count,
                  "output": output.relative_to(ROOT).as_posix()}, ensure_ascii=False))
for entry in checks:
    if not entry["passed"]:
        print(json.dumps(entry, ensure_ascii=False))
sys.exit(1 if result["failed"] else 0)
