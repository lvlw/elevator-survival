"""Finite DESIGN model: not production, CTB, browser or real save codec."""
import argparse, copy, hashlib, json
from pathlib import Path

class Refusal(Exception):
    pass

def require(ok, reason):
    if not ok: raise Refusal(reason)

def integer(v): return type(v) is int and 0 <= v <= 9007199254740991

def identifier(v): return type(v) is str and bool(v) and v==v.strip() and all(32 < ord(c) < 127 for c in v)

def exact(v, keys): require(type(v) is dict and set(v) == set(keys), 'shape')

def digest(v): return hashlib.sha256(json.dumps(v, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()

def tier(table, value, result): return next(r[result] for r in reversed(table) if value >= r['min'])

def settle(s, cfg, log):
    h=cfg['health']
    if s['bleed']:
        s['hp']=max(0,s['hp']-h['bleed_night']); log.append('bleed')
        if not s['hp']: return False
    growth=tier(h['infection_stages'],s['infection'],'base')
    new=s['infection']+max(0,growth+h['exposure_progress']*s['exposure']-s['suppression'])
    require(integer(new),'overflow')
    s['infection'],s['exposure']=new,0
    s['hp']=max(0,s['hp']-tier(h['infection_damage'],new,'hp')); log.append('infection')
    if not s['hp']: return False
    s['satiety']=max(0,s['satiety']-h['night_food'])
    if s['satiety']<=h['starve_threshold']: s['hp']=max(0,s['hp']-h['starve_damage'])
    log.append('hunger')
    if not s['hp']: return False
    s['cycle']+=1; require(integer(s['cycle']),'overflow'); s['meds']=0; s['signature']=False; s['suppression']=0; s['painkiller']=False
    log.append('new-cycle'); return True

def die(s,log):
    if s['status']=='active': s['status']='death'
    s['phase']='dead'; log.append('death')

def step(old,a,cfg,mutation):
    s,log=copy.deepcopy(old),[]; op=a['op']
    require(s['hp']>0,'dead')
    require(a.get('revision',s['revision'])==s['revision'],'stale')
    if mutation!='cycle-dedup': require(a.get('cycle',s['cycle'])==s['cycle'],'cycle')
    require(all(a.get('checks',{}).values()),'precondition')
    if op=='view': return s,log
    if op in ('move','search','extract','repair','recharge','deliver','install','reveal'):
        require(s['phase']=='world' and not s['pending'],'unstable'); require(s['energy']>0,'energy')
        require(a.get('at',s['node'])==s['node'],'location')
        if op=='move': require([s['node'],a['to']] in s['knowledge'],'unknown-edge')
        if op=='reveal':
            require(a['source'] in s['sources'] and not s['sources'][a['source']],'source-used')
            require(a['item'] not in s['items'] and integer(a['qty']) and a['qty']>0,'item')
            s['sources'][a['source']]=True
            s['items'][a['item']]={'container':s['node'],'qty':a['qty'],'durability':0}; log.append('reveal')
        cost=cfg['prices'][a['price']]; require(integer(cost) and cost>0,'cost')
        if op=='move':
            n,d=a.get('multiplier',[1,1]); require(integer(n) and n>0 and integer(d) and d>0,'multiplier')
            cost=(cost*n+d-1)//d; s['node']=a['to']
        s['energy']=max(0,s['energy']-cost)
        if s['bleed']: s['hp']=max(0,s['hp']-cfg['health']['bleed_action']); log.append('action-bleed')
        if a.get('trigger_combat') and s['hp']>0: s['phase']='combat'
        if not s['hp']: die(s,log)
    elif op=='immediate':
        require(s['pending'] or s['phase']=='combat','no-immediate'); require(integer(a['damage']),'damage')
        s['hp']=max(0,s['hp']-a['damage']); s['pending']=False; log.append('immediate')
        if not s['hp']: die(s,log)
    elif op in ('organize','pickup','food','suppressant','bandage'):
        require(s['phase'] in ('world','hub') and not s['pending'],'unstable')
        if op=='pickup':
            item=s['items'].get(a['item']); require(item is not None and item['container']==s['node'] and item['qty']>0,'item')
            item['container']='bag'
        elif op in ('food','suppressant','bandage'):
            require(s['supplies'][op]>0,'resource')
            if op=='suppressant':
                require(s['meds']<cfg['quota']['suppressant'],'quota'); require(s['infection']>0 or s['exposure']>0,'medical-target'); s['meds']+=1; s['suppression']=cfg['health']['suppression']
            elif op=='food': s['satiety']=min(cfg['limits']['satiety'],s['satiety']+cfg['health']['ration_gain'])
            else: s['hp']=min(cfg['limits']['hp'],s['hp']+cfg['health']['bandage_heal']); s['bleed']=False
            s['supplies'][op]-=1
    elif op=='return':
        require(s['phase']=='world' and not s['pending'] and s['node']=='H0','return'); require(s['status']=='active','closed')
        require(not a.get('success',False) or a.get('complete',False),'incomplete')
        if a.get('success',False): s['status']='success'
        else: s['status']='failure'; s['balance']-=min(s['balance'],cfg['failure_penalty'])
        s['phase'],s['bridge']='hub',None; log.append('close')
    elif op in ('rest','deadline','launch'):
        require(not s['pending'],'unstable')
        if op=='launch':
            require(s['phase']=='hub','phase'); require(a.get('declared') and a['commission']!=s['commission'],'no-new-content')
            if s['bridge']!=s['cycle']: alive=settle(s,cfg,log)
            else: alive=True; log.append('consume-ready')
            if alive:
                s.update(phase='world',status='active',commission=a['commission'],execution=a['execution'],task_day=1,node='H0',bridge=None)
                if 'new-cycle' in log: s['energy']=cfg['limits']['energy']
            else: die(s,log)
        else:
            require(s['phase']=='world' and s['status']=='active','unstable')
            if op=='rest': require(s['task_day']<cfg['limits']['days'] and a['legal_node'] and s['node'] in cfg['rest_nodes'][a['kind']],'rest')
            else: require(s['task_day']==cfg['limits']['days'] and s['node']!='H0','deadline')
            if settle(s,cfg,log):
                if op=='rest': s['task_day']+=1; s['energy']=cfg['rest'][a['kind']]
                else:
                    s.update(status='failure',phase='hub',bridge=s['cycle'],energy=cfg['limits']['energy'])
                    s['balance']-=min(s['balance'],cfg['failure_penalty']); log.append('recall')
            else: die(s,log)
    else: raise Refusal('unsupported-intent')
    s['revision']+=1; require(integer(s['revision']),'overflow'); return s,log

def project(value,keys):
    out={}
    for key in keys:
        v=value
        for part in key.split('.'): v=v[part]
        out[key]=v
    return out

def world(c,cfg,mutation):
    s=copy.deepcopy(c['state']); log=[]; rejected=[]
    for a in c['actions']:
        before=copy.deepcopy(s)
        try: s,events=step(s,a,cfg,mutation); log+=events
        except Refusal as exc:
            require(s==before,'refusal-mutated'); rejected.append(str(exc))
            if c.get('stop_on_rejection',False): break
    return {'values':project(s,c['observe']),'events':log,'rejected':rejected}

def validate_save(s,context,mutation):
    exact(s,['format','rules','character','body','calendar','missions','phase','scene_ref','revision','items'])
    require(s['format']==context['format'],'format'); require(s['rules']==context['rules'],'rules')
    require(identifier(s['character']),'character')
    require(integer(s['revision']),'revision'); exact(s['body'],['hp','energy'])
    require(all(integer(v) for v in s['body'].values()),'body-type'); require(s['body']['hp']<=context['limits']['hp'] and s['body']['energy']<=context['limits']['energy'],'body-range'); exact(s['calendar'],['cycle','bridge'])
    require(integer(s['calendar']['cycle']) and s['calendar']['cycle']>0,'cycle')
    require(s['calendar']['bridge'] is None or (integer(s['calendar']['bridge']) and s['calendar']['bridge']==s['calendar']['cycle']),'bridge')
    require(type(s['missions']) is list and len(s['missions'])==len(context['declarations']),'declarations')
    seen,runs,active=set(),set(),[]
    for m in s['missions']:
        require(type(m) is dict,'mission'); status=m.get('status')
        keys=['character','world','template','commission','rules','contract','status']
        if status in ('active','closed'): keys+=['execution']
        if status=='closed': keys+=['outcome']
        exact(m,keys); require(status in ('unaccepted','active','closed'),'status')
        require(m['commission'] not in seen and m['commission'] in context['declarations'],'commission'); seen.add(m['commission'])
        d=context['declarations'][m['commission']]
        if mutation!='cross-binding': require(m['character']==s['character'],'cross-character')
        require(all(m[k]==d[k] for k in ('world','template','rules','contract')),'binding')
        if 'execution' in m:
            r=m['execution']; exact(r,['run','seed','rules'])
            require(all(identifier(v) for v in r.values()),'execution')
            require(r['rules']==m['rules'] and r['run'] not in runs,'run-reuse-or-version'); runs.add(r['run'])
        if status=='closed': require(m['outcome'] in ('success','failure','deadline','death'),'outcome')
        if status=='active': active.append(m)
    require(len(active)<=1,'multiple-active')
    require(not any(m.get('outcome')=='death' for m in s['missions']) or (s['body']['hp']==0 and s['phase']=='dead'),'death-history')
    require(s['phase'] in ('fresh-hub','world','living-hub','dead'),'unstable')
    if s['phase']=='world':
        require(s['calendar']['bridge'] is None,'active-bridge')
        require(len(active)==1 and s['body']['hp']>0,'phase-active'); exact(s['scene_ref'],['commission','execution','day'])
        require(s['scene_ref']['commission']==active[0]['commission'] and s['scene_ref']['execution']==active[0]['execution'],'scene-binding')
        require(integer(s['scene_ref']['day']) and 1<=s['scene_ref']['day']<=context['limits']['days'],'task-day')
    else:
        require(not active and s['scene_ref'] is None,'phase-inactive'); require((s['body']['hp']==0)==(s['phase']=='dead'),'death')
        if s['phase']=='living-hub': require(any(m['status']=='closed' for m in s['missions']),'missing-history')
        if s['phase']=='dead': require(s['calendar']['bridge'] is None,'dead-bridge')
        if s['phase']=='fresh-hub': require(all(m['status']=='unaccepted' for m in s['missions']) and s['calendar']=={'cycle':1,'bridge':1},'fresh')
    require(type(s['items']) is list,'items'); ids=set()
    for item in s['items']:
        exact(item,['id','container','qty','durability']); require(identifier(item['id']) and item['id'] not in ids,'duplicate-item'); ids.add(item['id'])
        require(item['container'] in ('bag','hub','ground') and integer(item['qty']) and item['qty']>0 and integer(item['durability']),'item-state')
    return copy.deepcopy(s)

def restore(c,cfg,mutation):
    before=copy.deepcopy(c['raw'])
    try:
        value=validate_save(c['raw'],dict(c['context'],limits=cfg['limits']),mutation); rt=validate_save(json.loads(json.dumps(value)),dict(c['context'],limits=cfg['limits']),mutation)
        return {'result':'candidate','unchanged':before==c['raw'],'roundtrip_equal':rt==value}
    except Refusal as exc: return {'result':str(exc),'unchanged':before==c['raw']}

def owner(c,cfg,mutation):
    current=copy.deepcopy(c.get('current')); phase='ready' if current is not None else 'new'
    reads=writes=notices=0; errors=[]; busy=False
    def dispatch(a):
        nonlocal current,writes,notices,busy
        require(not busy,'reentrant'); require(phase=='ready','not-ready'); require(a['revision']==current['revision'],'stale')
        require(a.get('business_supported',True),'unsupported-business'); require(a.get('complete',True),'incomplete-transaction')
        nxt=copy.deepcopy(current); nxt['revision']+=1; nxt['body']['energy']-=a['spend']
        validate_save(nxt,dict(c['context'],limits=cfg['limits']),mutation)
        busy=True
        try:
            current=nxt; writes+=1; notices+=1
            if a.get('write_error'): errors.append('save-error')
            if a.get('subscriber_write'):
                try: dispatch({'revision':current['revision'],'spend':1})
                except Refusal as exc: errors.append(str(exc))
        finally: busy=False
    for a in c['actions']:
        try:
            op=a['op']
            if op=='bootstrap':
                require(phase=='new','owner-exists'); phase='loading'; reads+=1
                if a['read']=='error': phase='error'; raise Refusal('read-error')
                if a['read']=='absent': phase='absent'
                else:
                    try: value=validate_save(a['raw'],dict(c['context'],limits=cfg['limits']),mutation)
                    except Refusal: phase='error'; raise
                    current,phase=value,'ready'; notices+=1
            elif op=='create':
                require(phase=='absent','not-absent'); value=validate_save(a['raw'],dict(c['context'],limits=cfg['limits']),mutation)
                require(value['phase']=='fresh-hub','not-fresh'); current,phase=value,'ready'; writes+=1; notices+=1
                if a.get('write_error'): errors.append('save-error')
            elif op=='command':
                dispatch(a)
            else: raise Refusal('no-replace-entry')
        except Refusal as exc: errors.append(str(exc))
    return {'phase':phase,'revision':current['revision'] if current else None,'energy':current['body']['energy'] if current else None,'reads':reads,'writes':writes,'notifications':notices,'errors':errors}

def pair(c,cfg,mutation):
    hints=[]; outcomes=[]
    for state in c['states']:
        hints.append({'visible':project(state,['hp','satiety','bleed','public_infection']),'risk':'unknown','may_prepare':True})
        s=copy.deepcopy(state); settle(s,cfg,[]); outcomes.append(s['hp'])
    return {'same_hint':hints[0]==hints[1],'risks':[h['risk'] for h in hints],'hp_after':outcomes}

def rng(c,cfg,mutation):
    # Toy stream ONLY; production counter32 golden vectors are untouched.
    vals=[digest([[v[k] for k in ('execution','seed','location','source','purpose')],v['cursor']]) for v in c['visits']]
    return {'same_on_reload':vals[0]==vals[1],'next_differs':vals[1]!=vals[2],'separate_source':vals[0]!=vals[3]}

def terminal(c,cfg,mutation):
    # Narrow composition test with explicit controlled plans. This does not
    # implement the production wallet, complete item disposition or rewards.
    before=copy.deepcopy(c['current'])
    try:
        require(set(c['plans'])=={'body','items','economy','mission'},'missing-plan')
        plans=c['plans']
        require(all(p['revision']==before['revision'] for p in plans.values()),'stale-plan')
        require(before['status']=='active','already-closed')
        require(integer(plans['body']['hp']) and plans['body']['hp']>0,'body-plan')
        require(plans['mission']['outcome']=='failure','unsupported-terminal')
        require(plans['economy']['delta']==-min(before['balance'],cfg['failure_penalty']),'economy-plan')
        require(plans['items']['retained']==before['items'],'item-plan')
        after=copy.deepcopy(before)
        after.update(hp=plans['body']['hp'],items=copy.deepcopy(plans['items']['retained']),balance=before['balance']+plans['economy']['delta'],status='closed',revision=before['revision']+1)
        return {'result':'committed','after':after,'commits':1,'save_attempts':1,'notifications':1,'input_unchanged':c['current']==before}
    except Refusal as exc:
        return {'result':str(exc),'after':before,'commits':0,'save_attempts':0,'notifications':0,'input_unchanged':c['current']==before}

def main():
    p=argparse.ArgumentParser(); p.add_argument('--output',type=Path); p.add_argument('--negative-control',choices=['cycle-dedup','cross-binding']); a=p.parse_args()
    base=Path(__file__).resolve().parent; f=json.loads((base/'fixtures.json').read_text('utf-8')); e=json.loads((base/'expected.json').read_text('utf-8'))
    require(set(e['cases'])=={c['id'] for c in f['cases']},'case-set'); ops={'world':world,'restore':restore,'owner':owner,'pair':pair,'rng':rng,'terminal':terminal}; rows=[]
    for c in f['cases']:
        exp=e['cases'][c['id']]
        if c['kind'] not in ops: actual={'status':'NOT SUPPORTED','capability':c['kind']}
        else:
            try: actual=ops[c['kind']](c,f['config'],a.negative_control)
            except (Refusal,KeyError,TypeError,ValueError) as exc: actual={'model_error':type(exc).__name__,'detail':str(exc)}
        rows.append({'id':c['id'],'family':c['family'],'classification':exp['classification'],'actual':actual,'expected':exp['value'],'matches':actual==exp['value']})
    counts={k:sum(r['classification']==k for r in rows) for k in ('positive','expected-rejection','unsupported')}; counts['mismatch']=sum(not r['matches'] for r in rows)
    result={'evidence':'finite-design-model-only','negative_control':a.negative_control,'counts':counts,'families':sorted({r['family'] for r in rows}),'results':rows}
    (a.output or base/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(counts))
    for r in rows:
        if not r['matches']: print(json.dumps(r,ensure_ascii=False))
    return 1 if counts['mismatch'] else 0

if __name__=='__main__': raise SystemExit(main())
