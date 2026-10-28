"""Loopback GET/HEAD-only review. No directory listing, export, upload, external resources."""
import argparse, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'")
        self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store');super().end_headers()
    def do_POST(self):self.send_error(405,'Read-only')
    do_PUT=do_POST;do_DELETE=do_POST;do_PATCH=do_POST
    def list_directory(self,path):self.send_error(403,'No directory listing');return None
    def send_head(self):
        raw=unquote(urlsplit(self.path).path)
        if '\\' in raw or '..' in raw.split('/') or ':' in raw or any(s.startswith('.') for s in raw.split('/') if s):self.send_error(403,'Path rejected');return None
        p=Path(self.directory)/raw.lstrip('/')
        if not p.resolve().is_relative_to(Path(self.directory).resolve()):self.send_error(403,'Path escape');return None
        return super().send_head()
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--port',type=int,default=8768);a=p.parse_args()
    root=Path(a.root).resolve();print(f'Read-only review: http://127.0.0.1:{a.port}/readiness-001/review/index.html',flush=True)
    ThreadingHTTPServer(('127.0.0.1',a.port),functools.partial(Handler,directory=str(root))).serve_forever()
