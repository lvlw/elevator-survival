"""Design-only file/geometry audit. Does not run production rules or tests."""
from pathlib import Path
from PIL import Image
import hashlib, json, re, subprocess, sys

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[2]
BASE='0e0c5cf50bce038f1e915529fe83c3278c30ab95'
checks=[]
def check(name,ok,detail=None): checks.append({'name':name,'pass':bool(ok),'detail':detail})
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
data=json.loads((ROOT/'spec/screens-and-content.json').read_text('utf-8'))
check('25 named page families',len({s['family'] for s in data['screens']})==25)
check('24 nodes / 19 item definitions',len(data['nodes'])==24 and len(data['items'])==19)
for s in data['screens']:
    name=s['id']+'-1920x1080'
    p=ROOT/'previews/screens'/f'{name}.png'
    check('screen '+s['id'],p.exists() and Image.open(p).size==(1920,1080))
    check('editable '+s['id'],(ROOT/'editable/screens'/f'{name}.svg').exists())
for p in (ROOT/'editable/assets').glob('*.png'):
    with Image.open(p) as im: im.verify()
    check('image decode '+p.name,True)
    original=REPO/'src/assets/presentation/v0.1/visual'/p.name
    if original.exists():check('baseline asset bytes '+p.name,p.read_bytes()==original.read_bytes(),sha(p))
for x in json.loads((ROOT/'spec/protected-sources.json').read_text('utf-8')):
    check('protected '+x['path'],sha(REPO/x['path'])==x['sha256'])
profiles=[(1920,1080,1200,888,326,216,452),(1600,900,968,728,284,188,412),(1440,900,856,744,278,184,444),(1366,768,814,620,260,172,364),(1280,720,768,584,242,160,328)]
geometry=[]
for w,h,c,b,gw,gh,arena in profiles:
    j=json.loads((ROOT/f'previews/screens/P15-orderly-{w}x{h}.json').read_text('utf-8'))
    r={x['selector']:x for x in j['rects'] if x}
    check(f'desktop geometry {w}x{h}',[r['.center']['w'],r['.center']['h'],r['.inventory']['w'],r['.inventory']['h'],r['.arena']['h']]==[c,b,gw,gh,arena])
    geometry.append(j)
required=[]
for w,h in [(1600,900),(1366,768)]:
    required.extend((s,w,h) for s in ['P03-hospital','P09-normal','P10-inventory','P12-bandage','P15-orderly','P16-max','P23-failed','P24-corrupt'])
required.extend((s,1280,720) for s in ['P03-hospital','P11-task-pickup','P15-orderly','P22-certain-death'])
required.extend((s,1440,900) for s in ['P03-hospital','P15-orderly'])
for w,h in [(2560,1440),(2560,1080),(1366,650),(1024,768),(390,844)]:
    required.extend((s,w,h) for s in ['P03-hospital','P09-normal','P12-bandage','P15-orderly','P23-failed'])
for s,w,h in required:
    p=ROOT/f'previews/screens/{s}-{w}x{h}.json'
    check('responsive export '+p.stem,p.exists())
for p in (ROOT/'previews/screens').glob('*.json'):
    j=json.loads(p.read_text('utf-8'))
    check('loaded assets '+p.stem,not j['missing'],j['missing'])
    if j['viewport']==[2560,1440]:
        shell=next(x for x in j['rects'] if x and x['selector']=='.shell')
        check('large shell '+p.stem,[shell['x'],shell['y'],shell['w'],shell['h']]==[320,180,1920,1080])
    if j['viewport'] not in [[x[0],x[1]] for x in profiles]:geometry.append(j)
textfiles=[p for p in ROOT.rglob('*') if p.is_file() and p.suffix in ['.md','.json','.py','.js','.css','.html','.svg','.txt']]
for p in textfiles:
    try:p.read_text('utf-8-sig');ok=True
    except UnicodeDecodeError:ok=False
    check('UTF8 '+p.relative_to(ROOT).as_posix(),ok)
links=[]
for p in ROOT.rglob('*.md'):
    if any(x in p.relative_to(ROOT).parts for x in ['inputs','history-v1.0','history-r1','r2-inputs']):continue
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text('utf-8')):
        if re.match(r'^(https?:|data:|#|[A-Z]:)',target):continue
        file=target.split('#')[0].split('?')[0]
        ok=(p.parent/file).exists()
        links.append({'from':p.relative_to(ROOT).as_posix(),'target':target,'exists':ok})
        check('link '+p.name+' '+target,ok)
changed=subprocess.check_output(['git','diff','--name-only','-z',BASE],cwd=REPO,text=True,encoding='utf-8').split('\0')
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=REPO,text=True,encoding='utf-8').split('\0')
outside=[p for p in changed+untracked if p and not p.startswith('docs/design-drafts/ui-v1-001/')]
check('scope only ui-v1-001',not outside,outside)
check('no file over 100 MiB',all(p.stat().st_size<100*1024**2 for p in ROOT.rglob('*') if p.is_file()))
result={'kind':'DESIGN_FILE_AND_GEOMETRY_AUDIT_NOT_PRODUCTION_TESTS','baseline':BASE,'checks':checks,'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'limitations':['This script does not prove visual quality or interaction.','Background DPR2 and residual alpha gates remain open.','Browser evidence and zoom status are independently recorded under validation/r2; audit counts do not prove completion.'],'productionTests':'NOT RUN'}
(ROOT/'validation/final-check-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n','utf-8')
(ROOT/'validation/responsive-results.json').write_text(json.dumps({'kind':'ACTUAL_BROWSER_DOM_MEASUREMENTS','desktopProfiles':geometry[:5],'otherProfiles':geometry[5:],'requiredAdditionalExports':len(required),'zoom':'See r2/zoom/100.json, 125.json and 150.json; user operated real browser zoom, no CSS zoom'},ensure_ascii=False,indent=2)+'\n','utf-8')
(ROOT/'validation/link-results.json').write_text(json.dumps(links,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps({'passed':result['passed'],'failed':result['failed'],'failedChecks':[x for x in checks if not x['pass']]},ensure_ascii=False))
sys.exit(1 if result['failed'] else 0)
