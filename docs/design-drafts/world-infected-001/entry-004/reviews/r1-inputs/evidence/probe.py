"""Targeted review of the exact 0362460 model, not production or CTB tests.
Run with --repo-root to use all original candidate data; without it, use the
explicit source-derived dependency slice packaged here. No Model method is mocked.
"""
import argparse, copy, hashlib, importlib.util, json
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser(); ap.add_argument('--repo-root'); ap.add_argument('--out',default=str(BASE/'evidence/probe-results.json')); args=ap.parse_args()
script=(Path(args.repo_root)/'docs/design-drafts/world-infected-001/entry-004/validation/check.py') if args.repo_root else BASE/'source/check.py'
b=script.read_bytes(); blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
spec=importlib.util.spec_from_file_location('reviewed_model',script);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
if args.repo_root:
 m=mod.Model(args.repo_root)
else:
 data=json.loads((BASE/'evidence/dependency-slice.json').read_text());m=mod.Model.__new__(mod.Model)
 m.content=data['content']; m.p=data['parameters'];m.nodes={x['id']:x for x in m.content['nodes']};m.edges={x['id']:x for x in m.content['edges']};m.sources={x['id']:x for x in m.content['sources']};m.actions={x['id']:x for x in m.content['actions']};m.mutation=None
 m.g=json.loads((BASE/'source/infected-residence-core-test-config-v0.1.json').read_text())['config']
 m.t=json.loads((BASE/'source/infected-terminal-core-test-config-v0.1.json').read_text())['config']
rows=[]
def attempt(id,s,a,expect='reject',condition=None):
 before=mod.canon(s)
 try:
  out=m.step(s,a);actual={'kind':'accepted','hp':out['hp'],'E':out['E'],'revision':out['revision'],'facts':out['facts'],'phase':out['phase'],'outcome':out['outcome'],'points':out['points'],'D':out['D'],'T':out['T'],'disposed':out['disposed']}
  ok=expect=='accept' and (condition is None or condition(out))
 except mod.Reject as e:
  actual={'kind':'semantic-reject','code':str(e)};ok=expect=='reject' and (condition is None or condition(str(e)))
 except Exception as e:
  actual={'kind':'unexpected-exception','type':type(e).__name__,'message':str(e)};ok=False
 unchanged=before==mod.canon(s);rows.append({'id':id,'expected':expect,'actual':actual,'match':bool(ok and unchanged),'inputUnchanged':unchanged,'action':a})
def bandaged():
 s=m.initial();s['hp']=8;s['E']=0;return s
med={'op':'medical','item':'bandage','id':'initial-bandage'}
attempt('control-valid-E0-bandage',bandaged(),med,'accept',lambda o:o['hp']==9 and o['E']==0 and len(o['disposed'])==1)
s=m.initial();attempt('control-no-target-bandage',s,med,'reject',lambda c:c=='NO_TARGET')
s=bandaged();s['pending']='orderly';attempt('control-pending-medical',s,med,'reject',lambda c:c=='PENDING')
s=bandaged();s['phase']='hub';s['outcome']='failure';attempt('control-closed-medical',s,med,'reject',lambda c:c=='CLOSED')
for suffix,v in [('negative',-1),('bool',True),('fraction',.5),('unsafe',9007199254740992)]:
 attempt('illegal-medical-quantity-'+suffix,bandaged(),{**med,'quantity':v})
for suffix,v in [('false',False)]:
 attempt('illegal-revision-'+suffix,bandaged(),{**med,'expectedRevision':v})
attempt('control-stale-revision',bandaged(),{**med,'expectedRevision':2},'reject',lambda c:c=='STALE')
attempt('missing-medical-instance',bandaged(),{'op':'medical','item':'bandage'},'reject')
attempt('missing-op',bandaged(),{'item':'bandage','id':'initial-bandage'})
s=m.initial();s['node']='H1';attempt('unknown-source-id',s,{'op':'source','id':'unknown'})
s=m.initial();s['node']='H8';attempt('unknown-task-id',s,{'op':'task','id':'unknown'})
attempt('extra-business-outcome-medical',bandaged(),{**med,'outcome':'success'})
def install_base():
 s=m.initial();s['node']='L2';s['facts']=['verified','fixed','enemy-porter-cleared'];s['enemies']['porter'].update(hp=0,encountered=True)
 s=m.step(s,{'op':'task','id':'component','at':[0,0,False]})
 s['node']='C3';s['facts'].append('matched')
 s=m.step(s,{'op':'task','id':'module','at':[2,0,False]})
 s['node']='H8';s['facts'].append('power')
 # Explicit test source fixture for ordinary resources; task items above use actual model producers.
 m.grant(s,'L3-rack',{'metal':1,'electronic':1,'battery':1},'ground:H8')
 for alias,x in [('metal',3),('electronic',4)]:s=m.step(s,{'op':'pickup','id':f'L3-rack:{alias}:0','at':[x,0,False]})
 m.validate(s);return s
install={'op':'task','id':'install'}
attempt('control-valid-task-install',install_base(),install,'accept',lambda o:'transfer' in o['facts'] and len(o['disposed'])==4)
for alias in ['component','module']:
 s=install_base();s['items'][f'TASK-{alias}:{alias}:0']['execution']='other-execution'
 attempt('foreign-execution-'+alias+'-install',s,install)
s=install_base();s['items']['TASK-component:component:0']['where']='ground:H8';s['items']['TASK-component:component:0']['at']=None
attempt('control-ground-component-install',s,install,'reject',lambda c:c=='MISSING_ITEM')
s=install_base();s=m.step(s,install);attempt('control-repeat-install',s,install,'reject',lambda c:c=='ALREADY_DONE')
s=install_base();s['E']=0;attempt('control-E0-install',s,install,'reject',lambda c:c=='E0_PAID')
s=install_base();s['claimed'].remove('TASK-component');attempt('missing-source-claim-install',s,install)
# Direct source/ownership corruption must not turn physically uncarried sample into success.
def success_base():
 s=install_base();s=m.step(s,install);s['node']='H5';s['facts'].append('enemy-orderly-cleared');s['enemies']['orderly'].update(hp=0,encountered=True)
 s=m.step(s,{'op':'task','id':'sample','mode':'cautious','at':[0,0,False]});s['node']='H0';return s
ret={'op':'return','outcome':'success'}
attempt('control-valid-success',success_base(),ret,'accept',lambda o:o['points']==120 and o['receipt']['steps']==[])
s=success_base();s['items']['TASK-sample:sample:0']['execution']='other-execution';attempt('control-foreign-sample-return',s,ret,'reject')
s=success_base();s['claimed'].remove('TASK-sample');attempt('missing-sample-source-claim-return',s,ret)
s=success_base();s['items']['TASK-sample:sample:0']['where']='ground:H0';s['items']['TASK-sample:sample:0']['at']=None;attempt('control-ground-sample-return',s,ret,'reject')
# Additional consistency probes; kept distinct from phase/IO or full CTB claims.
s=bandaged();s['wounds']=[{'id':'w','treated':-1}];attempt('invalid-wound-treated-number',s,med)
# Explicit lower-level negative controls for the existing unit-sum validator.
s=bandaged();s['items']['duplicate']=copy.deepcopy(s['items']['initial-bandage']);attempt('control-duplicate-unit',s,med,'reject',lambda c:c=='DUPLICATE_UNIT')
s=bandaged();s['origins']['missing']='bandage';attempt('control-missing-unit',s,med,'reject',lambda c:c=='MISSING_OUTPUT')
s=m.initial();s['node']='H0';s['bleed']=True;attempt('control-normal-return-empty-cycle',s,{'op':'return','outcome':'failure'},'accept',lambda o:o['D']==1 and o['hp']==12 and o['receipt']['steps']==[])
s=m.initial();s['node']='P1';s['E']=1;s['facts']=['power-survey'];attempt('control-final-over-budget-action',s,{'op':'task','id':'power'},'accept',lambda o:o['E']==0 and 'power' in o['facts'])
result={'reviewBaseCommit':'0362460b259cba6ea160e79ad04a6cb14181cef0','modelGitBlob':blob,'matchesReviewBaseModelBlob':blob=='4d3c0e443dd02232ca1cc8c7fbac25588ca06bd7','mode':'full-repository-data' if args.repo_root else 'source-derived-dependency-slice','scope':'Unmodified Model methods; independent targeted prepared states; not the author 98-case suite or native TS/CTB execution. No storage or notification exists in this finite model.','counts':{'checks':len(rows),'matched':sum(r['match'] for r in rows),'mismatch':sum(not r['match'] for r in rows),'unexpectedExceptions':sum(r['actual']['kind']=='unexpected-exception' for r in rows)},'cases':rows}
Path(args.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result['counts']));print('\n'.join(r['id']+': '+r['actual']['kind'] for r in rows if not r['match']))
raise SystemExit(1 if result['counts']['mismatch'] else 0)
