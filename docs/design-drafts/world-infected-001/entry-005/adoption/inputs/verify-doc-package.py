"""Read-only document package/repository verification. Python standard library only.
Run --package-only before archival. With --repo, verifies fixed targets and scope;
--ref HEAD checks committed blobs. Remaining semantic/link audits stay explicit.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--package-only', action='store_true')
    ap.add_argument('--repo', type=Path)
    ap.add_argument('--ref')
    ap.add_argument('--output', type=Path)
    args = ap.parse_args()
    rows = []
    def check(name, ok, detail=None):
        rows.append({'name': name, 'pass': bool(ok), 'detail': detail})
    manifest = json.loads((ROOT / 'BASELINE-AND-INPUTS.json').read_text('utf-8'))
    for line in (ROOT / 'SHA256SUMS.txt').read_text('utf-8').splitlines():
        digest, name = line.split('  ', 1)
        p = ROOT / name
        check('package-sha256:' + name, p.is_file() and sha(p.read_bytes()) == digest)
    for name in manifest['archive_files']:
        b = (ROOT / name).read_bytes()
        check('utf8:' + name, b.decode('utf-8').encode('utf-8') == b)
        check('no-new-trailing-whitespace:' + name,
              all(not s.endswith((b' ', b'\t', b'\r')) for s in b.split(b'\n')))
    if not args.package_only:
        if args.repo is None:
            ap.error('--repo is required unless --package-only')
        repo = args.repo.resolve()
        def git(*argv, must=True):
            p = subprocess.run(['git', '-C', str(repo), *argv], capture_output=True)
            if must and p.returncode:
                raise RuntimeError('git failed: ' + ' '.join(argv) + ': ' + p.stderr.decode('utf-8', 'replace'))
            return p
        start = manifest['start_sha']
        def baseline(path):
            return git('show', start + ':' + path).stdout
        def current(path):
            return git('show', args.ref + ':' + path).stdout if args.ref else (repo / path).read_bytes()
        check('baseline-src-tree', git('rev-parse', start + ':src').stdout.decode().strip() == manifest['src_tree'])
        for path, blob in manifest['source_blobs'].items():
            check('source-at-baseline:' + path, git('rev-parse', start + ':' + path).stdout.decode().strip() == blob)
        for path, digest in manifest['source_declared_config_sha256'].items():
            check('approved-config:' + path, sha(baseline(path)) == digest)
        for src, dst in manifest['archive_map'].items():
            check('archived-original:' + dst, current(dst) == (ROOT / src).read_bytes())
        for src, dst in manifest['payload_map'].items():
            check('formal-payload:' + dst, current(dst) == (ROOT / src).read_bytes())
            check('formal-target-was-new:' + dst, not git('ls-tree', '--name-only', start, '--', dst).stdout.strip())
        for path in manifest['prepend_only_paths']:
            old, new = baseline(path), current(path)
            check('original-suffix:' + path, new.endswith(old) and len(new) > len(old))
            check('ratification-note:' + path, b'DOC-WORLD-ENTRY-005' in new[:-len(old)])
        for path in manifest['append_only_paths']:
            old, new = baseline(path), current(path)
            check('original-prefix:' + path, new.startswith(old) and len(new) > len(old))
            check('ratification-note:' + path, b'DOC-WORLD-ENTRY-005' in new[len(old):])
        argv = ['diff', '--no-renames', '--name-only', start]
        if args.ref: argv.append(args.ref)
        changed = set(git(*argv).stdout.decode('utf-8').splitlines())
        if not args.ref:
            changed |= set(git('ls-files', '--others', '--exclude-standard').stdout.decode('utf-8').splitlines())
        check('exact-scope', changed <= set(manifest['allowed_paths']), sorted(changed - set(manifest['allowed_paths'])))
        for path in sorted(changed):
            b = current(path)
            check('changed-utf8:' + path, b.decode('utf-8').encode('utf-8') == b)
        diffargs = ['diff', '--check', start]
        if args.ref: diffargs.append(args.ref)
        diff = git(*diffargs, must=False)
        check('incremental-diff-check', diff.returncode == 0, {'exit': diff.returncode, 'output': diff.stdout.decode('utf-8', 'replace')})
        if args.ref:
            check('committed-src-tree', git('rev-parse', args.ref + ':src').stdout.decode().strip() == manifest['src_tree'])
            check('clean-after-commit', not git('status', '--porcelain').stdout.strip())
    report = {'mode': 'READ_ONLY_DOC_PACKAGE_CHECK', 'task': manifest['task'], 'allPassed': all(r['pass'] for r in rows), 'count': len(rows), 'rows': rows,
              'notCovered': ['Full semantic source review', 'All Markdown link/anchor resolution', 'Production tests', 'Browser or playtest', 'Remote push confirmation']}
    text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['task', 'count', 'allPassed']}, ensure_ascii=False))
    return 0 if report['allPassed'] else 1

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError) as e:
        print(type(e).__name__ + ': ' + str(e), file=sys.stderr)
        raise SystemExit(2)
