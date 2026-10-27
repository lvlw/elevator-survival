"""Audit saved R1 evidence and exact files. No production code or UI is executed."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat, ImageDraw
from html.parser import HTMLParser
import hashlib, json, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[2]
REPO = ROOT.parents[2]
BASE = 'd7d395ea7c061e26f9244fcfd296c764785af16a'
PREFIX = ROOT.relative_to(REPO).as_posix()+'/'
checks=[]
def check(name, ok, detail=None):
    checks.append(dict(name=name,pass_=bool(ok),detail=detail))
def dump(path, data):
    (ROOT/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf-8')
def sha(b): return hashlib.sha256(b).hexdigest()
def git(*args): return subprocess.check_output(['git',*args],cwd=REPO)

# Exact original inputs and preserved v1.0 reports are independent of new QA.
for rel in filter(None,git('ls-tree','-r','--name-only','-z',BASE,'--',PREFIX+'inputs').decode().split('\0')):
    check('input unchanged '+rel,(REPO/rel).read_bytes()==git('show',BASE+':'+rel))
history=[]
for p in (ROOT/'validation/history-v1.0').rglob('*'):
    if not p.is_file(): continue
    rel=p.relative_to(ROOT/'validation/history-v1.0').as_posix()
    origin=rel if rel.startswith('spec/') or '/' in rel else ('validation/'+rel if p.suffix=='.json' or rel=='design-qa.md' else rel)
    # The earlier archive uses report filenames at its root.
    if rel in ['completion.md','00-owner-review.md','size-change-log.md']: origin=rel
    if rel in ['asset-manifest.json','delivery-packages.json','node-crop-manifest.json','screen-manifest.json']: origin='spec/'+rel
    try: old=git('show',BASE+':'+PREFIX+origin)
    except subprocess.CalledProcessError:
        history.append({'archive':rel,'status':'NO_BASELINE_MAPPING'}); check('history mapping '+rel,False); continue
    ok=p.read_bytes()==old;check('history exact '+rel,ok)
    history.append({'archive':rel,'original':origin,'sha256':sha(p.read_bytes()),'exact':ok})
dump('validation/r1/history-byte-audit.json',history)

runs=[]
for argv in [['verify-task-package.py'],['verify-dimensions.py','尺寸耦合合同-v1.0.json']]:
    r=subprocess.run([sys.executable,'-B','-X','utf8',*argv],cwd=ROOT/'inputs',capture_output=True,text=True,encoding='utf-8')
    runs.append({'argv':argv,'cwd':'inputs','exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
    check('input verifier '+argv[0],r.returncode==0)
dump('validation/r1/input-verification.json',runs)

records=json.loads((ROOT/'validation/r1/edge-browser.json').read_text('utf-8'))
by={x['label']:x for x in records}
def body(label): return by[label]['text']
for label in ['01-lamp-engineer-confirmed','02-initial-help','03-depart-h0']:
    check('selection continuity '+label,all(s in body(label) for s in ['手电筒 / 工程','12 / 12','100 / 100','6 / 6']))
for key,region in [('hospital','医院'),('hotel','酒店'),('power','供电所'),('logistics','物流'),('communication','通信')]:
    check('map region '+key,region in body('04-map-'+key))
check('death view retains HP0','0 / 12' in body('05-death-help') and '角色已死亡' in body('05-death-help'))
check('death returns to terminal','0 / 12' in body('06-death-return'))
check('corrupt view has no default body','— / 12' in body('07-corrupt-help') and '8 / 12' not in body('07-corrupt-help'))
check('corrupt return','记录无法校验' in body('08-corrupt-return'))
check('sample menu has no split','拆分' not in by['09-sample-menu']['ax'] and '密封病原样本箱' in by['09-sample-menu']['ax'])
for label in ['10-sample-move','11-sample-2x2-placement','13-sample-drop-bound']:
    check('bound sample '+label,'密封病原样本箱' in body(label))
check('bound sample confirmation','将指定样本留在这里？' in body('14-sample-drop-confirm'))
check('adjacent component defect reproduced','将指定样本留在这里？' in body('38-before-component-confirmation'))
check('component confirmation repaired','将转运组件留在这里？' in body('39-after-component-confirmation') and by['39-after-component-confirmation']['title'].startswith('留置转运组件'))
check('sample confirmation regression','将密封病原样本箱留在这里？' in body('40-after-sample-confirmation'))
check('ration remains ration','压缩口粮' in body('12-ration-use-bound') and '一次用药' not in body('12-ration-use-bound'))
for method,cost in [('cautious',10),('direct',6)]:
    for case,expected in [('normal','12/12 → 11/12'),('last','1/12 → 0/12'),('broken','不参与、不扣耗'),('unequipped','未参与（不扣耗）')]:
        s=body('15-payment-'+method+'-'+case)
        check('known payment '+method+' '+case,expected in s and '基础精力\n'+str(cost) in s)
for enemy,place in [('orderly','大厅'),('porter','登记室'),('technician','档案室')]:
    check('retreat anchor '+enemy,place in body('16-retreat-'+enemy))
for label in ['18-defense-no-enemy-hit','19-generic-fx-no-stage-change']:
    check('no enemy phase change '+label,bool(re.search(r'感染护工\s*·\s*完好',body(label))))
check('attack phase demonstration',bool(re.search(r'感染护工\s*·\s*受伤',body('20-attack-stage-change'))))
for label in ['33-success-help-context','35-success-map-context']:
    check('success context '+label,'已交付 · 不可领回' in body(label) and '本地供电 · 已完成' in body(label))
for label in ['34-success-help-return','36-success-map-return']:
    check('success return '+label,'转运完成，样本已交付' in body(label))
check('small medical control reached','一次用药设计示范，不执行治疗或扣物' in body('37-small-medical-reachable'))

zooms=[]
for percent,label,viewport,dpr in [(100,'32-zoom100-restored',[2552,908],1),(125,'24-zoom125-organize-reachable',[2042,726],1.25),(150,'30-zoom150-retreat-reachable',[1701,605],1.5)]:
    r=by[label];ok=r['viewport']==viewport and r['dpr']==dpr
    check('actual zoom '+str(percent),ok)
    zooms.append({'zoomPercent':percent,'cssViewport':r['viewport'],'dpr':r['dpr'],'evidence':r['screenshot'],'method':'Owner changed Edge browser zoom; agent read actual DOM/DPR and clicked controls; viewport override reset','status':'OBSERVED'})
dump('validation/r1/zoom-results.json',{'physicalScreenOwnerReported':[2560,1080],'rows':zooms,'restored100':by['32-zoom100-restored']['dpr']==1,'limitations':['This covers the recorded controls and browser configuration, not every browser/device.']})

responsive=json.loads((ROOT/'validation/r1/responsive-browser.json').read_text('utf-8'))
check('47 responsive observations',len(responsive)==47 and len({(x['sid'],x['w'],x['h']) for x in responsive})==47)
for x in responsive: check('responsive native assets '+x['sid']+str(x['viewport']),not x['missing'])

# Same-state raw native crop and authoring PNG: no resizing of either input.
native=Image.open(ROOT/'validation/r1/edge/22-nine-slice-shell.jpg').convert('RGB')
export=Image.open(ROOT/'previews/screens/P10-inventory-2552x908.png').convert('RGB')
check('nine slice comparison same dimensions',native.size==export.size==(1920,908))
regions=[(24,24,48,48),(1872,24,1896,48),(24,112,48,136),(1872,112,1896,136)]
stats=[]
board=Image.new('RGB',(640,320),'#162128');draw=ImageDraw.Draw(board)
for i,box in enumerate(regions):
    a=native.crop(box);b=export.crop(box)
    stats.append({'box':box,'meanAbsoluteRgbError':ImageStat.Stat(ImageChops.difference(a,b)).mean,'nativeStdDev':ImageStat.Stat(a).stddev,'exportStdDev':ImageStat.Stat(b).stddev})
    # Diagnostic enlargement only; never a production image or HD source.
    board.paste(a.resize((96,96)),((i%2)*320,(i//2)*160+30));board.paste(b.resize((96,96)),((i%2)*320+120,(i//2)*160+30))
    draw.text(((i%2)*320,(i//2)*160+5),f'Corner {i+1}: native / PNG',fill='white')
board.save(ROOT/'validation/r1/nine-slice-corner-comparison.png')
dump('validation/r1/nine-slice-comparison.json',{'authority':'Native browser render at matching state and viewport','native':'validation/r1/edge/22-nine-slice-shell.jpg','export':'previews/screens/P10-inventory-2552x908.png','sameSize':list(native.size),'regions':stats,'interpretation':'Shared nine SVG viewboxes preserve raster corners in PNG. JPEG compression/text rasterization prevents byte/pixel identity. Diagnostic corner enlargement is not artwork.'})

registered=json.loads((ROOT/'spec/registered-art.json').read_text('utf-8'))
for name,a in registered.items():
    check('registered bytes '+name,sha((ROOT/'editable/assets'/name).read_bytes())==a['sourceSha256'])
    check('shared foot '+name,a['footNormalized']==[.5,.92])
    check('hit in shared canvas '+name,all(0<=v<=1 for v in a['hitNormalized']))

class Links(HTMLParser):
    def __init__(self): super().__init__();self.links=[];self.ids=set()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.add(a['id'])
        for k in ['src','href']:
            if a.get(k):self.links.append(a[k])
linkrows=[]
for p in list((ROOT/'previews').glob('*.html'))+list((ROOT/'prototype').glob('*.html')):
    parser=Links();parser.feed(p.read_text('utf-8-sig'))
    for link in parser.links:
        if re.match(r'^(https?:|data:|#|\?)',link):continue
        target=link.split('?')[0].split('#')[0]
        ok=(p.parent/target).exists();check('HTML link '+p.name+' '+link,ok)
        linkrows.append({'from':p.relative_to(ROOT).as_posix(),'target':link,'exists':ok})
dump('validation/r1/html-link-results.json',linkrows)
for p in (ROOT/'prototype').glob('*.js'):
    r=subprocess.run(['node','--check',str(p)],cwd=REPO,capture_output=True,text=True,encoding='utf-8')
    check('JS syntax '+p.name,r.returncode==0,{'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
changed=git('diff','--name-only','-z',BASE).decode().split('\0')+git('ls-files','--others','--exclude-standard','-z').decode().split('\0')
check('design directory only',all(not p or p.startswith(PREFIX) for p in changed))
result={'kind':'R1_SAVED_EVIDENCE_AND_FILE_AUDIT','baseline':BASE,'checks':checks,'passed':sum(x['pass_'] for x in checks),'failed':sum(not x['pass_'] for x in checks),'notProven':['native DPR2 artwork','final alpha cleanup','file protocol opening','production correctness'],'productionTests':'NOT RUN','productionTypecheck':'NOT RUN','productionBuild':'NOT RUN'}
dump('validation/r1/audit-results.json',result)
print(json.dumps({'passed':result['passed'],'failed':result['failed'],'failedChecks':[x for x in checks if not x['pass_']]},ensure_ascii=False))
sys.exit(bool(result['failed']))
