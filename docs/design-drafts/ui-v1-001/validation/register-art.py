"""Non-destructive presentation registration. Reads PNG alpha; never rewrites pixels."""
from pathlib import Path
from PIL import Image
import json, hashlib

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'editable/assets'
OUT = ROOT / 'editable/registered'
OUT.mkdir(exist_ok=True)
registered = {}
for path in sorted(ASSETS.glob('*.png')):
    if not (path.name.startswith('enemy') or path.name.startswith('player-back')):
        continue
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    meta_path = path.with_suffix('.meta.json')
    meta = json.loads(meta_path.read_text('utf-8')) if meta_path.exists() else {}
    anchors = meta.get('registrationAnchors', {})
    if 'footSupportCenter' in anchors:
        foot = anchors['footSupportCenter']['pixels']
        hit = anchors['torsoHit']['pixels']
        method = 'Explicit asset-author registration anchor'
    elif path.name.startswith('player'):
        foot = meta['anchors']['footContactMidpointVisualEstimate']['pixels']
        hit = meta['anchors']['backHitCandidate']['pixels']
        method = 'Explicit player-author visual anchor'
    else:
        # Legacy five-stage art: only inspect lower silhouette, not auto-trim it.
        alpha = im.getchannel('A')
        contacts = []
        for left, right in [(0,w//2),(w//2,w)]:
            found = False
            for y in range(h-1,int(h*.65),-1):
                xs = [x for x in range(left,right) if alpha.getpixel((x,y)) >= 128]
                if xs:
                    contacts.append([sum(xs)/len(xs),y]);found=True;break
            if not found:
                contacts.append([w/2,h*.92])
        foot = [sum(c[0] for c in contacts)/2,sum(c[1] for c in contacts)/2]
        hit = [w*.54,h*.42]
        method = 'Legacy alpha>=128 lower left/right support sample midpoint; visual QA required'
    scale = 1.25 if w>1100 else 1.35
    x, y = 768-foot[0]*scale, 1766.4-foot[1]*scale
    hit_norm = [(x+hit[0]*scale)/1536,(y+hit[1]*scale)/1920]
    data={'file':path.name,'source':[w,h],'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
          'canvas':[1536,1920],'scale':scale,'translate':[x,y],'sourceFoot':foot,'sourceHit':hit,
          'footNormalized':[.5,.92],'hitNormalized':hit_norm,'registrationMethod':method,
          'imageCss':{'left':100*x/1536,'top':100*y/1920,'width':100*w*scale/1536},
          'motionEnvelopeCss':{'x':9,'y':-3,'rotationDegrees':2},
          'pixelRewrite':False,'note':'Shared canvas and support center aligned; natural limb positions may differ between poses.'}
    registered[path.name]=data
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1536" height="1920" viewBox="0 0 1536 1920">
<title>{path.stem} — non-destructive registered master</title>
<g id="original-raster" transform="translate({x} {y}) scale({scale})"><image xlink:href="../assets/{path.name}" width="{w}" height="{h}"/></g>
<g id="registration-guides" visibility="hidden"><circle cx="768" cy="1766.4" r="12" fill="gold"/><circle cx="{hit_norm[0]*1536}" cy="{hit_norm[1]*1920}" r="12" fill="cyan"/></g>
</svg>\n'''
    (OUT/(path.stem+'.svg')).write_text(svg,'utf-8')
(ROOT/'spec/registered-art.json').write_text(json.dumps(registered,ensure_ascii=False,indent=2)+'\n','utf-8')
(ROOT/'prototype/registered-art.js').write_text('const REGISTERED='+json.dumps(registered,ensure_ascii=False,separators=(',',':'))+';\n','utf-8')
print(json.dumps({'registered':len(registered),'rawPixelsModified':False}))
