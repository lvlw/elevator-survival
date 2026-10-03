"""004 finite witnesses; shared perform, no production imports or save/RNG engine."""
import copy, hashlib, json, platform
from pathlib import Path
import check_design as c
B=Path(__file__).resolve().parent
R=[]; W={}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(n,v): (B/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
def case(n,fn,expected,kind="positive",scope="current"):
    try: actual=fn();ok=c.matches(actual,expected) if isinstance(expected,dict) else type(actual) is type(expected) and actual==expected
    except Exception as e: actual={"unexpected_exception":type(e).__name__+":"+str(e)};ok=False
    R.append(dict(id=n,classification=kind,scope=scope,expected=expected,actual=actual,passed=ok))
def apply(s,a,p): return c.perform(s,a,p)[0]
def reject(s,a,p):
    before=copy.deepcopy(s)
    try: c.perform(s,a,p)
    except c.Reject as e: return {"error":str(e),"unchanged":s==before}
    return {"error":None,"unchanged":s==before}
def brief(s,p):
    d=c.snapshot(s,p)
    keys="status hp satiety infection exposure bleeding injury points energy day character_day first_success ready_next settled_cycle signature_used medical_doses suppression suppressant_used painkiller pipe coat tool_resource task_id active_task_id commission_id commissions inventory_by_location last_settled_result"
    return {k:d[k] for k in keys.split()}
def execute(s,steps,p):
    cost=0
    for a in steps:
        s,v,_=c.perform(s,{k:v for k,v in a.items() if k not in ("expect","label")},p);cost+=v
        if s["status"]=="death":break
    return s,cost
def future(s):
    s=copy.deepcopy(s)
    s["offered_tasks"].update(json.loads((B/"fixtures-v1.4.json").read_text(encoding="utf-8"))["offered_tasks"])
    return s
def launch(s,p,execution="next",offer="FOLLOWUP",**kw):
    return apply(s,{"action":"launch","task_id":execution,"offer_id":offer,"revision":s["revision"],**kw},p)
def checks(p,specs):
    def init(**kw):return c.initial({"initial":kw},p)
    def fail(**kw):return apply(init(**kw),{"action":"failure"},p)
    def no(n,s,a,why,pp=p,scope="current"):case(n,lambda:reject(s,a,pp),{"error":why,"unchanged":True},"expected_rejection",scope)
    def buy(s,k):return apply(s,{"action":"hub_buy","item":k,"revision":s["revision"]},p)
    def treat(s):return apply(s,{"action":"hub_treat","quote":c.therapy_quote(s,p)},p)
    def locs(s):return {u["id"]:u["location"] for u in s["units"]}
    normal=next(x for x in specs["scenarios"] if x["id"]=="normal_five")
    complete,_=execute(init(),normal["steps"],p)
    failure=fail(points=50)
    deadline=apply(init(day=7,character_day=7,location="C4",points=50),{"action":"deadline"},p)
    case("default_one_commission",lambda:list(p["offered_tasks"]),["CURRENT"])
    first=init(first_entry=True,specialty="scout")
    case("first_no_prior_day",lambda:brief(launch(first,p,"first","CURRENT"),p),{"hp":12,"satiety":6,"character_day":1,"energy":100,"commission_id":"transfer-001"})
    partial=fail(items=[{"type":"sample"}]);installed=fail(facts=["installed"])
    for label,s in (("success",complete),("failure",failure),("deadline",deadline),("partial",partial),("installed",installed)):
        no("closed_commission_"+label,s,{"action":"launch","task_id":"renamed","revision":s["revision"],"reason":"custody_or_partial"},"commission_closed_or_active")
    alias=copy.deepcopy(failure);alias["offered_tasks"]["ALIAS"]={**p["offered_tasks"]["CURRENT"],"title":"Different title"}
    no("title_does_not_reopen",alias,{"action":"launch","task_id":"renamed","offer_id":"ALIAS","revision":alias["revision"]},"commission_closed_or_active")
    empty=fail(hp=1,bleeding=True,wound=True,points=0,empty_equipment=True,initial_bandage=False)
    no("no_real_task_no_damage",empty,{"action":"launch","task_id":"invented","offer_id":"NONE","revision":empty["revision"]},"task_not_offered")
    case("no_content_not_death",lambda:brief(apply(empty,{"action":"hub_cancel"},p),p),{"hp":1,"status":"failure","points":0,"character_day":1})
    no("active_not_relaunch",init(),{"action":"launch","task_id":"new","revision":0},"not_living_hub")
    active=init();old=copy.deepcopy(active);c.snapshot(active,p)
    case("active_query_static_not_save_test",lambda:active==old,True)
    for points in (0,7,20,50):
        s=fail(points=points,tool="flashlight",tool_resource=3,pipe=7,coat=2,items=[{"id":"old.bank","type":"metal","location":"bank"},{"id":"new.loot","type":"ration","origin_task":"fixture_task"}])
        case("failure_fee_"+str(points),lambda s=s:brief(s,p),{"points":max(0,points-20),"last_settled_result":{"fee":min(points,20),"reward":0},"pipe":7,"coat":2,"tool_resource":3})
        case("failure_units_"+str(points),lambda s=s:locs(s),{"old.bank":"bank","new.loot":"bank","initial.bandage.1":"bank"})
    no("fee_not_repeated",failure,{"action":"failure"},"terminated")
    for label,hp,inj in (("healthy",12,"none"),("injured",1,"heavy_fracture")):
        s=apply(init(hp=hp,injury=inj,day=7,infection=130 if hp==1 else 0,bleeding=hp==1,facts=["installed"],items=[{"type":"sample"}]),{"action":"success"},p)
        case("same_reward_"+label,lambda s=s:brief(s,p),{"hp":hp,"injury":inj,"infection":130 if hp==1 else 0,"character_day":7,"points":120,"last_settled_result":{"reward":120}})
    no("sample_required",init(facts=["installed"]),{"action":"success"},"wrong_return_outcome")
    case("partial_no_unlock",lambda:brief(partial,p),{"first_success":False,"points":0,"inventory_by_location":{"delivered_partial":{"sample":1}}})
    case("real_full_route_medical_unlock",lambda:brief(buy(buy(complete,"bandage"),"firstaid"),p),{"first_success":True,"points":57})
    no("failure_medical_locked",fail(points=100),{"action":"hub_buy","item":"bandage","revision":1},"missing_eligibility")
    prep=treat(complete)
    for k in ("metal","ration","ration","bandage"):prep=buy(prep,k)
    for a in ({"target":"mechanical","pipe":15},{"target":"mechanical","tool":5},{"target":"coat"}):
        prep=apply(prep,{"action":"hub_maintain","revision":prep["revision"],**a},p)
    case("one_success_preparation",lambda:brief(prep,p),{"points":30,"hp":12,"infection":0,"satiety":4,"pipe":30,"coat":12,"tool_resource":12,"inventory_by_location":{"consumed":{"metal":2,"cloth":1}}})
    W["preparation"]={"return":brief(complete,p),"prepared":brief(prep,p),"account":"120-40 therapy-12 metal-20 ration2-18 bandage=30; real repair metal2/cloth1, no automatic meals or actual next task"}
    pharmacy=[{"action":"move","to":"H1"},{"action":"move","to":"H2"},{"action":"search","source":"H_pharmacy"},{"action":"pickup","source":"H_pharmacy","item":"bandage","quantity":1},{"action":"move","to":"H1"},{"action":"move","to":"H0"},{"action":"failure"}]
    logistics=[{"action":"move","to":n} for n in ("H1","H7","L0","L1")]+[{"action":"L_front_open","method":"manual"},{"action":"search","source":"L_front"},{"action":"pickup","source":"L_front","item":"bandage","quantity":1},{"action":"pickup","source":"L_front","item":"ration","quantity":2}]+[{"action":"move","to":n} for n in ("L0","H7","H1","H0")]+[{"action":"failure"}]
    for name,steps,cost in (("pharmacy20",pharmacy,20),("logistics50",logistics,50)):
        s,used=execute(init(),steps,p)
        case(name+"_single",lambda s=s,used=used:{"cost":used,"final":brief(s,p)},{"cost":cost,"final":{"hp":12,"points":0,"status":"failure"}})
        no(name+"_no_repeat",s,{"action":"launch","task_id":"second","revision":s["revision"]},"commission_closed_or_active")
        W[name]={"cost":used,"final":brief(s,p)}
    lethal=future(empty);req={"action":"launch","task_id":"next","offer_id":"FOLLOWUP","revision":lethal["revision"]}
    for name,delta,why in (("stale",{"revision":-1},"stale_offer"),("unknown",{"offer_id":"NONE"},"task_not_offered"),("reuse",{"task_id":"fixture_task"},"offer_already_used"),("version",{"offer_version":"old"},"stale_offer_version"),("world",{"world_id":"other"},"unknown_offer_world"),("policy",{"policy":"must_complete"},"unknown_task_policy")):
        no("pre_hazard_"+name,lethal,{**req,**delta},why,scope="isolated_contract_fixture")
    for name,delta,why in (("pending",{"pending":{"enemy":"L"}},"not_stable_hub"),("active",{"active_task_id":"residual"},"not_stable_hub"),("bound_version",{"rules_version":"old"},"bound_rules_version_mismatch")):
        s=copy.deepcopy(lethal);s.update(delta);no("pre_hazard_"+name,s,req,why,scope="isolated_contract_fixture")
    s=copy.deepcopy(lethal);s["units"].append({"id":"card","type":"card","location":"pack","origin_task":"before"})
    no("task_item_not_exportable",s,req,"task_bound_item_not_exportable",scope="isolated_contract_fixture")
    preview,_,detail=c.perform(lethal,{**req,"action":"hub_launch_preview"},p)
    case("preview_static_no_hidden_fields",lambda:{"same":preview==lethal,"keys":sorted(detail["health"]),"forecast":detail["infection_forecast"]},{"same":True,"keys":["bleeding","hp","injury","satiety"],"forecast":"unsupported_player_safe_forecast"},scope="isolated_contract_fixture")
    dead=launch(lethal,p)
    case("legal_handoff_death_no_entry",lambda:{"state":brief(dead,p),"offers_same":dead["used_task_ids"]==lethal["used_task_ids"]},{"state":{"hp":0,"status":"death","character_day":1,"commission_id":"transfer-001","active_task_id":None},"offers_same":True},scope="isolated_contract_fixture")
    healed=apply(future(fail(hp=1,bleeding=True,wound=True,items=[{"type":"bandage","location":"bank"}])),{"action":"hub_use","item":"bandage"},p)
    case("latest_body_at_launch",lambda:brief(launch(healed,p),p),{"hp":2,"bleeding":False,"character_day":2},scope="isolated_contract_fixture")
    no("old_preview_after_treatment",healed,{**req,"revision":1},"stale_offer",scope="isolated_contract_fixture")
    fed=future(fail(hp=1,satiety=0,points=40))
    for _ in range(2):fed=apply(buy(fed,"ration"),{"action":"hub_use","item":"ration"},p)
    case("two_real_meals_launch",lambda:brief(launch(fed,p),p),{"hp":1,"points":0,"satiety":2,"character_day":2},scope="isolated_contract_fixture")
    d=future(apply(init(day=7,character_day=7,location="C4",infection=25,exposure=1,injury="light_contusion",items=[{"type":"suppressant","location":"bank"},{"type":"painkiller","location":"bank"}]),{"action":"deadline"},p))
    for k in ("suppressant","painkiller"):d=apply(d,{"action":"hub_use","item":k},p)
    nxt=launch(d,p)
    case("deadline_no_double_cycle",lambda:brief(nxt,p),{"character_day":8,"day":1,"infection":50,"satiety":4,"medical_doses":2,"suppression":15,"suppressant_used":True,"painkiller":True,"ready_next":False},scope="isolated_contract_fixture")
    after=launch(apply(nxt,{"action":"failure"},p),p,"third","AFTER")
    case("later_cycle_still_due",lambda:brief(after,p),{"character_day":9,"infection":50,"satiety":2,"medical_doses":0,"suppression":0},scope="isolated_contract_fixture")
    no("deadline_no_combat_skip",init(day=7,location="L2",pending={"enemy":"L","from":"L1"}),{"action":"deadline"},"pending_encounter")
    no("E0_not_deadline",init(energy=0),{"action":"deadline"},"not_deadline")
    history=("delivered","delivered_partial","recovered","consumed","installed","impounded","penalized","lost")
    s=future(fail(hp=1,bleeding=True,wound=True,initial_bandage=False,items=[{"type":"metal","id":"history."+v,"location":v} for v in history]+[{"type":"metal","id":"current","location":"bank"}]))
    oldhistory={k:v for k,v in locs(s).items() if k.startswith("history.")};terminal=launch(s,p)
    case("F02_history_immutable",lambda:{"locations":locs(terminal),"result_same":terminal["last_settled_result"]==s["last_settled_result"]},{"locations":{**oldhistory,"current":"lost"},"result_same":True},scope="isolated_contract_fixture")
    again=copy.deepcopy(terminal);c.terminal_death(again,"repeat")
    case("F02_repeat_death",lambda:again==terminal,True)
    fragile,_=execute(init(hp=9,infection=20),normal["steps"],p);fragile_dead=launch(future(fragile),p)
    case("F02_success_handoff_death",lambda:{"before":brief(fragile,p),"after":brief(fragile_dead,p),"sample":locs(fragile_dead)["quest_sample.fixture_task.sample.1"]},{"before":{"hp":1,"infection":50,"status":"success","points":120},"after":{"hp":0,"status":"death","points":0,"last_settled_result":{"outcome":"success","reward":120}},"sample":"delivered"},scope="isolated_contract_fixture")
    fight,_=execute(launch(future(complete),p),[{"action":"move","to":"H1"},{"action":"H_firedoor_open"},{"action":"move","to":"H4"},{"action":"combat","trace":"H_wound"}],p)
    case("F02_success_fight_death",lambda:{"state":brief(fight,p),"sample":locs(fight)["quest_sample.fixture_task.sample.1"]},{"state":{"hp":0,"status":"death","last_settled_result":{"outcome":"success"}},"sample":"delivered"},scope="isolated_contract_fixture")
    other=future(failure);other["offered_tasks"]["FOLLOWUP"]["mission_id"]="infected_recovery";other=launch(other,p)
    other["facts"].add("installed");other["units"].append({"id":"other.sample","type":"sample","location":"pack","origin_task":"next"})
    case("template_not_current_achievement",lambda:brief(apply(other,{"action":"success"},p),p),{"first_success":False},scope="isolated_contract_fixture")
    def encounter(enemy="L",engaged=False,hp=None):
        return init(location=p["enemies"][enemy]["node"],pending={"enemy":enemy,"from":"L1" if enemy=="L" else "C1"},enemies={enemy:{"engaged":engaged,"hp":p["enemies"][enemy]["hp"] if hp is None else hp}})
    for dmg in (6,16):
        pp=copy.deepcopy(p);pp["gear"]["pipe"]["basic_damage"]=dmg
        no("F1_early_kill_"+str(dmg),encounter(),{"action":"combat","trace":"L_full"},"trace_continues_after_incapacitation",pp)
    no("F1_first_on_reentry",encounter(engaged=True),{"action":"combat","trace":"L_full"},"not_first_encounter")
    no("F1_reentry_on_first",encounter("C",False,6),{"action":"combat","trace":"C_resume"},"not_reentry")
    case("F1_valid_first",lambda:brief(apply(encounter(),{"action":"combat","trace":"L_full"},p),p),{"hp":9,"pipe":26,"energy":84})
    case("F1_valid_reentry",lambda:brief(apply(encounter("C",True,6),{"action":"combat","trace":"C_resume"},p),p),{"hp":11,"pipe":28,"energy":94})
    pp=copy.deepcopy(p);pp["gear"]["pipe"]["basic_damage"]=6;pp["traces"]["L_short"]=copy.deepcopy(pp["traces"]["L_full"]);pp["traces"]["L_short"]["events"].pop();pp["traces"]["L_short"]["duration"]=280
    case("F1_independent_short_trace",lambda:brief(apply(encounter(),{"action":"combat","trace":"L_short"},pp),pp),{"hp":9,"pipe":27,"energy":88})
    for name,val in (("bool",True),("fraction",1.5),("negative",-1),("overflow",2147483648),("nan",float("nan"))):
        s=copy.deepcopy(failure);s["points"]=val;no("invalid_balance_"+name,s,{"action":"hub_cancel"},"invalid_balance")
    sick=fail(points=120,hp=4,infection=25,medical_doses=3,painkiller_used=True,signature_used=True,satiety=1,energy=7);cured=treat(sick)
    case("service_preserves_other_owners",lambda:brief(cured,p),{"points":60,"hp":12,"infection":0,"medical_doses":3,"signature_used":True,"satiety":1,"energy":7,"character_day":1})
    no("service_old_quote",cured,{"action":"hub_treat","quote":c.therapy_quote(sick,p)},"stale_quote")
    case("healthy_service_noop",lambda:treat(cured)==cured,True)
    low=fail(points=59,infection=25)
    no("service_39_insufficient",low,{"action":"hub_treat","quote":c.therapy_quote(low,p)},"insufficient_points")
    no("death_no_treatment",terminal,{"action":"hub_treat","quote":c.therapy_quote(terminal,p)},"not_living_hub")
    for k in ("ration","metal","cloth","battery"):
        case("base_purchase_"+k,lambda k=k:brief(buy(fail(points=100),k),p),{"points":80-p["economy"]["catalog"][k]["price"],"first_success":False,"inventory_by_location":{"bank":{k:1}}})
    no("electronics_not_sold",failure,{"action":"hub_buy","item":"electronics","revision":failure["revision"]},"catalog_item_closed")
    for name,val in (("bool",True),("float",10.0),("negative",-1)):
        no("invalid_buy_price_"+name,failure,{"action":"hub_buy","item":"ration","price":val,"revision":failure["revision"]},"invalid_purchase_price")
    paid=buy(fail(points=30),"ration");no("purchase_replay",paid,{"action":"hub_buy","item":"ration","revision":1},"stale_purchase")
    full=init(location="T1",initial_bandage=False,items=[{"type":"firstaid","quantity":12},{"type":"bandage","location":"q1"},{"type":"disinfectant","location":"q2"}])
    no("NPC_full_pack_atomic",full,{"action":"npc_trade"},"grid_full")
    s=fail(initial_bandage=False,items=[{"type":"firstaid","quantity":13,"location":"bank"}]);s=apply(s,{"action":"hub_load","item":"firstaid","quantity":12},p)
    no("thirteenth_firstaid_load",s,{"action":"hub_load","item":"firstaid","quantity":1},"grid_full")
    s=fail(pipe=15,tool_resource=7,items=[{"type":"metal","location":"bank"}])
    no("metal_no_double_restore",s,{"action":"hub_maintain","target":"mechanical","pipe":15,"tool":5,"revision":s["revision"]},"invalid_repair_allocation")
    s=fail(tool="toolkit",tool_resource=3,items=[{"type":"metal","location":"bank"}])
    no("toolkit_missing_electronics",s,{"action":"hub_maintain","target":"toolkit","revision":s["revision"]},"missing_item:electronics")
    for specialty,method,facts,cost in ((None,"full",[],6),("scout","full",[],4),(None,"quick",["interface"],4),("scout","quick",["interface"],3)):
        case("match_"+(specialty or "ordinary")+"_"+method,lambda specialty=specialty,method=method,facts=facts:c.perform(init(location="C1",specialty=specialty,facts=facts),{"action":"C_match","method":method},p)[1],cost)
    no("scout_no_free_information",init(location="C1",specialty="scout"),{"action":"C_match","method":"quick"},"missing_quick_information")
    for specialty,orders,method,cost,wear in ((None,False,"manual",14,0),("engineer",False,"manual",10,0),(None,True,"orders",10,0),("engineer",True,"orders",10,0),("engineer",True,"crowbar",6,1)):
        s=init(location="L2",specialty=specialty,facts=["orders"] if orders else [],enemies={"L":{"hp":0}})
        a,actual,_=c.perform(s,{"action":"L_fixation_open","method":method},p)
        case("fixation_"+(specialty or "ordinary")+str(orders)+method,lambda a=a,actual=actual:{"cost":actual,"tool":a["tool_resource"]},{"cost":cost,"tool":12-wear})
    for specialty,hp,out in ((None,8,9),("survival",8,10),("survival",11,12)):
        s=init(specialty=specialty,hp=hp,bleeding=True,wound=True,items=[{"type":"bandage"}])
        case("bandage_"+(specialty or "ordinary")+str(hp),lambda s=s:brief(apply(s,{"action":"use","item":"bandage"},p),p),{"hp":out,"bleeding":False,"injury":"light_laceration","inventory_by_location":{"consumed":{"bandage":1}}})
    s=fail(specialty="survival",hp=8)
    case("survival_hub_no_bonus",lambda:brief(apply(s,{"action":"hub_use","item":"bandage"},p),p),{"hp":9})
    no("no_implicit_specialty_switch",future(s),{"action":"launch","task_id":"new","offer_id":"FOLLOWUP","revision":s["revision"],"specialty":"engineer"},"specialty_change_unapproved",scope="isolated_contract_fixture")
    for tool in ("flashlight","toolkit"):
        s=init(location="L2",tool=tool,specialty="engineer",enemies={"L":{"hp":0}})
        case("engineer_with_"+tool,lambda s=s:c.perform(s,{"action":"L_fixation_open","method":"manual"},p)[1],10)

    # Additional targeted boundaries found during the read-only audit.
    quote=c.therapy_quote(sick,p);quote["price"]=0
    no("service_forged_price",sick,{"action":"hub_treat","quote":quote},"stale_quote")
    for name,change,why in (("character",{"character_id":"other"},"commission_wrong_character"),("missing_key",{"commission_id":None},"missing_commission_identity")):
        bad=copy.deepcopy(lethal);bad["offered_tasks"]["FOLLOWUP"].update(change)
        no("offer_"+name,bad,req,why,scope="isolated_contract_fixture")
    duplicate=copy.deepcopy(lethal);duplicate["units"]=[{"id":"same","type":"metal","location":"bank","origin_task":"before"}]*2
    no("bad_item_before_hazards",duplicate,req,"duplicate_instance",scope="isolated_contract_fixture")
    quick=copy.deepcopy(lethal);quick["units"]=[{"id":"bad.quick","type":"firstaid","location":"q1","origin_task":"before"}]
    no("bad_quick_before_hazards",quick,req,"quick_slot_type",scope="isolated_contract_fixture")
    no("scout_wrong_location",init(location="C3",specialty="scout"),{"action":"C_match"},"wrong_location")
    no("engineer_orders_needs_fact",init(location="L2",specialty="engineer",enemies={"L":{"hp":0}}),{"action":"L_fixation_open","method":"orders"},"missing_orders")
    matched=apply(init(location="C1",specialty="scout"),{"action":"C_match"},p)
    no("scout_no_repeat_match",matched,{"action":"C_match"},"already_completed")
    no("survival_no_free_full_health_med",init(specialty="survival"),{"action":"use","item":"bandage","from":"q1"},"no_medical_target")
    variant=future(fail(points=42))
    for item in ("metal","ration"):
        variant=buy(variant,item);variant=apply(variant,{"action":"hub_load","item":item,"quantity":1},p)
    bought_id=next(u["id"] for u in variant["units"] if u["type"]=="metal" and u["origin_task"]=="hub_purchase")
    variant=apply(launch(variant,p),{"action":"use","item":"ration"},p)
    steps=copy.deepcopy([a for a in normal["steps"] if not (a["action"]=="pickup" and a.get("source")=="L_deep" and a.get("item")=="metal")])
    for a in steps:
        if a["action"]=="install":a["selected_units"]={"metal":[bought_id]}
    variant,cost=execute(variant,steps,p)
    case("purchased_same_unit_installed",lambda:{"cost":cost,"location":locs(variant)[bought_id],"state":brief(variant,p)},{"cost":269,"location":"installed","state":{"status":"success","hp":4,"points":120}},scope="isolated_contract_fixture")
    selection=init(location="H8",facts=["power"],items=[{"type":"control"},{"type":"module"},{"type":"metal","id":"pack.metal"},{"type":"metal","id":"bank.metal","location":"bank"},{"type":"metal","id":"spent.metal","location":"consumed"},{"type":"electronics"}])
    for name,ids,why in (("bank",["bank.metal"],"selected_unit_not_available"),("missing",["fake"],"selected_unit_not_available"),("consumed",["spent.metal"],"selected_unit_not_available"),("duplicate",["pack.metal","pack.metal"],"invalid_selected_units")):
        no("installation_selection_"+name,selection,{"action":"install","selected_units":{"metal":ids}},why)

def main():
    p=json.loads((B/"parameters.json").read_text(encoding="utf-8"));specs=json.loads((B/"scenarios.json").read_text(encoding="utf-8"))
    inputs={n:sha(B/n) for n in ("parameters.json","scenarios.json","check_design.py","checks_v1_4.py","fixtures-v1.4.json","expected-v1.4.json")}
    omitted={"original_R4_illegal","corrected_R4_three","topology_three_power","entirely_empty_character_continuation"}
    indexed={s["id"]:s for s in specs["scenarios"]}
    for spec in specs["scenarios"]:
        if spec["id"] in omitted:continue
        x=c.run_route(spec,p);ledger=x.pop("ledger",[])
        x.update(classification="expected_rejection" if spec.get("expect_error") else "positive",scope="current",expected=spec.get("expect",{}));R.append(x)
        if spec["id"] in ("normal_five","early_sample_five","damaged_split_five","flashlight_five","misused_electronics_recovery"):
            W[spec["id"]]={"summary":x,"actions":[{"action":r["action"],"cost":r.get("nominal_energy"),"after":{k:r["after"][k] for k in ("day","location","energy","hp","infection","satiety","pipe","coat","tool_resource")},"items_changed":[u for u in r["after"]["units"] if u not in r["before"]["units"]]} for r in ledger if "after" in r]}
    for test in specs["sensitivity"]:
        pp=copy.deepcopy(p);target=pp
        for k in test["path"][:-1]:target=target[k]
        target[test["path"][-1]]=test["value"]
        spec=copy.deepcopy(indexed[test["scenario"]]);spec.update(id=test["id"],expect=test.get("expect",{}));spec.pop("expect_error",None)
        if test.get("expect_error"):spec["expect_error"]=test["expect_error"]
        for a in spec["steps"]:a.pop("expect",None)
        x=c.run_route(spec,pp);x.pop("ledger",None)
        x.update(classification="unsupported" if test["id"]=="pipe_capacity_10" else "expected_rejection" if test.get("expect_error") else "positive",scope="local_parameter_sensitivity",expected=test);R.append(x)
    checks(p,specs)
    assert len({x["id"] for x in R})==len(R)
    counts={k:sum(x["classification"]==k for x in R) for k in ("positive","expected_rejection","unsupported")}
    counts.update(total=len(R),matched=sum(x["passed"] for x in R),mismatched=sum(not x["passed"] for x in R))
    canonical=hashlib.sha256(json.dumps(R,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
    write("results-v1.4.json",{"task":"WORLD-DESIGN-004","counts":counts,"results":R})
    records=[]
    for name,witness in W.items():
        records.append({"id":name,"kind":"summary","witness":{k:v for k,v in witness.items() if k!="actions"}})
        records.extend({"id":name,"kind":"action","step":i,**a} for i,a in enumerate(witness.get("actions",[]),1))
    (B/"witnesses-v1.4.jsonl").write_text("\n".join(json.dumps(r,ensure_ascii=False,sort_keys=True) for r in records)+"\n",encoding="utf-8",newline="\n")
    outputs={n:sha(B/n) for n in ("results-v1.4.json","witnesses-v1.4.jsonl")}
    write("metadata-v1.4.json",{"inputs":inputs,"outputs":outputs,"canonical_results_sha256":canonical,"python":platform.python_version(),"counts":counts})
    if not (B/"first-run-v1.4.json").exists():write("first-run-v1.4.json",{"inputs":inputs,"counts":counts,"failures":[x for x in R if not x["passed"]],"canonical_results_sha256":canonical})
    print(json.dumps({"counts":counts,"canonical_results_sha256":canonical},ensure_ascii=False))
    for x in R:
        if not x["passed"]:print(json.dumps(x,ensure_ascii=False))
    raise SystemExit(1 if counts["mismatched"] else 0)
if __name__=="__main__":main()
