"""Governance tooling checks only; not new gameplay tests or mainline acceptance."""
import hashlib
import unittest
import zipfile
from governance_checks import (GovernanceError, assert_append, assert_preserved_refs, assert_regular_zip,
                               assert_scope, blob, distinct, safe_path, verify_payloads)

class GovernanceChecks(unittest.TestCase):
    def test_valid_relative_path(self):
        self.assertEqual(safe_path('source/docs/治理.md'), 'source/docs/治理.md')

    def test_path_escape_variants(self):
        for path in ['../a', 'a/../b', '/abs', 'C:/x', 'a\\b', 'a//b', 'a/./b', 'a. /b']:
            with self.subTest(path=path), self.assertRaisesRegex(GovernanceError, 'UNSAFE_PATH'):
                safe_path(path)

    def test_duplicate_casefold(self):
        with self.assertRaisesRegex(GovernanceError, 'DUPLICATE_PATH'):
            distinct(['source/A.md', 'source/a.md'])

    def test_preserve_old_refs_with_new_branch(self):
        assert_preserved_refs({'main': 'old', 'baseline/fixed': 'base'}, {'main': 'old', 'baseline/fixed': 'base', 'chore/new': 'new'})

    def test_moved_and_deleted_refs_reject(self):
        for current in [{'main': 'new'}, {}]:
            with self.assertRaisesRegex(GovernanceError, 'OLD_REF_CHANGED'):
                assert_preserved_refs({'main': 'old'}, current)

    def test_append_prefix_preserved(self):
        assert_append(b'old\r\n', b'old\r\n\nnew\n')

    def test_rewritten_history_rejects(self):
        with self.assertRaisesRegex(GovernanceError, 'HISTORY_PREFIX_CHANGED'):
            assert_append(b'old\n', b'edited\n')

    def test_whitelist_and_new_governance_readme(self):
        assert_scope(['README.md', 'docs/governance/world-baseline-001/current-state.md', 'docs/governance/README.md'])

    def test_production_and_unknown_old_readme_reject(self):
        for paths, existed in [(['src/core/rule.ts'], False), (['package-lock.json'], False), (['docs/governance/README.md'], True)]:
            with self.assertRaisesRegex(GovernanceError, 'OUT_OF_SCOPE'):
                assert_scope(paths, existed)

    def test_manifest_positive_and_tamper(self):
        data = {'file.txt': b'exact'}
        rows = [{'path': 'file.txt', 'bytes': 5, 'sha256': hashlib.sha256(b'exact').hexdigest()}]
        verify_payloads(data, rows)
        with self.assertRaisesRegex(GovernanceError, 'MANIFEST_DIGEST'):
            verify_payloads({'file.txt': b'other'}, rows)
        with self.assertRaisesRegex(GovernanceError, 'MANIFEST_FILE_SET'):
            verify_payloads({**data, 'extra': b'x'}, rows)

    def test_symlink_zip_rejects(self):
        member = zipfile.ZipInfo('link'); member.external_attr = 0o120777 << 16
        with self.assertRaisesRegex(GovernanceError, 'NON_REGULAR_ZIP_ENTRY'):
            assert_regular_zip(member)

    def test_exact_git_blob_format(self):
        self.assertEqual(blob(b'hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a')

class ReviewArchiveChecks(unittest.TestCase):
    def fixture(self):
        import json
        from build_review import BASE, BRANCH
        name = 'docs/governance/world-baseline-001/example.txt'
        data = b'review fixture\n'
        payload = {'sources/' + name: data,
                   'source-files.json': json.dumps([{'repositoryPath': name, 'packagePath': 'sources/' + name,
                       'gitBlob': blob(data), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'mode': '100644'}]).encode(),
                   'git-receipt.json': json.dumps({'baseSHA': BASE, 'finalSHA': '1' * 40, 'branch': BRANCH}).encode()}
        return payload

    def test_real_zip_positive(self):
        import tempfile
        from pathlib import Path
        from build_review import write_zip, verify_review
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.zip'
            write_zip(path, self.fixture(), '1' * 40)
            result = verify_review(path)
            self.assertEqual((result['status'], result['sourceFiles']), ('PASS', 1))

    def test_real_zip_source_metadata_and_payload_tamper(self):
        import json
        import tempfile
        from pathlib import Path
        from build_review import write_zip, verify_review
        with tempfile.TemporaryDirectory() as directory:
            payload = self.fixture()
            rows = json.loads(payload['source-files.json'])
            rows[0]['sha256'] = '0' * 64
            payload['source-files.json'] = json.dumps(rows).encode()
            path = Path(directory) / 'lying-source-metadata.zip'
            write_zip(path, payload, '1' * 40)
            with self.assertRaisesRegex(GovernanceError, 'SOURCE_OBJECT'):
                verify_review(path)
            valid = Path(directory) / 'valid.zip'
            write_zip(valid, self.fixture(), '1' * 40)
            with zipfile.ZipFile(valid) as z:
                data = {i.filename: z.read(i) for i in z.infolist()}
            data[next(p for p in data if p.startswith('sources/'))] = b'altered source'
            path = Path(directory) / 'tampered-payload.zip'
            with zipfile.ZipFile(path, 'x') as z:
                for name, value in data.items(): z.writestr(name, value)
            with self.assertRaisesRegex(GovernanceError, 'MANIFEST_DIGEST'):
                verify_review(path)

    def test_real_zip_traversal_case_duplicate_and_symlink(self):
        import tempfile
        from pathlib import Path
        from build_review import verify_review
        with tempfile.TemporaryDirectory() as directory:
            cases = [('../escape.txt', 'UNSAFE_PATH'), ('case-duplicate', 'DUPLICATE_PATH'), ('symlink', 'NON_REGULAR_ZIP_ENTRY')]
            for number, (case, error) in enumerate(cases):
                path = Path(directory) / (str(number) + '.zip')
                with zipfile.ZipFile(path, 'x') as z:
                    if case == 'case-duplicate':
                        z.writestr('Same.txt', b'a'); z.writestr('same.TXT', b'b')
                    elif case == 'symlink':
                        info = zipfile.ZipInfo('link'); info.create_system = 3; info.external_attr = 0o120777 << 16
                        z.writestr(info, b'../elsewhere')
                    else:
                        z.writestr(case, b'bad')
                with self.assertRaisesRegex(GovernanceError, error):
                    verify_review(path)

if __name__ == '__main__':
    unittest.main(verbosity=2)
