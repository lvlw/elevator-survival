"""Synchronize current design manifests from actual exports; never rewrite historical QA."""
from pathlib import Path
import json, hashlib, subprocess

ROOT=Path(__file__).resolve().parents[2]
REPO=ROOT.parents[2]
BASE='0e0c5cf50bce038f1e915529fe83c3278c30ab95'
def read(name): return json.loads((ROOT/name).read_text('utf-8'))
def write(name,obj): (ROOT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n','utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def preserve(name):
    out=ROOT/'validation/r2/history-r1'/name
    if not out.exists():
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_bytes(subprocess.check_output(['git','show',BASE+':docs/design-drafts/ui-v1-001/'+name],cwd=REPO))

for name in ['03-dimension-contract.md','04-interaction-and-motion.md','05-asset-coverage.md','previews/index.html','validation/design-qa.md','spec/dimension-contract.json','spec/node-crop-manifest.json']:
    preserve(name)
exports=[]
for p in sorted((ROOT/'previews/screens').glob('*.json')):
    j=json.loads(p.read_text('utf-8'))
    if j.get('version')=='v1.2-r2': exports.append((p,j))
source={p.relative_to(ROOT).as_posix():digest(p) for p in sorted((ROOT/'prototype').iterdir()) if p.is_file()}
blobs={p.relative_to(ROOT).as_posix():subprocess.check_output(['git','hash-object','--path='+p.relative_to(REPO).as_posix(),str(p)],cwd=REPO).decode().strip() for p in sorted((ROOT/'prototype').iterdir()) if p.is_file()}
write('validation/r2/tested-design-source.json',{'kind':'WORKING_DESIGN_SOURCE_HASHES_FOR_COMMIT_BLOB_CHECK','files':source,'gitCanonicalBlobs':blobs,'lineEndingPolicy':'Raw working bytes and Git clean-filter blob recorded separately; no configuration changes.'})
screens=read('spec/screen-manifest.json')
for s in screens:
    s['version']='v1.2-r2';s['sha256']=digest(ROOT/s['preview'])
    s['editableSha256']=digest(ROOT/s['editable'])
    s['master']='prototype/index.html + screens.js + flow-context.js + ui.js + ui.css + nine-slice.js + export.js'
    s['geometry']='previews/screens/'+s['id']+'-1920x1080.json'
    s['visualAuthority']='Native browser; serialized PNG checked by independent raster readback on seven representative states, not pixel identity'
write('spec/screen-manifest.json',screens)
assets=read('spec/asset-manifest.json')
for a in assets:
    observations=[]
    for path,j in exports:
        for im in j.get('assets',[]):
            if Path(im['path']).name==Path(a['file']).name:
                observations.append({'screen':j['screen'],'viewport':j['viewport'],'slot':im['display'],'fit':im['fit'],'position':im['position']})
    a['version']='v1.2 registration; unchanged original raster version'
    a['r2ObservedSlots']=observations
    a['r2Audit']='validation/r2/asset-inspection/measurements.json'
    a['r2RasterReplaced']=False
    a['r2SlotStatus']='MEASURED_CURRENT_EXPORTS' if observations else 'NO_IMG_SLOT_OBSERVATION_SEE_VECTOR_OR_LEGACY_USE'
    if a['category']=='background':a['r2Gate']='INCOMPLETE_ART_NATIVE_2X_NOT_MET'
    elif a['alpha']:a['r2Gate']='FOUR_MATTES_REVIEWED_FINAL_ALPHA_CERTIFICATION_OPEN'
write('spec/asset-manifest.json',assets)
dim=read('spec/dimension-contract.json')
dim['version']='v1.2-r2';dim['ordinaryPanelTiers']={'brief':640,'detail':680,'summary':800,'parameters':880,'complex':1000,'map':1040,'battle':1080}
dim['panelHeight']='Content-driven capped by available center; battle keeps explicit row budget; maximum fills center. 600x360 is not a universal rule.'
dim['realZoomEvidence']='validation/r2/zoom/100.json, 125.json, 150.json'
dim['pngGeometryEvidence']='validation/r2/geometry-readback.json'
write('spec/dimension-contract.json',dim)
crops=read('spec/node-crop-manifest.json')
for node in crops:
    for crop in node['crops']:
        crop['overlayMasksCss']['normalPanel']='Content tier and actual export geometry; no universal 1080x780 mask'
    node['r2Note']='Source pixels, focal and cover calculations unchanged. Ordinary overlay varies by content; see dimension-contract and per-export rects.'
write('spec/node-crop-manifest.json',crops)
write('validation/r2/export-inventory.json',{'kind':'ACTUAL_R2_AUTHORING_EXPORT_FILES','count':len(exports),'records':[{'file':p.relative_to(ROOT).as_posix(),'screen':j['screen'],'viewport':j['viewport'],'pngSha256':digest(p.with_suffix('.png')),'svgSha256':digest(ROOT/'editable/screens'/p.with_suffix('.svg').name),'missing':j['missing']} for p,j in exports]})
print(json.dumps({'screens':len(screens),'assets':len(assets),'exports':len(exports)}))
