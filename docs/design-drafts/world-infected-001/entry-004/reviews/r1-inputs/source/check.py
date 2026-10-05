"""Isolated finite Draft model: no production, CTB solver or runtime save format."""
import argparse,copy,hashlib,json,math
from pathlib import Path
class Reject(Exception): pass
def req(ok,code):
    if not ok: raise Reject(code)
def integer(x,lo=0): req(type(x) is int and lo<=x<=9007199254740991,'INVALID_NUMBER')
def canon(x): return json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)
class Model:
    def __init__(self,root,mutation=None):
        self.root=Path(root);self.base=self.root/'docs/design-drafts/world-infected-001/entry-004'
        self.content=json.loads((self.base/'content-candidate.json').read_text(encoding='utf-8'))
        self.params=json.loads((self.base/'parameter-candidate.json').read_text(encoding='utf-8'))
        self.p={k:v['value'] for k,v in self.params['draft'].items()}
        self.g=json.loads((self.root/self.params['approvedReadOnly'][0]['path']).read_text(encoding='utf-8'))['config']
        self.t=json.loads((self.root/self.params['approvedReadOnly'][1]['path']).read_text(encoding='utf-8'))['config']
        self.nodes={x['id']:x for x in self.content['nodes']};self.edges={x['id']:x for x in self.content['edges']}
        self.sources={x['id']:x for x in self.content['sources']};self.actions={x['id']:x for x in self.content['actions']};self.mutation=mutation
    def initial(self,tool='crow',specialty='scout'):
        s={'node':'H0','D':1,'T':1,'E':self.g['limits']['energy'],'hp':self.g['limits']['hp'],'sat':self.g['limits']['satiety'],
        'I':0,'exposure':0,'suppression':0,'bleed':False,'wounds':[],'contusion':False,'painkiller':False,
        'quota':copy.deepcopy(self.g['quota']),'specialty':specialty,'survivalUsed':False,'tool':tool,
        'gear':{k:self.p['capacity.'+k] for k in ['pipe','coat',tool]},'phase':'active','outcome':None,
        'points':self.t['initial_balance'],'revision':0,'execution':'finite-execution','claimed':[],'facts':[],
        'items':{'initial-bandage':{'alias':'bandage','units':['initial:bandage:0'],'where':'quick','at':None,'execution':'finite-execution'}},
        'origins':{'initial:bandage:0':'bandage'},'disposed':[],'knowledge':[],'visited':[],
        'enemies':{e['id']:{'hp':self.p[e['parameters']]['hp'],'encountered':False,'cursor':0,'intent':0} for e in self.content['enemies']},
        'pending':None,'previous':None,'receipt':None}
        self.observe(s);return s
    def observe(self,s):
        if s['node'] not in s['visited']:s['visited'].append(s['node'])
        for e in self.nodes[s['node']]['surfaceEdges']:
            if e not in s['knowledge']:s['knowledge'].append(e)
        if 'side-survey' in s['facts'] and 'C5-H7' not in s['knowledge']:s['knowledge'].append('C5-H7')
    def count(self,s,alias):return sum(len(i['units']) for i in s['items'].values() if i['alias']==alias and i['where'] in ['pack','quick'])
    def weight(self,s):return sum(self.p['physical.'+i['alias']][2]*len(i['units']) for i in s['items'].values() if i['where']=='pack')
    def placements(self,s):
        occupied=set();W,H=self.p['grid']
        for i in s['items'].values():
            if i['where']!='pack':continue
            req(type(i['at']) is list and len(i['at'])==3,'PLACEMENT')
            x,y,r=i['at'];integer(x);integer(y);req(type(r) is bool,'PLACEMENT')
            w,h,_,limit=self.p['physical.'+i['alias']];w,h=(h,w) if r else (w,h)
            req(len(i['units'])<=limit,'STACK_LIMIT');req(x+w<=W and y+h<=H,'NO_SPACE')
            cells={(xx,yy) for xx in range(x,x+w) for yy in range(y,y+h)}
            req(not cells&occupied,'NO_SPACE');occupied|=cells
        req(self.weight(s)<=self.p['load.bands'][-1][1],'OVERWEIGHT')
    def validate(self,s):
        for k in ['D','T','E','hp','sat','I','exposure','suppression','points','revision']:integer(s[k])
        req(1<=s['T']<=self.g['limits']['days'] and s['D']>=s['T'],'CLOCK')
        req(s['E']<=self.g['limits']['energy'] and s['hp']<=self.g['limits']['hp'] and s['sat']<=self.g['limits']['satiety'],'BODY_RANGE')
        req(s['phase']=='dead' if s['hp']==0 else s['phase']!='dead','PHASE_HP')
        for k,v in s['gear'].items():integer(v);req(v<=self.p['capacity.'+k],'RESOURCE_RANGE')
        for k,v in s['quota'].items():integer(v);req(v<=self.g['quota'][k],'QUOTA')
        req(s['node'] in self.nodes and s['phase'] in ['active','hub','dead'],'STATE_TAG')
        for key in ['bleed','contusion','painkiller','survivalUsed']:req(type(s[key]) is bool,'STATE_BOOL')
        for enemy in s['enemies'].values():
            for key in ['hp','cursor','intent']:integer(enemy[key])
        units=[]
        for i in list(s['items'].values())+s['disposed']:
            req(i['units'] and all(u in s['origins'] and s['origins'][u]==i['alias'] for u in i['units']),'ORIGIN');units.extend(i['units'])
        req(len(units)==len(set(units)),'DUPLICATE_UNIT');req(set(units)==set(s['origins']),'MISSING_OUTPUT');self.placements(s)
    def charge(self,s,cost):
        integer(cost);req(cost==0 or s['E']>0,'E0_PAID');s['E']=max(0,s['E']-cost)
    def consume(self,s,alias,n,kind='consumed',instance=None):
        integer(n,1);req(self.count(s,alias)>=n,'MISSING_ITEM')
        for id,i in list(s['items'].items()):
            if i['alias']!=alias or i['where'] not in ['pack','quick'] or (instance is not None and id!=instance):continue
            take=min(n,len(i['units']));gone=copy.deepcopy(i);gone.update(units=i['units'][:take],where=kind,at=None)
            s['disposed'].append(gone);i['units']=i['units'][take:];n-=take
            if not i['units']:del s['items'][id]
            if not n:break
    def grant(self,s,source,grants,where):
        req(source not in s['claimed'] or self.mutation=='source-duplication','SOURCE_USED')
        repeated=source in s['claimed'];s['claimed'].append(source)
        for alias,n in grants.items():
            integer(n,1);limit=self.p['physical.'+alias][3]
            for start in range(0,n,limit):
                suffix=':duplicate' if repeated else ''
                units=[source+':'+alias+':'+str(j)+suffix for j in range(start,min(start+limit,n))]
                for u in units:req(u not in s['origins'],'DUPLICATE_UNIT');s['origins'][u]=alias
                id=source+':'+alias+':'+str(start)+suffix
                s['items'][id]={'alias':alias,'units':units,'where':where,'at':None,'execution':s['execution']}
    def end(self,s,outcome,steps):
        s['phase']='dead' if outcome=='death' else 'hub';s['outcome']=outcome
        before=s['points'];penalty=min(before,self.t['failure_penalty']) if outcome in ['failure','deadline'] else 0
        s['points']=0 if outcome=='death' else before-penalty+(self.t['success_reward'] if outcome=='success' else 0)
        for id,i in list(s['items'].items()):
            if outcome=='death' or i['where'].startswith('ground:') or i['alias'] in ['sample','component','module','card']:
                d='death-unavailable' if outcome=='death' else 'unreachable' if i['where'].startswith('ground:') else ('delivered' if outcome=='success' else 'partial-delivery') if i['alias']=='sample' else 'revoked' if i['alias']=='card' else 'returned-special'
                s['disposed'].append({**i,'where':d,'at':None});del s['items'][id]
        s['pending']=None;s['receipt']={'outcome':outcome,'before':before,'penalty':penalty,'steps':steps,'endD':s['D'],'endT':s['T']}
    def cycle(self,s,deadline=False):
        req(s['pending'] is None,'PENDING');req((s['T']==self.g['limits']['days']) if deadline else s['T']<self.g['limits']['days'],'DEADLINE_DAY')
        h=self.g['health'];steps=[]
        def damage(kind,n):
            s['hp']=max(0,s['hp']-n);steps.append(kind)
            if s['hp']==0:self.end(s,'death',steps);return True
            return False
        if damage('cycle-bleeding',h['bleed_night'] if s['bleed'] else 0):return
        base=max(r['base'] for r in h['infection_stages'] if s['I']>=r['min'])
        s['I']+=max(0,base+h['exposure_progress']*s['exposure']-s['suppression']);s['exposure']=0
        if damage('infection',max(r['hp'] for r in h['infection_damage'] if s['I']>=r['min'])):return
        s['sat']=max(0,s['sat']-h['night_food'])
        if damage('hunger',h['starve_damage'] if s['sat']<=h['starve_threshold'] else 0):return
        steps.append('end-cycle');s['D']+=1;s['suppression']=0;s['painkiller']=False;s['quota']=copy.deepcopy(self.g['quota'])
        s['E']=self.g['rest']['A' if deadline else self.nodes[s['node']]['rest']]
        if deadline:self.end(s,'deadline',steps)
        else:s['T']+=1
    def projection(self,s):
        v={'node':s['node'],'hp':s['hp'],'energy':s['E'],'knownEdges':sorted(s['knowledge']),'bleeding':s['bleed'],'satiety':s['sat'],'message':'仅已知状态；隐藏病程后果不作保证'}
        if self.mutation=='hidden-data-leak':v['infection']=s['I']
        return v
    def step(self,before,a):
        self.validate(before);s=copy.deepcopy(before);cost=0;op=a['op']
        req(set(a)<= {'op','id','to','mode','at','enemy','ctb','damage','enemyDamage','wear','coatWear','bleeding','exposure','outcome','item','target','expectedRevision','quantity'},'INTENT_FIELDS')
        if 'expectedRevision' in a:req(a['expectedRevision']==s['revision'],'STALE')
        if op=='reopen' and self.mutation=='terminal-reopen':s['phase']='active';s['outcome']=None;return s
        req(s['phase']=='active','CLOSED');req(s['hp']>0,'DEAD');req(s['pending'] is None or op=='combat','PENDING')
        if op=='move':
            e=next((e for e in self.edges.values() if set(e['ends'])=={s['node'],a['to']}),None)
            req(e is not None and e['id'] in s['knowledge'],'UNKNOWN_ROUTE')
            req(not e['fact'] or e['fact'] in s['facts'],'BLOCKED_ROUTE');req(not e['item'] or self.count(s,e['item'])>0,'MISSING_PERMISSION')
            band=next(b for b in self.p['load.bands'] if b[0]<=self.weight(s)<=b[1]);factor=band[2]/100
            if s['contusion'] and not s['painkiller']:factor*=self.p['load.contusion_percent']/100
            cost=math.ceil(self.p[e['cost']]*factor);self.charge(s,cost);s['previous']=s['node'];s['node']=a['to'];self.observe(s)
            en=self.nodes[s['node']]['enemy']
            if en and s['enemies'][en]['hp']>0:s['pending']=en;s['enemies'][en]['encountered']=True
        elif op=='source':
            d=self.sources[a['id']];req(d['node']==s['node'],'WRONG_LOCATION');req(d['mode']=='ground-once','CONTROLLED_SOURCE');req(all(f in s['facts'] for f in d['requires']),'MISSING_FACT')
            cost=self.p[d['cost']]
            if d['cost']=='search.dark' and a.get('mode')=='lit':
                req(s['tool']=='lamp' and s['gear']['lamp']>0,'TOOL');cost=self.p['search.lit'];s['gear']['lamp']-=self.p['wear.lamp']
            if d['id']=='C4-cabinet' and a.get('mode')=='crow':
                req(s['tool']=='crow' and s['gear']['crow']>0,'TOOL');cost=self.p['door.crow'];s['gear']['crow']-=self.p['wear.tool']
            self.charge(s,cost);self.grant(s,d['id'],self.p[d['grants']],'ground:'+s['node'])
            if d['id'] in ['H1-search','H2-search']:
                randomId=d['id'][:2]+'-random';req(a.get('item') in self.sources[randomId]['choices'],'RANDOM_BRANCH');self.grant(s,randomId,{a['item']:self.p['unit']},'ground:'+s['node'])
        elif op=='pickup':
            i=s['items'].get(a['id']);req(i is not None and i['where']=='ground:'+s['node'],'NO_LOCAL_ITEM')
            i.update(where='pack',at=a['at']);self.placements(s)
        elif op=='split':
            i=s['items'].get(a['id']);req(i is not None and i['where']=='pack','NO_CARRIED_ITEM')
            integer(a['quantity'],1);req(a['quantity']<len(i['units']),'SPLIT_AMOUNT')
            child=a['id']+':split:'+str(s['revision']);req(child not in s['items'],'DUPLICATE_INSTANCE')
            s['items'][child]={**copy.deepcopy(i),'units':i['units'][:a['quantity']],'at':a['at']};i['units']=i['units'][a['quantity']:];self.placements(s)
        elif op=='merge':
            i=s['items'].get(a['id']);j=s['items'].get(a['target'])
            req(i is not None and j is not None and i is not j and i['where']==j['where']=='pack','NO_CARRIED_ITEM')
            req(i['alias']==j['alias'] and i['execution']==j['execution'],'MERGE_TYPE');req(len(i['units'])+len(j['units'])<=self.p['physical.'+i['alias']][3],'STACK_LIMIT')
            j['units']+=i['units'];del s['items'][a['id']]
        elif op=='drop':
            i=s['items'].get(a['id']);req(i is not None and i['where']=='pack','NO_CARRIED_ITEM');i.update(where='ground:'+s['node'],at=None)
        elif op=='task':
            d=self.actions[a['id']];req(d['node']==s['node'],'WRONG_LOCATION');req(all(f in s['facts'] for f in d['requires']),'MISSING_FACT')
            if d['fact']:req(d['fact'] not in s['facts'],'ALREADY_DONE')
            cost=self.p[d['cost']];mode=a.get('mode','manual')
            if d['id'] in ['l1-open','l3-open','c-gate','fix','bypass'] and mode=='crow':
                req(s['tool']=='crow' and s['gear']['crow']>0,'TOOL');cost=self.p['bypass.crow' if d['id']=='bypass' else 'door.crow'];s['gear']['crow']-=self.p['wear.tool']
            elif d['id']=='fix':cost=self.p['fix.method'] if s['specialty']=='engineer' or 'method' in s['facts'] else cost
            if d['id']=='verify':cost=self.p['verify.fast' if 'matched' in s['facts'] else 'verify.full']
            if d['id']=='match':cost=self.p['verify.'+('scout.' if s['specialty']=='scout' else '')+('fast' if 'verified' in s['facts'] else 'full')]
            if d['id']=='fire-door':
                req(mode in ['toolbox','crow','card'],'DOOR_METHOD')
                if mode=='card':req(self.count(s,'card')>0,'MISSING_PERMISSION');cost=self.p['door.card']
                else:req(s['tool']==mode and s['gear'][mode]>0,'TOOL');cost=self.p['door.'+mode];s['gear'][mode]-=self.p['wear.tool']
            if d['consume']:
                for alias,n in self.p[d['consume']].items():req(self.count(s,alias)>=n,'MISSING_ITEM')
                for alias,n in self.p[d['consume']].items():self.consume(s,alias,n,'installed')
            self.charge(s,cost)
            if d['grant']:
                self.grant(s,'TASK-'+d['grant'],{d['grant']:self.p[d['outputQuantity']]},'ground:'+s['node'])
                id='TASK-'+d['grant']+':'+d['grant']+':0';s['items'][id].update(where='pack',at=a['at']);self.placements(s)
                if d['id']=='sample':
                    req(a.get('mode','cautious')=='cautious' and s['gear']['coat']>0,'UNMODELED_SAMPLE_BRANCH');s['gear']['coat']-=self.p['wear.tool']
            if d['fact']:s['facts'].append(d['fact'])
            if d['id']=='fire-door' and mode=='toolbox':self.grant(s,'H1-toolbox',self.p['grant.H1-toolbox'],'ground:H1')
            self.observe(s)
        elif op=='combat':
            req(s['pending']==a['enemy'],'NO_ENCOUNTER');en=s['enemies'][a['enemy']]
            for k in ['ctb','damage','enemyDamage','wear','coatWear','exposure']:integer(a[k])
            req(type(a['bleeding']) is bool,'TRACE_BOOL');req(a['outcome'] in ['victory','retreat','death'],'COMBAT_OUTCOME')
            req(s['gear']['pipe']>=a['wear'] and s['gear']['coat']>=a['coatWear'],'TRACE_RESOURCE');req(a['enemyDamage']<=en['hp'],'TRACE_DAMAGE')
            cost=max(self.p['combat.minimum'],math.ceil(a['ctb']/self.p['combat.ctb_step'])*self.p['combat.energy_step'])
            s['E']=max(0,s['E']-cost);s['hp']=max(0,s['hp']-a['damage']);s['gear']['pipe']-=a['wear'];s['gear']['coat']-=a['coatWear'];s['exposure']+=a['exposure'];s['bleed']=a['bleeding'];en['hp']-=a['enemyDamage'];en['cursor']+=1;en['intent']+=1
            if s['hp']==0:self.end(s,'death',['external-combat-primary'])
            elif a['outcome']=='retreat':req(en['hp']>0,'TRACE_OUTCOME');s['node']=s['previous'];s['pending']=None
            else:req(a['outcome']=='victory' and en['hp']==0,'TRACE_OUTCOME');s['facts'].append('enemy-'+a['enemy']+'-cleared');s['pending']=None
        elif op=='medical':
            alias=a['item'];req(self.count(s,alias)>0,'MISSING_ITEM');req(a.get('id') in s['items'] and s['items'][a['id']]['alias']==alias and s['items'][a['id']]['where'] in ['pack','quick'],'TARGET_INSTANCE');req(alias in ['food','bandage','firstaid','disinfect','suppressant','painkiller'],'MEDICAL_KIND')
            if alias=='food':req(s['sat']<self.g['limits']['satiety'],'NO_TARGET');s['sat']=min(self.g['limits']['satiety'],s['sat']+self.p['ration.satiety'])
            if alias=='bandage':
                eligible=[w for w in s['wounds'] if not w['treated']]
                req(s['hp']<self.g['limits']['hp'] or s['bleed'] or eligible,'NO_TARGET')
                if eligible:req(a.get('target') in [w['id'] for w in eligible],'TARGET_REQUIRED')
                for w in s['wounds']:
                    if w['id']==a.get('target'):w['treated']=True
                bonus=s['specialty']=='survival' and not s['survivalUsed'];s['hp']=min(self.g['limits']['hp'],s['hp']+self.p['survival.hp' if bonus else 'bandage.hp']);s['bleed']=False
                if bonus:s['survivalUsed']=True
            if alias=='firstaid':
                targets=[w['id'] for w in s['wounds']]+(['contusion'] if s['contusion'] else [])
                req(s['hp']<self.g['limits']['hp'] or targets,'NO_TARGET')
                if targets:req(a.get('target') in targets,'TARGET_REQUIRED')
                if a.get('target')=='contusion':s['contusion']=False
                s['wounds']=[w for w in s['wounds'] if w['id']!=a.get('target')]
                if targets and not any(not w['treated'] for w in s['wounds']):s['bleed']=False
                s['hp']=min(self.g['limits']['hp'],s['hp']+self.p['firstaid.hp'])
            if alias=='disinfect':req(s['exposure']>0,'NO_TARGET');req(s['quota']['disinfectant']>0,'QUOTA_USED');s['exposure']-=self.p['disinfect.exposure'];s['quota']['disinfectant']-=1
            if alias=='suppressant':req(s['I']>0 or s['exposure']>0,'NO_TARGET');req(s['quota']['suppressant']>0,'QUOTA_USED');s['suppression']=self.g['health']['suppression'];s['quota']['suppressant']-=1
            if alias=='painkiller':req(not s['painkiller'] and (s['contusion'] or any(not w['treated'] for w in s['wounds'])),'NO_TARGET');s['painkiller']=True
            self.consume(s,alias,self.p['unit'],instance=a['id'])
        elif op=='repair':
            target=a['target'];req(target in s['gear'],'TOOL');req(s['gear'][target]<self.p['capacity.'+target],'NO_TARGET')
            inputs=self.p['maintenance.inputs'][target]
            cost=self.p['recharge' if target=='lamp' else 'maintenance.'+('mechanical' if target in ['pipe','crow'] else target)];self.charge(s,cost)
            for alias,n in inputs.items():self.consume(s,alias,n)
            s['gear'][target]=min(self.p['capacity.'+target],s['gear'][target]+self.p['restore.'+('metal_pool' if target in ['pipe','crow'] else target)])
        elif op=='exchange':
            req(s['node']=='T1','WRONG_LOCATION');cost=self.p['exchange'];self.charge(s,cost)
            for alias,n in self.p['exchange.inputs'].items():self.consume(s,alias,n)
            self.grant(s,'T1-exchange',self.p['grant.T1-exchange'],'pack')
            s['items']['T1-exchange:food:0']['at']=a['at'];self.placements(s)
        elif op=='rest':self.cycle(s)
        elif op=='return':
            req(s['node']=='H0','WRONG_LOCATION')
            sample=[i for i in s['items'].values() if i['alias']=='sample' and i['where']=='pack' and i['execution']==s['execution'] and i['units']==['TASK-sample:sample:0']]
            complete=all(f in s['facts'] for f in self.content['goal']['facts']) and len(sample)==1
            req(a['outcome'] in ['success','failure'],'TERMINAL_INTENT');req((a['outcome']=='success')==complete,'WRONG_TERMINAL_INTENT')
            self.end(s,'success' if complete else 'failure',[])
            if self.mutation=='double-body-cycle':s['hp']=max(1,s['hp']-self.g['health']['bleed_night']);s['D']+=1
        elif op=='deadline':req(s['node']!='H0','NORMAL_RETURN_REQUIRED');self.cycle(s,True)
        elif op=='reload':pass
        else:raise Reject('UNKNOWN_INTENT')
        if op not in ['combat','rest','deadline','return'] and cost>0 and s['bleed']:
            s['hp']=max(0,s['hp']-self.g['health']['bleed_action'])
            if s['hp']==0:self.end(s,'death',['primary','action-bleeding'])
        s['revision']+=op!='reload';self.validate(s);return s

def leaves(x):
    if isinstance(x,dict):return sum(leaves(v) for v in x.values())
    if isinstance(x,list):return sum(leaves(v) for v in x)
    return 1
def run(root,mutation=None):
    m=Model(root,mutation);f=json.loads((m.base/'validation/fixtures.json').read_text(encoding='utf-8'));rows=[];traces={}
    def record(id,category,expected,actual,oracle):rows.append({'id':id,'category':category,'expected':expected,'actual':actual,'match':expected==actual,'oracle':oracle})
    for ref in m.params['approvedReadOnly']:record('approved-'+ref['configurationId'],'positive',ref['sha256'],hashlib.sha256((m.root/ref['path']).read_bytes()).hexdigest(),'input manifest / formal config bytes')
    record('approved-leaves','positive',38,leaves(m.g)+leaves(m.t),'DEC-050/051 34+4')
    graph_ok=len(m.nodes)==24 and len(m.content['maps'])==5 and all(all(n in m.nodes for n in e['ends']) and (not e['revealBy'] or e['revealBy'] in m.actions) for e in m.edges.values())
    producers=[a['fact'] for a in m.actions.values() if a['fact']]+['enemy-'+e['id']+'-cleared' for e in m.content['enemies']]
    graph_ok=graph_ok and len(producers)==len(set(producers)) and len(m.sources)==len(m.content['sources']) and len(m.edges)==len(m.content['edges'])
    graph_ok=graph_ok and all(a['node'] in m.nodes and all(f in producers for f in a['requires']) and a['cost'] in m.p for a in m.actions.values())
    graph_ok=graph_ok and all(eid in m.edges and n['id'] in m.edges[eid]['ends'] for n in m.nodes.values() for eid in n['surfaceEdges'])
    record('graph-integrity','positive',True,graph_ok,'03-location-design 24 nodes + edge/dependency IDs')
    for case in f['cases']:
        s=m.initial(case.get('tool','crow'),case.get('specialty','scout'));s.update(copy.deepcopy(case.get('initial',{})))
        for seed in case.get('seedItems',[]):m.grant(s,seed['source'],seed['grants'],seed.get('where','quick'))
        for a in case.get('prefix',[]):s=m.step(s,a)
        before=canon(s);actual=None
        try:
            if case.get('query')=='hidden-pair':
                other=copy.deepcopy(s);other['I']=110;other['execution']='other-seed-fixture';actual={'equal':m.projection(s)==m.projection(other),'unchanged':before==canon(s)}
            elif case.get('query')=='validate':
                raw=copy.deepcopy(s)
                for change in case['mutations']:
                    parent=raw
                    for key in change['path'][:-1]:parent=parent[key]
                    parent[change['path'][-1]]=change['value']
                m.validate(raw);actual={'accepted':True}
            else:
                out=m.step(s,case['action']);actual={k:out[k] for k in case.get('select',[])}
        except Reject as e:actual={'reject':str(e),'zeroCommit':canon(s)==before}
        except Exception as e:actual={'modelError':type(e).__name__,'message':str(e)}
        record(case['id'],case['category'],case['expect'],actual,case['oracle'])
    for route in f['routes']:
        s=m.initial(route['tool'],route['specialty']);trace=[];failure=None
        for idx,a in enumerate(route['actions']):
            before=copy.deepcopy(s)
            try:s=m.step(s,a)
            except Reject as e:failure={'step':idx,'reject':str(e)};break
            except Exception as e:failure={'step':idx,'modelError':type(e).__name__,'message':str(e)};break
            trace.append({'step':idx,'action':a,'location':[before['node'],s['node']],'D/T':[s['D'],s['T']],
            'energy':[before['E'],s['E']],'hp':[before['hp'],s['hp']],'satiety':[before['sat'],s['sat']],
            'infection':[s['I'],s['exposure']],'resources':copy.deepcopy(s['gear']),'weight':m.weight(s),'items':copy.deepcopy(s['items']),
            'claimed':s['claimed'][:],'facts':s['facts'][:],'dispositions':copy.deepcopy(s['disposed']),
            'evidence':'external conditional combat result; NOT CTB validation' if a['op']=='combat' else 'finite model only'})
        actual=failure or {'outcome':s['outcome'],'points':s['points'],'node':s['node'],'hotelVisited':any(n.startswith('T') for n in s['visited'])}
        record(route['id'],'positive',route['expect'],actual,'fixed itinerary / D01-D04; conditional CTB input, not win guarantee')
        traces[route['id']]={'scope':route['scope'],'trace':trace,'termination':actual,'remainingHP':s['hp'],'D/T':[s['D'],s['T']]}
    for x in f['unsupported']:record(x['id'],'unsupported','UNSUPPORTED','UNSUPPORTED',x['reason'])
    mismatch=sum(not r['match'] for r in rows);counts={k:sum(r['category']==k for r in rows) for k in ['positive','expected-rejection','fault-injection','unsupported']};counts['mismatch']=mismatch
    return {'kind':'isolated-finite-design-evidence','mutation':mutation,'counts':counts,'cases':rows,'routes':traces,'productionTests':'NOT RUN','productionCalls':0}
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--repo-root',required=True);a.add_argument('--out',required=True);a.add_argument('--negative-control',choices=['source-duplication','terminal-reopen','double-body-cycle','hidden-data-leak']);args=a.parse_args()
    result=run(args.repo_root,args.negative_control);out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes((json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False)+'\n').encode())
    print(json.dumps({'counts':result['counts'],'failedIDs':[r['id'] for r in result['cases'] if not r['match']]},ensure_ascii=False));raise SystemExit(1 if result['counts']['mismatch'] else 0)
