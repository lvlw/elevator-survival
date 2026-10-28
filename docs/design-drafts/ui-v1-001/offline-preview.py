"""Read-only loopback review. Python standard library; no download, save, or game access."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT = Path(__file__).resolve().parent

class ReviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        target = (ROOT / unquote(urlsplit(self.path).path).lstrip('/')).resolve()
        if not target.is_relative_to(ROOT):
            self.send_error(403)
            return
        super().do_GET()

    def do_POST(self):
        self.send_error(405, 'Read-only review server')

    def end_headers(self):
        self.send_header('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'self'")
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8767)
    args=parser.parse_args()
    print(f'Read-only UI review: http://127.0.0.1:{args.port}/offline-index.html',flush=True)
    print('Stop: Ctrl+C in this terminal. Binds only to 127.0.0.1. No installation or external network required.',flush=True)
    try:
        ThreadingHTTPServer(('127.0.0.1',args.port),ReviewHandler).serve_forever()
    except KeyboardInterrupt:
        print('\nReview server stopped.')
