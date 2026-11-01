"""Read-only loopback review. Exposes explicit candidate files, never the repository root."""
import argparse, json, mimetypes, os, socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
from asset_review import BASE, HERE, REPO, blob, canonical_path, sha, validate

def make_handler(repo, review):
    candidate=json.loads((review/'candidate-bindings.json').read_text('utf-8'));validate(candidate,repo)
    sources={x['repositoryPath']:x for x in candidate['resources'] if x['kind'] in ('raster','registeredSVG')}
    own={'index.html','review.css','review.js','review-data.json','owner-recommendation.json','OWNER-REVIEW.md','PIXEL-REVIEW.md','C2-CONTRACT-DRAFT.md','OPEN-GATES.md'}
    derived=json.loads((review/'derived-manifest.json').read_text('utf-8'))['files']
    own.update(x['path'] for x in derived)
    verified_own={}
    for relative in own:
        file=canonical_path(review,relative,own);raw=file.read_bytes()
        record=next((x for x in derived if x['path']==relative),None)
        if record and sha(raw)!=record['sha256']:raise ValueError('derived digest differs')
        verified_own['/'+relative]=(raw,mimetypes.guess_type(relative)[0] or 'application/octet-stream')
    class Handler(BaseHTTPRequestHandler):
        server_version='AssetReviewReadOnly/1'
        def do_GET(self): self.read(False)
        def do_HEAD(self): self.read(True)
        def read(self,head):
            if self.headers.get('Host') not in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'):
                self.send_error(403);return
            parsed=urlsplit(self.path);path=unquote(parsed.path)
            if parsed.query or parsed.fragment or '\\' in path or '\0' in path:
                self.send_error(404);return
            if path=='/':path='/index.html'
            if path in verified_own:raw,mime=verified_own[path]
            elif path.startswith('/source/') and path[8:] in sources:
                record=sources[path[8:]];raw=blob(repo,record['repositoryPath'])
                if sha(raw)!=record['sha256']:self.send_error(409);return
                mime='image/png' if record['kind']=='raster' else 'image/svg+xml'
            else:self.send_error(404);return
            self.send_response(200);self.send_header('Content-Type',mime+('; charset=utf-8' if mime.startswith('text/') or mime in ('application/json','application/javascript') else ''))
            self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','no-referrer')
            self.send_header('Content-Security-Policy',"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'")
            self.end_headers()
            if not head:self.wfile.write(raw)
        def deny(self):self.send_error(405,'Read-only review; writes unavailable')
        do_POST=do_PUT=do_PATCH=do_DELETE=do_OPTIONS=deny
    Handler.snapshot_receipt={'sourceCommit':BASE,'pid':os.getpid(),
        'serverScriptSHA256':sha(Path(__file__).read_bytes()),'assetReviewScriptSHA256':sha((HERE/'asset_review.py').read_bytes()),
        'servedOwnFiles':{path:sha(raw) for path,(raw,mime) in verified_own.items()},
        'servedSourceFiles':{path:row['sha256'] for path,row in sources.items()}}
    return Handler

class ReadOnlyReviewServer(ThreadingHTTPServer):
    allow_reuse_address=False
    def server_bind(self):
        if hasattr(socket,'SO_EXCLUSIVEADDRUSE'):self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
        super().server_bind()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--repo',type=Path,default=REPO);p.add_argument('--port',type=int,default=8871);p.add_argument('--receipt',type=Path);args=p.parse_args()
    handler=make_handler(args.repo,HERE);server=ReadOnlyReviewServer(('127.0.0.1',args.port),handler)
    if args.receipt:args.receipt.write_text(json.dumps(handler.snapshot_receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'READ-ONLY STATIC CANDIDATE http://127.0.0.1:{args.port}/ source={BASE}',flush=True)
    server.serve_forever()
