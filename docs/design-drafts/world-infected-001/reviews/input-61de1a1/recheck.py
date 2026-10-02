"""Independent arithmetic check of transcribed WORLD-DESIGN-001 draft inputs.
Not a game engine, source-code test, full route validator, or balance simulation.
Only Python standard library; run: python recheck.py > recheck-results.json
"""
from __future__ import annotations
import json
import math

SHA = '61de1a10e5da12df2f172e18f6e05a69b755bfa8'

# Each term is transcribed from 08-balance-budget.md. No production code called.
seven_day_terms = [
    [7*2, 3*12, 4],
    [3*2, 8, 6, 8, 6],
    [4*2, 8, 6, 6, 8],
    [4*2, 4*2, 8, 16, 4, 6, 10, 8, 6, 12],
    [5*2, 8, 6, 20],
    [3*2, 6, 10, 3*2],
    [6*2, 8, 12, 10, 5*3, 12, 3*2],
]
seven = [sum(t) for t in seven_day_terms]
assert seven == [54,34,36,86,44,28,75]

# Compact day 1 exact order, respecting 'positive energy permits final action'.
compact_d1 = [2,2,8,2,6,8,6,2,16,6,6,10,8,2,6,12]
e = 100
for cost in compact_d1:
    assert e > 0
    e = max(0, e-cost)
assert sum(compact_d1)==102 and e==0
compact = [sum(compact_d1), sum([6,8,10,6,6,20,4,10,9]),
           sum([10,8,6,12,10,12,12,6])]
assert compact == [102,79,76]
assert [max(0, cap-cost) for cap,cost in zip([100,85,100],compact)] == [0,6,24]

ctbs = [380,440,100,280,460]
combat_energy = [max(6,4*math.ceil(n/100)) for n in ctbs]
assert combat_energy == [16,20,6,12,20]

# Seven-day health/food/contamination, with the draft's explicitly selected branches.
hp, food, progress = 8, 6, 0
ration_stock = 0
health_rows = []
hits = [0,0,0,3,3,1,2]
heals = [0,0,0,1,1,1,0]
found_food = [0,2,1,3,0,0,0]
eaten = [0,0,1,1,1,1,0]
exposures = [0,0,0,0,1,0,0]
for i in range(7):
    hp -= hits[i]
    hp = min(12,hp+heals[i])
    ration_stock += found_food[i]
    assert ration_stock >= eaten[i]
    ration_stock -= eaten[i]
    food = min(6, food+2*eaten[i])
    if i < 6:
        base = 0 if progress==0 else (5 if progress<30 else 10 if progress<60 else 15 if progress<90 else 20)
        progress += base+20*exposures[i]
        food = max(0,food-2)
        if food <= 1:
            hp -= 1
    health_rows.append({'day':i+1,'hp':hp,'satiety':food,'infection':progress,'rations':ration_stock})
assert health_rows[-1] == {'day':7,'hp':2,'satiety':2,'infection':25,'rations':2}
assert 4-2-1-1 == 0  # Draft's already disclosed H scratch-wound alternative.

# Seven-day peak arrangement: x,y,w,h; stack mass is actual quantity, not grid area.
rects=[('sample',0,0,2,2,4),('control',2,0,2,2,4),('module',4,0,1,2,2),
       ('metal3',5,0,1,1,3),('electronics',5,1,1,1,1),('batteries2',0,2,1,1,2),
       ('cloth',1,2,1,1,1),('rations2',2,2,1,1,2),('card',3,2,1,1,0)]
occupied=set()
for name,x,y,w,h,mass in rects:
    cells={(xx,yy) for xx in range(x,x+w) for yy in range(y,y+h)}
    assert all(0<=xx<6 and 0<=yy<4 for xx,yy in cells),name
    assert not (occupied & cells),name
    occupied |= cells
assert len(occupied)==16 and sum(r[5] for r in rects)==19

result={
 'reviewed_sha':SHA,
 'evidence_kind':'independent arithmetic and one geometric witness; transcribed draft inputs',
 'not_executed':['production game rules','full action legality replay','random simulation','browser','npm tests','save/load'],
 'seven_day_energy_costs':seven,
 'seven_day_final_energy':100-seven[-1],
 'six_nights_unspent_energy_discarded':sum(100-c for c in seven[:6]),
 'unspent_caveat':'This is a chosen route, not proof that all discarded energy was forced by the daily-region gate.',
 'compact_route_nominal_costs':compact,
 'compact_route_end_energy':[0,6,24],
 'combat_ctb_conversion_only':dict(zip(map(str,ctbs),combat_energy)),
 'seven_day_health_rows':health_rows,
 'seven_day_selected_branch_equipment':{'pipe':15,'coat':6,'crowbar':8},
 'peak_witness':{'grid_cells':16,'backpack_weight':19,'rectangles_nonoverlapping':True},
 'document_legality_mismatch':{
   'claim':'compact route Day2 performs quick matching at C3',
   'spec':'06-event-pack: matching at C1; C3 requires matching already done',
   'effect':'same sum does not certify a legal action sequence; move the action or explicitly revise the event location and rerun'
 },
 'review_status':'arithmetic matches stated conditional results; design needs revision'
}
print(json.dumps(result,ensure_ascii=False,indent=2))
