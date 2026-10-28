"""Independent raster readback: native JPEG versus exported PNG, no DOM-as-PNG assertion."""
from pathlib import Path
from PIL import Image
import numpy as np
import json, hashlib

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'validation/r2'

def match(native, exported, x, y, radius=5, size=24):
    x,y=int(round(x)),int(round(y))
    template=native[y:y+size,x:x+size].astype(np.float32)
    if template.shape!=(size,size,3) or template.std()<2:
        return {'status':'NOT_MEASURABLE_FLAT_OR_OUTSIDE'}
    best=None
    for dy in range(-radius,radius+1):
        for dx in range(-radius,radius+1):
            patch=exported[y+dy:y+dy+size,x+dx:x+dx+size]
            if patch.shape!=template.shape:continue
            error=float(np.abs(template-patch.astype(np.float32)).mean())
            if best is None or error<best['meanAbsoluteRgbError']:
                best={'dx':dx,'dy':dy,'meanAbsoluteRgbError':error,'nativePoint':[x,y],'pngPoint':[x+dx,y+dy]}
    best['status']='WITHIN_1_CSS_PX' if max(abs(best['dx']),abs(best['dy']))<=1 else 'GEOMETRY_DIFFERENCE'
    return best

results=[]
for sid in ['P10-inventory','P07-lin','P12-bandage','P06-sample-cautious','P15-orderly','P10-detail-sample','P06-power-result']:
    npth=OUT/'after'/f'{sid}-native.jpg'
    pp=ROOT/'previews/screens'/f'{sid}-2552x908.png'
    gp=pp.with_suffix('.json')
    if not all(p.exists() for p in [npth,pp,gp]):
        results.append({'id':sid,'status':'AWAIT_NATIVE_OR_EXPORT'});continue
    geo=json.loads(gp.read_text('utf-8'));shell=next(r for r in geo['rects'] if r and r['selector']=='.shell')
    native=Image.open(npth).convert('RGB');exported=Image.open(pp).convert('RGB')
    assert native.size==tuple(geo['viewport']) and geo['pixelRatio']==1
    crop=(round(shell['x']),round(shell['y']),round(shell['x']+shell['w']),round(shell['y']+shell['h']))
    native=native.crop(crop)
    assert native.size==exported.size
    na,ex=np.array(native),np.array(exported);points=[]
    for r in geo['rects']:
        if not r or r['selector'] not in ['.hud','.panel','.panel .inventory','.right .inventory','.panel-footer','.battle-actions','.arena','.actor.player','.actor.enemy']:continue
        if min(r['w'],r['h'])<28:continue
        x,y=r['x']-shell['x'],r['y']-shell['y']
        positions=[('top-left',x,y),('bottom-right',x+r['w']-24,y+r['h']-24)]
        if r['selector'].startswith('.actor.'):
            positions=[('body',x+r['w']*.48,y+r['h']*.42),('foot',x+r['w']*.48,y+r['h']*.86)]
        for label,px,py in positions:
            points.append({'selector':r['selector'],'anchor':label,**match(na,ex,px,py)})
    results.append({'id':sid,'status':'RASTER_READBACK_COMPLETED','viewport':geo['viewport'],'dpr':geo['pixelRatio'],'nativeCrop':crop,'pngSize':exported.size,
                    'nativeSha256':hashlib.sha256(npth.read_bytes()).hexdigest(),'pngSha256':hashlib.sha256(pp.read_bytes()).hexdigest(),'points':points})
# Reproduce the original large displacement with the original frozen pixels.
before_native=Image.open(OUT/'before/P10-2552-live.jpg').convert('RGB').crop((316,0,2236,908))
before_export=Image.open(OUT/'before/P10-inventory-2552x908.png').convert('RGB')
before=match(np.array(before_native),np.array(before_export),502,257,radius=105)
record={'kind':'RASTER_TEMPLATE_POSITION_COMPARISON_NOT_PIXEL_IDENTITY','rounding':'DOM fractional origins rounded to nearest CSS pixel at DPR1. Tolerance 1px; JPEG/font AA color differences retained.',
        'beforeGrid':before,'after':results,'limits':['Only listed same-state captures/anchors are measured. Flat/invisible anchors are not certified.','Actor body/foot patches check visual registration, not transparent wrapper edges or gameplay hitboxes.']}
(OUT/'geometry-readback.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps(record,ensure_ascii=False))
