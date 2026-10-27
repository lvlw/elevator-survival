"""Build offline design indexes and inventory from the actual authored files."""
from pathlib import Path
from PIL import Image
import json, hashlib, html

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'spec/screens-and-content.json').read_text('utf-8'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,text): (ROOT/p).write_text(text,'utf-8')
def dump(p,x): write(p,json.dumps(x,ensure_ascii=False,indent=2)+'\n')
FOCALS={'H3':[.23,.42],'H7':[.8,.42],'T1':[.88,.45],'P1':[.66,.45],'L0':[.5,.5],'L1':[.16,.45],'L5':[.88,.45],'C4':[.77,.45],'C5':[.85,.45]}
SLOTS=[[1920,1080,1200,888,51],[1600,900,968,728,44],[1440,900,856,744,43],[1366,768,814,620,40],[1280,720,768,584,37]]
assets=[]
for p in sorted((ROOT/'editable/assets').glob('*.png')):
 im=Image.open(p);w,h=im.size
 meta=p.with_suffix('.meta.json')
 related=[k for k,v in DATA['nodes'].items() if v[2]==p.name]
 items=[v[0] for v in DATA['items'].values() if v[1]==p.name]
 category='background' if p.name.startswith('bg') else 'character' if p.name.startswith(('enemy','npc','player')) else 'frame' if p.name.startswith('panel') else 'fx' if p.name.startswith('fx') else 'closeup' if p.name.startswith(('closeup','event','objective')) else 'item'
 bbox=im.getchannel('A').getbbox() if 'A' in im.getbands() else None
 a={'id':p.stem,'file':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p),'sourcePixels':[w,h],'alpha':'A' in im.getbands(),'alphaBBox':bbox,'category':category,'formalNodes':related,'formalItems':items,'fit':'cover' if category=='background' else 'contain','source':meta.relative_to(ROOT).as_posix() if meta.exists() else 'baseline project asset; byte identity checked against Git','license':'Project baseline or built-in image generation. No third-party/font license expansion asserted.','version':'v1 design candidate; original v01/v02 names retained','publicCondition':'Only when the corresponding public current content is known; never reveals hidden future content','exports':{'originalPixels':True,'resampled':False,'targetDpr':2},'safeZone':'Background focal/crop per binding; raster alpha untouched; item wrappers contain within slot','anchor':('spec/registered-art.json' if category=='character' and not p.name.startswith('npc') else None),'nineSlice':{'sourceInsets':[48,48,48,48],'cssCorner':24,'scale':2} if category=='frame' else None}
 if category=='item': a['cssSlots']={'min':[34,34],'baseline':[51,51],'detailMax':[256,256] if w==512 else [512,512]}
 elif category=='background': a['cssSlots']={'min':[768,584],'baseline':[1200,888],'max':[1200,888]}
 elif category=='character':a['cssSlots']={'arenaHeight':[328,452,560],'canvasAspect':'4:5','transform':'Non-destructive registered canvas; do not trim per phase'}
 assets.append(a)
dump('spec/asset-manifest.json',assets)
bindings=[]
for k,v in DATA['nodes'].items():
 p=ROOT/'editable/assets'/v[2];w,h=Image.open(p).size;f=FOCALS.get(k,[.5,.42]);crops=[]
 for vw,vh,c,b,cell in SLOTS:
  scale=max(c/w,b/h);vis=[c/scale,b/scale]
  crops.append({'viewport':[vw,vh],'cssSlot':[c,b],'coverScale':scale,'visibleSource':vis,'sourceOffset':[(w-vis[0])*f[0],(h-vis[1])*f[1]],'lossFraction':[1-vis[0]/w,1-vis[1]/h],'effectiveSourcePixelsPerCss':1/scale,'dpr2Pass':scale*2<=1,'overlayMasksCss':{'title':[24,24,c-48,90],'actions':[24,b-225,c-48,201],'normalPanel':[min(1080,c-32),min(780,b-32)]}})
 bindings.append({'node':k,'region':v[0],'name':v[1],'asset':v[2],'focal':f,'fit':'cover','crops':crops,'meaning':'Art mapping only; neither gameplay ID nor navigation knowledge'})
dump('spec/node-crop-manifest.json',bindings)
screens=[]
for s in DATA['screens']:
 p=ROOT/'previews/screens'/f"{s['id']}-1920x1080.png"
 screens.append({**s,'viewport':[1920,1080],'provenance':'HAND_AUTHORED_DESIGN_SAMPLE from approved semantics; not a production snapshot or test fixture','preview':p.relative_to(ROOT).as_posix(),'editable':f"editable/screens/{s['id']}-1920x1080.svg",'master':'prototype/index.html + screens.js + ui.js + ui.css','normalOrMax':'max' if s.get('max') or s['kind']=='setup' else 'normal','interaction':f"prototype/index.html?screen={s['id']}",'assetVersions':'spec/asset-manifest.json; per-export actual image list in geometry records','limits':['No gameplay, persistence, real CTB, or correctness simulation','Resolution limitations in node-crop-manifest; browser DOM export, not production screenshot'],'sha256':sha(p) if p.exists() else None})
dump('spec/screen-manifest.json',screens)
style='body{margin:0;background:#0b141a;color:#e5e4da;font:16px/1.6 "Microsoft YaHei",sans-serif}main{max-width:1400px;margin:auto;padding:40px}a{color:#d8bc83}h1{letter-spacing:3px}nav{display:flex;flex-wrap:wrap;gap:16px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0;background:#14232b;border:1px solid #405157;padding:12px}img{width:100%;height:auto}figcaption{margin-top:8px}.warning{border-left:3px solid #d2aa69;padding:14px;background:#243036}small{color:#a0b3b8}@media(max-width:800px){.grid{grid-template-columns:1fr}main{padding:18px}}'
cards=''.join(f'<figure id="{s["id"]}"><a href="{s["preview"]}"><img loading="lazy" src="{s["preview"]}" alt="{html.escape(s["title"])}"></a><figcaption>{s["id"]} · {html.escape(s["title"])}<br><a href="{s["interaction"]}">点击原型</a> · <a href="{s["editable"]}">SVG组件导出</a><br><small>1920×1080 · 独立设计样例</small></figcaption></figure>' for s in screens)
page=f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>电梯求生 · 第一版UI审阅</title><style>{style}</style><main><p>WORLD-UI-DESIGN-001 / DESIGN REVIEW CANDIDATE</p><h1>外围常驻，中央展开。</h1><p>25个页面族 · {len(screens)}个独立状态 · 五图 / 三敌 / 真实6×4背包。</p><p class="warning">本包为设计仿真；不读取或写入玩家记录。背景原生1672×941未满足大舞台DPR2，不能标为生产美术验收通过。连续CTB演出与敌人素材安全映射仍需后续接口审定。</p><nav><a href="prototype/index.html">打开点击与动效原型</a><a href="previews/asset-gallery.html">当前内容美术册</a><a href="00-owner-review.md">Owner审阅说明</a><a href="validation/design-qa.md">实际QA记录</a></nav><h2>全部主稿与变体</h2><div class="grid">{cards}</div><p>可编辑母版为原型HTML/CSS/JS与分层SVG。SVG含foreignObject和相对独立图像，推荐浏览器查看；不伪称Figma原生文件。</p></main></html>'
write('previews/index.html',page.replace('href="prototype/','href="../prototype/').replace('href="previews/','href="').replace('src="previews/','src="').replace('href="editable/','href="../editable/').replace('href="00-owner','href="../00-owner').replace('href="validation/','href="../validation/'))
assetcards=''.join(f'<figure><a href="../{a["file"]}"><img loading="lazy" src="../{a["file"]}" alt="{a["id"]}"></a><figcaption>{a["id"]}<br>{a["sourcePixels"]} · {" / ".join(a["formalNodes"]+a["formalItems"])}<br><small>{a["category"]} · 原始像素未放大</small></figcaption></figure>' for a in assets)
write('previews/asset-gallery.html',f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>当前内容美术册</title><style>{style}.grid img{{height:260px;object-fit:contain}}</style><main><a href="index.html">返回全部画面</a><h1>独立素材与当前内容</h1><p>每件原始PNG可独立打开；来源、尺寸、哈希见asset-manifest。角色是外观候选，不授予新规则。</p><div class="grid">{assetcards}</div></main></html>')
rows='\n'.join(f'| {s["id"]} | {s["title"]} | [PNG]({s["preview"]}) / [原型]({s["interaction"]}) |' for s in screens)
write('02-page-state-matrix.md','# 页面与状态矩阵\n\n25个页面族、'+str(len(screens))+'个独立1920母版。均为作者编排的公开状态设计样例，不能串成真实存档轨迹。来源与变体字段见[逐图清单](spec/screen-manifest.json)。\n\n| ID | 状态 | 实际图稿与点击入口 |\n| --- | --- | --- |\n'+rows+'\n\n多视口实测另见[几何记录](validation/responsive-results.json)。SVG导出与HTML组件母版共同提供编辑能力；不是只有底图上的热点。\n')
print(json.dumps({'screens':len(screens),'assets':len(assets),'nodes':len(bindings)},ensure_ascii=False))
