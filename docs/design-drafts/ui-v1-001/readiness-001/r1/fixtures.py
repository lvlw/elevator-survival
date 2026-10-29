"""Reproducible SVG-content fixtures; copies existing TEST bytes, creates no art."""
import copy, hashlib, json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
N = HERE.parent
D = N.parent

def sha(data):
    return hashlib.sha256(data).hexdigest()

def prepare():
    out = HERE / 'fixtures'
    out.mkdir(exist_ok=True)
    bandage = json.loads((N / 'theme/bandage-test.json').read_text('utf-8'))
    original = (D / bandage['resources'][0]['path']).read_text('utf-8')
    matrix = re.search(r'values="([^"]+)"', original).group(1).split()
    def values(parts):
        return re.sub(r'values="[^"]+"', 'values="' + ' '.join(parts) + '"', original)
    image = re.search(r'<image\b[^>]+/>', original).group(0)
    # A different existing PNG, not a newly generated picture.
    cat = json.loads((N / 'theme/catalog.json').read_text('utf-8'))
    other = next(r for r in cat['resources'] if r['pixels'] == bandage['resources'][0]['pixels'] and r['sha256'] != bandage['resources'][0]['sourceSha256'])
    import base64
    wrong = 'data:image/png;base64,' + base64.b64encode((D / other['path']).read_bytes()).decode()
    variants = [
        ('image-width', original.replace('<image width="512"', '<image width="1"'), 'SVG_CONTENT_GEOMETRY'),
        ('image-height', original.replace('<image width="512" height="512"', '<image width="512" height="1"'), 'SVG_CONTENT_GEOMETRY'),
        ('image-missing', original.replace(image, ''), 'SVG_IMAGE_COUNT'),
        ('image-duplicate', original.replace(image, image + image), 'SVG_IMAGE_COUNT'),
        ('embedded-source', re.sub(r'href="[^"]+"', 'href="' + wrong + '"', original), 'EMBEDDED_SOURCE'),
        ('matrix-nan', values(['NaN'] + matrix[1:]), 'FILTER_ALPHA'),
        ('matrix-infinite', values(['Infinity'] + matrix[1:]), 'FILTER_ALPHA'),
        ('matrix-range', values(['2'] + matrix[1:]), 'FILTER_ALPHA'),
        ('matrix-short', values(matrix[:-1]), 'FILTER_ALPHA'),
        ('matrix-alpha', values(matrix[:18] + ['0', '0']), 'FILTER_ALPHA'),
        ('matrix-type', original.replace('type="matrix"', 'type="saturate"'), 'FILTER_TYPE'),
        ('matrix-missing', re.sub(r'<feColorMatrix\b[^>]+/>', '', original), 'FILTER_COUNT'),
        ('root-viewbox', original.replace('viewBox="0 0 512 512"', 'viewBox="0 0 1 1"'), 'SVG_DIMENSIONS'),
        ('doctype', '<!DOCTYPE svg>' + original, 'SVG_ENTITY'),
    ]
    cases = []
    for group in ['bandage', 'porter', 'frame']:
        cases.append({'id': 'valid-' + group, 'group': group, 'expected': 'ACCEPT', 'manifest': '../../theme/' + group + '-test.json', 'root': 'baseline'})
    for name, text, expected in variants:
        assert text != original, name
        candidate = copy.deepcopy(bandage)
        data = text.encode('utf-8')
        candidate['resources'][0]['sha256'] = sha(data)
        folder = out / name
        asset = folder / candidate['resources'][0]['path']
        asset.parent.mkdir(parents=True, exist_ok=True)
        asset.write_bytes(data)
        (folder / 'theme.json').write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        cases.append({'id': name, 'group': 'bandage', 'expected': expected, 'manifest': name + '/theme.json', 'root': name, 'svgSha256': sha(data)})
    (out / 'cases.json').write_text(json.dumps(cases, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return cases

if __name__ == '__main__':
    print(json.dumps({'cases': len(prepare()), 'output': str(HERE / 'fixtures')}))
