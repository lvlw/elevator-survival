# WORLD-ENTRY-005-R1 完整限定返修任务书 v1.0

## 0. 一次完成什么

修复WORLD-ENTRY-005设计验证中的F01逐分支原值/边界校验旁路与F02固定首场死亡锚误用，保持已批玩法和E02-P→R→S方向。一次完成复现、相邻检查、模型及合同同步、正反例/负控、冻结、原生观察、审计和普通commit/push。

不是生产工程、不重做世界或CTB引擎、不新增玩法采纳轮次。

仓库：`lvlw/elevator-survival`。
起始SHA：`df1c3ff6979703b72bf76d73761b3915e59eb5b2`。
起始父SHA：`9c3c8a8c97c374bd1def6217c691137f3df10096`。
起始tree：`6262d1aa53a8103f14b6e7e930af95f3bf17ad7d`。
受保护src tree：`10501d897195173df2023b1ebd73f9f097228512`。
分支：沿用`feature/design-world-entry-005`。

## 1. 附件与开工

由Codex定位用户直接附上的ZIP，在仓库外临时目录解压；Owner无需手动解压或填写路径。完整读取本任务书、审查报告、权限记录、BASELINE-AND-SCOPE、source及evidence；核对SHA256SUMS。

重新实查本机HEAD/branch/status/diff/cached diff和实际AGENTS。干净工作区且HEAD等于起始SHA才开始；已有无关改动或其他HEAD时停止报告，不reset/drop/覆盖。重新读取DEC-052及相关未覆盖CTB来源、entry-005的00—07/validation、已有P/R/S合同；以前会话推测不是事实。

这是设计返修，不强制把历史3621生产测试当本轮基线。必须先实际跑原有限106与原生23观察建立设计/探针基线；未跑全量npm仍写NOT RUN。

## 2. 精确白名单（最多36条）

下列是最大允许集合，不要求创建无用途文件；不授予整目录写权。

- `docs/design-drafts/world-infected-001/entry-005/00-owner-review.md`
- `docs/design-drafts/world-infected-001/entry-005/01-current-baseline-and-reuse.md`
- `docs/design-drafts/world-infected-001/entry-005/02-combat-lifecycle-and-order.md`
- `docs/design-drafts/world-infected-001/entry-005/03-single-truth-and-effects.md`
- `docs/design-drafts/world-infected-001/entry-005/04-active-combat-save-contract.md`
- `docs/design-drafts/world-infected-001/entry-005/05-approved-data-and-gaps.md`
- `docs/design-drafts/world-infected-001/entry-005/06-engineering-contracts.md`
- `docs/design-drafts/world-infected-001/entry-005/07-evidence-and-playtest-gates.md`
- `docs/design-drafts/world-infected-001/entry-005/validation/state-candidates.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/check.py`
- `docs/design-drafts/world-infected-001/entry-005/validation/cases.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/results.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/negative-controls.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/native-probe.test.ts`
- `docs/design-drafts/world-infected-001/entry-005/validation/vitest.probe.config.ts`
- `docs/design-drafts/world-infected-001/entry-005/validation/native-results.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/README.md`
- `docs/design-drafts/world-infected-001/entry-005/completion.md`
- `docs/design-drafts/world-infected-001/entry-005/checks.json`
- `docs/design-drafts/world-infected-001/entry-005/frozen-manifest.json`
- `docs/design-drafts/world-infected-001/01-world-overview.md`
- `docs/design-drafts/world-infected-001/10-decision-queue.md`
- `docs/design-drafts/world-infected-001/entry-005/validation/r1-review-results.json`
- `docs/design-drafts/world-infected-001/entry-005/validation/r1-regression-cases.json`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/WORLD-ENTRY-005-R1-task-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/OWNER-authority-and-scope-WORLD-ENTRY-005-R1-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/AUD-df1c3ff-WORLD-ENTRY-005-review-v1.0.md`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/BASELINE-AND-SCOPE.json`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/SHA256SUMS.txt`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/source/check.py`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/source/state-candidates.json`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/evidence/review-probes.py`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/evidence/review-results.json`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/evidence/review-cases.json`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/evidence/run-review-cases.py`
- `docs/design-drafts/world-infected-001/entry-005/r1-inputs/evidence/archive-verification.json`

原`entry-005/inputs/`五份文件全部只读。本包12件文件原样归档到上述`r1-inputs/`同名路径并保留子目录，不覆盖原inputs。两个overview/queue、completion及既有说明只追加局部修订附记；旧报告与失败过程保留。checks/frozen等JSON可以追加R1对象或包裹明确的历史对象，须证明原数据逐项保留，不能覆盖旧证据。

00—07只改本次受影响的技术措辞/支持矩阵/验收说明，未受影响段不整理重写。验证输出results/native-results可更新为本次真实最终结果；原106结果的摘要、分类和旧冻结清单须在checks/frozen历史记录保留。

## 3. W1：先在完整仓库实复现

1. 在生产源码和check.py均未改时，执行原106项有限套件及原23项原生探针，输出到仓库外。记录真实命令、退出码、分类、异常和原始摘要。
2. 以仓库当前check.py和完整spec运行本包固定34项输入：

```text
python <解压包>/evidence/run-review-cases.py --checker docs/design-drafts/world-infected-001/entry-005/validation/check.py --spec docs/design-drafts/world-infected-001/entry-005/validation/state-candidates.json --cases <解压包>/evidence/review-cases.json --require-blob 95150e405ee7427badeebddd9c590106071ff602 --output <仓库外>/r1-before-review.json
```

预期复现主线17符合/17不符（12误接受、3异常、2误拒绝）；3未支持在已符合项中。若实际不同，先记录真实差异与拒绝层，不弱化校验制造失败。这个34项不是生产v4或真实CTB运行。
3. 原始evidence及source文件不修改。生成器review-probes.py仅用于旧准确源复现；修后可用通用runner对相同固定case重测。

## 4. W2：F01原始字段和分支边界

### 4.1 完整原值验证

按每个operation及intent分别明确必需/可选字段、列表/对象/null边界、布尔/枚举/非空标识和安全数值。先验证原值，再做下标、len、字典相等或结果覆盖。尤其：

- entry的arrivalHp/arrivalEnergy须在既有域内；arrivalPending是真布尔。battle ID/绑定/入场字段有效，ACTIVE_DECISION不允许携带defense/escape中间态。
- trace不因跳过proposal_numbers而允许finalHp布尔、firstBefore/After字符串或未知outcome；steps的容器/非空要求依来源区分。正常H0仍保留空steps，不统一非空。
- restore的独立expected自身必须严格合法；Python的True==1、False==0不能证明revision/queue/敌人字段匹配。
- terminal及expected所需子对象必须在访问前校验；缺必要独立锚应语义拒绝，不能KeyError/TypeError。
- 不能通过`bool(x)`、`int(x)`、忽略字段、删除非法步骤或后态覆盖把坏原值洗成合法。

### 4.2 相邻自查

扫描同一检查器exit/medicine/charge/order/continuity/blocked的同类入口：只修其承诺支持的原值和关系，不复刻战斗/路线引擎。内部自洽、有限支持、未支持须区分；程序异常继续是mismatch并暴露。

不要求新增所有历史真实性证明，不改变候选的能力保证边界。无需声称Python字符串品牌是原生不可伪造能力。

## 5. W3：F02使用真实场次锚，不借固定示例

恢复死亡时，验证上下文必须绑定这条记录实际battle、execution、entry及其候选外独立期望。不得硬取`spec.activeBattle`中的首场ID、固定入场revision或位置覆盖实际历史。

必须保留：

- 首场死亡cold与same-progress合法对照。
- 同一执行再入场（不同battleId、entryRevision、累计敌人count/risk不归零）的活动态及死亡态恢复对照。
- 后继场与外部expected一致仍能通过；只篡改terminal.source/battleId/execution则明确拒绝。
- 给不出最小绑定证据就拒绝；不能删除sourceBattle检查或从候选自身重新定义expected。

冷恢复无需一律强求外部完整committed；同进度恢复继续全量比较。当前有限dead样本借expected.current作独立锚时必须严格验证；如采用更小的独立dead锚，候选文档/样本/回归一并明确，不夹带浏览器永久侧档或防回滚承诺。

本轮原则上保留原操作名与有限结构。确需局部字段调整时，在`validation/r1-regression-cases.json`保留34固定ID到新样本的逐项映射和理由；旧输入/预期原语义不改，不把合法再入场死亡降为UNSUPPORTED躲避修复，也不把非法值改成另一合法请求。

## 6. 回归、负控与冻结

### 6.1 不能损害的对照

真实范围仍是有限关系而非CTB可达证明。至少保留首入/再入、最后正E到E0触发、HP0入场前短路、合法HP截零、先治疗后受伤、死亡优先、正常H0空步骤、分段退却、一次退出E、已消费/首绷/日额连续性及旧格式拒绝。

原106固定ID及预期语义原则上全部保留，原23原生观察不删除/skip。确实发现旧合法例本身字段非法，按有依据的原始记录纠正并单列“更正/替换”，不能追改旧报告称首跑全绿。新增/替换/删除/净增分别报告。

### 6.2 直接回归

修后运行本包通用runner（不传旧blob要求），将结果放白名单`validation/r1-review-results.json`。若无需结构适配仍使用原34输入。新增仓库case并给明确业务拒绝码；不能通过捕获任意异常当预期拒绝。

原106+新增回归全套至少冻结后独立双跑；输出字节一致，所有异常0，3个原UNSUPPORTED不计实现通过。原生23项在最终冻结后独立重跑，保持与有限检查分线；真实Vitest时间无需字节一致。

### 6.3 六类语义负控

保留原4类：duplicate-exit、persistent-reset、consumption-rollback、binding-acceptance。
新增至少2类：

- 局部禁用新增的原值/决策边界约束，使确定畸形但结构可运行的case错误通过；由语义mismatch检出，不能用TypeError当检出。
- 恢复为固定示例首场锚，使合法第二场死亡被错误拒绝；由正例mismatch检出，不能删除绑定检查令全部通过。

每次只改对应局部约束，使用模型显式开关或仓库外副本，绝不临时修改src。记录失败ID、退出码与异常数；六类应exit1且异常0。若原4负控因更严格前置层不再命中，要按同类不变量补合格语义对照，不放松正常检查器。

## 7. 文档、正式规则与检查

00—07同步仅受影响的原值/独立锚/支持责任；继续标ENGINEERING REVIEW CANDIDATE。没有新机制或新参数时保持Owner无需新增玩法采纳。不存在的v4生产能力不可写成已实现。

按实际package核对后执行：

```text
npm run validate:architecture
python docs/design-drafts/world-infected-001/entry-005/validation/check.py --cases docs/design-drafts/world-infected-001/entry-005/validation/cases.json --output <仓库外>/final-a.json
python docs/design-drafts/world-infected-001/entry-005/validation/check.py --cases docs/design-drafts/world-infected-001/entry-005/validation/cases.json --output <仓库外>/final-b.json
npm exec vitest -- run --config docs/design-drafts/world-infected-001/entry-005/validation/vitest.probe.config.ts --reporter=json --outputFile=docs/design-drafts/world-infected-001/entry-005/validation/native-results.json
git diff --check
git diff --cached --check
git diff df1c3ff6979703b72bf76d73761b3915e59eb5b2 --check
```

六负控按README实际接口分别执行。完整新范围/相对链接/锚点/UTF-8/输入原字节/原文件前缀/批准参数及所有范围外Git对象审计；保护src tree、package/lock、AGENTS、CI/scripts/tsconfig/正式DEC和合同。

frozen-manifest不可包含自身或未产生的输出；保留旧冻结条目身份，新增R1冻结。日志可留仓库外并记录真实路径/摘要/退出。全量生产测试、typecheck/build、真实CTB、浏览器/Storage/多标签/试玩未跑即NOT RUN，不用探针数量冒充。

## 8. Git权限与停止点

本任务允许在`feature/design-world-entry-005`普通commit/push。开工/收尾实查远端参照，网络错误可普通重试，未确认则准确报告；不改其他分支、不强推、不合并、不推main。

W01仅继承旧历史原件七行，不为本包或R1新增差异提供例外。全部R1差异应无告警；如做旧P到R1累计比较，保留真实退出与已授权七行，不改原件字节或检查配置。

最终报告标题WORLD-ENTRY-005-R1，给出起始/父/最终完整SHA、tree、分支、文件统计、真实修前/修后34结果、原106及新增分类、23原生观察、六负控、冻结/范围/输入检查、push与远端状态、未完成项及所有NOT RUN。停止等待当前WebGPT主线准确SHA专项实审，不自动正式归档或E02-P/R/S/E03。
