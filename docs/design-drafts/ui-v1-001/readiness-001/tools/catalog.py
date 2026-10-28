"""Build metadata from existing design evidence. No source raster is rewritten."""
import base64, hashlib, json, re
from pathlib import Path
from PIL import Image
N=Path(__file__).resolve().parents[1]; D=N.parent
BASE='956da8065030ccea15256e49bd927a4e6a71942f'
def sha(data):return hashlib.sha256(data).hexdigest()
def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def build():
    old=json.loads((D/'spec/asset-manifest.json').read_text('utf-8'))
    regs=json.loads((D/'spec/registered-art.json').read_text('utf-8'))
    crops=json.loads((D/'spec/node-crop-manifest.json').read_text('utf-8'))
    content=json.loads((D/'spec/screens-and-content.json').read_text('utf-8'))
    sources={p.name:p.read_text('utf-8') for p in (D/'prototype').glob('*') if p.suffix in ['.js','.css','.html']}
    resources=[]
    for x in old:
        p=D/x['file'];raw=p.read_bytes();im=Image.open(p);reg=regs.get(p.name)
        key=re.sub(r'[-_]v0?\d+$','',x['id']).replace('_','-')
        if p.name=='player-back-v1.png':key+='-legacy'
        refs=[{'path':'prototype/'+f,'kind':'CSS_URL' if f.endswith('.css') else 'STATIC_OR_JS_MAPPING'} for f,t in sources.items() if p.name in t]
        if reg:refs.append({'path':'prototype/registered-art.js','kind':'REGISTERED_DYNAMIC_ACTOR'})
        if p.name.startswith('enemy-'):refs.append({'path':'prototype/ui.js','kind':'enemyFile_DYNAMIC_GROUP'})
        if p.name=='panel-nine-slice-v1.png':refs.append({'path':'prototype/nine-slice.js','kind':'SVG_IMAGE_HREF_USE_9_REGIONS'})
        observations=x.get('r2ObservedSlots',[]);status='HISTORICAL_ONLY' if p.name=='player-back-v1.png' else 'REVIEW_ONLY'
        resources.append(dict(key=key,path=x['file'],sha256=sha(raw),bytes=len(raw),pixels=list(im.size),format='PNG',alpha='A' in im.getbands(),colorSpace='ICC_PROFILE_PRESENT' if im.info.get('icc_profile') else 'sRGB_assumed_untagged',category=x['category'],status=status,provenance='BASELINE_RASTER_UNCHANGED',legacyId=x['id'],fit=x.get('fit','contain'),slots=x.get('cssSlots'),safeZone=x.get('safeZone'),canvas=reg['canvas'] if reg else list(im.size),foot=reg['footNormalized'] if reg else None,hit=reg['hitNormalized'] if reg else None,motion=reg.get('motionEnvelopeCss') if reg else None,nineSlice={'sourceInsets':[48]*4,'cssInsets':[24]*4} if p.name=='panel-nine-slice-v1.png' else None,publicCondition=x['publicCondition'],dependencies={'nodes':x.get('formalNodes',[]),'items':x.get('formalItems',[]),'families':sorted({o['screen'].split('-')[0] for o in observations}),'references':refs,'observation':status if status=='HISTORICAL_ONLY' else 'R2_OBSERVED' if observations else 'MAPPED_CONDITIONAL_NOT_OBSERVED','crops':[c for c in crops if c['asset']==p.name],'checks':['hash','dimensions','alpha','slots','public-information']+(['anchors','stages','motion'] if reg else [])}))
    vectors=[]
    for p in sorted((D/'editable/registered').glob('*.svg')):
        vectors.append({'key':'registered.'+p.stem,'path':p.relative_to(D).as_posix(),'sha256':sha(p.read_bytes()),'hrefs':re.findall(r'(?:href|xlink:href)="([^"]+)"',p.read_text('utf-8')),'status':'WRAPPER_NOT_NATIVE_2X'})
    for key,anchor in [('map.known','function knownMap'),('status.hud','function shell'),('frame.nine','function mountNineSlice'),('control.action','const btn'),('fx.hit','function actorVisual')]:
        f='prototype/nine-slice.js' if key=='frame.nine' else 'prototype/ui.js'
        vectors.append({'key':key,'path':f,'sourceAnchor':anchor,'sha256':sha((D/f).read_bytes()),'status':'CODE_NATIVE_NOT_RASTER'})
    groups={'bandage':[r['key'] for r in resources if r['path'].endswith('icon_bandage_v02.png')],'porter':[r['key'] for r in resources if '/enemy-porter-' in r['path']],'frame':[r['key'] for r in resources if r['nineSlice']]}
    meta={'schemaVersion':1,'themeId':'r2-baseline','themeVersion':'1.2','compatibility':'R2_PRESENTATION_ONLY','baselineSHA':BASE,'status':'REVIEW_ONLY','source':'asset-manifest + registered-art + crops + prototype; no production state'}
    save(N/'theme/catalog.json',{'metadata':meta,'resources':resources,'groups':groups,'vectors':vectors,'families':sorted({s['family'] for s in content['screens']}),'geometryAuthority':'03-dimension-contract.md and unchanged R2 CSS'})
    for group,keys in groups.items():
        entries=[]
        for key in keys:
            r=next(x for x in resources if x['key']==key);raw=(D/r['path']).read_bytes();w,h=r['pixels']
            svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><title>TEST ONLY {key} cyan tint</title><defs><filter id="t" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.55 0 0 0 0  0 1 0 0 0.08  0 0 1 0 0.1  0 0 0 1 0"/></filter></defs><image width="{w}" height="{h}" filter="url(#t)" href="data:image/png;base64,{base64.b64encode(raw).decode()}"/></svg>\n'
            p=N/'theme/test-assets'/f'{key}-cyan-test.svg';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(svg,encoding='utf-8',newline='\n')
            e={k:r[k] for k in ['key','pixels','alpha','canvas','foot','hit','motion','nineSlice','fit']}
            e.update(path=p.relative_to(D).as_posix(),sha256=sha(p.read_bytes()),format='SVG',status='TEST',sourceSha256=r['sha256'],derivation='Unchanged embedded PNG + reversible feColorMatrix; not native detail or alpha cleanup');entries.append(e)
        save(N/f'theme/{group}-test.json',{'metadata':{**meta,'themeId':group+'-cyan-test','themeVersion':'0.1','status':'TEST'},'group':group,'resources':entries})
    save(N/'theme/coverage.json',{'rasters':len(resources),'vectorsAndComponents':len(vectors),'groups':groups,'categories':['background','closeup','player-npc','enemy-stage','item-equipment-task','frame-control','map-status','fx'],'scan':['IMG export observations','CSS URL','SVG href/use','registered wrappers','JS mapping and enemyFile','shared nine-slice image'],'unobserved':[r['key'] for r in resources if r['dependencies']['observation']=='MAPPED_CONDITIONAL_NOT_OBSERVED']})
    print(json.dumps({'rasters':len(resources),'vectors':len(vectors),'groups':{k:len(v) for k,v in groups.items()}}))
if __name__=='__main__':build()
