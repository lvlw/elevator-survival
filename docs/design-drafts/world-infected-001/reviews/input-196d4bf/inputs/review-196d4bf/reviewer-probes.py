"""Independent review probes, not the repository's 171-case suite.

Selected exact-SHA functions are executed from source-excerpts.py.
The safe-supply route is a reviewer-authored bounded model of the documented
edges/actions. It is not c.perform, the production engine, or an RNG model.
"""
from pathlib import Path
import importlib.util, copy, json, hashlib
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('excerpt',ROOT/'source-excerpts.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
p={
 'limits':{'hp':12},
 'health':{'bleed_night':2,'bleed_action':1,'exposure_progress':20,'night_food':2,'starve_threshold':1,'starve_damage':1,
   'infection_stages':[{'min':0,'base':0},{'min':1,'base':5},{'min':30,'base':10},{'min':60,'base':15},{'min':90,'base':20},{'min':120,'base':20}],
   'infection_damage':[{'min':0,'hp':0},{'min':60,'hp':1},{'min':90,'hp':2},{'min':120,'hp':3}]},
 'economy':{'max_balance':2147483647,'success_reward':120,'failure_penalty':30,'severe_therapy':80,'infection_therapy':40,'body_therapy':20},
 'terminal_candidate':{'next_activity':'same_character_hub_preparation'},
 'items':{k:{'kind':'ordinary'} for k in ('bandage','ration','metal','cloth','battery')},
 'gear':{'pipe':{'basic_damage':4,'charged_damage':6,'basic_wear':1,'charged_wear':3},'coat':{'mitigation':1}},
 'combat_energy':{'minimum':6,'multiplier':4,'ctb_unit':100,'defense_divisor':2},
 'traces':{'L_full':{'enemy':'L','start_hp':16,'start_intent':'smash','encounter_mode':'first','enemy_end':0,'next_intent':'smash','duration':380,
 'events':[[0,'basic'],[100,'defend'],[150,'hit',6,'smash',False,0,1],[180,'basic'],[280,'basic'],[380,'basic']]}}
}
p['items']['sample']={'kind':'quest'}

def state(**kw):
 s={'status':'active','hp':12,'infection':0,'exposure':0,'bleeding':False,'wound':False,'injury':'none','satiety':6,'suppression':0,
 'energy':100,'day':1,'character_day':1,'points':0,'task_id':'R01','first_success':False,'ready_next':False,
 'location':'H0','units':[{'id':'initial.bandage.1','type':'bandage','location':'q1','origin_task':'before'}],
 'pipe':30,'coat':12,'tool':'crowbar','tool_resource':12,'signature_used':False,'pending':None,
 'equipment':{'weapon':'old.pipe','armor':'old.coat','utility':'old.crowbar'},
 'equipment_origin':{'weapon':'before','armor':'before','utility':'before'},'enemies':{},'equipped_retained':True}
 s.update(kw);return s

results=[]
def record(name,actual,expected,kind='regression'):
 ok=actual==expected
 results.append({'id':name,'kind':kind,'matches_expectation':ok,'actual':actual,'expected':expected})
 return ok

def enemy_case(engaged=False):
 return state(location='L2',pending={'enemy':'L','from':'L1'},enemies={'L':{'hp':16,'intent':'smash','engaged':engaged,'risk_cursor':0}})

s=enemy_case();cost,ev=c.combat(s,p,'L_full')
record('F1_current_baseline',(s['hp'],s['pipe'],cost),(9,26,16))
for damage in (6,16):
 pp=copy.deepcopy(p);pp['gear']['pipe']['basic_damage']=damage
 try:c.combat(enemy_case(),pp,'L_full');error=None
 except c.Reject as ex:error=str(ex)
 record('F1a_early_kill_'+str(damage),error,'trace_continues_after_incapacitation')
try:c.combat(enemy_case(True),p,'L_full');error=None
except c.Reject as ex:error=str(ex)
record('F1b_reentry_rejects_first',error,'not_first_encounter')

for infection,exposure,hp,suppression,expected in [
 (59,0,5,0,(69,4,2,'active')),(89,0,5,0,(104,3,2,'active')),
 (110,0,5,0,(130,2,2,'active')),(110,0,3,0,(130,0,4,'death')),
 (110,0,5,15,(115,3,2,'active')),(130,0,5,0,(150,2,2,'active'))]:
 s=state(infection=infection,exposure=exposure,hp=hp,suppression=suppression,satiety=4)
 c.daily_hazards(s,p)
 record('disease_'+str(infection)+'_'+str(hp)+'_'+str(suppression),(s['infection'],s['hp'],s['satiety'],s['status']),expected)

for fields,price in [({'hp':12},0),({'hp':1},20),({'hp':12,'injury':'light_laceration'},20),({'infection':1},40),({'exposure':1},40),({'infection':89},40),({'infection':90},80),({'hp':1,'infection':130},80)]:
 record('quote_'+str(fields),c.therapy_cost(state(**fields),p),price)
record('first_success_net',120-40-18,62,'arithmetic')
record('severe_success_net',120-80-18,22,'arithmetic')
record('success_failure_success',2*120-2*40-30-18,112,'arithmetic')
record('ten_success_one_purchase',10*120-10*40-18,782,'arithmetic')
record('ten_success_ten_purchases',10*(120-40-18),620,'arithmetic')

# Scope-specific defect probe: settled dispositions should not turn into new death losses.
s=state(hp=0,points=30,units=[
 {'id':'old.sample','type':'sample','location':'delivered','origin_task':'OLD-SUCCESS'},
 {'id':'old.recovered','type':'bandage','location':'recovered','origin_task':'OLD-FAILURE'},
 {'id':'old.installed','type':'metal','location':'installed','origin_task':'OLD-SUCCESS'},
 {'id':'current.bank','type':'bandage','location':'bank','origin_task':'before'}])
c.terminal_death(s,'review_death')
actual={u['id']:u['location'] for u in s['units']}
expected={'old.sample':'delivered','old.recovered':'recovered','old.installed':'installed','current.bank':'lost'}
record('settled_dispositions_after_later_death',actual,expected,'new_finding')

# Independent bounded counterexample: same supply premise as submitted 10-task trials.
# Existing L_front already contains BOTH bandage1 and ration2; no pharmacy visit needed.
EDGES={frozenset(x) for x in [('H0','H1'),('H1','H7'),('H7','L0'),('L0','L1')]}
OBS={'H0':['H1'],'H1':['H0','H7'],'H7':['H1','L0'],'L0':['H7','L1'],'L1':['L0']}
trace=[];s=state(hp=4);known=set();paid=0

def summary(s):
 inv={}
 for u in s['units']:
  loc=inv.setdefault(u['location'],{});loc[u['type']]=loc.get(u['type'],0)+1
 return {'task_id':s['task_id'],'character_day':s['character_day'],'location':s['location'],'hp':s['hp'],'satiety':s['satiety'],
 'infection':s['infection'],'energy':s['energy'],'points':s['points'],'pipe':s['pipe'],'coat':s['coat'],'tool_resource':s['tool_resource'],'inventory':inv}

def observe():
 for to in OBS[s['location']]:known.add(frozenset((s['location'],to)))
def write(op,cost=0):
 global paid
 if cost:
  assert s['energy']>0
  s['energy']=max(0,s['energy']-cost);paid+=cost
 # Independent witness: all carried units are 1x1, <=3 units in pack here.
 carried=[u for u in s['units'] if u['location']=='pack']
 assert len(carried)<=24 and len(carried)<=16
 assert len({u['id'] for u in s['units']})==len(s['units'])
 trace.append({'op':op,'nominal_energy':cost,'after':summary(s)})
def move(dest):
 edge=frozenset((s['location'],dest));assert edge in EDGES and edge in known
 cost=2 if s['location'][0]==dest[0] else 8
 s['location']=dest;observe();write('move:'+dest,cost)
def use_new(kind):
 matches=[u for u in s['units'] if u['type']==kind and u['location']=='pack' and u['origin_task']==s['task_id']]
 assert matches
 matches[0]['location']='consumed'
 if kind=='bandage':assert s['hp']<12;s['hp']=min(12,s['hp']+1)
 else:assert s['satiety']<6;s['satiety']=min(6,s['satiety']+2)
 write('use:'+kind)

rounds=[]
for n in range(1,11):
 if n>1:
  assert s['location']=='HUB'
  c.daily_hazards(s,p);assert s['hp']>0
  c.advance_character_day(s);s['energy']=100
  write('hub_rest')
  s.update(task_id='R%02d'%n,location='H0',status='active',day=1,ready_next=False)
  known=set()
  write('accept_distinct_offered_task')
 observe();before=summary(s);spent_before=paid
 for dest in ('H1','H7','L0','L1'):move(dest)
 assert s['location']=='L1'
 write('L_front_manual_open',14);write('L_front_search',8)
 for kind,qty in [('ration',2),('bandage',1)]:
  for i in range(qty):
   s['units'].append({'id':f'L_front.{s["task_id"]}.{kind}.{i+1}','type':kind,'location':'ground:L1','origin_task':s['task_id']})
  write('reveal:'+kind)
  for u in s['units']:
   if u['origin_task']==s['task_id'] and u['type']==kind and u['location']=='ground:L1':u['location']='pack'
  write('pickup:'+kind)
 if s['hp']<12:use_new('bandage')
 while s['satiety']<6:use_new('ration')
 for dest in ('L0','H7','H1','H0'):move(dest)
 assert s['location']=='H0' and s['hp']>0
 c.finish_return(s,p,'failure');write('voluntary_failure')
 rounds.append({'round':n,'before':before,'after':summary(s),'nominal_energy':paid-spent_before})
record('safe_front_each_round_cost',[r['nominal_energy'] for r in rounds],[50]*10,'new_counterexample')
record('safe_front_ten_final',{k:s[k] for k in ('hp','satiety','infection','points','energy','character_day','pipe','coat','tool_resource')},
 {'hp':12,'satiety':6,'infection':0,'points':0,'energy':50,'character_day':10,'pipe':30,'coat':12,'tool_resource':12},'new_counterexample')
record('safe_front_no_new_bank_units',sum(u['location']=='bank' and u['origin_task']!='before' for u in s['units']),0,'new_counterexample')
record('safe_front_total_cost',paid,500,'new_counterexample')
after_extra=copy.deepcopy(s);c.daily_hazards(after_extra,p);c.advance_character_day(after_extra)
record('safe_front_after_optional_tenth_night',(after_extra['hp'],after_extra['satiety']),(12,4),'new_counterexample')

output={
 'review_commit':'196d4bf03b07eb9af452ff99aae4ff553f9659d6',
 'scope':'Selected exact-source functions, independent arithmetic, and reviewer-authored safe-route bounded replay; NOT the repository full suite.',
 'reported_suite_rerun':False,
 'counts':{'observations':len(results),'met_expectation':sum(x['matches_expectation'] for x in results),'discrepancies':sum(not x['matches_expectation'] for x in results)},
 'observations':results,
 'safe_front_counterexample':{'supply':'10 distinct offered executions of the same rule set, as in the submitted stress premise; not an authorization for infinite offers',
  'initial':'HP4, infection0, no wound/bleeding, satiety6, points0; existing gear and one old bandage',
  'rounds':rounds,'action_ledger':trace,'final':summary(s),'total_energy':paid,
  'exclusions':['No combat or RNG','No old consumable use','No durability loss','No gain of points, unlocks, or carried new inventory',
                'No claim for an infected, bleeding, or universally adversarial initial state','No production code or save validation']},
 'file_sha256':{x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in [ROOT/'source-excerpts.py',Path(__file__)]}
}
(ROOT/'reviewer-results.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(output['counts']))
print(json.dumps({'discrepancies':[x for x in results if not x['matches_expectation']],'safe_front':{k:s[k] for k in ('hp','satiety','energy','character_day','points')}},ensure_ascii=False,indent=2))
