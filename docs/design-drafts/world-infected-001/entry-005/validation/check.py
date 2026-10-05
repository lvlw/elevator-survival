"""Finite boundary assertions ONLY; not a combat engine or production save reader.
No RNG, damage generator, map walker, capability or actual current installation.
Expected answers are case data, never computed from the checker under test.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

class Reject(Exception):
    pass

def require(ok, code):
    if not ok:
        raise Reject(code)

def integer(n):
    return type(n) is int and 0 <= n <= 9007199254740991

def keys(value, required, optional=()):
    require(type(value) is dict and set(required) <= set(value) <= set(required) | set(optional), 'SHAPE')

def check_state(s, spec):
    keys(s, spec['state'].keys())
    for k in ['revision','cycle','taskDay','hp','energy','quota']:
        require(integer(s[k]), 'RAW_NUMBER')
    require(1 <= s['cycle'] and 1 <= s['taskDay'] <= 7 and s['hp'] <= 12 and s['energy'] <= 100 and s['quota'] <= 1, 'RANGE')
    require(s['phase'] in ['stable','pending','combat','dead','hub'], 'PHASE')
    require(s['specialty'] in ['scout','engineer','survival'], 'CHOICE')
    for k in ['bleeding','firstBandageUsed','closed']:
        require(type(s[k]) is bool, 'RAW_BOOLEAN')
    e=s['enemy']; keys(e, spec['state']['enemy'].keys())
    require(e['id'] in ['orderly','porter','technician'] and e['intent'] in ['basic','special'], 'ENEMY_ID')
    require(all(integer(e[k]) for k in ['hp','count','risk']), 'RAW_NUMBER')
    require(e['hp'] <= (14 if e['id']=='orderly' else 16), 'ENEMY_HP')
    require(type(e['defeated']) is bool and type(e['encountered']) is bool and e['defeated']==(e['hp']==0), 'ENEMY_STATE')
    require(e['encountered'] or (e['count']==e['risk']==0), 'ENEMY_STATE')
    for k in ['originUnits','consumed','exitIds']:
        require(type(s[k]) is list and all(type(x) is str and x for x in s[k]) and len(set(s[k]))==len(s[k]), 'SOURCE_SHAPE')
    require(set(s['originUnits']).isdisjoint(s['consumed']), 'UNIT_REPLAY')
    require((s['phase']=='dead')==(s['hp']==0) or s['phase']=='pending', 'HP_PHASE')
    require(s['closed']==(s['phase'] in ['dead','hub']), 'CLOSURE')
    require((s['battle'] is not None)==(s['phase']=='combat'), 'BATTLE_PHASE')
    require((s['terminal'] is not None)==(s['phase']=='dead'), 'TERMINAL_PHASE')
    if s['battle'] is not None:
        b=s['battle']; keys(b,spec['activeBattle'].keys())
        for k in ['entryRevision','current','playerNext','enemyNext','entryEnemyCount','entryRisk']:
            require(integer(b[k]),'RAW_NUMBER')
        require(b['defense'] is None and b['escape'] is None, 'INTERMEDIATE_SAVE')
        require(s['hp']>0 and e['hp']>0 and b['current']==b['playerNext']<=b['enemyNext'], 'QUEUE')

def proposal_numbers(value, key=None):
    # Python bool == int is never a valid raw numeric witness.
    booleans={'arrivalPending','bleeding','firstBandageUsed','closed','encountered','defeated',
        'firstAfter','firstBefore','bluntWeakness','newWoundChangesCompletion','currentRetained'}
    if type(value) is dict:
        for k,v in value.items(): proposal_numbers(v,k)
    elif type(value) is list:
        for v in value: proposal_numbers(v,key)
    elif type(value) is bool:
        require(key in booleans,'RAW_NUMBER')
    elif type(value) in (int,float):
        require(integer(value),'RAW_NUMBER')

def validate(case, spec, negative):
    op=case['operation']; a=case['before']; c=case['command']; p=case['proposal']
    check_state(a,spec)
    if op not in ['trace','restore']: proposal_numbers(p)
    if op=='unsupported':
        require(c['subject'] in spec['unsupported'],'SHAPE')
        return 'UNSUPPORTED'
    if op not in ['order','trace','transaction','restore']:
        require(integer(c.get('expectedRevision')), 'RAW_NUMBER')
        require(c['expectedRevision']==a['revision'], 'STALE')
    if op=='entry':
        keys(c,['kind','expectedRevision','edge']); require(c['kind']=='move','INTENT')
        require(a['phase']=='stable' and not a['closed'] and a['energy']>0,'ENTRY_PHASE')
        keys(p,['arrivalHp','arrivalEnergy','battle','priorEnemy','arrivalPending'])
        require(integer(p['arrivalHp']) and integer(p['arrivalEnergy']), 'RAW_NUMBER')
        if p['arrivalHp']==0:
            require(p['battle'] is None,'DEATH_BEFORE_ENTRY'); return 'DEAD_ONLY'
        require(p['arrivalPending'] and p['battle'] is not None, 'MISSING_ENCOUNTER')
        b=p['battle']; keys(b,spec['activeBattle'].keys())
        require(p['priorEnemy']==a['enemy'], 'PERSISTENCE')
        require(b['from']==a['node'] and b['edge']==c['edge'] and b['node']=='H4','ENTRY_WITNESS')
        require(b['entryRevision']==a['revision']+1 and b['binding']==spec['bindings']['execution'] and b['enemyId']==a['enemy']['id'],'BINDING')
        e=a['enemy']; require(not e['defeated'], 'ENEMY_DEAD')
        require(b['engagement']==('reentry' if e['encountered'] else 'first'),'ENGAGEMENT')
        require(b['current']==b['playerNext']==0 and b['enemyNext']==(50 if e['encountered'] else 70),'ENTRY_QUEUE')
        require(b['entryEnemyCount']==e['count'] and b['entryRisk']==e['risk'],'CURSOR')
        return 'ACTIVE_DECISION'
    if op=='exit':
        keys(c,['kind','expectedRevision']); require(c['kind'] in ['victory','retreat'],'INTENT')
        require(a['phase']=='combat','EXIT_PHASE'); b=a['battle']
        keys(p,['elapsed','exitId','debits','energyAfter','nodeAfter','hpAfter','extraBleed','enemyAfter'])
        require(all(integer(p[k]) for k in ['elapsed','energyAfter','hpAfter','extraBleed']),'RAW_NUMBER')
        require(p['hpAfter']>0,'DEATH_BEFORE_EXIT')
        require(p['elapsed']>=b['current'],'ELAPSED')
        cost=max(6,((p['elapsed']+99)//100)*4)
        if negative!='duplicate-exit':
            require(p['exitId']==b['id'] and p['exitId'] not in a['exitIds'] and p['debits']==[cost] and p['energyAfter']==max(0,a['energy']-cost),'EXIT_ONCE')
        require(p['extraBleed']==0,'EXIT_BLEED')
        require(p['nodeAfter']==(b['from'] if c['kind']=='retreat' else b['node']),'RETREAT_NODE')
        if c['kind']=='retreat' and negative!='persistent-reset':
            require(p['enemyAfter']==a['enemy'],'PERSISTENCE')
        if c['kind']=='victory':
            require(p['enemyAfter']['hp']==0 and p['enemyAfter']['defeated'],'VICTORY')
        return 'STABLE_EXIT'
    if op=='continuity':
        keys(c,['kind','expectedRevision']); require(c['kind'] in ['reentry','rest','restore'],'INTENT')
        check_state(p,spec)
        if negative!='persistent-reset': require(p['enemy']==a['enemy'],'PERSISTENCE')
        if negative!='consumption-rollback':
            require(p['firstBandageUsed']==a['firstBandageUsed'] and p['originUnits']==a['originUnits'] and p['consumed']==a['consumed'],'RESOURCE_CONTINUITY')
            require(p['quota']==(1 if c['kind']=='rest' else a['quota']),'RESOURCE_CONTINUITY')
        require(p['specialty']==a['specialty'],'CHOICE_LOCK')
        return 'CONTINUOUS'
    if op=='medicine':
        keys(c,['kind','expectedRevision','slot','instance'],['quantity','wound'])
        require(c['kind']=='bandage','INTENT')
        require(integer(c['slot']) and c['slot']<2,'SLOT')
        require('quantity' not in c or type(c['quantity']) is int and c['quantity']==1,'QUANTITY')
        require(a['phase']=='combat' and a['hp']>0,'MEDICAL_PHASE')
        keys(p,['location','unit','wounds','selectedWound','hpAfterPrimary','firstAfter','liveAfter','consumedAfter','quotaAfter'])
        require(p['location']=='quick' and c['instance']==p['unit'] and p['unit'] in a['originUnits'],'LOCATION')
        require(a['hp']<12 or a['bleeding'] or len(p['wounds'])>0,'NO_TARGET')
        require((not p['wounds'] and c.get('wound') is None) or c.get('wound') in p['wounds'],'WOUND_TARGET')
        require(p['selectedWound']==c.get('wound'),'WOUND_TARGET')
        heal=2 if a['specialty']=='survival' and not a['firstBandageUsed'] else 1
        require(p['hpAfterPrimary']==min(12,a['hp']+heal),'HEAL')
        if negative!='consumption-rollback':
            require(p['firstAfter'] is True and p['quotaAfter']==a['quota'] and p['liveAfter']==[u for u in a['originUnits'] if u!=p['unit']] and p['consumedAfter']==a['consumed']+[p['unit']],'RESOURCE_CONTINUITY')
        return 'MEDICINE'
    if op=='charge':
        keys(c,['kind','expectedRevision']); require(c['kind']=='charged-strike','INTENT')
        require(a['phase']=='combat' and a['quota']==1,'QUOTA')
        keys(p,['durabilityBefore','durabilityAfter','quotaAfter','delay','bluntWeakness'])
        require(integer(p['durabilityBefore']) and p['durabilityBefore']>0,'DURABILITY')
        require(p['durabilityAfter']==max(0,p['durabilityBefore']-3),'DURABILITY')
        require(type(p['bluntWeakness']) is bool and p['delay']==(200 if p['bluntWeakness'] else 140),'CONTROL_DELAY')
        if negative!='consumption-rollback': require(p['quotaAfter']==0,'RESOURCE_CONTINUITY')
        return 'CHARGED'
    if op=='order':
        keys(c,['kind']); require(c['kind']=='schedule-witness','INTENT')
        keys(p,['events','observed','defenseAfter','escapeLockedAt','escapeCompletesAt','newWoundChangesCompletion'])
        events=p['events']
        require(all(set(e)=={'id','at','kind'} and integer(e['at']) and e['kind'] in ['completion','player','enemy'] for e in events),'SHAPE')
        priority={'completion':0,'player':1,'enemy':2}
        ordered=[e['id'] for e in sorted(events,key=lambda e:(e['at'],priority[e['kind']]))]
        require(p['observed']==ordered,'ORDER')
        require(p['defenseAfter'] is None,'DEFENSE_BOUNDARY')
        require(p['escapeCompletesAt']>=p['escapeLockedAt'] and not p['newWoundChangesCompletion'],'ESCAPE_LOCK')
        return 'ORDERED'
    if op=='trace':
        keys(c,['kind']); require(c['kind'] in ['action','normal-H0'],'INTENT')
        keys(p,['steps','finalHp','outcome','sourceBinding','sourceBattle','firstBefore','firstAfter'])
        if negative!='binding-acceptance': require(p['sourceBinding']==spec['bindings']['execution'] and p['sourceBattle']==(a['battle']['id'] if a['battle'] else None),'BINDING')
        if c['kind']=='normal-H0':
            require(a['phase']=='stable' and a['node']=='H0' and p['steps']==[] and p['finalHp']==a['hp'],'H0_STEPS'); return 'NORMAL_EMPTY'
        hp=a['hp']; require(len(p['steps'])>0,'EMPTY_TRACE'); dead=False
        ranks={'heal':0,'primary':0,'bleeding':1,'enemy-direct':2,'injury-risk':3,'exposure-risk':4,'intent':5}
        last=-1
        for s in p['steps']:
            keys(s,['kind','before','requested','after'])
            require(s['kind'] in ranks and all(integer(s[k]) for k in ['before','requested','after']),'TRACE_NUMBER')
            require(not dead and s['before']==hp and ranks[s['kind']]>=last,'TRACE_ORDER')
            last=ranks[s['kind']]
            expected=min(12,hp+s['requested']) if s['kind']=='heal' else max(0,hp-s['requested']) if s['kind'] in ['primary','bleeding','enemy-direct'] else hp
            require(s['after']==expected,'CLIPPING'); hp=s['after']; dead=hp==0
        require(p['finalHp']==hp and (p['outcome']=='death')==dead,'DEATH_PRIORITY')
        if dead and negative!='binding-acceptance': require(p['sourceBattle'] is not None,'DEATH_SOURCE')
        return 'DEAD_ONLY' if dead else 'TRACE_ALIVE'
    if op=='restore':
        keys(c,['kind','format','expected']); require(c['kind'] in ['cold','same-progress'],'INTENT')
        require(type(c['format']) is int and c['format']==4,'VERSION')
        check_state(p,spec)
        proposal_numbers(p)
        require(p['phase']!='pending','INTERMEDIATE_SAVE')
        e=c['expected']; keys(e,['origin','binding','revision','phase','battleId','enemy','queue','current'])
        require(e['origin']=='independent-before-read','EXPECTED_SOURCE')
        if negative!='binding-acceptance':
            require(e['binding']==spec['bindings']['execution'] and p['revision']==e['revision'] and p['phase']==e['phase'],'BINDING')
            require((p['battle']['id'] if p['battle'] else None)==e['battleId'] and p['enemy']==e['enemy'],'CURSOR')
            if p['terminal']:
                require(p['terminal']['binding']==e['binding'] and p['terminal']['battleId']==e['current']['terminal']['battleId'],'BINDING')
            if p['battle']:
                b=p['battle']; require(b['binding']==e['binding'] and b['enemyId']==p['enemy']['id'] and b['entryRevision']<=p['revision'] and b['from']=='H1' and b['node']==p['node']=='H4','ENTRY_WITNESS')
                require([b['current'],b['playerNext'],b['enemyNext']]==e['queue'],'QUEUE_BINDING')
            if c['kind']=='same-progress': require(p==e['current'],'FULL_BEFORE')
        if p['terminal']:
            t=p['terminal']; keys(t,['source','binding','battleId','beforeHp','steps'])
            require(t['source']=='combat-death' and integer(t['beforeHp']) and t['beforeHp']>0,'DEATH_SOURCE')
            witness=copy.deepcopy(a); witness.update(phase='combat',closed=False,hp=t['beforeHp'],terminal=None,node='H4',battle=copy.deepcopy(spec['activeBattle']))
            witness['enemy']['encountered']=True
            result=validate({'operation':'trace','before':witness,'command':{'kind':'action'},'proposal':{
                'steps':t['steps'],'finalHp':0,'outcome':'death','sourceBinding':t['binding'],'sourceBattle':t['battleId'],'firstBefore':False,'firstAfter':True}},spec,negative)
            require(result=='DEAD_ONLY','DEATH_SOURCE')
        return 'RESTORED'
    if op=='blocked':
        keys(c,['kind','expectedRevision']); require(c['kind'] in ['move','rest','deadline','return'],'INTENT')
        require(a['phase']=='stable' and not a['closed'],'UNSETTLED')
        return 'STABLE_ALLOWED'
    if op=='transaction':
        keys(c,['kind']); require(c['kind'] in ['commit','save-failed-continue','retry','reentrant','reject'],'INTENT')
        keys(p,['events','revisionAfter','currentRetained','effects','writes','notifies','commits'])
        expected={'commit':['validate','resolve','aggregate','encode','install','write','notify'],
            'save-failed-continue':['validate','resolve','aggregate','encode','install','write-failed','notify'],
            'retry':['validate','encode','write'], 'reentrant':['busy-reject'], 'reject':['validate','reject']}[c['kind']]
        require(p['events']==expected,'TRANSACTION_ORDER')
        commits=1 if c['kind'] in ['commit','save-failed-continue'] else 0
        require(p['commits']==commits and p['revisionAfter']==a['revision']+commits,'CURRENT_ONCE')
        require(p['effects']==commits and p['writes']==(1 if c['kind'] in ['commit','save-failed-continue','retry'] else 0) and p['notifies']==commits,'REPLAY')
        require(p['currentRetained'] is True,'SAVE_ROLLBACK')
        return 'TRANSACTION'
    raise RuntimeError('Unknown checker operation '+op)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--cases',required=True); ap.add_argument('--output',required=True); ap.add_argument('--negative-control')
    args=ap.parse_args(); root=Path(args.cases).resolve().parent
    spec=json.loads((root/'state-candidates.json').read_text('utf-8')); cases=json.loads(Path(args.cases).read_text('utf-8'))['cases']
    if args.negative_control not in [None,*spec['negativeControls']]: ap.error('Unknown negative control')
    rows=[]
    for case in cases:
        exception=None
        try: actual=validate(case,spec,args.negative_control)
        except Reject as e: actual='REJECT:'+str(e)
        except Exception as e: actual='EXCEPTION'; exception=type(e).__name__+': '+str(e)
        rows.append({**case,'actual':actual,'mismatch':actual!=case['expected'] or exception is not None,'exception':exception})
    mismatches=[r['id'] for r in rows if r['mismatch']]; exceptions=sum(r['exception'] is not None for r in rows)
    report={'kind':'FINITE_CONTRACT_BOUNDARIES_NOT_ENGINE','negativeControl':args.negative_control,
      'inputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),root/'state-candidates.json',Path(args.cases)]},
      'total':len(rows),'matched':len(rows)-len(mismatches),'mismatchIds':mismatches,'exceptions':exceptions,
      'categories':{k:sum(r['support']==k for r in rows) for k in sorted({r['support'] for r in rows})},'cases':rows}
    Path(args.output).write_bytes((json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode())
    print(json.dumps({k:report[k] for k in ['total','matched','categories','mismatchIds','exceptions','negativeControl']},ensure_ascii=False))
    return 2 if exceptions else 1 if mismatches else 0
if __name__=='__main__': raise SystemExit(main())
