#!/usr/bin/env python3
"""Read-only package/repository checks. No gameplay, installation, or writes to repo."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

EXPECTED_FIELDS = [
    'first.toolChoices', 'first.specialtyChoices', 'phase', 'location', 'taskDay',
    'map.nodes', 'map.routes', 'move.options', 'sources', 'ground', 'carried',
    'tasks.publicObjectives', 'terminal.eligibility', 'terminal.result',
    'combat.intent', 'combat.actions', 'combat.enemyStage', 'combat.relativeTimeline',
    'body.hp', 'body.bleedingWounds', 'body.energySatiety', 'body.infectionWarning',
    'persistence.feedback', 'staticHub.successors',
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def blob(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\0' + data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package-root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--repo', type=Path)
    parser.add_argument('--out', type=Path, help='Optional report, strictly outside package/repo')
    args = parser.parse_args()
    root = args.package_root.resolve(strict=True)
    repo = args.repo.resolve(strict=True) if args.repo else None
    rows: list[dict[str, object]] = []

    def check(label: str, condition: bool) -> None:
        rows.append({'check': label, 'pass': bool(condition)})
        if not condition:
            raise RuntimeError(label)

    def git(*parts: str) -> bytes:
        assert repo is not None
        result = subprocess.run(['git', '-C', str(repo), *parts], capture_output=True, check=False)
        if result.returncode:
            raise RuntimeError('Git read failed: ' + ' '.join(parts) + '\n' + result.stderr.decode('utf-8', 'replace'))
        return result.stdout

    try:
        manifest = json.loads((root / 'BASELINE-AND-INPUTS.json').read_bytes())
        names = manifest['input_names']
        check('distinct package names', len(names) == len(set(names)))
        check('safe package names', all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in names))
        actual_names = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
        check('exact package file set', actual_names == set(names))
        checksums: dict[str, str] = {}
        for line in (root / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
            digest, name = line.split('  ', 1)
            check('checksum shape: ' + name, re.fullmatch(r'[0-9a-f]{64}', digest) is not None and name not in checksums)
            checksums[name] = digest
        check('checksum file set', set(checksums) == set(names) - {'SHA256SUMS.txt'})
        for name in names:
            data = (root / name).read_bytes()
            data.decode('utf-8')
            check('UTF-8/no BOM: ' + name, not data.startswith(b'\xef\xbb\xbf'))
            check('clean new archive whitespace: ' + name, all(not line.endswith((b' ', b'\t')) for line in data.splitlines()))
            if name in checksums:
                check('sha256: ' + name, sha(data) == checksums[name])
        check('exact allowed path count', len(manifest['allowed_paths']) == manifest['counts']['maximum_paths'] == len(set(manifest['allowed_paths'])))
        check('seven payloads', len(manifest['payloads']) == 7)
        for p in manifest['payloads']:
            data = (root / p['source']).read_bytes()
            check('payload fingerprint: ' + p['source'], len(data) == p['bytes'] and sha(data) == p['sha256'] and blob(data) == p['git_blob'])
        new_fields = json.loads((root / 'approved-documents/player-query-field-contract-v1.1.json').read_bytes())
        check('24 field keys', [f['field'] for f in new_fields['fields']] == EXPECTED_FIELDS)
        check('historical support snapshot', new_fields['baseline_support_counts'] == {'supported': 3, 'partial': 12, 'not-supported': 9})
        check('only D1 marked new knowledge', [f['field'] for f in new_fields['fields'] if f['new_player_knowledge_authorized']] == ['body.infectionWarning'])
        check('no implementation claim', all(f['implementation_status'] == 'NOT_EVALUATED_BY_THIS_DOC_TASK' for f in new_fields['fields']))
        dec = (root / 'approved-documents/DEC-053-append-v1.0.md').read_text(encoding='utf-8')
        check('only assigned DEC heading', re.findall(r'^## DEC-\d+:|^## DEC-\d+：', dec, re.M) == ['## DEC-053：'])
        check('DEC anchor', dec.count('<a id="dec-053"></a>') == 1)
        check('original runner blob', blob((root / 'reference/t01/source/run-native-probes.mjs').read_bytes()) == manifest['expected_base_blobs']['docs/design-drafts/world-infected-001/entry-006/validation/run-native-probes.mjs'])

        if repo:
            base = manifest['start_sha']
            check('base commit exists', git('rev-parse', base + '^{commit}').decode().strip() == base)
            check('base tree', git('rev-parse', base + '^{tree}').decode().strip() == manifest['start_tree'])
            check('actual branch', git('branch', '--show-current').decode().strip() == manifest['branch'])
            for name, expected in manifest['expected_base_blobs'].items():
                check('base blob: ' + name, git('rev-parse', base + ':' + name).decode().strip() == expected)
            for name, expected in manifest['protected_root_blobs'].items():
                check('protected base subtree: ' + name, git('rev-parse', base + ':' + name).decode().strip() == expected)
            for name in names:
                check('archived original bytes: ' + name, (repo / manifest['input_root'] / name).read_bytes() == (root / name).read_bytes())
            for p in manifest['payloads']:
                data = (root / p['source']).read_bytes()
                expected = git('show', base + ':' + p['target']) + data if p['mode'] == 'append-exact' else data
                check('installed exact payload: ' + p['target'], (repo / p['target']).read_bytes() == expected)
            for name in manifest['append_only_paths']:
                old = git('show', base + ':' + name)
                now = (repo / name).read_bytes()
                check('exact historical prefix: ' + name, now.startswith(old) and len(now) > len(old))
                check('current adoption note: ' + name, manifest['append_marker'] in now[len(old):].decode('utf-8'))
            old_fields = json.loads(git('show', base + ':docs/engineering/world-integration/player-query/player-query-field-contract-v1.0.json'))
            check('same ordered fields vs real baseline', [f['field'] for f in old_fields['fields']] == EXPECTED_FIELDS)
            for old, new in zip(old_fields['fields'], new_fields['fields']):
                if old['field'] != 'body.infectionWarning':
                    check('unchanged other field: ' + old['field'], old == new)
            old_path = 'docs/engineering/world-integration/player-query/player-query-field-contract-v1.0.json'
            check('original v1.0 JSON unchanged', (repo / old_path).read_bytes() == git('show', base + ':' + old_path))
            config_path = 'docs/content/infected-residence-core-test-config-v0.1.json'
            config = json.loads((repo / config_path).read_bytes())
            check('actual approved infection_damage', config['config']['health']['infection_damage'] == [{'min': 0, 'hp': 0}, {'min': 60, 'hp': 1}, {'min': 90, 'hp': 2}, {'min': 120, 'hp': 3}])
            tracked_changed = {x.decode('utf-8') for x in git('diff', '--name-only', '-z', base).split(b'\0') if x}
            untracked = {x.decode('utf-8') for x in git('ls-files', '--others', '--exclude-standard', '-z').split(b'\0') if x}
            check('all working differences allowed', (tracked_changed | untracked) <= set(manifest['allowed_paths']))
            check('no protected root changes', not any(p == r or p.startswith(r + '/') for p in tracked_changed | untracked for r in manifest['protected_roots']))
            check('runner actually fixed', (repo / manifest['tool_only_paths'][0]).read_bytes() != git('show', base + ':' + manifest['tool_only_paths'][0]))
            check('standalone tool regression provided', (repo / manifest['tool_only_paths'][2]).is_file())
            for name in manifest['author_reports']:
                data = (repo / name).read_bytes()
                check('author report present: ' + name, bool(data.strip()))
                if name.endswith('.json'):
                    json.loads(data)
            increment = subprocess.run(['git', '-C', str(repo), 'diff', base, '--check'], capture_output=True, check=False)
            check('incremental diff whitespace', increment.returncode == 0)
        output = {'task': manifest['task'], 'status': 'PASS', 'mode': 'real-repository-byte-scope-check' if repo else 'package-only', 'checks': rows,
                  'total': len(rows), 'not_proven': ['semantic/link completeness', 'T01 actual platform regression', 'CI', 'native gameplay or browser execution']}
    except Exception as exc:
        output = {'status': 'FAIL', 'mode': 'repository' if repo else 'package-only', 'checks': rows, 'total': len(rows), 'error': str(exc)}
    text = json.dumps(output, ensure_ascii=False, indent=2) + '\n'
    if args.out:
        out = args.out.resolve()
        if out.is_relative_to(root) or (repo and out.is_relative_to(repo)):
            print('Report must be outside package and repository', file=sys.stderr)
            return 2
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding='utf-8')
    sys.stdout.write(text)
    return 0 if output['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
