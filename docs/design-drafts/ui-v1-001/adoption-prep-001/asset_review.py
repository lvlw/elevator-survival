"""TEST-only fixed-Git-byte inventory and derived review; never edits historical art."""
from __future__ import annotations
import argparse, copy, difflib, hashlib, io, json, math, os, posixpath, re
import struct, subprocess, xml.etree.ElementTree as ET, zlib
from functools import lru_cache
from pathlib import Path, PurePosixPath
from PIL import Image, ImageDraw, ImageFont, ImageOps

BASE = '8c962f90d9e4ef01ab46a5fc4b970d93c7c45c96'
BASE_TREE = 'd4d653f170159ca6f467b7590f0ea8d1dbdc3eeb'
SRC_TREE = '4e4c3997b748c6ede9252651f8914d62767ff1a7'
PREFIX = 'docs/design-drafts/ui-v1-001/adoption-prep-001/'
DESIGN = 'docs/design-drafts/ui-v1-001/'
CATALOG = DESIGN + 'readiness-001/theme/catalog.json'
REGISTRATION = DESIGN + 'spec/registered-art.json'
BINDINGS = 'docs/engineering/world-integration/presentation-prep-001/ASSET-BINDING-CANDIDATE.json'
STAGES = ['healthy', 'wounded', 'severely-wounded', 'critical', 'incapacitated']
NAMES = {'infected-orderly': '感染护工', 'infected-porter': '感染装卸工', 'infected-technician': '感染技术员'}
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]

def sha(raw): return hashlib.sha256(raw).hexdigest()

def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

def git(repo, *args): return subprocess.check_output(['git', *args], cwd=repo)

@lru_cache(maxsize=128)
def blob(repo, path): return git(repo, 'cat-file', 'blob', BASE + ':' + path)

def canonical_path(root, relative, allowed):
    """Reject lexical escape and all reparse points before opening any file."""
    if not isinstance(relative, str) or '\\' in relative or ':' in relative or '\0' in relative:
        raise ValueError('unsafe path')
    p = PurePosixPath(relative)
    if p.is_absolute() or relative != p.as_posix() or any(x in ('.', '..') for x in p.parts):
        raise ValueError('path escape')
    if relative not in allowed: raise ValueError('path not allowlisted')
    candidate = root
    for part in p.parts:
        candidate = candidate / part
        info = candidate.lstat()
        if candidate.is_symlink() or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError('symlink/reparse point')
    if not candidate.resolve().is_relative_to(root.resolve()): raise ValueError('resolved escape')
    if not candidate.is_file(): raise ValueError('not a regular file')
    return candidate

@lru_cache(maxsize=96)
def png_info(raw):
    if raw[:8] != b'\x89PNG\r\n\x1a\n': raise ValueError('not PNG')
    offset = 8; ended = False
    while offset < len(raw):
        if offset + 12 > len(raw): raise ValueError('truncated PNG')
        n = struct.unpack('>I', raw[offset:offset+4])[0]
        tag = raw[offset+4:offset+8]; data = raw[offset+8:offset+8+n]
        end = offset + 12 + n
        if end > len(raw) or zlib.crc32(tag + data) & 0xffffffff != struct.unpack('>I', raw[end-4:end])[0]:
            raise ValueError('PNG CRC')
        offset = end
        if tag == b'IEND': ended = True; break
    if not ended or offset != len(raw): raise ValueError('PNG end/trailing bytes')
    with Image.open(io.BytesIO(raw)) as image:
        image.load(); rgba = image.convert('RGBA'); alpha = rgba.getchannel('A'); hist = alpha.histogram()
        bounds = {}
        for threshold in (1, 8, 32, 128, 254):
            b = alpha.point([255 if i >= threshold else 0 for i in range(256)]).getbbox()
            bounds[str(threshold)] = list(b) if b else None
        outer = sum(hist[1:]) - sum(alpha.crop((8, 8, image.width-8, image.height-8)).histogram()[1:])
        return {'format': image.format, 'nativePixels': list(image.size), 'mode': image.mode,
                'bands': list(image.getbands()), 'alphaCapability': 'A' in image.getbands(),
                'pngColorType': raw[25], 'chunkCRC': 'PASS', 'alphaBoundsByThreshold': bounds,
                'alpha1Pixels': hist[1], 'partialAlphaPixels': sum(hist[1:255]),
                'outer8Nontransparent': outer, 'colorProfile': 'ICC_PRESENT' if image.info.get('icc_profile') else 'sRGB_ASSUMED_UNTAGGED'}

def svg_info(raw, path, allowed_rasters):
    if b'<!' in raw: raise ValueError('SVG declarations/entities forbidden')
    root = ET.fromstring(raw)
    allowed_tags = {'svg', 'title', 'g', 'image', 'circle'}
    attrs = {'svg': {'width', 'height', 'viewBox'}, 'title': set(),
             'g': {'id', 'transform', 'visibility'}, 'image': {'href', 'width', 'height'},
             'circle': {'cx', 'cy', 'r', 'fill'}}
    references = []; images = []; groups = []
    for node in root.iter():
        tag = node.tag.rsplit('}', 1)[-1]
        if node.tag != '{http://www.w3.org/2000/svg}' + tag or tag not in allowed_tags:
            raise ValueError('SVG script/foreign element')
        for name, value in node.attrib.items():
            local = name.rsplit('}', 1)[-1]
            if local not in attrs[tag] or name.startswith('{') and name != '{http://www.w3.org/1999/xlink}href':
                raise ValueError('SVG active/unknown attribute')
            if local == 'href':
                if any(x in value for x in ('\\', ':', '?', '#', '\0')) or value.startswith('/'):
                    raise ValueError('SVG external reference')
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(path), value))
                if resolved not in allowed_rasters: raise ValueError('SVG reference outside raster closure')
                references.append({'href': value, 'repositoryPath': resolved})
        if tag == 'image': images.append(node.attrib)
        if tag == 'g' and node.attrib.get('id') == 'original-raster': groups.append(node.attrib)
    if root.tag != '{http://www.w3.org/2000/svg}svg' or len(images) != 1 or len(references) != 1 or len(groups) != 1:
        raise ValueError('SVG wrapper shape')
    if [root.get('width'), root.get('height'), root.get('viewBox')] != ['1536', '1920', '0 0 1536 1920']:
        raise ValueError('SVG registration canvas')
    number=r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?'
    match=re.fullmatch(r'translate\(('+number+r')\s+('+number+r')\) scale\(('+number+r')\)',groups[0]['transform'])
    if not match or not all(math.isfinite(float(x)) for x in match.groups()) or float(match[3])<=0:
        raise ValueError('SVG invalid/nonfinite registration transform')
    return {'format': 'SVG', 'registeredCanvas': [1536, 1920], 'nativePixels': None,
            'references': references, 'imageAttributes': images[0], 'groupTransform': groups[0]['transform'],
            'parsedTransform': {'translate':[float(match[1]),float(match[2])],'scale':float(match[3])},
            'security': 'PASS_CLOSED_REGISTERED_WRAPPER_ONLY', 'native2x': 'NOT_PROVEN_BY_WRAPPER'}

def sources(repo):
    catalog = json.loads(blob(repo, CATALOG)); regs = json.loads(blob(repo, REGISTRATION))
    rows = []
    for old in catalog['resources'] + catalog['vectors']:
        kind = 'raster' if old in catalog['resources'] else 'registeredSVG' if old['path'].endswith('.svg') else 'codeComponent'
        rows.append({'key': old['key'], 'kind': kind, 'repositoryPath': DESIGN + old['path'], 'oldCatalog': old})
    return catalog, regs, rows

def registration_check(reg, row):
    if reg['source'] != row['nativePixels'] or reg['sourceSha256'] != row['sha256'] or reg['canvas'] != [1536, 1920] or reg['pixelRewrite']:
        raise ValueError('registration source mismatch')
    mapped = [(reg['sourceFoot'][i]*reg['scale'] + reg['translate'][i])/reg['canvas'][i] for i in (0, 1)]
    hit = [(reg['sourceHit'][i]*reg['scale'] + reg['translate'][i])/reg['canvas'][i] for i in (0, 1)]
    if any(abs(mapped[i] - [0.5, 0.92][i]) > 1e-10 or abs(hit[i] - reg['hitNormalized'][i]) > 1e-10 for i in (0, 1)):
        raise ValueError('registration anchor mismatch')
    if any(not math.isfinite(x) for x in [reg['scale'], *reg['translate'], *hit]): raise ValueError('nonfinite registration')
    return {'footMapped': mapped, 'hitMapped': hit, 'geometricCheck': 'PASS_NOT_A_VISUAL_JUDGMENT'}

def build(repo, out):
    catalog, regs, expected = sources(repo); rows = []; discrepancies = []
    raster_paths = {x['repositoryPath'] for x in expected if x['kind'] == 'raster'}
    allowed = {x['repositoryPath'] for x in expected}
    for e in expected:
        path = e['repositoryPath']; raw = blob(repo, path); old = e['oldCatalog']
        actual = canonical_path(repo, path, allowed).read_bytes()
        row = {**e, 'sourceCommit': BASE, 'gitBlob': hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(),
               'sha256': sha(raw), 'bytes': len(raw), 'worktree': {'sha256': sha(actual), 'bytes': len(actual),
               'equalsGitBytes': raw == actual, 'eolOnly': raw != actual and raw.replace(b'\r\n', b'\n') == actual.replace(b'\r\n', b'\n')},
               'status': old['status'], 'artApproved': False, 'usage': old.get('category', e['kind']),
               'slots': old.get('slots'), 'reverseDependencies': old.get('dependencies', {'sourceAnchor': old.get('sourceAnchor')})}
        if e['kind'] == 'raster': row.update(png_info(raw))
        elif e['kind'] == 'registeredSVG': row.update(svg_info(raw, path, raster_paths))
        else:
            if old['sourceAnchor'].encode() not in raw: raise ValueError('component anchor missing')
            row.update(format='JavaScript_SOURCE_REFERENCE_ONLY', nativePixels=None, executed=False)
        if old['sha256'] != row['sha256']:
            issue = 'CRLF_CHECKOUT_NOT_GIT_LF' if e['kind'] == 'registeredSVG' and sha(raw.replace(b'\n', b'\r\n')) == old['sha256'] else 'STALE_LOGICAL_COMPONENT_SHARED_SOURCE'
            discrepancies.append({'key': row['key'], 'repositoryPath': path, 'oldSha256': old['sha256'],
                                  'proposedSha256': row['sha256'], 'gitBlob': row['gitBlob'], 'issue': issue,
                                  'currentWorktree': row['worktree'], 'applied': False})
        rows.append(row)
    by_path = {x['repositoryPath']: x for x in rows}; by_key = {x['key']: x for x in rows}
    bindings = json.loads(blob(repo, BINDINGS))['bindings']; slots = []
    for binding in bindings:
        row = by_path[binding['asset']['path']]; reg = regs[binding['registrationKey']]
        anchor = registration_check(reg, row)
        slots.append({'visualKey': binding['visualKey'], 'name': NAMES[binding['visualKey']],
                      'enemyStage': binding['enemyStage'], 'resourceKey': row['key'], 'repositoryPath': row['repositoryPath'],
                      'sha256': row['sha256'], 'gitBlob': row['gitBlob'], 'nativePixels': row['nativePixels'],
                      'registration': reg, 'anchorCheck': anchor, 'renderability': 'SPEC_SLOT_ONLY_NOT_NATIVE_REACHABILITY',
                      'status': 'REVIEW_CANDIDATE_NOT_ADOPTED'})
    for row in rows:
        reg = regs.get(posixpath.basename(row['repositoryPath']))
        if reg and row['kind'] == 'raster':
            row['registration'] = reg; row['anchorCheck'] = registration_check(reg, row)
            b = row['alphaBoundsByThreshold']['128']; scale = reg['scale']; tx, ty = reg['translate']
            row['registeredSubjectBoundsAlpha128'] = [b[0]*scale+tx, b[1]*scale+ty, b[2]*scale+tx, b[3]*scale+ty]
            row['subjectClipsCanvasAlpha128'] = row['registeredSubjectBoundsAlpha128'][0] < 0 or row['registeredSubjectBoundsAlpha128'][1] < 0 or row['registeredSubjectBoundsAlpha128'][2] > 1536 or row['registeredSubjectBoundsAlpha128'][3] > 1920
    candidate = {'schemaVersion': 1, 'task': 'ART-WORLD-ASSET-ADOPTION-PREP-001', 'sourceCommit': BASE,
                 'sourceTree': BASE_TREE, 'historicalCatalogMetadata': catalog['metadata'],
                 'status': 'REVIEW_CANDIDATE_NOT_ADOPTED', 'counts': {'rasters': 64, 'registeredSVG': 17, 'codeComponents': 5, 'enemyStageReferences': 15, 'uniquePhysicalFiles': len(allowed)},
                 'resources': rows, 'enemyStageSlots': slots,
                 'recommendation': {'status': 'DRAFT_PENDING_PIXEL_REVIEW', 'assetKeys': [x['resourceKey'] for x in slots]+['player-back']}}
    validate(candidate, repo)
    historical = json.loads(blob(repo, 'docs/governance/world-baseline-001/asset-status.json'))
    if {x['key'] for x in discrepancies} != {x['key'] for x in historical['issues']} or len(discrepancies) != 19:
        raise ValueError('historical discrepancies differ; do not force 19')
    text = blob(repo, CATALOG).decode('utf-8'); changed = text
    for old_hash in dict.fromkeys(x['oldSha256'] for x in discrepancies):
        group = [x for x in discrepancies if x['oldSha256'] == old_hash]
        if changed.count(old_hash) != len(group) or len({x['proposedSha256'] for x in group}) != 1: raise ValueError('patch occurrence ambiguity')
        changed = changed.replace(old_hash, group[0]['proposedSha256'])
    if json.loads(changed)['metadata'] != catalog['metadata']: raise ValueError('historical metadata changed')
    patch = ''.join(difflib.unified_diff(text.splitlines(True), changed.splitlines(True), fromfile='a/'+CATALOG, tofile='b/'+CATALOG))
    (out/'catalog-rebind-proposal.patch').write_text(patch, encoding='utf-8', newline='\n')
    save(out/'candidate-bindings.json', candidate)
    save(out/'metadata-discrepancies.json', {'sourceCommit': BASE, 'applied': False, 'count': len(discrepancies),
         'counts': {'svgEOL': sum(x['issue']=='CRLF_CHECKOUT_NOT_GIT_LF' for x in discrepancies), 'logicalCode': 4, 'uniqueStaleCodeFiles': 1},
         'historicalR2BaselinePreserved': catalog['metadata']['baselineSHA'], 'items': discrepancies})
    crops = json.loads(blob(repo, DESIGN+'spec/node-crop-manifest.json'))
    backgrounds = []
    for row in rows:
        if row['usage'] != 'background': continue
        w, h = row['nativePixels']; target = row['oldCatalog']['slots']['baseline']; cover = max(target[0]/w, target[1]/h)
        backgrounds.append({'key': row['key'], 'repositoryPath': row['repositoryPath'], 'sha256': row['sha256'], 'nativePixels': [w,h],
                            'targetCSS': target, 'coverScale': cover, 'nativePixelsPerCSSPixelAfterCover': 1/cover,
                            'currentVisibleSourcePixels': [target[0]/cover, target[1]/cover],
                            'requiredVisiblePixelsAt2x': [2*target[0], 2*target[1]],
                            'requiredUniformFullSourcePixelsAt2x': [math.ceil(w*2*cover), math.ceil(h*2*cover)],
                            'native2x': 'OPEN_INSUFFICIENT', 'nodes': row['oldCatalog']['dependencies']['nodes'],
                            'shared': len(row['oldCatalog']['dependencies']['nodes']) > 1})
    save(out/'background-audit.json', {'sourceCommit': BASE, 'native2xOpenCount': len(backgrounds), 'backgrounds': backgrounds, 'nodeCrops': crops,
         'note': '2x gate uses cover-visible pixels; registered canvas, browser DPR and interpolation add no native detail.'})
    data = {'sourceCommit': BASE, 'historicalBaselineSHA': catalog['metadata']['baselineSHA'], 'slots': slots,
            'resources': [{k:x[k] for k in ('key','kind','repositoryPath','sha256','bytes','nativePixels','usage','status')} | ({'registration': x['registration']} if 'registration' in x else {}) | ({'references':x['references']} if 'references' in x else {}) for x in rows],
            'backgrounds': backgrounds, 'crops': crops}
    save(out/'review-data.json', data)
    return candidate

def validate(candidate, repo):
    if candidate.get('sourceCommit') != BASE or candidate.get('sourceTree') != BASE_TREE: raise ValueError('unfixed source')
    catalog, regs, expected = sources(repo); expected_keys = {x['key']:x for x in expected}
    if candidate.get('historicalCatalogMetadata') != catalog['metadata']: raise ValueError('rewritten historical baseline metadata')
    rows = candidate['resources']; keys = [x['key'] for x in rows]
    if len(keys) != len(set(keys)) or set(keys) != set(expected_keys): raise ValueError('duplicate/missing resource key')
    allowed = {x['repositoryPath'] for x in expected}; rasters = {x['repositoryPath'] for x in expected if x['kind']=='raster'}
    by_key = {}
    for row in rows:
        e = expected_keys[row['key']]; path = row['repositoryPath']
        if row.get('oldCatalog') != e['oldCatalog'] or row.get('sourceCommit') != BASE or row.get('status') != e['oldCatalog']['status']:
            raise ValueError('source metadata/status differs from pinned source')
        canonical_path(repo, path, allowed)
        if path != e['repositoryPath'] or row['kind'] != e['kind']: raise ValueError('resource path/kind mix')
        raw = blob(repo, path)
        if row.get('sha256') != sha(raw) or row.get('bytes') != len(raw): raise ValueError('missing/wrong Git digest or bytes')
        if row.get('gitBlob') != hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(): raise ValueError('wrong blob')
        if row['kind']=='raster':
            info=png_info(raw)
            if any(row.get(k) != v for k,v in info.items()): raise ValueError('wrong native pixels/format/alpha metadata')
        elif row['kind']=='registeredSVG':
            info=svg_info(raw,path,rasters)
            if any(row.get(k)!=v for k,v in info.items()): raise ValueError('wrapper falsely native/rebound or incorrect parsed metadata')
        by_key[row['key']]=row
    slots=candidate['enemyStageSlots']; expected_slots=json.loads(blob(repo,BINDINGS))['bindings']
    if len(slots)!=15 or len({(x['visualKey'],x['enemyStage']) for x in slots})!=15: raise ValueError('duplicate/missing stage slot')
    for visual in NAMES:
        if {x['enemyStage'] for x in slots if x['visualKey']==visual} != set(STAGES): raise ValueError('incomplete stage group')
    for slot in slots:
        e=next((x for x in expected_slots if x['visualKey']==slot['visualKey'] and x['enemyStage']==slot['enemyStage']),None)
        if not e or slot['repositoryPath'] != e['asset']['path'] or slot['resourceKey'] != next(x['key'] for x in expected if x['repositoryPath']==e['asset']['path']): raise ValueError('implicit stage/old-asset mix')
        row=by_key[slot['resourceKey']]
        if any(slot[k]!=row[k] for k in ('sha256','gitBlob','nativePixels','repositoryPath')) or slot['registration']!=regs[e['registrationKey']]: raise ValueError('slot binding mismatch')
        registration_check(slot['registration'],row)
    recommended=candidate['recommendation']['assetKeys']; permitted={x['resourceKey'] for x in slots}|{'player-back'}
    if len(recommended)!=len(set(recommended)) or not set(recommended)<=permitted: raise ValueError('unapproved historical/out-of-scope asset in recommendation')
    for visual in NAMES:
        group={x['resourceKey'] for x in slots if x['visualKey']==visual}; selected=group & set(recommended)
        if selected and selected!=group: raise ValueError('partial recommendation group')
    return {'logicalResources':len(rows),'uniqueFiles':len(allowed),'rasterDecoded':64,'safeRegisteredSVG':17,'enemyStageSlots':15,'result':'PASS_BINDINGS_NOT_ART_APPROVAL'}

def font(size):
    path=Path('C:/Windows/Fonts/msyh.ttc')
    return ImageFont.truetype(str(path),size) if path.exists() else ImageFont.load_default()

def draw_text(image, xy, text, size=14, fill='#dfe5e8'):
    ImageDraw.Draw(image).text(xy,text,font=font(size),fill=fill)

def rgba(repo,row): return Image.open(io.BytesIO(blob(repo,row['repositoryPath']))).convert('RGBA')

def flatten(image, background):
    panel=Image.new('RGBA',image.size,background);panel.alpha_composite(image);return panel.convert('RGB')

def registered(repo,row,size,background,anchors=True):
    reg=row['registration']; w,h=size
    panel=Image.new('RGBA',size,background) if isinstance(background,str) else ImageOps.fit(background.convert('RGBA'),size)
    source=rgba(repo,row);target=(round(source.width*reg['scale']*w/1536),round(source.height*reg['scale']*h/1920))
    source=source.resize(target,Image.Resampling.LANCZOS)
    panel.alpha_composite(source,(round(reg['translate'][0]*w/1536),round(reg['translate'][1]*h/1920)))
    if anchors:
        d=ImageDraw.Draw(panel);x,y=w*.5,h*.92;d.line((x-7,y,x+7,y),fill='gold',width=2);d.line((x,y-7,x,y+7),fill='gold',width=2)
        x,y=reg['hitNormalized'][0]*w,reg['hitNormalized'][1]*h;d.ellipse((x-4,y-4,x+4,y+4),outline='cyan',width=2)
    return panel.convert('RGB')

def derive(repo,out,candidate):
    rows=[x for x in candidate['resources'] if x['kind']=='raster'];by_key={x['key']:x for x in rows}; files=[]
    dest=out/'derived';dest.mkdir(exist_ok=True)
    def emit(name,image,kind,source_keys,metadata=None):
        path=dest/name
        if name.endswith('.png'): image.convert('RGB').save(path,format='PNG',optimize=True)
        else: image.convert('RGB').save(path,format='JPEG',quality=91,subsampling=0)
        files.append({'path':'derived/'+name,'sha256':sha(path.read_bytes()),'bytes':path.stat().st_size,'pixels':list(image.size),
                      'kind':kind,'derived':True,'sourceKeys':source_keys,'sourceCommit':BASE,'metadata':metadata or {},
                      'notNativeArt':True,'notBrowserScreenshot':True})
    for page in range(4):
        subset=rows[page*16:page*16+16];sheet=Image.new('RGB',(1120,1056),'#111b24')
        draw_text(sheet,(12,8),f'DERIVED REVIEW / 64-source overview {page+1}/4 — thumbnails, NOT native art',17)
        for i,row in enumerate(subset):
            x=(i%4)*280;y=42+(i//4)*252
            im=rgba(repo,row);im.thumbnail((268,198),Image.Resampling.LANCZOS);p=Image.new('RGBA',(268,198),'#66717b');p.alpha_composite(im,((268-im.width)//2,(198-im.height)//2));sheet.paste(p.convert('RGB'),(x+6,y))
            draw_text(sheet,(x+6,y+200),row['key'],12);draw_text(sheet,(x+6,y+220),f"{row['nativePixels'][0]}×{row['nativePixels'][1]} · {row['sha256'][:10]}",12)
        emit(f'overview-{page+1}.jpg',sheet,'DERIVED_ALL_SOURCE_OVERVIEW',[x['key'] for x in subset],{'thumbnailOnly':True})
    scene=rgba(repo,by_key['bg-isolation-corridor'])
    for visual,name in NAMES.items():
        slots=[x for x in candidate['enemyStageSlots'] if x['visualKey']==visual];sheet=Image.new('RGB',(1200,1064),'#111b24')
        draw_text(sheet,(12,8),f'DERIVED STATIC — {name} 五态 / light · dark · existing scene',19)
        draw_text(sheet,(12,36),'注册画布展示 240×300；金=脚点 青=命中锚；不是实际战斗/高清源/可达证明',15)
        for i,slot in enumerate(slots):
            row=by_key[slot['resourceKey']]
            for j,bg in enumerate(('#edf0ec','#141b25',scene)):
                sheet.paste(registered(repo,row,(240,300),bg),(i*240,72+j*320))
            draw_text(sheet,(i*240+8,1034),slot['enemyStage'],13)
        emit(f'{visual}-group.jpg',sheet,'DERIVED_FIVE_STAGE_LIGHT_DARK_SCENE',[x['resourceKey'] for x in slots],{'canvasCSS':[240,300],'anchors':'gold foot/cyan hit','backgroundKey':'bg-isolation-corridor'})
    player_sheet=Image.new('RGB',(600,1064),'#111b24')
    draw_text(player_sheet,(10,8),'DERIVED: v1 历史对照 / v2 当前候选，未采用',19)
    draw_text(player_sheet,(10,38),'不是实际游戏；完整注册画布240×300审看比例',14)
    for i,key in enumerate(('player-back-legacy','player-back')):
        row=by_key[key]
        for j,bg in enumerate(('#edf0ec','#141b25',scene)):
            player_sheet.paste(registered(repo,row,(240,300),bg),(i*300+30,72+j*320))
        draw_text(player_sheet,(i*300+10,1033),key,15)
    emit('player-comparison.jpg',player_sheet,'DERIVED_PLAYER_HISTORICAL_COMPARISON',['player-back-legacy','player-back'],{'currentCandidate':'player-back','legacyAdopted':False,'canvasCSS':[240,300]})
    focus=[by_key[x['resourceKey']] for x in candidate['enemyStageSlots']]+[by_key['player-back']]
    edge_rows=[]
    for row in focus:
        im=rgba(repo,row);b=row['alphaBoundsByThreshold']['128'];reg=row['registration']
        mask=im.getchannel('A').point([255 if i>=128 else 0 for i in range(256)])
        head_y=min(b[1]+20,b[3]-1);head_row=mask.crop((0,head_y,im.width,head_y+1)).getbbox()
        foot_y=max(b[1],b[3]-8);foot_line=mask.crop((0,foot_y,im.width,foot_y+1))
        head=[round((head_row[0]+head_row[2])/2),head_y]
        occupied=[i for i,value in enumerate(foot_line.tobytes()) if value]
        foot=[min(occupied,key=lambda i:abs(i-reg['sourceFoot'][0])),foot_y]
        head=[max(48,min(im.width-48,head[0])),max(48,min(im.height-48,head[1]))]
        foot=[max(48,min(im.width-48,foot[0])),max(48,min(im.height-48,foot[1]))]
        sheet=Image.new('RGB',(768,264),'#111b24');draw_text(sheet,(8,6),'DERIVED 2× NEAREST crop / no repair / '+row['key'],16)
        boxes=[]
        for j,point in enumerate((head,foot)):
            box=[point[0]-48,point[1]-48,point[0]+48,point[1]+48];boxes.append(box)
            crop=im.crop(box)
            for k,bg in enumerate(('#edf0ec','#141b25')):
                panel=flatten(crop,bg).resize((192,192),Image.Resampling.NEAREST);sheet.paste(panel,((j*2+k)*192,38))
                draw_text(sheet,((j*2+k)*192+4,234),f"{'头缘' if j==0 else '支撑下缘'} · {'浅底' if k==0 else '深底'}",14)
        filename='edge-'+row['key']+'.png';emit(filename,sheet,'DERIVED_NEAREST_EDGE_CROPS',[row['key']],{'nativeCropBoxes':boxes,'scale':2,'filter':'NEAREST','noAlphaRepair':True,'registrationFootAnchor':reg['sourceFoot'],'cropSelection':'alpha>=128 top+20 and bottom-8 scanlines; visible support edge nearest source foot; crop stays in native canvas'})
        edge_rows.append({'key':row['key'],'sourceSha256':row['sha256'],'sourceCommit':BASE,'nativePixels':row['nativePixels'],'alpha1Pixels':row['alpha1Pixels'],
                          'outer8Nontransparent':row['outer8Nontransparent'],'alphaBoundsByThreshold':row['alphaBoundsByThreshold'],
                          'registeredSubjectBoundsAlpha128':row['registeredSubjectBoundsAlpha128'],'subjectClipsCanvasAlpha128':row['subjectClipsCanvasAlpha128'],
                          'anchorCheck':row['anchorCheck'],'edgeEvidence':'derived/'+filename,'visualJudgment':'PENDING_HUMAN_STYLE_PIXEL_INSPECTION_NOT_SCRIPT_PASS'})
    save(out/'derived-manifest.json',{'sourceCommit':BASE,'warning':'All images in this manifest are labelled derived review composites/crops, never native art or browser evidence.','files':files})
    save(out/'pixel-measurements.json',{'sourceCommit':BASE,'allRasterCount':64,'focusCount':16,'items':edge_rows,'artApproved':False})
    return {'derivedFiles':len(files),'focusRows':len(edge_rows),'bytes':sum(x['bytes'] for x in files)}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['build','validate','derive']);parser.add_argument('--repo',type=Path,default=REPO);args=parser.parse_args()
    if args.command=='build':
        candidate=build(args.repo,HERE);print(json.dumps(validate(candidate,args.repo),ensure_ascii=False))
    else:
        candidate=json.loads((HERE/'candidate-bindings.json').read_text('utf-8'));result=validate(candidate,args.repo)
        if args.command=='derive':result=derive(args.repo,HERE,candidate)
        print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
