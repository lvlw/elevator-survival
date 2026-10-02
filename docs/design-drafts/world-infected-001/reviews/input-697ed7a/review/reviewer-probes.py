"""Independent bounded review probes, not the author's 57/44 full suites.

Run: python reviewer-probes.py
The state fixture is reviewer-constructed, using the exact published L_full
trace and the matching parameters. No production imports or network calls.
"""
from pathlib import Path
import copy
import json
from combat_excerpt import combat, Reject

BASE = Path(__file__).resolve().parent
SHA = "697ed7ae010bbdfcc70aa0eb152d045f283d3606"
P = {
    "gear": {"pipe": {"max":30,"basic_damage":4,"charged_damage":6,
                       "basic_wear":1,"charged_wear":3,"repair":15},
             "coat": {"max":12,"mitigation":1,"repair":6}},
    "health": {"bleed_action":1,"infection_terminal":120},
    "combat_energy": {"minimum":6,"multiplier":4,"ctb_unit":100,"defense_divisor":2},
    "traces": {"L_full": {
        "enemy":"L","start_hp":16,"start_intent":"smash",
        "duration":380,"enemy_end":0,"next_intent":"smash",
        "events":[[0,"basic"],[100,"defend"],
                  [150,"hit",6,"smash",False,0,1],
                  [180,"basic"],[280,"basic"],[380,"basic"]]
    }}
}

def state(*, engaged=False):
    return {"pending":{"enemy":"L","from":"L1"},
            "enemies":{"L":{"hp":16,"intent":"smash","engaged":engaged,"risk_cursor":0}},
            "signature_used":False,"hp":12,"pipe":30,"coat":12,
            "bleeding":False,"wound":False,"injury":"none","exposure":0,
            "infection":0,"status":"active","energy":100,
            "location":"L2","equipment":{"weapon":"p","armor":"a","utility":"c"},
            "units":[],"equipped_retained":True,"reason":None,"next_activity":None}

probes=[]
for label, damage, engaged in [
    ("baseline_L_full",4,False),
    ("damage_6_early_enemy_defeat",6,False),
    ("damage_16_ghost_enemy_attack",16,False),
    ("reentry_reuses_first_encounter_trace",4,True),
]:
    p=copy.deepcopy(P)
    p["gear"]["pipe"]["basic_damage"]=damage
    s=state(engaged=engaged)
    try:
        price, events = combat(s,p,"L_full")
        probes.append({"id":label,"input":{"basic_damage":damage,"engaged":engaged},
                       "rejected":False,"price":price,"hp":s["hp"],"pipe":s["pipe"],
                       "events_after_enemy_defeat":[e for e in events if e["enemy_before"]==0],
                       "events":events})
    except Reject as e:
        probes.append({"id":label,"rejected":True,"reason":str(e)})

assert probes[0]["hp"]==9 and probes[0]["pipe"]==26 and probes[0]["price"]==16
assert not probes[1]["rejected"] and len(probes[1]["events_after_enemy_defeat"])==1
assert not probes[2]["rejected"] and any(e["event"]=="hit" for e in probes[2]["events_after_enemy_defeat"])
assert not probes[3]["rejected"]

arith=[]
def check(name, observed, expected):
    ok=observed==expected
    arith.append({"id":name,"observed":observed,"expected":expected,"matches":ok})
    assert ok, name

def charge_sequence(energy, costs):
    before=[]
    for cost in costs:
        if energy<=0:
            raise ValueError("new ordinary action at zero")
        before.append(energy)
        energy=max(0,energy-cost)
    return {"nominal":sum(costs),"end_energy":energy,"last_start":before[-1]}

check("normal_D1",charge_sequence(100,[8,8,2,6,12,2,8,2,6,8,6,2,16,6,6,10]),
      {"nominal":108,"end_energy":0,"last_start":2})
check("normal_D2",charge_sequence(85,[8,2,2,8,2,4,2,6,2,6,2,20,2,10,3,3,3]),
      {"nominal":85,"end_energy":0,"last_start":3})
check("normal_D3",sum([2,2,8,2,6,2,12,2,10,3,3,3,3,12,2,2,2]),76)
check("same_power_three",24+18,42)
check("same_power_five_west",28+18,46)
check("same_power_five_east",32+18,50)
check("same_position_A",100-12,88)
check("same_position_C",85,85)
check("same_completed_work_A",100-12-12,76)
check("same_completed_work_C",85,85)
check("deadline_hp_then_infection_food",{"hp":5-2,"infection":25+5+20,"satiety":4-2},
      {"hp":3,"infection":50,"satiety":2})
check("normal_failure_stock_fee",{"ration":3+2-1,"metal":2+2-1},{"ration":4,"metal":3})
check("deadline_only_old_bank_fee",{"ration":3-1,"metal":2-1},{"ration":2,"metal":1})
check("load_rounding",{"local":(2*11+9)//10,"cross":(8*11+9)//10},{"local":3,"cross":9})
check("peak_weight_early",4+4+2+3+1+2+1+4,21)
check("H_wound_HP4",4-2-1-1,0)

# Bounded design counterexample, not a full next-task execution.
# A new same-rules infection task starts with no ration/metal in bank, safe HP,
# no bleeding, E100. Only the pharmacy's guaranteed bandage is taken.
check("failure_pharmacy_trip_energy", sum([2,2,12,0,2,2,0]), 20)
check("failure_pharmacy_trip_inventory", {"bandage_gain":1,"ration_fee":min(1,0),"metal_fee":min(1,0)},
      {"bandage_gain":1,"ration_fee":0,"metal_fee":0})

out={"reviewed_sha":SHA,"scope":"transcribed original combat function + independent arithmetic; not full 57/44 rerun",
     "arithmetic_checks":{"count":len(arith),"matched":sum(x["matches"] for x in arith),"cases":arith},
     "combat_probes":probes,
     "findings":{
         "F1a":"Trace not rejected when parameter change defeats enemy before later trace events.",
         "F1b":"First-encounter L_full trace accepted for engaged=True with unchanged HP/intent.",
         "limits":"These are evidence-checker findings, not production-game defects or a refutation of baseline traces."}}
(BASE/"reviewer-probe-results.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print(json.dumps({"arithmetic":len(arith),"matched":sum(x["matches"] for x in arith),
                  "combat_probes":len(probes),"confirmed_evidence_findings":["F1a","F1b"]},ensure_ascii=False))
