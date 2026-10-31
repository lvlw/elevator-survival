"""One lightweight review ZIP, bound to exact Git bytes; no archive of baseline assets."""
from pathlib import Path
import argparse
import hashlib
import json
import stat
import subprocess
import zipfile
from governance_checks import BASE, BRANCH, assert_scope, assert_regular_zip, distinct, verify_payloads, blob, GovernanceError

ROOT = Path(__file__).resolve().parents[3]
MAX_BYTES = 10 * 1024 * 1024

def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')

def manifest_for(payload, final):
    distinct(payload)
    return {'format': 'GOV-WORLD-BASELINE-001-REVIEW-1', 'baseSHA': BASE, 'finalSHA': final,
            'dependency': 'Requires exact repository baseline; not a self-contained repository/site archive',
            'manifestExcludedFromOwnDigest': True,
            'files': [{'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                      for name, data in sorted(payload.items())]}

def write_zip(path, payload, final):
    if 'MANIFEST.json' in payload:
        raise GovernanceError('MANIFEST_RESERVED')
    distinct(payload)
    if sum(map(len, payload.values())) > MAX_BYTES:
        raise GovernanceError('REVIEW_TOO_LARGE')
    data = {**payload, 'MANIFEST.json': json_bytes(manifest_for(payload, final))}
    with zipfile.ZipFile(path, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, value in sorted(data.items()):
            info = zipfile.ZipInfo(name, (2026, 10, 31, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, value)

def verify_review(path):
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        distinct([i.filename for i in infos])
        for info in infos:
            assert_regular_zip(info)
        if sum(i.file_size for i in infos) > MAX_BYTES:
            raise GovernanceError('REVIEW_TOO_LARGE')
        payload = {i.filename: archive.read(i) for i in infos}  # also checks CRC
    manifest = json.loads(payload.pop('MANIFEST.json'))
    if manifest['baseSHA'] != BASE or manifest['format'] != 'GOV-WORLD-BASELINE-001-REVIEW-1':
        raise GovernanceError('REVIEW_BASE_OR_FORMAT')
    verify_payloads(payload, manifest['files'])
    sources = json.loads(payload['source-files.json'])
    assert_scope([r['repositoryPath'] for r in sources])
    expected_source_paths = {r['packagePath'] for r in sources}
    if expected_source_paths != {p for p in payload if p.startswith('sources/')}:
        raise GovernanceError('SOURCE_MEMBERSHIP')
    for row in sources:
        data = payload[row['packagePath']]
        if (row['packagePath'] != 'sources/' + row['repositoryPath'] or row['gitBlob'] != blob(data)
                or row['bytes'] != len(data) or row['sha256'] != hashlib.sha256(data).hexdigest()
                or row['mode'] != '100644'):
            raise GovernanceError('SOURCE_OBJECT')
    receipt = json.loads(payload['git-receipt.json'])
    if receipt['baseSHA'] != BASE or receipt['finalSHA'] != manifest['finalSHA'] or receipt['branch'] != BRANCH:
        raise GovernanceError('RECEIPT_OBJECT')
    return {'status': 'PASS', 'files': len(infos), 'payloadFiles': len(payload),
            'sourceFiles': len(sources), 'uncompressedBytes': sum(i.file_size for i in infos),
            'baseSHA': BASE, 'finalSHA': manifest['finalSHA'], 'crcAndDigests': 'PASS'}

def git(*args):
    return subprocess.check_output(['git', '-c', 'core.quotepath=false', *args], cwd=ROOT)

def build(directory):
    directory = directory.resolve(strict=True)
    for row in git('worktree', 'list', '--porcelain').decode().splitlines():
        if row.startswith('worktree '):
            if directory.is_relative_to(Path(row[9:]).resolve()):
                raise GovernanceError('OUTPUT_INSIDE_WORKTREE')
    if git('branch', '--show-current').decode().strip() != BRANCH:
        raise GovernanceError('WRONG_BRANCH')
    if git('status', '--porcelain').strip():
        raise GovernanceError('DIRTY_WORKTREE')
    final = git('rev-parse', 'HEAD').decode().strip()
    if final == BASE or subprocess.run(['git', 'merge-base', '--is-ancestor', BASE, final], cwd=ROOT).returncode != 0:
        raise GovernanceError('FINAL_NOT_DESCENDANT')
    receipt = json.loads((directory / 'final-receipt.json').read_text('utf-8-sig'))
    if receipt['baseSHA'] != BASE or receipt['finalSHA'] != final or receipt['branch'] != BRANCH:
        raise GovernanceError('RECEIPT_OBJECT')
    if receipt['parentSHA'] != git('rev-parse', 'HEAD^').decode().strip() or receipt['tree'] != git('rev-parse', 'HEAD^{tree}').decode().strip():
        raise GovernanceError('RECEIPT_PARENT_TREE')
    paths = [p.decode() for p in git('diff', '--name-only', '-z', BASE, final).split(b'\0') if p]
    assert_scope(paths)
    payload, sources = {}, []
    for name in paths:
        path = ROOT / name
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT.resolve()):
            raise GovernanceError('SOURCE_SYMLINK_OR_ESCAPE')
        data = git('show', final + ':' + name)
        package_path = 'sources/' + name
        obj = git('rev-parse', final + ':' + name).decode().strip()
        if obj != blob(data):
            raise GovernanceError('SOURCE_OBJECT')
        payload[package_path] = data
        sources.append({'repositoryPath': name, 'packagePath': package_path, 'gitBlob': obj,
                        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'mode': '100644'})
    for path in sorted((directory / 'evidence').iterdir()):
        if path.is_symlink() or not path.is_file() or path.suffix not in {'.log', '.json', '.txt'}:
            raise GovernanceError('UNEXPECTED_EVIDENCE_FILE')
        payload['evidence/' + path.name] = path.read_bytes()
    payload['base-to-final.patch'] = git('diff', '--binary', '--full-index', '--no-ext-diff', BASE, final)
    payload['source-files.json'] = json_bytes(sources)
    payload['git-receipt.json'] = json_bytes(receipt)
    payload['FINAL-REPORT.md'] = ('# GOV-WORLD-BASELINE-001 精确提交交付\n\n'
        + f"Base: `{BASE}`\n\nFinal: `{final}`\n\nParent: `{receipt['parentSHA']}`\n\nTree: `{receipt['tree']}`\n\n"
        + '最终远端/CI回执见 git-receipt.json，实际检查和全部原始日志见 evidence/。\n\n'
        + '下方为该提交内作者报告。主线精确SHA治理实审待进行。\n\n'
        + git('show', final + ':docs/governance/world-baseline-001/completion.md').decode('utf-8')).encode('utf-8')
    destination = directory / 'MAINLINE-REVIEW.zip'
    write_zip(destination, payload, final)
    result = verify_review(destination)
    (directory / 'zip-verification.json').write_bytes(json_bytes(result))
    data = destination.read_bytes()
    delivery = {**result, 'path': str(destination), 'bytes': len(data),
                'sha256': hashlib.sha256(data).hexdigest(), 'parentSHA': receipt['parentSHA'], 'tree': receipt['tree']}
    (directory / 'DELIVERY-RECEIPT.json').write_bytes(json_bytes(delivery))
    print(json.dumps(delivery, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['build', 'verify'])
    parser.add_argument('path', type=Path)
    args = parser.parse_args()
    if args.operation == 'build':
        build(args.path)
    else:
        print(json.dumps(verify_review(args.path), ensure_ascii=False))
