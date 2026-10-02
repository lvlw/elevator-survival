"""Verbatim function excerpts read through GitHub at exact SHA 196d4bf.
Not a complete copy of check_design.py, and not a production-game executor.
Source: docs/design-drafts/world-infected-001/evidence/check_design.py.
Only these selected functions and the math import are present.
"""
import math

class Reject(Exception):
    pass

def require(ok, reason):
    if not ok:
        raise Reject(reason)

def charge(s, price):
    s["energy"] = max(0, s["energy"] - price)

def terminal_death(s, reason):
    s["status"] = "death"
    s["points"] = 0
    s["ready_next"] = False
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
    return False

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
                u["location"] = "bank" if success or u.get("origin_task") != s["task_id"] else "recovered"
            elif u["type"] == "sample":
                u["location"] = "delivered" if success else "delivered_partial"
            else:
                u["location"] = "impounded"
        elif u["location"].startswith("ground:"):
            u["location"] = "lost"
    if not success:
        for slot, origin in s["equipment_origin"].items():
            if origin == s["task_id"]:
                s["equipment"][slot] = None
                if slot == "weapon": s["pipe"] = 0
                elif slot == "armor": s["coat"] = 0
                elif slot == "utility": s["tool"], s["tool_resource"] = "none", 0
    fee = min(s["points"], p["economy"]["failure_penalty"]) if not success else 0
    s["points"] += p["economy"]["success_reward"] if success else -fee
    s["first_success"] |= success
    s["status"], s["reason"] = outcome, outcome
    s["location"] = "HUB"
    s["next_activity"] = p["terminal_candidate"]["next_activity"]
    return {"points":fee, "reward":p["economy"]["success_reward"] if success else 0}

def therapy_cost(s, p):
    body = s["hp"] < p["limits"]["hp"] or s["bleeding"] or s["wound"] or s["injury"] != "none"
    if not body and s["infection"] == 0 and s["exposure"] == 0: return 0
    if s["infection"] >= 90: return p["economy"]["severe_therapy"]
    if s["infection"] > 0 or s["exposure"] > 0: return p["economy"]["infection_therapy"]
    return p["economy"]["body_therapy"]

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
