"""004 affected files only: sources, links, frozen finite evidence and scope. No production execution."""
import ast, collections, hashlib, json, re, subprocess, sys
from pathlib import Path
B=Path(__file__).resolve().parents[1]
ROOT=B.parents[2]
PREFIX=B.relative_to(ROOT).as_posix()+"/"
BASE="25e420ed9f36f1bf2acfbb0d96e3a798fbdd6bf8"
MD=[f"{i:02}-{name}.md" for i,name in enumerate(("world-overview","seven-day-structure","location-design","main-mission","resource-economy","event-pack","enemy-continuity","balance-budget","design-critic","decision-queue","points-hub-recovery"),1)]
MD+=["reviews/endgame-candidates-v1.1.md","evidence/README.md","evidence/fixes-v1.4.md","WORLD-DESIGN-004-completion.md"]
MD += ["readiness/"+n for n in ("01-current-baseline-and-adoption.md","02-source-gap-and-ownership.md","03-first-engineering-contract-draft.md","04-evidence-and-playtest-gates.md")]
EXTRA=["evidence/"+n for n in ("check_design.py","checks_v1_4.py","parameters.json","expected-v1.4.json","fixtures-v1.4.json","first-run-v1.4.json","metadata-v1.4.json","results-v1.4.json","witnesses-v1.4.jsonl","migration-v1.3-v1.4.json")]
EXTRA+=["reviews/"+n for n in ("check_readiness.py","package-check-world-design-004.json","reproduction-results-world-design-004.json","input-world-design-004/manifest.json","input-world-design-004/WORLD-DESIGN-004-task.md","input-world-design-004/AUD-25e420e-WORLD-DESIGN-003D-review-v1.0.md")]
ALLOWED=set(MD+EXTRA)
checks=[]
def check(name,ok,detail=None):
    checks.append(dict(id=name,passed=bool(ok),detail=detail))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(n):return json.loads((B/n).read_text(encoding="utf-8-sig"))
def git(*args):
    return subprocess.check_output(["git",*args],cwd=ROOT).decode("utf-8")
def anchors(p):
    text=p.read_text(encoding="utf-8-sig")
    found=set(re.findall(r'<a\s+id="([^"]+)"',text));seen={}
    for line in text.splitlines():
        if not re.match(r"^#{1,6} ",line):continue
        head=re.sub(r"^#+ ","",line).strip()
        head=re.sub(r"\[([^]]+)\]\([^)]+\)",r"\1",head).lower()
        head=re.sub(r"[^\w\- ]","",head).replace(" ","-")
        index=seen.get(head,0);seen[head]=index+1
        found.add(head+(f"-{index}" if index else ""))
    return found
check("baseline_is_ancestor",subprocess.run(["git","merge-base","--is-ancestor",BASE,"HEAD"],cwd=ROOT).returncode==0)
check("branch",git("branch","--show-current").strip()=="feature/design-world-infected-world-001")
changed=set(filter(None,git("diff","--name-only",BASE,"--").splitlines()))
changed.update(filter(None,git("ls-files","--others","--exclude-standard").splitlines()))
check("task_whitelist",all(x.startswith(PREFIX) and x[len(PREFIX):] in ALLOWED for x in changed),sorted(changed))
encoding_errors=[];missing=[]
for name in sorted(ALLOWED):
    p=B/name
    if name=="reviews/package-check-world-design-004.json":continue
    if not p.exists():missing.append(name);continue
    try:
        text=p.read_bytes().decode("utf-8-sig")
        if "\ufffd" in text:encoding_errors.append(name+":replacement character")
        if "input-world-design-004/" not in name and p.read_bytes().startswith(b"\xef\xbb\xbf"):encoding_errors.append(name+":BOM")
        if p.suffix==".json":json.loads(text)
        if p.suffix==".jsonl":
            for line in text.splitlines():json.loads(line)
        if p.suffix==".py":ast.parse(text)
    except (UnicodeError,ValueError,SyntaxError) as exc:encoding_errors.append(name+":"+str(exc))
check("required_files",not missing,missing)
check("utf8_and_parse",not encoding_errors,encoding_errors)
broken=[];link_count=0
for name in MD:
    p=B/name
    if not p.exists():continue
    for dest in re.findall(r"\]\(([^)]+)\)",p.read_text(encoding="utf-8-sig")):
        dest=dest.strip("<>")
        if re.match(r"^[a-z]+://",dest) or dest.startswith("mailto:"):continue
        path,sep,anchor=dest.partition("#")
        target=(p.parent/path).resolve() if path else p
        link_count+=1
        if not target.exists():broken.append([name,dest,"missing file"])
        elif sep and target.suffix==".md" and anchor not in anchors(target):broken.append([name,dest,"missing anchor"])
check("affected_markdown_links",not broken,{"links":link_count,"broken":broken})
lengths={p.name:len(p.read_text(encoding="utf-8").splitlines()) for p in (B/"readiness").glob("*.md")}
check("readiness_under_800_lines",sum(lengths.values())<=800,lengths)
manifest=read("reviews/input-world-design-004/manifest.json")
check("archives_match_input_sha",all(sha(B/x["archive_path"])==x["sha256"] for x in manifest["source_inputs"]),manifest["source_inputs"])
check("historical_bytes_unchanged",all(sha(B/x["path"])==x["sha256"] for x in manifest["unchanged_historical_evidence"]))
meta=read("evidence/metadata-v1.4.json");runs=read("reviews/reproduction-results-world-design-004.json")
actual_inputs={n:sha(B/"evidence"/n) for n in meta["inputs"]}
actual_outputs={n:sha(B/"evidence"/n) for n in meta["outputs"]}
check("frozen_inputs_unchanged",actual_inputs==meta["inputs"]==runs["frozen_input_sha256"])
check("two_independent_processes",len(runs["runs"])==2 and all(r["exit_code"]==0 and r["inputs_before"]==r["inputs_after"]==actual_inputs and r["outputs"]==actual_outputs for r in runs["runs"]))
results=read("evidence/results-v1.4.json")
canonical=hashlib.sha256(json.dumps(results["results"],ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
check("stable_bytes_and_canonical",actual_outputs==meta["outputs"] and all(r["canonical_results_sha256"]==canonical for r in runs["runs"]) and meta["canonical_results_sha256"]==canonical)
counts=results["counts"]
check("finite_classification",counts=={"positive":84,"expected_rejection":85,"unsupported":1,"total":170,"matched":170,"mismatched":0} and sum(x["classification"]=="unsupported" for x in results["results"])==1,counts)
old=read("evidence/raw-results.json");migration=read("evidence/migration-v1.3-v1.4.json")
oldids={x["id"] for k in ("scenarios","sensitivity","joint") for x in old[k]}
ids={x["id"] for x in results["results"]}
check("old_269_mapped_once",len(migration["cases"])==269 and {x["old_id"] for x in migration["cases"]}==oldids and all(set(x["current_ids"])<=ids for x in migration["cases"]),migration["migration_counts"])
first=read("evidence/first-run-v1.4.json")
check("first_failure_preserved",first["counts"]["mismatched"]==10 and first["counts"]["total"]==156 and len(first["failures"])==10)
check("default_one_real_commission",list(read("evidence/parameters.json")["offered_tasks"])==["CURRENT"])
# Git check is actually executed; staging has a separate final check at commit time.
proc=subprocess.run(["git","diff","--check"],cwd=ROOT,text=True,capture_output=True,encoding="utf-8")
check("git_diff_check",proc.returncode==0,proc.stdout+proc.stderr)
output={"task":"WORLD-DESIGN-004","scope":"Only affected current Markdown, declared inputs, finite outputs and Git whitelist; not a whole historical-package or production test run.","checks":checks,"passed":sum(x["passed"] for x in checks),"failed":sum(not x["passed"] for x in checks),"production_tests":"NOT RUN","added_production_tests":0}
(B/"reviews/package-check-world-design-004.json").write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
print(json.dumps({"passed":output["passed"],"failed":output["failed"],"failures":[x for x in checks if not x["passed"]]},ensure_ascii=False,indent=2))
sys.exit(1 if output["failed"] else 0)
