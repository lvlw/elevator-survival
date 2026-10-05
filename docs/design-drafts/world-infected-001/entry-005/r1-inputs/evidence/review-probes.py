"""Independent finite-model probes; NOT native CTB or production v4 tests.
Run: python review-probes.py --source ../source --output review-results.json
Expected classifications are specified independently, not inferred from validate.
"""
import argparse, copy, hashlib, importlib.util, json
from pathlib import Path

def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--source',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);args=ap.parse_args()
 src=args.source/'check.py'; sp=args.source/'state-candidates.json'
 assert blob(src.read_bytes())=='95150e405ee7427badeebddd9c590106071ff602'
 assert blob(sp.read_bytes())=='60d059f7aaf3ec8b1a0bae231314fbcd107b55d0'
 module=importlib.util.spec_from_file_location('we005_unmodified',src); m=importlib.util.module_from_spec(module);module.loader.exec_module(m)
 spec=json.loads(sp.read_text()); clone=copy.deepcopy
 def stable(): return clone(spec['state'])
 def active():
  a=stable();a.update(phase='combat',node='H4',revision=11,battle=clone(spec['activeBattle']));a['enemy']['encountered']=True;return a
 def case(op,a,c,p):return dict(operation=op,before=a,command=c,proposal=p)
 def entry():
  a=stable();return case('entry',a,dict(kind='move',expectedRevision=10,edge='H1-H4:forward'),dict(arrivalHp=8,arrivalEnergy=16,battle=clone(spec['activeBattle']),priorEnemy=clone(a['enemy']),arrivalPending=True))
 def trace():
  a=active();a.update(hp=1,bleeding=True)
  p=dict(steps=[dict(kind='primary',before=1,requested=0,after=1),dict(kind='bleeding',before=1,requested=1,after=0)],finalHp=0,outcome='death',sourceBinding='TEST-execution',sourceBattle=a['battle']['id'],firstBefore=False,firstAfter=False)
  return case('trace',a,dict(kind='action'),p)
 def restoration(dead=False,second=False):
  a=active()
  if second:
   a['revision']=21;a['exitIds']=[spec['activeBattle']['id']];a['enemy'].update(hp=10,count=2,risk=3,intent='basic')
   a['battle'].update(id='TEST-execution:21:orderly',entryRevision=21,engagement='reentry',enemyNext=50,entryEnemyCount=2,entryRisk=3)
  a.update(hp=1,bleeding=True)
  p=clone(a)
  if dead:
   p.update(phase='dead',closed=True,hp=0,battle=None,revision=a['revision']+1,
    terminal=dict(source='combat-death',binding='TEST-execution',battleId=a['battle']['id'],beforeHp=1,steps=clone(trace()['proposal']['steps'])))
  e=dict(origin='independent-before-read',binding='TEST-execution',revision=p['revision'],phase=p['phase'],battleId=p['battle']['id'] if p['battle'] else None,enemy=clone(p['enemy']),queue=[p['battle'][k] for k in ['current','playerNext','enemyNext']] if p['battle'] else None,current=clone(p))
  return case('restore',a,dict(kind='cold',format=4,expected=e),p)
 rows=[]
 def run(id,c,expected,group):
  before=clone(c);err=None
  try: actual=m.validate(c,spec,None);classification='ACCEPTED'
  except m.Reject as e:actual='REJECT:'+str(e);classification='REJECTED'
  except Exception as e:actual='EXCEPTION';classification='EXCEPTION';err=type(e).__name__+': '+str(e)
  good=classification=='REJECTED' if expected=='REJECTED' else actual==expected
  rows.append(dict(id=id,group=group,expected=expected,actual=actual,classification=classification,match=good,exception=err,inputUnchanged=c==before,case=before))
 run('C01-first-entry',entry(),'ACTIVE_DECISION','control')
 c=entry();c['before']['energy']=2;c['proposal']['arrivalEnergy']=0;run('C02-E0-arrival',c,'ACTIVE_DECISION','control')
 c=entry();c['proposal'].update(arrivalHp=0,battle=None);run('C03-death-before-live-entry',c,'DEAD_ONLY','control')
 c=entry();c['before'].update(revision=20,exitIds=[spec['activeBattle']['id']]);c['command']['expectedRevision']=20;c['before']['enemy'].update(encountered=True,count=2,risk=3,hp=10);c['proposal']['priorEnemy']=clone(c['before']['enemy']);c['proposal']['battle'].update(id='TEST-execution:21:orderly',entryRevision=21,engagement='reentry',enemyNext=50,entryEnemyCount=2,entryRisk=3);run('C04-reentry',c,'ACTIVE_DECISION','control')
 run('C05-HP1-bleeding-death',trace(),'DEAD_ONLY','control')
 c=trace();c['before'].update(hp=11,bleeding=False);c['proposal'].update(steps=[dict(kind='heal',before=11,requested=2,after=12),dict(kind='enemy-direct',before=12,requested=2,after=10)],finalHp=10,outcome='alive',firstAfter=True);run('C06-heal-clips-then-damage',c,'TRACE_ALIVE','control')
 c=trace();c['before']=stable();c['before']['node']='H0';c['command']['kind']='normal-H0';c['proposal'].update(steps=[],finalHp=8,outcome='alive',sourceBattle=None);run('C07-normal-H0-empty',c,'NORMAL_EMPTY','control')
 run('C08-active-cold',restoration(),'RESTORED','control')
 run('C09-first-battle-dead-cold',restoration(True),'RESTORED','control')
 c=entry();c['command']['expectedRevision']=True;run('C10-bool-revision-already-rejected',c,'REJECTED','control')
 c=trace();c['proposal']['steps'][0]['requested']=False;run('C11-bool-step-already-rejected',c,'REJECTED','control')
 c=restoration();c['command']['expected']['binding']='TEST-other';run('C12-wrong-binding-already-rejected',c,'REJECTED','control')
 run('C13-reentry-active-cold',restoration(False,True),'RESTORED','control')
 for name,change in [
  ('arrival-HP13', lambda p:p.update(arrivalHp=13)),('arrival-E101',lambda p:p.update(arrivalEnergy=101)),
  ('arrivalPending-int',lambda p:p.update(arrivalPending=1)),('entry-defense-in-progress',lambda p:p['battle'].update(defense={'test':'not-stable'})),
  ('entry-escape-in-progress',lambda p:p['battle'].update(escape={'test':'not-stable'})),('empty-battle-id',lambda p:p['battle'].update(id=''))]:
  c=entry();change(c['proposal']);run('F01-'+name,c,'REJECTED','raw-and-boundary')
 c=trace();c['proposal']['finalHp']=False;run('F01-bool-finalHP0',c,'REJECTED','raw-and-boundary')
 c=trace();c['proposal'].update(steps=[dict(kind='primary',before=1,requested=0,after=1)],finalHp=1,outcome=None);run('F01-unknown-outcome',c,'REJECTED','raw-and-boundary')
 c=trace();c['proposal']['firstAfter']='true';run('F01-string-firstAfter',c,'REJECTED','raw-and-boundary')
 c=trace();c['proposal']['steps']=None;run('F01-null-steps',c,'REJECTED','raw-and-boundary')
 c=restoration();p=stable();p['revision']=1;c['proposal']=p;c['command']['expected'].update(revision=True,phase='stable',battleId=None,enemy=clone(p['enemy']),queue=None,current=clone(p));run('F01-bool-expected-revision',c,'REJECTED','raw-and-boundary')
 c=restoration();c['command']['expected']['enemy']['encountered']=1;run('F01-int-expected-boolean',c,'REJECTED','raw-and-boundary')
 c=restoration();c['command']['expected']['queue']=[False,False,70];run('F01-bool-expected-queue',c,'REJECTED','raw-and-boundary')
 c=restoration(True);del c['proposal']['terminal']['binding'];run('F01-missing-terminal-binding',c,'REJECTED','raw-and-boundary')
 c=restoration(True);c['command']['expected']['current']=None;run('F01-null-independent-current',c,'REJECTED','raw-and-boundary')
 for method in ['cold','same-progress']:
  c=restoration(True,True);c['command']['kind']=method;run('F02-second-battle-death-'+method,c,'RESTORED','death-anchor')
 c=restoration(True,True);c['proposal']['terminal']['battleId']='TEST-forged';run('C14-wrong-second-battle-still-rejects',c,'REJECTED','control')
 for sub in spec['unsupported']:
  c=case('unsupported',stable(),dict(subject=sub),{});run('U-'+sub,c,'UNSUPPORTED','unsupported')
 report=dict(mode='EXACT_FINITE_SCRIPT_AND_FULL_SPEC_WITH_INDEPENDENT_PROBES_NOT_NATIVE_ENGINE',commit='df1c3ff6979703b72bf76d73761b3915e59eb5b2',sourceBlob=blob(src.read_bytes()),specBlob=blob(sp.read_bytes()),total=len(rows),matched=sum(r['match'] for r in rows),mismatched=sum(not r['match'] for r in rows),exceptions=sum(r['exception'] is not None for r in rows),unsupported=sum(r['group']=='unsupported' for r in rows),rows=rows)
 args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in report.items() if k!='rows'},ensure_ascii=False,indent=2))
 for r in rows: print(r['id'],r['expected'],r['actual'],r['match'])
 return 1 if report['mismatched'] else 0
if __name__=='__main__':raise SystemExit(main())
