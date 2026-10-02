"""Review-only transcription of the combat routine and required helpers.
Source: lvlw/elevator-survival @697ed7ae010bbdfcc70aa0eb152d045f283d3606
Path: docs/design-drafts/world-infected-001/evidence/check_design.py
Read through the GitHub connector. This is NOT a full copy/re-run of its suite.
The combat/require/charge/check_death/terminal_death function bodies are transcribed
without intentional logic changes. The isolated caller is supplied separately.
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
