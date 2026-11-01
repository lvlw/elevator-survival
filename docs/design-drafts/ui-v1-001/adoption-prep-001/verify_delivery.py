"""Verify a review ZIP's bytes, original inputs and independent Git tree reconstruction."""
import argparse, hashlib, json, struct, zipfile
from pathlib import Path, PurePosixPath
from asset_review import BASE, BASE_TREE, PREFIX, SRC_TREE

def digest(data):return hashlib.sha256(data).hexdigest()
def object_hash(kind,data):return hashlib.sha1(kind.encode()+b' '+str(len(data)).encode()+b'\0'+data).hexdigest()
def tree_hash(entries):
    root={}
    for path,mode,obj in entries:
        parts=path.split('/');node=root
        for part in parts[:-1]:node=node.setdefault(part,{})
        if parts[-1] in node:raise ValueError('duplicate tree path')
        node[parts[-1]]=(mode,obj)
    def walk(node):
        raw=b''
        for name,value in sorted(node.items(),key=lambda kv:kv[0].encode('utf-8')+(b'/' if isinstance(kv[1],dict) else b'')):
            mode,obj=('40000',walk(value)) if isinstance(value,dict) else value
            raw+=mode.encode()+b' '+name.encode('utf-8')+b'\0'+bytes.fromhex(obj)
        return object_hash('tree',raw)
    return walk(root)

def verify(path,extract_to=None):
    with zipfile.ZipFile(path) as z:
        infos=z.infolist();names=[x.filename for x in infos]
        if len(names)!=len(set(names)) or len(names)!=len({x.casefold() for x in names}):raise ValueError('duplicate/case collision')
        for item in infos:
            p=PurePosixPath(item.filename)
            if p.is_absolute() or '..' in p.parts or '\\' in item.filename or ':' in item.filename or item.flag_bits&1 or (item.external_attr>>16)&0o170000==0o120000:raise ValueError('unsafe ZIP entry')
            if any(x.casefold() in ('.git','node_modules','dist','edge-independent-profile') for x in p.parts):raise ValueError('forbidden package contents')
        if z.testzip() is not None:raise ValueError('ZIP CRC')
        manifest=json.loads(z.read('DELIVERY-MANIFEST.json'));rows=manifest['files']
        if set(names)!={x['path'] for x in rows}|{'DELIVERY-MANIFEST.json'}:raise ValueError('manifest coverage')
        for row in rows:
            raw=z.read(row['path'])
            if len(raw)!=row['bytes'] or digest(raw)!=row['sha256']:raise ValueError('manifest digest '+row['path'])
        identity=json.loads(z.read('git/identity.json'));base=json.loads(z.read('git/all-base-objects.json'));source=json.loads(z.read('git/source-files.json'))
        entries=[(x['path'],x['mode'],x['gitObject']) for x in base['objects']]
        if len(entries)!=3185 or tree_hash(entries)!=BASE_TREE or identity['base']!=BASE or identity['srcTree']!=SRC_TREE:raise ValueError('base binding')
        for row in source:
            if not row['path'].startswith(PREFIX) or row['mode'] not in ('100644','100755'):raise ValueError('source whitelist')
            raw=z.read('source/'+row['path'])
            if object_hash('blob',raw)!=row['gitBlob'] or digest(raw)!=row['sha256']:raise ValueError('source Git byte mismatch')
            entries.append((row['path'],row['mode'],row['gitBlob']))
        if tree_hash(entries)!=identity['tree']:raise ValueError('final root reconstruction')
        pm=json.loads(z.read('source/'+PREFIX+'inputs/PACKAGE-MANIFEST.json'))
        for row in pm['files']:
            raw=z.read('source/'+PREFIX+'inputs/'+row['path'])
            if len(raw)!=row['bytes'] or digest(raw)!=row['sha256']:raise ValueError('original input differs')
        archive_receipt=json.loads(z.read('source/'+PREFIX+'input-archive-receipt.json'))
        for row in archive_receipt['files']:
            if digest(z.read('source/'+PREFIX+'inputs/'+row['path']))!=row['sha256']:raise ValueError('raw ZIP input archive differs')
        if extract_to:
            root=extract_to.resolve();root.mkdir(parents=True,exist_ok=False)
            for name in names:
                target=root.joinpath(*PurePosixPath(name).parts)
                if not target.resolve().is_relative_to(root):raise ValueError('extract escape')
                target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(name))
            for row in rows:
                if digest((root/row['path']).read_bytes())!=row['sha256']:raise ValueError('re-extraction mismatch')
        return {'result':'PASS','zipEntries':len(infos),'sourceFiles':len(source),'originalInputs':len(archive_receipt['files']),
                'protectedBaseObjects':3185,'baseTreeReconstructed':BASE_TREE,'finalTreeReconstructed':identity['tree'],
                'final':identity['final'],'bytes':path.stat().st_size,'sha256':digest(path.read_bytes()),'reExtracted':bool(extract_to)}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('zip',type=Path);p.add_argument('--extract-to',type=Path);args=p.parse_args();print(json.dumps(verify(args.zip,args.extract_to),indent=2))
