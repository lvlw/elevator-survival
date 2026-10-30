"""Package exact committed delta and external receipts; no media, dependencies or saves."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import stat
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[4]
docs = Path(__file__).resolve().parent
evidence = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
assert destination.name == 'MAINLINE-REVIEW.zip' and root not in destination.parents
assert not destination.exists(), 'Refuse to overwrite an existing review ZIP'
base = '723d547665298463ecd8a8d04c7ed508a1658dc1'

def git(*args):
    return subprocess.check_output(['git', '-c', 'core.quotepath=false', *args], cwd=root)

target = git('rev-parse', 'HEAD').decode().strip()
parent = git('rev-parse', 'HEAD^').decode().strip()
tree = git('rev-parse', 'HEAD^{tree}').decode().strip()
assert parent == base
assert git('branch', '--show-current').decode().strip() == 'feature/world-presentation-prep-001'
assert git('status', '--porcelain=v1') == b''
files = git('diff', '--name-only', '-z', base, target).decode().strip('\0').split('\0')
payload, sources = {}, []
for path in files:
    assert path.startswith('src/') or path.startswith('docs/engineering/world-integration/presentation-prep-001/')
    assert Path(path).suffix.lower() not in ['.png', '.jpg', '.webp', '.svg', '.woff', '.woff2', '.zip']
    content = git('show', target + ':' + path)
    blob = git('rev-parse', target + ':' + path).decode().strip()
    archived = 'source/' + path
    payload[archived] = content
    sources.append({'path': path, 'archivePath': archived, 'gitBlobAtTarget': blob,
                    'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)})
payload['patch/changes.patch'] = git('diff', '--binary', '--full-index', base, target)
for path in sorted(evidence.iterdir()):
    if path.is_file() and path.suffix in ['.log', '.txt', '.json']:
        assert not path.is_symlink()
        payload['evidence/' + path.name] = path.read_bytes()
ci = json.loads((evidence / 'CI-RECEIPT.json').read_text('utf-8'))
receipt = json.loads((evidence / 'GIT-RECEIPT.json').read_text('utf-8'))
assert receipt['targetSHA'] == target and receipt['tree'] == tree and ci['targetSHA'] == target
header = ('# Exact delivery facts\n\nBase SHA: `' + base + '`\n\nTarget SHA: `' + target +
          '`\n\nParent SHA: `' + parent + '`\n\nTree: `' + tree +
          '`\n\nBranch: `feature/world-presentation-prep-001`\n\nPush/remote: ' + receipt['pushStatus'] +
          '\n\nExact-SHA CI: ' + ci['status'] + '\n\n')
payload['FINAL-REPORT.md'] = (header + git('show', target + ':docs/engineering/world-integration/presentation-prep-001/FINAL-REPORT.md').decode()).encode()
payload['GIT-RECEIPT.json'] = (json.dumps(receipt, ensure_ascii=False, indent=2) + '\n').encode()
payload['CI-RECEIPT.json'] = (json.dumps(ci, ensure_ascii=False, indent=2) + '\n').encode()
payload['SOURCE-MANIFEST.json'] = (json.dumps({'baseSHA': base, 'targetSHA': target, 'parentSHA': parent, 'tree': tree, 'files': sources}, ensure_ascii=False, indent=2) + '\n').encode()
payload['README.md'] = ('''# Mainline review package

Read FINAL-REPORT.md, GIT-RECEIPT.json, CI-RECEIPT.json and SOURCE-MANIFEST.json first.
source/ is the exact committed delta from the stated base; patch/changes.patch includes full-index identities.
All candidate contracts, original task inputs, inventories and rerunnable audits are under the new source/docs subtree.
evidence/ contains actual local test logs, source/scope audits, external semantic controls and Git/CI receipts.
No historical image/screenshot/material ZIP, font, node_modules, cache, profile, real save or account secret is included.
Existing resources are referenced at the accurate base; ASSET-BINDING-CANDIDATE.json is not an art adoption.
Run: python verify-review.py (standard library only). Payload hashes exclude the two manifest/checksum files by definition.
Stop for WebGPT mainline exact-SHA review. B production and C are not authorized by this package.
''').encode()
verifier = '''from pathlib import Path, PurePosixPath
import hashlib, json, sys, zipfile
root=Path(__file__).resolve().parent
manifest=json.loads((root/'MANIFEST.json').read_text('utf-8'))
names=[r['path'] for r in manifest['files']]
assert len(names)==len(set(names))
for row in manifest['files']:
 p=PurePosixPath(row['path'])
 assert not p.is_absolute() and '..' not in p.parts and ':' not in row['path'] and '\\\\' not in row['path']
 f=root/row['path']; assert not f.is_symlink() and f.resolve().is_relative_to(root)
 data=f.read_bytes(); assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'], row['path']
actual={p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
assert actual==set(names)|{'MANIFEST.json','SHA256SUMS.txt'}
rows=manifest['files']+[{'path':'MANIFEST.json','sha256':hashlib.sha256((root/'MANIFEST.json').read_bytes()).hexdigest()}]
assert (root/'SHA256SUMS.txt').read_text('utf-8')==''.join(r['sha256']+'  '+r['path']+'\\n' for r in rows)
sources=json.loads((root/'SOURCE-MANIFEST.json').read_text('utf-8'))
assert sources['targetSHA']==manifest['targetSHA']
for row in sources['files']:
 data=(root/row['archivePath']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==row['sha256']
 blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\\0'+data).hexdigest()
 assert blob==row['gitBlobAtTarget'],row['path']
print(json.dumps({'status':'PASS','targetSHA':manifest['targetSHA'],'payloadFiles':len(names),'sources':len(sources['files'])}))
'''
payload['verify-review.py'] = verifier.encode()
rows = [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(payload.items())]
manifest = {'task': 'ENG-WORLD-PRESENTATION-PREP-001', 'baseSHA': base, 'targetSHA': target, 'parentSHA': parent, 'tree': tree, 'files': rows}
payload['MANIFEST.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
sum_rows = rows + [{'path': 'MANIFEST.json', 'sha256': hashlib.sha256(payload['MANIFEST.json']).hexdigest()}]
payload['SHA256SUMS.txt'] = ''.join(r['sha256'] + '  ' + r['path'] + '\n' for r in sum_rows).encode()
for name in payload:
    p = PurePosixPath(name)
    assert not p.is_absolute() and '..' not in p.parts and ':' not in name and '\\' not in name
    assert not re.search(r'\.(png|jpe?g|webp|gif|woff2?|wav|mp3|zip)$', name, re.I)
destination.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, data in sorted(payload.items()):
        archive.writestr(name, data)
with zipfile.ZipFile(destination) as archive:
    assert len(archive.namelist()) == len(set(archive.namelist())) == len(payload)
    assert archive.testzip() is None
    assert all(not stat.S_ISLNK(info.external_attr >> 16) for info in archive.infolist())
    for name, data in payload.items():
        assert archive.read(name) == data
assert destination.stat().st_size < 20 * 1024 * 1024
print(json.dumps({'path': str(destination), 'bytes': destination.stat().st_size,
                  'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'members': len(payload),
                  'baseSHA': base, 'targetSHA': target, 'parentSHA': parent, 'tree': tree, 'crc': 'PASS'}))
