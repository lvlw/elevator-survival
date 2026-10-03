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

def fields(value, required, optional=()):
    require(type(value) is dict and set(required)<=set(value) and set(value)<=set(required)|set(optional),'intent-shape')

def ready_for(row):
    return {'kind':'deadline','commission':row['commission'],'execution':row['execution'],'settled_cycle':row['end_cycle']}

def temporal(cycle, bridge, rows, phase, hp, days, mutation):
    # Rows are a projection of the ONE lifecycle collection, never another ledger.
    require(integer(cycle) and cycle>0,'cycle')
    if bridge is not None:
        require(type(bridge) is dict and bridge.get('kind') in ('first','deadline'),'bridge')
        exact(bridge,['kind'] if bridge['kind']=='first' else ['kind','commission','execution','settled_cycle'])
        if bridge['kind']=='deadline':
            require(identifier(bridge['commission']) and identifier(bridge['execution']) and integer(bridge['settled_cycle']) and bridge['settled_cycle']>0,'bridge')
    require(type(rows) is list,'timeline')
    for r in rows:
        exact(r,['commission','execution','start_cycle','day','end_cycle','outcome'])
        require(integer(r['start_cycle']) and r['start_cycle']>0 and integer(r['day']) and 1<=r['day']<=days,'timeline-number')
    ordered=sorted(rows,key=lambda r:r['start_cycle'])
    previous=None
    for r in ordered:
        exact(r,['commission','execution','start_cycle','day','end_cycle','outcome'])
        require(identifier(r['commission']) and identifier(r['execution']),'timeline-identity')
        require(integer(r['start_cycle']) and r['start_cycle']>0 and integer(r['day']) and 1<=r['day']<=days,'timeline-number')
        end=r['start_cycle']+r['day']-1; require(integer(end),'overflow')
        require(r['outcome'] in ('active','success','failure','deadline','death'),'outcome')
        if r['outcome']=='active': require(r['end_cycle'] is None,'timeline-end')
        else: require(integer(r['end_cycle']) and r['end_cycle']==end,'timeline-end')
        if r['outcome']=='deadline': require(r['day']==days,'deadline-day')
        if previous is None: require(r['start_cycle']==1,'timeline-origin')
        else:
            require(previous['outcome'] in ('success','failure','deadline') and r['start_cycle']==previous['end_cycle']+1,'timeline-order')
        previous=r
    require(len({r['commission'] for r in rows})==len(rows) and len({r['execution'] for r in rows})==len(rows),'timeline-reuse')
    if phase=='fresh-hub':
        require(not rows and cycle==1 and bridge=={'kind':'first'} and hp>0,'fresh'); return
    require(bool(rows),'missing-history'); latest=ordered[-1]
    if phase=='world':
        require(bridge is None,'active-bridge')
        require(latest['outcome']=='active' and hp>0,'phase-active')
        require(cycle==latest['start_cycle']+latest['day']-1,'cycle-day')
    elif phase=='living-hub':
        require(latest['outcome'] in ('success','failure','deadline') and hp>0,'phase-inactive')
        if mutation!='ready-source':
            if latest['outcome']=='deadline': require(bridge==ready_for(latest) and cycle==latest['end_cycle']+1,'ready-source')
            else: require(bridge is None and cycle==latest['end_cycle'],'normal-due')
    elif phase=='dead':
        require(hp==0 and bridge is None,'dead-bridge')
        require(latest['outcome'] in ('success','failure','death') and cycle==latest['end_cycle'],'death-cycle')
    else: raise Refusal('unstable')

def current_row(s):
    if s['status']=='unaccepted': return None
    return {'commission':s['commission'],'execution':s['execution'],'start_cycle':s['start_cycle'],'day':s['task_day'],'end_cycle':s['end_cycle'],'outcome':s['exit_kind'] or s['status']}

def validate_world(s,cfg,mutation):
    exact(s,['revision','hp','infection','exposure','suppression','satiety','bleed','injury','meds','signature','painkiller','energy','cycle','task_day','execution','commission','status','phase','node','pending','bridge','balance','supplies','items','sites','start_cycle','end_cycle','exit_kind','history','last_node'])
    for k in ('revision','hp','infection','exposure','suppression','satiety','injury','meds','energy','cycle','task_day','balance'):
        require(integer(s[k]),'state-number')
    require(s['hp']<=cfg['limits']['hp'] and s['energy']<=cfg['limits']['energy'] and s['satiety']<=cfg['limits']['satiety'],'state-range')
    require(all(type(s[k]) is bool for k in ('bleed','signature','painkiller','pending')),'state-bool')
    require(s['status'] in ('unaccepted','active','success','failure','death'),'status')
    require((s['exit_kind']=='deadline' and s['status']=='failure') or s['exit_kind'] is None,'exit-kind')
    exact(s['supplies'],['food','bandage','suppressant']); require(all(integer(v) for v in s['supplies'].values()),'supplies')
    require(type(s['history']) is list,'timeline')
    rows=s['history']+([current_row(s)] if current_row(s) else [])
    for r in s['history']: exact(r,['commission','execution','start_cycle','day','end_cycle','outcome'])
    require(not any(r['outcome']=='active' for r in s['history']),'timeline-order')
    phase='world' if s['phase'] in ('world','combat') else ('fresh-hub' if s['status']=='unaccepted' else 'living-hub') if s['phase']=='hub' else s['phase']
    temporal(s['cycle'],s['bridge'],rows,phase,s['hp'],cfg['limits']['days'],mutation)
    if current_row(s): require(all(r['start_cycle']<s['start_cycle'] for r in s['history']),'current-not-latest')
    if s['phase'] in ('world','combat'): require(identifier(s['node']) and s['last_node'] is None,'position')
    else: require(s['node'] is None and not s['pending'],'position')
    require(type(s['sites']) is dict and type(s['items']) is dict,'world-shape')
    runs={r['execution'] for r in rows}
    require(set(s['sites'])==runs,'site-binding')
    for site in s['sites'].values():
        exact(site,['sources','enemy','knowledge']); require(type(site['sources']) is dict and all(identifier(k) and type(v) is bool for k,v in site['sources'].items()),'source-shape')
        exact(site['enemy'],['hp','intent','risk_cursor']); require(integer(site['enemy']['hp']) and integer(site['enemy']['risk_cursor']) and identifier(site['enemy']['intent']),'enemy-shape')
        require(type(site['knowledge']) is list and all(type(e) is list and len(e)==2 and all(identifier(v) for v in e) for e in site['knowledge']),'knowledge-shape')
    for key,item in s['items'].items():
        exact(item,['container','ground_execution','qty','durability','electricity'])
        require(identifier(key) and identifier(item['container']) and integer(item['qty']) and item['qty']>0 and integer(item['durability']) and integer(item['electricity']),'item-state')
        if item['container'] in ('bag','equipment','hub'): require(item['ground_execution'] is None,'ground-binding')
        else: require(identifier(item['ground_execution']) and item['ground_execution'] in runs,'ground-binding')

def intent(a):
    required={'view':[], 'organize':[], 'food':[], 'suppressant':[], 'bandage':[], 'move':['to','price'], 'reveal':['source','item','qty','price'], 'pickup':['item'], 'return':['success','complete'], 'rest':['kind','legal_node'], 'deadline':[], 'launch':['declared','commission','execution'], 'immediate':['damage']}
    for op in ('search','extract','repair','recharge','deliver','install'): required[op]=['price']
    require(type(a) is dict and type(a.get('op')) is str,'intent-shape'); op=a['op']; require(op in required,'unsupported-intent')
    optional=['revision','cycle','checks']
    if op in ('move','search','extract','repair','recharge','deliver','install','reveal'): optional+=['at','trigger_combat']
    if op=='move': optional+=['multiplier']
    fields(a,['op']+required[op],optional)
    for key in ('revision','cycle','qty','damage'):
        if key in a: require(integer(a[key]) and (key not in ('cycle','qty') or a[key]>0),'intent-number')
    for key in ('declared','success','complete','legal_node','trigger_combat'):
        if key in a: require(type(a[key]) is bool,'intent-bool')
    for key in ('at','to','price','source','item','commission','execution','kind'):
        if key in a: require(identifier(a[key]),'intent-id')
    if 'checks' in a:
        require(type(a['checks']) is dict and set(a['checks'])<= {'prerequisite','resource','capacity','location'} and all(type(v) is bool for v in a['checks'].values()),'intent-checks')
    if 'multiplier' in a:
        require(type(a['multiplier']) is list and len(a['multiplier'])==2 and all(integer(v) and v>0 for v in a['multiplier']),'multiplier')

def close_world(s, outcome, settled_cycle=None):
    s['status']='failure' if outcome=='deadline' else outcome
    s['exit_kind']='deadline' if outcome=='deadline' else None
    s['end_cycle']=settled_cycle if settled_cycle is not None else s['cycle']
    s['last_node'],s['node']=s['node'],None
    s['phase']='dead' if outcome=='death' else 'hub'; s['bridge']=None; s['pending']=False
    if outcome=='deadline': s['bridge']=ready_for(current_row(s))

def die(s,log):
    if s['status']=='active': close_world(s,'death')
    else: s.update(phase='dead',bridge=None,node=None,pending=False)
    log.append('death')

def step(old,a,cfg,mutation):
    validate_world(old,cfg,mutation); intent(a)
    s,log=copy.deepcopy(old),[]; op=a['op']
    require(s['hp']>0,'dead')
    require(a.get('revision',s['revision'])==s['revision'],'stale')
    if mutation!='cycle-dedup': require(a.get('cycle',s['cycle'])==s['cycle'],'cycle')
    require(all(a.get('checks',{}).values()),'precondition')
    if op=='view': return s,log
    site=s['sites'].get(s['execution'])
    if op in ('move','search','extract','repair','recharge','deliver','install','reveal'):
        require(s['phase']=='world' and s['status']=='active' and not s['pending'],'unstable'); require(s['energy']>0,'energy')
        require(a.get('at',s['node'])==s['node'],'location')
        if op=='move': require([s['node'],a['to']] in site['knowledge'],'unknown-edge')
        require(a['price'] in cfg['prices'],'cost'); cost=cfg['prices'][a['price']]; require(integer(cost) and cost>0,'cost')
        if op=='move':
            n,d=a.get('multiplier',[1,1]); product=cost*n
            require(integer(product),'cost-overflow'); cost=product//d+(product%d!=0)
            require(integer(cost) and cost>0,'cost-overflow'); s['node']=a['to']
        if op=='reveal':
            require(a['source'] in site['sources'] and not site['sources'][a['source']],'source-used')
            require(a['item'] not in s['items'],'item'); site['sources'][a['source']]=True
            s['items'][a['item']]={'container':s['node'],'ground_execution':s['execution'],'qty':a['qty'],'durability':0,'electricity':0}; log.append('reveal')
        s['energy']=max(0,s['energy']-cost)
        if s['bleed']: s['hp']=max(0,s['hp']-cfg['health']['bleed_action']); log.append('action-bleed')
        if a.get('trigger_combat') and s['hp']>0: s['phase']='combat'
        if not s['hp']: die(s,log)
    elif op=='immediate':
        require(s['pending'] or s['phase']=='combat','no-immediate')
        s['hp']=max(0,s['hp']-a['damage']); s['pending']=False; log.append('immediate')
        if not s['hp']: die(s,log)
    elif op in ('organize','pickup','food','suppressant','bandage'):
        require(s['phase'] in ('world','hub') and not s['pending'],'unstable')
        if op=='pickup':
            if mutation!='closed-ground': require(s['phase']=='world' and s['status']=='active','closed-world')
            item=s['items'].get(a['item']); node=s['node'] if mutation!='closed-ground' else (s['node'] or s['last_node'])
            require(item is not None and item['container']==node and item['qty']>0,'item')
            if mutation!='closed-ground': require(item['ground_execution']==s['execution'],'ground-binding')
            item['container']='bag'; item['ground_execution']=None
        elif op in ('food','suppressant','bandage'):
            require(s['supplies'][op]>0,'resource')
            if op=='suppressant':
                require(s['meds']<cfg['quota']['suppressant'],'quota'); require(s['infection']>0 or s['exposure']>0,'medical-target'); s['meds']+=1; s['suppression']=cfg['health']['suppression']
            elif op=='food': s['satiety']=min(cfg['limits']['satiety'],s['satiety']+cfg['health']['ration_gain'])
            else: s['hp']=min(cfg['limits']['hp'],s['hp']+cfg['health']['bandage_heal']); s['bleed']=False
            s['supplies'][op]-=1
    elif op=='return':
        require(s['phase']=='world' and not s['pending'] and s['node']=='H0','return'); require(s['status']=='active','closed')
        require(not a['success'] or a['complete'],'incomplete')
        if not a['success']: s['balance']-=min(s['balance'],cfg['failure_penalty'])
        close_world(s,'success' if a['success'] else 'failure'); log.append('close')
    elif op in ('rest','deadline','launch'):
        require(not s['pending'],'unstable')
        if op=='launch':
            require(s['phase']=='hub','phase')
            rows=s['history']+([current_row(s)] if current_row(s) else [])
            require(a['declared'] and all(a['commission']!=r['commission'] and a['execution']!=r['execution'] for r in rows),'no-new-content')
            if s['bridge'] is None: alive=settle(s,cfg,log)
            else: alive=True; log.append('consume-ready')
            if alive:
                if current_row(s): s['history'].append(current_row(s))
                s.update(phase='world',status='active',commission=a['commission'],execution=a['execution'],task_day=1,node='H0',last_node=None,bridge=None,start_cycle=s['cycle'],end_cycle=None,exit_kind=None)
                # Explicit fixture-only new declaration: no old ground/source/enemy copied.
                s['sites'][s['execution']]={'sources':{},'enemy':{'hp':0,'intent':'none','risk_cursor':0},'knowledge':[]}
                if 'new-cycle' in log: s['energy']=cfg['limits']['energy']
            else: die(s,log)
        else:
            require(s['phase']=='world' and s['status']=='active','unstable')
            if op=='rest': require(s['task_day']<cfg['limits']['days'] and a['kind'] in cfg['rest_nodes'] and a['legal_node'] and s['node'] in cfg['rest_nodes'][a['kind']],'rest')
            else: require(s['task_day']==cfg['limits']['days'] and s['node']!='H0','deadline')
            previous_cycle=s['cycle']
            if settle(s,cfg,log):
                if op=='rest': s['task_day']+=1; s['energy']=cfg['rest'][a['kind']]
                else:
                    close_world(s,'deadline',previous_cycle); s['energy']=cfg['limits']['energy']
                    s['balance']-=min(s['balance'],cfg['failure_penalty']); log.append('recall')
            else: die(s,log)
    s['revision']+=1; require(integer(s['revision']),'overflow'); validate_world(s,cfg,mutation); return s,log

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
    projection=copy.deepcopy(s); projection.update(s['sites'].get(s['execution'],{}))
    return {'values':project(projection,c['observe']),'events':log,'rejected':rejected}

def validate_save(s,context,mutation):
    exact(s,['format','rules','character','body','calendar','missions','phase','scene_ref','revision','items'])
    require(s['format']==context['format'],'format'); require(s['rules']==context['rules'],'rules')
    require(identifier(s['character']),'character')
    require(integer(s['revision']),'revision'); exact(s['body'],['hp','energy'])
    require(all(integer(v) for v in s['body'].values()),'body-type'); require(s['body']['hp']<=context['limits']['hp'] and s['body']['energy']<=context['limits']['energy'],'body-range'); exact(s['calendar'],['cycle','bridge'])
    require(integer(s['calendar']['cycle']) and s['calendar']['cycle']>0,'cycle')
    require(s['calendar']['bridge'] is None or type(s['calendar']['bridge']) is dict,'bridge')
    require(type(s['missions']) is list and len(s['missions'])==len(context['declarations']),'declarations')
    seen,runs,active=set(),set(),[]
    for m in s['missions']:
        require(type(m) is dict,'mission'); status=m.get('status')
        keys=['character','world','template','commission','rules','contract','status']
        if status in ('active','closed'): keys+=['execution','start_cycle']
        if status=='closed': keys+=['outcome','end_cycle','end_day']
        exact(m,keys); require(status in ('unaccepted','active','closed'),'status')
        require(identifier(m['commission']),'commission')
        require(m['commission'] not in seen and m['commission'] in context['declarations'],'commission'); seen.add(m['commission'])
        d=context['declarations'][m['commission']]
        if mutation!='cross-binding': require(m['character']==s['character'],'cross-character')
        require(all(m[k]==d[k] for k in ('world','template','rules','contract')),'binding')
        if 'execution' in m:
            r=m['execution']; exact(r,['run','seed','rules'])
            require(all(identifier(v) for v in r.values()),'execution')
            require(r['rules']==m['rules'] and r['run'] not in runs,'run-reuse-or-version'); runs.add(r['run'])
        if status in ('active','closed'): require(integer(m['start_cycle']) and m['start_cycle']>0,'start-cycle')
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
        if s['phase']=='fresh-hub': require(all(m['status']=='unaccepted' for m in s['missions']),'fresh')
    rows=[]
    for m in s['missions']:
        if m['status']=='unaccepted': continue
        rows.append({'commission':m['commission'],'execution':m['execution']['run'],'start_cycle':m['start_cycle'],'day':s['scene_ref']['day'] if m['status']=='active' else m['end_day'],'end_cycle':None if m['status']=='active' else m['end_cycle'],'outcome':'active' if m['status']=='active' else m['outcome']})
    temporal(s['calendar']['cycle'],s['calendar']['bridge'],rows,s['phase'],s['body']['hp'],context['limits']['days'],mutation)
    require(type(s['items']) is list,'items'); ids=set()
    for item in s['items']:
        exact(item,['id','container','ground_ref','qty','durability','electricity']); require(identifier(item['id']) and item['id'] not in ids,'duplicate-item'); ids.add(item['id'])
        require(item['container'] in ('bag','hub','ground') and integer(item['qty']) and item['qty']>0 and integer(item['durability']) and integer(item['electricity']),'item-state')
        if item['container']=='ground':
            exact(item['ground_ref'],['commission','execution','node']); ref=item['ground_ref']
            require(identifier(ref['node']) and any(ref['commission']==m['commission'] and ref['execution']==m.get('execution') for m in s['missions'] if m['status']!='unaccepted'),'ground-binding')
        else: require(item['ground_ref'] is None,'ground-binding')
    return copy.deepcopy(s)

def restore(c,cfg,mutation):
    before=copy.deepcopy(c['raw'])
    try:
        value=validate_save(c['raw'],dict(c['context'],limits=cfg['limits']),mutation); rt=validate_save(json.loads(json.dumps(value)),dict(c['context'],limits=cfg['limits']),mutation)
        return {'result':'candidate','unchanged':before==c['raw'],'roundtrip_equal':rt==value}
    except Refusal as exc: return {'result':str(exc),'unchanged':before==c['raw']}

def owner(c,cfg,mutation):
    c=copy.deepcopy(c)
    if 'numeric_fault' in c:
        require(c['numeric_fault'] in ('nan','infinity','negative-infinity'),'fault-kind')
        c['actions'][0]['spend']=float({'nan':'nan','infinity':'inf','negative-infinity':'-inf'}[c['numeric_fault']])
    current=copy.deepcopy(c.get('current')); phase='ready' if current is not None else 'new'
    reads=writes=notices=0; errors=[]; busy=False
    def dispatch(a):
        nonlocal current,writes,notices,busy
        require(not busy,'reentrant'); require(phase=='ready','not-ready')
        fields(a,['op','revision','spend','cost_kind'],['business_supported','complete','write_error','subscriber_write'])
        require(a['op']=='command' and a['cost_kind'] in ('free','paid'),'intent-kind')
        require(integer(a['revision']) and integer(a['spend']),'intent-number')
        require((a['cost_kind']=='free' and a['spend']==0) or (a['cost_kind']=='paid' and a['spend']>0),'intent-cost')
        require(all(type(a[k]) is bool for k in ('business_supported','complete','write_error','subscriber_write') if k in a),'intent-bool')
        require(a['revision']==current['revision'],'stale')
        validate_save(current,dict(c['context'],limits=cfg['limits']),mutation)
        require(a['cost_kind']=='free' or current['body']['energy']>0,'energy')
        require(a.get('business_supported',True),'unsupported-business'); require(a.get('complete',True),'incomplete-transaction')
        nxt=copy.deepcopy(current); nxt['revision']+=1; nxt['body']['energy']=max(0,nxt['body']['energy']-a['spend'])
        validate_save(nxt,dict(c['context'],limits=cfg['limits']),mutation)
        busy=True
        try:
            current=nxt; writes+=1; notices+=1
            if a.get('write_error'): errors.append('save-error')
            if a.get('subscriber_write'):
                try: dispatch({'op':'command','cost_kind':'paid','revision':current['revision'],'spend':1})
                except Refusal as exc: errors.append(str(exc))
        finally: busy=False
    for a in c['actions']:
        try:
            require(type(a) is dict and type(a.get('op')) is str,'intent-shape'); op=a['op']
            if op=='bootstrap':
                fields(a,['op','read'],['raw']); require(a['read'] in ('error','absent','present'),'intent-read')
                require(('raw' in a)==(a['read']=='present'),'intent-shape')
                require(phase=='new','owner-exists'); phase='loading'; reads+=1
                if a['read']=='error': phase='error'; raise Refusal('read-error')
                if a['read']=='absent': phase='absent'
                else:
                    try: value=validate_save(a['raw'],dict(c['context'],limits=cfg['limits']),mutation)
                    except Refusal: phase='error'; raise
                    current,phase=value,'ready'; notices+=1
            elif op=='create':
                fields(a,['op','raw'],['write_error']); require(type(a.get('write_error',False)) is bool,'intent-bool')
                require(phase=='absent','not-absent'); value=validate_save(a['raw'],dict(c['context'],limits=cfg['limits']),mutation)
                require(value['phase']=='fresh-hub','not-fresh'); current,phase=value,'ready'; writes+=1; notices+=1
                if a.get('write_error'): errors.append('save-error')
            elif op=='command':
                dispatch(a)
            else: raise Refusal('no-replace-entry')
        except Refusal as exc: errors.append(str(exc))
    result={'phase':phase,'revision':current['revision'] if current else None,'energy':current['body']['energy'] if current else None,'reads':reads,'writes':writes,'notifications':notices,'errors':errors}
    if c.get('prove_unchanged'): result['current_unchanged']=current==c.get('current')
    return result

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
        exact(before,['revision','hp','balance','status','items'])
        require(all(integer(before[k]) for k in ('revision','hp','balance')) and 0<before['hp']<=cfg['limits']['hp'],'terminal-number')
        require(type(before['items']) is list,'terminal-items')
        ids=set()
        for item in before['items']:
            exact(item,['id','qty','durability']); require(identifier(item['id']) and item['id'] not in ids and integer(item['qty']) and item['qty']>0 and integer(item['durability']),'terminal-items'); ids.add(item['id'])
        require(type(c['plans']) is dict and set(c['plans'])=={'body','items','economy','mission'},'missing-plan')
        plans=c['plans']
        for name,keys in {'body':['revision','hp'],'items':['revision','retained'],'economy':['revision','delta'],'mission':['revision','outcome']}.items(): exact(plans[name],keys)
        require(all(integer(p['revision']) for p in plans.values()),'intent-number')
        require(type(plans['economy']['delta']) is int and abs(plans['economy']['delta'])<=9007199254740991,'intent-number')
        require(all(p['revision']==before['revision'] for p in plans.values()),'stale-plan')
        require(before['status']=='active','already-closed')
        require(integer(plans['body']['hp']) and 0<plans['body']['hp']<=cfg['limits']['hp'],'body-plan')
        require(plans['mission']['outcome']=='failure','unsupported-terminal')
        require(plans['economy']['delta']==-min(before['balance'],cfg['failure_penalty']),'economy-plan')
        require(type(plans['items']['retained']) is list,'item-plan')
        for item in plans['items']['retained']:
            exact(item,['id','qty','durability']); require(identifier(item['id']) and integer(item['qty']) and item['qty']>0 and integer(item['durability']),'item-plan')
        require(plans['items']['retained']==before['items'],'item-plan')
        after=copy.deepcopy(before)
        after.update(hp=plans['body']['hp'],items=copy.deepcopy(plans['items']['retained']),balance=before['balance']+plans['economy']['delta'],status='closed',revision=before['revision']+1)
        require(integer(after['revision']) and integer(after['balance']),'overflow')
        return {'result':'committed','after':after,'commits':1,'save_attempts':1,'notifications':1,'input_unchanged':c['current']==before}
    except Refusal as exc:
        return {'result':str(exc),'after':before,'commits':0,'save_attempts':0,'notifications':0,'input_unchanged':c['current']==before}

def settlement_boundary(c,cfg,mutation):
    # Direct arithmetic boundary ONLY: intentionally not a reachable world/save.
    before=copy.deepcopy(c['state']); candidate=copy.deepcopy(before)
    try:
        settle(candidate,cfg,[])
        return {'result':'arithmetic-accepted','input_unchanged':c['state']==before}
    except Refusal as exc:
        return {'result':str(exc),'input_unchanged':c['state']==before}

def main():
    p=argparse.ArgumentParser(); p.add_argument('--output',type=Path); p.add_argument('--negative-control',choices=['cycle-dedup','cross-binding','ready-source','closed-ground']); a=p.parse_args()
    base=Path(__file__).resolve().parent; f=json.loads((base/'fixtures.json').read_text('utf-8')); e=json.loads((base/'expected.json').read_text('utf-8'))
    require(set(e['cases'])=={c['id'] for c in f['cases']},'case-set'); ops={'world':world,'restore':restore,'owner':owner,'pair':pair,'rng':rng,'terminal':terminal,'settlement-boundary':settlement_boundary}; rows=[]
    for c in f['cases']:
        exp=e['cases'][c['id']]
        if c['kind'] not in ops: actual={'status':'NOT SUPPORTED','capability':c['kind']}
        else:
            try: actual=ops[c['kind']](c,f['config'],a.negative_control)
            except (Refusal,KeyError,TypeError,ValueError) as exc: actual={'model_error':type(exc).__name__,'detail':str(exc)}
        rows.append({'id':c['id'],'family':c['family'],'classification':exp['classification'],'actual':actual,'expected':exp['value'],'matches':actual==exp['value']})
    counts={k:sum(r['classification']==k for r in rows) for k in ('positive','expected-rejection','persistence-fault','unsupported')}; counts['mismatch']=sum(not r['matches'] for r in rows)
    result={'evidence':'finite-design-model-only','negative_control':a.negative_control,'counts':counts,'families':sorted({r['family'] for r in rows}),'results':rows}
    (a.output or base/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(counts))
    for r in rows:
        if not r['matches']: print(json.dumps(r,ensure_ascii=False))
    return 1 if counts['mismatch'] else 0

if __name__=='__main__': raise SystemExit(main())
