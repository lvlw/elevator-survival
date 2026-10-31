"""Delivery integrity tests; separate from game suites and mainline acceptance."""
from pathlib import Path
import hashlib
import json
import tempfile
import unittest
import zipfile
from review_checks import BASE, BRANCH, assert_scope, safe_path, distinct, verify_payloads, regular_zip, blob, ReviewError
from build_review import write_zip, verify_review

class ReviewTools(unittest.TestCase):
    def test_scope_positive_and_protected_runtime_negative(self):
        assert_scope(['src/app/infected-preplay/controller.ts','docs/engineering/world-integration/committed-presentation-b1-001/completion.md'])
        for name in ['src/core/rules.ts','src/state/residence-session/combat-session.ts','src/app/infected-browser/owner.ts','package-lock.json','README.md']:
            with self.assertRaisesRegex(ReviewError,'OUT_OF_SCOPE'): assert_scope([name])
    def test_paths_and_case_duplicates(self):
        safe_path('sources/src/app/controller.ts')
        for name in ['../escape','/absolute','C:/absolute','a\\b','a/../b','a//b','a/.','a.','a ']:
            with self.assertRaisesRegex(ReviewError,'UNSAFE_PATH'): safe_path(name)
        with self.assertRaisesRegex(ReviewError,'DUPLICATE_PATH'): distinct(['Same.txt','same.TXT'])
    def test_manifest_tamper_and_membership(self):
        payload={'a.txt':b'exact'}; rows=[{'path':'a.txt','bytes':5,'sha256':hashlib.sha256(b'exact').hexdigest()}]
        verify_payloads(payload,rows)
        with self.assertRaisesRegex(ReviewError,'MANIFEST_DIGEST'): verify_payloads({'a.txt':b'other'},rows)
        with self.assertRaisesRegex(ReviewError,'MANIFEST_FILE_SET'): verify_payloads({**payload,'extra':b'x'},rows)
    def test_symlink_and_encryption_are_not_regular(self):
        info=zipfile.ZipInfo('link');info.external_attr=0o120777<<16
        with self.assertRaisesRegex(ReviewError,'NON_REGULAR_ZIP_ENTRY'):regular_zip(info)
        info=zipfile.ZipInfo('encrypted');info.flag_bits=1
        with self.assertRaisesRegex(ReviewError,'NON_REGULAR_ZIP_ENTRY'):regular_zip(info)
    def fixture(self):
        name='src/app/infected-preplay/committed-presentation.ts';data=b'TEST fixture\n'
        return {'sources/'+name:data,'source-files.json':json.dumps([{'repositoryPath':name,'packagePath':'sources/'+name,'gitBlob':blob(data),
            'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'mode':'100644'}]).encode(),
            'git-receipt.json':json.dumps({'baseSHA':BASE,'branch':BRANCH,'finalSHA':'1'*40}).encode()}
    def test_real_zip_roundtrip_and_source_metadata_lie(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'good.zip';write_zip(p,self.fixture(),'1'*40)
            self.assertEqual(verify_review(p)['sourceFiles'],1)
            values=self.fixture();rows=json.loads(values['source-files.json']);rows[0]['sha256']='0'*64;values['source-files.json']=json.dumps(rows).encode()
            p=Path(tmp)/'bad.zip';write_zip(p,values,'1'*40)
            with self.assertRaisesRegex(ReviewError,'SOURCE_OBJECT'):verify_review(p)
    def test_real_zip_traversal_duplicate_and_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            for number,kind in enumerate(['traversal','duplicate','symlink']):
                path=Path(tmp)/(str(number)+'.zip')
                with zipfile.ZipFile(path,'x') as z:
                    if kind=='traversal':z.writestr('../escape',b'x')
                    elif kind=='duplicate':z.writestr('A.txt',b'x');z.writestr('a.TXT',b'y')
                    else:
                        i=zipfile.ZipInfo('link');i.create_system=3;i.external_attr=0o120777<<16;z.writestr(i,b'../escape')
                with self.assertRaises(ReviewError):verify_review(path)

if __name__=='__main__': unittest.main(verbosity=2)
