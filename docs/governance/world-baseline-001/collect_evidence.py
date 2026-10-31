"""Build a provenance index, without converting successors or CI into earlier approvals."""
from pathlib import Path
import hashlib
import json
import subprocess
from governance_checks import BASE, DOCS

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent

def git(*args):
    return subprocess.check_output(['git', '-c', 'core.quotepath=false', *args], cwd=root).decode('utf-8').strip()

def source(path, level, extent):
    file = root / path
    data = file.read_bytes()
    value = {'path': path, 'level': level, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
             'readExtent': extent, 'isNewIndependentAudit': False}
    try:
        if path.startswith(DOCS):
            value['gitBlobAtBase'] = None
            return value
        value['gitBlobAtBase'] = git('rev-parse', BASE + ':' + path)
    except subprocess.CalledProcessError:
        value['gitBlobAtBase'] = None
    return value

# Task/commit boundaries are explicit historical batches, not inferred acceptance from branch names.
plans = [
 ('ENG-MISSION-LIFECYCLE-001','6b48b3d','d1d3b79','docs/engineering/mission-lifecycle-001','d1d3b79','具体委托身份与关闭资格纯核心'),
 ('ENG-RESIDENCE-ENERGY-CYCLE-001 + R1','9dfe21e','942b2d9','docs/engineering/residence-foundation/g1','942b2d9','G1 精力与周期；R1 关闭 view 进入执行计划缺口'),
 ('ENG-RESIDENCE-LOCATION-001','942b2d9','d7953bb','docs/engineering/residence-foundation/g2','d7953bb','G2 连续位置与最小持久现场'),
 ('ENG-RESIDENCE-SESSION-RESTORE-001','d7953bb','60e9c30','docs/engineering/residence-foundation/g3','60e9c30','G3 headless 候选恢复与唯一 current'),
 ('ENG-RESIDENCE-ACTIONS-001','60e9c30','7ca547a','docs/engineering/residence-foundation/g4','7ca547a','G4 初配、首次出发和限定驻留动作'),
 ('ENG-RESIDENCE-TERMINAL-001','6438f7a','bfc6bd9','docs/engineering/residence-foundation/terminal-core','bfc6bd9','纯终局四结果与完整计划'),
 ('ENG-RESIDENCE-TERMINAL-RESTORE-001','bfc6bd9','b9b1e0f','docs/engineering/residence-foundation/terminal-restore','b9b1e0f','严格 v2 聚合与候选外 expected'),
 ('ENG-RESIDENCE-TERMINAL-SESSION-001','b9b1e0f','0921df3','docs/engineering/residence-foundation/terminal-session','0921df3','终局唯一 current 与保存故障'),
 ('ENG-RESIDENCE-CONTENT-SUPPLY-001','ad56a7d','8c19ca0','docs/engineering/residence-foundation/content-supply-core','8c19ca0','E01-P 任务、来源份额、药食与维护生产者'),
 ('ENG-RESIDENCE-CONTENT-SUPPLY-RESTORE-001 + R1','8c19ca0','84eb6df','docs/engineering/residence-foundation/content-supply-restore','84eb6df','E01-R v3；R1 历史流血/休整来源约束'),
 ('ENG-RESIDENCE-CONTENT-SUPPLY-SESSION-001','84eb6df','9c3c8a8','docs/engineering/residence-foundation/content-supply-session','9c3c8a8','E01-S 真实来源完整提交与只保存重试'),
 ('ENG-RESIDENCE-COMBAT-CORE-001 + R1/R2','4166fb2','9ada1bd','docs/engineering/residence-foundation/active-combat-core','9ada1bd','E02-P CTB、typed death；R1/R2 时序、trace 与维护修复'),
 ('ENG-RESIDENCE-COMBAT-RESTORE-001 + R1','9ada1bd','29a018a','docs/engineering/residence-foundation/active-combat-restore','29a018a','E02-R v4 与双方归零归档修复'),
 ('ENG-RESIDENCE-COMBAT-SESSION-001','29a018a','713dd37','docs/engineering/residence-foundation/active-combat-session','713dd37','E02-S 唯一 current、提交与 prepared/save 接缝'),
 ('ENG-WORLD-ROUTE-ACCEPTANCE-001 + R1 + budget','713dd37','7a3acd3','docs/engineering/world-integration/route-acceptance','7a3acd3','E03 TEST 四路线/72样本及默认预算欠账关闭'),
 ('DOC-WORLD-QUERY-001','7a3acd3','8cddbdc','docs/engineering/world-integration/player-query/adoption','8cddbdc','玩家查询合同技术归档，不是该时点查询生产实现'),
 ('ENG-WORLD-PLAYER-QUERY-001','8cddbdc','394f59d','docs/engineering/world-integration/player-query/implementation','394f59d','headless 玩家安全查询/opaque 选择；病程映射当时 unknown'),
 ('ENG-WORLD-PREPLAY-FOUNDATION-001 + R1','ff2b79f','bc60f24','docs/engineering/world-integration/preplay/foundation','bc60f24','D1 当前粗档、controller；R1 同源样本护具支付'),
 ('ENG-WORLD-BROWSER-OWNER-001','bc60f24','0ac23bc','docs/engineering/world-integration/preplay/browser-owner','0ac23bc','prepared 持久化、独占锁、真实冷恢复限定接缝'),
 ('ENG-WORLD-LOW-ASSET-UI-001 + R1','0ac23bc','6bb43c8','docs/engineering/world-integration/preplay/low-asset-ui','6bb43c8','DEV 低资产 UI 与 R1 作者补修；最终专项原件缺口'),
 ('WORLD-UI-DESIGN-001 + R1/R2','6bb43c8','956da80','docs/design-drafts/ui-v1-001','956da80','视觉设计模拟/候选素材；不是生产 UI 或正式美术'),
 ('WORLD-UI-VISUAL-READINESS-001 + repairs','956da80','723d547','docs/design-drafts/ui-v1-001/readiness-001','723d547','Readiness 限定关闭由后继授权承接；原专项报告缺口'),
 ('ENG-WORLD-PRESENTATION-PREP-001','723d547','a7f0f153','docs/engineering/world-integration/presentation-prep-001','a7f0f153','A 当前对手安全查询；B TEST研究、15槽准备，不实施 B/C'),
]
all_audits = list((root / 'docs').rglob('AUD-*.md'))
stages, sources = [], {}
for task, start, final, directory, prefix, scope in plans:
    start, final = git('rev-parse', start), git('rev-parse', final)
    author = root / directory / 'completion.md'
    if not author.exists() and prefix == 'a7f0f153':
        author = root / directory / 'FINAL-REPORT.md'
    audits = sorted(p for p in all_audits if p.name.startswith('AUD-' + prefix))
    if prefix == 'a7f0f153':
        audits = [out / 'inputs/inputs/AUD-a7f0f153-PRESENTATION-PREP-001-v1.0.md']
    evidence = []
    for path in audits:
        rel = path.relative_to(root).as_posix()
        entry = source(rel, 'MAINLINE_AUDIT_ORIGINAL', '结论、准确对象、适用范围和排除项定位；不重演该历史实审')
        text = path.read_text('utf-8')
        entry['conclusionExcerpt'] = '\n'.join(text.splitlines()[:10])
        entry['targetSHAReferenced'] = final in text
        evidence.append(entry); sources[rel] = entry
    author_record = None
    if author.exists():
        rel = author.relative_to(root).as_posix()
        author_record = source(rel, 'AUTHOR_EVIDENCE', '完成记录/失败与修订/检查边界定位；历史测试不计本轮新增')
        sources[rel] = author_record
    level = 'MAINLINE_AUDIT_ORIGINAL' if audits else 'HISTORICAL_REFERENCE_ONLY'
    gaps = []
    historical = []
    if not audits:
        gaps.append('未定位到该最终 SHA 的主线审查原件；不能从后继任务/CI推定本阶段完整 PASS')
        refs = {'6bb43c8': ['docs/design-drafts/ui-v1-001/inputs/SOURCE-BOUNDARIES.md'],
                '956da80': ['docs/design-drafts/ui-v1-001/00-owner-review.md'],
                '723d547': ['docs/engineering/world-integration/presentation-prep-001/inputs/AUTHORIZATION-AND-STATUS.md']}
        for rel in refs.get(prefix, []):
            item = source(rel, 'HISTORICAL_REFERENCE_ONLY', '后继引用/作者状态，不冒充缺失的专项审查原件')
            historical.append(item); sources[rel] = item
    stages.append({'taskID': task, 'startSHA': start, 'finalSHA': final,
                   'parentSHA': git('rev-parse', final + '^'), 'tree': git('rev-parse', final + '^{tree}'),
                   'scope': scope, 'evidenceLevel': level, 'mainlineOriginals': evidence, 'authorReport': author_record,
                   'historicalReferences': historical, 'gaps': gaps,
                   'remainingGates': ['各报告范围外内容保持原门槛', '不等于 Owner体验、全平台或公开发布批准'],
                   'reexecutedHistoricalAcceptance': False})

approvals = [
 ('DEC-049','DOC-WORLD-ENTRY-001','ecd8fc3','6b48b3d','docs/design-drafts/world-infected-001/reviews/input-doc-world-entry-001/OWNER-approval-WORLD-ENTRY-001-v1.0.md','身份/连续驻留/关闭资格局部规则'),
 ('DEC-050','DOC-WORLD-ENTRY-002','8245cc6','9dfe21e','docs/design-drafts/world-infected-001/entry-002/adoption/inputs/OWNER-approval-WORLD-ENTRY-002-ADOPTION-v1.0.md','O1/O2与批准参数；O3保留'),
 ('DEC-051','DOC-WORLD-ENTRY-003','c67fd41','6438f7a','docs/design-drafts/world-infected-001/entry-003/adoption/inputs/OWNER-approval-WORLD-ENTRY-003-ADOPTION-v1.0.md','四终局、成功120/初始0/上限试用与奖励容量策略'),
 ('DEC-052','DOC-WORLD-ENTRY-004','612ac66','ad56a7d','docs/design-drafts/world-infected-001/entry-004/adoption/inputs/OWNER-approval-WORLD-ENTRY-004-ADOPTION-v1.0.md','D01—D04批准子集、103项试用、五图/三专长/初配；不另送初粮'),
 ('DEC-053','DOC-WORLD-ENTRY-006','20b833a','ff2b79f','docs/design-drafts/world-infected-001/entry-006/adoption/inputs/OWNER-approval-WORLD-ENTRY-006-v1.0.md','D1当前粗档/D2显式DEV；隐藏医疗unknown/O3排除'),
]
formal = []
for decision, task, start, final, path, scope in approvals:
    record = source(path, 'FORMAL_APPROVAL', '批准记录全文；原话/转录身份按原件说明，不称新增亲签证明')
    sources[path] = record
    formal.append({'decision': decision, 'taskID': task, 'startSHA': git('rev-parse', start), 'finalSHA': git('rev-parse', final),
                   'scope': scope, 'source': record, 'doesNotApproveWholeDraftOrPublication': True})

# Keep adverse originals visible. Later PASS never rewrites the old verdict.
adverse = []
for prefix in ['9bbf5aa','8512c99','55fbf0f','2e3d13a','0e0c5cf','2258e1b','de8f358']:
    for path in all_audits:
        if path.name.startswith('AUD-' + prefix):
            rel = path.relative_to(root).as_posix()
            item = source(rel, 'MAINLINE_AUDIT_ORIGINAL', '历史未通过/修订结论定位；保持原时点')
            item['conclusionExcerpt'] = '\n'.join(path.read_text('utf-8').splitlines()[:10])
            adverse.append(item); sources[rel] = item

technical = []
for rel, scope in [
    ('docs/design-drafts/world-infected-001/entry-005/adoption/inputs/MAINLINE-technical-ratification-WORLD-ENTRY-005-v1.0.md', 'E02 已有战斗规则技术归档；不新增玩法批准'),
    ('docs/engineering/world-integration/player-query/adoption/inputs/MAINLINE-WORLD-QUERY-001-ratification-v1.0.md', '玩家查询技术合同采纳；不公开隐藏数据'),
    ('docs/design-drafts/world-infected-001/entry-006/adoption/inputs/MAINLINE-WORLD-ENTRY-006-ratification-v1.0.md', 'D1/D2 批准范围的技术采纳；O3排除'),
]:
    item = source(rel, 'FORMAL_APPROVAL', '技术 ratification 的对象/边界；不是新增 Owner 玩法批准')
    sources[rel] = item
    technical.append({'authority': 'MAINLINE_TECHNICAL_RATIFICATION', 'scope': scope, 'source': item})

result = {'status': 'GOVERNANCE_INDEX_NOT_NEW_APPROVAL', 'baseSHA': BASE,
          'levels': ['FORMAL_APPROVAL','MAINLINE_AUDIT_ORIGINAL','HISTORICAL_REFERENCE_ONLY','AUTHOR_EVIDENCE','CURRENT_EXECUTION','NOT_RUN','NOT_VERIFIED'],
          'formalApprovals': formal, 'technicalRatifications': technical, 'implementationStages': stages, 'historicalAdverseOrPartialOriginals': adverse,
          'missingAuditOriginalsAreNotNewBlockersByInference': True,
          'A_review_evidence_zip': 'NOT_RECEIVED_THIS_TASK; only supplied MD original archived and verified',
          'currentExecution': 'See verification-results.json and external raw receipts; no new game tests'}
(out / 'review-evidence-index.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
extra = ['AGENTS.md','package.json','package-lock.json','docs/01-game-design-v0.1.md','docs/02-vertical-slice.md',
         'docs/03-architecture.md','docs/05-design-decisions.md','docs/09-ui-design-record.md',
         'docs/content/infected-world-entry-content-v0.1.json','docs/content/infected-world-entry-test-config-v0.1.json',
         'docs/content/infected-residence-core-test-config-v0.1.json','docs/content/infected-terminal-core-test-config-v0.1.json',
         'src/ui/infected-world/components/battle-stage.tsx',
         'docs/engineering/world-integration/presentation-prep-001/B-COMMITTED-PRESENTATION-CANDIDATE.md']
for rel in extra:
    sources[rel] = source(rel, 'CURRENT_EXECUTION', '当前适用章节/结构读取与准确基线对象核对；不是本轮完整源码重新实审')
(out / 'source-index.json').write_text(json.dumps({'baseSHA': BASE, 'sources': list(sources.values()),
          'limits': '原件路径、字节和Git对象已核对；历史报告按结论/对象/范围索引，不将各历史测试累加成当前验收。'}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'stages': len(stages), 'approvals': len(formal), 'sourceFiles': len(sources),
                  'stagesWithoutFinalAuditOriginal': [s['taskID'] for s in stages if s['gaps']]}, ensure_ascii=False))
