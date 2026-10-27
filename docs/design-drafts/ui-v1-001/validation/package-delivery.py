"""Build two full deliverables and a focus evidence ZIP; verify every ZIP byte."""
from pathlib import Path
import argparse, hashlib, json, zipfile

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('output_directory')
args=parser.parse_args()
OUT=Path(args.output_directory).resolve()
if OUT==ROOT or ROOT in OUT.parents:raise SystemExit('ZIP outputs must be outside design source')
OUT.mkdir(parents=True,exist_ok=True)
def digest(b):return hashlib.sha256(b).hexdigest()
def encode(x):return (json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
metadata={'status':'R1_REVIEW_CANDIDATE / INCOMPLETE_ART','baseline':'d7d395ea7c061e26f9244fcfd296c764785af16a','branch':'feature/design-ui-v1-001','limits':['Native large-background DPR2 insufficient','Residual alpha remains','File protocol opening NOT VERIFIED','Browser is visual authority; PNG scrollbar/antialiasing differs locally'],'actualZoom':'Owner set Edge 100/125/150%; DOM/DPR and actual controls observed; restored100','outerHashPolicy':'Outer ZIP SHA-256 is in repository delivery-packages.json and final delivery report; it cannot be embedded into itself.'}
allfiles={p.relative_to(ROOT).as_posix():p for p in ROOT.rglob('*') if p.is_file() and not p.name.startswith('wip-') and '__pycache__' not in p.parts}
reports=[]
for kind in ['OWNER-REVIEW','SOURCE-ASSETS','FOCUS-REVIEW']:
    name=f'WORLD-UI-DESIGN-001-{kind}-v1.1.zip'
    if kind=='FOCUS-REVIEW':
        selected=[k for k in allfiles if k.startswith(('validation/r1/edge/','validation/r1/before/')) or k in ['validation/r1/edge-browser.json','validation/r1/before-browser.json','validation/r1/zoom-results.json','validation/r1/nine-slice-comparison.json','validation/r1/nine-slice-corner-comparison.png','reviews/OWNER-modal-size-followup.md','previews/screens/P10-inventory-2552x908.png']]
        payload={k:allfiles[k].read_bytes() for k in selected}
    else:
        payload={k:p.read_bytes() for k,p in allfiles.items() if kind=='OWNER-REVIEW' or not k.startswith('previews/')}
    payload['spec/delivery-packages.json']=encode(metadata)
    if kind=='OWNER-REVIEW':
        index='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=previews/index.html"><title>电梯求生 UI审阅</title><a href="previews/index.html">打开全部图稿与点击原型</a></html>'
    elif kind=='SOURCE-ASSETS':
        index='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>电梯求生 可编辑源与素材</title><style>body{background:#101b21;color:#eee;font:16px/1.8 sans-serif;max-width:1200px;margin:40px auto;padding:20px}a{color:#d6b981}li{margin:5px}</style><h1>可编辑母版与独立素材</h1><p>QA blocked / INCOMPLETE_ART。原图像素不插值；背景DPR2不足。静态PNG审阅另见OWNER-REVIEW包；两包相同路径可合并。此包的Markdown引用预览时需要审阅包对应文件。</p><p><a href="prototype/index.html">离线点击与动效母版</a> · <a href="spec/asset-manifest.json">素材尺寸与摘要</a> · <a href="spec/registered-art.json">角色锚点</a></p><h2>独立原图</h2><ul>'+''.join(f'<li><a href="{k}">{k}</a></li>' for k in payload if k.startswith('editable/assets/') and k.endswith('.png'))+'</ul><h2>可编辑组件SVG</h2><ul>'+''.join(f'<li><a href="{k}">{k}</a></li>' for k in payload if k.startswith('editable/screens/') and k.endswith('.svg'))+'</ul></html>'
    else:
        images=sorted(k for k in payload if k.endswith(('.jpg','.png')))
        index='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R1重点实际截图</title><style>body{background:#101b21;color:#eee;font:16px/1.7 sans-serif;margin:24px}img{max-width:100%;height:auto}a{color:#d6b981}figure{margin:24px 0}</style><h1>R1重点审阅：修前与修后</h1><p>实际浏览器截图；不是生产截图。01–03初选出发，04五图，09–14对象，15支付，16三敌退却，17–20战斗，22九宫格，23–32真实缩放，33–36终局查看，38组件确认修前、39–40修后。before目录保留修前证据。21号是视口模拟截图，不当作全帧可见证明。</p><p>INCOMPLETE_ART：原生2×与透明清稿仍缺；file实开未核验。九宫格浏览器为权威，PNG局部滚动条不同。本轻量包不替代两个完整ZIP，不含profile或玩家存档。</p>'+''.join(f'<figure><figcaption>{k}</figcaption><a href="{k}"><img loading="lazy" src="{k}" alt="{k}"></a></figure>' for k in images)+'</html>'
    payload['index.html']=index.encode('utf-8')
    rows=[{'path':k,'bytes':len(v),'sha256':digest(v)} for k,v in sorted(payload.items())]
    payload['MANIFEST.json']=encode({**metadata,'kind':kind,'files':rows})
    payload['SHA256SUMS.txt']=(''.join(f'{digest(v)}  {k}\n' for k,v in sorted(payload.items()))).encode('utf-8')
    target=OUT/name
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for k,v in sorted(payload.items()):z.writestr(k,v)
    with zipfile.ZipFile(target) as z:
        assert set(z.namelist())==set(payload)
        assert z.testzip() is None
        for k,v in payload.items():assert z.read(k)==v,k
    report={'kind':kind,'path':str(target),'filename':name,'bytes':target.stat().st_size,'sha256':digest(target.read_bytes()),'payloadFiles':len(payload),'verification':'EXACT_BYTES_AND_ZIP_CRC_PASS','generatedEntries':['index.html','MANIFEST.json','SHA256SUMS.txt','spec/delivery-packages.json'],'sourcePolicy':'Other entries are exact design-directory bytes at packaging; SOURCE-ASSETS omits previews available in OWNER-REVIEW; FOCUS-REVIEW contains selected actual evidence and cannot replace either full package.'}
    reports.append(report)
    print(json.dumps(report,ensure_ascii=False),flush=True)
(ROOT/'spec/delivery-packages.json').write_bytes(encode({'status':metadata['status'],'packages':reports}))
