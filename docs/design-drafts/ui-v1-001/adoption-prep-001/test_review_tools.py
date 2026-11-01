"""Independent TEST-only guard negatives; never counted as game tests."""
import copy, http.client, json, os, subprocess, tempfile, threading, unittest
from pathlib import Path
import asset_review as a
from preview_server import make_handler, ReadOnlyReviewServer

class ReviewTools(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c=json.loads((a.HERE/'candidate-bindings.json').read_text('utf-8'))
        a.validate(cls.c,a.REPO)
    def reject(self,mutate):
        c=copy.deepcopy(self.c);mutate(c)
        with self.assertRaises((ValueError,FileNotFoundError)):a.validate(c,a.REPO)
    def test_fixed_binding_positive(self):self.assertEqual(a.validate(self.c,a.REPO)['uniqueFiles'],83)
    def test_missing_digest(self):self.reject(lambda c:c['resources'][0].pop('sha256'))
    def test_wrong_digest(self):self.reject(lambda c:c['resources'][0].update(sha256='0'*64))
    def test_duplicate_key(self):self.reject(lambda c:c['resources'].append(copy.deepcopy(c['resources'][0])))
    def test_wrong_native_pixels(self):self.reject(lambda c:c['resources'][0].update(nativePixels=[2400,1776]))
    def test_missing_stage(self):self.reject(lambda c:c['enemyStageSlots'].pop())
    def test_implicit_group_mix(self):
        def mix(c):c['enemyStageSlots'][0]['repositoryPath']=c['enemyStageSlots'][5]['repositoryPath']
        self.reject(mix)
    def test_partial_group_recommendation(self):self.reject(lambda c:c['recommendation']['assetKeys'].remove(c['enemyStageSlots'][0]['resourceKey']))
    def test_historical_player_in_recommendation(self):self.reject(lambda c:c['recommendation']['assetKeys'].append('player-back-legacy'))
    def test_unapproved_attempt_in_recommendation(self):self.reject(lambda c:c['recommendation']['assetKeys'].append('player-back-v3'))
    def test_historical_sha_not_relabelled(self):self.reject(lambda c:c['historicalCatalogMetadata'].update(baselineSHA=a.BASE))
    def test_lexical_escape_absolute_and_unlisted(self):
        for path in ('../AGENTS.md','/AGENTS.md','C:/secret','docs\\secret','missing.png'):
            with self.subTest(path=path),self.assertRaises(ValueError):a.canonical_path(a.REPO,path,{path} if path!='missing.png' else set())
    def test_actual_reparse_escape(self):
        # Fresh TEST-only local fixture. Its junction is removed nonrecursively before fixture cleanup.
        with tempfile.TemporaryDirectory(prefix='art-adoption-guard-') as temp:
            root=Path(temp);allowed=root/'allowed';outside=root/'outside';allowed.mkdir();outside.mkdir();(outside/'a.png').write_bytes(b'fixture')
            link=allowed/'link'
            try:os.symlink(outside,link,target_is_directory=True)
            except OSError:
                subprocess.run(['powershell','-NoProfile','-Command','New-Item -ItemType Junction -Path "'+str(link)+'" -Target "'+str(outside)+'" | Out-Null'],check=True,capture_output=True)
            try:
                self.assertTrue(link.exists())
                with self.assertRaises(ValueError):a.canonical_path(allowed,'link/a.png',{'link/a.png'})
            finally:
                if link.is_symlink():link.unlink()
                else:os.rmdir(link)
    def test_svg_external_script_events_and_entities(self):
        row=next(x for x in self.c['resources'] if x['kind']=='registeredSVG');raw=a.blob(a.REPO,row['repositoryPath']);allowed={x['repositoryPath'] for x in self.c['resources'] if x['kind']=='raster'}
        mutations=[raw.replace(b'../assets/',b'https://example.invalid/'),raw.replace(b'</svg>',b'<script>alert(1)</script></svg>'),raw.replace(b'<image ',b'<image onload="alert(1)" '),b'<!DOCTYPE svg>'+raw]
        for evil in mutations:
            with self.subTest(evil=evil[:80]),self.assertRaises(ValueError):a.svg_info(evil,row['repositoryPath'],allowed)
    def test_png_bad_crc_and_wrapper_fake_resolution(self):
        row=next(x for x in self.c['resources'] if x['kind']=='raster');raw=bytearray(a.blob(a.REPO,row['repositoryPath']));raw[50]^=1
        with self.assertRaises(ValueError):a.png_info(bytes(raw))
        self.reject(lambda c:next(x for x in c['resources'] if x['kind']=='registeredSVG').update(nativePixels=[1536,1920]))
    def test_unapplied_patch_only_19_digests(self):
        import difflib
        patch=(a.HERE/'catalog-rebind-proposal.patch').read_text('utf-8');changes=json.loads((a.HERE/'metadata-discrepancies.json').read_text('utf-8'))['items']
        minus=[x for x in patch.splitlines() if x.startswith('-') and not x.startswith('---')];plus=[x for x in patch.splitlines() if x.startswith('+') and not x.startswith('+++')]
        self.assertEqual((len(minus),len(plus)),(19,19));self.assertTrue(all('"sha256"' in x for x in minus+plus))
        self.assertEqual({x.split('"')[3] for x in minus},{x['oldSha256'] for x in changes});self.assertEqual({x.split('"')[3] for x in plus},{x['proposedSha256'] for x in changes})
        self.assertEqual(a.blob(a.REPO,a.CATALOG),a.git(a.REPO,'cat-file','blob','HEAD:'+a.CATALOG))
    def test_derived_lossless_edges_and_no_orphans(self):
        m=json.loads((a.HERE/'derived-manifest.json').read_text('utf-8'))['files'];self.assertEqual(len(m),24)
        self.assertEqual({x.name for x in (a.HERE/'derived').iterdir()},{Path(x['path']).name for x in m})
        for x in m:
            self.assertEqual(a.sha((a.HERE/x['path']).read_bytes()),x['sha256'])
            if 'EDGE' in x['kind']:self.assertTrue(x['path'].endswith('.png'));self.assertEqual(x['metadata']['filter'],'NEAREST')
    def test_support_edge_crop_contains_actual_opaque_support(self):
        manifest=json.loads((a.HERE/'derived-manifest.json').read_text('utf-8'))['files'];rows={x['key']:x for x in self.c['resources']}
        for entry in (x for x in manifest if 'EDGE' in x['kind']):
            row=rows[entry['sourceKeys'][0]];source=a.rgba(a.REPO,row);box=entry['metadata']['nativeCropBoxes'][1]
            self.assertTrue(0<=box[0]<box[2]<=source.width and 0<=box[1]<box[3]<=source.height)
            self.assertGreaterEqual(source.getpixel((box[0]+48,box[1]+48))[3],128,row['key']+' support crop must not select air between separated limbs')
    def test_http_exact_bytes_allowlist_and_write_denial(self):
        server=ReadOnlyReviewServer(('127.0.0.1',0),make_handler(a.REPO,a.HERE));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        def request(method,path,host=None):
            con=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=20);con.request(method,path,headers={'Host':host} if host else {});r=con.getresponse();body=r.read();status=r.status;headers=dict(r.getheaders());con.close();return status,body,headers
        try:
            status,body,headers=request('GET','/');self.assertEqual(status,200);self.assertIn(b'ART-WORLD-ASSET-ADOPTION-PREP-001',body);self.assertIn("default-src 'none'",headers['Content-Security-Policy'])
            for row in (self.c['resources'][0],next(x for x in self.c['resources'] if x['kind']=='registeredSVG')):
                status,body,_=request('GET','/source/'+row['repositoryPath']);self.assertEqual(status,200);self.assertEqual(a.sha(body),row['sha256'])
            for path in ('/.git/config','/../AGENTS.md','/%2e%2e/AGENTS.md','/source/'+a.DESIGN+'prototype/ui.js','/asset_review.py','/source/'+a.DESIGN+'editable/assets/player-back-v3.png'):
                self.assertEqual(request('GET',path)[0],404)
            self.assertEqual(request('GET','/',host='evil.invalid')[0],403)
            for method in ('POST','PUT','PATCH','DELETE'):self.assertEqual(request(method,'/')[0],405)
        finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main(verbosity=2)
