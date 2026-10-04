"""Finite DESIGN DRAFT model, never imported by production. No geometry, CTB or browser claims."""
import argparse, copy, hashlib, json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
BASE = "7ca547ab8ab4f411d1102a79baf8c0796f4b082c"
SAFE = 9007199254740991
CFG = json.loads((HERE.parent / "config-candidate.json").read_bytes())
P = {k: v["value"] for k, v in CFG["parameters"].items()}
G1 = json.loads((ROOT / "docs/content/infected-residence-core-test-config-v0.1.json").read_bytes())["config"]
NEGATIVE = None

class Reject(Exception):
    pass
class Unsupported(Exception):
    pass
def need(value, code):
    if not value:
        raise Reject(code)
def integer(v, upper=SAFE):
    need(type(v) is int and 0 <= v <= upper, "invalid-number")
def safe_add(a, b):
    integer(a); integer(b); integer(a+b)
    return a+b
def exact(value, keys):
    need(type(value) is dict and set(value) == set(keys), "invalid-fields")
def clone(s):
    return copy.deepcopy(s)
def owner_of(s, iid):
    places = [k for k, ids in s["containers"].items() if iid in ids]
    need(len(places) == 1, "instance-ownership")
    return places[0]
def move_instance(s, iid, dest):
    source = owner_of(s, iid)
    s["containers"][source].remove(iid)
    s["containers"][dest].append(iid)
def current_closure(s):
    return s["closures"][-1] if s["closures"] else None

def validate_closure(c):
    exact(c, ["character","commission","execution","outcome","start","end","day","key"])
    need((c["character"],c["commission"],c["execution"],c["key"]) == ("C","M","E","M/E"), "closure-binding")
    need(c["outcome"] in ("success","voluntary-failure","deadline-failure","death"), "closure-outcome")
    for k in ("start","end","day"): integer(c[k]); need(c[k]>0, "closure-time")
    need(c["day"]<=7 and c["end"]==c["start"]+c["day"]-1, "closure-time")

def _validate_state(s, *, pending_action_death=False):
    exact(s, ["phase","character","revision","D","T","start","clock","body","wallet","declarations","missions",
              "site","instances","itemStates","containers","history","closures","ledger","deathPoint"])
    need(s["phase"] in ("fresh-hub","active-world","living-hub","dead"), "phase")
    need(s["character"] == "C", "root-identity")
    for k in ("revision","D","T","start"):
        integer(s[k]); need(k == "revision" or s[k] > 0, "cycle-zero")
    exact(s["body"], ["hp","bleeding","infection","exposures","food","suppression","energy","quota"])
    for k in ("hp","infection","exposures","food","suppression","energy","quota"):
        integer(s["body"][k])
    need(type(s["body"]["bleeding"]) is bool, "bleed-type")
    need(s["body"]["hp"] <= G1["limits"]["hp"] and s["body"]["food"] <= G1["limits"]["satiety"] and
         s["body"]["energy"] <= G1["limits"]["energy"] and s["body"]["quota"] <= 1, "body-bound")
    exact(s["wallet"], ["balance"]); integer(s["wallet"]["balance"], P["balance_max"])
    need(type(s["missions"]) is dict, "missions-shape")
    need(s["declarations"] == ["M"] and set(s["missions"]) == {"M"}, "declaration-completeness")
    m=s["missions"]["M"]; exact(m, ["character","status","execution","outcome"])
    need(m["character"] == s["character"] and m["status"] in ("unaccepted","active","closed"), "mission-identity")
    if m["status"] == "unaccepted":
        need(m["execution"] is None and m["outcome"] is None, "unaccepted-has-history")
    else:
        need(m["execution"] == "E", "execution-identity")
        need((m["status"]=="active" and m["outcome"] is None) or
             (m["status"]=="closed" and m["outcome"] in ("success","voluntary-failure","deadline-failure","death")), "outcome")
    exact(s["clock"], ["kind","source"])
    need(s["clock"]["kind"] in ("first-ready","active","return-due","deadline-ready"), "clock-kind")
    if s["clock"]["source"] is not None: validate_closure(s["clock"]["source"])
    exact(s["site"], ["execution","node","pending","arrivalSettled","facts","sampleId"])
    need(type(s["site"]["sampleId"]) is str, "sample-id")
    need(s["site"]["execution"] == "E" and s["site"]["node"] in ("H0","H5","H8"), "site-binding")
    need(s["site"]["pending"] in ("none","battle","immediate") and type(s["site"]["arrivalSettled"]) is bool, "site-state")
    exact(s["site"]["facts"], ["power","transfer"]); need(all(type(v) is bool for v in s["site"]["facts"].values()), "facts")
    exact(s["containers"], ["backpack","equipment","quick","hub","ground","installed","delivered","consumed",
                           "destroyed","surrendered","unavailable","archived-ground"])
    need(type(s["instances"]) is dict and type(s["itemStates"]) is dict, "items-shape")
    ids=[]
    for container in s["containers"].values():
        need(type(container) is list and all(type(i) is str for i in container), "container")
        ids.extend(container)
    need(len(ids)==len(set(ids)) and set(ids)==set(s["instances"])==set(s["itemStates"]), "instance-ownership")
    for iid, inst in s["instances"].items():
        exact(inst, ["instanceId","definitionId","quantity","kind","origin"])
        need(inst["instanceId"]==iid and type(inst["definitionId"]) is str and
             inst["kind"] in ("ordinary","sample","component","permission"), "instance-shape")
        integer(inst["quantity"]); need(inst["quantity"] > 0, "quantity")
        st=s["itemStates"][iid]; exact(st, ["instanceId","definitionId","resource"])
        need(st["instanceId"]==iid and st["definitionId"]==inst["definitionId"], "resource-binding")
        r=st["resource"]; exact(r, ["kind","current"])
        need(r["kind"] in ("none","durability","charge","integrity"), "resource-kind")
        integer(r["current"])
        need(r["current"] <= 100 and (r["kind"]!="none" or r["current"]==0), "resource-range")
    need(type(s["history"]) is list and type(s["closures"]) is list and type(s["ledger"]) is list, "history-shape")
    recorded=[]
    for h in s["history"]:
        need(type(h) is dict and set(h) in ({"kind","instance"},{"kind","instance","execution"}), "history-fields")
        need(type(h["instance"]) is str and type(h["kind"]) is str, "history-fields")
        need(h["kind"] in ("installed","consumed","destroyed","delivered","delivered_partial","surrendered","expired") and
             h["instance"] in s["instances"] and h.get("execution","E")=="E", "history-binding")
        recorded.append(h["instance"])
        places={"installed":["installed"],"consumed":["consumed"],"destroyed":["destroyed"],"delivered":["delivered"],
                "delivered_partial":["delivered","surrendered"],"surrendered":["surrendered"],"expired":["surrendered"]}
        need(owner_of(s,h["instance"]) in places[h["kind"]], "history-disposition")
    need(len(recorded)==len(set(recorded)), "duplicate-disposition")
    keys=[]
    for c in s["closures"]:
        validate_closure(c)
        keys.append(c["key"])
    need(len(keys)==len(set(keys)), "duplicate-closure")
    need(len(s["ledger"])==len(s["closures"]), "missing-settlement")
    for c,l in zip(s["closures"],s["ledger"]):
        exact(l, ["key","outcome","before","income","penalty","after"])
        need(l["key"]==c["key"] and l["outcome"]==c["outcome"], "ledger-binding")
        for k in ("before","income","penalty","after"): integer(l[k], P["balance_max"])
        expected_income=P["success_reward"] if c["outcome"]=="success" else 0
        expected_penalty=min(l["before"],P["failure_penalty"]) if c["outcome"] in ("voluntary-failure","deadline-failure") else 0
        need(l["income"]==expected_income and l["penalty"]==expected_penalty, "settlement-amount")
        need(l["after"]==(0 if c["outcome"]=="death" else l["before"]+l["income"]-l["penalty"]), "settlement-arithmetic")
    c=current_closure(s)
    if s["phase"]=="fresh-hub":
        need(m["status"]=="unaccepted" and not c and s["D"]==1 and s["clock"]=={"kind":"first-ready","source":None}, "fresh-history")
        need(s["wallet"]["balance"]==P["initial_balance"], "fresh-wallet")
    if s["phase"]=="active-world":
        need(m["status"]=="active" and not c and s["clock"]=={"kind":"active","source":None}, "active-history")
        need(s["T"]<=7 and s["D"]==s["start"]+s["T"]-1, "active-time")
        need(s["wallet"]["balance"]<=P["balance_max"]-P["success_reward"], "reward-space")
    if s["phase"] in ("living-hub","dead"):
        need(c is not None and m["status"]=="closed" and m["outcome"]==c["outcome"], "closed-required")
        need(s["wallet"]["balance"]==(0 if s["phase"]=="dead" else s["ledger"][-1]["after"]), "wallet-ledger")
        need(not s["containers"]["ground"], "closed-world-access")
        need(c["start"]==s["start"] and c["day"]==s["T"], "closure-current-time")
        for place in ("installed","consumed","destroyed","delivered","surrendered"):
            for iid in s["containers"][place]: need(iid in recorded, "missing-disposition-history")
    if s["phase"]=="living-hub":
        need(c["outcome"]!="death" and s["deathPoint"] is None, "living-death")
        if c["outcome"]=="success":
            iid=s["site"]["sampleId"]; inst=s["instances"].get(iid)
            need(inst is not None and inst["kind"]=="sample" and inst["definitionId"]=="designated-sample" and
                 inst["origin"]=="M/E/H5" and owner_of(s,iid)=="delivered" and all(s["site"]["facts"].values()) and
                 any(h["instance"]==iid and h["kind"]=="delivered" for h in s["history"]), "success-disposition")
        need(s["site"]["pending"]=="none" and s["site"]["arrivalSettled"], "closed-unsettled")
        need((c["outcome"]=="deadline-failure") == (s["site"]["node"]!="H0"), "closure-position")
        need(s["clock"]["source"]==c, "latest-closure-source")
        if c["outcome"]=="deadline-failure":
            need(s["clock"]["kind"]=="deadline-ready" and s["D"]==c["end"]+1 and c["day"]==7, "ready-cycle")
        else:
            need(s["clock"]["kind"]=="return-due" and s["D"]==c["end"], "due-cycle")
        need(not any(s["instances"][i]["kind"]!="ordinary" for k in ("backpack","equipment","quick","hub") for i in s["containers"][k]), "task-asset-leak")
    if s["phase"]=="dead":
        need(s["body"]["hp"]==0 and s["wallet"]["balance"]==0, "dead-body")
        need(not any(s["containers"][k] for k in ("backpack","equipment","quick","hub")), "dead-inheritance")
        need(c["outcome"]=="death", "dead-closure")
        exact(s["deathPoint"], ["cycle","kind","execution","cause","steps"])
        integer(s["deathPoint"]["cycle"])
        need(s["deathPoint"]["execution"]=="E" and s["deathPoint"]["kind"] in ("deadline","rest","resolved-action"), "death-source")
        need(s["D"]==c["end"]==s["deathPoint"]["cycle"], "dead-cycle")
        dp=s["deathPoint"]; steps=dp["steps"]
        need(type(steps) is list and all(type(v) is str for v in steps) and len(steps)>0, "death-steps")
        allowed=[["primary","action-blood"]] if dp["kind"]=="resolved-action" else [["blood"],["blood","infection"],["blood","infection","hunger"]]
        need(steps in allowed and dp["cause"]==steps[-1], "death-steps")
        if dp["cause"] in ("blood","action-blood"): need(s["body"]["bleeding"], "death-cause-body")
        if dp["cause"]=="infection":
            damage=[r["hp"] for r in G1["health"]["infection_damage"] if s["body"]["infection"]>=r["min"]][-1]
            need(damage>0, "death-cause-body")
        if dp["cause"]=="hunger": need(s["body"]["food"]<=G1["health"]["starve_threshold"], "death-cause-body")
        if s["deathPoint"]["kind"]=="deadline": need(s["T"]==7 and s["site"]["node"]!="H0", "dead-deadline")
        if s["deathPoint"]["kind"]=="rest": need(s["T"]<7, "dead-rest")
        # This bounded model has only death during the current active task. Later-departure death is an engineering gate.
        need(s["clock"]=={"kind":"active","source":None}, "dead-clock")
    else:
        if pending_action_death:
            need(s["phase"]=="active-world", "proposal-phase")
            need(s["body"]["hp"]==0, "not-death-result")
            need(s["deathPoint"] is None, "proposal-terminal-state")
        else:
            need(s["body"]["hp"]>0 and s["deathPoint"] is None, "living-hp")
    return s


def validate(s):
    # Install/restore boundary never admits the intermediate active + HP0 proposal.
    return _validate_state(s)


def same_data(a, b):
    # Python bool/float equality must not grant an input permission owned by an int.
    if type(a) is not type(b): return False
    if type(a) is dict:
        return a.keys()==b.keys() and all(same_data(a[k], b[k]) for k in a)
    if type(a) is list:
        return len(a)==len(b) and all(same_data(x,y) for x,y in zip(a,b))
    return a==b


def validate_death_proposal(current, proposal):
    """Read original pending-death fields before any terminal overwrite; no rule replay.

    This finite producer owns only body.hp and preserves input revision. It is NOT
    the real G2 LocationPlan format, whose issued action result already advances revision.
    """
    exact(proposal, ["base","snapshot","steps"])
    validate(proposal["base"])
    need(same_data(proposal["base"],current), "plan-mismatch")
    snapshot=proposal["snapshot"]
    exact(snapshot, current.keys())
    need(snapshot["phase"]=="active-world", "proposal-phase")
    _validate_state(snapshot, pending_action_death=True)
    steps=proposal["steps"]
    need(type(steps) is list and len(steps)>0 and all(type(v) is str for v in steps), "proposal-steps")
    need(steps==["primary","action-blood"], "proposal-steps")
    for key in current:
        if key!="body":
            need(same_data(snapshot[key],current[key]), "proposal-owner-"+key)
    for key in current["body"]:
        if key!="hp":
            need(same_data(snapshot["body"][key],current["body"][key]), "proposal-owner-body."+key)
    # Verify the fixed source can be fatal; compare bounds only, never rerun damage.
    need(snapshot["body"]["bleeding"] and 0 < current["body"]["hp"] <= G1["health"]["bleed_action"], "proposal-source")
    # The terminal consumer owns its copies, never the producer's issued object.
    return clone(snapshot), clone(steps)

def settle_cycle(s):
    next_cycle=safe_add(s["D"],1)  # G1 preflights advancement even if this cycle later proves fatal.
    b=s["body"]; h=G1["health"]
    base=[r["base"] for r in h["infection_stages"] if b["infection"]>=r["min"]][-1]
    gross=safe_add(base, b["exposures"]*h["exposure_progress"])
    progress=safe_add(b["infection"],max(0,gross-b["suppression"]))
    damage=[r["hp"] for r in h["infection_damage"] if progress>=r["min"]][-1]
    trace=[]
    b["hp"]=max(0,b["hp"]-(h["bleed_night"] if b["bleeding"] else 0));trace.append("blood")
    if b["hp"]==0: return trace
    b["infection"]=progress;b["exposures"]=0;b["hp"]=max(0,b["hp"]-damage);trace.append("infection")
    if b["hp"]==0: return trace
    b["food"]=max(0,b["food"]-h["night_food"])
    b["hp"]=max(0,b["hp"]-(h["starve_damage"] if b["food"]<=h["starve_threshold"] else 0));trace.append("hunger")
    if b["hp"]==0: return trace
    b["energy"]=G1["rest"]["A"]; b["quota"]=1;b["suppression"]=0;trace.append("reset")
    s["D"]=next_cycle
    return trace

def retire_assets(s):
    for k in ("backpack","equipment","quick","hub"):
        for iid in s["containers"][k][:]: move_instance(s,iid,"unavailable")
    for iid in s["containers"]["ground"][:]: move_instance(s,iid,"archived-ground")
    s["wallet"]["balance"]=0

def closure(s, outcome, end):
    return {"character":"C","commission":"M","execution":"E","outcome":outcome,"start":s["start"],
            "end":end,"day":s["T"],"key":"M/E"}

def plan(current, request, producer=None):
    # Producer is an internal fixture callback, not accepted from a command. No runtime code uses this model.
    validate(current)
    exact(request, ["intent","revision","commission","execution"])
    integer(request["revision"])
    need(request["revision"]==current["revision"],"stale")
    need(request["commission"]=="M" and request["execution"]=="E","request-binding")
    intent=request["intent"]
    if intent in ("combat","medical","second-real-mission","browser-release"):
        raise Unsupported(intent)
    if intent=="view": return clone(current),[]
    if intent=="launch":
        need(current["missions"]["M"]["status"]=="unaccepted","closed-no-retry")
        raise Unsupported("only-terminal-model")
    need(current["phase"]=="active-world","closed-no-retry")
    need(current["site"]["pending"]=="none" and current["site"]["arrivalSettled"],"unsettled")
    revision=safe_add(current["revision"],1)
    s=clone(current); trace=[]; end=s["D"]; outcome=None
    if intent in ("handover","withdraw"):
        need(s["site"]["node"]=="H0","not-return-point")
        iid=s["site"]["sampleId"]; item=s["instances"].get(iid)
        qualified=bool(item and item["kind"]=="sample" and item["definitionId"]=="designated-sample" and
                       item["origin"]=="M/E/H5" and owner_of(s,iid)=="backpack" and all(s["site"]["facts"].values()))
        if intent=="handover": need(qualified,"incomplete"); outcome="success"
        else: need(not qualified,"success-available"); outcome="voluntary-failure"
    elif intent=="deadline":
        need(s["T"]==G1["limits"]["days"],"not-deadline")
        need(s["site"]["node"]!="H0","normal-return-available")
        trace=settle_cycle(s); outcome="death" if s["body"]["hp"]==0 else "deadline-failure"
        if outcome=="death" and NEGATIVE=="death-recall":
            s["body"]["hp"]=1; s["D"]=end+1;outcome="deadline-failure"
    elif intent=="resolved-action":
        need(producer is not None,"missing-producer")
        proposal=producer(clone(s))
        s,trace=validate_death_proposal(current,proposal)
        outcome="death"
    elif intent=="rest":
        need(s["T"]<7,"no-day8")
        trace=settle_cycle(s)
        if s["body"]["hp"]>0:
            s["T"]+=1;s["revision"]=revision;validate(s);return s,trace
        outcome="death"
    else:
        raise Reject("unknown-intent")
    c=closure(s,outcome,end); before=s["wallet"]["balance"]
    income=P["success_reward"] if outcome=="success" else 0
    penalty=min(before,P["failure_penalty"]) if outcome in ("voluntary-failure","deadline-failure") else 0
    after=safe_add(before,income)-penalty
    need(after<=P["balance_max"],"reward-overflow")
    if outcome=="death":
        retire_assets(s)
        s["phase"]="dead";s["deathPoint"]={"cycle":end,"kind":intent,"execution":"E","cause":trace[-1],"steps":clone(trace)};after=0
    else:
        for k in ("backpack","equipment","quick"):
            for iid in s["containers"][k][:]:
                kind=s["instances"][iid]["kind"]
                if kind!="ordinary":
                    move_instance(s,iid,"delivered" if outcome=="success" and iid==s["site"]["sampleId"] else "surrendered")
                    disposition="delivered" if outcome=="success" and kind=="sample" else "delivered_partial" if kind=="sample" else "expired" if kind=="permission" else "surrendered"
                    s["history"].append({"kind":disposition,"instance":iid,"execution":"E"})
        for iid in s["containers"]["ground"][:]: move_instance(s,iid,"archived-ground")
        s["phase"]="living-hub"
        s["clock"]={"kind":"deadline-ready" if outcome=="deadline-failure" else "return-due","source":clone(c)}
    s["wallet"]["balance"]=after
    s["missions"]["M"]={"character":"C","status":"closed","execution":"E","outcome":outcome}
    s["closures"].append(c);s["ledger"].append({"key":"M/E","outcome":outcome,"before":before,"income":income,"penalty":penalty,"after":after})
    s["revision"]=revision
    validate(s)
    return s,trace

class Session:
    def __init__(self,s):
        self.current=clone(validate(s));self.disk=clone(s);self.counts={"plans":0,"commits":0,"writes":0,"notices":0};self.busy=False
    def dispatch(self,r,producer=None,fail_write=False,hook=None):
        need(not self.busy,"busy");self.busy=True
        try:
            if NEGATIVE=="duplicate-settlement" and self.current["phase"]=="living-hub":
                self.current["wallet"]["balance"]+=P["success_reward"]; return self.current,[]
            proposed,trace=plan(self.current,r,producer); self.counts["plans"]+=1
            if proposed==self.current:return proposed,trace
            self.current=proposed; self.counts["commits"]+=1
            self.counts["writes"]+=1
            if not fail_write:self.disk=clone(proposed)
            if hook:hook(self)
            self.counts["notices"]+=1
            return proposed,trace
        finally:self.busy=False
    def retry_save(self):
        need(not self.busy,"busy");self.counts["writes"]+=1;self.disk=clone(self.current)
    def bootstrap(self,raw):
        if NEGATIVE=="reopen":
            self.current=clone(raw);return
        raise Reject("already-current")

def restore(raw):
    exact(raw,["format","state"])
    need(raw["format"]=="WE003-finite-model-v2","unsupported-model-format")
    return clone(validate(raw["state"]))

def request(s,intent):
    return {"intent":intent,"revision":s["revision"],"commission":"M","execution":"E"}
def set_path(s,path,value):
    target=s
    parts=path.split(".")
    for k in parts[:-1]:
        target=target[int(k)] if isinstance(target,list) else target[k]
    if isinstance(target,list):target[int(parts[-1])]=value
    else:target[parts[-1]]=value
def get_path(s,path):
    for k in path.split("."):s=s[int(k)] if isinstance(s,list) else s[k]
    return s
def remove_path(s,path):
    ks=path.split(".");o=s
    for k in ks[:-1]:o=o[int(k)] if isinstance(o,list) else o[k]
    del o[ks[-1]]
def producer(s):
    n=clone(s);n["body"]["hp"]=max(0,n["body"]["hp"]-(G1["health"]["bleed_action"] if n["body"]["bleeding"] else 0))
    # Represents one already-resolved action: existing effects persist; no second action or draw.
    return {"base":clone(s),"snapshot":n,"steps":["primary","action-blood"]}

def bridge_probe(closed):
    validate(closed)
    need(closed["clock"]["kind"]=="deadline-ready","ready-required")
    # Only a synthetic future consumer consistency proof: no real second content is registered.
    latest=current_closure(closed)
    need(closed["clock"]["source"]==latest,"latest-closure-source")
    n=clone(closed); n["clock"]={"kind":"active","source":None}; n["T"]=1;n["start"]=n["D"]
    n["body"]["food"]=2
    # A later normally returned cycle must settle, even after an older deadline-ready.
    if NEGATIVE!="old-ready": settle_cycle(n)
    return n

def evaluate(fx, case, evidence=None):
    s=clone(fx["base"])
    for p,v in case.get("patch",{}).items():set_path(s,p,v)
    for p in case.get("remove",[]):remove_path(s,p)
    for p,v in case.get("special",{}).items():set_path(s,p,float(v))
    for iid,dest in case.get("relocate",{}).items():move_instance(s,iid,dest)
    op=case["op"]; trace=[]; counts=None
    if op=="restore":
        if case.get("setup"):
            s,_=plan(s,request(s,case["setup"]),producer)
        for iid,dest in case.get("post_relocate",{}).items():move_instance(s,iid,dest)
        if case.get("retire_before_tamper"): retire_assets(s)
        for p,v in case.get("tamper",{}).items():set_path(s,p,v)
        for p in case.get("delete",[]):remove_path(s,p)
        out=restore({"format":case.get("format","WE003-finite-model-v2"),"state":s})
    elif op=="launch-space":
        validate(s);need(s["wallet"]["balance"]+P["success_reward"]<=P["balance_max"],"reward-space");out=s
    elif op=="invalid-request":
        r=request(s,"handover");r.update(case["request"])
        before=clone(s);session=Session(s)
        try:out,trace=session.dispatch(r)
        except Reject:
            assert session.current==before and session.counts["commits"]==session.counts["writes"]==0
            raise
    elif op=="bad-proposal":
        session=Session(s); before=clone(s)
        def bad_producer(value):
            proposed=producer(value)
            for path,v in case["proposal_patch"].items(): set_path(proposed,path,v)
            return proposed
        try: out,trace=session.dispatch(request(s,"resolved-action"),bad_producer)
        except Reject:
            assert session.current==before and session.counts["commits"]==session.counts["writes"]==session.counts["notices"]==0
            raise
    elif op=="proposal-regression":
        session=Session(s); before=clone(s); disk=clone(session.disk)
        issued=[]; issued_text=[]; producer_calls=0
        def observed_producer(value):
            nonlocal producer_calls
            producer_calls+=1
            proposed=producer(value)
            for path,v in case.get("proposal_patch",{}).items(): set_path(proposed,path,v)
            for path,v in case.get("proposal_special",{}).items(): set_path(proposed,path,float(v))
            for iid,dest in case.get("proposal_relocate",{}).items(): move_instance(proposed["snapshot"],iid,dest)
            for path in case.get("proposal_delete",[]): remove_path(proposed,path)
            if "proposal_root" in case: proposed=clone(case["proposal_root"])
            issued.append(proposed)
            issued_text.append(json.dumps(proposed,sort_keys=True,allow_nan=True))
            return proposed
        try:
            out,trace=session.dispatch(request(s,"resolved-action"),observed_producer,fail_write=case.get("write_failure",False))
        except Reject:
            assert producer_calls==1, "producer must be called exactly once before proposal rejection"
            assert session.current==before and session.disk==disk and s==before, "rejection changed original state"
            assert session.counts=={"plans":0,"commits":0,"writes":0,"notices":0}, "rejection was too late"
            assert json.dumps(issued[0],sort_keys=True,allow_nan=True)==issued_text[0], "invalid proposal was overwritten"
            if evidence is not None:
                evidence.update(producerCalls=producer_calls,currentUnchanged=True,diskUnchanged=True,
                                issuedUnchanged=True,counts=clone(session.counts))
            raise
        assert producer_calls==1 and s==before
        assert json.dumps(issued[0],sort_keys=True,allow_nan=True)==issued_text[0], "legal issued proposal mutated"
        assert out["revision"]==before["revision"]+1 and out["phase"]=="dead" and out["body"]["hp"]==0
        if case.get("write_failure"):
            assert session.disk==disk and session.current==out
            try: session.dispatch(request(s,"resolved-action"),observed_producer)
            except Reject: pass
            assert producer_calls==1, "replay called producer again"
            session.retry_save();assert session.disk==out
        else: assert session.disk==out
        counts=session.counts
        assert counts=={"plans":1,"commits":1,"writes":2 if case.get("write_failure") else 1,"notices":1}
        if evidence is not None:
            evidence.update(producerCalls=producer_calls,issuedUnchanged=True,counts=clone(counts))
    elif op=="retry":
        session=Session(s);r=request(s,"handover");session.dispatch(r,fail_write=True)
        old=clone(session.current)
        try:session.dispatch(r)
        except Reject:pass
        assert session.current==old,"duplicate settlement changed current"
        session.retry_save();assert session.disk==old
        out=session.current;counts=session.counts
    elif op=="reentry":
        session=Session(s);caught=[]
        def hook(owner):
            try: owner.dispatch(request(owner.current,"withdraw"))
            except Reject as e:caught.append(str(e))
        out,trace=session.dispatch(request(s,"handover"),hook=hook)
        assert caught==["busy"];counts=session.counts
    elif op=="bootstrap-replace":
        session=Session(s);session.dispatch(request(s,"handover"));before=clone(session.current)
        try:session.bootstrap(fx["fresh"])
        except Reject:pass
        assert session.current==before,"closed state replaced"
        out=session.current
    elif op=="closed-launch":
        session=Session(s);session.dispatch(request(s,"handover"))
        out,trace=session.dispatch(request(session.current,"launch"))
    elif op=="static-hub":
        session=Session(s);session.dispatch(request(s,"handover"))
        before=clone(session.current);out,_=session.dispatch(request(before,"view"))
        assert out==before
    elif op=="old-ready":
        s["D"]=7;s["T"]=7;s["site"]["node"]="H8"
        closed,_=plan(s,request(s,"deadline"));out=bridge_probe(closed)
    elif op=="history-retire":
        out,_=plan(s,request(s,"handover"))
        old=(clone(out["closures"]),clone(out["ledger"]),clone(out["history"]),clone(out["containers"]["delivered"]),
             clone(out["containers"]["installed"]),clone(out["containers"]["consumed"]))
        out["body"]["hp"]=0;retire_assets(out)
        assert old==(out["closures"],out["ledger"],out["history"],out["containers"]["delivered"],
                     out["containers"]["installed"],out["containers"]["consumed"])
    else:
        session=Session(s)
        out,trace=session.dispatch(request(s,op),producer,fail_write=case.get("write_failure",False))
        counts=session.counts
        if case.get("write_failure"):
            assert session.disk==s and session.current!=s
            before=clone(session.current); session.retry_save();assert session.disk==before
    for path,expected in case.get("expect",{}).items():
        assert get_path(out,path)==expected,f"{path}: {get_path(out,path)!r} != {expected!r}"
    if "trace" in case:assert trace==case["trace"],f"trace {trace}"
    if "counts" in case:assert counts==case["counts"],f"counts {counts}"
    # Every legitimate operation preserves real instances/resources and earlier dispositions.
    if op not in ("restore","launch-space","invalid-request"):
        assert out["instances"]==s["instances"] and out["itemStates"]==s["itemStates"],"real items reconstructed"
        for k in ("installed","consumed","destroyed"):
            assert out["containers"][k]==s["containers"][k],"historical disposition rewritten"
    return out

def main():
    global NEGATIVE
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",required=True)
    parser.add_argument("--negative-control",choices=["duplicate-settlement","death-recall","old-ready","reopen"])
    args=parser.parse_args();NEGATIVE=args.negative_control
    fx=json.loads((HERE/"fixtures.json").read_bytes())
    rows=[]
    for case in fx["cases"]:
        observed="accepted";detail=None;evidence={}
        try:evaluate(fx,case,evidence)
        except Reject as e:observed="rejected";detail=str(e)
        except Unsupported as e:observed="unsupported";detail=str(e)
        except AssertionError as e:observed="assertion-mismatch";detail=str(e)
        # Unexpected exceptions deliberately remain crashes, never masquerade as negative-control success.
        expected=case.get("result","accepted")
        matched=observed==expected and (case.get("code") is None or case["code"]==detail)
        rows.append({"id":case["id"],"group":case["group"],"clause":case["clause"],"category":case["category"],
                     "expected":expected,"observed":observed,"detail":detail,"matches":matched})
        if evidence: rows[-1]["transactionEvidence"]=evidence
    # Independent cross-document/config/approved-file assertions, not production coverage.
    drift=[]
    for item in fx["protected"]:
        if hashlib.sha256((ROOT/item["path"]).read_bytes()).hexdigest()!=item["sha256"]:drift.append(item["path"])
    for key,value in fx["parameter_oracle"].items():
        if CFG["parameters"][key]["value"]!=value:drift.append("candidate:"+key)
    for key,status in fx["parameter_status_oracle"].items():
        if CFG["parameters"][key]["status"]!=status:drift.append("candidate-status:"+key)
    if set(CFG["parameters"])!=set(fx["parameter_oracle"]):drift.append("candidate-parameter-scope")
    for c in fx["clauses"]:
        if ('id="'+c+'"') not in (HERE.parent/"02-terminal-outcomes-and-settlement.md").read_text(encoding="utf-8"):
            drift.append("clause:"+c)
    rows.append({"id":"T12-cross-doc-inputs","group":"T12","clause":"C12","category":"positive",
                 "expected":"matched","observed":"matched" if not drift else "drift","detail":drift,"matches":not drift})
    mismatches=[r["id"] for r in rows if not r["matches"]]
    category_counts={k:sum(r["category"]==k for r in rows) for k in ("positive","expected-rejection","fault","unsupported")}
    result={"evidence":"FINITE_DESIGN_MODEL_NOT_PRODUCTION","baseSha":BASE,
            "modelRevision":"WORLD-ENTRY-003-R1","revisionBaseSha":"f93e17ac7b47af39833f2ecf05681fea03dbf689","negativeControl":NEGATIVE,
            "categoryCounts":category_counts,"mismatchCount":len(mismatches),"failedIds":mismatches,"cases":rows,
            "unsupportedNotPass":sum(r["category"]=="unsupported" for r in rows),
            "limits":["not five-map reachability","no geometry/CTB/browser","fixture facts are not public capabilities",
                      "synthetic bridge/retirement witnesses do not register a second mission","no offline rollback guarantee"]}
    Path(args.output).write_bytes((json.dumps(result,ensure_ascii=False,sort_keys=True,indent=2)+"\n").encode())
    print(json.dumps({k:result[k] for k in ("categoryCounts","mismatchCount","failedIds","unsupportedNotPass")}))
    return 1 if mismatches else 0

if __name__=="__main__":
    raise SystemExit(main())
