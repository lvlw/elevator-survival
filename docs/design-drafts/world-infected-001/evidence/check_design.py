"""Bounded design evidence; Python standard library only.

Replays authored actions against the Draft v1.1 contract. Combat uses fixed
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

def consume(s, kind, quantity, destination="consumed", locations=("pack",)):
    chosen = sorted((u for u in s["units"] if u["type"] == kind and
                     u["location"] in locations), key=lambda u: u["id"])
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
                           if (xx, yy) not in cells]
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
        require(s["hp"] > 0 and s["infection"] < p["health"]["infection_terminal"],
                "active_dead")
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
    if i.get("initial_bandage", True):
        s["units"].append({"id": "initial.bandage.1", "type": "bandage",
                           "location": "q1"})
    for n, item in enumerate(i.get("items", [])):
        for k in range(item.get("quantity", 1)):
            s["units"].append({"id": item.get("id", f"fixture.{n}.{k}"),
                               "type": item["type"],
                               "location": item.get("location", "pack")})
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
    d["geometry"] = geometry(s, p)
    d["inventory_by_location"] = {}
    for u in s["units"]:
        loc = d["inventory_by_location"].setdefault(u["location"], {})
        loc[u["type"]] = loc.get(u["type"], 0) + 1
    return d

def charge(s, price):
    s["energy"] = max(0, s["energy"] - price)

def terminal_death(s, reason):
    s["status"] = "death" if reason != "infection_terminal" else "infection_terminal"
    s["reason"] = reason
    s["next_activity"] = "new_character_setup"
    s["equipped_retained"] = False
    s["equipment"] = {"weapon": None, "armor": None, "utility": None}
    for u in s["units"]:
        if u["location"] not in ("consumed", "installed"):
            u["location"] = "lost"
    s["pending"] = None

def check_death(s, p, reason):
    if s["hp"] <= 0:
        s["hp"] = 0
        terminal_death(s, reason)
        return True
    if s["infection"] >= p["health"]["infection_terminal"]:
        terminal_death(s, "infection_terminal")
        return True
    return False

def reveal(s, p, source):
    require(source not in s["sources"], "source_already_revealed")
    data = p["sources"][source]
    s["sources"].add(source)
    for kind, quantity in data["items"].items():
        for index in range(quantity):
            s["units"].append({"id": f"{source}.{kind}.{index + 1}",
                               "type": kind, "location": "ground:" + s["location"]})

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
    s["exposure"] = 0
    stages.append({"stage": "infection", "infection": s["infection"]})
    if check_death(s, p, "infection_terminal"):
        return stages
    s["satiety"] = max(0, s["satiety"] - p["health"]["night_food"])
    if s["satiety"] <= p["health"]["starve_threshold"]:
        s["hp"] = max(0, s["hp"] - p["health"]["starve_damage"])
    stages.append({"stage": "food", "hp": s["hp"], "satiety": s["satiety"]})
    check_death(s, p, "starvation")
    return stages

def finish_return(s, p, outcome):
    if outcome == "deadline_recall":
        for u in s["units"]:
            if u["location"] in p["terminal_candidate"]["deadline_discards"]:
                u["location"] = "lost"
    else:
        for u in s["units"]:
            if u["location"] in ("pack", "q1", "q2"):
                if p["items"][u["type"]]["kind"] == "ordinary":
                    u["location"] = "bank"
                elif u["type"] == "sample" and outcome == "success":
                    u["location"] = "delivered"
                elif u["type"] == "sample" and outcome == "failure":
                    u["location"] = "delivered_partial"
                else:
                    u["location"] = "impounded"
    for u in s["units"]:
        if u["location"].startswith("ground:"):
            u["location"] = "lost"
    fee = {}
    if outcome != "success":
        for kind, amount in p["terminal_candidate"]["failure_fee"].items():
            fee[kind] = min(amount, count(s, kind, ("bank",)))
            consume(s, kind, fee[kind], "fee", ("bank",))
    s["status"], s["reason"] = outcome, outcome
    s["location"] = "HUB"
    s["next_activity"] = p["terminal_candidate"]["next_activity"]
    return fee

def combat(s, p, trace_name):
    t = p["traces"][trace_name]
    require(s["pending"] and s["pending"]["enemy"] == t["enemy"], "no_matching_encounter")
    e = s["enemies"][t["enemy"]]
    require(e["hp"] == t["start_hp"] and e["intent"] == t["start_intent"],
            "trace_start_mismatch")
    if t.get("requires_reentry"):
        require(e["engaged"], "not_reentry")
    if any(row[1] == "charged" for row in t["events"]):
        require(not s["signature_used"], "signature_already_used_today")
    defending, events, last_ctb = False, [], -1
    e["engaged"] = True
    for event in t["events"]:
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

def perform(state, action, p):
    """Work on a copy so every rejected input leaves the prior ledger intact."""
    s = copy.deepcopy(state)
    op = action["action"]
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
        consume(s, action["item"], action["quantity"], "ground:" + s["location"], (loc,))
    elif op == "use":
        kind = action["item"]
        loc = action.get("from", "pack")
        require(loc in ("pack", "q1", "q2"), "not_carried_source")
        if kind == "bandage":
            require(s["hp"] < p["limits"]["hp"] or s["bleeding"] or s["wound"],
                    "no_medical_target")
            consume(s, kind, 1, locations=(loc,))
            s["hp"] = min(p["limits"]["hp"], s["hp"] + p["health"]["bandage_heal"])
            s["bleeding"], s["wound"] = False, False
        elif kind == "ration":
            require(s["satiety"] < p["limits"]["satiety"], "full_satiety")
            consume(s, kind, 1, locations=(loc,))
            s["satiety"] = min(p["limits"]["satiety"],
                              s["satiety"] + p["health"]["ration_gain"])
        elif kind == "disinfectant":
            require(s["exposure"] > 0 and not s["disinfectant_used"], "disinfectant_condition")
            consume(s, kind, 1, locations=(loc,))
            s["exposure"] -= 1
            s["disinfectant_used"] = True
        else:
            raise Reject("unsupported_self_use")
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
            s["signature_used"] = False
            s["disinfectant_used"] = False
            s["suppression"] = 0
            detail["rest_rank"] = rank
    elif op in ("success", "failure"):
        require(s["location"] == "H0", "not_return_point")
        complete = "installed" in s["facts"] and count(s, "sample", ("pack",)) == 1
        require(complete if op == "success" else not complete, "wrong_return_outcome")
        detail["fee"] = finish_return(s, p, op)
    elif op == "deadline":
        require(s["day"] == p["limits"]["days"], "not_deadline")
        detail["stages"] = daily_hazards(s, p)
        if s["status"] == "active":
            s["suppression"] = 0  # Expire after its actual final-day effect, without granting a new day.
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
            for kind, n in data["consumes"].items():
                consume(s, kind, n, "installed")
        if "item" in data:
            source = data["source"]
            require(source not in s["sources"], "source_already_revealed")
            s["sources"].add(source)
            s["units"].append({"id": source + "." + data["item"] + ".1",
                               "type": data["item"], "location": "pack"})
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
                        "next_activity", "inventory_by_location", "equipped_retained", "facts", "bleeding", "wound", "injury", "suppression", "disinfectant_used", "signature_used", "equipment")}}
    expected_error = spec.get("expect_error")
    summary["passed"] = error == expected_error and matches(summary, spec.get("expect", {}))
    if "expect_failed_action" in spec:
        summary["passed"] &= failed_action == spec["expect_failed_action"]
    if spec.get("empty_next_task_witness"):
        # One explicitly requested arithmetic handoff, not a general next-world engine.
        available = [u for u in s["units"] if u["location"] in ("bank", "pack", "q1", "q2")]
        empty = not available and all(v is None for v in s["equipment"].values())
        eligible = s["status"] == "failure" and s["hp"] == 1 and s["bleeding"] and empty
        continuation = {
            "kind": "single authored next-task movement arithmetic; not arbitrary task replay",
            "hub": {"hp": s["hp"], "bleeding": s["bleeding"], "available_units": len(available),
                    "equipment": s["equipment"], "can_pause": True},
            "next_task": {"hp": s["hp"], "bleeding": s["bleeding"],
                          "energy": p["limits"]["energy"], "location": "N0",
                          "available_units": len(available), "equipment": s["equipment"]},
            "one_known_edge": {"from": "N0", "to": "N1",
                              "nominal_energy": p["prices"]["local_move"],
                              "energy": max(0, p["limits"]["energy"] - p["prices"]["local_move"]),
                              "hp": max(0, s["hp"] - p["health"]["bleed_action"]),
                              "status": "death", "next_activity": "new_character_setup"}}
        summary["empty_next_task_witness"] = continuation
        summary["passed"] &= eligible and matches(continuation, spec["expect_continuation"])
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
    passed = sum(r["passed"] for r in results + sensitivity)
    output = {"evidence_kind": p["evidence_kind"], "version": p["version"],
              "base_sha": p["base_sha"], "python": __import__("sys").version,
              "input_sha256": {f.name: hashlib.sha256(f.read_bytes()).hexdigest()
                                for f in (ppath, spath, Path(__file__).resolve())},
              "counts": {"scenarios": len(results), "sensitivity": len(sensitivity),
                         "passed": passed, "failed": len(results) + len(sensitivity) - passed},
              "scenarios": results, "sensitivity": sensitivity,
              "limits": specs["limits"]}
    (BASE / "raw-results.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n",
                                          encoding="utf-8", newline="\n")
    # A pre-state equals the previous post-state; retain it once, with explicit references.
    compact_ledgers = {}
    for name, rows in ledgers.items():
        steps = []
        for i, row in enumerate(rows):
            entry = {k: v for k, v in row.items() if k != "before"}
            entry["before_state_ref"] = "initial" if i == 0 else f"steps[{i-1}].after"
            steps.append(entry)
        compact_ledgers[name] = {"initial": rows[0]["before"] if rows else None, "steps": steps}
    (BASE / "route-ledgers.json").write_text(json.dumps(compact_ledgers, ensure_ascii=False, indent=2) + "\n",
                                            encoding="utf-8", newline="\n")
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
    print(json.dumps({"counts": output["counts"],
          "failures": [r for r in results + sensitivity if not r["passed"]]}, ensure_ascii=False, indent=2))
    raise SystemExit(0 if output["counts"]["failed"] == 0 else 1)

if __name__ == "__main__":
    main()
