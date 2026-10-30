"""Audit/reference existing assets only. Does not create, rewrite or copy image files."""
from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[4]
out = Path(__file__).resolve().parent
design = root / 'docs/design-drafts/ui-v1-001'
catalog_path = design / 'readiness-001/theme/catalog.json'
registration_path = design / 'spec/registered-art.json'
catalog = json.loads(catalog_path.read_text('utf-8'))
registered = json.loads(registration_path.read_text('utf-8'))
resources = {r['key']: r for r in catalog['resources']}
phases = {'healthy': 'pristine', 'wounded': 'wounded', 'severely-wounded': 'heavy-wounded',
          'critical': 'critical', 'incapacitated': 'disabled'}

def digest(path):
    data = path.read_bytes()
    rel = path.relative_to(root).as_posix()
    blob = subprocess.check_output(['git', 'rev-parse', '723d547665298463ecd8a8d04c7ed508a1658dc1:' + rel], cwd=root).decode().strip()
    return {'path': rel, 'sha256': hashlib.sha256(data).hexdigest(), 'gitBlobAtBase': blob}

rows = []
for enemy in ['orderly', 'porter', 'technician']:
    for phase, suffix in phases.items():
        key = ('enemy-infected-orderly-' if enemy == 'orderly' else 'enemy-' + enemy + '-') + suffix
        resource = resources[key]
        image = design / resource['path']
        registration = registered[image.name]
        assert image.is_file() and not image.is_symlink()
        assert hashlib.sha256(image.read_bytes()).hexdigest() == resource['sha256'] == registration['sourceSha256']
        assert registration['canvas'] == resource['canvas']
        assert registration['footNormalized'] == resource['foot'] and registration['hitNormalized'] == resource['hit']
        assert resource['status'] == 'REVIEW_ONLY'
        rows.append({'visualKey': 'infected-' + enemy, 'enemyStage': phase, 'themeResourceKey': key,
                     'asset': digest(image), 'nativePixels': resource['pixels'], 'format': resource['format'],
                     'alpha': resource['alpha'], 'resourceStatus': resource['status'],
                     'registrationFile': registration_path.relative_to(root).as_posix(), 'registrationKey': image.name,
                     'registration': registration, 'artGate': 'INCOMPLETE_ART', 'productionBinding': 'NOT_IMPLEMENTED',
                     'nativeActiveReachability': 'UNREACHABLE_CURRENT_EVEN_DAMAGE_CONTENT' if phase == 'incapacitated' else 'NATIVE_QUERY_TESTED'})
assert len(rows) == 15
result = {'status': 'REVIEW_CANDIDATE', 'baseSHA': '723d547665298463ecd8a8d04c7ed508a1658dc1',
          'themeStatus': catalog['metadata']['status'], 'evidence': [digest(catalog_path), digest(registration_path)],
          'querySources': [digest(root / 'src/core/combat/combat-selectors.ts')],
          'phaseSemantics': 'Select the formal enemyStage directly. Incapacitated does not decide actual death.',
          'sourceBytesAndRegistrationVerified': True, 'pixelVisualQualityReviewed': False, 'bindings': rows}
(out / 'ASSET-BINDING-CANDIDATE.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': 'PASS', 'bindings': len(rows), 'imagesCopied': 0, 'artStatus': 'INCOMPLETE_ART'}))
