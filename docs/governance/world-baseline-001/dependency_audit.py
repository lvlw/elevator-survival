"""Analyze actual read-only npm outputs. An API failure is never zero vulnerabilities."""
from pathlib import Path
import json
import sys

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
evidence = Path(sys.argv[1]).resolve()
package = json.loads((root / 'package.json').read_text('utf-8'))
lock = json.loads((root / 'package-lock.json').read_text('utf-8'))
tree = json.loads((evidence / 'npm-ls-all.json').read_text('utf-8-sig'))

def load(name):
    return json.loads((evidence / name).read_text('utf-8-sig'))

def audit_record(label, filename, code_file):
    data = load(filename)
    exit_text = (evidence / code_file).read_text('utf-8-sig').strip()
    valid = isinstance(data.get('vulnerabilities'), dict) and isinstance(data.get('metadata'), dict)
    return {'command': label, 'exitReceipt': exit_text,
            'kind': 'VALID_AUDIT_RESULT' if valid else 'AUDIT_SERVICE_FAILURE',
            'resultFile': filename, 'metadata': data.get('metadata') if valid else None,
            'message': data.get('message'), 'advisories': data.get('vulnerabilities') if valid else None}

audits = [audit_record('npm audit --json', 'npm-audit-all-network.json', 'npm-audit-all-network-exit.txt'),
          audit_record('npm audit --omit=dev --json', 'npm-audit-runtime-network.json', 'npm-audit-runtime-network-exit.txt')]
chains = []
def walk(node, path):
    for name, dep in node.get('dependencies', {}).items():
        next_path = path + [name + '@' + str(dep.get('version', 'UNKNOWN'))]
        chains.append({'name': name, 'version': dep.get('version'), 'path': next_path,
                       'invalid': dep.get('invalid', False), 'missing': dep.get('missing', False)})
        walk(dep, next_path)
walk(tree, [package['name'] + '@' + package['version']])
direct = []
for field, kind in [('dependencies', 'runtime'), ('devDependencies', 'development/build/test')]:
    for name, declared in package[field].items():
        installed = tree.get('dependencies', {}).get(name, {}).get('version')
        entry = lock['packages'].get('node_modules/' + name, {})
        relevance = ('生产浏览器包的直接运行依赖；树中存在不等于存在可利用漏洞' if kind == 'runtime' else
                     '开发服务/本地或CI构建/测试工具；dev标志不等于零风险，未观察实际公开服务暴露')
        direct.append({'name': name, 'declaredRange': declared, 'installedVersion': installed, 'lockVersion': entry.get('version'),
                       'direct': True, 'dependencyClass': kind, 'lockDevFlag': entry.get('dev', False),
                       'actualDependencyPaths': [x['path'] for x in chains if x['name'] == name],
                       'relevance': relevance, 'advisorySource': 'NOT_AVAILABLE_FROM_FAILED_AUDIT',
                       'affectedPrerequisites': 'UNKNOWN', 'applicability': 'UNKNOWN',
                       'candidateFixedVersion': 'UNKNOWN; no advisory retrieved',
                       'changeCost': '需另行授权对版本/锁/构建及全量回归评估；本轮不升级'})
result = {'task': 'GOV-WORLD-BASELINE-001', 'status': 'PARTIAL_AUDIT_SERVICE_UNAVAILABLE',
          'auditCommands': audits, 'initialSandboxAttempts': 'Both preserved separately: exit1/EACCES',
          'registryUnchanged': True, 'actualAuditEndpoint': 'https://registry.npmmirror.com/-/npm/v1/security/advisories/bulk',
          'currentVulnerabilityCount': None, 'currentSeverityCounts': None,
          'historicalCIOnly': {'source': 'inputs/inputs/AUD-a7f0f153-PRESENTATION-PREP-001-v1.0.md section8',
                               'reportedCount': 7, 'moderate': 2, 'high': 5, 'packageNamesNotProvided': True,
                               'notAResultOfThisExecution': True},
          'localTree': {'command': 'npm ls --all --json', 'exit': 0, 'directPackages': direct,
                        'observedDependencyChains': chains},
          'limits': ['未取得有效新公告列表，不能指定七个包名或修复版本',
                     '未运行或观察对外服务；无法推定端口暴露或生产可利用性',
                     '无 audit fix、升级、换源配置、锁变更、额外扫描器或CI修改'],
          'nextAction': '单独授权的依赖核查应先明确可用审计来源，再取得逐项公告与依赖可达性；有真实结果后才提精确修复版本'}
(out / 'dependency-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'status': result['status'], 'directPackages': len(direct), 'chains': len(chains),
                  'currentVulnerabilityCount': None, 'mutations': 0}, ensure_ascii=False))
