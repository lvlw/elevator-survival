"""Finite WORLD-DESIGN-003 examples, sharing authored route operations only.

No random sampling, free-form CTB, arbitrary task generation, save or UI claims.
Every supply entry below is a separately named hypothetical offered task.
"""
import copy
import json
from pathlib import Path
import check_design as c

BASE=Path(__file__).resolve().parent

def brief(s,p):
    d=c.snapshot(s,p)
    return {k:d[k] for k in ("task_id","status","day","character_day","location","energy","hp","satiety","infection","exposure","bleeding","wound","injury","points","first_success","ready_next","pipe","coat","tool_resource","signature_used","disinfectant_used","painkiller","painkiller_used","suppressant_used","medical_doses","suppression","inventory_by_location","equipment","active_task_id","last_settled_result","settled_cycle","first_entry")}

def apply(s,a,p):
    return c.perform(s,a,p)[0]

def reject(s,a,p):
    before=copy.deepcopy(s)
    try: c.perform(s,a,p)
    except c.Reject as exc:
        return {"error":str(exc),"unchanged":s==before}
    return {"error":None,"unchanged":s==before}

def hub(p,**kwargs):
    # A declared independent legal-return fixture, not a newly rewarded success.
    s=c.initial({"initial":kwargs},p)
    s.update(location="HUB",status="failure",active_task_id=None,next_activity="same_character_hub_preparation")
    return s

def treat(s,p):
    return apply(s,{"action":"hub_treat","quote":c.therapy_quote(s,p)},p)

def prepare(s,p,task_id,feed=False,maintain=False):
    if maintain:
        if s["pipe"]<30:s=apply(s,{"action":"hub_maintain","revision":s["revision"],"target":"mechanical","pipe":30-s["pipe"]},p)
        if s["tool_resource"]<12:s=apply(s,{"action":"hub_maintain","revision":s["revision"],"target":"mechanical","tool":12-s["tool_resource"]},p)
        if s["coat"]<12:s=apply(s,{"action":"hub_maintain","revision":s["revision"],"target":"coat"},p)
    if feed:
        while s["satiety"]<6:s=apply(s,{"action":"hub_use","item":"ration"},p)
        s=apply(s,{"action":"hub_load","item":"ration","quantity":1},p)
    s=apply(s,{"action":"launch","task_id":task_id,"revision":s["revision"]},p)
    if feed and s["status"]=="active":s=apply(s,{"action":"use","item":"ration","from":"pack"},p)
    return s


def run_joint(p,specs):
    results=[]
    oldp=copy.deepcopy(p);oldp["economy"].update(failure_penalty=30,recover_new_on_failure=True)
    evidence={"scope":"bounded authored examples, all v1.3 values remain Draft", "cases":{}, "continuous":{}}
    def case(name,fn,expected,classification="positive"):
        try:
            actual=fn()
            passed=c.matches(actual,expected)
        except Exception as exc:
            actual={"unexpected_exception":type(exc).__name__+":"+str(exc)}
            passed=False
        results.append({"id":name,"classification":classification,"passed":passed,"expected":expected,"actual":actual})
        evidence["cases"][name]=actual
    def rejected(name,s,a,reason,pp=p):
        case(name,lambda:reject(s,a,pp),{"error":reason,"unchanged":True},"expected_rejection")
    def encounter(enemy="L",engaged=False,hp=None):
        i={"location":p["enemies"][enemy]["node"],"pending":{"enemy":enemy,"from":"L1" if enemy=="L" else "C1"},"enemies":{enemy:{"engaged":engaged}}}
        if hp is not None:i["enemies"][enemy]["hp"]=hp
        return c.initial({"initial":i},p)
    for damage in (6,16):
        v=copy.deepcopy(p);v["gear"]["pipe"]["basic_damage"]=damage
        rejected("F1a_damage_"+str(damage),encounter(),{"action":"combat","trace":"L_full"},"trace_continues_after_incapacitation",v)
    rejected("F1b_first_trace_on_reentry",encounter(engaged=True),{"action":"combat","trace":"L_full"},"not_first_encounter")
    rejected("F1b_reentry_trace_on_first",encounter("C",False,6),{"action":"combat","trace":"C_resume"},"not_reentry")
    case("F1_baseline_first_trace",lambda:brief(apply(encounter(),{"action":"combat","trace":"L_full"},p),p),
         {"hp":9,"pipe":26,"energy":84})
    case("F1_valid_reentry",lambda:brief(apply(encounter("C",True,6),{"action":"combat","trace":"C_resume"},p),p),
         {"hp":11,"pipe":28,"energy":94})
    v=copy.deepcopy(p);v["gear"]["pipe"]["basic_damage"]=6
    # An explicitly re-authored finite trace may end at the actual kill; no dynamic repair of old trace.
    v["traces"]["L_damage6_authored"]=copy.deepcopy(v["traces"]["L_full"])
    v["traces"]["L_damage6_authored"]["events"]=v["traces"]["L_full"]["events"][:-1]
    v["traces"]["L_damage6_authored"]["duration"]=280
    case("F1_separately_authored_damage6",lambda:brief(apply(encounter(),{"action":"combat","trace":"L_damage6_authored"},v),v),
         {"hp":9,"pipe":27,"energy":88})
    for old_i,new_i,damage in [(0,0,0),(29,34,0),(59,69,1),(89,104,2),(110,130,3),(120,140,3),(160,180,3)]:
        case("disease_old_"+str(old_i),lambda i=old_i:brief(apply(c.initial({"initial":{"location":"C4","hp":12,"infection":i,"satiety":4}},p),{"action":"rest"},p),p),
             {"infection":new_i,"hp":12-damage,"satiety":2,"character_day":2,"day":2})
    case("disease_suppression_before_damage",lambda:brief(apply(c.initial({"initial":{"location":"C4","hp":5,"infection":110,"suppression":15,"suppressant_used":True,"satiety":4}},p),{"action":"rest"},p),p),
         {"infection":115,"hp":3,"satiety":2,"suppression":0,"suppressant_used":False,"character_day":2})
    case("disease_actual_death_stops_food",lambda:brief(apply(c.initial({"initial":{"location":"C4","hp":3,"infection":110,"satiety":4,"points":90}},p),{"action":"rest"},p),p),
         {"status":"death","hp":0,"infection":130,"satiety":4,"character_day":1,"points":0})
    case("zero_base_exposure_two",lambda:brief(apply(c.initial({"initial":{"location":"C4","exposure":2,"suppression":15,"satiety":4}},p),{"action":"rest"},p),p),
         {"infection":25,"exposure":0,"hp":12})
    case("HP1_high_infection_legal_return_treat",lambda:brief(treat(apply(c.initial({"initial":{"hp":1,"infection":130,"points":110,"bleeding":True,"wound":True,"energy":0}},p),{"action":"failure"},p),p),p),
         {"status":"failure","hp":12,"infection":0,"points":10,"energy":0,"character_day":1})
    dead=hub(p,hp=1,points=100);c.terminal_death(dead,"fixture_actual_hp_zero");dead["hp"]=0
    rejected("HP0_no_service",dead,{"action":"hub_treat","quote":c.therapy_quote(dead,p)},"not_living_hub")
    rejected("HP0_no_launch",dead,{"action":"launch","task_id":"N","revision":dead["revision"]},"not_living_hub")
    for name,kwargs,price in [("body",{"hp":1},20),("processed_injury",{"injury":"light_laceration"},20),
                             ("low_infection",{"infection":1},40),("exposure",{"exposure":1},40),
                             ("high_infection",{"infection":130},80)]:
        s=hub(p,points=100,**kwargs)
        case("service_tier_"+name,lambda s=s:brief(treat(s,p),p),{"points":100-price,"hp":12,"infection":0,"exposure":0,"injury":"none"})
    s=hub(p,points=100,hp=1,satiety=1,infection=130,exposure=2,bleeding=True,wound=True,energy=7,
          painkiller=True,painkiller_used=True,suppression=15,suppressant_used=True,
          disinfectant_used=True,medical_doses=3,signature_used=True,pipe=7,coat=3,tool_resource=2,
          items=[{"type":"firstaid","location":"bank"},{"type":"ration","location":"bank"}])
    treated=treat(s,p)
    case("service_all_state_boundary",lambda:brief(treated,p),{"hp":12,"satiety":1,"energy":7,"points":20,"infection":0,"exposure":0,"bleeding":False,"wound":False,"injury":"none","painkiller":False,"suppression":0,"painkiller_used":True,"suppressant_used":True,"disinfectant_used":True,"medical_doses":3,"signature_used":True,"pipe":7,"coat":3,"tool_resource":2,"character_day":1})
    case("service_preserves_nontarget_state",lambda:{"same":all(s[k]==treated[k] for k in
         ("units","equipment","equipment_origin","facts","sources","visited","known_edges","enemies","task_id","world_id",
          "day","character_day","energy","satiety","pipe","coat","tool_resource","signature_used","disinfectant_used",
          "suppressant_used","painkiller_used","medical_doses","first_success","ready_next","status","location","pending"))},{"same":True})
    evidence["service_before"]=c.snapshot(s,p);evidence["service_after"]=c.snapshot(treated,p)
    rejected("service_replayed_old_quote",treated,{"action":"hub_treat","quote":c.therapy_quote(s,p)},"stale_quote")
    case("service_fresh_healthy_noop",lambda:{"identical":treat(treated,p)==treated},{"identical":True})
    pure=hub(p,points=100,painkiller=True,suppression=15,painkiller_used=True,suppressant_used=True,medical_doses=2)
    case("healthy_pure_drug_noop",lambda:{"identical":treat(pure,p)==pure},{"identical":True})
    rejected("service_insufficient_atomic",hub(p,hp=1,infection=130,points=79),{"action":"hub_treat","quote":c.therapy_quote(hub(p,hp=1,infection=130,points=79),p)},"insufficient_points")
    case("service_cancel",lambda:{"identical":apply(s,{"action":"hub_cancel"},p)==s},{"identical":True})
    changed=apply(s,{"action":"hub_use","item":"firstaid"},p)
    rejected("service_stale_after_real_medicine",changed,{"action":"hub_treat","quote":c.therapy_quote(s,p)},"stale_quote")
    # The one-injury model explicitly covers one eligible light injury only.
    case("old_firstaid_not_free_infection_cure",lambda:brief(changed,p),{"hp":5,"infection":130,"bleeding":False,"injury":"none","points":100})
    for name,value in [("negative",-1),("bool",True),("fraction",1.5),("nan",float("nan")),("overflow",2147483648)]:
        bad=hub(p,points=0);bad["points"]=value
        # NaN is never emitted as a JSON number; rejection string is the observation.
        case("invalid_balance_"+name,lambda bad=bad:{"error":reject(bad,{"action":"hub_cancel"},p)["error"]},{"error":"invalid_balance"},"expected_rejection")
    s=hub(p,points=120)
    rejected("wealth_without_eligibility",s,{"action":"hub_buy","item":"bandage","revision":s["revision"]},"missing_eligibility")
    s=hub(p,points=17,first_success=True)
    rejected("eligibility_insufficient_balance",s,{"action":"hub_buy","item":"bandage","revision":s["revision"]},"insufficient_points")
    s=hub(p,points=18,first_success=True)
    buy={"action":"hub_buy","item":"bandage","revision":s["revision"]}
    bought=apply(s,buy,p)
    case("purchase_exact_balance",lambda:brief(bought,p),{"points":0,"first_success":True,"inventory_by_location":{"bank":{"bandage":1}}})
    rejected("purchase_replay",bought,buy,"stale_purchase")
    fa=hub(p,points=45,first_success=True)
    case("medical_firstaid_unlocked_catalog",lambda:brief(apply(fa,{"action":"hub_buy","item":"firstaid","revision":fa["revision"]},p),p),
         {"points":0,"inventory_by_location":{"bank":{"firstaid":1}}})
    rejected("purchase_bad_destination",s,{"action":"hub_buy","item":"bandage","revision":s["revision"],"destination":"nowhere"},"invalid_purchase_destination")
    s=hub(p,points=2147483527,ready_next=True)
    launched=apply(s,{"action":"launch","task_id":"MAX","revision":s["revision"]},p)
    launched["facts"].add("installed")
    launched["units"].append({"id":"legal_sample.MAX","type":"sample","location":"pack","origin_task":"MAX"})
    case("headroom_exact_reward",lambda:brief(apply(launched,{"action":"success"},p),p),{"points":2147483647,"status":"success"})
    s=hub(p,points=2147483528,ready_next=True)
    rejected("headroom_insufficient_before_accept",s,{"action":"launch","task_id":"MAX","revision":s["revision"]},"insufficient_reward_headroom")
    good=apply(launched,{"action":"success"},p)
    rejected("success_reward_replay",good,{"action":"success"},"terminated")
    s=hub(p,points=50)
    case("launch_without_hub_rest_closes_day",lambda:brief(apply(s,{"action":"launch","task_id":"N","revision":s["revision"]},p),p),
         {"character_day":2,"satiety":4,"energy":100,"status":"active","ready_next":False})
    rejected("obsolete_hub_rest_rejected",s,{"action":"hub_rest"},"hub_rest_retired_use_launch")
    first=c.initial({"initial":{"first_entry":True}},p)
    case("first_launch_no_prior_day",lambda:brief(apply(first,{"action":"launch","task_id":"FIRST","revision":first["revision"]},p),p),
         {"character_day":1,"day":1,"satiety":6,"energy":100,"hp":12,"first_entry":False})
    once=apply(s,{"action":"launch","task_id":"N","revision":s["revision"]},p)
    once=apply(once,{"action":"failure"},p)
    case("new_task_after_immediate_failure_closes_new_day",lambda:brief(apply(once,{"action":"launch","task_id":"NEXT","revision":once["revision"]},p),p),
         {"character_day":3,"satiety":2,"energy":100,"task_id":"NEXT"})
    rejected("launch_stale_offer",s,{"action":"launch","task_id":"N","revision":s["revision"]-1},"stale_offer")
    normal=apply(s,{"action":"launch","task_id":"ALLOW","revision":s["revision"],"policy":"living_failure"},p)
    case("same_world_task_allow_failure",lambda:brief(apply(normal,{"action":"failure"},p),p),{"points":30,"status":"failure","character_day":2})
    restricted=apply(s,{"action":"launch","task_id":"RESTRICT","revision":s["revision"],"policy":"must_complete"},p)
    rejected("same_world_other_task_restrict_exit",restricted,{"action":"failure"},"task_forbids_failure_exit")
    restricted["day"]=7
    case("same_world_other_task_declared_deadline_death",lambda:brief(apply(restricted,{"action":"deadline"},p),p),
         {"hp":0,"status":"death","character_day":2,"energy":100,"points":0})
    # Provenance: new-first generic consumption; a chosen quick slot still selects the actual old unit.
    mixed=c.initial({"initial":{"hp":8,"initial_bandage":False,"items":[
        {"type":"bandage","id":"new.band","origin_task":"fixture_task","location":"pack"},
        {"type":"bandage","id":"old.band","origin_task":"before","location":"q1"},
        {"type":"metal","id":"old.metal","origin_task":"before","location":"pack"},
        {"type":"metal","id":"new.metal","origin_task":"fixture_task","location":"pack"}]}},p)
    used=apply(mixed,{"action":"use","item":"bandage","from":"q1"},p)
    returned=apply(used,{"action":"failure"},oldp)
    case("old_consumed_new_not_laundered",lambda:{"units":{u["id"]:u["location"] for u in returned["units"]}},
         {"units":{"old.band":"consumed","new.band":"recovered","old.metal":"bank","new.metal":"recovered"}})
    # Old/new in the same stack remain distinct identities after a drop and re-pick.
    dropping=apply(mixed,{"action":"drop","item":"metal","quantity":1},p)
    picking=apply(dropping,{"action":"pickup","source":"new","item":"metal","quantity":1},p)
    returning=apply(picking,{"action":"failure"},oldp)
    case("stack_drop_pickup_preserves_provenance",lambda:{"units":{u["id"]:u["location"] for u in returning["units"]}},
         {"units":{"old.metal":"bank","new.metal":"recovered"}})
    newgear=c.initial({"initial":{"equipment_origin":{"weapon":"fixture_task","armor":"before","utility":"before"}}},p)
    case("new_equipped_identity_failure_fixture",lambda:brief(apply(newgear,{"action":"failure"},oldp),oldp),
         {"equipment":{"weapon":None,"armor":"initial.coat","utility":"initial.crowbar"},"pipe":0,"coat":12,"tool_resource":12})
    # Converted benefits cannot be recovered as an unconsumed item; this is a documented residual risk.
    repair=c.initial({"initial":{"pipe":10,"items":[{"type":"metal","origin_task":"fixture_task"}]}},p)
    repair=apply(repair,{"action":"repair","target":"pipe"},p)
    case("new_metal_used_before_failure_residual",lambda:brief(apply(repair,{"action":"failure"},p),p),
         {"pipe":25,"energy":94,"points":0,"inventory_by_location":{"consumed":{"metal":1}}})
    meds=c.initial({"initial":{"location":"H2","exposure":1,"initial_bandage":False,"items":[{"type":"disinfectant","location":"ground:H2","id":"fixture.disinfectant","origin_task":"fixture_task"}]}},p)
    meds=apply(meds,{"action":"pickup","source":"fixture","item":"disinfectant","quantity":1,"destination":"q1"},p)
    case("disinfectant_quick_noncombat_allowed",lambda:brief(apply(meds,{"action":"use","item":"disinfectant","from":"q1"},p),p),
         {"exposure":0,"disinfectant_used":True,"energy":100})
    combatmed=encounter();combatmed["units"].append({"id":"quick.disinfectant","type":"disinfectant","location":"q2","origin_task":"before"});combatmed["exposure"]=1
    rejected("disinfectant_quick_not_combat_use",combatmed,{"action":"use","item":"disinfectant","from":"q2"},"pending_encounter")
    s=hub(p,pipe=15,tool_resource=7,items=[{"type":"metal","location":"bank"}])
    rejected("one_metal_not_double_restore",s,{"action":"hub_maintain","revision":s["revision"],"target":"mechanical","pipe":15,"tool":5},"invalid_repair_allocation")
    case("one_metal_actual_shared_restore",lambda:brief(apply(s,{"action":"hub_maintain","revision":s["revision"],"target":"mechanical","pipe":10,"tool":5},p),p),
         {"pipe":25,"tool_resource":12,"energy":100,"inventory_by_location":{"consumed":{"metal":1}}})
    s=hub(p,tool="flashlight",tool_resource=1,items=[{"type":"battery","location":"bank"}])
    case("hub_flashlight_actual_battery",lambda:brief(apply(s,{"action":"hub_maintain","revision":s["revision"],"target":"flashlight"},p),p),
         {"tool_resource":5,"inventory_by_location":{"consumed":{"battery":1}}})
    s=hub(p,tool="toolkit",tool_resource=1,items=[{"type":"metal","location":"bank"},{"type":"electronics","location":"bank"}])
    case("hub_toolkit_actual_materials",lambda:brief(apply(s,{"action":"hub_maintain","revision":s["revision"],"target":"toolkit"},p),p),
         {"tool_resource":4,"inventory_by_location":{"consumed":{"metal":1,"electronics":1}}})
    s=hub(p,coat=1,items=[{"type":"cloth","quantity":2,"location":"bank"}])
    repair_request={"action":"hub_maintain","target":"coat","revision":s["revision"]}
    partial=apply(s,repair_request,p)
    rejected("maintenance_replay_partial_target",partial,repair_request,"stale_maintenance")
    case("maintenance_new_request_continues",lambda:brief(apply(partial,{"action":"hub_maintain","target":"coat","revision":partial["revision"]},p),p),
         {"coat":12,"inventory_by_location":{"consumed":{"cloth":2}}})
    # Deadline and normal return expose different service timing; neither duplicates a night.
    deadline=c.initial({"initial":{"day":7,"character_day":7,"location":"C4","hp":5,"infection":110,"satiety":4,"points":110,"energy":7}},p)
    recalled=apply(deadline,{"action":"deadline"},p)
    treated=treat(recalled,p)
    launched=apply(treated,{"action":"launch","task_id":"AFTER_DEADLINE","revision":treated["revision"]},p)
    case("deadline_next_task_no_second_night",lambda:brief(launched,p),
         {"hp":12,"infection":0,"satiety":2,"character_day":8,"day":1,"energy":100,"points":10})
    normal=c.initial({"initial":{"day":7,"character_day":7,"hp":3,"infection":110,"satiety":4,"points":110,"energy":7}},p)
    normal=treat(apply(normal,{"action":"failure"},p),p)
    normal=prepare(normal,p,"AFTER_NORMAL")
    case("normal_treat_before_real_night",lambda:brief(normal,p),
         {"hp":12,"infection":0,"satiety":2,"character_day":8,"day":1,"energy":100,"points":10})
    death=c.initial({"initial":{"day":7,"character_day":7,"location":"C4","hp":3,"infection":110,"satiety":4,"points":110,"energy":7}},p)
    case("deadline_cannot_treat_before_hazards",lambda:brief(apply(death,{"action":"deadline"},p),p),
         {"hp":0,"status":"death","character_day":7,"satiety":4,"points":0,"energy":7})
    for name,val in [("negative",-1),("bool",True),("fraction",0.5),("nan",float("nan")),("overflow",2147483648)]:
        invalid=c.initial({},p);invalid["exposure"]=val
        case("invalid_exposure_"+name,lambda invalid=invalid:{"error":reject(invalid,{"action":"failure"},p)["error"]},
             {"error":"invalid_exposure"},"expected_rejection")
    overflow=c.initial({"initial":{"location":"C4","infection":2147483640,"satiety":4}},p)
    rejected("infection_growth_overflow_atomic",overflow,{"action":"rest"},"invalid_infection")
    for op in ("rest","deadline"):
        for label,val in [("negative",-1),("boolean",True),("NaN",float("nan"))]:
            invalid=c.initial({"initial":{"location":"C4","day":7 if op=="deadline" else 1}},p)
            invalid["exposure"]=val
            case("invalid_exposure_before_"+op+"_"+label,
                 lambda invalid=invalid,op=op:{"error":reject(invalid,{"action":op},p)["error"]},
                 {"error":"invalid_exposure"},"expected_rejection")
    invalid=c.initial({"initial":{"hp":1}},p);invalid["hp"]=0
    rejected("active_HP0_cannot_self_rescue",invalid,{"action":"use","item":"bandage","from":"q1"},"active_dead")
    for points in (39,40):
        s=hub(p,points=points,infection=20,hp=4,items=[{"type":"bandage","location":"bank"}])
        if points==39:rejected("tier40_balance39_retains_old_medicine",s,{"action":"hub_treat","quote":c.therapy_quote(s,p)},"insufficient_points")
        else:case("tier40_exact_balance40",lambda s=s:brief(treat(s,p),p),{"points":0,"hp":12,"infection":0,"inventory_by_location":{"bank":{"bandage":1}}})
    s=hub(p,points=0,hp=4,infection=20,satiety=4,items=[{"type":"bandage","location":"bank"}])
    s=apply(s,{"action":"hub_use","item":"bandage"},p)
    case("zero_points_real_old_medicine_then_real_night",lambda:brief(apply(s,{"action":"launch","task_id":"N","revision":s["revision"]},p),p),
         {"points":0,"hp":5,"infection":25,"satiety":2,"character_day":2,"inventory_by_location":{"consumed":{"bandage":1}}})
    s=c.initial({"initial":{"hp":1,"infection":130,"energy":0,"facts":["installed"],"items":[{"type":"sample","origin_task":"fixture_task"}]}},p)
    case("HP1_severe_success_reward_then_service",lambda:brief(treat(apply(s,{"action":"success"},p),p),p),
         {"points":40,"hp":12,"infection":0,"energy":0,"character_day":1})
    s=hub(p,points=100,infection=20)
    for label,value in [("negative",-1),("fraction",0.5),("bool",False)]:
        quote=c.therapy_quote(s,p);quote["price"]=value
        rejected("illegal_quote_price_"+label,s,{"action":"hub_treat","quote":quote},"invalid_quote")
    quote=c.therapy_quote(s,p);quote.pop("price")
    rejected("illegal_quote_price_missing",s,{"action":"hub_treat","quote":quote},"invalid_quote")
    quote=c.therapy_quote(s,p);quote["price"]=0
    rejected("forged_free_tier40_quote",s,{"action":"hub_treat","quote":quote},"stale_quote")
    s=hub(p,points=100,first_success=True)
    for label,value in [("negative",-1),("zero",0),("fraction",0.5),("bool",True)]:
        rejected("invalid_purchase_quantity_"+label,s,{"action":"hub_buy","item":"bandage","revision":s["revision"],"quantity":value},"invalid_purchase_quantity")
    s=hub(p,points=100,infection=20)
    quote=c.therapy_quote(s,p);quote["price"]=40.0
    rejected("illegal_quote_equal_float40",s,{"action":"hub_treat","quote":quote},"invalid_quote")
    healthy=hub(p,points=100)
    quote=c.therapy_quote(healthy,p);quote["price"]=False
    rejected("illegal_quote_healthy_false",healthy,{"action":"hub_treat","quote":quote},"invalid_quote")
    ready=hub(p,ready_next=True,signature_used=True,disinfectant_used=True,suppressant_used=True,
              painkiller_used=True,medical_doses=3,suppression=15,painkiller=True)
    case("launch_keeps_current_real_day_dose_flags",lambda:brief(apply(ready,{"action":"launch","task_id":"FLAGS","revision":ready["revision"]},p),p),
         {"day":1,"character_day":1,"signature_used":True,"disinfectant_used":True,"suppressant_used":True,
          "painkiller_used":True,"medical_doses":3,"suppression":15,"painkiller":True})
    for task_id in ("before","hub_purchase",""):
        rejected("reserved_or_empty_task_id_"+(task_id or "empty"),ready,
                 {"action":"launch","task_id":task_id,"revision":ready["revision"]},"invalid_task_id")
    old=hub(p,ready_next=True,initial_bandage=False,items=[{"type":"bandage","location":"bank","origin_task":"before"}])
    old=apply(old,{"action":"hub_load","item":"bandage","quantity":1},p)
    old=apply(old,{"action":"launch","task_id":"VALID_NEXT","revision":old["revision"]},p)
    case("valid_next_task_old_identity_retained",lambda:brief(apply(old,{"action":"failure"},p),p),
         {"inventory_by_location":{"bank":{"bandage":1}}})
    quick=c.initial({"initial":{"initial_bandage":False,"items":[{"type":"bandage","location":"q1","origin_task":"fixture_task"}]}},p)
    case("new_quick_item_not_laundered",lambda:brief(apply(quick,{"action":"failure"},oldp),oldp),
         {"inventory_by_location":{"recovered":{"bandage":1}}})
    # Local parameter perturbations keep the selected route authored; no auto rerouting.
    indexed={x["id"]:x for x in specs["scenarios"]}
    v=copy.deepcopy(p);v["limits"]["days"]=6
    def changed_route(route,pp):
        sp=copy.deepcopy(indexed[route])
        for a in sp["steps"]:a.pop("expect",None)
        r=c.run_route(sp,pp)
        return {"error":r["error"],"final":r.get("final",{})}
    case("deadline6_normal_route",lambda:changed_route("normal_five",v),{"error":None,"final":{"status":"success","day":3}})
    case("deadline6_damaged_route_rejected",lambda:changed_route("damaged_split_five",v),{"error":"no_day_eight","final":{"day":6}},"expected_rejection")
    vmap=copy.deepcopy(p);vmap["topology"]["five_edges"]=[e for e in vmap["topology"]["five_edges"] if set(e)!={"T0","P0"}]
    case("map_remove_T0_P0_authored_route_rejected",lambda:changed_route("normal_five",vmap),{"error":"not_adjacent"},"expected_rejection")

    # The continued v1.3 sequences are below; these never run a hidden Hub rest.
    run_continuous(p,specs,case,evidence)
    from checks_v1_3 import run_additional
    run_additional(p,specs,case,evidence)
    return results,evidence

def run_continuous(p,specs,case,evidence):
    indexed={x["id"]:x for x in specs["scenarios"]}
    base_steps=copy.deepcopy(indexed["normal_five"]["steps"])
    for a in base_steps:a.pop("expect",None)
    pharmacy=[{"action":"move","to":"H1"},{"action":"move","to":"H2"},{"action":"search","source":"H_pharmacy"},
              {"action":"pickup","source":"H_pharmacy","item":"bandage","quantity":1},
              {"action":"move","to":"H1"},{"action":"move","to":"H0"}]
    logistics=[{"action":"move","to":n} for n in ("H1","H7","L0","L1")]
    logistics += [{"action":"L_front_open","method":"manual"},{"action":"search","source":"L_front"},
                  {"action":"pickup","source":"L_front","item":"bandage","quantity":1},
                  {"action":"pickup","source":"L_front","item":"ration","quantity":2}]
    logistics += [{"action":"move","to":n} for n in ("L0","H7","H1","H0")]
    def execute(s,steps,pp):
        nominal=0;days={}
        for a in steps:
            day=s["day"];s,cost,_=c.perform(s,a,pp);nominal+=cost;days[str(day)]=days.get(str(day),0)+cost
            if s["status"]=="death":break
        return s,{"nominal_energy":nominal,"task_days":days}
    def failures(route="pharmacy",use=False,food=False,start_hp=12,heal=1,old_policy=False,points=0,infection=0,repair=False,treat_first=False):
        pp=copy.deepcopy(p);pp["health"]["bandage_heal"]=heal
        if old_policy:pp["economy"].update(failure_penalty=30,recover_new_on_failure=True)
        s=c.initial({"initial":{"task_id":"F01","hp":start_hp,"points":points,"infection":infection,"pipe":10 if repair else 30}},pp)
        rows=[];used_count=0;food_count=0;no_target=0;attempted=0
        for n in range(1,11):
            if n>1:
                s=prepare(s,pp,"F%02d"%n)
                if s["status"]=="death":break
            attempted=n;start=brief(s,pp)
            steps=copy.deepcopy(pharmacy if route=="pharmacy" else logistics)
            if repair:steps[-1:-1]=[{"action":"search","source":"H_hall"},{"action":"pickup","source":"H_hall","item":"metal","quantity":1}]
            s,budget=execute(s,steps,pp)
            if repair and s["pipe"]<30:
                s,cost,_=c.perform(s,{"action":"repair","target":"pipe"},pp)
                budget["nominal_energy"]+=cost
            if use:
                if s["hp"]<12 or s["bleeding"] or s["wound"]:
                    s=apply(s,{"action":"use","item":"bandage","from":"pack"},pp);used_count+=1
                else:
                    no_target+=1
                    assert reject(s,{"action":"use","item":"bandage","from":"pack"},pp)["error"]=="no_medical_target"
            if food:
                while s["satiety"]<6 and c.count(s,"ration",("pack",)):
                    s=apply(s,{"action":"use","item":"ration","from":"pack"},pp);food_count+=1
            s=apply(s,{"action":"failure"},pp)
            before_service=brief(s,pp)
            if treat_first and n==1:s=treat(s,pp)
            rows.append({"task":n,"start":start,"return":before_service,"after_service":brief(s,pp),"nominal_energy":budget["nominal_energy"]})
        actual={"final":brief(s,pp),"used_new_bandages":used_count,"used_new_rations":food_count,
                "full_health_rejections":no_target,"recovered_new_bandages":c.count(s,"bandage",("recovered",)),
                "exploration_energy":sum(x["nominal_energy"] for x in rows),"completed_tasks":len(rows),
                "inter_task_nights":s["character_day"]-1,"offered_supply":"10 distinct explicit IDs with identical fixed sources; no entry fee; finite assumption",
                "policy":"old30_recovery" if old_policy else "main20_retain","start_hp":start_hp,"start_infection":infection,"start_points":points,
                "net_points":s["points"]-points}
        if s["status"]!="death":
            continuation=prepare(s,pp,"F11")
            actual["separate_eleventh_launch"]=brief(continuation,pp)
        return actual,{"rounds":rows,"key_final_state":c.snapshot(s,pp),"summary":actual}
    failure_cases=[
      ("failure_loot_10",{},{"final":{"hp":5,"satiety":0,"character_day":10,"points":0,"inventory_by_location":{"bank":{"bandage":11}}},"used_new_bandages":0,"recovered_new_bandages":0,"exploration_energy":200}),
      ("failure_self_use_10",{"use":True},{"final":{"hp":12,"satiety":0,"character_day":10},"used_new_bandages":7,"recovered_new_bandages":0,"full_health_rejections":3}),
      ("low_HP4_base_self_use_10",{"use":True,"start_hp":4},{"final":{"hp":7,"satiety":0},"used_new_bandages":10,"separate_eleventh_launch":{"hp":6}}),
      ("low_HP4_survival_OPTION_self_use_10",{"use":True,"start_hp":4,"heal":2},{"final":{"hp":12,"satiety":0},"used_new_bandages":10,"separate_eleventh_launch":{"hp":11}}),
      ("old_policy_pharmacy_loot_10",{"old_policy":True},{"final":{"hp":5,"satiety":0},"recovered_new_bandages":10}),
      ("old_policy_pharmacy_self_use_10",{"old_policy":True,"use":True},{"final":{"hp":12,"satiety":0},"used_new_bandages":7,"recovered_new_bandages":3}),
      ("logistics50_HP12_same_start_main_10",{"route":"logistics","use":True,"food":True},{"final":{"hp":12,"satiety":6,"character_day":10,"points":0,"inventory_by_location":{"bank":{"bandage":11,"ration":11}}},"used_new_bandages":0,"used_new_rations":9,"exploration_energy":500}),
      ("logistics50_HP12_same_start_old_10",{"route":"logistics","use":True,"food":True,"old_policy":True},{"final":{"hp":12,"satiety":6,"points":0,"inventory_by_location":{"bank":{"bandage":1},"recovered":{"bandage":10,"ration":11}}},"used_new_bandages":0,"used_new_rations":9,"exploration_energy":500}),
      ("logistics50_lowHP4_main_10",{"route":"logistics","use":True,"food":True,"start_hp":4},{"final":{"hp":12,"satiety":6,"character_day":10,"energy":50,"points":0,"inventory_by_location":{"bank":{"bandage":3,"ration":11}}},"used_new_bandages":8,"used_new_rations":9,"exploration_energy":500,"separate_eleventh_launch":{"hp":12,"satiety":4}}),
      ("logistics50_lowHP4_old_policy_10",{"route":"logistics","use":True,"food":True,"start_hp":4,"old_policy":True},{"final":{"hp":12,"satiety":6,"points":0,"inventory_by_location":{"bank":{"bandage":1},"recovered":{"bandage":2,"ration":11}}},"used_new_bandages":8,"used_new_rations":9,"exploration_energy":500}),
      ("logistics50_lowHP4_survival_OPTION_10",{"route":"logistics","use":True,"food":True,"start_hp":4,"heal":2},{"final":{"hp":12,"satiety":6,"inventory_by_location":{"bank":{"bandage":7,"ration":11}}},"used_new_bandages":4,"used_new_rations":9}),
      ("logistics50_with_old_points100_10",{"route":"logistics","use":True,"food":True,"start_hp":4,"points":100},{"final":{"hp":12,"satiety":6,"points":0},"net_points":-100,"completed_tasks":10}),
      ("logistics50_no_use_lowHP4_main",{"route":"logistics","start_hp":4},{"final":{"status":"death","hp":0,"satiety":0,"character_day":6,"points":0},"completed_tasks":6,"exploration_energy":300}),
      ("logistics50_infected25_lowHP4_main",{"route":"logistics","use":True,"food":True,"start_hp":4,"infection":25},{"final":{"hp":2,"infection":150,"satiety":6,"character_day":10,"points":0},"completed_tasks":10,"used_new_bandages":10,"separate_eleventh_launch":{"status":"death","hp":0,"infection":170,"satiety":6}}),
      ("logistics50_with_old_points100_old_policy_10",{"route":"logistics","use":True,"food":True,"start_hp":4,"points":100,"old_policy":True},{"final":{"hp":12,"satiety":6,"points":0},"net_points":-100,"completed_tasks":10}),
      ("logistics50_infected25_lowHP4_old_policy",{"route":"logistics","use":True,"food":True,"start_hp":4,"infection":25,"old_policy":True},{"final":{"hp":2,"infection":150,"satiety":6,"points":0},"completed_tasks":10,"separate_eleventh_launch":{"status":"death","hp":0,"infection":170}}),
      ("logistics50_no_use_lowHP4_old_policy",{"route":"logistics","start_hp":4,"old_policy":True},{"final":{"status":"death","hp":0,"character_day":6},"completed_tasks":6,"exploration_energy":300}),
      ("logistics50_infected25_points100_service",{"route":"logistics","use":True,"food":True,"start_hp":4,"infection":25,"points":100,"treat_first":True},{"final":{"hp":12,"infection":0,"satiety":6,"points":0},"used_new_bandages":1,"completed_tasks":10}),
      ("logistics_plus_hall_med_food_repair_main",{"route":"logistics","use":True,"food":True,"start_hp":4,"repair":True},{"final":{"hp":12,"satiety":6,"pipe":30,"inventory_by_location":{"bank":{"metal":8},"consumed":{"metal":2}}},"exploration_energy":632}),
      ("logistics_plus_hall_med_food_repair_old",{"route":"logistics","use":True,"food":True,"start_hp":4,"repair":True,"old_policy":True},{"final":{"hp":12,"satiety":6,"pipe":30,"inventory_by_location":{"recovered":{"metal":8},"consumed":{"metal":2}}},"exploration_energy":632}),
    ]
    for name,kwargs,expected in failure_cases:
        def fn(name=name,kwargs=kwargs):
            actual,detail=failures(**kwargs);evidence["continuous"][name]=detail;return actual
        case(name,fn,expected)
    def buy(s,item):return apply(s,{"action":"hub_buy","item":item,"revision":s["revision"]},p)
    def successes(sequence):
        s=c.initial({"initial":{"task_id":"SEQ01"}},p);rows=[];purchases=[];first=True
        for k,kind in enumerate(sequence,1):
            if k>1:s=prepare(s,p,"SEQ%02d"%k,feed=True)
            start=brief(s,p)
            s,budget=execute(s,base_steps if kind=="S" else pharmacy+[{"action":"failure"}],p)
            returned=brief(s,p)
            if kind=="S":
                s=treat(s,p);s=buy(s,"metal");purchases.append("metal")
                if first:
                    for item in ("ration","ration","bandage"):s=buy(s,item);purchases.append(item)
                    first=False
                for args in ({"target":"mechanical","pipe":30-s["pipe"]},{"target":"mechanical","tool":12-s["tool_resource"]},{"target":"coat"}):
                    s=apply(s,{"action":"hub_maintain","revision":s["revision"],**args},p)
            rows.append({"task":k,"kind":kind,"start":start,"return":returned,"after_preparation":brief(s,p),"budget":budget})
        summary={"final":brief(s,p),"task_count":len(sequence),"successes":sequence.count("S"),"failures":sequence.count("F"),
                 "purchases":purchases,"total_nominal_energy":sum(x["budget"]["nominal_energy"] for x in rows)}
        return summary,{"rounds":rows,"key_final_state":c.snapshot(s,p),"summary":summary}
    for name,sequence,expected in [
        ("same_supply_success_10_actual_maintenance",["S"]*10,{"final":{"hp":12,"satiety":4,"infection":0,"points":642,"character_day":30,"pipe":30,"coat":12,"tool_resource":12,"energy":24,"inventory_by_location":{"bank":{"ration":24,"bandage":12,"battery":10},"consumed":{"metal":20,"cloth":10,"ration":28}}},"successes":10,"total_nominal_energy":2690}),
        ("success_failure_success_no_new_starter",["S","F","S"],{"final":{"hp":12,"satiety":4,"infection":0,"points":78,"character_day":7,"pipe":30,"coat":12,"tool_resource":12,"inventory_by_location":{"bank":{"ration":7,"bandage":5,"battery":2}}},"successes":2,"failures":1,"total_nominal_energy":558})]:
        def fn(name=name,sequence=sequence):
            actual,detail=successes(sequence);evidence["continuous"][name]=detail;return actual
        case(name,fn,expected)
