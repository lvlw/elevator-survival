"""Build two offline design deliverables outside the repository; verify every ZIP byte."""
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
metadata={'status':'REVIEW_CANDIDATE / QA_BLOCKED / INCOMPLETE_ART','baseline':'6bb43c8861b7c3dd21499211fdb0e646e48bba20','branch':'feature/design-ui-v1-001','limits':['Native large-background DPR2 insufficient','Actual browser zoom 125/150 NOT VERIFIED','DOM export border-image differs from browser'],'outerHashPolicy':'Outer ZIP SHA-256 is in repository delivery-packages.json and final delivery report; it cannot be embedded into itself.'}
allfiles={p.relative_to(ROOT).as_posix():p for p in ROOT.rglob('*') if p.is_file() and not p.name.startswith('wip-') and '__pycache__' not in p.parts}
reports=[]
for kind in ['OWNER-REVIEW','SOURCE-ASSETS']:
    name=f'WORLD-UI-DESIGN-001-{kind}-v1.0.zip'
    payload={k:p.read_bytes() for k,p in allfiles.items() if kind=='OWNER-REVIEW' or not k.startswith('previews/')}
    payload['spec/delivery-packages.json']=encode(metadata)
    if kind=='OWNER-REVIEW':
        index='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=previews/index.html"><title>电梯求生 UI审阅</title><a href="previews/index.html">打开全部图稿与点击原型</a></html>'
    else:
        index='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>电梯求生 可编辑源与素材</title><style>body{background:#101b21;color:#eee;font:16px/1.8 sans-serif;max-width:1200px;margin:40px auto;padding:20px}a{color:#d6b981}li{margin:5px}</style><h1>可编辑母版与独立素材</h1><p>QA blocked / INCOMPLETE_ART。原图像素不插值；背景DPR2不足。静态PNG审阅另见OWNER-REVIEW包；两包相同路径可合并。此包的Markdown引用预览时需要审阅包对应文件。</p><p><a href="prototype/index.html">离线点击与动效母版</a> · <a href="spec/asset-manifest.json">素材尺寸与摘要</a> · <a href="spec/registered-art.json">角色锚点</a></p><h2>独立原图</h2><ul>'+''.join(f'<li><a href="{k}">{k}</a></li>' for k in payload if k.startswith('editable/assets/') and k.endswith('.png'))+'</ul><h2>可编辑组件SVG</h2><ul>'+''.join(f'<li><a href="{k}">{k}</a></li>' for k in payload if k.startswith('editable/screens/') and k.endswith('.svg'))+'</ul></html>'
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
    report={'kind':kind,'path':str(target),'filename':name,'bytes':target.stat().st_size,'sha256':digest(target.read_bytes()),'payloadFiles':len(payload),'verification':'EXACT_BYTES_AND_ZIP_CRC_PASS','generatedEntries':['index.html','MANIFEST.json','SHA256SUMS.txt','spec/delivery-packages.json'],'sourcePolicy':'Other entries are exact design-directory bytes at packaging; SOURCE-ASSETS omits preview rasters, available in OWNER-REVIEW.'}
    reports.append(report)
    print(json.dumps(report,ensure_ascii=False),flush=True)
(ROOT/'spec/delivery-packages.json').write_bytes(encode({'status':metadata['status'],'packages':reports}))
