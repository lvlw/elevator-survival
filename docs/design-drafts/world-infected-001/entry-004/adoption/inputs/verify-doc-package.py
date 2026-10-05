#!/usr/bin/env python3
"""只读文档包核验；不执行游戏模型、npm、写仓库、commit或push。Python标准库。"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def blob(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)

def leaf_count(value: object) -> int:
    if isinstance(value, dict):
        return sum(leaf_count(x) for x in value.values())
    if isinstance(value, list):
        return sum(leaf_count(x) for x in value)
    require(type(value) is int, '配置数值叶必须为整数，不能是bool/float/string')
    return 1

def git(repo: Path, *args: str, data: bytes | None = None) -> bytes:
    run = subprocess.run(['git', '-C', str(repo), *args], input=data, capture_output=True, check=False)
    if run.returncode:
        raise RuntimeError(f'git {args}: exit={run.returncode}: {run.stderr.decode(errors="replace")}')
    return run.stdout

def audit_package(manifest: dict) -> dict:
    lines = (ROOT / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines()
    declared = {}
    for line in lines:
        expected, name = line.split('  ', 1)
        path = ROOT / name
        require(path.resolve().is_relative_to(ROOT), '包清单越界')
        require(name not in declared and not path.is_symlink(), f'重复或符号链接：{name}')
        require(sha(path.read_bytes()) == expected, f'包摘要不符：{name}')
        declared[name] = expected
    expected_names = set(manifest['archive_files']) - {'SHA256SUMS.txt'}
    actual_names = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
    require(set(declared) == expected_names, 'SHA清单必须恰好覆盖其余包内文件')
    require(actual_names == set(manifest['archive_files']), '包文件集合不符；报告请写仓库外且不要写入本包目录')
    for name in manifest['archive_files']:
        data = (ROOT / name).read_bytes()
        text = data.decode('utf-8')
        require(not data.startswith(b'\xef\xbb\xbf'), f'意外BOM：{name}')
        require('\r' not in text, f'非原定LF：{name}')
        require(not any(line.rstrip(' \t') != line for line in text.splitlines()), f'行尾空白：{name}')
    config = json.loads((ROOT / 'approved-documents/infected-world-entry-test-config-v0.1.json').read_text())
    content = json.loads((ROOT / 'approved-documents/infected-world-entry-content-v0.1.json').read_text())
    require(len(config['config']) == 103 and leaf_count(config['config']) == 193, '新配置键／数值叶集合不符')
    require('grant.H2-random' not in config['config'], '不得归档H2额外固定消毒剂')
    require(len(content['data']['nodes']) == 24 and len(content['data']['edges']) == 29, '图集合不符')
    h2 = [s for s in content['data']['sources'] if s['id'] == 'H2-random']
    require(len(h2) == 1 and h2[0]['grants'] is None and h2[0]['weights'] == 'random.H2', 'H2分流不符')
    for row in manifest['payload_targets']:
        require(sha((ROOT / row['input']).read_bytes()) == row['sha256'], f'载荷摘要不符：{row["input"]}')
    return {'files': len(actual_names), 'sha_entries': len(declared), 'config_keys': 103,
            'numeric_leaves': 193, 'nodes': 24, 'edges': 29, 'whitespace': 'PASS'}

def audit_sources(manifest: dict, read_source) -> dict:
    locked = {}
    for name, info in manifest['locked_sources'].items():
        raw = read_source(info['path'])
        require(blob(raw) == info['git_blob'], f'锁定源Git blob不符：{info["path"]}')
        require(sha(raw) == info['sha256'], f'锁定源SHA256不符：{info["path"]}')
        locked[name] = json.loads(raw)
    source = locked['parameters']
    config = json.loads((ROOT / 'approved-documents/infected-world-entry-test-config-v0.1.json').read_text())
    selected = {k: v['value'] for k, v in source['draft'].items() if k != 'grant.H2-random'}
    require(config['config'] == selected, '参数不是锁定源的精确value子集')
    require(config['approvedReadOnly'] == source['approvedReadOnly'], '已有38值的只读引用不符')
    original = locked['content']
    actual = json.loads((ROOT / 'approved-documents/infected-world-entry-content-v0.1.json').read_text())
    expected = {k: copy.deepcopy(original[k]) for k in actual['source']['selectedFields']}
    require(actual['source']['selectedFields'] == ['identity','maps','nodes','edges','items','sources','actions','enemies','goal'], '内容选取字段不符')
    next(s for s in expected['sources'] if s['id'] == 'H2-random')['grants'] = None
    require(actual['data'] == expected, '内容存在H2条件引用之外的结构／玩法变化')
    require(all(s.get('grants') != 'grant.H2-random' for s in actual['data']['sources']), '仍残留条件载荷活动引用')
    return {'source_blobs': 'PASS', 'parameter_exact_selection': 'PASS',
            'content_only_H2_grants_change': 'PASS', 'approved_38_references': 'PASS'}

def audit_repo(manifest: dict, repo: Path, phase: str) -> dict:
    base = manifest['base_sha']
    require(git(repo, 'rev-parse', f'{base}^').decode().strip() == manifest['base_parent'], '基线父SHA不符')
    require(git(repo, 'rev-parse', f'{base}^{{tree}}').decode().strip() == manifest['base_tree'], '基线tree不符')
    require(git(repo, 'rev-parse', f'{base}:src').decode().strip() == manifest['base_src_tree'], '基线src tree不符')
    require(git(repo, 'rev-parse', f'{base}:docs/05-design-decisions.md').decode().strip() == manifest['base_dec_blob'], 'DEC基线blob不符')
    source_results = audit_sources(manifest, lambda name: git(repo, 'show', f'{base}:{name}'))
    if phase == 'input':
        require(git(repo, 'rev-parse', 'HEAD').decode().strip() == base, '输入核验必须在指定基线HEAD')
        return {'base_objects': 'PASS', 'sources': source_results, 'scope': 'INPUT_ONLY'}
    allowed = set(manifest['allowed_paths'])
    changed = set(git(repo, 'diff', '--no-renames', '--name-only', base, '--').decode().splitlines())
    changed.update(git(repo, 'ls-files', '--others', '--exclude-standard').decode().splitlines())
    require(changed <= allowed, f'越界路径：{sorted(changed - allowed)}')
    for name in manifest['archive_files']:
        target = repo / manifest['archive_root'] / name
        require(target.read_bytes() == (ROOT / name).read_bytes(), f'归档原件非原字节：{name}')
    for row in manifest['payload_targets']:
        expected = (ROOT / row['input']).read_bytes()
        if row['mode'] == 'append-dec':
            expected = git(repo, 'show', f'{base}:{row["target"]}') + b'\n\n' + expected
        require((repo / row['target']).read_bytes() == expected, f'正式载荷目标不符：{row["target"]}')
    for name in manifest['append_only_paths']:
        old = git(repo, 'show', f'{base}:{name}')
        now = (repo / name).read_bytes()
        require(len(now) > len(old) and now.startswith(old), f'旧正文完整前缀不符：{name}')
    for name in manifest['prepend_only_paths']:
        old = git(repo, 'show', f'{base}:{name}')
        now = (repo / name).read_bytes()
        require(len(now) > len(old) and now.endswith(old), f'旧正文完整后缀不符：{name}')
    for name in manifest['report_paths']:
        require((repo / name).is_file(), f'缺报告：{name}')
    protected = 0
    # No object writes. hash-object applies the repository's clean filters like Git would.
    for line in git(repo, 'ls-tree', '-r', base).decode().splitlines():
        meta, name = line.split('\t', 1)
        mode, typ, oid = meta.split()
        if typ != 'blob' or name in allowed:
            continue
        path = repo / name
        require(path.is_file() and not path.is_symlink(), f'保护路径缺失／类型变更：{name}')
        current = git(repo, 'hash-object', f'--path={name}', '--stdin', data=path.read_bytes()).decode().strip()
        require(current == oid, f'范围外Git对象变化：{name}')
        protected += 1
    return {'base_objects': 'PASS', 'sources': source_results, 'changed_count': len(changed),
            'allowed_count': len(allowed), 'protected_blobs': protected, 'payload_archive_prefixes': 'PASS',
            'note': '本脚本未验证所有链接、远端引用、暂存／提交指纹或执行diff-check；这些需按任务书另行实跑。'}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', choices=['package','input','final'], default='package')
    parser.add_argument('--repo-root', type=Path)
    parser.add_argument('--source-dir', type=Path, help='只用于主线外部原件核对；目录需含两份blob一致的candidate JSON')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    require(not args.out.resolve().is_relative_to(ROOT), '回执不得写入不可变输入包')
    report = {'task': 'DOC-WORLD-ENTRY-004', 'phase': args.phase,
              'production_tests': 'NOT RUN', 'models': 'NOT RUN', 'repo_checks': 'NOT RUN'}
    exit_code = 0
    try:
        manifest = json.loads((ROOT / 'BASELINE-AND-INPUTS.json').read_text())
        report['package'] = audit_package(manifest)
        if args.source_dir:
            report['local_blob_verified_sources'] = audit_sources(manifest, lambda p: (args.source_dir / Path(p).name).read_bytes())
        if args.phase != 'package':
            require(args.repo_root is not None, '仓库检查必须指定--repo-root')
            report['repo_checks'] = audit_repo(manifest, args.repo_root.resolve(), args.phase)
        report['status'] = 'PASS'
    except Exception as exc:
        report['status'] = 'FAIL'
        report['error'] = f'{type(exc).__name__}: {exc}'
        exit_code = 1
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    return exit_code

if __name__ == '__main__':
    sys.exit(main())
