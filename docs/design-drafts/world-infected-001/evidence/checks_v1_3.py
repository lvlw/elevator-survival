"""Additional bounded 003 examples; all mutations go through common perform.
Independent fixtures are labeled; no production implementation or task generator.
"""
import copy
import check_design as c
from joint_checks import apply, brief, reject, hub, treat

def run_additional(p,specs,case,evidence):
    def rejected(name,s,a,reason,pp=p):
        case(name,lambda:reject(s,a,pp),{"error":reason,"unchanged":True},"expected_rejection")
    def execute(s,steps,pp=p):
        total=0
        for a in steps:
            s,cost,_=c.perform(s,a,pp);total+=cost
            if s["status"]=="death":break
        return s,total
    def launch(s,task="N",pp=p):return apply(s,{"action":"launch","task_id":task,"revision":s["revision"]},pp)
    def buy(s,item,pp=p):return apply(s,{"action":"hub_buy","item":item,"revision":s["revision"]},pp)
    def load(s,item,n=1,location="pack",pp=p):return apply(s,{"action":"hub_load","item":item,"quantity":n,"destination":location},pp)
    def locs(s):return {u["id"]:u["location"] for u in s["units"]}
    indexed={x["id"]:x for x in specs["scenarios"]}
    normal=[{k:v for k,v in a.items() if k not in ("expect","label")} for a in indexed["normal_five"]["steps"]]
    # A full common-perform success is the medical-unlock witness; no injected installed fact.
    complete,_=execute(c.initial({},p),normal)
    medicine=buy(buy(complete,"bandage"),"firstaid")
    case("full_mission_unlocks_both_medical_items",lambda:brief(medicine,p),
         {"points":57,"first_success":True,"inventory_by_location":{"bank":{"bandage":3,"firstaid":1}}})
    evidence["full_medical_unlock_state"]=c.snapshot(medicine,p)
    rich=hub(p,points=100)
    rejected("firstaid_before_full_success",rich,{"action":"hub_buy","item":"firstaid","revision":0},"missing_eligibility")
    partial=apply(c.initial({"initial":{"points":100,"items":[{"type":"sample","origin_task":"fixture_task"}]}},p),{"action":"failure"},p)
    rejected("partial_sample_delivery_not_medical_unlock",partial,{"action":"hub_buy","item":"bandage","revision":partial["revision"]},"missing_eligibility")
    case("partial_delivery_has_no_reward",lambda:brief(partial,p),{"points":80,"first_success":False,"inventory_by_location":{"delivered_partial":{"sample":1}}})
    base=rich
    for item in ("ration","metal","cloth","battery"):base=buy(base,item)
    case("base_catalog_works_without_success",lambda:brief(base,p),
         {"points":56,"first_success":False,"inventory_by_location":{"bank":{"ration":1,"metal":1,"cloth":1,"battery":1}}})
    for item in ("electronics","disinfectant","unknown"):
        rejected("catalog_closed_"+item,rich,{"action":"hub_buy","item":item,"revision":0},"catalog_item_closed")
    for label,value in (("negative",-1),("float_equal",10.0),("bool",True)):
        rejected("purchase_price_"+label,rich,{"action":"hub_buy","item":"ration","revision":0,"price":value},"invalid_purchase_price")
    rejected("purchase_price_stale",rich,{"action":"hub_buy","item":"ration","revision":0,"price":9},"stale_purchase_price")
    rejected("purchase_revision_boolean",rich,{"action":"hub_buy","item":"ration","revision":False},"stale_purchase")
    rejected("purchase_cannot_forge_origin",rich,{"action":"hub_buy","item":"ration","revision":0,"origin_task":"before"},"immutable_item_identity")
    rejected("base_purchase_insufficient",hub(p,points=9),{"action":"hub_buy","item":"ration","revision":0},"insufficient_points")
    case("purchase_cancel_no_effect",lambda:{"same":apply(rich,{"action":"hub_cancel","context":"purchase"},p)==rich},{"same":True})
    paid=buy(hub(p,points=10),"ration")
    case("base_purchase_exact_and_real_unit",lambda:{"points":paid["points"],"unit":next(u for u in paid["units"] if u["location"]=="bank")},
         {"points":0,"unit":{"id":"purchase.0","type":"ration","location":"bank","origin_task":"hub_purchase"}})
    rejected("base_purchase_replayed",paid,{"action":"hub_buy","item":"ration","revision":0},"stale_purchase")
    # Physical availability and shop eligibility are separate.
    found=c.initial({"initial":{"hp":4,"infection":25,"exposure":1,"injury":"light_laceration","wound":True,"bleeding":True,
                               "items":[{"type":"firstaid","origin_task":"fixture_task"}]}},p)
    case("looted_firstaid_usable_before_unlock",lambda:brief(apply(found,{"action":"use","item":"firstaid"},p),p),
         {"hp":8,"infection":25,"exposure":1,"bleeding":False,"injury":"none","first_success":False,"inventory_by_location":{"consumed":{"firstaid":1}}})
    heavy=hub(p,hp=4,injury="heavy_fracture",items=[{"type":"firstaid","location":"bank"}])
    case("firstaid_preserves_incompatible_heavy_injury",lambda:brief(apply(heavy,{"action":"hub_use","item":"firstaid"},p),p),
         {"hp":8,"injury":"heavy_fracture"})
    quick=buy(hub(p,points=45,first_success=True),"firstaid")
    rejected("firstaid_not_quick",quick,{"action":"hub_load","item":"firstaid","quantity":1,"destination":"q2"},"quick_slot_type")
    packed=load(quick,"firstaid")
    case("firstaid_real_geometry",lambda:c.geometry(packed,p),{"weight":2,"cells":2,"rectangles":[{"type":"firstaid","unit_ids":["purchase.0"],"xywh":[0,0,1,2]}]})
    fight=c.initial({"initial":{"location":"L2","pending":{"enemy":"L","from":"L1"},"items":[{"type":"firstaid"}],"hp":4}},p)
    rejected("firstaid_cannot_use_in_combat",fight,{"action":"use","item":"firstaid"},"pending_encounter")
    full=hub(p,points=585,first_success=True)
    for _ in range(12):full=load(buy(full,"firstaid"),"firstaid")
    case("twelve_unstackable_firstaid_fit",lambda:{"geometry":c.geometry(full,p),"points":full["points"]},
         {"geometry":{"weight":24,"cells":24},"points":45})
    full=buy(full,"firstaid")
    rejected("thirteenth_firstaid_load_geometry",full,{"action":"hub_load","item":"firstaid","quantity":1},"grid_full")
    evidence["full_pack_before_rejected_load"]=c.snapshot(full,p)
    # Launch validation is before any irreversible health/date mutation.
    lethal=hub(p,hp=1,bleeding=True,wound=True,energy=0,points=0)
    for name,amend,reason in [
       ("stale",{"revision":-1},"stale_offer"),("unknown",{"task_id":"NOT_OFFERED"},"task_not_offered"),
       ("reuse",{"task_id":"fixture_task"},"offer_already_used"),("policy",{"policy":"must_complete"},"unknown_task_policy"),
       ("world",{"world_id":"invented"},"unknown_offer_world"),("version",{"offer_version":"old"},"stale_offer_version")]:
        rejected("launch_validate_before_hazards_"+name,lethal,{"action":"launch","task_id":"N","revision":0,**amend},reason)
    bad=copy.deepcopy(lethal);bad["units"].append(copy.deepcopy(bad["units"][0]))
    rejected("launch_invalid_identity_before_hazards",bad,{"action":"launch","task_id":"N","revision":0},"duplicate_instance")
    bad=copy.deepcopy(lethal);bad["units"][0]["type"]="firstaid"
    rejected("launch_invalid_quick_before_hazards",bad,{"action":"launch","task_id":"N","revision":0},"quick_slot_type")
    bad=copy.deepcopy(lethal);bad["rules_version"]="old"
    rejected("launch_bound_rules_version",bad,{"action":"launch","task_id":"N","revision":0},"bound_rules_version_mismatch")
    preview,_,detail=c.perform(lethal,{"action":"hub_launch_preview","task_id":"N","revision":0},p)
    case("launch_preview_is_static",lambda:{"same":preview==lethal,"detail":detail},
         {"same":True,"detail":{"preview_only":True,"handoff_due":True}})
    case("launch_cancel_is_static",lambda:{"same":apply(lethal,{"action":"hub_cancel","context":"launch"},p)==lethal},{"same":True})
    dead=launch(lethal)
    case("valid_lethal_handoff_commits_without_new_activity",lambda:brief(dead,p),
         {"hp":0,"status":"death","character_day":1,"task_id":"fixture_task","active_task_id":None,"energy":0})
    case("lethal_handoff_does_not_consume_offer",lambda:{"unchanged":dead["used_task_ids"]==lethal["used_task_ids"]},{"unchanged":True})
    unstable=copy.deepcopy(lethal);unstable["pending"]={"enemy":"L","from":"L1"}
    rejected("launch_unresolved_hub_encounter_before_hazards",unstable,{"action":"launch","task_id":"N","revision":0},"not_stable_hub")
    unstable=copy.deepcopy(lethal);unstable["active_task_id"]="still_active_previous"
    rejected("launch_active_task_in_hub_before_hazards",unstable,{"action":"launch","task_id":"N","revision":0},"not_stable_hub")
    foreign=copy.deepcopy(lethal);foreign["units"].append({"id":"old.card","type":"card","location":"pack","origin_task":"before"})
    rejected("launch_world_permission_not_cross_task",foreign,{"action":"launch","task_id":"N","revision":0},"task_bound_item_not_exportable")
    # A real consumed item between preview and confirmation changes both quote and hazards.
    editable=hub(p,hp=1,bleeding=True,wound=True,items=[{"type":"bandage","location":"bank"}])
    healed=apply(editable,{"action":"hub_use","item":"bandage"},p)
    rejected("launch_old_preview_stale_after_treatment",healed,{"action":"launch","task_id":"N","revision":0},"stale_offer")
    case("launch_reads_latest_healed_body",lambda:brief(launch(healed),p),
         {"hp":2,"bleeding":False,"injury":"light_laceration","character_day":2,"satiety":4})
    hungry=hub(p,hp=1,satiety=0,points=10)
    fed=apply(buy(hungry,"ration"),{"action":"hub_use","item":"ration"},p)
    case("meal_before_launch_is_real_not_free",lambda:brief(launch(fed),p),
         {"hp":0,"status":"death","satiety":0,"character_day":1,"points":0,"inventory_by_location":{"consumed":{"ration":1}}})
    # Two food units are needed at satiety0 to avoid the next boundary starvation.
    fed2=hub(p,hp=1,satiety=0,points=20)
    for _ in range(2):fed2=apply(buy(fed2,"ration"),{"action":"hub_use","item":"ration"},p)
    case("two_prelaunch_meals_avoid_starvation",lambda:brief(launch(fed2),p),
         {"hp":1,"satiety":2,"character_day":2,"status":"active","points":0})
    active=launch(hub(p,hp=8,items=[{"type":"ration","location":"bank"}]))
    rejected("after_launch_cannot_eat_bank",active,{"action":"use","item":"ration","from":"bank"},"not_carried_source")
    rejected("after_launch_no_hub_medicine",active,{"action":"hub_use","item":"ration"},"not_living_hub")
    for amount,meals,hp in ((40,0,11),(50,1,11),(60,2,12)):
        money=hub(p,hp=1,infection=25,satiety=0,points=amount,initial_bandage=False)
        money=treat(money,p)
        for _ in range(meals):money=apply(buy(money,"ration"),{"action":"hub_use","item":"ration"},p)
        case("service_food_total_budget_"+str(amount),lambda money=money:brief(launch(money),p),
             {"points":0,"hp":hp,"infection":0,"satiety":max(0,2*meals-2),"character_day":2,"status":"active"})
    # Deadline allowance is bound to a just-completed cycle and consumed once.
    d=c.initial({"initial":{"day":7,"character_day":7,"location":"C4","infection":25,"exposure":1,
                           "injury":"light_contusion","items":[{"type":"suppressant","location":"bank"},{"type":"painkiller","location":"bank"}]}},p)
    d=apply(d,{"action":"deadline"},p)
    for item in ("suppressant","painkiller"):d=apply(d,{"action":"hub_use","item":item},p)
    first=launch(d,"D_NEXT")
    case("deadline_launch_keeps_current_cycle_medicine",lambda:brief(first,p),
         {"character_day":8,"day":1,"infection":50,"suppression":15,"suppressant_used":True,"painkiller":True,"medical_doses":2,"ready_next":False,"settled_cycle":None})
    again=launch(apply(first,{"action":"failure"},p),"D_AFTER")
    case("deadline_allowance_cannot_skip_second_cycle",lambda:brief(again,p),
         {"character_day":9,"infection":50,"satiety":2,"suppression":0,"medical_doses":0,"painkiller":False})
    invalid=copy.deepcopy(d);invalid["settled_cycle"]=6
    rejected("deadline_bad_completed_cycle_rejected",invalid,{"action":"launch","task_id":"D_NEXT","revision":invalid["revision"]},"invalid_settled_cycle")
    # F02 single-point fixture names every completed disposition explicitly.
    dispositions=("delivered","delivered_partial","recovered","consumed","installed","impounded","penalized","lost")
    prior=hub(p,hp=1,bleeding=True,wound=True,points=40,initial_bandage=False,
              items=[{"type":"metal","location":v,"id":"history."+v} for v in dispositions]+
                    [{"type":"bandage","location":v,"id":"current."+v} for v in ("bank","pack","q1","ground:H1")])
    terminal=launch(prior)
    case("F02_current_assets_only",lambda:{"locations":locs(terminal),"points":terminal["points"],"equipment":terminal["equipment"]},
         {"locations":{**{"history."+v:v for v in dispositions},**{"current."+v:"lost" for v in ("bank","pack","q1","ground:H1")}},
          "points":0,"equipment":{"weapon":None,"armor":None,"utility":None}})
    repeated=copy.deepcopy(terminal);c.terminal_death(repeated,"different_later_reason")
    case("F02_repeated_death_and_history_read",lambda:{"same":repeated==terminal,"read_same":c.snapshot(repeated,p)==c.snapshot(terminal,p)},
         {"same":True,"read_same":True})
    evidence["F02_before"]=c.snapshot(prior,p);evidence["F02_after"]=c.snapshot(terminal,p)
    # Full success then a real new-world fight death, without rewriting submitted success.
    death_steps=[{"action":"move","to":"H1"},{"action":"H_firedoor_open"},{"action":"move","to":"H4"},{"action":"combat","trace":"H_wound"}]
    later,_=execute(launch(complete,"AFTER_SUCCESS"),death_steps)
    case("F02_full_success_next_task_real_death",lambda:{"final":brief(later,p),"old_sample":locs(later)["quest_sample.fixture_task.sample.1"]},
         {"final":{"status":"death","hp":0,"points":0,"last_settled_result":{"task_id":"fixture_task","outcome":"success","reward":120}},
          "old_sample":"delivered"})
    evidence["F02_success_then_death"]=c.snapshot(later,p)
    # Independent low-buffer route: HP9/I20 -> HP1/I50 complete success, then I60 kills at launch.
    fragile,_=execute(c.initial({"initial":{"hp":9,"infection":20}},p),normal)
    fragile_dead=launch(fragile,"NEXT")
    case("F02_full_success_then_launch_disease_death",lambda:{"before":brief(fragile,p),"after":brief(fragile_dead,p),
          "sample_location":locs(fragile_dead)["quest_sample.fixture_task.sample.1"],
          "offer_unconsumed":fragile_dead["used_task_ids"]==fragile["used_task_ids"]},
         {"before":{"status":"success","hp":1,"infection":50,"points":120,"satiety":4},
          "after":{"status":"death","hp":0,"infection":60,"points":0,"satiety":4,"character_day":3,"day":3,
                   "task_id":"fixture_task","active_task_id":None,"last_settled_result":{"outcome":"success","reward":120}},
          "sample_location":"delivered","offer_unconsumed":True})
    evidence["F02_success_then_launch_death"]={"before":c.snapshot(fragile,p),"after":c.snapshot(fragile_dead,p)}

    oldp=copy.deepcopy(p);oldp["economy"].update(failure_penalty=30,recover_new_on_failure=True)
    pharmacy=[{"action":"move","to":"H1"},{"action":"move","to":"H2"},{"action":"search","source":"H_pharmacy"},
              {"action":"pickup","source":"H_pharmacy","item":"bandage","quantity":1},{"action":"move","to":"H1"},{"action":"move","to":"H0"},{"action":"failure"}]
    prior_failed,_=execute(c.initial({"initial":{"hp":4,"points":50}},oldp),pharmacy,oldp)
    later_failed,_=execute(launch(prior_failed,"AFTER_FAILURE",oldp),death_steps,oldp)
    case("F02_failed_recovery_history_next_task_death",lambda:{"final":brief(later_failed,p),"old_new_band":locs(later_failed)["H_pharmacy.fixture_task.bandage.1"]},
         {"final":{"status":"death","hp":0,"last_settled_result":{"outcome":"failure","fee":30}},"old_new_band":"recovered"})
    # Current main keeps both old and new physical units, including selected quick units.
    mixed=c.initial({"initial":{"hp":8,"initial_bandage":False,"items":[
        {"id":"a.old","type":"bandage","origin_task":"before"},{"id":"z.new","type":"bandage","origin_task":"fixture_task"}]}},p)
    used=apply(mixed,{"action":"use","item":"bandage"},p)
    returned=apply(used,{"action":"failure"},p)
    case("main_stable_identity_selection_no_new_priority",lambda:{"locations":locs(returned)},
         {"locations":{"a.old":"consumed","z.new":"bank"}})
    usedold=apply(mixed,{"action":"use","item":"bandage"},oldp)
    case("old_policy_explicit_new_first_comparison",lambda:{"locations":locs(usedold)},
         {"locations":{"a.old":"pack","z.new":"consumed"}})
    # Honest damaged stop: actual normal prefix through communications fight, then real route home.
    prefix=normal[:37]+[{"action":"move","to":"C1"},{"action":"move","to":"C0"},{"action":"move","to":"H0"},{"action":"failure"}]
    honest,cost=execute(c.initial({"initial":{"points":40}},p),prefix)
    case("honest_damaged_failure_retains_legal_loot",lambda:{"final":brief(honest,p),"nominal":cost},
         {"final":{"hp":6,"exposure":1,"points":20,"first_success":False,"pipe":20,"coat":9,"tool_resource":8,
                   "inventory_by_location":{"bank":{"bandage":2,"ration":5,"metal":2,"cloth":1,"battery":1},"impounded":{"control":1}}}})
    rejected("honest_failure_insufficient_infection_service",honest,{"action":"hub_treat","quote":c.therapy_quote(honest,p)},"insufficient_points")
    evidence["honest_failure"]=c.snapshot(honest,p)
    honest_old,old_cost=execute(c.initial({"initial":{"points":40}},oldp),prefix,oldp)
    case("honest_damaged_failure_old_same_actions",lambda:{"final":brief(honest_old,oldp),"same_cost":old_cost==cost},
         {"same_cost":True,"final":{"hp":6,"exposure":1,"points":10,"first_success":False,"pipe":20,"coat":9,"tool_resource":8,
          "inventory_by_location":{"bank":{"bandage":1},"recovered":{"bandage":1,"ration":5,"metal":2,"cloth":1,"battery":1},"impounded":{"control":1}}}})
    evidence["honest_failure_old_policy"]=c.snapshot(honest_old,oldp)

    # Same conditional Hub start and same H0 task-active food objective, three real paths.
    start=hub(p,points=40,initial_bandage=False,items=[{"type":"bandage","location":"bank"},{"type":"disinfectant","location":"bank"}])
    shopper=launch(load(buy(buy(start,"ration"),"ration"),"ration",2),"SHOP")
    searcher=launch(start,"SEARCH")
    supply=[{"action":"move","to":n} for n in ("H1","H7","L0","L1")]
    supply += [{"action":"L_front_open","method":"manual"},{"action":"search","source":"L_front"},
               {"action":"pickup","source":"L_front","item":"ration","quantity":2},{"action":"pickup","source":"L_front","item":"bandage","quantity":1}]
    supply += [{"action":"move","to":n} for n in ("L0","H7","H1","H0")]
    searcher,search_cost=execute(searcher,supply)
    trader=launch(load(load(start,"bandage"),"disinfectant"),"NPC")
    tradepath=[{"action":"move","to":"T0"},{"action":"move","to":"T1"},{"action":"npc_trade"},
               {"action":"move","to":"T0"},{"action":"move","to":"H0"}]
    trader,trade_cost=execute(trader,tradepath)
    for name,state,cost,points,weight in [("buy_food_same_objective",shopper,0,20,2),("search_food_same_objective",searcher,50,40,3),("NPC_food_same_objective",trader,22,40,2)]:
        case(name,lambda state=state,cost=cost:{"final":brief(state,p),"geometry":c.geometry(state,p),"nominal":cost},
             {"final":{"status":"active","location":"H0","day":1,"character_day":2,"satiety":4,"points":points,"energy":100-cost,"inventory_by_location":{"pack":{"ration":2}}},"geometry":{"weight":weight},"nominal":cost})
    evidence["three_food_choices"]={name:c.snapshot(state,p) for name,state in [("buy",shopper),("search",searcher),("NPC",trader)]}
    missing=c.initial({"initial":{"location":"T1","items":[{"type":"bandage"}]}},p)
    rejected("NPC_missing_disinfectant_atomic",missing,{"action":"npc_trade"},"missing_item:disinfectant")
    npcfull=c.initial({"initial":{"location":"T1","initial_bandage":False,"items":[
        {"type":"firstaid","quantity":12},{"type":"bandage","location":"q1"},{"type":"disinfectant","location":"q2"}]}},p)
    rejected("NPC_reward_container_full_atomic",npcfull,{"action":"npc_trade"},"grid_full")
    npcroom=c.initial({"initial":{"location":"T1","initial_bandage":False,"items":[
        {"type":"firstaid","quantity":11},{"type":"bandage","location":"q1"},{"type":"disinfectant","location":"q2"}]}},p)
    case("NPC_reward_container_room_real_transfer",lambda:brief(apply(npcroom,{"action":"npc_trade"},p),p),
         {"energy":98,"inventory_by_location":{"pack":{"firstaid":11,"ration":2},"consumed":{"bandage":1,"disinfectant":1}}})

    repeated_trade,_=execute(trader,[{"action":"move","to":"T0"},{"action":"move","to":"T1"}])
    rejected("NPC_exchange_once",repeated_trade,{"action":"npc_trade"},"already_completed")
    metal_start=hub(p,points=12)
    metal_shop=launch(load(buy(metal_start,"metal"),"metal"),"SHOP")
    metal_search=launch(metal_start,"SEARCH")
    metal_search,metal_cost=execute(metal_search,[{"action":"move","to":"H1"},{"action":"search","source":"H_hall"},
          {"action":"pickup","source":"H_hall","item":"metal","quantity":1},{"action":"move","to":"H0"}])
    for name,state,points,energy in [("buy_metal_same_H0_goal",metal_shop,0,100),("hall_metal_same_H0_goal",metal_search,12,84)]:
        case(name,lambda state=state:brief(state,p),
             {"status":"active","location":"H0","points":points,"energy":energy,"satiety":4,"character_day":2,
              "inventory_by_location":{"pack":{"metal":1}}})
    # Purchase changes a complete route only in a separately named conditional-Hub variant.
    variant=hub(p,points=22)
    variant=load(load(buy(buy(variant,"metal"),"ration"),"metal"),"ration")
    variant=launch(variant,"VARIANT")
    variant=apply(variant,{"action":"use","item":"ration"},p)
    variant_steps=copy.deepcopy([a for a in normal if not (a["action"]=="pickup" and a.get("source")=="L_deep" and a.get("item")=="metal")])
    for action in variant_steps:
        if action["action"]=="install":action["selected_units"]={"metal":["purchase.0"]}
    variant,variant_cost=execute(variant,variant_steps)
    case("bought_metal_actual_full_route_variant",lambda:{"final":brief(variant,p),"nominal":variant_cost,
          "bought_metal_installed":next(u["location"] for u in variant["units"] if u["type"]=="metal" and u["origin_task"]=="hub_purchase")},
         {"final":{"status":"success","hp":4,"satiety":4,"day":3,"character_day":4,"points":120},"nominal":269,"bought_metal_installed":"installed"})
    evidence["bought_metal_variant"]=c.snapshot(variant,p)
    selection=c.initial({"initial":{"location":"H8","facts":["power"],"items":[
        {"type":"control"},{"type":"module"},{"type":"metal","id":"pack.metal"},
        {"type":"metal","id":"bank.metal","location":"bank"},{"type":"metal","id":"spent.metal","location":"consumed"},{"type":"electronics"}]}},p)
    for name,ids,reason in [("bank",["bank.metal"],"selected_unit_not_available"),
                            ("unknown",["fake"],"selected_unit_not_available"),("consumed",["spent.metal"],"selected_unit_not_available"),
                            ("duplicate",["pack.metal","pack.metal"],"invalid_selected_units")]:
        rejected("install_selected_material_"+name,selection,{"action":"install","selected_units":{"metal":ids}},reason)

    # Two conditional repair/charge sorties; not two full flashlight mission completions.
    gear_start=hub(p,points=100,coat=1,tool="flashlight",tool_resource=0)
    gear=gear_start;gear_rows=[]
    flash_path=[{"action":"move","to":"H1"},{"action":"move","to":"H3"},{"action":"search","source":"H_security","light":True},
                {"action":"pickup","source":"H_security","item":"card","quantity":1},
                {"action":"pickup","source":"H_security","item":"battery","quantity":1},
                {"action":"move","to":"H4"},{"action":"combat","trace":"H_full"},
                {"action":"move","to":"H3"},{"action":"move","to":"H1"},{"action":"move","to":"H0"},{"action":"failure"}]
    for task in ("A","B"):
        before=brief(gear,p)
        gear=buy(buy(gear,"battery"),"cloth")
        gear=apply(gear,{"action":"hub_maintain","target":"flashlight","revision":gear["revision"]},p)
        gear=apply(gear,{"action":"hub_maintain","target":"coat","revision":gear["revision"]},p)
        prepared=brief(gear,p)
        gear=launch(gear,task)
        gear,total=execute(gear,flash_path)
        gear_rows.append({"before":before,"prepared":prepared,"return":brief(gear,p),"nominal":total})
    case("purchased_cloth_battery_two_real_sorties",lambda:{"final":brief(gear,p),"round_nominal":[r["nominal"] for r in gear_rows]},
         {"final":{"points":16,"hp":8,"satiety":2,"character_day":3,"pipe":20,"coat":11,"tool_resource":6,
          "inventory_by_location":{"consumed":{"battery":2,"cloth":2},"bank":{"battery":2},"impounded":{"card":2}}},"round_nominal":[32,32]})
    evidence["two_flashlight_maintenance_sorties"]={"rounds":gear_rows,"final":c.snapshot(gear,p),
        "scope":"conditional prior-Hub damaged gear; two actual H3 light searches and H fights/failure returns, not complete main missions"}
    # Local parameter perturbations are real effective inputs, not descriptive comments.
    pv=copy.deepcopy(p);pv["economy"]["catalog"]["ration"]["price"]=11
    rejected("catalog_ration_price11_actual_input",hub(pv,points=10),{"action":"hub_buy","item":"ration","revision":0},"insufficient_points",pv)
    tv=copy.deepcopy(p);tv["economy"]["severe_infection_min"]=100
    case("therapy_threshold100_actual_input",lambda:brief(treat(hub(tv,hp=4,infection=95,points=40),tv),tv),
         {"points":0,"hp":12,"infection":0})
    rv=copy.deepcopy(p);rv["rest"]["C"]=80
    route=copy.deepcopy(indexed["normal_five"])
    for a in route["steps"]:a.pop("expect",None)
    result=c.run_route(route,rv)
    case("rest_C80_same_authored_plan_rejected",lambda:{"error":result["error"],"final":result.get("final",{})},
         {"error":"zero_energy"},"expected_rejection")
    invalidp=copy.deepcopy(p);invalidp["economy"]["catalog"]["ration"]["price"]=-1
    rejected("negative_catalog_price_atomic",hub(invalidp,points=10),{"action":"hub_buy","item":"ration","revision":0},"invalid_catalog_price",invalidp)
