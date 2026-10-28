"""Read-only asset measurements and diagnostic mattes, never an asset upscale/cleanup."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, math

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'validation/r2/asset-inspection'
OUT.mkdir(parents=True, exist_ok=True)
assets = json.loads((ROOT/'spec/asset-manifest.json').read_text('utf-8'))
registered = json.loads((ROOT/'spec/registered-art.json').read_text('utf-8'))
scene = Image.open(ROOT/'editable/assets/bg_isolation_corridor_v01.png').convert('RGB')
rows = []
for index, asset in enumerate(assets):
    path = ROOT/asset['file']
    im = Image.open(path).convert('RGBA')
    alpha = im.getchannel('A')
    hist = alpha.histogram()
    w, h = im.size
    perimeter = sum(sum(alpha.crop(box).histogram()[1:]) for box in
                    [(0,0,w,8),(0,h-8,w,h),(0,8,8,h-8),(w-8,8,w,h-8)])
    slot = asset.get('cssSlots',{}).get('max')
    ratio = (min(w/slot[0], h/slot[1]) if asset['fit']=='cover' else max(w/slot[0], h/slot[1])) if slot else None
    row = {'id':asset['id'], 'path':asset['file'], 'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
           'native':[w,h], 'maxCssSlot':slot, 'fit':asset['fit'], 'effectiveDpr':ratio,
           'native2xArithmetic':ratio>=2 if ratio is not None else 'AWAIT_CURRENT_SLOT_MEASUREMENT', 'alphaNonOpaque':sum(hist[:255]),
           'alpha1Pixels':hist[1], 'outer8Nonzero':perimeter,
           'alphaBBox':alpha.getbbox(), 'registration':registered.get(path.name),
           'board':f'board-{index//4+1:02}.jpg', 'row':index%4+1,
           'visualVerdict':'PENDING_AUTHOR_REVIEW',
           'limits':'Alpha counts are diagnostics, not automatic defect thresholds. Opaque background perimeter is expected.'}
    rows.append(row)
    if index%4==0:
        board=Image.new('RGB',(1800,1440),'#20282d'); draw=ImageDraw.Draw(board)
    y0=(index%4)*360
    for j,kind in enumerate(['black','white','checker','scene']):
        tile=Image.new('RGB',(450,320),'black' if j==0 else 'white')
        if j==2:
            td=ImageDraw.Draw(tile)
            for yy in range(0,320,20):
                for xx in range(0,450,20):
                    td.rectangle((xx,yy,xx+19,yy+19),fill='#777777' if (xx//20+yy//20)%2 else '#bbbbbb')
        if j==3:
            tile=scene.resize((450,320),Image.Resampling.LANCZOS)
        thumb=im.copy();thumb.thumbnail((430,300),Image.Resampling.LANCZOS)
        tile.paste(thumb,((450-thumb.width)//2,(320-thumb.height)//2),thumb)
        board.paste(tile,(j*450,y0+40))
        draw.text((j*450+8,y0+8),f'{path.name} / {kind}',fill='white')
    if index%4==3 or index==len(assets)-1:
        board.save(OUT/row['board'],quality=96,subsampling=0)
(OUT/'measurements.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps({'assets':len(rows),'backgroundsBelow2x':[r['id'] for r in rows if r['fit']=='cover' and not r['native2xArithmetic']], 'boards':math.ceil(len(rows)/4)}))
