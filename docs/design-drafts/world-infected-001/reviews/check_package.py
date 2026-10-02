"""WORLD-DESIGN-001R package checks, Python standard library only.

Read-only Git and inputs. Writes one JSON result beside this script. It does
not run production code, simulate gameplay, or validate external web links.
Historical ZIP entries keep their original bytes and are fingerprint-checked;
their old prose links are deliberately not treated as v1.1 specification links.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import subprocess
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
START = "61de1a10e5da12df2f172e18f6e05a69b755bfa8"
MAIN = "a76e9c1c998051fc1643b6e0c3d53443fa55feed"
BRANCH = "feature/design-world-infected-world-001"
PREFIX = "docs/design-drafts/world-infected-001/"
ENTRIES = [
    "01-world-overview.md", "02-seven-day-structure.md", "03-location-design.md",
    "04-main-mission.md", "05-resource-economy.md", "06-event-pack.md",
    "07-enemy-continuity.md", "08-balance-budget.md", "09-design-critic.md",
    "10-decision-queue.md",
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
    return "input-61de1a1" not in path.parts

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
    record("entry:" + filename, path.is_file() and "v1.1" in body[:1000],
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
       "historical_inputs": "Excluded from current-link checks, included in exact-byte checks"})

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
    git("diff", "--check", START, "--")
    git("diff", "--cached", "--check")
    record("git-diff-check", True, "Working and staged diff checks both passed")
except RuntimeError as exc:
    record("git-check-execution", False, str(exc))

result = {
    "task": "WORLD-DESIGN-001R",
    "kind": "Package/link/input/Git scope checks; not gameplay verification",
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
