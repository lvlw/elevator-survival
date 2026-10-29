"""Closed design theme dialect. Validation is not visual or production approval."""
import base64, copy, hashlib, io, json, math, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath
from PIL import Image
N=Path(__file__).resolve().parents[1];D=N.parent
class Reject(ValueError):pass
def need(ok,code):
    if not ok:raise Reject(code)
def path_check(root,name):
    need(isinstance(name,str) and name and '\\' not in name and ':' not in name and '?' not in name and '#' not in name,'PATH')
    p=PurePosixPath(name);need(not p.is_absolute() and all(x not in ('','.','..') for x in name.split('/')),'PATH')
    out=root/name;need(out.resolve().is_relative_to(root.resolve()) and not out.is_symlink(),'PATH_ESCAPE');return out
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def validate(candidate,catalog=None,root_directory=None):
    cat=catalog or json.loads((N/'theme/catalog.json').read_text('utf-8'))
    need(type(candidate)==dict and set(candidate)=={'metadata','group','resources'},'TOP_FIELDS')
    m=candidate['metadata'];need(type(m)==dict and set(m)==set(cat['metadata']),'METADATA_FIELDS')
    need(type(m['schemaVersion'])==int and m['schemaVersion']==1,'SCHEMA_VERSION')
    need(m['baselineSHA']==cat['metadata']['baselineSHA'] and m['compatibility']=='R2_PRESENTATION_ONLY','COMPATIBILITY');need(m['status']=='TEST','NOT_PRODUCTION_READY')
    group=candidate['group'];need(type(group)==str and group in cat['groups'],'GROUP')
    rr=candidate['resources'];need(type(rr)==list and all(type(r)==dict for r in rr),'RESOURCE_TYPE')
    keys=[r.get('key') for r in rr];need(all(type(k)==str for k in keys),'KEY_TYPE');need(len(keys)==len(set(keys)),'DUPLICATE_KEY');need(set(keys)==set(cat['groups'][group]),'INCOMPLETE_GROUP')
    expected={'key','pixels','alpha','canvas','foot','hit','motion','nineSlice','fit','path','sha256','format','status','sourceSha256','derivation'}
    for r in rr:
        need(set(r)==expected,'RESOURCE_FIELDS');b=next(x for x in cat['resources'] if x['key']==r['key'])
        for k in ['pixels','alpha','canvas','foot','hit','motion','nineSlice','fit']:need(type(r[k])==type(b[k]) and r[k]==b[k],'GEOMETRY_'+k)
        need(r['sourceSha256']==b['sha256'] and r['status']=='TEST' and r['format']=='SVG','PROVENANCE')
        p=path_check(root_directory or D,r['path']);need(p.suffix=='.svg','FORMAT_PATH');need(p.is_file(),'MISSING_FILE');need(digest(p)==r['sha256'],'HASH')
        text=p.read_text('utf-8');need('<!DOCTYPE' not in text and '<!ENTITY' not in text,'SVG_ENTITY')
        try:root=ET.fromstring(text)
        except ET.ParseError:raise Reject('SVG_PARSE')
        allowed={'svg','title','defs','filter','feColorMatrix','image'};images=[];attrs={'width','height','viewBox','id','color-interpolation-filters','type','values','filter','href'}
        for e in root.iter():
            tag=e.tag.split('}')[-1];need(tag in allowed,'SVG_TAG');need(all(k in attrs for k in e.attrib),'SVG_ATTRIBUTE')
            for k,v in e.attrib.items():
                if k=='filter':need(v=='url(#t)','SVG_EXTERNAL')
                if k=='href':need(v.startswith('data:image/png;base64,'),'SVG_EXTERNAL')
            if tag=='image':images.append(e)
        need(root.get('width')==str(b['pixels'][0]) and root.get('height')==str(b['pixels'][1]) and root.get('viewBox')==f"0 0 {b['pixels'][0]} {b['pixels'][1]}",'SVG_DIMENSIONS');need(len(images)==1,'SVG_IMAGE_COUNT')
        need(images[0].get('width')==str(b['pixels'][0]) and images[0].get('height')==str(b['pixels'][1]) and images[0].get('filter')=='url(#t)','SVG_CONTENT_GEOMETRY')
        try:raw=base64.b64decode(images[0].get('href','').split(',')[-1],validate=True);im=Image.open(io.BytesIO(raw));im.load()
        except (ValueError,OSError):raise Reject('EMBEDDED_IMAGE')
        need(hashlib.sha256(raw).hexdigest()==b['sha256'],'EMBEDDED_SOURCE');need(list(im.size)==r['pixels'] and ('A' in im.getbands())==r['alpha'],'DECODE')
        mats=[e for e in root.iter() if e.tag.endswith('feColorMatrix')];need(len(mats)==1,'FILTER_COUNT')
        need(mats[0].get('type')=='matrix','FILTER_TYPE')
        parts=mats[0].get('values','').split()
        need(all(re.fullmatch(r'[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?',v) for v in parts),'FILTER_ALPHA')
        vals=[float(v) for v in parts]
        need(len(vals)==20 and all(math.isfinite(v) and abs(v)<=1 for v in vals) and vals[15:]==[0,0,0,1,0],'FILTER_ALPHA')
    return {'status':'VALID_TEST_ONLY','themeId':m['themeId'],'group':group,'members':len(rr)}
def tests():
    valid=json.loads((N/'theme/porter-test.json').read_text('utf-8'));out=[]
    for group in ['bandage','porter','frame']:out.append({'case':group,'result':validate(json.loads((N/f'theme/{group}-test.json').read_text('utf-8')))})
    cases=[('missing',lambda d:d['resources'][0].update(path='missing.svg'),'MISSING_FILE'),('hash',lambda d:d['resources'][0].update(sha256='0'*64),'HASH'),('dimension',lambda d:d['resources'][0].update(pixels=[1,1]),'GEOMETRY_pixels'),('alpha',lambda d:d['resources'][0].update(alpha=False),'GEOMETRY_alpha'),('anchor',lambda d:d['resources'][0].update(foot=[0,0]),'GEOMETRY_foot'),('duplicate',lambda d:d['resources'].append(d['resources'][0]),'DUPLICATE_KEY'),('schema',lambda d:d['metadata'].update(schemaVersion=2),'SCHEMA_VERSION'),('traversal',lambda d:d['resources'][0].update(path='../outside.svg'),'PATH'),('external',lambda d:d['resources'][0].update(path='https://example.com/a.svg'),'PATH'),('partial',lambda d:d['resources'].pop(),'INCOMPLETE_GROUP'),('gameplay',lambda d:d.update(hp=9),'TOP_FIELDS'),('promotion',lambda d:d['metadata'].update(status='PRODUCTION_READY'),'NOT_PRODUCTION_READY')]
    for name,mutate,expected in cases:
        d=copy.deepcopy(valid);mutate(d)
        try:validate(d);out.append({'case':name,'pass':False,'error':'ACCEPTED_INVALID'})
        except Reject as e:out.append({'case':name,'pass':str(e)==expected,'reason':str(e)})
    frame=json.loads((N/'theme/frame-test.json').read_text('utf-8'));frame['resources'][0]['nineSlice']['sourceInsets'][0]=0
    try:validate(frame);out.append({'case':'nine-slice','pass':False})
    except Reject as e:out.append({'case':'nine-slice','pass':str(e)=='GEOMETRY_nineSlice','reason':str(e)})
    result={'kind':'DESIGN_RESOURCE_CHECK_NOT_ART_APPROVAL','cases':out,'pass':all(x.get('pass',True) for x in out)};return result
if __name__=='__main__':
    r=validate(json.loads(Path(sys.argv[1]).read_text('utf-8'))) if len(sys.argv)==2 else tests()
    print(json.dumps(r,ensure_ascii=False,indent=2));sys.exit(0 if r.get('pass',True) else 1)
