"""Bounded design evidence; Python standard library only.

Replays authored actions against the Draft v1.3 contract. Combat uses fixed
event traces, not a general CTB scheduler; no RNG, production import, save
roundtrip, UI, whole-strategy search or balance guarantee. All output stays
beside this script. Geometries are author-selected witnesses at each stable
step and may imply free manual rearrangement in safe noncombat states.
"""
from __future__ import annotations
import copy
import csv
import hashlib
import json
import math
from pathlib import Path

BASE = Path(__file__).resolve().parent

class Reject(Exception):
    pass

def require(ok, reason):
    if not ok:
        raise Reject(reason)

def edge(a, b):
    return "|".join(sorted((a, b)))

def count(s, kind, locations=("pack", "q1", "q2")):
    return sum(u["type"] == kind and u["location"] in locations for u in s["units"])

def consume(s, kind, quantity, destination="consumed", locations=("pack",), new_first=False, selected_ids=None):
    chosen = sorted((u for u in s["units"] if u["type"] == kind and
                     u["location"] in locations), key=lambda u: (u.get("origin_task") != s.get("task_id") if new_first else False, u["id"]))
    if selected_ids is not None:
        require(isinstance(selected_ids,list) and len(selected_ids)==quantity and
                all(isinstance(x,str) for x in selected_ids) and len(set(selected_ids))==quantity,
                "invalid_selected_units")
        chosen=[u for u in chosen if u["id"] in selected_ids]
        require(len(chosen)==quantity,"selected_unit_not_available")
    require(len(chosen) >= quantity, "missing_item:" + kind)
    for u in chosen[:quantity]:
        u["location"] = destination

def geometry(s, p):
    pack = [u for u in s["units"] if u["location"] == "pack"]
    w, h = p["limits"]["grid"]
    weight = sum(p["items"][u["type"]]["weight"] for u in pack)
    require(weight <= p["limits"]["max_weight"], "weight")
    cells, rects = set(), []
    for kind in p["item_order"]:
        units = sorted((u["id"] for u in pack if u["type"] == kind))
        item = p["items"][kind]
        width, height = item["size"]
        for i in range(0, len(units), item["stack"]):
            stack = units[i:i + item["stack"]]
            if kind in p["geometry"]["large_slots"]:
                x, y = p["geometry"]["large_slots"][kind]
                require(i == 0, "duplicate_large_item")
            else:
                options = [(xx, yy) for yy in range(h) for xx in range(w)
                           if xx+width <= w and yy+height <= h and not\
                           ({(xxx,yyy) for xxx in range(xx,xx+width) for yyy in range(yy,yy+height)} & cells)]
                require(bool(options), "grid_full")
                x, y = options[0]
            footprint = {(xx, yy) for xx in range(x, x + width)
                         for yy in range(y, y + height)}
            require(all(0 <= xx < w and 0 <= yy < h for xx, yy in footprint),
                    "grid_bounds")
            require(not (footprint & cells), "grid_overlap")
            cells.update(footprint)
            rects.append({"type": kind, "unit_ids": stack,
                          "xywh": [x, y, width, height]})
    return {"weight": weight, "cells": len(cells), "rectangles": rects}

def observe(s, p):
    maps = [p["topology"]["common_observe"],
            p["topology"][s["topology"] + "_observe"]]
    for m in maps:
        for target in m.get(s["location"], []):
            s["known_edges"].add(edge(s["location"], target))
    s["visited"].add(s["location"])

def validate(s, p):
    require(len({u["id"] for u in s["units"]}) == len(s["units"]),
            "duplicate_instance")
    require(0 <= s["energy"] <= p["limits"]["energy"], "energy_bounds")
    require(0 <= s["hp"] <= p["limits"]["hp"], "hp_bounds")
    require(1 <= s["day"] <= p["limits"]["days"], "day_bounds")
    for q in ("q1", "q2"):
        units = [u for u in s["units"] if u["location"] == q]
        require(len(units) <= 1, "quick_slot_capacity")
        require(all(p["items"][u["type"]].get("quick") for u in units),
                "quick_slot_type")
    if s["status"] == "active":
        require(s["hp"] > 0,
                "active_dead")
    require(type(s["points"]) is int and 0 <= s["points"] <= p["economy"]["max_balance"], "invalid_balance")
    require(type(s["infection"]) is int and 0 <= s["infection"] <= 2147483647, "invalid_infection")
    require(type(s["exposure"]) is int and 0 <= s["exposure"] <= 2147483647, "invalid_exposure")
    require(isinstance(s["task_id"],str) and bool(s["task_id"].strip()) and s["task_id"] not in ("before","hub_purchase"), "invalid_task_id")
    require(type(s["revision"]) is int and s["revision"] >= 0, "invalid_revision")
    require(type(s["satiety"]) is int and 0 <= s["satiety"] <= p["limits"]["satiety"], "invalid_satiety")
    if s["ready_next"]:
        require(s["settled_cycle"] == s["character_day"] - 1, "invalid_settled_cycle")
    return geometry(s, p)

def initial(spec, p):
    i = spec.get("initial", {})
    empty_equipment = i.get("empty_equipment", False)
    tool = "none" if empty_equipment else i.get("tool", "crowbar")
    tool_max = p["gear"].get(tool, {}).get("max", 0)
    s = {"day": i.get("day", 1), "location": i.get("location", "H0"),
         "energy": i.get("energy", p["limits"]["energy"]),
         "hp": i.get("hp", p["limits"]["hp"]),
         "satiety": i.get("satiety", p["limits"]["satiety"]),
         "infection": i.get("infection", 0), "exposure": i.get("exposure", 0),
         "bleeding": i.get("bleeding", False), "wound": i.get("wound", False),
         "injury": "light_laceration" if i.get("wound") else "none",
         "suppression": i.get("suppression", 0), "disinfectant_used": i.get("disinfectant_used", False),
         "pipe": 0 if empty_equipment else i.get("pipe", p["gear"]["pipe"]["max"]),
         "coat": 0 if empty_equipment else i.get("coat", p["gear"]["coat"]["max"]),
         "tool": tool,
         "tool_resource": 0 if empty_equipment else i.get("tool_resource", tool_max),
         "equipment": {"weapon": None, "armor": None, "utility": None} if empty_equipment else
                      {"weapon": "initial.pipe", "armor": "initial.coat", "utility": "initial." + tool},
         "topology": spec.get("topology", "five"),
         "facts": {"hospital_model"} | set(i.get("facts", [])),
         "known_edges": set(i.get("known_edges", [])),
         "visited": set(), "sources": set(), "signature_used": i.get("signature_used", False),
         "pending": None, "status": "active", "reason": None,
         "units": [], "enemies": {}, "next_activity": None,
         "equipped_retained": not empty_equipment}
    s.update(character_day=i.get("character_day", i.get("day", 1)),
             task_id=i.get("task_id", "fixture_task"), world_id="infected_world",
             points=i.get("points", 0), first_success=i.get("first_success", False),
             ready_next=i.get("ready_next", False), revision=i.get("revision", 0),
             painkiller=i.get("painkiller", False), painkiller_used=i.get("painkiller_used", False),
             suppressant_used=i.get("suppressant_used", False), medical_doses=i.get("medical_doses", 0),
             exit_policy=i.get("exit_policy", "living_failure"),
             equipment_origin=i.get("equipment_origin", {"weapon":"before", "armor":"before", "utility":"before"}))
    s.update(settled_cycle=i.get("settled_cycle",s["character_day"]-1 if s["ready_next"] else None),
             first_entry=i.get("first_entry",False), active_task_id=s["task_id"],
             last_settled_result=copy.deepcopy(i.get("last_settled_result")),
             used_task_ids=list(i.get("used_task_ids",[s["task_id"]])),
             offered_tasks=copy.deepcopy(i.get("offered_tasks",p["offered_tasks"])),
             mission_id=i.get("mission_id","infected_recovery"), rules_version=p["rules_version"])
    if s["first_entry"]:
        s.update(location="HUB",status="new_character",active_task_id=None,used_task_ids=[])
    s["injury"] = i.get("injury", s["injury"])
    if i.get("initial_bandage", True):
        s["units"].append({"id": "initial.bandage.1", "type": "bandage",
                           "location": "q1", "origin_task": "before"})
    for n, item in enumerate(i.get("items", [])):
        for k in range(item.get("quantity", 1)):
            s["units"].append({"id": item.get("id", f"fixture.{n}.{k}"),
                               "type": item["type"],
                               "location": item.get("location", "pack"), "origin_task": item.get("origin_task", "before")})
    for name, data in p["enemies"].items():
        s["enemies"][name] = {"hp": data["hp"], "intent": data["intent"],
                               "engaged": False, "risk_cursor": 0}
    for name, data in i.get("enemies", {}).items():
        s["enemies"][name].update(data)
    s["pending"] = i.get("pending")
    observe(s, p)
    validate(s, p)
    return s

def snapshot(s, p):
    d = copy.deepcopy(s)
    for k in ("facts", "known_edges", "visited", "sources"):
        d[k] = sorted(d[k])
    # The immutable finite offer registry is an input reference, not duplicated in every state.
    if d["offered_tasks"] == p["offered_tasks"]:
        d["offered_tasks"] = {"parameter_ref":"parameters.json#/offered_tasks"}
    d["geometry"] = geometry(s, p)
    d["inventory_by_location"] = {}
    for u in s["units"]:
        loc = d["inventory_by_location"].setdefault(u["location"], {})
        loc[u["type"]] = loc.get(u["type"], 0) + 1
    return d

def charge(s, price):
    s["energy"] = max(0, s["energy"] - price)

def terminal_death(s, reason):
    # Current ownership only: past dispositions are immutable historical facts.
    if s["status"] == "death":
        return
    s.update(status="death", points=0, ready_next=False, settled_cycle=None,
             reason=reason, next_activity="new_character_setup",
             equipped_retained=False, active_task_id=None, pending=None)
    s["equipment"] = {"weapon":None,"armor":None,"utility":None}
    for u in s["units"]:
        if u["location"] in ("bank","pack","q1","q2") or u["location"].startswith("ground:"):
            u["location"] = "lost"

def check_death(s, p, reason):
    if s["hp"] <= 0:
        s["hp"] = 0
        terminal_death(s, reason)
        return True
    return False

def reveal(s, p, source):
    require(source not in s["sources"], "source_already_revealed")
    data = p["sources"][source]
    s["sources"].add(source)
    for kind, quantity in data["items"].items():
        for index in range(quantity):
            s["units"].append({"id": f"{source}.{s['task_id']}.{kind}.{index + 1}",
                               "type": kind, "location": "ground:" + s["location"], "origin_task": s["task_id"]})

def daily_hazards(s, p):
    stages = []
    if s["bleeding"]:
        s["hp"] = max(0, s["hp"] - p["health"]["bleed_night"])
    stages.append({"stage": "persistent_danger", "hp": s["hp"]})
    if check_death(s, p, "night_bleeding"):
        return stages
    base = max((x for x in p["health"]["infection_stages"]
                if s["infection"] >= x["min"]), key=lambda x: x["min"])["base"]
    s["infection"] += max(0, base + p["health"]["exposure_progress"] *
                          s["exposure"] - s["suppression"])
    require(type(s["infection"]) is int and 0 <= s["infection"] <= 2147483647, "invalid_infection")
    s["exposure"] = 0
    stages.append({"stage": "infection", "infection": s["infection"]})
    damage = max((x for x in p["health"]["infection_damage"] if s["infection"] >= x["min"]),
                 key=lambda x:x["min"])["hp"]
    s["hp"] = max(0, s["hp"] - damage)
    stages.append({"stage":"infection_hp", "hp":s["hp"], "damage":damage})
    if check_death(s, p, "infection_hp"):
        return stages
    s["satiety"] = max(0, s["satiety"] - p["health"]["night_food"])
    if s["satiety"] <= p["health"]["starve_threshold"]:
        s["hp"] = max(0, s["hp"] - p["health"]["starve_damage"])
    stages.append({"stage": "food", "hp": s["hp"], "satiety": s["satiety"]})
    check_death(s, p, "starvation")
    return stages

def advance_character_day(s):
    s["character_day"] += 1
    s["signature_used"] = False
    s["disinfectant_used"] = False
    s["suppressant_used"] = False
    s["painkiller_used"] = False
    s["medical_doses"] = 0
    s["suppression"] = 0
    s["painkiller"] = False

def finish_return(s, p, outcome):
    require(s["hp"] > 0, "dead_cannot_return")
    require(type(s["points"]) is int and 0 <= s["points"] <= p["economy"]["max_balance"], "invalid_balance")
    success = outcome == "success"
    if success:
        require(s["points"] + p["economy"]["success_reward"] <= p["economy"]["max_balance"], "balance_overflow")
    for u in s["units"]:
        if u["location"] in ("pack", "q1", "q2"):
            kind = p["items"][u["type"]]["kind"]
            if kind == "ordinary":
                u["location"] = "recovered" if not success and p["economy"]["recover_new_on_failure"] and u.get("origin_task") == s["task_id"] else "bank"
            elif u["type"] == "sample":
                u["location"] = "delivered" if success else "delivered_partial"
            else:
                u["location"] = "impounded"
        elif u["location"].startswith("ground:"):
            u["location"] = "lost"
    if not success and p["economy"]["recover_new_on_failure"]:
        for slot, origin in s["equipment_origin"].items():
            if origin == s["task_id"]:
                s["equipment"][slot] = None
                if slot == "weapon": s["pipe"] = 0
                elif slot == "armor": s["coat"] = 0
                elif slot == "utility": s["tool"], s["tool_resource"] = "none", 0
    fee = min(s["points"], p["economy"]["failure_penalty"]) if not success else 0
    s["points"] += p["economy"]["success_reward"] if success else -fee
    s["first_success"] |= success and s["mission_id"] == "infected_recovery"
    s["last_settled_result"] = {"task_id":s["task_id"],"outcome":outcome,
                                "reward":p["economy"]["success_reward"] if success else 0,"fee":fee}
    s["active_task_id"] = None
    s["status"], s["reason"] = outcome, outcome
    s["location"] = "HUB"
    s["next_activity"] = p["terminal_candidate"]["next_activity"]
    return {"points":fee, "reward":p["economy"]["success_reward"] if success else 0}

def combat(s, p, trace_name):
    t = p["traces"][trace_name]
    require(s["pending"] and s["pending"]["enemy"] == t["enemy"], "no_matching_encounter")
    e = s["enemies"][t["enemy"]]
    require(e["hp"] == t["start_hp"] and e["intent"] == t["start_intent"],
            "trace_start_mismatch")
    require(t.get("encounter_mode") in ("first", "reentry"), "trace_mode_missing")
    require(e["engaged"] if t["encounter_mode"] == "reentry" else not e["engaged"],
            "not_reentry" if t["encounter_mode"] == "reentry" else "not_first_encounter")
    if any(row[1] == "charged" for row in t["events"]):
        require(not s["signature_used"], "signature_already_used_today")
    defending, events, last_ctb = False, [], -1
    e["engaged"] = True
    for event in t["events"]:
        require(e["hp"] > 0, "trace_continues_after_incapacitation")
        ctb, op, *args = event
        require(ctb >= last_ctb, "trace_time_order")
        last_ctb = ctb
        hp_before, enemy_before = s["hp"], e["hp"]
        if op in ("basic", "charged"):
            require(s["pipe"] > 0, "broken_pipe_needs_other_trace")
            g = p["gear"]["pipe"]
            e["hp"] = max(0, e["hp"] - g[op + "_damage"])
            s["pipe"] = max(0, s["pipe"] - g[op + "_wear"])
            if op == "charged":
                s["signature_used"] = True
        elif op == "defend":
            defending = True
        elif op == "hit":
            raw, intent, wound, exposure, risk_checks = args
            valid_coat = s["coat"] > 0
            damage = max(0, raw - (p["gear"]["coat"]["mitigation"] if valid_coat else 0))
            if defending:
                damage = math.ceil(damage / p["combat_energy"]["defense_divisor"])
            s["hp"] = max(0, s["hp"] - damage)
            if valid_coat:
                s["coat"] -= 1
            defending = False
            e["risk_cursor"] += risk_checks
            if s["hp"] > 0:
                s["bleeding"] |= wound
                s["wound"] |= wound
                if wound:
                    s["injury"] = "light_laceration"
                s["exposure"] += exposure
        elif op not in ("escape", "escape_complete"):
            raise Reject("unsupported_trace_event")
        if op in ("basic", "charged", "defend", "escape") and s["bleeding"]:
            s["hp"] = max(0, s["hp"] - p["health"]["bleed_action"])
        events.append({"ctb": ctb, "event": op, "hp_before": hp_before,
                       "hp_after": s["hp"], "enemy_before": enemy_before,
                       "enemy_after": e["hp"], "pipe": s["pipe"],
                       "coat": s["coat"], "exposure": s["exposure"],
                       "bleeding": s["bleeding"], "risk_cursor": e["risk_cursor"]})
        if check_death(s, p, "combat"):
            break
    if s["status"] == "active":
        require(e["hp"] == t["enemy_end"], "trace_result_changed_requires_new_trace")
        e["intent"] = t["next_intent"]
        if t.get("escape"):
            s["location"] = s["pending"]["from"]
        s["pending"] = None
        require(last_ctb == t["duration"], "trace_duration")
    price = max(p["combat_energy"]["minimum"],
                p["combat_energy"]["multiplier"] *
                math.ceil(last_ctb / p["combat_energy"]["ctb_unit"]))
    charge(s, price)
    return price, events

def therapy_cost(s, p):
    body = s["hp"] < p["limits"]["hp"] or s["bleeding"] or s["wound"] or s["injury"] != "none"
    if not body and s["infection"] == 0 and s["exposure"] == 0: return 0
    if s["infection"] >= p["economy"]["severe_infection_min"]: return p["economy"]["severe_therapy"]
    if s["infection"] > 0 or s["exposure"] > 0: return p["economy"]["infection_therapy"]
    return p["economy"]["body_therapy"]

def therapy_quote(s, p):
    return {"revision":s["revision"], "task_id":s["task_id"], "price":therapy_cost(s,p)}

def hub_action(s, action, p):
    # Finite candidate transactions, no production persistence or generic task engine.
    require(s["location"] == "HUB" and s["hp"] > 0 and s["status"] in ("success","failure","deadline_recall","new_character"),
            "not_living_hub")
    require(s["pending"] is None and s["active_task_id"] is None, "not_stable_hub")
    validate(s, p)
    op, detail = action["action"], {}
    if op == "hub_cancel":
        return s, 0, {"cancelled":True}
    if op == "hub_treat":
        quote = action.get("quote")
        require(isinstance(quote,dict) and set(quote)=={"revision","task_id","price"} and
                type(quote["price"]) is int and 0 <= quote["price"] <= p["economy"]["max_balance"] and
                type(quote["revision"]) is int and quote["revision"] >= 0 and isinstance(quote["task_id"],str), "invalid_quote")
        require(quote == therapy_quote(s,p), "stale_quote")
        cost = therapy_cost(s,p)
        if cost == 0: return s, 0, {"cost":0, "no_op":True}
        require(s["points"] >= cost, "insufficient_points")
        s["points"] -= cost
        s.update(hp=p["limits"]["hp"], bleeding=False, wound=False, injury="none",
                 infection=0, exposure=0, painkiller=False, suppression=0)
        detail["cost"] = cost
    elif op == "hub_buy":
        require(type(action.get("revision")) is int and action["revision"] == s["revision"], "stale_purchase")
        require(type(action.get("quantity",1)) is int and action.get("quantity",1)==1, "invalid_purchase_quantity")
        kind = action.get("item")
        require(isinstance(kind,str) and kind in p["economy"]["catalog"], "catalog_item_closed")
        entry = p["economy"]["catalog"][kind]
        cost = entry["price"]
        require(type(cost) is int and 0 <= cost <= p["economy"]["max_balance"], "invalid_catalog_price")
        if "price" in action:
            require(type(action["price"]) is int and action["price"] >= 0, "invalid_purchase_price")
            require(action["price"] == cost, "stale_purchase_price")
        require(not entry["requires_full_success"] or s["first_success"], "missing_eligibility")
        require(action.get("destination", "bank") == "bank", "invalid_purchase_destination")
        require("origin_task" not in action and "unit_id" not in action, "immutable_item_identity")
        require(s["points"] >= cost, "insufficient_points")
        s["points"] -= cost
        identity = "purchase." + str(s["revision"])
        require(not any(u["id"] == identity for u in s["units"]), "duplicate_instance")
        s["units"].append({"id":identity,"type":kind,"location":"bank","origin_task":"hub_purchase"})
        detail.update(cost=cost,item=kind,unit_id=identity)
    elif op == "hub_use":
        kind = action["item"]
        require(count(s,kind,("bank",)) > 0, "missing_item:"+kind)
        if kind == "ration":
            require(s["satiety"] < p["limits"]["satiety"], "full_satiety")
            s["satiety"] = min(p["limits"]["satiety"], s["satiety"]+p["health"]["ration_gain"])
        elif kind == "bandage":
            require(s["hp"] < 12 or s["bleeding"] or s["wound"], "no_medical_target")
            s["hp"] = min(12,s["hp"]+1);s["bleeding"]=False;s["wound"]=False
        elif kind == "firstaid":
            removable = s["injury"] in ("light_contusion","light_laceration","light_puncture","light_bite")
            require(s["hp"] < 12 or removable, "no_medical_target")
            s["hp"] = min(12,s["hp"]+4)
            if removable:
                s["injury"]="none";s["bleeding"]=False;s["wound"]=False
        elif kind == "disinfectant":
            require(s["exposure"] > 0 and not s["disinfectant_used"], "disinfectant_condition")
            s["exposure"]-=1;s["disinfectant_used"]=True;s["medical_doses"]+=1
        elif kind == "suppressant":
            require((s["infection"] > 0 or s["exposure"] > 0) and not s["suppressant_used"], "suppressant_condition")
            s["suppression"]=15;s["suppressant_used"]=True;s["medical_doses"]+=1
        elif kind == "painkiller":
            require((s["injury"] == "light_contusion" or s["wound"]) and not s["painkiller"], "painkiller_condition")
            s["painkiller"]=True;s["painkiller_used"]=True;s["medical_doses"]+=1
        else: raise Reject("unsupported_hub_medication")
        consume(s,kind,1,locations=("bank",))
    elif op == "hub_maintain":
        require(type(action.get("revision")) is int and action["revision"] == s["revision"], "stale_maintenance")
        kind = action["target"]
        if kind == "mechanical":
            pipe, tool = action.get("pipe",0), action.get("tool",0)
            require(type(pipe) is int and type(tool) is int and pipe >= 0 and tool >= 0 and 0 < pipe+tool <=15, "invalid_repair_allocation")
            require((pipe == 0 or s["equipment"]["weapon"] is not None and s["pipe"] < p["gear"]["pipe"]["max"]) and
                    (tool == 0 or s["tool"] == "crowbar" and s["equipment"]["utility"] is not None and s["tool_resource"] < p["gear"]["crowbar"]["max"]), "no_repair_target")
            consume(s,"metal",1,locations=("bank",))
            s["pipe"]=min(p["gear"]["pipe"]["max"],s["pipe"]+pipe)
            s["tool_resource"]=min(p["gear"].get(s["tool"],{}).get("max",0),s["tool_resource"]+tool)
        elif kind == "coat":
            require(s["equipment"]["armor"] is not None and s["coat"]<p["gear"]["coat"]["max"],"no_repair_target")
            consume(s,"cloth",1,locations=("bank",));s["coat"]=min(p["gear"]["coat"]["max"],s["coat"]+p["gear"]["coat"]["repair"])
        elif kind == "flashlight":
            require(s["tool"]=="flashlight" and s["tool_resource"]<p["gear"]["flashlight"]["max"],"no_repair_target")
            consume(s,"battery",1,locations=("bank",));s["tool_resource"]=min(p["gear"]["flashlight"]["max"],s["tool_resource"]+p["gear"]["flashlight"]["charge"])
        elif kind == "toolkit":
            require(s["tool"]=="toolkit" and s["tool_resource"]<p["gear"]["toolkit"]["max"],"no_repair_target")
            consume(s,"metal",1,locations=("bank",));consume(s,"electronics",1,locations=("bank",))
            s["tool_resource"]=min(p["gear"]["toolkit"]["max"],s["tool_resource"]+p["gear"]["toolkit"]["repair"])
        else: raise Reject("unsupported_hub_maintenance")
    elif op == "hub_load":
        require(type(action.get("quantity")) is int and action["quantity"]>0,"invalid_quantity")
        require(action.get("destination","pack") in ("pack","q1","q2"),"bad_pickup_destination")
        consume(s,action["item"],action["quantity"],action.get("destination","pack"),("bank",))
    elif op == "hub_rest":
        raise Reject("hub_rest_retired_use_launch")
    elif op in ("launch","hub_launch_preview"):
        require(type(action.get("revision")) is int and action["revision"] == s["revision"],"stale_offer")
        require(s["points"] + p["economy"]["success_reward"] <= p["economy"]["max_balance"],"insufficient_reward_headroom")
        task = action.get("task_id")
        require(isinstance(task,str) and bool(task.strip()) and task not in ("before","hub_purchase"),"invalid_task_id")
        require(task not in s["used_task_ids"],"offer_already_used")
        require(task in s["offered_tasks"],"task_not_offered")
        offer = s["offered_tasks"][task]
        require(offer["world_id"] == "infected_world" and action.get("world_id",offer["world_id"]) == offer["world_id"],"unknown_offer_world")
        require(offer["policy"] in ("living_failure","must_complete") and action.get("policy",offer["policy"]) == offer["policy"],"unknown_task_policy")
        require(offer["version"] == p["rules_version"] and action.get("offer_version",offer["version"]) == offer["version"],"stale_offer_version")
        require(s["rules_version"] == p["rules_version"],"bound_rules_version_mismatch")
        require(all(p["items"][u["type"]]["kind"]=="ordinary" for u in s["units"]
                    if u["location"] in ("pack","q1","q2")),"task_bound_item_not_exportable")
        if op == "hub_launch_preview":
            return s,0,{"preview_only":True,"task_id":task,"handoff_due":not s["first_entry"] and not s["ready_next"],
                        "health":{k:s[k] for k in ("hp","satiety","infection","exposure","bleeding","injury")}}
        if not s["first_entry"] and not s["ready_next"]:
            detail["settled_cycle"] = s["character_day"]
            detail["stages"] = daily_hazards(s,p)
            if s["status"] == "death":
                s["revision"] += 1
                validate(s,p)
                return s,0,detail
            advance_character_day(s)
            s["energy"] = p["limits"]["energy"]
        elif s["ready_next"]:
            detail["consumed_previously_settled_cycle"] = s["settled_cycle"]
        else:
            detail["first_entry_no_prior_day"] = True
        s["used_task_ids"].append(task)
        s.update(task_id=task,active_task_id=task,mission_id=offer["mission_id"],day=1,location="H0",status="active",reason=None,
                 first_entry=False,ready_next=False,settled_cycle=None,next_activity=None,exit_policy=offer["policy"],
                 facts={"hospital_model"},sources=set(),known_edges=set(),visited=set(),pending=None)
        s["enemies"]={n:{"hp":e["hp"],"intent":e["intent"],"engaged":False,"risk_cursor":0} for n,e in p["enemies"].items()}
        observe(s,p)
    else: raise Reject("unsupported_hub_action")
    s["revision"]+=1
    validate(s,p)
    return s,0,detail

def perform(state, action, p):
    """Work on a copy so every rejected input leaves the prior ledger intact."""
    s = copy.deepcopy(state)
    op = action["action"]
    validate(s,p)  # Reject malformed/dead active inputs before any healing or day cleanup.
    if op.startswith("hub_") or op == "launch":
        return hub_action(s, action, p)
    require(s["status"] == "active", "terminated")
    if s["pending"]:
        require(op == "combat", "pending_encounter")
    if op != "combat":
        require(not any(data["node"] == s["location"] and s["enemies"][name]["hp"] > 0
                        for name, data in p["enemies"].items()), "unresolved_node_danger")
    exempt = ("combat", "pickup", "drop", "use", "rest", "success", "failure", "deadline")
    if op not in exempt:
        require(s["energy"] > 0, "zero_energy")
    price, detail = 0, {}
    if op == "move":
        dest = action["to"]
        key = edge(s["location"], dest)
        all_edges = p["topology"]["common_edges"] + p["topology"][s["topology"] + "_edges"]
        require(key in {edge(*e) for e in all_edges}, "not_adjacent")
        require(key in s["known_edges"], "unknown_edge")
        gate = p["topology"]["gates"].get(key, {})
        require(not gate.get("fact") or gate["fact"] in s["facts"], "blocked_edge")
        require(not gate.get("item") or count(s, gate["item"], ("pack",)) > 0,
                "missing_permission")
        local = s["location"][0] == dest[0]
        base = p["prices"]["local_move" if local else "cross_move"]
        weight = geometry(s, p)["weight"]
        factor = next(x for x in p["load"] if weight <= x["max"])
        price = (base * factor["numerator"] + factor["denominator"] - 1) // factor["denominator"]
        previous, s["location"] = s["location"], dest
        observe(s, p)
        for name, enemy in p["enemies"].items():
            if enemy["node"] == dest and s["enemies"][name]["hp"] > 0:
                s["pending"] = {"enemy": name, "from": previous}
        detail = {"edge": key, "weight_at_move": weight,
                  "known_before": key in state["known_edges"], "cross_region": not local}
    elif op == "combat":
        price, detail = combat(s, p, action["trace"])
        s["revision"] += 1
        validate(s, p)
        return s, price, detail
    elif op == "search":
        source = action["source"]
        data = p["sources"][source]
        require(s["location"] == data["node"], "wrong_location")
        require(all(f in s["facts"] for f in data.get("requires", [])), "missing_fact")
        require(data["price"] != "opening", "source_requires_opening")
        if data["price"] == "hospital":
            light = action.get("light", False)
            if light:
                require(s["tool"] == "flashlight" and s["tool_resource"] > 0, "no_light")
                s["tool_resource"] = max(0, s["tool_resource"] -
                                         p["gear"]["flashlight"]["search_wear"])
            price = p["prices"]["hospital_light" if light else "hospital_dark"]
        else:
            price = p["prices"][data["price"]]
        reveal(s, p, source)
    elif op == "pickup":
        source, kind = action["source"], action["item"]
        require(type(action.get("quantity")) is int and action["quantity"] > 0, "invalid_quantity")
        destination = action.get("destination", "pack")
        require(destination in ("pack", "q1", "q2"), "bad_pickup_destination")
        available = sorted((u for u in s["units"]
                            if u["type"] == kind and
                            u["location"] == "ground:" + s["location"] and
                            u["id"].startswith(source + ".")), key=lambda u: u["id"])
        require(len(available) >= action["quantity"], "missing_ground_item")
        for u in available[:action["quantity"]]:
            u["location"] = destination
    elif op == "drop":
        loc = action.get("from", "pack")
        require(loc in ("pack", "q1", "q2"), "not_carried_source")
        require(type(action.get("quantity")) is int and action["quantity"] > 0, "invalid_quantity")
        consume(s, action["item"], action["quantity"], "ground:" + s["location"], (loc,), new_first=p["economy"]["recover_new_on_failure"])
    elif op == "use":
        kind = action["item"]
        loc = action.get("from", "pack")
        require(loc in ("pack", "q1", "q2"), "not_carried_source")
        if kind == "bandage":
            require(s["hp"] < p["limits"]["hp"] or s["bleeding"] or s["wound"],
                    "no_medical_target")
            consume(s, kind, 1, locations=(loc,), new_first=p["economy"]["recover_new_on_failure"])
            s["hp"] = min(p["limits"]["hp"], s["hp"] + p["health"]["bandage_heal"])
            s["bleeding"], s["wound"] = False, False
        elif kind == "firstaid":
            removable = s["injury"] in ("light_contusion","light_laceration","light_puncture","light_bite")
            require(s["hp"] < 12 or removable, "no_medical_target")
            consume(s,kind,1,locations=(loc,))
            s["hp"]=min(12,s["hp"]+4)
            if removable:s.update(injury="none",bleeding=False,wound=False)
        elif kind == "ration":
            require(s["satiety"] < p["limits"]["satiety"], "full_satiety")
            consume(s, kind, 1, locations=(loc,), new_first=p["economy"]["recover_new_on_failure"])
            s["satiety"] = min(p["limits"]["satiety"],
                              s["satiety"] + p["health"]["ration_gain"])
        elif kind == "disinfectant":
            require(s["exposure"] > 0 and not s["disinfectant_used"], "disinfectant_condition")
            consume(s, kind, 1, locations=(loc,), new_first=p["economy"]["recover_new_on_failure"])
            s["exposure"] -= 1
            s["disinfectant_used"] = True
        else:
            raise Reject("unsupported_self_use")
    elif op == "npc_trade":
        require(s["location"] == "T1", "wrong_location")
        require("lin_trade" not in s["facts"], "already_completed")
        consume(s,"bandage",1,locations=("pack","q1","q2"))
        consume(s,"disinfectant",1,locations=("pack","q1","q2"))
        s["facts"].add("lin_trade")
        for n in (1,2):
            s["units"].append({"id":f"lin_trade.{s['task_id']}.ration.{n}","type":"ration",
                               "location":"pack","origin_task":s["task_id"]})
        price=p["prices"]["npc_trade"]
    elif op == "repair":
        target = action["target"]
        if target == "pipe":
            require(s["pipe"] < p["gear"]["pipe"]["max"], "no_repair_target")
            consume(s, "metal", 1)
            s["pipe"] = min(p["gear"]["pipe"]["max"], s["pipe"] + p["gear"]["pipe"]["repair"])
            price = p["prices"]["repair"]
        elif target == "toolkit":
            require(s["tool"] == "toolkit" and s["tool_resource"] < p["gear"]["toolkit"]["max"],
                    "no_repair_target")
            consume(s, "metal", 1)
            consume(s, "electronics", 1)
            s["tool_resource"] = min(p["gear"]["toolkit"]["max"],
                                     s["tool_resource"] + p["gear"]["toolkit"]["repair"])
            price = p["prices"]["toolkit_repair"]
        else:
            raise Reject("unsupported_repair")
    elif op == "rest":
        require(s["day"] < p["limits"]["days"], "no_day_eight")
        detail = {"stages": daily_hazards(s, p)}
        if s["status"] == "active":
            rank = "A" if s["location"] in p["topology"]["A_nodes"] else "C"
            s["energy"] = p["rest"][rank]
            s["day"] += 1
            advance_character_day(s)
            detail["rest_rank"] = rank
    elif op in ("success", "failure"):
        require(s["location"] == "H0", "not_return_point")
        if op == "failure": require(s["exit_policy"] == "living_failure", "task_forbids_failure_exit")
        complete = "installed" in s["facts"] and count(s, "sample", ("pack",)) == 1
        require(complete if op == "success" else not complete, "wrong_return_outcome")
        detail["fee"] = finish_return(s, p, op)
    elif op == "deadline":
        require(s["day"] == p["limits"]["days"], "not_deadline")
        detail["stages"] = daily_hazards(s, p)
        if s["status"] == "active":
            if s["exit_policy"] == "must_complete":
                s["hp"] = 0
                terminal_death(s, "declared_task_failure_effect")
                s["revision"] += 1
                validate(s,p)
                return s,0,detail
            s["settled_cycle"] = s["character_day"]
            advance_character_day(s)
            s["energy"] = p["limits"]["energy"]
            s["ready_next"] = True
            detail["fee"] = finish_return(s, p, "deadline_recall")
    elif op in p["actions"]:
        data = p["actions"][op]
        node = ("P1" if s["topology"] == "five" else "L4") if data["node"] == "@power" else data["node"]
        require(s["location"] == node, "wrong_location")
        if data.get("requires_enemy_cleared"):
            require(s["enemies"][data["requires_enemy_cleared"]]["hp"] == 0, "danger_not_cleared")
        require(all(f in s["facts"] for f in data.get("requires", [])), "missing_fact")
        require(not data.get("sets") or data["sets"] not in s["facts"], "already_completed")
        if "methods" in data:
            method = action.get("method", "crowbar")
            require(method in data["methods"], "unsupported_method")
            if method == "crowbar":
                require(s["tool"] == "crowbar" and s["tool_resource"] > 0, "no_usable_crowbar")
                s["tool_resource"] = max(0, s["tool_resource"] - p["gear"]["crowbar"]["wear"])
            price = p["prices"]["pry" if method == "crowbar" else "manual"]
        elif "full" in data:
            method = action.get("method", "full")
            require(method in ("full", "quick"), "unsupported_method")
            if method == "quick":
                require(all(f in s["facts"] for f in data["quick_requires"]), "missing_quick_information")
            price = p["prices"][data[method]]
        elif op == "sample_extract":
            method = action.get("method", "careful")
            require(method in ("careful", "direct"), "unsupported_method")
            price = p["prices"]["sample_" + method]
            if s["coat"] > 0:
                s["coat"] -= 1
            require(method == "careful" and state["coat"] > 0 or "exposure" in action,
                    "sample_risk_branch_required")
            s["exposure"] += action.get("exposure", 0)
        else:
            price = p["prices"][data["price"]]
        if "consumes" in data:
            selections=action.get("selected_units",{})
            require(isinstance(selections,dict) and set(selections)<=set(data["consumes"]), "invalid_material_selection")
            for kind, n in data["consumes"].items():
                consume(s,kind,n,"installed",selected_ids=selections.get(kind))
        if "item" in data:
            source = data["source"]
            require(source not in s["sources"], "source_already_revealed")
            s["sources"].add(source)
            s["units"].append({"id": source + "." + s["task_id"] + "." + data["item"] + ".1",
                               "type": data["item"], "location": "pack", "origin_task":s["task_id"]})
        if data.get("reveals"):
            reveal(s, p, data["reveals"])
        if data.get("sets"):
            s["facts"].add(data["sets"])
    else:
        raise Reject("unsupported_action")
    if price:
        charge(s, price)
        if s["bleeding"]:
            s["hp"] = max(0, s["hp"] - p["health"]["bleed_action"])
        check_death(s, p, "action_bleeding")
    s["revision"] += 1
    validate(s, p)
    return s, price, detail

def matches(actual, expected):
    for key, value in expected.items():
        if isinstance(value, dict):
            if not matches(actual.get(key, {}), value):
                return False
        elif actual.get(key) != value:
            return False
    return True

def run_route(spec, p):
    ledger, error, failed_action = [], None, None
    try:
        s = initial(spec, p)
    except Reject as e:
        return {"id": spec["id"], "error": str(e), "failed_action": "initial",
                "passed": spec.get("expect_error") == str(e), "ledger": []}
    for index, action in enumerate(spec["steps"], 1):
        before = snapshot(s, p)
        try:
            new, price, detail = perform(s, action, p)
        except Reject as e:
            error, failed_action = str(e), index
            ledger.append({"step": index, "action": action, "rejected": error,
                           "before": before, "after": before})
            break
        s = new
        after = snapshot(s, p)
        ledger.append({"step": index, "action": action, "nominal_energy": price,
                       "actual_energy": max(0, before["energy"] - after["energy"]) if action["action"] != "rest" else 0,
                       "before": before, "after": after, "detail": detail})
        if not matches(after, action.get("expect", {})):
            error, failed_action = "checkpoint_mismatch", index
            break
    final = snapshot(s, p)
    days = {}
    for row in ledger:
        if "rejected" in row:
            continue
        day = str(row["before"]["day"])
        d = days.setdefault(day, {"nominal": 0, "actual": 0, "end_energy": None,
                                  "end_location": None, "hp": None})
        d["nominal"] += row["nominal_energy"]
        d["actual"] += row["actual_energy"]
        if row["action"]["action"] != "rest":
            d.update(end_energy=row["after"]["energy"], end_location=row["after"]["location"],
                     hp=row["after"]["hp"])
    peak = max((r[when]["geometry"]["weight"] for r in ledger for when in ("before", "after")), default=0)
    summary = {"id": spec["id"], "purpose": spec["purpose"], "topology": spec.get("topology", "five"),
               "error": error, "failed_action": failed_action, "executed_steps": len(ledger) - bool(error),
               "days": days, "peak_weight": peak,
               "final": {k: final[k] for k in ("status", "reason", "day", "location", "energy", "hp",
                        "satiety", "infection", "exposure", "pipe", "coat", "tool_resource",
                        "next_activity", "inventory_by_location", "equipped_retained", "facts", "bleeding", "wound", "injury", "suppression", "disinfectant_used", "signature_used", "equipment", "character_day", "points", "first_success", "ready_next", "task_id", "painkiller", "painkiller_used", "suppressant_used", "medical_doses")}}
    expected_error = spec.get("expect_error")
    summary["passed"] = error == expected_error and matches(summary, spec.get("expect", {}))
    if "expect_failed_action" in spec:
        summary["passed"] &= failed_action == spec["expect_failed_action"]
    summary["ledger"] = ledger
    return summary

def main():
    ppath, spath = BASE / "parameters.json", BASE / "scenarios.json"
    p = json.loads(ppath.read_text(encoding="utf-8"))
    specs = json.loads(spath.read_text(encoding="utf-8"))
    results, ledgers = [], {}
    for spec in specs["scenarios"]:
        result = run_route(spec, p)
        ledgers[spec["id"]] = result.pop("ledger")
        results.append(result)
    sensitivity = []
    indexed = {s["id"]: s for s in specs["scenarios"]}
    for change in specs.get("sensitivity", []):
        variant = copy.deepcopy(p)
        target = variant
        for key in change["path"][:-1]:
            target = target[key]
        target[change["path"][-1]] = change["value"]
        spec = copy.deepcopy(indexed[change["scenario"]])
        spec["id"] = change["id"]
        spec["expect"] = change.get("expect", {})
        spec["expect_error"] = change.get("expect_error")
        spec.pop("expect_failed_action", None)
        for a in spec["steps"]:
            a.pop("expect", None)
        result = run_route(spec, variant)
        result["changed_parameter"] = {"path": change["path"], "value": change["value"]}
        ledgers[change["id"]] = result.pop("ledger")
        sensitivity.append(result)
    from joint_checks import run_joint
    joint, joint_detail = run_joint(p, specs)
    expected_errors={x["id"]:x.get("expect_error") for x in specs["scenarios"]+specs.get("sensitivity",[])}
    for r in results+sensitivity:
        declared=expected_errors[r["id"]]
        r["classification"] = "unsupported" if declared in ("broken_pipe_needs_other_trace","restricted_deadline_unmodeled") else ("expected_rejection" if declared else "positive")
    passed = sum(r["passed"] for r in results + sensitivity + joint)
    output = {"evidence_kind": p["evidence_kind"], "version": p["version"],
              "base_sha": p["base_sha"],
              "counts": {"scenarios":len(results),"sensitivity":len(sensitivity),"joint":len(joint),
                         "positive":sum(r["classification"]=="positive" for r in results+sensitivity+joint),
                         "expected_rejection":sum(r["classification"]=="expected_rejection" for r in results+sensitivity+joint),
                         "unsupported":sum(r["classification"]=="unsupported" for r in results+sensitivity+joint),
                         "passed":passed,"failed":len(results)+len(sensitivity)+len(joint)-passed,
                         "supported_expected_matched":sum(r["passed"] and r["classification"]!="unsupported" for r in results+sensitivity+joint),
                         "unsupported_recognized":sum(r["passed"] and r["classification"]=="unsupported" for r in results+sensitivity+joint)},
              "scenarios": results, "sensitivity": sensitivity, "joint":joint,
              "limits": specs["limits"]}
    (BASE / "raw-results.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n",
                                          encoding="utf-8", newline="\n")
    (BASE/"joint-results.json").write_text(json.dumps(joint_detail,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")

    # Each changed scalar/collection is stored once. Unit changes are keyed by stable identity.
    compact_ledgers = {}
    for name, rows in ledgers.items():
        steps = []
        for row in rows:
            before, after = row["before"], row["after"]
            delta = {k:v for k,v in after.items() if k not in ("units","geometry","inventory_by_location") and before.get(k)!=v}
            old_units = {u["id"]:u for u in before["units"]}
            changed = [u for u in after["units"] if old_units.get(u["id"])!=u]
            if changed: delta["units_upsert"]=changed
            entry = {"step":row["step"],"action":row["action"],"delta":delta,
                     "nominal_energy":row.get("nominal_energy",0)}
            if row.get("detail"): entry["detail"]=row["detail"]
            if row.get("rejected"): entry["rejected"]=row["rejected"]
            steps.append(entry)
        compact_ledgers[name]={"initial":rows[0]["before"] if rows else None,"steps":steps}
    (BASE/"route-ledgers.json").write_text(json.dumps(compact_ledgers,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    fields = ["scenario", "step", "day", "label", "action", "from", "to", "nominal_energy",
              "energy_before", "energy_after", "hp", "pipe", "coat", "tool_resource",
              "weight", "satiety", "infection", "exposure", "status", "rejected"]
    with (BASE / "route-ledgers.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fields, lineterminator="\n")
        writer.writeheader()
        for name, rows in ledgers.items():
            for row in rows:
                b, a = row["before"], row["after"]
                writer.writerow({"scenario": name, "step": row["step"], "day": b["day"],
                    "label": row["action"].get("label", ""), "action": row["action"]["action"],
                    "from": b["location"], "to": a["location"],
                    "nominal_energy": row.get("nominal_energy", 0),
                    "energy_before": b["energy"], "energy_after": a["energy"],
                    "hp": a["hp"], "pipe": a["pipe"], "coat": a["coat"],
                    "tool_resource": a["tool_resource"], "weight": a["geometry"]["weight"],
                    "satiety": a["satiety"], "infection": a["infection"], "exposure": a["exposure"],
                    "status": a["status"], "rejected": row.get("rejected", "")})
    inputs=("parameters.json","scenarios.json","check_design.py","joint_checks.py","checks_v1_3.py","expected-v1.3.json")
    canonical=json.dumps({k:output[k] for k in ("scenarios","sensitivity","joint")},ensure_ascii=False,sort_keys=True,separators=(",",":")).encode("utf-8")
    metadata={"runtime":__import__("sys").version,"input_sha256":{name:hashlib.sha256((BASE/name).read_bytes()).hexdigest() for name in inputs},
              "canonical_results_sha256":hashlib.sha256(canonical).hexdigest(),
              "stable_output_sha256":{name:hashlib.sha256((BASE/name).read_bytes()).hexdigest() for name in
                                     ("raw-results.json","joint-results.json","route-ledgers.json","route-ledgers.csv")}}
    (BASE/"execution-metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    if not (BASE/"first-run-v1.3.json").exists():
        (BASE/"first-run-v1.3.json").write_text(json.dumps({"metadata":metadata,**output},ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    print(json.dumps({"counts": output["counts"],
          "failures": [r for r in results + sensitivity + joint if not r["passed"]]}, ensure_ascii=False, indent=2))
    raise SystemExit(0 if output["counts"]["failed"] == 0 else 1)

if __name__ == "__main__":
    main()
