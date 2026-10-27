"""Loopback-only authoring preview/export server. No game data or save access."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        name = self.path.removeprefix('/__design_export/')
        if not self.path.startswith('/__design_export/') or not re.fullmatch(r'P\d\d-[a-zA-Z0-9-]+-\d+x\d+\.(png|svg|json)', name):
            self.send_error(400); return
        size = int(self.headers.get('Content-Length', '0'))
        if size <= 0 or size > 30_000_000:
            self.send_error(413); return
        dest = ROOT / ('editable/screens' if name.endswith('.svg') else 'previews/screens') / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(self.rfile.read(size))
        self.send_response(201); self.end_headers(); self.wfile.write(b'created')

if __name__ == '__main__':
    print('Design authoring only: http://127.0.0.1:8766/prototype/index.html', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
