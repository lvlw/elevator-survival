"""Read-only raster/header/vector/source inventory. No rendering, image editing or adoption."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import struct
import subprocess
import xml.etree.ElementTree as ET
import zlib
from governance_checks import BASE, blob, safe_path

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
design = root / 'docs/design-drafts/ui-v1-001'
catalog = json.loads((design / 'readiness-001/theme/catalog.json').read_text('utf-8'))
manifest = json.loads((design / 'spec/asset-manifest.json').read_text('utf-8'))
registration = json.loads((design / 'spec/registered-art.json').read_text('utf-8'))
bindings = json.loads((root / 'docs/engineering/world-integration/presentation-prep-001/ASSET-BINDING-CANDIDATE.json').read_text('utf-8'))
by_file = {row['file']: row for row in manifest}
issues = []

def record(path):
    if path.is_symlink() or not path.resolve().is_relative_to(design.resolve()):
        raise ValueError('Asset reference escapes the existing design directory')
    data = path.read_bytes()
    relative = path.relative_to(root).as_posix()
    expected_blob = subprocess.check_output(['git', 'rev-parse', BASE + ':' + relative], cwd=root).decode().strip()
    committed = subprocess.check_output(['git', 'show', BASE + ':' + relative], cwd=root)
    actual_blob = blob(data)
    return {'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'gitBlobAtBase': expected_blob, 'worktreeBlob': actual_blob, 'exactBlobMatches': actual_blob == expected_blob,
            'committedSha256': hashlib.sha256(committed).hexdigest(),
            'checkoutEOLOnly': data != committed and data.replace(b'\r\n', b'\n') == committed.replace(b'\r\n', b'\n')}

def png_metadata(data):
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Not PNG')
    cursor, color, transparent, dims = 8, None, False, None
    while cursor < len(data):
        size = struct.unpack('>I', data[cursor:cursor+4])[0]
        kind = data[cursor+4:cursor+8]
        content = data[cursor+8:cursor+8+size]
        crc = struct.unpack('>I', data[cursor+8+size:cursor+12+size])[0]
        if zlib.crc32(kind + content) & 0xffffffff != crc:
            raise ValueError('PNG CRC mismatch')
        if kind == b'IHDR':
            w, h, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', content)
            dims = [w, h]
        transparent = transparent or kind == b'tRNS'
        cursor += size + 12
        if kind == b'IEND':
            break
    return {'nativePixels': dims, 'pngColorType': color, 'alphaCapability': color in (4, 6) or transparent, 'chunkCRC': 'PASS'}

rasters = []
for item in catalog['resources']:
    safe_path(item['path'])
    path = design / item['path']
    row = {**record(path), 'key': item['key'], 'status': item['status'], 'category': item['category'],
           'catalogSha256': item['sha256'], 'catalogPixels': item['pixels'], 'catalogAlpha': item['alpha'],
           'presentationCanvas': item.get('canvas'), **png_metadata(path.read_bytes()),
           'declaredNodes': item.get('dependencies', {}).get('nodes', [])}
    source = by_file[item['path']]
    row['manifestMatches'] = row['sha256'] == source['sha256'] and row['nativePixels'] == source['sourcePixels'] and row['alphaCapability'] == source['alpha']
    row['catalogMatches'] = row['sha256'] == item['sha256'] and row['nativePixels'] == item['pixels'] and row['alphaCapability'] == item['alpha']
    if not row['exactBlobMatches'] or not row['manifestMatches'] or not row['catalogMatches']:
        issues.append({'key': item['key'], 'issue': 'RASTER_METADATA_OR_OBJECT_MISMATCH'})
    rasters.append(row)

vectors, components = [], []
for item in catalog['vectors']:
    path = design / safe_path(item['path'])
    row = {**record(path), 'key': item['key'], 'declaredStatus': item['status'], 'catalogSha256': item['sha256']}
    row['catalogSourceHashMatches'] = row['sha256'] == item['sha256']
    if path.suffix == '.svg':
        svg = ET.fromstring(path.read_bytes())
        row['wrapperDimensions'] = {'width': svg.attrib.get('width'), 'height': svg.attrib.get('height'), 'viewBox': svg.attrib.get('viewBox')}
        row['imageReferences'] = [v for e in svg.iter() for k, v in e.attrib.items() if k.split('}')[-1] == 'href']
        row['declaredReferencesMatch'] = sorted(row['imageReferences']) == sorted(item['hrefs'])
        row['referencedFilesExist'] = all((path.parent / href).resolve().is_relative_to(design.resolve()) and (path.parent / href).is_file() for href in item['hrefs'])
        vectors.append(row)
    else:
        row['sourceAnchor'] = item['sourceAnchor']
        row['anchorFound'] = item['sourceAnchor'] in path.read_text('utf-8')
        components.append(row)
    if row['checkoutEOLOnly'] and row['catalogSourceHashMatches']:
        issues.append({'key': item['key'], 'issue': 'CATALOG_HASH_BOUND_TO_CHECKOUT_CRLF_NOT_COMMITTED_LF', 'path': row['path']})
    elif not row['catalogSourceHashMatches'] or not row['exactBlobMatches']:
        issues.append({'key': item['key'], 'issue': 'CATALOG_CODE_OR_VECTOR_SOURCE_DIGEST_STALE', 'path': row['path']})
slots = []
for binding in bindings['bindings']:
    asset = next(r for r in rasters if r['path'] == binding['asset']['path'])
    reg = registration[binding['registrationKey']]
    matches = asset['sha256'] == binding['asset']['sha256'] == reg['sourceSha256'] and asset['nativePixels'] == reg['source']
    slots.append({'visualKey': binding['visualKey'], 'enemyStage': binding['enemyStage'], 'resourceKey': binding['themeResourceKey'],
                  'path': asset['path'], 'registrationKey': binding['registrationKey'], 'registrationMatches': matches,
                  'nativePixels': asset['nativePixels'], 'registeredCanvas': reg['canvas'],
                  'status': 'REVIEW_ONLY / INCOMPLETE_ART', 'pixelVisualReview': 'NOT_RUN'})
    if not matches:
        issues.append({'key': binding['themeResourceKey'], 'issue': 'STAGE_REGISTRATION_MISMATCH'})
history = (design / '00-owner-review.md').read_text('utf-8')
result = {'status': 'REFERENCE_METADATA_CHECKED_NOT_ART_APPROVAL' if not issues else 'PARTIAL_METADATA_DISCREPANCIES',
          'baseSHA': BASE, 'counts': {'rasters': len(rasters), 'registeredSVG': len(vectors), 'codeComponents': len(components), 'enemyStageSlots': len(slots)},
          'rasters': rasters, 'registeredVectors': vectors, 'codeComponents': components, 'enemyStageSlots': slots,
          'categoryCounts': dict(Counter(r['category'] for r in rasters)),
          'sharedBackgroundResources': [r for r in rasters if r['category'] == 'background' and len(r['declaredNodes']) > 1],
          'issues': issues, 'pixelReview': 'NOT_RUN', 'alphaEdgeOrCompositeReview': 'NOT_RUN', 'browserReview': 'NOT_RUN', 'artApproved': False,
          'historicalUnadopted': {'source': 'docs/design-drafts/ui-v1-001/00-owner-review.md',
                                 'background1448x1086': 'AUTHOR_RECORD_REJECTED_NOT_ADOPTED', 'playerV3Cleanup': 'AUTHOR_RECORD_REJECTED_NOT_ADOPTED'},
          'gatesRetained': ['18 backgrounds native 2x', 'final subject alpha cleanup', 'Owner visual acceptance', 'production C integration']}
assert result['counts'] == {'rasters': 64, 'registeredSVG': 17, 'codeComponents': 5, 'enemyStageSlots': 15}
(out / 'asset-status.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'status': result['status'], 'counts': result['counts'], 'issues': issues, 'artApproved': False}, ensure_ascii=False))
